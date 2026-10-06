import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import {windowsLocalPath,windowsRelativePath} from './portable-windows-paths.mjs';
import { createHash, randomUUID } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = code => { throw Object.assign(new Error(code), { code }); };
const same = (a, b) => a.dev === b.dev && a.ino === b.ino;

/** Backend API: createVaultService({selectionAdapter,profileStore}).
 * selectionAdapter.selectVault() is trusted host code, never an RPC/UI path argument.
 * It returns {root,explicitSelection:true} after an explicit folder selection.
 * A fresh picker or verified OS bookmark lease admits a grant. Paths/JSON alone
 * cannot restore authorization. Leases end on selection change or revocation.
 * All paths are relative Markdown paths. readNote returns {path,content,revision}.
 * saveNote({path,content,expectedRevision}) returns saved/conflict and retains drafts.
 * prepareMemoryDirectory({signal}?) is trusted composition only, never an RPC
 * handler. With policy admission it idempotently prepares fixed INBOX/oracle-memory
 * and returns its canonical path; callers cannot supply a destination.
 * scan keeps notes Markdown-only. scanLibrary additionally preserves directories
 * and image metadata. Both are bounded and partial never authorizes deletion.
 * revoke() synchronously invalidates admitted operations. Calls check generation again
 * before returning and immediately before mutation. CAS serializes this instance and
 * rechecks external edits before rename; Node lacks OS CAS against uncooperative writers.
 * Node path checks reject observed symlinks, but do not provide openat/renameat
 * protection from a hostile process swapping ancestor directories during syscalls.
 * Inject trusted admission={createAdmissionTicket,assertAdmissionTicket} for product
 * policy. Both callbacks must be synchronous. Tickets are captured internally on
 * entry; assertions guard grants and private-profile/vault commits. A grant alone
 * confers no license/identity policy. Omitting admission is only grant-level scope.
 */
