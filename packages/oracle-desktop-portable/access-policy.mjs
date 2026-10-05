import { createHash, createPublicKey, randomBytes, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';

export class AccessPolicyError extends Error {
  constructor(code, message) { super(message); this.name = 'AccessPolicyError'; this.code = code; }
}
const deny = (code, message) => { throw new AccessPolicyError(code, message); };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hash = /^[0-9a-f]{64}$/;
const verifiedLicenses = new WeakSet();
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const present = value => value !== null && value !== undefined;
function decode(text) {
  if (typeof text !== 'string' || !text.length || text.length >= 8192 || !/^[A-Za-z0-9_-]+$/.test(text)) deny('invalid_license', 'Código de acesso inválido.');
  const bytes = Buffer.from(text, 'base64url');
  if (bytes.toString('base64url') !== text) deny('invalid_license', 'Código de acesso inválido.');
  return bytes;
}
export function loadReviewedPublicKeys() {
  return JSON.parse(readFileSync(new URL('../../Resources/licensing/public-keys.json', import.meta.url), 'utf8'));
}

/** The device provider is a trusted host adapter, never a profile, UI or env field.
 * No portable implementation of Keychain/Secure Enclave is claimed here. */
export async function validateLicense(code, { keys = loadReviewedPublicKeys(), deviceProvider, now = Math.floor(Date.now() / 1000) } = {}) {
  if (typeof code !== 'string' || Buffer.byteLength(code) > 8192) deny('invalid_license', 'Código de acesso inválido.');
  const parts = code.trim().split('.');
  if (keys.version !== 1 || parts.length !== 3 || !/^ORACLE[123]$/.test(parts[0])) deny('invalid_license', 'Licença inválida ou alterada.');
  const bytes = decode(parts[1]), signature = decode(parts[2]);
  let value, issuer;
  try {
    value = JSON.parse(bytes.toString('utf8'));
    const raw = Buffer.from(keys.keys[value.keyID], 'base64');
    if (raw.length !== 32) throw new Error('key');
    issuer = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw]), format: 'der', type: 'spki' });
  } catch { deny('invalid_license', 'Licença inválida ou alterada.'); }
  if (bytes.length >= 4096 || signature.length !== 64 || ![1, 2, 3].includes(value.version) || typeof value.keyID !== 'string' || parts[0] !== `ORACLE${value.version}` || value.product !== 'oracle-macos' || !uuid.test(value.licenseID ?? '') || typeof value.subject !== 'string' || !value.subject.trim() || [...value.subject].length > 160 || !verify(null, Buffer.concat([Buffer.from(`${parts[0]}.`), bytes]), issuer, signature)) deny('invalid_license', 'Licença inválida ou alterada.');
  if (!Number.isSafeInteger(value.issuedAt) || value.issuedAt < 0 || value.issuedAt > now + 300) deny('invalid_license_time', 'Confira a data do aparelho.');
  const keyProof = ['devicePublicKey', 'invitationID', 'requestID', 'role'].some(field => present(value[field]));
  if (value.version === 3) {
    if (['expiresAt', 'deviceID', 'devicePublicKey', 'invitationID', 'requestID'].some(field => present(value[field])) || !['owner', 'student'].includes(value.role) || !hash.test(value.accessKeyHash ?? '')) deny('invalid_license', 'Chave de acesso incompatível.');
  } else {
    if (value.version === 1 && keyProof) deny('invalid_license', 'Campos modernos em licença antiga.');
    if (present(value.expiresAt) && (!Number.isSafeInteger(value.expiresAt) || value.expiresAt <= value.issuedAt || value.expiresAt <= now)) deny('license_expired', 'Código de acesso expirado.');
    if (value.version === 2 && (present(value.expiresAt) || typeof value.deviceID !== 'string')) deny('invalid_license', 'Vínculo permanente inválido.');
    if (present(value.deviceID)) {
      const challenge = randomBytes(32);
      if (value.version === 2 && keyProof) {
        if (!['student', 'owner'].includes(value.role) || !hash.test(value.invitationID ?? '') || !uuid.test(value.requestID ?? '')) deny('invalid_license', 'Prova de aparelho incompleta.');
        const pub = decode(value.devicePublicKey);
        if (pub.length !== 65 || pub[0] !== 4 || digest(pub) !== value.deviceID) deny('invalid_license', 'Chave do aparelho incompatível.');
        if (typeof deviceProvider?.proveSecureEnclavePossession !== 'function') deny('device_binding_unsupported', 'O host não fornece prova Secure Enclave.');
        const proof = await deviceProvider.proveSecureEnclavePossession(challenge);
        if (proof?.protection !== 'secure-enclave-p256' || !Buffer.from(proof.publicKey ?? []).equals(pub)) deny('device_binding_unverified', 'Provedor de aparelho incompatível.');
        let valid = false;
        try {
          const key = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: pub.subarray(1, 33).toString('base64url'), y: pub.subarray(33).toString('base64url') }, format: 'jwk' });
          valid = verify('sha256', challenge, { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(proof.signature ?? []));
        } catch { /* Fail closed. */ }
        if (!valid) deny('device_binding_unverified', 'Posse da chave não confirmada.');
      } else {
        if (value.version === 2 && !/^ORACLE-MAC2-[0-9a-f]{64}$/.test(value.deviceID)) deny('invalid_license', 'Vínculo ORACLE-MAC2 inválido.');
        const method = value.version === 2 ? 'verifyMacKeychainBinding' : 'verifyLegacyBinding';
        if (typeof deviceProvider?.[method] !== 'function') deny('device_binding_unsupported', 'O host não fornece o vínculo original desta licença.');
        const proof = await deviceProvider[method]({ challenge, expectedDeviceID: value.deviceID, create: false });
        const scheme = value.version === 2 ? 'mac-and-device-local-keychain' : 'original-oracle1-binding';
        if (proof?.verified !== true || proof.scheme !== scheme || proof.deviceID !== value.deviceID || !Buffer.from(proof.challenge ?? []).equals(challenge)) deny('device_binding_unverified', 'Vínculo original não confirmado.');
      }
    }
  }
  const result = Object.freeze({ ...value }); verifiedLicenses.add(result); return result;
}

