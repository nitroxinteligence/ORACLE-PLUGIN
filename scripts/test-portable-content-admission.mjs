import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import {GBRAIN_NATIVE_PINS} from '../packages/oracle-desktop-portable/gbrain-native-pins.mjs';
import { canonicalContentJSON, loadReviewedContentTrust, PORTABLE_CONTENT_CONTRACT, PORTABLE_CONTENT_DOMAIN, PORTABLE_CONTENT_PINS as p, verifyPortableContentManifest, verifyContentFile, WINDOWS_CONTENT_CONTRACT, WINDOWS_CONTENT_DOMAIN, WINDOWS_CONTENT_PINS, admittedRuntimePath } from '../packages/oracle-desktop-portable/content-admission.mjs';

const key = generateKeyPairSync('ed25519');
const trust = { schema_version: 1, algorithm: 'Ed25519', keys: [{ id: 'ephemeral-synthetic', public_key_base64: key.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64') }] };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const source = Buffer.from('/* synthetic source, never executed */\n');
const file = (path, bytes, kind = 'source') => ({ path, bytes: bytes.length, sha256: sha(bytes), kind, mode: 420 });
function manifest() {
  const value = { contract: PORTABLE_CONTENT_CONTRACT, release_id: 'synthetic-1', sequence: 1,
    components: {
      runtime: { source: 'portable-source-package', name: 'bun', version: p.bunVersion, sha256: p.runtimeSHA256, bytes: p.runtimeBytes },
      gbrain: { source: 'portable-source-package', version: p.gbrainVersion, commit: p.gbrainCommit, entry: 'engine-source/vendor/gbrain/src/cli.ts' },
      adapter: { source: 'portable-source-package', entry: 'engine-source/packages/gbrain-adapter/read.ts' },
      method: { source: 'portable-source-package', version: p.gbrainVersion, commit: p.gbrainCommit, manifest_sha256: p.methodManifestSHA256 },
    }, files: [
      { path: 'runtime/bun', bytes: p.runtimeBytes, sha256: p.runtimeSHA256, kind: 'runtime', mode: 493 },
      { path: 'resources/gbrain-method/manifest.json', bytes: 100, sha256: p.methodManifestSHA256, kind: 'method', mode: 420 },
      file('engine-source/vendor/gbrain/src/cli.ts', source), file('engine-source/packages/gbrain-adapter/read.ts', source), file('engine-source/vendor/gbrain/LICENSE', Buffer.from('MIT synthetic license'), 'license'),
    ], licenses: [{ component: 'gbrain', license: 'MIT', path: 'engine-source/vendor/gbrain/LICENSE' }] };
  value.inventory_sha256 = sha(canonicalContentJSON(value.files)); return value;
}
function signed(value, signer = key.privateKey, domain = PORTABLE_CONTENT_DOMAIN) {
  value.inventory_sha256 = sha(canonicalContentJSON(value.files));
  const payload = canonicalContentJSON(value);
  return canonicalContentJSON({ schema_version: PORTABLE_CONTENT_CONTRACT, key_id: 'ephemeral-synthetic', payload_base64: payload.toString('base64'), signature_base64: sign(null, Buffer.concat([Buffer.from(domain), payload]), signer).toString('base64') });
}
const admit = (value, options) => verifyPortableContentManifest(signed(value), { trust, ...options });

test('official native lock admits only its exact platform, hash and size',()=>{
  const pin=GBRAIN_NATIVE_PINS['darwin-arm64'],value=manifest();
  value.files.push({path:pin.path,bytes:pin.bytes,sha256:pin.sha256,kind:'source',mode:420});
  assert.equal(admit(value).signatureVerified,true);
  for(const change of [{sha256:'a'.repeat(64)},{bytes:pin.bytes+1},{path:GBRAIN_NATIVE_PINS['win32-x64'].path}]){
    const invalid=structuredClone(value);Object.assign(invalid.files.at(-1),change);
    assert.throws(()=>admit(invalid),{code:'native_content_forbidden'});
  }
});

test('publisher trust is separate from license keys; signed portable admission brands immutable inventory', () => {
  const reviewed = loadReviewedContentTrust(); assert.equal(reviewed.algorithm, 'Ed25519'); assert(reviewed.keys.every(value => value.id.startsWith('oracle-distribution-')));
  const admitted = admit(manifest()); assert.equal(admitted.signatureVerified, true); assert.equal(admitted.filesVerified, false); assert(Object.isFrozen(admitted.manifest.files[0]));
  assert.equal(verifyContentFile(admitted, 'engine-source/vendor/gbrain/src/cli.ts', source), true);
  assert.throws(() => verifyContentFile({ ...admitted }, 'engine-source/vendor/gbrain/src/cli.ts', source), { code: 'unadmitted_content' });
  assert.throws(() => verifyContentFile(admitted, 'engine-source/vendor/gbrain/src/cli.ts', Buffer.from('altered')), { code: 'content_file_changed' });
});
test('unsigned, forged, wrong domain and noncanonical envelopes fail closed', () => {
  assert.throws(() => verifyPortableContentManifest(canonicalContentJSON(manifest()), { trust }), { code: 'invalid_content_envelope' });
  assert.throws(() => verifyPortableContentManifest(signed(manifest(), generateKeyPairSync('ed25519').privateKey), { trust }), { code: 'invalid_content_signature' });
  assert.throws(() => verifyPortableContentManifest(signed(manifest(), key.privateKey, 'oracle-distribution-v3\0'), { trust }), { code: 'invalid_content_signature' });
  assert.throws(() => verifyPortableContentManifest(Buffer.concat([signed(manifest()), Buffer.from('\n')]), { trust }), { code: 'invalid_content_envelope' });
  const envelope = JSON.parse(signed(manifest())); envelope.key_id = 'unreviewed'; assert.throws(() => verifyPortableContentManifest(canonicalContentJSON(envelope), { trust }), { code: 'untrusted_content_signer' });
});
test('portable pins and anti-rollback are mandatory and native component schema is not admitted', () => {
  const value = manifest(); value.components.runtime.source = 'signed-app-bundle'; assert.throws(() => admit(value), { code: 'incompatible_content_components' });
  const changed = manifest(); changed.components.gbrain.commit = 'a'.repeat(40); assert.throws(() => admit(changed), { code: 'incompatible_content_pins' });
  assert.throws(() => admit(manifest(), { minimumSequence: 2 }), { code: 'content_rollback_rejected' });
  assert.throws(() => admit(manifest(), { minimumSequence: 1, knownManifestSHA256: 'a'.repeat(64) }), { code: 'content_rollback_rejected' });
});
test('unsafe paths, duplicate/case/prefix collisions and size/hash boundaries are rejected', () => {
  for (const path of ['engine-source/../private', 'engine-source/A.app/source.js', 'engine-source/CON.txt', 'engine-source/x:ads', 'engine-source/x\\file', 'engine-source/\ud800.js']) { const value = manifest(); value.files.push(file(path, source)); assert.throws(() => admit(value), { code: 'invalid_content_path' }); }
  for (const path of ['engine-source/vendor/gbrain/src/CLI.ts', 'engine-source/vendor/gbrain/src/cli.ts/child']) { const value = manifest(); value.files.push(file(path, source)); assert.throws(() => admit(value), { code: 'duplicate_content_path' }); }
  const parent = manifest(); parent.files.push(file('engine-source/vendor/gbrain/src', source)); assert.throws(() => admit(parent), { code: 'duplicate_content_path' });
  const oversized = manifest(); oversized.files[2].bytes = 32000001; assert.throws(() => admit(oversized), { code: 'invalid_content_inventory' });
  const badHash = manifest(); badHash.files[2].sha256 = 'x'.repeat(64); assert.throws(() => admit(badHash), { code: 'invalid_content_inventory' });
});
test('native extras are refused even under a matching distributor-signed file digest', () => {
  const value = manifest(), native = Buffer.from('cffaedfe00000000', 'hex'); value.files.push(file('engine-source/hidden-runtime.js', native));
  const admitted = admit(value); assert.throws(() => verifyContentFile(admitted, 'engine-source/hidden-runtime.js', native), { code: 'native_content_forbidden' });
  const extra = manifest(); extra.files.push(file('engine-source/hidden.node', source)); assert.throws(() => admit(extra), { code: 'native_content_forbidden' });
});

test('Windows admission binds platform, signature domain and exact vendor runtime', () => {
  const value = manifest(), w = WINDOWS_CONTENT_PINS;
  value.contract = WINDOWS_CONTENT_CONTRACT;
  Object.assign(value.components.runtime, {sha256:w.runtimeSHA256, bytes:w.runtimeBytes});
  Object.assign(value.files[0], {path:'runtime/bun.exe', sha256:w.runtimeSHA256, bytes:w.runtimeBytes});
  value.inventory_sha256 = sha(canonicalContentJSON(value.files));
  const payload = canonicalContentJSON(value);
  const envelope = domain => canonicalContentJSON({schema_version:WINDOWS_CONTENT_CONTRACT,key_id:'ephemeral-synthetic',payload_base64:payload.toString('base64'),signature_base64:sign(null,Buffer.concat([Buffer.from(domain),payload]),key.privateKey).toString('base64')});
  const admitted = verifyPortableContentManifest(envelope(WINDOWS_CONTENT_DOMAIN), {trust,platform:'win32-x64'});
  assert.equal(admittedRuntimePath(admitted),'runtime/bun.exe');
  assert.throws(() => verifyPortableContentManifest(envelope(WINDOWS_CONTENT_DOMAIN),{trust,platform:'darwin-arm64'}),{code:'incompatible_content_platform'});
  assert.throws(() => verifyPortableContentManifest(envelope(PORTABLE_CONTENT_DOMAIN),{trust,platform:'win32-x64'}),{code:'invalid_content_signature'});
});
