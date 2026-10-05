import { createHash, createPublicKey, verify } from 'node:crypto';
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {GBRAIN_NATIVE_PINS} from './gbrain-native-pins.mjs';

export const PORTABLE_CONTENT_CONTRACT = 'portable-content-v1';
export const PORTABLE_CONTENT_DOMAIN = 'oracle-portable-content-v1\0';
export const WINDOWS_CONTENT_CONTRACT = 'portable-content-windows-x64-v1';
export const WINDOWS_CONTENT_DOMAIN = 'oracle-portable-content-windows-x64-v1\0';
export const PORTABLE_CONTENT_PINS = Object.freeze({"runtimeSHA256":"35d20dd0263e5c950194434b925454fdfa9ba6e4467da960410fa05b08a7a5b5","runtimeBytes":61884464,"bunVersion":"1.4.2","gbrainVersion":"0.60.65.0","gbrainCommit":"8c9a8e9a480c388cf7a87dc0c48dd0d56e6c4bb3","methodManifestSHA256":"755793498811fb31296acc14c9cd8766cabd04cb1d3598d94e42106842b5f2bc"});
export const WINDOWS_CONTENT_PINS = Object.freeze({...PORTABLE_CONTENT_PINS, runtimeSHA256:'15277c59ccd6c6c20f8dc9716c2b59c1776320d606b6a8658f70be8799519ca4', runtimeBytes:86096984});
export function portableContentContractDetails(contract) {
  if(contract===PORTABLE_CONTENT_CONTRACT)return Object.freeze({contract,domain:PORTABLE_CONTENT_DOMAIN,platform:'darwin-arm64',runtimePath:'runtime/bun',pins:PORTABLE_CONTENT_PINS});
  if(contract===WINDOWS_CONTENT_CONTRACT)return Object.freeze({contract,domain:WINDOWS_CONTENT_DOMAIN,platform:'win32-x64',runtimePath:'runtime/bun.exe',pins:WINDOWS_CONTENT_PINS});
  throw new ContentAdmissionError('invalid_content_envelope','Contrato de plataforma não revisado.');
}
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const admissions = new WeakMap();
export class ContentAdmissionError extends Error {
  constructor(code, message) { super(message); this.name = 'ContentAdmissionError'; this.code = code; }
}
const require = (condition, code, message) => { if (!condition) throw new ContentAdmissionError(code, message); };
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const asciiString = text => JSON.stringify(text).replace(/[\u0080-\uffff]/g, unit => `\\u${unit.charCodeAt(0).toString(16).padStart(4, '0')}`);
export function canonicalContentJSON(value) {
  const encode = item => {
    if (item === null) return 'null';
    if (typeof item === 'string') return asciiString(item);
    if (typeof item === 'boolean') return String(item);
    if (typeof item === 'number' && Number.isSafeInteger(item)) return String(item);
    if (Array.isArray(item)) return '[' + item.map(encode).join(',') + ']';
    if (item && typeof item === 'object' && Object.getPrototypeOf(item) === Object.prototype) return '{' + Object.keys(item).sort().map(key => asciiString(key) + ':' + encode(item[key])).join(',') + '}';
    throw new ContentAdmissionError('invalid_content_manifest', 'JSON fora do contrato canônico.');
  };
  return Buffer.from(encode(value), 'utf8');
}
function base64(text) {
  require(typeof text === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(text), 'invalid_content_envelope', 'Envelope inválido.');
  const bytes = Buffer.from(text, 'base64'); require(bytes.toString('base64') === text, 'invalid_content_envelope', 'Base64 não canônico.'); return bytes;
}
function keysExactly(object, keys) { return object && typeof object === 'object' && !Array.isArray(object) && Object.keys(object).sort().join('\0') === [...keys].sort().join('\0'); }
function frozen(value) { if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); } return value; }

/** Public distributor trust only. The resource root comes from trusted composition,
 * never from UI/RPC, environment or a writable user profile. */
