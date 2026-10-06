import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { createVaultService } from '../packages/oracle-desktop-portable/vault-service.mjs';
import { createProfileStore } from '../packages/oracle-desktop-portable/profile-store.mjs';
import { createSnapshot } from '../packages/oracle-desktop-portable/catalog-snapshot.mjs';

async function fixture(t, options = {}) {
  const base = path.resolve('.work'); await fs.mkdir(base, { recursive: true });
  const directory = await fs.mkdtemp(path.join(base, 'portable-vault-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'vault'), dataDir = path.join(directory, 'plugin-data');
  await fs.mkdir(root); await fs.writeFile(path.join(root, 'note.md'), '# Original\n');
  const profileStore = createProfileStore({ dataDir });
  const service = createVaultService({ selectionAdapter: { selectVault: async () => ({ root, explicitSelection: true }) }, profileStore, ...options });
  await service.selectVault();
  return { root, directory, dataDir, profileStore, service };
}

test('library inventory waits for installation and resumes without claiming completeness', async t => {
  const {dataDir,profileStore,service}=await fixture(t);
  const catalog={collections:[],departments:{departments:[]}};
  const policy={snapshot:()=>({active:true,role:'student',capabilities:{}})};
  let scans=0;
  const vault={...service,scanLibrary:async()=>{scans++;return service.scanLibrary();}};
  const pending=await createSnapshot({policy,vault,profileStore,catalog,dataDir,libraryPending:true});
  assert.equal(scans,0);assert.equal(pending.scan.pending,true);
  assert.equal(pending.scan.complete,false);assert.equal(pending.scan.allowDeletionReconciliation,false);
  assert.equal(pending.scanError,undefined);
  const settled=await createSnapshot({policy,vault,profileStore,catalog,dataDir});
  assert.equal(scans,1);assert.equal(settled.scan.pending,false);assert.equal(settled.scan.complete,true);
  assert(settled.entries.some(row=>row.path==='note.md'));
});

test('CAS edits original, preserves stale drafts across reopen, rejects concurrent saves', async t => {
  const { root, dataDir, service } = await fixture(t);
  const initial = await service.readNote('note.md');
  const saved = await service.saveNote({ path: 'note.md', content: '# Saved\n', expectedRevision: initial.revision });
  assert.equal(saved.status, 'saved'); assert.equal(await fs.readFile(path.join(root, 'note.md'), 'utf8'), '# Saved\n');
  const conflict = await service.saveNote({ path: 'note.md', content: '# Stale draft\n', expectedRevision: initial.revision });
  assert.equal(conflict.status, 'conflict'); assert.equal(conflict.draftSaved, true);
  const reopened = createVaultService({ selectionAdapter: { selectVault: async () => ({ root, explicitSelection: true }) }, profileStore: createProfileStore({ dataDir }) });
  await assert.rejects(reopened.readNote('note.md'), /VAULT_NOT_SELECTED/);
  await reopened.selectVault(); assert.equal((await reopened.reopenDraft('note.md')).content, '# Stale draft\n');
  const current = await service.readNote('note.md');
  const outcomes = await Promise.all(['A', 'B'].map(content => service.saveNote({ path: 'note.md', content, expectedRevision: current.revision })));
  assert.deepEqual(outcomes.map(value => value.status), ['saved', 'conflict']);
  await fs.writeFile(path.join(root, 'note.md'), 'External edit');
  assert.equal((await service.saveNote({ path: 'note.md', content: 'Proposal', expectedRevision: current.revision })).status, 'conflict');
  assert.equal(await fs.readFile(path.join(root, 'note.md'), 'utf8'), 'External edit');
});

test('revocation rejects admitted queued save and stale selection', async t => {
  const { service, root, profileStore } = await fixture(t);
  const note = await service.readNote('note.md');
  const saving = service.saveNote({ path: 'note.md', content: 'Revoked', expectedRevision: note.revision });
  service.revoke(); await assert.rejects(saving, /VAULT_REVOKED/);
  assert.equal(await fs.readFile(path.join(root, 'note.md'), 'utf8'), '# Original\n');
  await assert.rejects(service.readNote('note.md'), /VAULT_NOT_SELECTED/);
  let resolve;
  const selecting = createVaultService({ profileStore, selectionAdapter: { selectVault: () => new Promise(r => { resolve = r; }) } });
  const selection = selecting.selectVault(); selecting.revoke(); resolve({ root, explicitSelection: true });
  await assert.rejects(selection, /VAULT_REVOKED/);
  const untrusted = createVaultService({ profileStore, selectionAdapter: { selectVault: async () => ({ root }) } });
  await assert.rejects(untrusted.selectVault(), /EXPLICIT_SELECTION_REQUIRED/);
});

test('rejects traversal, file and ancestor symlink escapes, oversized notes', async t => {
  const { service, directory, root } = await fixture(t);
  const outside = path.join(directory, 'outside'); await fs.mkdir(outside); await fs.writeFile(path.join(outside, 'secret.md'), 'Secret');
  await fs.symlink(path.join(outside, 'secret.md'), path.join(root, 'escape.md'));
  await fs.symlink(outside, path.join(root, 'linked'));
  for (const name of ['../outside/secret.md', path.join(outside, 'secret.md'), 'escape.md', 'linked/secret.md', 'sub/../note.md']) await assert.rejects(service.readNote(name));
  await assert.rejects(service.saveNote({ path: 'escape.md', content: 'No', expectedRevision: 'a'.repeat(64) }));
  assert.equal(await fs.readFile(path.join(outside, 'secret.md'), 'utf8'), 'Secret');
  await fs.writeFile(path.join(root, 'large.md'), Buffer.alloc(2_000_001)); await assert.rejects(service.readNote('large.md'), /INVALID_NOTE_FILE/);
});

test('bounded scan reports partial and disables deletion reconciliation', async t => {
  const { service, root, profileStore } = await fixture(t);
  const complete = await service.scan(); assert.equal(complete.complete, true); assert.equal(complete.notes.length, 1);
  await fs.writeFile(path.join(root, 'second.md'), 'Second');
  const limited = createVaultService({ profileStore, maxScanEntries: 1, selectionAdapter: { selectVault: async () => ({ root, explicitSelection: true }) } });
  await limited.selectVault(); const partial = await limited.scan(); assert.equal(partial.partial, true); assert.equal(partial.allowDeletionReconciliation, false);
});

test('profile persists privately, serializes updates and rejects symlink paths', async t => {
  const { profileStore, dataDir, directory } = await fixture(t);
  await profileStore.save({ selectedPathHint: '/no/grant', count: 0 });
  await Promise.all([1, 2].map(() => profileStore.update(value => ({ ...value, count: value.count + 1 }))));
  assert.equal((await createProfileStore({ dataDir }).load()).count, 2);
  assert.equal((await fs.stat(dataDir)).mode & 0o777, 0o700);
  assert.equal((await fs.stat(path.join(dataDir, 'profile.json'))).mode & 0o777, 0o600);
  const link = path.join(directory, 'linked-data'); await fs.symlink(dataDir, link);
  await assert.rejects(createProfileStore({ dataDir: link }).load(), /PROFILE_SYMLINK/);
  await fs.unlink(path.join(dataDir, 'profile.json')); await fs.symlink(path.join(directory, 'missing.json'), path.join(dataDir, 'profile.json'));
  await assert.rejects(profileStore.save({ overwritten: true }), /PROFILE_SYMLINK/);
  await assert.rejects(profileStore.load());
});


test('trusted policy rejects note commit when license epoch changes and retains draft', async t => {
  let epoch = 1, rootPath, blockCommit = false;
  const admission = {
    createAdmissionTicket: () => ({ epoch }),
    assertAdmissionTicket: ticket => {
      if (blockCommit && rootPath && readdirSync(rootPath).some(name => name.startsWith('.oracle-'))) { epoch++; blockCommit = false; }
      if (ticket.epoch !== epoch) throw new Error('LICENSE_ADMISSION_REVOKED');
    },
  };
  const { service, root, profileStore } = await fixture(t, { admission }); rootPath = root;
  const current = await service.readNote('note.md'); blockCommit = true;
  await assert.rejects(service.saveNote({ path: 'note.md', content: 'Unauthorized', expectedRevision: current.revision }), /LICENSE_ADMISSION_REVOKED/);
  assert.equal(await fs.readFile(path.join(root, 'note.md'), 'utf8'), '# Original\n');
  assert.equal(Object.values((await profileStore.load()).drafts)[0].content, 'Unauthorized');
});

test('trusted policy rejects private draft commit when lock changes during persistence', async t => {
  let locked = false, dataPath, blockCommit = false;
  const admission = {
    createAdmissionTicket: () => ({ epoch: 1 }),
    assertAdmissionTicket: () => {
      if (blockCommit && dataPath && readdirSync(dataPath).some(name => name.startsWith('.profile-'))) { locked = true; blockCommit = false; }
      if (locked) throw new Error('POLICY_LOCKED');
    },
  };
  const { service, dataDir, profileStore, root } = await fixture(t, { admission }); dataPath = dataDir;
  await profileStore.save({ preferences: {} });
  const current = await service.readNote('note.md'); blockCommit = true;
  await assert.rejects(service.saveDraft({ path: 'note.md', content: 'Locked draft', expectedRevision: current.revision }), /POLICY_LOCKED/);
  assert.equal((await profileStore.load()).drafts, undefined);
  assert.equal(await fs.readFile(path.join(root, 'note.md'), 'utf8'), '# Original\n');
  await assert.rejects(service.saveDraft({ path: 'note.md', content: 'Blocked at entry', expectedRevision: current.revision }), /POLICY_LOCKED/);
});


test('trusted fixed memory directory is idempotent and rejects symlink/file collisions', async t => {
  const admission = { createAdmissionTicket: () => ({}), assertAdmissionTicket: () => true };
  const { service, root, directory } = await fixture(t, { admission });
  const memory = await service.prepareMemoryDirectory();
  assert.equal(memory, path.join(root, 'INBOX/oracle-memory'));
  assert.equal(await fs.realpath(memory), memory);
  assert.equal(await service.prepareMemoryDirectory(), memory);
  await assert.rejects(async () => service.prepareMemoryDirectory({ path: directory }), /INVALID_MEMORY_PREPARATION/);
  await fs.rmdir(memory); await fs.symlink(directory, memory);
  await assert.rejects(service.prepareMemoryDirectory(), /MEMORY_PATH_COLLISION/);
  await fs.unlink(memory); await fs.writeFile(memory, 'Preserve collision');
  await assert.rejects(service.prepareMemoryDirectory(), /MEMORY_PATH_COLLISION/);
  assert.equal(await fs.readFile(memory, 'utf8'), 'Preserve collision');
  await fs.unlink(memory); await fs.rmdir(path.join(root, 'INBOX')); await fs.symlink(directory, path.join(root, 'INBOX'));
  await assert.rejects(service.prepareMemoryDirectory(), /MEMORY_PATH_COLLISION/);
  await assert.rejects(fs.stat(path.join(directory, 'oracle-memory')), { code: 'ENOENT' });
});

test('memory directory preparation checks license, queued revocation and cancellation before mkdir', async t => {
  let epoch = 1;
  const admission = { createAdmissionTicket: () => ({ epoch }), assertAdmissionTicket: ticket => { if (ticket.epoch !== epoch) throw Error('LICENSE_ADMISSION_REVOKED'); } };
  const { service, root } = await fixture(t, { admission });
  const revokedLicense = service.prepareMemoryDirectory(); epoch++;
  await assert.rejects(revokedLicense, /LICENSE_ADMISSION_REVOKED/);
  await assert.rejects(fs.stat(path.join(root, 'INBOX')), { code: 'ENOENT' });
  const abort = new AbortController(), cancelled = service.prepareMemoryDirectory({ signal: abort.signal }); abort.abort();
  await assert.rejects(cancelled, /OPERATION_CANCELLED/);
  await assert.rejects(fs.stat(path.join(root, 'INBOX')), { code: 'ENOENT' });
  const revokedGrant = service.prepareMemoryDirectory(); service.revoke();
  await assert.rejects(revokedGrant, /VAULT_REVOKED/);
  await assert.rejects(fs.stat(path.join(root, 'INBOX')), { code: 'ENOENT' });
  const fixtureWithoutPolicy = await fixture(t);
  await assert.rejects(async () => fixtureWithoutPolicy.service.prepareMemoryDirectory(), /LICENSE_ADMISSION_REQUIRED/);
});


const coverPNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=', 'base64');

test('library snapshot preserves empty folders and image metadata while engine scan stays Markdown-only', async t => {
  const { service, root, profileStore, dataDir } = await fixture(t);
  await fs.mkdir(path.join(root, 'SISTEMA/prompts/empty'), { recursive: true });
  await fs.mkdir(path.join(root, 'Attachments'));
  await fs.writeFile(path.join(root, 'Attachments/cover.png'), coverPNG);
  await fs.writeFile(path.join(root, 'SISTEMA/prompts/prompt.md'), '# Prompt');
  await fs.mkdir(path.join(root, 'node_modules')); await fs.writeFile(path.join(root, 'node_modules/ignore.md'), '# Excluded');
  const scan = await service.scanLibrary();
  assert.equal(scan.complete, true);
  const empty = scan.entries.find(row => row.path === 'SISTEMA/prompts/empty');
  assert.equal(empty.directory, true); assert.equal(empty.available, true); assert.equal(empty.source, root); assert.equal(typeof empty.modified, 'number');
  const image = scan.entries.find(row => row.path === 'Attachments/cover.png'); assert.equal(image.image, true); assert.equal(image.size, coverPNG.length);
  const engine = await service.scan(); assert(engine.notes.every(row => row.path.endsWith('.md'))); assert.equal(engine.notes.length, 2); assert(!engine.entries.some(row => row.image)); assert(!engine.notes.some(row => row.path.includes('node_modules')));
  const catalog = { collections: [], departments: { departments: [] } }, policy = { snapshot: () => ({ active: true, blocked: false, role: 'student', capabilities: {} }) };
  const snapshot = await createSnapshot({ policy, vault: service, profileStore, catalog, dataDir });
  assert(snapshot.entries.some(row => row.path === empty.path)); assert(snapshot.entries.some(row => row.path === image.path)); assert.equal(snapshot.scan.signature, scan.signature); assert.equal(snapshot.scan.allowDeletionReconciliation, false); assert.equal(snapshot.scan.cached, true); assert.equal(snapshot.scan.stale, true);
});

test('library limits and symlinks keep partial entries without deletion authority; revocation and selection changes reject reads', async t => {
  const { root, directory, profileStore } = await fixture(t);
  await fs.mkdir(path.join(root, 'empty')); await fs.writeFile(path.join(root, 'cover.png'), coverPNG);
  const service = createVaultService({ profileStore, maxLibraryEntries: 1, selectionAdapter: { selectVault: async () => ({ root, explicitSelection: true }) } });
  await service.selectVault(); const bounded = await service.scanLibrary(); assert.equal(bounded.partial, true); assert.equal(bounded.allowDeletionReconciliation, false); assert.equal(bounded.entries.length, 1); assert(bounded.issueCount > 0);
  const unrestricted = createVaultService({ profileStore, selectionAdapter: { selectVault: async () => ({ root, explicitSelection: true }) } }); await unrestricted.selectVault();
  await fs.symlink(directory, path.join(root, 'escape'));
  const partial = await unrestricted.scanLibrary(); assert.equal(partial.partial, true); assert.equal(partial.allowDeletionReconciliation, false); assert(!partial.entries.some(row => row.path.startsWith('escape'))); assert(partial.entries.some(row => row.path === 'empty'));
  const scan = unrestricted.scanLibrary(); unrestricted.revoke(); await assert.rejects(scan, /VAULT_REVOKED/);
  await fs.unlink(path.join(root, 'escape')); await unrestricted.selectVault();
  const replacing = unrestricted.scanLibrary(); await unrestricted.selectVault(); await assert.rejects(replacing, /VAULT_REVOKED/);
});

test('retired library image endpoint is absent',async t=>{const {service}=await fixture(t);assert.equal(service.readLibraryImage,undefined);});

test('inventory shares concurrent traversal, bounds historical reuse and invalidates after writes and selection', async t => {
  const {service,root}=await fixture(t);
  const original=fs.opendir;let traversals=0;
  fs.opendir=async(...args)=>{traversals++;return original(...args);};
  t.after(()=>{fs.opendir=original;});
  const [first,second]=await Promise.all([service.scanLibrary(),service.scanLibrary()]);
  assert.equal(traversals,1);assert.equal(first.signature,second.signature);
  first.entries[0].path='mutated.md';
  const cached=await service.scanLibrary({reuse:true});
  assert.equal(traversals,1);assert.equal(cached.entries[0].path,'note.md');
  assert.equal(cached.cached,true);assert.equal(cached.stale,true);assert.equal(cached.allowDeletionReconciliation,false);
  // Same-length external edit, original mtime: no mtime-only freshness claim.
  const before=await fs.stat(path.join(root,'note.md'));
  await fs.writeFile(path.join(root,'note.md'),'# External\n');await fs.utimes(path.join(root,'note.md'),before.atime,before.mtime);
  const historical=await service.scanLibrary({reuse:true});assert.equal(historical.stale,true);
  const fresh=await service.scanLibrary({force:true});assert.equal(traversals,2);assert.notEqual(fresh.signature,cached.signature);
  const note=await service.readNote('note.md');await service.saveNote({path:'note.md',content:'# Internal\n',expectedRevision:note.revision});
  const changed=await service.scanLibrary({reuse:true});assert.equal(traversals,3);assert.equal(changed.cached,false);
  await service.selectVault();await service.scanLibrary({reuse:true});assert.equal(traversals,4);
  service.revoke();await assert.rejects(service.scanLibrary({reuse:true}),/VAULT_NOT_SELECTED/);
});

test('inventory reuse still rejects replaced roots and revoked policy; reads allocate from opened size', async t => {
  let allowed=true;
  const {service,root}=await fixture(t,{admission:{createAdmissionTicket:()=>({}),assertAdmissionTicket:()=>{if(!allowed)throw Error('POLICY_REVOKED');}}});
  await service.scanLibrary();allowed=false;await assert.rejects(service.scanLibrary({reuse:true}),/POLICY_REVOKED/);allowed=true;
  const allocate=Buffer.alloc;let allocated=0;
  Buffer.alloc=(size,...rest)=>{allocated=Math.max(allocated,size);return allocate(size,...rest);};
  try{assert.equal((await service.readNote('note.md')).content,'# Original\n');assert.equal(allocated,12);}finally{Buffer.alloc=allocate;}
  await fs.rename(root,root+'-old');await fs.mkdir(root);await fs.writeFile(path.join(root,'note.md'),'Replacement');
  await assert.rejects(service.scanLibrary({reuse:true}),/VAULT_ROOT_CHANGED/);
});

test('bounded descriptor read rejects growth and shrinkage instead of returning truncation', async t => {
  const {service,root}=await fixture(t);
  const open=fs.open;
  for(const content of ['# Original extra\n','short']){
    await fs.writeFile(path.join(root,'note.md'),'# Original\n');
    fs.open=async(...args)=>{
      const handle=await open(...args);
      if(args[0]===path.join(root,'note.md')){
        const read=handle.read.bind(handle);let changed=false;
        handle.read=async(...params)=>{if(!changed){changed=true;await fs.writeFile(path.join(root,'note.md'),content);}return read(...params);};
      }
      return handle;
    };
    try{await assert.rejects(service.readNote('note.md'),/NOTE_CHANGED_DURING_READ/);}finally{fs.open=open;}
  }
});

test('trusted content transaction invalidates UI projection even after a partial failed write', async t => {
  const {service,root}=await fixture(t,{admission:{createAdmissionTicket:()=>({}),assertAdmissionTicket:()=>true}});
  await service.scanLibrary();
  await assert.rejects(service.withContentTransaction(async transaction=>{
    transaction.check();await fs.writeFile(path.join(root,'added.md'),'Partial synthetic write');throw Error('SYNTHETIC_FAILURE');
  }),/SYNTHETIC_FAILURE/);
  const scan=await service.scanLibrary({reuse:true});
  assert.equal(scan.cached,false);assert(scan.entries.some(row=>row.path==='added.md'));
});

test('inventory cache expires actively and skips inventories over its retention budget', async t => {
  const small=await fixture(t,{inventoryCacheTTLms:20});
  await small.service.scanLibrary();assert.equal((await small.service.scanLibrary({reuse:true})).cached,true);
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal((await small.service.scanLibrary({reuse:true})).cached,false);
  const bounded=await fixture(t,{inventoryCacheMaxBytes:1024});
  await bounded.service.scanLibrary();
  assert.equal((await bounded.service.scanLibrary({reuse:true})).cached,false);
});

test('read-only connection scope preserves inventory but still enforces root and grant lifetime',async t=>{
 const {service}=await fixture(t,{admission:{createAdmissionTicket:()=>({}),assertAdmissionTicket:()=>true}});
 await service.scanLibrary();let retained;
 await service.withContentReadScope(async grant=>{retained=grant;grant.check();await grant.checkRoot();const scan=await service.scanLibrary({reuse:true});assert.equal(scan.cached,true);assert.equal(scan.complete,true);});
 assert.equal((await service.scanLibrary({reuse:true})).cached,true);
 assert.throws(()=>retained.check(),/CONTENT_TRANSACTION_ENDED/);
 await assert.rejects(service.withContentReadScope(async grant=>{service.revoke();grant.check();}),/VAULT_REVOKED/);
});

test('connection read scope does not turn an overlapping full inventory into a partial scan',async t=>{
 const {service,root}=await fixture(t,{admission:{createAdmissionTicket:()=>({}),assertAdmissionTicket:()=>true}});
 const original=fs.open;let release,entered;const paused=new Promise(resolve=>{entered=resolve;}),resume=new Promise(resolve=>{release=resolve;});
 fs.open=async(...args)=>{if(args[0]===path.join(root,'note.md')){entered();await resume;}return original(...args);};
 let scanning;
 try{
  scanning=service.scanLibrary({force:true});await paused;
  await service.withContentReadScope(async grant=>{grant.check();await grant.checkRoot();});
  release();const scan=await scanning;assert.equal(scan.complete,true);assert.equal(scan.partial,false);assert.equal(scan.issueCount,0);
 }finally{release();if(scanning)await scanning.catch(()=>{});fs.open=original;}
});
