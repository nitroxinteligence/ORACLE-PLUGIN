#!/usr/bin/env python3
"""Package experimental Oracle JS source and original UI with intact vendor Bun."""
import argparse
import ctypes
import gzip
import hashlib
import importlib.util
import json
import re
from pathlib import Path
import shutil
import sys
import subprocess
import zipfile
from urllib.parse import urlsplit
from portable_vendor_pins import PINS as UPSTREAM_PINS

compression_spec = importlib.util.spec_from_file_location('portable_payload_compression', Path(__file__).with_name('portable-payload-compression.py'))
compression_module = importlib.util.module_from_spec(compression_spec)
compression_spec.loader.exec_module(compression_module)
limits_spec = importlib.util.spec_from_file_location('portable_archive_limits', Path(__file__).with_name('portable-archive-limits.py'))
limits_module = importlib.util.module_from_spec(limits_spec)
limits_spec.loader.exec_module(limits_module)

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'packages/oracle-desktop-portable'
NAME = 'oracle-system-mac-v017'
LIMIT = limits_module.MAX_ARCHIVE_BYTES
RUNTIME_VERSION = UPSTREAM_PINS['bun']['version']
RUNTIME_SHA256 = UPSTREAM_PINS['bun']['darwin-arm64']['sha256']
RUNTIME_BYTES = UPSTREAM_PINS['bun']['darwin-arm64']['bytes']
AI_MEMORY_VERSION = UPSTREAM_PINS['aiMemory']['version']
AI_MEMORY_SHA256 = UPSTREAM_PINS['aiMemory']['darwin-arm64']['sha256']
AI_MEMORY_BYTES = UPSTREAM_PINS['aiMemory']['darwin-arm64']['bytes']
AI_MEMORY_SCHEMA_SHA256 = UPSTREAM_PINS['aiMemory']['schemaSHA256']
AI_MEMORY_LICENSE_SHA256 = UPSTREAM_PINS['aiMemory']['darwin-arm64']['licenseSHA256']
AI_MEMORY_SCHEMA_NAME = 'portable-schema-v' + AI_MEMORY_VERSION + '.json'
ACCESS_GRANT_ENDPOINT = 'https://oracle.falamateus.com.br/api/oracle/access-grant'
# Exact hidden metadata required by the pinned complete method corpus.
SIGNED_METHOD_METADATA = {'resources/gbrain-method/upstream/skills/migrations/.gitkeep', 'resources/gbrain-method/upstream/templates/bootstrap/template-repo/.gitignore', 'resources/gbrain-method/upstream/recipes/agent-voice/tests/evals/baseline-runs/.gitignore'}
NATIVE_PINS = {UPSTREAM_PINS['gbrain']['native']['darwin-arm64']['path']: UPSTREAM_PINS['gbrain']['native']['darwin-arm64']}
MACHO = {b'\xcf\xfa\xed\xfe', b'\xfe\xed\xfa\xcf', b'\xca\xfe\xba\xbe', b'\xbe\xba\xfe\xca', b'\xce\xfa\xed\xfe', b'\xfe\xed\xfa\xce'}

def sha(file):
    digest = hashlib.sha256()
    with file.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()

def run(*args):
    result = subprocess.run(args, capture_output=True, text=True, check=True)
    return result.stdout + result.stderr

def source_files(directory):
    for file in sorted(directory.rglob('*')):
        if file.is_symlink():
            raise ValueError(f'Symlink in package source: {file}')
        if file.is_file():
            yield file