export function loadReviewedContentTrust(resourceRoot = fileURLToPath(new URL('../../Resources/', import.meta.url))) {
  const sources = JSON.parse(readFileSync(join(resourceRoot, 'updates/sources.json'), 'utf8'));
  require(sources.skills?.repository === 'https://github.com/nitroxinteligence/ORACLE-SKILLS' && sources.skills.trust_keys === 'distribution-keys.json', 'publisher_trust_unavailable', 'Origem de confiança não revisada.');
  const trust = JSON.parse(readFileSync(join(resourceRoot, 'updates/distribution-keys.json'), 'utf8'));
  require(trust.schema_version === 1 && trust.algorithm === 'Ed25519' && Array.isArray(trust.keys) && trust.keys.length > 0, 'publisher_trust_unavailable', 'Chaves públicas do distribuidor indisponíveis.');
  return frozen(trust);
}
export function portableContentPath(path) {
  require(typeof path === 'string' && Buffer.byteLength(path) > 0 && Buffer.byteLength(path) <= 700 && Buffer.from(path, 'utf8').toString('utf8') === path && path === path.normalize('NFC') && !path.startsWith('/') && !path.includes('\\') && !/[\x00-\x1f\x7f:]/.test(path), 'invalid_content_path', 'Caminho de conteúdo inválido.');
  const parts = path.split('/');
  require(parts.every(part => part && part !== '.' && part !== '..' && !part.toLowerCase().endsWith('.app') && !/[. ]$/.test(part) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)), 'invalid_content_path', 'Caminho de conteúdo fora do pacote.');
  require(path === 'runtime/bun' || path === 'runtime/bun.exe' || path.startsWith('engine-source/') || path.startsWith('resources/gbrain-method/') || /^content\/SISTEMA\/(skills|recursos-skills|prompts|Tutoriais)\//.test(path), 'invalid_content_path', 'Destino de conteúdo fora do contrato.');
  require(path === 'runtime/bun.exe' || Object.values(GBRAIN_NATIVE_PINS).some(row=>row.path===path) || !/\.(exe|dll|dylib|so|node|command)$/i.test(path), 'native_content_forbidden', 'Executável adicional não permitido.');
  return path;
}

/** This parser never accepts native schema3 or unsigned packaging receipts.
 * `trust` injection is for trusted in-process synthetic tests, not a product override. */
