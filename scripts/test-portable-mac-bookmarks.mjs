import test from 'node:test';
import assert from 'node:assert/strict';
import { createMacBookmarkProvider, createCoreFoundationBookmarkBindings } from '../packages/oracle-desktop-portable/mac-bookmark-provider.mjs';

function fixture({ stale = false, path = '/synthetic/vault', start = true, renewal = false, canonicalize = value => value } = {}) {
  const calls = [], bytes = Buffer.from('synthetic opaque OS bookmark');
  const bindings = {
    createBookmark(value) { calls.push(['create', value]); return bytes; },
    resolveBookmark(value) {
      assert.deepEqual(value, bytes); calls.push(['resolve']);
      return { stale, path: () => path, ...(renewal?{refreshBookmark(){calls.push(['renew']);return Buffer.from('renewed OS bookmark');}}:{}), startAccessing() { calls.push(['start']); return start; }, stopAccessing() { calls.push(['stop']); }, dispose() { calls.push(['dispose']); } };
    },
  };
  return { calls, provider: createMacBookmarkProvider({ platform: 'darwin', bindings, canonicalize }), record: { version: 1, path: '/synthetic/vault', bookmarkBase64: bytes.toString('base64') } };
}

test('CoreFoundation C ABI uses audited masks/types and balances retained objects without native FFI', () => {
  const releases = [], calls = [], opaque = Buffer.from('opaque synthetic');
  const ffi = {
    ptr: value => value,
    toArrayBuffer: (_pointer, _offset, length) => { assert.equal(length, opaque.length); return opaque.buffer.slice(opaque.byteOffset, opaque.byteOffset + length); },
    dlopen(path, specs) {
      assert.equal(path, '/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation');
      assert.equal(specs.CFStringCreateWithCString.returns, 'u64');
      assert.equal(specs.CFURLCreateWithFileSystemPath.args[1], 'u64');
      assert.equal(specs.CFURLCopyScheme.returns, 'u64');
      assert.equal(specs.CFURLCopyFileSystemPath.returns, 'u64');
      assert.equal(specs.CFStringGetCString.args[0], 'u64');
      assert.equal(specs.CFRelease.args[0], 'u64');
      assert.deepEqual(specs.CFURLStartAccessingSecurityScopedResource, { args: ['ptr'], returns: 'u8' });
      assert.deepEqual(specs.CFURLCreateByResolvingBookmarkData.args, ['ptr', 'ptr', 'u64', 'ptr', 'ptr', 'ptr', 'ptr']);
      return { symbols: {
        CFStringCreateWithCString: () => 10,
        CFURLCreateWithFileSystemPath: (_a, _s, style, directory) => { assert.equal(style, 0n); assert.equal(directory, 1); return 20; },
        CFURLCreateBookmarkData: (_a, _u, flags) => { assert.equal(flags, 2048n); return 30; },
        CFDataGetLength: () => BigInt(opaque.length), CFDataGetBytePtr: () => 90,
        CFDataCreate: () => 31,
        CFURLCreateByResolvingBookmarkData: (_a, _b, flags, _r, _p, stale) => { assert.equal(flags, 1792n); stale[0] = 0; return 40; },
        CFURLCopyFileSystemPath: () => 50,
        CFURLCopyScheme: () => 60,
        CFStringGetCString: (string, output) => { output.write(string === 60 ? 'file\0' : '/synthetic/vault\0'); return 1; },
        CFURLStartAccessingSecurityScopedResource: () => { calls.push('start'); return 1; },
        CFURLStopAccessingSecurityScopedResource: () => { calls.push('stop'); },
        CFRelease: value => releases.push(value),
      } };
    },
  };
  const bindings = createCoreFoundationBookmarkBindings(ffi);
  assert.deepEqual(bindings.createBookmark('/synthetic/vault'), opaque);
  assert.deepEqual(releases, [30, 20, 10]);
  const resolved = bindings.resolveBookmark(opaque);
  assert.equal(resolved.stale, false); assert.equal(resolved.path(), '/synthetic/vault');
  assert.equal(resolved.startAccessing(), true); resolved.stopAccessing(); resolved.dispose(); resolved.dispose();
  assert.deepEqual(calls, ['start', 'stop']); assert.deepEqual(releases, [30, 20, 10, 60, 31, 50, 40]);
  assert.throws(() => resolved.path(), { code: 'directory_grant_closed' });
});