def safe_payload(file, name):
    if name.as_posix() in {'.codex-plugin/plugin.json', '.mcp.json'}:
        return
    engine_metadata = name.parts[0] == 'engine-source' if name.parts else False
    allowed_metadata = {'.keep', '.gitkeep', '.runkit_example.js', '.eslintrc', '.eslintrc.yml', '.nycrc', '.npmignore', '.gitattributes', '.editorconfig', '.prettierrc.json', '.gitignore'}
    if any((part.startswith('.') and not (engine_metadata and part in allowed_metadata) and name.as_posix() not in SIGNED_METHOD_METADATA) or part.endswith('.app') for part in name.parts) or file.suffix == '.command':
        raise ValueError(f'Forbidden package member: {name}')
    if name.as_posix() in NATIVE_PINS:
        expected = NATIVE_PINS[name.as_posix()]
        if file.stat().st_size != expected['bytes'] or sha(file) != expected['sha256']:
            raise ValueError('Official native lock differs from the reviewed pin.')
        return
    if name.as_posix() == 'runtime/ai-memory':
        if file.stat().st_size != AI_MEMORY_BYTES or sha(file) != AI_MEMORY_SHA256:
            raise ValueError('AI Memory executable does not match the reviewed pin.')
    elif name.as_posix() != 'runtime/bun':
        with file.open('rb') as stream:
            magic = stream.read(4)
        if magic in MACHO or magic[:2] == b'MZ' or magic == b'\x7fELF':
            raise ValueError(f'Unexpected compiled executable: {name}')

def copy_verified(source, destination):
    before = sha(source)
    destination.parent.mkdir(parents=True, exist_ok=True)
    # APFS clone keeps the qualification tree without duplicating large pinned bytes.
    cloned = False
    if sys.platform == 'darwin' and not destination.exists():
        clonefile = ctypes.CDLL('/usr/lib/libSystem.B.dylib', use_errno=True).clonefile
        clonefile.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_int]
        clonefile.restype = ctypes.c_int
        cloned = clonefile(str(source).encode(), str(destination).encode(), 0) == 0
    if not cloned:
        shutil.copy2(source, destination)
    if sha(source) != before or sha(destination) != before:
        raise ValueError(f'Source changed while copying: {source}')
    return before