export function verifyPortableContentManifest(input, { trust = loadReviewedContentTrust(), minimumSequence = 0, knownManifestSHA256, platform = `${process.platform}-${process.arch}` } = {}) {
  const bytes = Buffer.from(input);
  require(bytes.length > 0 && bytes.length <= 24000000, 'invalid_content_envelope', 'Envelope excede o limite.');
  let envelope;
  try { envelope = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw new ContentAdmissionError('invalid_content_envelope', 'Envelope não é JSON UTF-8 válido.'); }
  require(keysExactly(envelope, ['schema_version', 'key_id', 'payload_base64', 'signature_base64']) && [PORTABLE_CONTENT_CONTRACT,WINDOWS_CONTENT_CONTRACT].includes(envelope.schema_version) && canonicalContentJSON(envelope).equals(bytes), 'invalid_content_envelope', 'Envelope portátil ausente, alterado ou não canônico.');
  const definition=portableContentContractDetails(envelope.schema_version);
  require(platform===definition.platform,'incompatible_content_platform','Conteúdo pertence a outra plataforma.');
  const payload = base64(envelope.payload_base64), signature = base64(envelope.signature_base64);
  require(payload.length > 0 && payload.length <= 16000000 && signature.length === 64, 'invalid_content_envelope', 'Payload ou assinatura fora dos limites.');
  require(trust.schema_version === 1 && trust.algorithm === 'Ed25519' && Array.isArray(trust.keys), 'publisher_trust_unavailable', 'Confiança do distribuidor inválida.');
  const matches = trust.keys.filter(key => key.id === envelope.key_id);
  require(matches.length === 1, 'untrusted_content_signer', 'Assinatura não pertence ao distribuidor revisado.');
  let publicKey;
  try { const raw = base64(matches[0].public_key_base64); require(raw.length === 32, 'publisher_trust_unavailable', 'Chave pública inválida.'); publicKey = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw]), format: 'der', type: 'spki' }); } catch { throw new ContentAdmissionError('publisher_trust_unavailable', 'Chave pública do distribuidor inválida.'); }
  require(verify(null, Buffer.concat([Buffer.from(definition.domain), payload]), publicKey, signature), 'invalid_content_signature', 'Assinatura inválida; nenhum conteúdo admitido.');
  let manifest;
  try { manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(payload)); } catch { throw new ContentAdmissionError('invalid_content_manifest', 'Manifesto não é JSON UTF-8 válido.'); }
  require(keysExactly(manifest, ['contract', 'release_id', 'sequence', 'components', 'files', 'inventory_sha256', 'licenses']) && manifest.contract === definition.contract && canonicalContentJSON(manifest).equals(payload), 'invalid_content_manifest', 'Manifesto não canônico ou incompatível.');
  require(typeof manifest.release_id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(manifest.release_id) && integer(minimumSequence, 0, Number.MAX_SAFE_INTEGER) && integer(manifest.sequence, 1, Number.MAX_SAFE_INTEGER) && manifest.sequence >= minimumSequence, 'content_rollback_rejected', 'Release ou sequência inválida.');
  const manifestSHA256 = sha(bytes);
  if (knownManifestSHA256 !== undefined) require(hex(knownManifestSHA256), 'invalid_content_manifest', 'Hash conhecido inválido.');
  if (manifest.sequence === minimumSequence && knownManifestSHA256) require(manifestSHA256 === knownManifestSHA256, 'content_rollback_rejected', 'Uma sequência não pode mudar seu conteúdo.');
  const c = manifest.components, p = definition.pins, runtimePath=definition.runtimePath;
  const nativePin=GBRAIN_NATIVE_PINS[definition.platform];
  require(keysExactly(c, ['runtime', 'gbrain', 'adapter', 'method']) && Object.values(c).every(component => component?.source === 'portable-source-package'), 'incompatible_content_components', 'Componentes não pertencem ao contrato portátil.');
  require(keysExactly(c.runtime, ['source', 'name', 'version', 'sha256', 'bytes']) && keysExactly(c.gbrain, ['source', 'version', 'commit', 'entry']) && keysExactly(c.adapter, ['source', 'entry']) && keysExactly(c.method, ['source', 'version', 'commit', 'manifest_sha256']), 'incompatible_content_components', 'Campos dos componentes fora do contrato.');
  require(c.runtime.name === 'bun' && c.runtime.version === p.bunVersion && c.runtime.sha256 === p.runtimeSHA256 && c.runtime.bytes === p.runtimeBytes && c.gbrain.version === p.gbrainVersion && c.gbrain.commit === p.gbrainCommit && c.gbrain.entry === 'engine-source/vendor/gbrain/src/cli.ts' && c.adapter.entry === 'engine-source/packages/gbrain-adapter/read.ts' && c.method.version === p.gbrainVersion && c.method.commit === p.gbrainCommit && c.method.manifest_sha256 === p.methodManifestSHA256, 'incompatible_content_pins', 'Pins do conteúdo não correspondem ao conjunto revisado.');
  require(Array.isArray(manifest.files) && manifest.files.length > 0 && manifest.files.length <= 30000 && manifest.inventory_sha256 === sha(canonicalContentJSON(manifest.files)) && Array.isArray(manifest.licenses) && manifest.licenses.length > 0 && manifest.licenses.every(row => keysExactly(row, ['component', 'license', 'path']) && typeof row.component === 'string' && row.component.length > 0 && typeof row.license === 'string' && row.license.length > 0), 'invalid_content_inventory', 'Inventário ou licenças incompletos.');
  const byPath = new Map(), paths = new Set(), directories = new Set(); let totalBytes = 0;
  for (const file of manifest.files) {
    require(keysExactly(file, ['path', 'sha256', 'bytes', 'kind', 'mode']) && hex(file.sha256) && ['runtime', 'source', 'dependency', 'asset', 'method', 'skill', 'prompt', 'tutorial', 'license'].includes(file.kind) && [420, 493].includes(file.mode), 'invalid_content_inventory', 'Entrada do inventário inválida.');
    const path = portableContentPath(file.path), folded = path.toLowerCase();
    if(path.endsWith('.node'))require(path===nativePin.path&&file.sha256===nativePin.sha256&&file.bytes===nativePin.bytes,'native_content_forbidden','Trava nativa não corresponde à plataforma e ao pin oficial.');
    const segments = folded.split('/'), parents = segments.slice(1).map((_, index) => segments.slice(0, index + 1).join('/'));
    require(!paths.has(folded) && !directories.has(folded) && !parents.some(parent => paths.has(parent)), 'duplicate_content_path', 'Caminhos duplicados ou colidentes.'); paths.add(folded); parents.forEach(parent => directories.add(parent));
    const limit = path === runtimePath ? p.runtimeBytes : path.startsWith('resources/gbrain-method/') ? 32000000 : path.toLowerCase().endsWith('.md') ? 2000000 : 32000000;
    require(integer(file.bytes, 0, limit), 'invalid_content_inventory', 'Arquivo fora dos limites.');
    require((file.kind === 'runtime') === (path === runtimePath) && (!['runtime/bun','runtime/bun.exe'].includes(path)||path===runtimePath), 'native_content_forbidden', 'Runtime adicional não permitido.');
    totalBytes += file.bytes; require(totalBytes <= 640000000, 'invalid_content_inventory', 'Conteúdo excede 640 MB.'); byPath.set(path, file);
  }
  require(byPath.get(runtimePath)?.sha256 === p.runtimeSHA256 && byPath.get(runtimePath)?.bytes === p.runtimeBytes && byPath.get('resources/gbrain-method/manifest.json')?.sha256 === p.methodManifestSHA256 && byPath.has(c.gbrain.entry) && byPath.has(c.adapter.entry), 'incomplete_content_components', 'Inventário não inclui os componentes obrigatórios.');
  for (const license of manifest.licenses) require(byPath.has(portableContentPath(license.path)), 'invalid_content_inventory', 'Arquivo de licença ausente do inventário.');
  const admitted = frozen({ manifest, manifestSHA256, totalBytes, signatureVerified: true, filesVerified: false, runtimeSignatureVerified: false }); admissions.set(admitted, byPath); return admitted;
}

