import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

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
 * JSON updates are serialized within this store instance; callers must use one instance.
 * save/update accept trusted {beforeCommit} synchronous admission checked before rename.
 */
export function createProfileStore({ dataDir, platform=process.platform, privateFilesystem } = {}) {
  if(platform==='win32'&&(!privateFilesystem||typeof privateFilesystem.inspect!=='function'||typeof privateFilesystem.privateDirectory!=='function'))throw Object.assign(new Error('WINDOWS_PRIVATE_FILESYSTEM_REQUIRED'),{code:'host_capability_unsupported'});
  const noFollow=platform==='win32'?0:constants.O_NOFOLLOW;
  const assertPath=target=>assertPrivatePath(target,{privateFilesystem});
  if (!dataDir || !path.isAbsolute(dataDir)) throw new Error('PLUGIN_DATA_REQUIRED');
  const root = path.resolve(dataDir);
  const file = path.join(root, 'profile.json');
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
  async function read() {
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
      return value;
    } catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
    finally { await handle?.close(); }
  }
  async function write(value, { beforeCommit } = {}) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('PROFILE_INVALID');
    const bytes = JSON.stringify(value, null, 2) + '\n';
    if (Buffer.byteLength(bytes) > 8_000_000) throw new Error('PROFILE_TOO_LARGE');
    await prepare();
    try { if ((await fs.lstat(file)).isSymbolicLink()) throw new Error('PROFILE_SYMLINK'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const temporary = path.join(root, `.profile-${randomUUID()}.tmp`);
    let handle;
    try {
      handle = await fs.open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow, 0o600);
      if(privateFilesystem)await privateFilesystem.inspect(temporary);
      await handle.writeFile(bytes); await handle.sync(); await handle.close(); handle = null;
      await assertPath(root);
      try { if ((await fs.lstat(file)).isSymbolicLink()) throw new Error('PROFILE_SYMLINK'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (beforeCommit) {
        const result = beforeCommit();
        if (result?.then) throw new Error('ASYNC_COMMIT_ADMISSION_UNSUPPORTED');
      }
      await fs.rename(temporary, file);
      if(privateFilesystem)await privateFilesystem.inspect(file);
      return structuredClone(value);
    } finally { await handle?.close(); await fs.unlink(temporary).catch(() => {}); }
  }
  return {
    load: () => exclusive(read),
    save: (value, options) => exclusive(() => write(value, options)),
    update: (mutate, options) => exclusive(async () => write(await mutate(await read()), options)),
  };
}