test('stored bytes reopen an actual lease and all lifetimes close on success/exception', async () => {
  const { provider, calls } = fixture();
  const record = await provider.createBookmark({ path: '/synthetic/vault', userInitiated: true });
  assert(Object.isFrozen(record)); assert.deepEqual(calls.map(row => row[0]), ['create', 'resolve', 'start', 'stop', 'dispose']);
  let lease;
  assert.equal(await provider.withDirectoryGrant(JSON.parse(JSON.stringify(record)), async value => { lease = value; value.assertActive(); return 'synthetic'; }), 'synthetic');
  assert.throws(() => lease.assertActive(), { code: 'directory_grant_closed' });
  await assert.rejects(provider.withDirectoryGrant(record, async () => { throw new Error('synthetic write failed'); }), /synthetic write failed/);
  assert.deepEqual(calls.slice(-4).map(row => row[0]), ['resolve', 'start', 'stop', 'dispose']);
});

test('stale/moved/denied/canonicality failures dispose without inventing a grant', async () => {
  for (const [options, code, names] of [
    [{ stale: true }, 'directory_grant_stale', ['resolve', 'start', 'stop', 'dispose']],
    [{ path: '/different' }, 'directory_grant_changed', ['resolve', 'dispose']],
    [{ start: false }, 'directory_grant_unavailable', ['resolve', 'start', 'dispose']],
    [{ canonicalize: () => '/different' }, 'invalid_directory_path', ['resolve', 'start', 'stop', 'dispose']],
  ]) {
    const { provider, record, calls } = fixture(options); let worked = false;
    await assert.rejects(provider.withDirectoryGrant(record, () => { worked = true; }), { code });
    assert.equal(worked, false); assert.deepEqual(calls.map(row => row[0]), names);
  }
});

test('a stale bookmark renews only after a real active OS grant; relocation is explicit composition',async()=>{
 const {provider,record,calls}=fixture({stale:true,renewal:true});
 const lease=await provider.acquireDirectoryGrant(record);lease.assertActive();
 assert.equal(lease.bookmark.path,record.path);assert.equal(lease.bookmark.bookmarkBase64,Buffer.from('renewed OS bookmark').toString('base64'));
 assert.deepEqual(calls.map(row=>row[0]),['resolve','start','renew']);lease.release();
 assert.deepEqual(calls.slice(-2).map(row=>row[0]),['stop','dispose']);
 const moved=fixture({stale:true,renewal:true,path:'/synthetic/moved'});
 await assert.rejects(moved.provider.acquireDirectoryGrant(moved.record),{code:'directory_grant_changed'});
 const relocated=await moved.provider.acquireDirectoryGrant(moved.record,{allowRelocation:true});assert.equal(relocated.path,'/synthetic/moved');assert.equal(relocated.bookmark.path,relocated.path);relocated.release();
 const denied=fixture({stale:true,renewal:true,start:false});await assert.rejects(denied.provider.acquireDirectoryGrant(denied.record),{code:'directory_grant_unavailable'});assert(!denied.calls.some(row=>row[0]==='renew'));
});

test('paths/JSON alone, malformed bytes and absent platform/bindings fail closed', async () => {
  const { provider, calls, record } = fixture();
  await assert.rejects(provider.createBookmark({ path: '/synthetic/vault' }), { code: 'directory_selection_required' });
  for (const path of ['relative', '/synthetic/../vault', '/x\0y', '/x/\ud800']) await assert.rejects(provider.createBookmark({ path, userInitiated: true }), { code: 'invalid_directory_path' });
  for (const value of [{ path: record.path }, { ...record, bookmarkBase64: '' }, { ...record, bookmarkBase64: 'not base64!' }, { ...record, unexpected: true }]) await assert.rejects(provider.withDirectoryGrant(value, () => true), { code: 'invalid_directory_bookmark' });
  assert.equal(calls.length, 0);
  await assert.rejects(createMacBookmarkProvider({ platform: 'win32' }).withDirectoryGrant(record, () => true), { code: 'host_capability_unsupported' });
  await assert.rejects(createMacBookmarkProvider({ platform: 'darwin', bindings: {} }).withDirectoryGrant(record, () => true), { code: 'host_capability_unsupported' });
  assert.throws(() => createCoreFoundationBookmarkBindings({}), { code: 'host_capability_unsupported' });
});
