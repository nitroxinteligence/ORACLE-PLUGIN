import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {acquireDirectoryProfileLock,waitForProfileLock} from './profile-write-lock.mjs';
import {createProfileContentReceipts} from './profile-content-receipts.mjs';

export async function assertPrivatePath(target, {privateFilesystem} = {}) {
  const absolute = path.resolve(target);
  let cursor = path.parse(absolute).root;
  for (const component of absolute.slice(cursor.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component);
    const entry = await fs.lstat(cursor);
    if (entry.isSymbolicLink()) throw new Error('PROFILE_SYMLINK');
  }
  if(privateFilesystem)await privateFilesystem.inspect(absolute);
  return absolute;
}

/** Private host state only. Pass the host-provided PLUGIN_DATA directory explicitly.
 * load/save/update never import an Oracle profile or turn persisted paths into grants.
 * JSON updates hold one interprocess lease across read/modify/atomic rename.
 * File-level installation receipts live separately; ordinary loads return their
 * compact summaries. Trusted diagnostics may request {includeContentFiles:true}.
 * save/update accept trusted {beforeCommit} synchronous admission checked before rename.
 */
export function createProfileStore({ dataDir, platform=process.platform, privateFilesystem, acquireLock } = {}) {
  if(platform==='win32'&&(!privateFilesystem||typeof privateFilesystem.inspect!=='function'||typeof privateFilesystem.privateDirectory!=='function'))throw Object.assign(new Error('WINDOWS_PRIVATE_FILESYSTEM_REQUIRED'),{code:'host_capability_unsupported'});
  const noFollow=platform==='win32'?0:constants.O_NOFOLLOW;
  const assertPath=target=>assertPrivatePath(target,{privateFilesystem});
  if (!dataDir || !path.isAbsolute(dataDir)) throw new Error('PLUGIN_DATA_REQUIRED');
  const root = path.resolve(dataDir);
  const receipts=createProfileContentReceipts({root,assertPath,platform,privateFilesystem});
  const file = path.join(root, 'profile.json');
  const lockPath=path.join(root,acquireLock?'.profile-write.kernel.lock':'.profile-write.directory.lock');
  let queue = Promise.resolve();
  const exclusive = fn => {
    const result = queue.then(fn);
    queue = result.catch(() => {});
    return result;
  };
  async function prepare() {
    // Check existing ancestors before mkdir, then the complete path afterwards.
    let ancestor = root;
    while (true) {
      try { await assertPath(ancestor); break; }
      catch (error) { if (error.code !== 'ENOENT') throw error; ancestor = path.dirname(ancestor); }
    }
    await fs.mkdir(root, { recursive: true, mode: 0o700 });
    await assertPath(root);
    if (!(await fs.lstat(root)).isDirectory()) throw new Error('PROFILE_DIRECTORY_REQUIRED');
    if(platform==='win32')await privateFilesystem.privateDirectory(root);else await fs.chmod(root, 0o700);
  }
  async function read(options) {
    await prepare();
    let handle;
    try {
      if(privateFilesystem){await fs.lstat(file);await privateFilesystem.inspect(file);}
      handle = await fs.open(file, constants.O_RDONLY | noFollow);
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > 8_000_000) throw new Error('PROFILE_INVALID');
      const value = JSON.parse(await handle.readFile('utf8'));
      if(privateFilesystem)await privateFilesystem.inspect(file);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('PROFILE_INVALID');
      await assertPath(root);
      return await receipts.hydrate(value,options);
    } catch (error) { if (error.code === 'ENOENT'&&!handle) return {}; throw error; }
    finally { await handle?.close(); }
  }
  async function write(value, { beforeCommit } = {}) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('PROFILE_INVALID');
    const {encoded,blobs}=receipts.encode(value);
    const bytes = JSON.stringify(encoded, null, 2) + '\n';
    if (Buffer.byteLength(bytes) > 8_000_000) throw new Error('PROFILE_TOO_LARGE');
    await prepare();
    try { if ((await fs.lstat(file)).isSymbolicLink()) throw new Error('PROFILE_SYMLINK'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const temporary = path.join(root, `.profile-${randomUUID()}.tmp`);
    const admit=()=>{
      const result=beforeCommit?.();
      if(result?.then)throw new Error('ASYNC_COMMIT_ADMISSION_UNSUPPORTED');
    };
    let handle,committed=false;
    try {
      await receipts.persist(blobs,admit);
      handle = await fs.open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow, 0o600);
      if(privateFilesystem)await privateFilesystem.inspect(temporary);
      await handle.writeFile(bytes); await handle.sync(); await handle.close(); handle = null;
      await assertPath(root);
      try { if ((await fs.lstat(file)).isSymbolicLink()) throw new Error('PROFILE_SYMLINK'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      admit();
      await fs.rename(temporary, file);
      committed=true;
      if(privateFilesystem)await privateFilesystem.inspect(file);
      // Only unreferenced checkpoints are disposable. Completed journals from
      // previous releases stay referenced and remain available through load().
      await receipts.collect(encoded,admit).catch(()=>{});
      return structuredClone(value);
    } finally {
      await handle?.close();await fs.unlink(temporary).catch(() => {});
      if(!committed&&blobs.size){
        // A failed admission must keep the old profile readable and must not
        // retain a large unselected checkpoint for each rejected attempt.
        try{await receipts.collect(receipts.encode(await read()).encoded,()=>{});}catch{}
      }
    }
  }
  async function transaction(work){
    await prepare();
    try{await assertPath(lockPath);const entry=await fs.lstat(lockPath);if(entry.nlink!==1&&acquireLock||acquireLock&&!entry.isFile())throw new Error('PROFILE_LOCK_INVALID');}catch(error){if(error.code!=='ENOENT')throw error;}
    const release=await waitForProfileLock(acquireLock||acquireDirectoryProfileLock,lockPath);
    try{await assertPath(root);return await work();}finally{await release();}
  }
  return {
    load: options => exclusive(() => transaction(()=>read(options))),
    save: (value, options) => exclusive(() => transaction(()=>write(value, options))),
    update: (mutate, options) => exclusive(() => transaction(async()=>write(await mutate(await read(options)), options))),
  };
}