export function createVaultService({ selectionAdapter, profileStore, admission, platform=process.platform, inspectPath, reveal, preserveVersionConflict, versionUUID=randomUUID, maxNoteBytes = 2_000_000, maxScanEntries = 180_000, maxLibraryEntries = 60_000, scanBudgetMs = 15_000, inventoryCacheTTLms = 5000, inventoryCacheMaxBytes = 4_000_000 } = {}) {
  if (!selectionAdapter || typeof selectionAdapter.selectVault !== 'function') fail('SELECTION_ADAPTER_REQUIRED');
  if (!profileStore) fail('PROFILE_STORE_REQUIRED');
  if (admission && (typeof admission.createAdmissionTicket !== 'function' || typeof admission.assertAdmissionTicket !== 'function')) fail('INVALID_ADMISSION_PROVIDER');
  if (platform === 'win32' && typeof inspectPath !== 'function') fail('WINDOWS_FILESYSTEM_PROVIDER_REQUIRED');
  const nativeInspect = (target, check) => platform === 'win32' ? inspectPath(windowsLocalPath(target), {check}) : null;
  const policyCheck = ticket => {
    if (!admission) return;
    const result = admission.assertAdmissionTicket(ticket);
    if (result?.then) fail('ASYNC_COMMIT_ADMISSION_UNSUPPORTED');
  };
  if (!Number.isInteger(maxNoteBytes) || maxNoteBytes < 1 || maxNoteBytes > 2_000_000) fail('INVALID_NOTE_LIMIT');
  if (!Number.isInteger(maxScanEntries) || maxScanEntries < 1 || !Number.isInteger(maxLibraryEntries) || maxLibraryEntries < 1 || !Number.isInteger(scanBudgetMs) || scanBudgetMs < 1) fail('INVALID_SCAN_LIMIT');
  if (!Number.isInteger(inventoryCacheTTLms) || inventoryCacheTTLms < 1 || inventoryCacheTTLms > 5000 || !Number.isInteger(inventoryCacheMaxBytes) || inventoryCacheMaxBytes < 0 || inventoryCacheMaxBytes > 4_000_000) fail('INVALID_INVENTORY_CACHE_LIMIT');
  if (reveal !== undefined && typeof reveal !== 'function' || preserveVersionConflict !== undefined && typeof preserveVersionConflict !== 'function' || typeof versionUUID !== 'function') fail('INVALID_VERSION_PROVIDER');
  const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.heic', '.heif', '.svg']);
  let grant = null, generation = 0, queue = Promise.resolve();
  // Process-local inventory only. A reused projection is historical and cannot
  // authorize deletion. Sensitive operations still read canonical files directly.
  let inventoryEpoch = 0;
  const inventories = new Map(), inventoryFlights = new Map();
  const invalidateInventory = () => { inventoryEpoch++; for (const row of inventories.values()) clearTimeout(row.timer); inventories.clear(); inventoryFlights.clear(); };
  function retainInventory(key, value) {
    const previous = inventories.get(key); clearTimeout(previous?.timer); inventories.delete(key);
    // Rows contain hashes and metadata only, never note contents. Bound retained
    // entries and conservatively account string/row overhead without serializing
    // another large copy. Large vaults still share in-flight traversal only.
    if (value.entries.length + value.notes.length > 5000) return;
    let estimatedBytes = 2048;
    for (const row of value.entries) estimatedBytes += 1024 + 2 * (row.path.length + row.name.length + row.source.length);
    for (const row of value.notes) estimatedBytes += 512 + 2 * row.path.length;
    if (estimatedBytes > inventoryCacheMaxBytes) return;
    const cached = { savedAt: performance.now(), value, timer: null };
    cached.timer = setTimeout(() => { if (inventories.get(key) === cached) inventories.delete(key); }, inventoryCacheTTLms);
    cached.timer.unref?.(); inventories.set(key, cached);
  }
  const exclusive = fn => { const result = queue.then(fn); queue = result.catch(() => {}); return result; };
  const admit = () => {
    if (!grant) fail('VAULT_NOT_SELECTED');
    const ticket = admission?.createAdmissionTicket();
    if (ticket?.then) fail('ASYNC_COMMIT_ADMISSION_UNSUPPORTED');
    policyCheck(ticket); return { ...grant, generation, ticket };
  };
  const check = token => { if (!grant || token.generation !== generation || token.root !== grant.root) fail('VAULT_REVOKED'); grant.lease?.assertActive(); policyCheck(token.ticket); };
  async function checkedRoot(token) {
    check(token);
    const nativeIdentity = nativeInspect(token.root,()=>check(token));
    if (nativeIdentity && (nativeIdentity.volumeSerial !== token.nativeIdentity.volumeSerial || nativeIdentity.fileID !== token.nativeIdentity.fileID || !nativeIdentity.directory)) fail('VAULT_ROOT_CHANGED');
    if (!same(await fs.lstat(token.root), token.identity) || await fs.realpath(token.root) !== token.root) fail('VAULT_ROOT_CHANGED');
    check(token);
  }
  function relative(value, markdownOnly = true) {
    if (typeof value !== 'string' || !value || value.includes('\0') || value.includes('\\') || path.isAbsolute(value) || value.split('/').some(x => !x || x === '.' || x === '..') || markdownOnly && path.extname(value).toLowerCase() !== '.md') fail('INVALID_NOTE_PATH');
    if(platform==='win32')windowsRelativePath(value.split('/').join('\\'));
    return value;
  }
  async function scoped(token, name, { markdownOnly = true, byteLimit = maxNoteBytes } = {}) {
    await checkedRoot(token);
    const segments = relative(name, markdownOnly).split('/');
    let target = token.root;
    for (let i = 0; i < segments.length; i++) {
      target = path.join(target, segments[i]);
      const info = await fs.lstat(target);
      if (info.isSymbolicLink()) fail('VAULT_SYMLINK');
      if (i < segments.length - 1 && !info.isDirectory()) fail('INVALID_NOTE_PATH');
      if (i === segments.length - 1 && (!info.isFile() || info.size > byteLimit)) fail('INVALID_NOTE_FILE');
    }
    const resolved = await fs.realpath(target);
    if (!resolved.startsWith(token.root + path.sep)) fail('VAULT_ESCAPE');
    nativeInspect(target,()=>check(token));
    check(token); return target;
  }
  async function scopedEntry(token,name) {
    await checkedRoot(token);let target=token.root;
    for(const component of relative(name,false).split('/')){target=path.join(target,component);const info=await fs.lstat(target);if(info.isSymbolicLink())fail('VAULT_SYMLINK');}
    if(await fs.realpath(target)!==target||!target.startsWith(token.root+path.sep))fail('VAULT_ESCAPE');nativeInspect(target,()=>check(token));check(token);return target;
  }
  async function personalVersion(token,value,signal) {
    const verify=()=>{check(token);if(signal?.aborted)fail('OPERATION_CANCELLED');};
    proposal(value);const normalized=value.content.replace(/\r\n/g,'\n'),header=normalized.split('\n---\n');
    if(!value.path.endsWith('/SKILL.md')||Buffer.byteLength(value.content)>=2_000_000||!normalized.startsWith('---\n')||header.length<2||!/^name: .+/m.test(header[0])||!/^description: .+/m.test(header[0]))throw Object.assign(new Error('SKILL.md exige frontmatter delimitado com name e description'),{code:'INVALID_SKILL_FRONTMATTER'});
    verify();const source=await read(token,value.path);verify();
    if(source.revision!==value.expectedRevision){
      if(!preserveVersionConflict)fail('VERSION_CONFLICT_STORE_UNAVAILABLE');const conflict=await preserveVersionConflict(value,{check:verify});verify();throw Object.assign(new Error('Conflito: a fonte mudou. Sua proposta foi preservada em '+conflict),{code:'NOTE_CONFLICT',conflictPath:conflict});
    }
    const folder=path.posix.dirname(value.path),parent=path.posix.dirname(folder),id=versionUUID();if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))fail('INVALID_VERSION_ID');
    const suffix=path.posix.basename(folder)+'-personal-'+id.slice(0,8).toUpperCase(),destination=path.posix.join(parent,suffix),entries=[],pending=[''];let bytes=0;
    while(pending.length){verify();const sub=pending.pop(),directory=await scopedEntry(token,path.posix.join(folder,sub));const iterator=await fs.opendir(directory);
      try{for await(const row of iterator){verify();const name=path.posix.join(sub,row.name),target=await scopedEntry(token,path.posix.join(folder,name)),metadata=await fs.lstat(target);verify();if(!metadata.isDirectory()&&!metadata.isFile())fail('INVALID_SKILL_ASSET');entries.push({name,metadata,target});if(entries.length>=10000)fail('SKILL_PACKAGE_TOO_LARGE');bytes+=metadata.size;if(bytes>=100_000_000)fail('SKILL_PACKAGE_TOO_LARGE');if(metadata.isDirectory())pending.push(name);}}finally{try{await iterator.close();}catch{}}
    }
    const sourceFolder=await scopedEntry(token,folder),folderMode=(await fs.lstat(sourceFolder)).mode&0o777;
    const parentPath=await scopedEntry(token,parent),parentIdentity=await fs.lstat(parentPath);verify();
    // mkdir is exclusive: an existing destination, including an empty external
    // directory, is never overwritten. Partial owned files after cancellation
    // remain visible for review; no broad recursive cleanup can delete outsiders.
    const targetRoot=path.join(token.root,destination);await fs.mkdir(targetRoot,{mode:folderMode});const targetIdentity=await fs.lstat(targetRoot);verify();
    const checkDestination=async()=>{verify();await checkedRoot(token);if(!same(parentIdentity,await fs.lstat(parentPath))||!same(targetIdentity,await fs.lstat(targetRoot))||await fs.realpath(targetRoot)!==targetRoot)fail('VAULT_PATH_CHANGED');verify();};
    for(const entry of entries.filter(row=>row.metadata.isDirectory()).sort((a,b)=>a.name.split('/').length-b.name.split('/').length)){await checkDestination();await fs.mkdir(path.join(targetRoot,entry.name),{mode:entry.metadata.mode&0o777});verify();}
    async function createFile(name,content,mode){await checkDestination();const dest=path.join(targetRoot,name),parentDir=path.dirname(dest);if(await fs.realpath(parentDir)!==parentDir)fail('VAULT_SYMLINK');verify();const handle=await fs.open(dest,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,mode);try{verify();await handle.writeFile(content);await handle.sync();verify();}finally{await handle.close();}}
    for(const entry of entries.filter(row=>row.metadata.isFile()&&!['SKILL.md','provenance.json'].includes(row.name))){verify();const target=await scopedEntry(token,path.posix.join(folder,entry.name)),handle=await fs.open(target,constants.O_RDONLY|constants.O_NOFOLLOW);let content;try{const before=await handle.stat();if(!same(before,entry.metadata)||before.size!==entry.metadata.size||before.mtimeMs!==entry.metadata.mtimeMs)fail('SKILL_ASSET_CHANGED');content=await handle.readFile();verify();const after=await handle.stat();if(!same(after,await fs.lstat(target))||after.size!==before.size||after.mtimeMs!==before.mtimeMs||content.length!==before.size)fail('SKILL_ASSET_CHANGED');}finally{await handle.close();}await createFile(entry.name,content,entry.metadata.mode&0o777);}
    const latest=await read(token,value.path);verify();if(latest.revision!==value.expectedRevision||!same(latest.identity,source.identity)){if(!preserveVersionConflict)fail('VERSION_CONFLICT_STORE_UNAVAILABLE');const conflict=await preserveVersionConflict(value,{check:verify});verify();throw Object.assign(new Error('Conflito: a fonte mudou. Sua proposta foi preservada em '+conflict),{code:'NOTE_CONFLICT',conflictPath:conflict});}
    await createFile('provenance.json',JSON.stringify({source:value.path,source_hash:value.expectedRevision,saved_hash:hash(value.content),created_at:new Date().toISOString(),codex_status:'não verificado'}),0o600);
    await createFile('SKILL.md',value.content,source.mode);await checkDestination();const saved=await read(token,path.posix.join(destination,'SKILL.md'));verify();if(saved.revision!==hash(value.content))fail('VERSION_READBACK_FAILED');
    return {path:path.posix.join(destination,'SKILL.md'),status:'Versão pessoal salva; aplicação no Codex não verificada'};
  }
  async function read(token, name) {
    const target = await scoped(token, name);
    const handle = await fs.open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const before = await handle.stat();
      if (!before.isFile() || before.size > maxNoteBytes) fail('INVALID_NOTE_FILE');
      // One sentinel byte detects growth; allocate from the opened file rather
      // than the global 2 MB ceiling. Growth/shrinkage is rejected below.
      const bytes = Buffer.alloc(before.size + 1);
      let length = 0;
      while (length < bytes.length) {
        const result = await handle.read(bytes, length, bytes.length - length, length);
        if (!result.bytesRead) break; length += result.bytesRead;
      }
      if (length > maxNoteBytes) fail('NOTE_TOO_LARGE');
      const after = await handle.stat();
      if (length !== before.size || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs || !same(after, await fs.lstat(await scoped(token, name)))) fail('NOTE_CHANGED_DURING_READ');
      const data = bytes.subarray(0, length);
      let content;
      try { content = new TextDecoder('utf-8', { fatal: true }).decode(data); } catch { fail('NOTE_NOT_UTF8'); }
      check(token);
      return { path: name, content, revision: hash(data), mode: after.mode & 0o777, identity: after };
    } finally { await handle.close(); }
  }
  const publicNote = ({ identity, mode, ...note }) => note;
  const draftKey = (token, name) => hash(token.root + '\0' + relative(name));
  function proposal(value) {
    relative(value.path);
    if (typeof value.content !== 'string' || Buffer.byteLength(value.content) > maxNoteBytes || !/^[a-f0-9]{64}$/.test(value.expectedRevision)) fail('INVALID_NOTE_PROPOSAL');
  }
  async function draft(token, value) {
    proposal(value); await scoped(token, value.path);
    const record = { ...value, vault: token.root, updatedAt: new Date().toISOString() };
    await profileStore.update(profile => { check(token); profile.drafts ??= {}; profile.drafts[draftKey(token, value.path)] = record; return profile; }, { beforeCommit: () => check(token) });
    check(token); return record;
  }
  async function enumerate(token, includeImages) {
    const notes = [], entries = [], pending = [''], issues = [];
    let visited = 0, complete = true, stopped = false, issueCount = 0;
    const started = performance.now();
    const issue = (name, error) => { complete = false; issueCount++; if (issues.length < 100) issues.push({ path: name || '.', error: String(error).slice(0, 240) }); };
    await checkedRoot(token);
    while (pending.length && !stopped) {
      const directory = pending.shift(), absolute = path.join(token.root, directory);
      let directoryIdentity, iterator;
      try {
        directoryIdentity = await fs.lstat(absolute);
        if (directoryIdentity.isSymbolicLink() || await fs.realpath(absolute) !== absolute || !directoryIdentity.isDirectory()) { issue(directory, 'VAULT_PATH_CHANGED'); continue; }
        iterator = await fs.opendir(absolute);
      } catch (error) { check(token); issue(directory, error.code || error.message); continue; }
      try {
        for await (const entry of iterator) {
          check(token);
          if (++visited > maxScanEntries || entries.length >= maxLibraryEntries || performance.now() - started > scanBudgetMs) { issue('.', 'SCAN_WORK_LIMIT'); stopped = true; break; }
          if (entry.name.startsWith('.')) continue;
          const name = directory ? `${directory}/${entry.name}` : entry.name;
          if (entry.isSymbolicLink()) { issue(name, 'VAULT_SYMLINK'); continue; }
          if (entry.isDirectory() && ['node_modules', 'vendor', 'dist', 'build'].includes(entry.name)) continue;
          const extension = path.extname(name).toLowerCase(), image = includeImages && imageExtensions.has(extension);
          if (!entry.isDirectory() && extension !== '.md' && !image) continue;
          try {
            const file = path.join(token.root, name), metadata = await fs.lstat(file);
            check(token);
            if (metadata.isSymbolicLink() || await fs.realpath(file) !== file) fail('VAULT_PATH_CHANGED');
            if (!metadata.isDirectory() && !metadata.isFile()) fail('INVALID_NOTE_FILE');
            const row = { path: name, name: entry.name, directory: metadata.isDirectory(), size: metadata.size, modified: metadata.mtimeMs / 1000, source: token.root, available: true };
            if (metadata.isDirectory()) pending.push(name);
            else if (extension === '.md') {
              const note = await read(token, name);
              notes.push({ path: name, revision: note.revision, bytes: Buffer.byteLength(note.content) });
              row.hash = note.revision;
            } else { row.image = true; if (metadata.size > 16_000_000) { row.available = false; issue(name, 'IMAGE_TOO_LARGE'); } }
            entries.push(row);
          } catch (error) { check(token); issue(name, error.code || error.message); }
        }
      } catch (error) { check(token); issue(directory, error.code || error.message); }
      finally { try { await iterator.close(); } catch {} }
      try {
        const after = await fs.lstat(absolute);
        if (!same(directoryIdentity, after) || directoryIdentity.mtimeMs !== after.mtimeMs || await fs.realpath(absolute) !== absolute) issue(directory, 'VAULT_PATH_CHANGED');
      } catch (error) { check(token); issue(directory, error.code || error.message); }
    }
    await checkedRoot(token);
    entries.sort((a, b) => a.path.localeCompare(b.path)); notes.sort((a, b) => a.path.localeCompare(b.path));
    const signature = hash(JSON.stringify(entries.map(({ path, size, modified, directory, available, hash }) => ({ path, size, modified, directory, available, ...(hash ? { hash } : {}) }))));
    return { notes, entries, complete, partial: !complete, allowDeletionReconciliation: complete, visited, inspected: visited, generation: token.generation, issues, issueCount, unavailableCount: entries.filter(row => !row.available).length, signature, at: Date.now() / 1000 };
  }
  async function inventory(includeImages, { reuse = false, force = false } = {}) {
    const token = admit(), key = includeImages ? 'library' : 'notes', expected = inventoryEpoch;
    // Bounded fallback without a watcher: at most five seconds of UI reuse.
    // Explicit scans and indexing always bypass this historical projection.
    const cached = inventories.get(key);
    if (reuse && !force && cached && performance.now() - cached.savedAt < inventoryCacheTTLms) {
      await checkedRoot(token); check(token);
      if (expected === inventoryEpoch) return structuredClone({ ...cached.value, cached: true,
        stale: true, freshness: 'unverified', allowDeletionReconciliation: false });
    }
    let flight = !force && inventoryFlights.get(key);
    if (!flight) {
      flight = enumerate(token, includeImages).then(value => {
        check(token);
        if (expected !== inventoryEpoch) return { ...value, complete: false, partial: true,
          stale: true, freshness: 'unverified', allowDeletionReconciliation: false };
        const result = { ...value, cached: false, stale: false, freshness: 'verified_at_scan', verified_at: value.at };
        retainInventory(key, result);
        return result;
      });
      if (!force) inventoryFlights.set(key, flight);
      flight.finally(() => { if (inventoryFlights.get(key) === flight) inventoryFlights.delete(key); }).catch(() => {});
    }
    const value = await flight; check(token);
    if (expected !== inventoryEpoch) return structuredClone({ ...value, complete: false, partial: true,
      stale: true, freshness: 'unverified', allowDeletionReconciliation: false });
    return structuredClone(value);
  }
  const contentScope = (callback, { signal } = {}, mutates = true) => {
      if (typeof callback !== 'function' || !admission) fail('LICENSE_ADMISSION_REQUIRED');
      const token = admit();
      let active = true;
      const verify = () => { if (!active) fail('CONTENT_TRANSACTION_ENDED'); check(token); if (signal?.aborted) fail('OPERATION_CANCELLED'); };
      return exclusive(async () => {
        try {
          verify(); await checkedRoot(token); verify(); if(mutates)invalidateInventory();
          const checkRoot = async () => { verify(); await checkedRoot(token); verify(); };
          const result = await callback(Object.freeze({ root: token.root, generation: token.generation,
            rootIdentity: Object.freeze({ dev: token.identity.dev, ino: token.identity.ino }), check: verify, checkRoot }));
          await checkRoot(); return result;
        } finally { active = false; if(mutates)invalidateInventory(); }
      });
    };
  async function select(restore=false){
    const start=generation,ticket=admission?.createAdmissionTicket();policyCheck(ticket);
    let selection;
    const verify=()=>{if(start!==generation)fail('VAULT_REVOKED');policyCheck(ticket);selection?.lease?.assertActive();};
    try{
      selection=restore?await selectionAdapter.restoreVault?.():await selectionAdapter.selectVault();verify();
      if(selection==null)return null;
      if(!path.isAbsolute(selection.root??'')||(restore?(selection?.persistentSelection!==true||typeof selection?.lease?.assertActive!=='function'):(selection?.explicitSelection!==true)))fail('EXPLICIT_SELECTION_REQUIRED');
      const nativeIdentity=nativeInspect(selection.root,verify);if(nativeIdentity&&!nativeIdentity.directory)fail('VAULT_DIRECTORY_REQUIRED');
      const root=await fs.realpath(selection.root),identity=await fs.lstat(root);verify();if(!identity.isDirectory())fail('VAULT_DIRECTORY_REQUIRED');
      if(selection.lease&&selection.lease.path!==root)fail('VAULT_ROOT_CHANGED');
      await selectionAdapter.commitSelection?.(selection,{root,identity,check:verify});verify();
      grant?.lease?.release();generation++;grant={root,identity,nativeIdentity,lease:selection.lease};invalidateInventory();return {selected:true,generation,root,restored:restore};
    }catch(error){selection?.lease?.release();throw error;}
  }
  return {
    // Trusted composition only, never an RPC operation. A persisted root is not
    // a grant. The callback owns no authority after selection/policy revocation.
    withContentTransaction: (callback, options) => contentScope(callback, options),
    // Trusted read-only composition; retains the same admission, root and epoch
    // guards without invalidating a concurrent inventory of unchanged files.
    withContentReadScope: (callback, options) => contentScope(callback, options, false),
    status: () => ({ selected: !!grant, generation, root: grant?.root ?? null }),
    revoke: () => { generation++;grant?.lease?.release(); grant = null; invalidateInventory(); return { selected: false, generation }; },
    selectVault:()=>select(false),
    restoreVault:()=>select(true),
    forgetVault:async()=>{generation++;grant?.lease?.release();grant=null;invalidateInventory();await selectionAdapter.forgetSelection?.();return {selected:false,generation};},
    prepareMemoryDirectory: (options = {}) => {
      if (!options || typeof options !== 'object' || Object.keys(options).some(key => key !== 'signal')) fail('INVALID_MEMORY_PREPARATION');
      if (!admission) fail('LICENSE_ADMISSION_REQUIRED');
      const token = admit(), signal = options.signal;
      const verify = () => { check(token); if (signal?.aborted) fail('OPERATION_CANCELLED'); };
      return exclusive(async () => {
        verify(); await checkedRoot(token); verify();
        let parent = token.root;
        for (const component of ['INBOX', 'oracle-memory']) {
          await checkedRoot(token); verify();
          const parentIdentity = await fs.lstat(parent);
          if (parentIdentity.isSymbolicLink() || !parentIdentity.isDirectory() || await fs.realpath(parent) !== parent) fail('MEMORY_PATH_COLLISION');
          const target = path.join(parent, component);
          let entry;
          try { entry = await fs.lstat(target); }
          catch (error) { if (error.code !== 'ENOENT') throw error; }
          verify();
          if (!entry) {
            if (!same(parentIdentity, await fs.lstat(parent)) || await fs.realpath(parent) !== parent) fail('VAULT_PATH_CHANGED');
            verify();
            try { invalidateInventory(); await fs.mkdir(target, { mode: 0o700 }); }
            catch (error) { if (error.code !== 'EEXIST') throw error; }
            verify(); entry = await fs.lstat(target);
          }
          if (entry.isSymbolicLink() || !entry.isDirectory() || await fs.realpath(target) !== target || !target.startsWith(token.root + path.sep)) fail('MEMORY_PATH_COLLISION');
          if (!same(parentIdentity, await fs.lstat(parent))) fail('VAULT_PATH_CHANGED');
          verify(); parent = target;
        }
        await checkedRoot(token); verify();
        return parent;
      });
    },
    saveVersion:(value,{signal}={})=>{const token=admit();return exclusive(async()=>{invalidateInventory();try{return await personalVersion(token,value,signal);}finally{invalidateInventory();}});},
    revealNote:async(name,{signal}={})=>{const token=admit(),verify=()=>{check(token);if(signal?.aborted)fail('OPERATION_CANCELLED');};verify();const target=await scopedEntry(token,name);verify();if(!reveal)throw Object.assign(new Error('O host não oferece revelar arquivo.'),{code:'host_capability_unsupported'});const result=await reveal(target,{signal});verify();if(result!==true)fail('REVEAL_UNCONFIRMED');return true;},
    readNote: async name => { const token = admit(); return publicNote(await read(token, name)); },
    saveDraft: async value => { const token = admit(); return draft(token, value); },
    reopenDraft: async name => {
      const token = admit(); await scoped(token, name);
      const profile = await profileStore.load(); check(token);
      const value = profile.drafts?.[draftKey(token, name)] ?? null;
      return value?.vault === token.root && value?.path === name ? value : null;
    },
    discardDraft: async name => {
      const token = admit(); await scoped(token, name);
      await profileStore.update(profile => { check(token); if (profile.drafts) delete profile.drafts[draftKey(token, name)]; return profile; }, { beforeCommit: () => check(token) }); check(token);
      return { discarded: true };
    },
    saveNote: value => {
      const token = admit();
      return exclusive(async () => {
        check(token); await draft(token, value);
        const current = await read(token, value.path);
        if (current.revision !== value.expectedRevision) return { status: 'conflict', current: publicNote(current), draftSaved: true };
        const destination = await scoped(token, value.path);
        const parent = path.dirname(destination), parentIdentity = await fs.lstat(parent);
        const temporary = path.join(parent, `.oracle-${randomUUID()}.tmp`);
        let handle;
        try {
          handle = await fs.open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, current.mode);
          await handle.writeFile(value.content); await handle.sync(); await handle.close(); handle = null;
          const latest = await read(token, value.path);
          if (latest.revision !== value.expectedRevision || !same(latest.identity, current.identity)) return { status: 'conflict', current: publicNote(latest), draftSaved: true };
          await scoped(token, value.path);
          if (!same(parentIdentity, await fs.lstat(parent))) fail('VAULT_PATH_CHANGED');
          check(token); invalidateInventory(); await fs.rename(temporary, destination);
          const verified = await read(token, value.path);
          if (verified.revision !== hash(value.content)) return { status: 'conflict', current: publicNote(verified), draftSaved: true };
          await profileStore.update(profile => { check(token); if (profile.drafts) delete profile.drafts[draftKey(token, value.path)]; return profile; }, { beforeCommit: () => check(token) });
          check(token); return { status: 'saved', document: publicNote(verified) };
        } finally { await handle?.close(); await fs.unlink(temporary).catch(() => {}); invalidateInventory(); }
      });
    },
    scan: options => inventory(false, options),
    scanLibrary: options => inventory(true, options),
  };
}
