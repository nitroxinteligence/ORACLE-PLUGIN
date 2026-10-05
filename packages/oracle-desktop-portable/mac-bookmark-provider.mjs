import { realpathSync, statSync } from 'node:fs';
import { isAbsolute, normalize } from 'node:path';

const MAX_BOOKMARK = 1_048_576;
const UTF8 = 0x08000100;
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const boundedBytes = value => {
  if (!(value instanceof Uint8Array) || !value.byteLength || value.byteLength > MAX_BOOKMARK) fail('invalid_directory_bookmark', 'Bookmark inválido.');
  return Buffer.from(value);
};
function pathSyntax(path) {
  if (typeof path !== 'string' || !isAbsolute(path) || normalize(path) !== path || Buffer.byteLength(path) > 16384 || /[\x00-\x1f\x7f]/.test(path) || Buffer.from(path).toString('utf8') !== path) fail('invalid_directory_path', 'Pasta não canônica.');
  return path;
}
function canonicalDirectory(path) {
  pathSyntax(path);
  if (realpathSync(path) !== path || !statSync(path).isDirectory()) fail('invalid_directory_path', 'Pasta alterada ou não canônica.');
  return path;
}

/** ABI audited against Apple CFURL.h/CFString.h/CFData.h and Bun 1.3.10 ffi.d.ts.
 * Boolean is UInt8, CFIndex/CFURLPathStyle signed 64-bit, CFOptionFlags unsigned 64-bit.
 * No Objective-C, callbacks, toolchain, GUI or user Keychain access. */
export function createCoreFoundationBookmarkBindings(ffi) {
  if (!ffi || typeof ffi.dlopen !== 'function' || typeof ffi.ptr !== 'function' || typeof ffi.toArrayBuffer !== 'function') fail('host_capability_unsupported', 'Bun FFI indisponível.');
  const specs = {
    // CFStrings may be tagged references with all 64 bits significant. Preserve
    // them as u64/BigInt in ARM64 pointer-equivalent integer registers, instead
    // of Bun ptr's lossy JS Number representation. Same fix proven in ImageIO.
    CFStringCreateWithCString: { args: ['ptr', 'ptr', 'u32'], returns: 'u64' },
    CFURLCreateWithFileSystemPath: { args: ['ptr', 'u64', 'i64', 'u8'], returns: 'ptr' },
    CFURLCreateBookmarkData: { args: ['ptr', 'ptr', 'u64', 'ptr', 'ptr', 'ptr'], returns: 'ptr' },
    CFDataCreate: { args: ['ptr', 'ptr', 'i64'], returns: 'ptr' },
    CFDataGetLength: { args: ['ptr'], returns: 'i64' },
    CFDataGetBytePtr: { args: ['ptr'], returns: 'ptr' },
    CFURLCreateByResolvingBookmarkData: { args: ['ptr', 'ptr', 'u64', 'ptr', 'ptr', 'ptr', 'ptr'], returns: 'ptr' },
    CFURLCopyFileSystemPath: { args: ['ptr', 'i64'], returns: 'u64' },
    CFURLCopyScheme: { args: ['ptr'], returns: 'u64' },
    CFStringGetCString: { args: ['u64', 'ptr', 'i64', 'u32'], returns: 'u8' },
    CFURLStartAccessingSecurityScopedResource: { args: ['ptr'], returns: 'u8' },
    CFURLStopAccessingSecurityScopedResource: { args: ['ptr'], returns: 'void' },
    CFRelease: { args: ['u64'], returns: 'void' },
  };
  let s;
  try { s = ffi.dlopen('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation', specs).symbols; }
  catch { fail('host_capability_unsupported', 'CoreFoundation FFI indisponível.'); }
  const release = pointer => { if (pointer) s.CFRelease(pointer); };
  // NULL error output is intentional: errors are mapped without dereferencing CFError pointers.
  return Object.freeze({
    createBookmark(path) {
      pathSyntax(path);
      const utf8 = Buffer.from(path + '\0');
      let string, url, data;
      try {
        string = s.CFStringCreateWithCString(null, ffi.ptr(utf8), UTF8);
        if (!string) fail('directory_grant_unavailable', 'Não foi possível representar a pasta.');
        url = s.CFURLCreateWithFileSystemPath(null, string, 0n, 1);
        if (!url) fail('directory_grant_unavailable', 'Não foi possível representar a pasta.');
        data = s.CFURLCreateBookmarkData(null, url, 2048n, null, null, null);
        if (!data) fail('directory_grant_unavailable', 'O macOS não forneceu bookmark com security scope.');
        const length = Number(s.CFDataGetLength(data));
        if (!Number.isSafeInteger(length) || length < 1 || length > MAX_BOOKMARK) fail('invalid_directory_bookmark', 'Bookmark fora dos limites.');
        const pointer = s.CFDataGetBytePtr(data);
        if (!pointer) fail('invalid_directory_bookmark', 'Bookmark vazio.');
        return Buffer.from(new Uint8Array(ffi.toArrayBuffer(pointer, 0, length)));
      } finally { release(data); release(url); release(string); }
    },
    resolveBookmark(input) {
      const bytes = boundedBytes(input), stale = new Uint8Array(1);
      let data, url;
      try {
        data = s.CFDataCreate(null, ffi.ptr(bytes), BigInt(bytes.length));
        if (!data) fail('invalid_directory_bookmark', 'Não foi possível ler o bookmark.');
        // withSecurityScope | withoutUI | withoutMounting. Resolution never prompts or mounts.
        url = s.CFURLCreateByResolvingBookmarkData(null, data, 1792n, null, null, ffi.ptr(stale), null);
        if (!url) fail('directory_grant_unavailable', 'O macOS não resolveu a permissão da pasta.');
        let scheme;
        try {
          scheme = s.CFURLCopyScheme(url);
          const output = Buffer.alloc(16);
          if (!scheme || !s.CFStringGetCString(scheme, ffi.ptr(output), BigInt(output.length), UTF8) || output.subarray(0, output.indexOf(0)).toString('utf8') !== 'file') fail('invalid_directory_bookmark', 'Bookmark não corresponde a uma pasta local.');
        } finally { release(scheme); }
      } catch (error) { release(url); throw error; } finally { release(data); }
      let disposed = false, started = false;
      const active = () => { if (disposed) fail('directory_grant_closed', 'Permissão da pasta encerrada.'); };
      return Object.freeze({
        stale: stale[0] !== 0,
        path() {
          active(); let string;
          try {
            string = s.CFURLCopyFileSystemPath(url, 0n);
            const output = Buffer.alloc(16385);
            if (!string || !s.CFStringGetCString(string, ffi.ptr(output), BigInt(output.length), UTF8)) fail('invalid_directory_path', 'Caminho resolvido inválido.');
            const end = output.indexOf(0);
            if (end < 0) fail('invalid_directory_path', 'Caminho resolvido fora dos limites.');
            return new TextDecoder('utf-8', { fatal: true }).decode(output.subarray(0, end));
          } finally { release(string); }
        },
        startAccessing() { active(); if (started) fail('directory_grant_active', 'Permissão já ativa.'); started = !!s.CFURLStartAccessingSecurityScopedResource(url); return started; },
        stopAccessing() { active(); if (started) { started = false; s.CFURLStopAccessingSecurityScopedResource(url); } },
        dispose() { if (!disposed) { try { if (started) { started = false; s.CFURLStopAccessingSecurityScopedResource(url); } } finally { disposed = true; release(url); } } },
      });
    },
  });
}