export function licenseCapabilities(license) {
  const active = !!license && verifiedLicenses.has(license), owner = active && license.role === 'owner';
  return Object.freeze({ useOracle: active, configure: active, manageCatalogSource: owner, manageDistribution: owner, issueLicenses: false });
}

export function createAccessPolicy({ keys = loadReviewedPublicKeys(), deviceProvider, now = () => Math.floor(Date.now() / 1000) } = {}) {
  const trust = Object.freeze({ version: keys.version, keys: Object.freeze({ ...keys.keys }) });
  let license = null, activeCode = null, generation = 0, blocked = false;
  const tickets = new WeakSet();
  const requireCapability = capability => {
    if (blocked || !licenseCapabilities(license)[capability] || (present(license?.expiresAt) && license.expiresAt <= now())) deny('access_denied', 'Acesso não autorizado.');
    const ticket = Object.freeze({ generation, capability }); tickets.add(ticket); return ticket;
  };
  const assertAdmission = ticket => {
    if (!tickets.has(ticket) || ticket.generation !== generation) deny('stale_admission', 'Autorização mudou durante a operação.');
    requireCapability(ticket.capability); return true;
  };
  const activate = async code => {
    const expected = generation;
    const candidate = await validateLicense(code, { keys: trust, deviceProvider, now: now() });
    if (expected !== generation || blocked) deny('stale_admission', 'Autorização mudou durante a ativação.');
    license = candidate; activeCode = code; generation++; return snapshot();
  };
  const revalidateAdmission = async ticket => {
    assertAdmission(ticket);
    await validateLicense(activeCode, { keys: trust, deviceProvider, now: now() });
    assertAdmission(ticket); return true;
  };
  const snapshot = () => Object.freeze({ active: !blocked && !!license && (!present(license.expiresAt) || license.expiresAt > now()), blocked, generation, role: license?.role ?? 'student', capabilities: (!blocked && (!present(license?.expiresAt) || license.expiresAt > now())) ? licenseCapabilities(license) : licenseCapabilities(null) });
  return Object.freeze({ activate, requireCapability, assertAdmission, revalidateAdmission, snapshot,
    async activateAccessKey(key, resolveGrant) {
      const normalized = typeof key === 'string' ? key.trim().toUpperCase().replace(/[- ]/g, '') : '';
      if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{16}$/.test(normalized) || typeof resolveGrant !== 'function') deny('invalid_access_key', 'Confira sua chave de acesso.');
      const expected = generation, keyHash = digest(Buffer.from(normalized));
      const grant = await resolveGrant(keyHash);
      const candidate = await validateLicense(grant, { keys: trust, deviceProvider, now: now() });
      if (expected !== generation || blocked) deny('stale_admission', 'Autorização mudou durante a ativação.');
      if (candidate.version !== 3 || candidate.accessKeyHash !== keyHash) deny('invalid_access_key', 'Chave não corresponde ao grant assinado.');
      license = candidate; activeCode = grant; generation++; return snapshot();
    },
    block() { blocked = true; generation++; },
    unblock() { blocked = false; generation++; },
    revoke() { license = null; activeCode = null; generation++; },
    async runAuthorized(capability, work) {
      const ticket = requireCapability(capability);
      await revalidateAdmission(ticket);
      const result = await work(ticket);
      await revalidateAdmission(ticket); return result;
    },
  });
}