def copy_engine_inventory(inventory_path, stage):
    if inventory_path.is_symlink() or not inventory_path.is_file():
        raise ValueError('Engine inventory must be an explicit regular file.')
    inventory_hash = sha(inventory_path)
    inventory = json.loads(inventory_path.read_text())
    if inventory.get('pin') != UPSTREAM_PINS['gbrain']['commit'] or inventory.get('sourceVersion') != UPSTREAM_PINS['gbrain']['version']:
        raise ValueError('Unexpected engine source pin/version.')
    if inventory.get('missing') or inventory.get('unexpectedNativeFiles') or inventory.get('aiMemoryIncluded'):
        raise ValueError('Incomplete or unsupported engine inventory.')
    manifest = inventory.get('manifest')
    if not isinstance(manifest, list) or not manifest:
        raise ValueError('Engine inventory has no manifest.')
    copied, targets = [], set()
    for entry in manifest:
        source = Path(entry['source'])
        target = Path(entry['target'])
        if source.is_symlink() or not source.is_file() or not source.is_absolute() or source.resolve() != source:
            raise ValueError(f'Engine source must be a canonical regular file: {source}')
        if target.is_absolute() or '..' in target.parts or not target.parts or target.parts[0] != 'engine-source' or target.as_posix() in targets:
            raise ValueError(f'Unsafe/duplicate engine target: {target}')
        if source.stat().st_size != entry['size'] or sha(source) != entry['sha256']:
            raise ValueError(f'Engine inventory drift: {target}')
        if source.suffix.lower() in {'.node', '.dylib', '.so', '.dll', '.exe', '.a', '.o'} and target.as_posix() not in NATIVE_PINS:
            raise ValueError(f'Unexpected engine native payload: {target}')
        safe_payload(source, target)
        observed = copy_verified(source, stage / target)
        if observed != entry['sha256']:
            raise ValueError(f'Engine source changed during admission: {target}')
        targets.add(target.as_posix())
        copied.append({'target': target.as_posix(), 'bytes': entry['size'], 'sha256': observed})
    if sha(inventory_path) != inventory_hash:
        raise ValueError('Engine inventory changed during packaging.')
    packages = inventory.get('packages', [])
    for package in packages:
        metadata = stage / package['logicalPath'] / 'package.json'
        if not metadata.is_file():
            raise ValueError(f'Missing engine dependency package metadata: {package["name"]}')
        actual = json.loads(metadata.read_text())
        if actual.get('name') != package['name'] or actual.get('version') != package['version']:
            raise ValueError(f'Engine dependency package metadata drift: {package["name"]}')
    receipt = {'schemaVersion': 1, 'engineSourcePin': inventory['pin'], 'engineSourceVersion': inventory['sourceVersion'],
               'inventorySHA256': inventory_hash, 'files': copied,
               'packages': [{'name': item['name'], 'version': item['version'], 'license': item.get('license'), 'logicalPath': item['logicalPath']} for item in packages],
               'fileCount': len(copied), 'symlinksIncluded': False, 'nativeExtrasIncluded': False, 'officialNativeLockIncluded': True,
               'installed': False, 'ready': False, 'engineServiceIntegrated': True, 'engineServiceIntegrationScope': 'local-index-status-search-canonical-read', 'onboardingCompleted': False,
               'aiMemoryIncluded': False, 'isolatedRunnerExecutionVerified': False}
    (stage / 'engine-source-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    return receipt

def canonical_input(path, directory=False):
    path = Path(path).absolute()
    if path.resolve() != path or path.is_symlink():
        raise ValueError('Content input must be canonical without symlink ancestors.')
    if directory:
        if not path.is_dir():
            raise ValueError('Content payload must be an explicit canonical directory.')
    elif not path.is_file() or path.stat().st_nlink != 1:
        raise ValueError('Content envelope/file must be an explicit regular file.')
    return path

def reviewed_access_config(path):
    path = canonical_input(path)
    if path.stat().st_size > 32000:
        raise ValueError('Portable access configuration exceeds the admission limit.')
    contents = path.read_bytes()
    config = json.loads(contents)
    if not isinstance(config, dict) or set(config) != {'schema_version', 'endpoint'} or type(config['schema_version']) is not int or config['schema_version'] != 1:
        raise ValueError('Unexpected portable access configuration fields/version.')
    endpoint = config['endpoint']
    if not isinstance(endpoint, str):
        raise ValueError('Portable access endpoint must be the reviewed HTTPS URL.')
    url = urlsplit(endpoint)
    if url.scheme != 'https' or url.hostname != 'oracle.falamateus.com.br' or url.username is not None or url.password is not None or url.port is not None or url.query or url.fragment or endpoint != ACCESS_GRANT_ENDPOINT:
        raise ValueError('Portable access endpoint must be the reviewed HTTPS URL.')
    return hashlib.sha256(contents).hexdigest()

def content_options(envelope, payload, engine_inventory):
    if (envelope is None) != (payload is None):
        raise ValueError('Content packaging requires paired --content-envelope and --content-payload.')
    if envelope is None:
        return None
    if engine_inventory is None:
        raise ValueError('Content packaging requires the reviewed --engine-inventory.')
    envelope, payload = canonical_input(envelope), canonical_input(payload, directory=True)
    if envelope.stat().st_size > 24000000:
        raise ValueError('Content envelope exceeds the admission limit.')
    return envelope, payload

CONTENT_ADMISSION_SCRIPT = r"""
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [modulePath,resourceRoot,envelopePath,payloadRoot]=process.argv.slice(1);
const {loadReviewedContentTrust,verifyPortableContentManifest,assertAdmittedContentManifest,loadAdmittedContentFile}=await import(pathToFileURL(modulePath).href);
const admitted=verifyPortableContentManifest(readFileSync(envelopePath),{trust:loadReviewedContentTrust(resourceRoot)});
assertAdmittedContentManifest(admitted);
const files=admitted.manifest.files.filter(file=>!file.path.startsWith('content/'));
if(!files.some(file=>file.path==='engine-source/provenance/oracle-distribution.json'))throw new Error('Signed catalog provenance is required.');
loadAdmittedContentFile(admitted,'runtime/bun',payloadRoot);
loadAdmittedContentFile(admitted,'engine-source/provenance/oracle-distribution.json',payloadRoot);
console.log(JSON.stringify({manifestSHA256:admitted.manifestSHA256,releaseID:admitted.manifest.release_id,sequence:admitted.manifest.sequence,totalFiles:admitted.manifest.files.length,files}));
"""

def admit_content(runtime, envelope, payload):
    # Only the already pinned vendor Bun executes a fixed verifier. No shell,
    # user code, alternate key/trust argument or unsigned base64 decode is used.
    runtime = canonical_input(runtime)
    if runtime.stat().st_size != RUNTIME_BYTES or sha(runtime) != RUNTIME_SHA256:
        raise ValueError('Content verifier runtime does not match the reviewed Bun pin.')
    envelope_hash = sha(envelope)
    module = canonical_input(SOURCE / 'content-admission.mjs')
    trust_files = [canonical_input(ROOT / 'Resources/updates' / name) for name in ('sources.json', 'distribution-keys.json')]
    unchanged = {file: sha(file) for file in [module, *trust_files]}
    result = subprocess.run([str(runtime), '--no-env-file', '--no-install', '-e', CONTENT_ADMISSION_SCRIPT,
                             str(module), str(ROOT / 'Resources'), str(envelope), str(payload)],
                            cwd=ROOT, env={'PATH': '/usr/bin:/bin', 'DO_NOT_TRACK': '1'},
                            capture_output=True, text=True, timeout=120, check=True)
    if len(result.stdout.encode()) > 16000000:
        raise ValueError('Content admission output exceeded its bound.')
    value = json.loads(result.stdout)
    if value['manifestSHA256'] != envelope_hash or sha(envelope) != envelope_hash or any(sha(file) != digest for file, digest in unchanged.items()):
        raise ValueError('Content envelope/trust/module changed during signature admission.')
    value['verificationHashes'] = {'module': unchanged[module], 'sources': unchanged[trust_files[0]], 'distributionKeys': unchanged[trust_files[1]]}
    return value

def copy_admitted_technical(admitted, envelope, payload, stage):
    methods, provenance, runtime = 0, 0, 0
    descriptors = {file['path']: file for file in admitted['files']}
    for path, entry in descriptors.items():
        member = Path(path)
        if path.startswith('content/') or member.is_absolute() or '..' in member.parts:
            raise ValueError('Unexpected admitted technical destination.')
        source = canonical_input(payload / member)
        if source.stat().st_size != entry['bytes'] or sha(source) != entry['sha256']:
            raise ValueError(f'Signed payload drift: {path}')
        target = stage / member
        if path.startswith('resources/gbrain-method/') or path == 'engine-source/provenance/oracle-distribution.json':
            safe_payload(source, member)
            if target.exists() and (target.stat().st_size != entry['bytes'] or sha(target) != entry['sha256']):
                raise ValueError(f'Existing technical inventory differs from the signed content: {path}')
            copy_verified(source, target)
            methods += int(path.startswith('resources/gbrain-method/'))
            provenance += int(path == 'engine-source/provenance/oracle-distribution.json')
        elif path.startswith('engine-source/') or path == 'runtime/bun':
            if not target.is_file():
                raise ValueError(f'Signed technical file missing from the existing inventory copy: {path}')
            runtime += int(path == 'runtime/bun')
        else:
            raise ValueError(f'Unexpected admitted technical component: {path}')
        canonical_input(target)
        if target.stat().st_size != entry['bytes'] or sha(target) != entry['sha256']:
            raise ValueError(f'Packaged file differs from the signed content descriptor: {path}')
    for folder in ('engine-source', 'resources/gbrain-method'):
        for file in source_files(stage / folder):
            if file.relative_to(stage).as_posix() not in descriptors:
                raise ValueError('Technical inventory contains an unsigned extra file.')
    if runtime != 1 or provenance != 1 or methods == 0:
        raise ValueError('Signed technical components are incomplete.')
    expected = admitted['verificationHashes']
    if sha(SOURCE / 'content-admission.mjs') != expected['module'] or sha(stage / 'resources/updates/sources.json') != expected['sources'] or sha(stage / 'resources/updates/distribution-keys.json') != expected['distributionKeys']:
        raise ValueError('Packaged trust/admission changed after content signature verification.')
    if sha(envelope) != admitted['manifestSHA256']:
        raise ValueError('Content envelope changed before copy.')
    copy_verified(envelope, stage / 'resources/updates/portable-content.json')
    if sha(stage / 'resources/updates/portable-content.json') != admitted['manifestSHA256']:
        raise ValueError('Packaged content envelope differs from the signature-admitted bytes.')
    return {'manifestSHA256': admitted['manifestSHA256'], 'releaseID': admitted['releaseID'], 'sequence': admitted['sequence'],
            'technicalFiles': len(descriptors), 'methodFiles': methods, 'provenanceFiles': provenance,
            'catalogContentEmbedded': False, 'signatureVerified': True, 'technicalFilesVerified': True}

def package(runtime, output, engine_inventory=None, ai_memory_runtime=None, ai_memory_license=None, content_envelope=None, content_payload=None):
    content = content_options(content_envelope, content_payload, engine_inventory)
    access_config = ROOT / 'Resources/updates/portable-access.json'
    access_config_hash = reviewed_access_config(access_config)

    # Catch literal relative imports that would work in the checkout but escape
    # the closed backend directory shipped in the archive.
    for module in SOURCE.glob('*.mjs'):
        for specifier in re.findall(r"(?:\bfrom\s*|\bimport\s*\(\s*)['\"](\.[^'\"]+)['\"]", module.read_text()):
            target = (module.parent / specifier).resolve()
            if not target.is_relative_to(SOURCE.resolve()) or not target.is_file():
                raise ValueError(f'Backend import is outside the package: {module.name}: {specifier}')
    # The portable tool contract is an exact local mirror, keeping the archive
    # self-contained without silently changing the reviewed native schemas.
    if (SOURCE / 'ai-memory-tool-contract.mjs').read_bytes() != (ROOT / 'packages/oracle-desktop-plugin/ai-memory-relay.mjs').read_bytes():
        raise ValueError('Portable AI Memory tool contract differs from the reviewed native contract.')
    runtime, output = runtime.absolute(), output.absolute()
    allowed = ROOT / '.work'
    if runtime.is_symlink() or not runtime.is_file() or runtime.resolve() != runtime:
        raise ValueError('Runtime must be an explicit regular file without symlink ancestors.')
    if runtime.stat().st_size != RUNTIME_BYTES or sha(runtime) != RUNTIME_SHA256:
        raise ValueError('Runtime does not match the reviewed portable content pin.')
    if output.exists() or output.is_symlink() or not output.is_relative_to(allowed) or output.resolve() != output:
        raise ValueError('Output must be a fresh isolated directory inside repository .work.')
    run('/usr/bin/codesign', '--verify', '--strict', str(runtime))
    signature = run('/usr/bin/codesign', '-dv', '--verbose=4', str(runtime))
    if 'Authority=Developer ID Application: Jarred Sumner (7FRXF46ZSN)' not in signature or 'TeamIdentifier=7FRXF46ZSN' not in signature or 'Signature=adhoc' in signature:
        raise ValueError('Unexpected vendor Developer ID signature.')
    run('/usr/bin/codesign', '--verify', '--strict', '--test-requirement', '=notarized', str(runtime))
    version = run(str(runtime), '--version').strip()
    if version != RUNTIME_VERSION:
        raise ValueError('Runtime version does not match the reviewed portable content pin.')
    if (ai_memory_runtime is None) != (ai_memory_license is None):
        raise ValueError('AI Memory packaging requires its explicit reviewed license.')
    if ai_memory_runtime is not None:
        ai_memory_runtime, ai_memory_license = ai_memory_runtime.absolute(), ai_memory_license.absolute()
        for file in (ai_memory_runtime, ai_memory_license):
            if file.is_symlink() or not file.is_file() or file.resolve() != file:
                raise ValueError('AI Memory inputs must be canonical regular files.')
        safe_payload(ai_memory_runtime, Path('runtime/ai-memory'))
        if sha(ai_memory_license) != AI_MEMORY_LICENSE_SHA256 or sha(ROOT / 'Resources/ai-memory' / AI_MEMORY_SCHEMA_NAME) != AI_MEMORY_SCHEMA_SHA256:
            raise ValueError('AI Memory license or portable schema changed.')
        run('/usr/bin/codesign', '--verify', '--strict', str(ai_memory_runtime))
    admitted_content = admit_content(runtime, *content) if content else None
    output.mkdir(parents=True)
    stage = output / NAME
    stage.mkdir()
    sources = {}
    for file in source_files(SOURCE):
        member = file.relative_to(SOURCE)
        if member.parts[0] not in {'scripts', 'licenses', 'assets'} and len(member.parts) != 1:
            raise ValueError(f'Unexpected backend directory: {member}')
        if len(member.parts) == 1 and not (file.suffix == '.mjs' or member.name in {'plugin.json', 'mcp.json', 'README.md'}):
            raise ValueError(f'Unexpected backend file: {member}')
        if member.parts[0] == 'assets' and member.as_posix() != 'assets/icon-mono.png':
            raise ValueError(f'Unexpected branding asset: {member}')
        if member.as_posix() == 'scripts/launch-windows-runtime.ps1':
            continue
        if member.parts[0] == 'scripts' and member.as_posix() != 'scripts/launch-mcp.sh':
            raise ValueError(f'Unexpected launcher: {member}')
        safe_payload(file, member)
        sources[member.as_posix()] = copy_verified(file, stage / member)
    for folder in ('web', 'catalog'):
        for file in source_files(ROOT / 'Resources' / folder):
            # Catalog packs are native-app fallback assets. Portable installs
            # consume independently signed releases from ORACLE-SKILLS.
            if folder == 'catalog' and file.relative_to(ROOT / 'Resources' / folder).parts[0] == 'packs':
                continue
            member = Path('resources') / folder / file.relative_to(ROOT / 'Resources' / folder)
            safe_payload(file, member)
            sources[member.as_posix()] = copy_verified(file, stage / member)
    engine_receipt = copy_engine_inventory(engine_inventory.absolute(), stage) if engine_inventory else None
    member = Path('resources/licensing/public-keys.json')
    sources[member.as_posix()] = copy_verified(ROOT / 'Resources/licensing/public-keys.json', stage / member)
    # Public distributor trust is separate from licensing and download secrets.
    for name in ('sources.json', 'distribution-keys.json'):
        member = Path('resources/updates') / name
        sources[member.as_posix()] = copy_verified(ROOT / 'Resources/updates' / name, stage / member)
    member = Path('resources/updates/portable-access.json')
    sources[member.as_posix()] = copy_verified(access_config, stage / member)
    if sources[member.as_posix()] != access_config_hash:
        raise ValueError('Portable access configuration changed after admission.')
    runtime_hash = copy_verified(runtime, stage / 'runtime/bun')
    if runtime_hash != RUNTIME_SHA256 or (stage / 'runtime/bun').stat().st_size != RUNTIME_BYTES:
        raise ValueError('Reviewed Bun runtime changed before packaging.')
    if ai_memory_runtime is not None:
        sources['runtime/ai-memory'] = copy_verified(ai_memory_runtime, stage / 'runtime/ai-memory')
        (stage / 'runtime/ai-memory').chmod(0o755)
        sources['licenses/AI-MEMORY-LICENSE'] = copy_verified(ai_memory_license, stage / 'licenses/AI-MEMORY-LICENSE')
        for hook_source in sorted((ROOT / 'Resources/ai-memory/portable-hooks').rglob('*')):
            if hook_source.is_file():
                hook_target = 'resources/ai-memory/hooks/' + hook_source.relative_to(ROOT / 'Resources/ai-memory/portable-hooks').as_posix()
                sources[hook_target] = copy_verified(hook_source, stage / hook_target)
        schema_target = 'resources/ai-memory/' + AI_MEMORY_SCHEMA_NAME
        sources[schema_target] = copy_verified(ROOT / 'Resources/ai-memory' / AI_MEMORY_SCHEMA_NAME, stage / schema_target)
        if sources['runtime/ai-memory'] != AI_MEMORY_SHA256 or sources['licenses/AI-MEMORY-LICENSE'] != AI_MEMORY_LICENSE_SHA256 or sources[schema_target] != AI_MEMORY_SCHEMA_SHA256:
            raise ValueError('Reviewed AI Memory component changed before packaging.')
        run('/usr/bin/codesign', '--verify', '--strict', str(stage / 'runtime/ai-memory'))
    (stage / 'runtime/bun').chmod(0o755)
    (stage / 'scripts/launch-mcp.sh').chmod(0o755)
    run('/usr/bin/codesign', '--verify', '--strict', '--test-requirement', '=notarized', str(stage / 'runtime/bun'))
    content_receipt = copy_admitted_technical(admitted_content, *content, stage) if content else None
    # Both supported plugin formats describe the same stable identity.
    plugin = json.loads((stage / 'plugin.json').read_text())
    legacy = {key: plugin[key] for key in ('name', 'version', 'description', 'author')}
    legacy.update(interface=plugin['extensions']['com.openai']['interface'], mcpServers='./.mcp.json')
    (stage / '.codex-plugin').mkdir()
    (stage / '.codex-plugin/plugin.json').write_text(json.dumps(legacy, ensure_ascii=False, indent=2) + '\n')
    copy_verified(stage / 'mcp.json', stage / '.mcp.json')
    files = {file.relative_to(stage).as_posix(): sha(file) for file in source_files(stage)}
    receipt = {'schemaVersion': 1, 'experimental': True, 'productParity': False,
               'runtimeVersion': version, 'runtimeSHA256': runtime_hash,
               'runtimeVendorTeamIdentifier': '7FRXF46ZSN', 'runtimeSignatureVerified': True,
               'runtimeNotarizedRequirementVerified': True, 'runtimeVersionExecuted': True,
               'signatureDetails': '\n'.join(line for line in signature.splitlines() if not line.startswith('Executable=')), 'files': files, 'originalSourceHashes': sources,
               'engineSourceIncluded': bool(engine_receipt), 'engineSourcePin': engine_receipt['engineSourcePin'] if engine_receipt else None,
               'aiMemoryIncluded': ai_memory_runtime is not None, 'aiMemorySHA256': AI_MEMORY_SHA256 if ai_memory_runtime else None,
               'aiMemoryVersion': AI_MEMORY_VERSION if ai_memory_runtime else None, 'aiMemorySignatureIntegrityVerified': ai_memory_runtime is not None,
               'aiMemoryDeveloperIDVerified': False, 'aiMemoryServiceVerified': False,
               'contentEnvelopeIncluded': bool(content_receipt), 'contentTechnicalReceipt': content_receipt,
               'hostImportVerified': False, 'personalProfileTouched': False, 'published': False}
    (stage / 'portable-package-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    archive_members, payload_manifest = build_runtime_payload(stage)
    archive = output / (NAME + '.zip')
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9, allowZip64=False) as zipped:
        for file in source_files(stage):
            member = file.relative_to(stage)
            if member.as_posix() not in archive_members:
                continue
            safe_payload(file, member)
            zipped.write(file, NAME + '/' + member.as_posix())
    with zipfile.ZipFile(archive) as zipped:
        if zipped.testzip() is not None:
            raise ValueError('ZIP checksum failed.')
        for member in archive_members:
            expected = sha(stage / member)
            if hashlib.sha256(zipped.read(NAME + '/' + member)).hexdigest() != expected:
                raise ValueError(f'ZIP member hash mismatch: {member}')
    size = archive.stat().st_size
    limits_module.validate_archive(archive)
    if size > LIMIT:
        raise ValueError('ZIP must be strictly below 100 MiB.')
    value = {'archive': str(archive), 'bytes': size, 'limitBytes': LIMIT, 'underLimit': True,
             'sha256': sha(archive), 'runtimeVersion': version, 'runtimeSHA256': runtime_hash,
             'memberCount': len(archive_members), 'runtimePayloadFileCount': len(payload_manifest['files']), 'runtimePayloadSHA256': payload_manifest['payloadSHA256'], 'engineSourceIncluded': bool(engine_receipt), 'experimental': True, 'hostImportVerified': False,
             'aiMemoryIncluded': ai_memory_runtime is not None, 'aiMemoryServiceVerified': False,
             'contentEnvelopeIncluded': bool(content_receipt), 'contentManifestSHA256': content_receipt['manifestSHA256'] if content_receipt else None,
             'personalProfileTouched': False, 'published': False}
    (output / 'archive-receipt.json').write_text(json.dumps(value, indent=2) + '\n')
    return value

def build_runtime_payload(stage, compression='brotli'):
    """Keep the qualification tree expanded; compress logical runtime for import."""
    external = {'plugin.json', '.codex-plugin/plugin.json', '.mcp.json', 'mcp.json', 'README.md', 'scripts/launch-mcp.sh', 'runtime/bun', 'runtime-payload.mjs', 'runtime-payload-platform.mjs', 'runtime-cache-lock.mjs', 'runtime-binary-source.mjs', 'assets/icon-mono.png'}
    shared_bootstrap = {'stdio-transport.mjs', 'mcp-metadata.mjs'}
    external.update(shared_bootstrap | {'runtime-bootstrap.mjs'})
    if compression not in ('gzip', 'brotli'):
        raise ValueError('unsupported_payload_compression')
    rows, seen = [], {}
    payload = stage / ('runtime-payload.br' if compression == 'brotli' else 'runtime-payload.gz')
    with compression_module.compressed(payload, compression == 'brotli', stage / 'runtime/bun') as compressed:
        for file in source_files(stage):
            member = file.relative_to(stage).as_posix()
            if (member in external and not member.startswith('assets/') and member != 'plugin.json' and member not in shared_bootstrap) or member in {'runtime-payload.gz', 'runtime-payload.br'}:
                continue
            safe_payload(file, Path(member))
            before = sha(file)
            row = {'path': member, 'bytes': file.stat().st_size, 'sha256': before,
                   'mode': 0o755 if file.stat().st_mode & 0o111 else 0o644}
            key = (row['sha256'], row['bytes'], row['mode'])
            if key in seen:
                row['source'] = seen[key]
            else:
                seen[key] = member
                with file.open('rb') as stream:
                    shutil.copyfileobj(stream, compressed)
            rows.append(row)
            if sha(file) != before:
                raise ValueError('Runtime source changed during compression.')
    manifest = {'schemaVersion': 2, 'format': 'oracle-concat-brotli-v2' if compression == 'brotli' else 'oracle-concat-gzip-v2', 'payloadSHA256': sha(payload),
                'runtimeSHA256': sha(stage / 'runtime/bun'), 'expandedBytes': sum(row['bytes'] for row in rows), 'files': rows}
    target = stage / 'runtime-payload-manifest.json'
    target.write_text(json.dumps(manifest, separators=(',', ':')) + '\n')
    return external | {payload.name, 'runtime-payload-manifest.json'}, manifest

def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--runtime', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--engine-inventory', type=Path, help='Reviewed dependency source/target/hash inventory; copy no symlinks.')
    parser.add_argument('--ai-memory-runtime', type=Path, help='Optional exact reviewed AI Memory 2.5.2 binary; no host/service readiness inferred.')
    parser.add_argument('--ai-memory-license', type=Path, help='Exact upstream license for the optional AI Memory component.')
    parser.add_argument('--content-envelope', type=Path, help='Private publisher-signed portable-content-v1 envelope; requires --content-payload and --engine-inventory.')
    parser.add_argument('--content-payload', type=Path, help='Canonical admitted payload root; embed only method/provenance/envelope, never catalog content.')
    args = parser.parse_args(argv)
    if (args.content_envelope is None) != (args.content_payload is None):
        parser.error('--content-envelope and --content-payload must be supplied together.')
    if args.content_envelope is not None and args.engine_inventory is None:
        parser.error('Content packaging requires --engine-inventory.')
    return args

if __name__ == '__main__':
    args = parse_args()
    print(json.dumps(package(args.runtime, args.output, args.engine_inventory, args.ai_memory_runtime, args.ai_memory_license, args.content_envelope, args.content_payload), indent=2))