export async function loadMacCoreFoundationBookmarkBindings() {
  if (process.platform !== 'darwin' || process.arch !== 'arm64' || process.versions.bun !== '1.3.10') fail('host_capability_unsupported', 'Bookmarks exigem macOS arm64 e Bun 1.3.10 revisado.');
  let ffi; try { ffi = await import('bun:ffi'); } catch { fail('host_capability_unsupported', 'Bun FFI indisponível.'); }
  return createCoreFoundationBookmarkBindings(ffi);
}

/** Trusted composition API, not RPC. Creation attempts do not invent OS grants from a path.
 * OS create/resolve/start must actually succeed. Selection must already have happened in
 * the product; this module does not supply a picker or transfer another process's scope.
 * All I/O requiring the grant must run in this same process inside withDirectoryGrant. */
export function createMacBookmarkProvider({ platform = process.platform, bindings, loadBindings = loadMacCoreFoundationBookmarkBindings, canonicalize = canonicalDirectory } = {}) {
  let loading;
  const getBindings = async () => {
    if (platform !== 'darwin') fail('host_capability_unsupported', 'Bookmarks macOS indisponíveis.');
    const value = bindings ?? await (loading ??= loadBindings());
    if (typeof value?.createBookmark !== 'function' || typeof value?.resolveBookmark !== 'function') fail('host_capability_unsupported', 'Bindings de bookmark indisponíveis.');
    return value;
  };
  const decode = record => {
    if (!record || Object.keys(record).sort().join(',') !== 'bookmarkBase64,path,version' || record.version !== 1 || typeof record.bookmarkBase64 !== 'string' || record.bookmarkBase64.length > Math.ceil(MAX_BOOKMARK / 3) * 4) fail('invalid_directory_bookmark', 'Registro de bookmark inválido.');
    pathSyntax(record.path);
    const bytes = Buffer.from(record.bookmarkBase64, 'base64');
    if (bytes.toString('base64') !== record.bookmarkBase64) fail('invalid_directory_bookmark', 'Bookmark não canônico.');
    return boundedBytes(bytes);
  };
  const withDirectoryGrant = async (record, work) => {
    if (typeof work !== 'function') fail('invalid_request', 'Operação de pasta inválida.');
    const bytes = decode(record), expectedPath = record.path, resolved = (await getBindings()).resolveBookmark(bytes);
    let started = false, live = false;
    try {
      if (resolved.stale !== false) fail('directory_grant_stale', 'Selecione novamente a pasta para renovar a permissão.');
      const path = pathSyntax(resolved.path());
      if (path !== expectedPath) fail('directory_grant_changed', 'O bookmark pertence a outra pasta.');
      if (resolved.startAccessing() !== true) fail('directory_grant_unavailable', 'O macOS não confirmou acesso à pasta.');
      started = true;
      if (canonicalize(path) !== path) fail('invalid_directory_path', 'Pasta não canônica.');
      live = true;
      const lease = Object.freeze({ path, mechanism: 'corefoundation-security-scoped-bookmark', assertActive() { if (!live) fail('directory_grant_closed', 'Permissão da pasta encerrada.'); } });
      return await work(lease);
    } finally {
      live = false;
      try { if (started) resolved.stopAccessing(); } finally { resolved.dispose(); }
    }
  };
  return Object.freeze({
    async createBookmark({ path, userInitiated = false } = {}) {
      if (userInitiated !== true) fail('directory_selection_required', 'A pasta exige seleção explícita.');
      pathSyntax(path);
      const bytes = boundedBytes((await getBindings()).createBookmark(path));
      const record = Object.freeze({ version: 1, path, bookmarkBase64: bytes.toString('base64') });
      // Creation is not success until reopening confirms a live OS grant.
      await withDirectoryGrant(record, () => undefined);
      return record;
    },
    withDirectoryGrant,
  });
}