export function assertAdmittedContentManifest(admitted) {
  require(admissions.has(admitted), 'unadmitted_content', 'Manifesto sem admissão válida.');
  return admitted;
}
export function admittedRuntimePath(admitted) {
  assertAdmittedContentManifest(admitted);
  return portableContentContractDetails(admitted.manifest.contract).runtimePath;
}

export function verifyContentFile(admitted, path, input) {
  const byPath = admissions.get(admitted); require(!!byPath, 'unadmitted_content', 'Manifesto sem admissão válida.');
  const file = byPath.get(portableContentPath(path)); require(!!file, 'unadmitted_content_file', 'Arquivo fora do inventário assinado.');
  const bytes = Buffer.from(input), magic = bytes.subarray(0, 4).toString('hex');
  require(bytes.length === file.bytes && sha(bytes) === file.sha256, 'content_file_changed', 'Arquivo não corresponde ao hash assinado.');
  const nativePin=GBRAIN_NATIVE_PINS[portableContentContractDetails(admitted.manifest.contract).platform];
  if (path !== admittedRuntimePath(admitted)&&path!==nativePin.path) require(!['cffaedfe', 'feedfacf', 'cafebabe', 'bebafeca', 'cefaedfe', 'feedface', 'cafebabf', 'bfbafeca', '7f454c46'].includes(magic) && bytes.subarray(0, 2).toString() !== 'MZ', 'native_content_forbidden', 'Arquivo contém executável nativo adicional.');
  return true;
}

/** Bounded source loading; directory grants/admission/epoch still belong to the caller. */
export function loadAdmittedContentFile(admitted, path, payloadRoot) {
  const file = admissions.get(admitted)?.get(portableContentPath(path)); require(!!file, 'unadmitted_content_file', 'Arquivo sem admissão.');
  const root = resolve(payloadRoot); require(root === payloadRoot && realpathSync(root) === root && lstatSync(root).isDirectory() && !lstatSync(root).isSymbolicLink(), 'invalid_content_source', 'Raiz de conteúdo não canônica.');
  let target = root;
  const chain = [root];
  for (const part of path.split('/')) { target = join(target, part); require(!lstatSync(target).isSymbolicLink(), 'invalid_content_source', 'Link no payload recusado.'); chain.push(target); }
  const stamps = chain.map(value => lstatSync(value));
  const fd = openSync(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = fstatSync(fd); require(before.isFile() && before.nlink === 1 && before.size === file.bytes && before.ino === stamps.at(-1).ino && before.dev === stamps.at(-1).dev, 'invalid_content_source', 'Arquivo irregular ou alterado antes da leitura.');
    const bytes = readFileSync(fd), after = fstatSync(fd);
    require(before.size === after.size && before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs && chain.every((value, index) => { const current = lstatSync(value); return !current.isSymbolicLink() && current.ino === stamps[index].ino && current.dev === stamps[index].dev; }), 'content_file_changed', 'Payload mudou durante a leitura.');
    verifyContentFile(admitted, path, bytes); return bytes;
  } finally { closeSync(fd); }
}
