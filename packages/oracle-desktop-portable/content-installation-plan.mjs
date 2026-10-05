import { assertAdmittedContentManifest, portableContentPath } from './content-admission.mjs';
const plans = new WeakMap();
const fail = code => { throw Object.assign(new Error(code), { code }); };

/** Trusted coordinator API. No destination/root/path comes from RPC. The full
 * signed release remains admitted separately; runtime/engine installation is
 * outside this vault content plan. Method assets go only to private host state. */
export function createContentInstallationPlan(admitted) {
  assertAdmittedContentManifest(admitted);
  const entries = admitted.manifest.files.flatMap(file => {
    const path = portableContentPath(file.path);
    if (/^content\/SISTEMA\/(skills|recursos-skills)\//.test(path))
      return [Object.freeze({ source: path, destination: path.slice('content/'.length), scope: 'vault', sha256: file.sha256, bytes: file.bytes })];
    if (path.startsWith('resources/gbrain-method/'))
      return [Object.freeze({ source: path, destination: path.slice('resources/gbrain-method/'.length), scope: 'private-method', sha256: file.sha256, bytes: file.bytes })];
    return [];
  });
  if (!entries.length) fail('empty_content_plan');
  const plan = Object.freeze({ manifestSHA256: admitted.manifestSHA256, releaseID: admitted.manifest.release_id,
    sequence: admitted.manifest.sequence, entries: Object.freeze(entries), overwriteExisting: false });
  plans.set(plan, admitted); return plan;
}
export function admittedManifestForPlan(plan) {
  const admitted = plans.get(plan); if (!admitted) fail('unadmitted_content_plan');
  return assertAdmittedContentManifest(admitted);
}
