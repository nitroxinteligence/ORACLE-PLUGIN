#!/usr/bin/env python3
"""Read official immutable intake bytes and generate bounded portable pins.

This prepares a candidate. Publication requires the real compatibility gate.
Original binaries, hook scripts and upstream source are never rewritten.
"""
import argparse, hashlib, json, pathlib, re, shutil, sqlite3, struct, subprocess, tarfile, zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONFIG = ROOT / 'Resources/updates/portable-upstream.json'
sha = lambda data: hashlib.sha256(data).hexdigest()
encoded = lambda value: (json.dumps(value, sort_keys=True, indent=2) + '\n').encode()

def checked_asset(intake, component, name):
    rows = [r for r in component['assets'] if r['name'] == name]
    if len(rows) != 1: raise ValueError('Required official asset absent')
    row = rows[0]
    if row['url'] != 'https://github.com/' + component['repository'] + '/releases/download/' + component['tag'] + '/' + name:
        raise ValueError('Nonofficial asset origin')
    path = intake / name; data = path.read_bytes()
    if len(data) != row['bytes'] or sha(data) != row['sha256'] or not 0 < len(data) <= 44000000:
        raise ValueError('Official asset changed')
    return path, {'url': row['url'], 'archiveBytes': row['bytes'], 'archiveSHA256': row['sha256']}

def tar_members(path):
    with tarfile.open(path) as archive:
        files = {}
        for row in archive.getmembers():
            if row.isdir(): continue
            name = pathlib.PurePosixPath(row.name)
            if not row.isfile() or name.is_absolute() or '..' in name.parts or name.as_posix() in files or row.size > 100000000:
                raise ValueError('Irregular upstream archive')
            files[name.as_posix()] = archive.extractfile(row).read()
        if sum(map(len, files.values())) > 180000000: raise ValueError('Expanded vendor archive limit')
        return files

def main(a):
    intake, output, method = pathlib.Path(a.intake).absolute(), pathlib.Path(a.output).absolute(), pathlib.Path(a.method).absolute()
    if output.exists() or output.resolve() != output or not output.is_relative_to(ROOT / '.work'):
        raise ValueError('Fresh canonical .work output required')
    record = json.loads(CONFIG.read_text()); candidate = json.loads((intake / 'intake.json').read_text())
    if not candidate.get('downloaded') or candidate.get('qualified'): raise ValueError('Unmodified intake required')
    for key, repo in [('gbrain', 'garrytan/gbrain'), ('aiMemory', 'akitaonrails/ai-memory')]:
        component = candidate['components'][key]
        if component['repository'] != repo or not re.fullmatch('[a-f0-9]{40}', component['commit']): raise ValueError('Invalid immutable upstream')
        if tuple(map(int,component['version'].split('.'))) < tuple(map(int,record[key]['version'].split('.'))): raise ValueError('Upstream rollback refused')
        checkout = intake / ('gbrain' if key == 'gbrain' else 'ai-memory-source')
        if subprocess.check_output(['git', '-C', str(checkout), 'rev-parse', 'HEAD'], text=True).strip() != component['commit']:
            raise ValueError('Checkout differs from resolved tag')
    output.mkdir(parents=True); ai = candidate['components']['aiMemory']; gbrain = candidate['components']['gbrain']
    old_ai = record['aiMemory']; old_gbrain = record['gbrain']
    history = record['aiMemoryHistory']
    if old_ai['version'] != ai['version']:
        prior = {'version': old_ai['version'], 'binarySHA256': old_ai['darwin-arm64']['sha256'], 'schemaSHA256': old_ai['schemaSHA256']}
        if prior not in history: history.append(prior)
    if old_gbrain['commit'] != gbrain['commit'] and old_gbrain['commit'] not in record['gbrainHistory']:
        record['gbrainHistory'].append(old_gbrain['commit'])
    next_ai = {'repository': ai['repository'], 'version': ai['version'], 'commit': ai['commit']}
    mac, mac_pin = checked_asset(intake, ai, 'ai-memory-macos-aarch64.tar.gz'); mac_files = tar_members(mac)
    for platform, files, pin, member, target, license_name in [
        ('darwin-arm64', mac_files, mac_pin, 'ai-memory', 'ai-memory-mac', 'AI-MEMORY-LICENSE'),
        ('win32-x64', None, None, 'ai-memory.exe', 'ai-memory-windows.exe', 'AI-MEMORY-WINDOWS-LICENSE')]:
        if files is None:
            archive, pin = checked_asset(intake, ai, 'ai-memory-windows-x86_64.zip')
            with zipfile.ZipFile(archive) as z:
                if len(z.namelist()) != len(set(z.namelist())): raise ValueError('Duplicate ZIP member')
                files = {name: z.read(name) for name in ['ai-memory.exe', 'LICENSE']}
        binary, license_bytes = files[member], files['LICENSE']
        if not 1000000 <= len(binary) <= 100000000 or len(license_bytes) > 100000: raise ValueError('Vendor payload limit')
        certificate = 0
        if platform == 'win32-x64':
            pe = struct.unpack_from('<I', binary, 0x3c)[0]
            if binary[:2] != b'MZ' or binary[pe:pe+4] != b'PE\0\0' or struct.unpack_from('<H', binary, pe+4)[0] != 0x8664:
                raise ValueError('Original Windows x64 PE required')
            offset, certificate = struct.unpack_from('<II', binary, pe+24+112+32)
            if certificate and (offset % 8 or offset + certificate > len(binary)): raise ValueError('Irregular certificate table')
        (output / target).write_bytes(binary); (output / target).chmod(0o755)
        (output / license_name).write_bytes(license_bytes)
        next_ai[platform] = {**pin, 'member': member, 'bytes': len(binary), 'sha256': sha(binary), 'licenseSHA256': sha(license_bytes), 'certificateBytes': certificate}
    schema = sqlite3.connect(':memory:')
    migrations = sorted((intake / 'ai-memory-source/crates/ai-memory-store/migrations').glob('V*.sql'), key=lambda p: int(p.name.split('__')[0][1:]))
    if not migrations or len(migrations) > 1000: raise ValueError('Migration inventory limit')
    for path in migrations: schema.executescript(path.read_text())
    tables = {}
    for (name,) in schema.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '%fts%' AND name NOT LIKE 'sqlite_%' AND name!='refinery_schema_history' ORDER BY name"):
        if not re.fullmatch('[a-z_]+', name): raise ValueError('Unsupported schema identifier')
        tables[name] = [{'name': r[1], 'type': r[2]} for r in schema.execute('PRAGMA table_info("' + name + '")')]
    schema.close(); schema_bytes = encoded({'commit': ai['commit'], 'version': ai['version'], 'tables': tables})
    next_ai['schemaSHA256'] = sha(schema_bytes)
    (ROOT / 'Resources/ai-memory' / ('portable-schema-v' + ai['version'] + '.json')).write_bytes(schema_bytes)
    hooks_archive, hooks_pin = checked_asset(intake, ai, 'ai-memory-hooks.tar.gz'); hooks = tar_members(hooks_archive)
    expected = ['_lib.sh', 'lib/ai-memory-hook.ps1'] + ['codex/' + event + extension for event in ['session-start', 'user-prompt-submit', 'pre-tool-use', 'post-tool-use', 'pre-compact', 'stop', 'session-end'] for extension in ['.sh', '.ps1']]
    hooks_output = ROOT / 'Resources/ai-memory/portable-hooks'
    if hooks_output.exists(): shutil.rmtree(hooks_output)
    hook_rows = []
    for name in sorted(expected):
        data = hooks['hooks/' + name]; path = hooks_output / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(data)
        hook_rows.append({'path': name, 'bytes': len(data), 'sha256': sha(data)})
    hooks_manifest = (json.dumps({'version': ai['version'], 'commit': ai['commit'], 'files': hook_rows}, indent=2) + '\n').encode()
    (hooks_output / 'manifest.json').write_bytes(hooks_manifest)
    next_ai['hooks'] = {**hooks_pin, 'manifestSHA256': sha(hooks_manifest)}
    next_gbrain = {'repository': gbrain['repository'], 'version': gbrain['version'], 'commit': gbrain['commit'], 'methodManifestSHA256': sha((method / 'manifest.json').read_bytes()), 'native': {}}
    for platform in ['darwin-arm64', 'win32-x64']:
        source = intake / ('gbrain/native/locks/prebuilds/' + platform + '.node'); data = source.read_bytes()
        logical = source.relative_to(intake / 'gbrain').as_posix()
        blob = subprocess.check_output(['git', '-C', str(intake / 'gbrain'), 'rev-parse', 'HEAD:' + logical], text=True).strip()
        if hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() != blob or not 1000 < len(data) < 160000:
            raise ValueError('Original kernel-lock addon changed or exceeds budget')
        next_gbrain['native'][platform] = {'path': 'engine-source/vendor/gbrain/' + logical, 'bytes': len(data), 'sha256': sha(data)}
    record.update(aiMemory=next_ai, gbrain=next_gbrain); CONFIG.write_bytes(encoded(record))
    json_string = lambda value: json.dumps(value, separators=(',', ':'))
    pins = {'version': ai['version'], 'commit': ai['commit'], 'binarySHA256': next_ai['darwin-arm64']['sha256'], 'binaryBytes': next_ai['darwin-arm64']['bytes'], 'schemaSHA256': next_ai['schemaSHA256'], 'licenseSHA256': next_ai['darwin-arm64']['licenseSHA256'], 'hooksManifestSHA256': next_ai['hooks']['manifestSHA256'], 'platform': 'darwin', 'architecture': 'arm64', 'minimumMacOS': 13}
    portable = ROOT / 'packages/oracle-desktop-portable'
    (portable / 'ai-memory-pins.mjs').write_text('export const AI_MEMORY_PINS=Object.freeze(' + json_string(pins) + ');\nexport const AI_MEMORY_GENERATIONS=Object.freeze(' + json_string(history) + ');\nexport const PREVIOUS_AI_MEMORY_PINS=AI_MEMORY_GENERATIONS.at(-1);\n')
    (portable / 'gbrain-native-pins.mjs').write_text('// Original immutable upstream Node-API addons, without Oracle compilation.\nexport const GBRAIN_NATIVE_PINS=Object.freeze(' + json_string(next_gbrain['native']) + ');\n')
    win_bun, win_ai = record['bun']['win32-x64'], next_ai['win32-x64']
    windows = {'platform': 'win32', 'architecture': 'x64', 'hostQualified': False, 'bun': {**win_bun, 'version': record['bun']['version'], 'variant': 'x64-baseline', 'machine': 0x8664, 'certificateTableBytes': win_bun['certificateBytes'], 'authenticodeVerified': False, 'executionVerified': False}, 'aiMemory': {**win_ai, 'version': ai['version'], 'commit': ai['commit'], 'machine': 0x8664, 'certificateTableBytes': win_ai['certificateBytes'], 'licenseMember': 'LICENSE', 'authenticodeVerified': False, 'executionVerified': False, 'requiredNonCoreDLLs': ['VCRUNTIME140.dll']}}
    (portable / 'portable-windows-runtime-pins.mjs').write_text('// Static admission only. Windows execution remains a separate qualification.\nexport const WINDOWS_RUNTIME_PINS=Object.freeze(' + json_string(windows) + ');\n')
    mac_bun = record['bun']['darwin-arm64']; content_pins = {'runtimeSHA256': mac_bun['sha256'], 'runtimeBytes': mac_bun['bytes'], 'bunVersion': record['bun']['version'], 'gbrainVersion': gbrain['version'], 'gbrainCommit': gbrain['commit'], 'methodManifestSHA256': next_gbrain['methodManifestSHA256']}
    admission = portable / 'content-admission.mjs'; text = admission.read_text()
    text, count = re.subn(r'export const PORTABLE_CONTENT_PINS = Object.freeze\(.*?\);', 'export const PORTABLE_CONTENT_PINS = Object.freeze(' + json_string(content_pins) + ');', text, count=1)
    if count != 1: raise ValueError('Content pin generation anchor changed')
    admission.write_text(text)
    runner = portable / 'gbrain-source-runner.mjs'; text = runner.read_text()
    for name, value in [('GBRAIN_SOURCE_PIN', gbrain['commit']), ('GBRAIN_SOURCE_VERSION', gbrain['version'])]:
        text, count = re.subn(r'export const ' + name + r' = [^;]+;', 'export const ' + name + ' = ' + json.dumps(value) + ';', text, count=1)
        if count != 1: raise ValueError('Engine generation anchor changed')
    runner.write_text(text)
    (output / 'vendors.json').write_bytes(encoded({'pinsGenerated': True, 'qualified': False, 'aiMemoryVersion': ai['version'], 'gbrainVersion': gbrain['version']}))
    return {'pinsGenerated': True, 'qualified': False, 'output': str(output), 'aiMemoryVersion': ai['version'], 'gbrainVersion': gbrain['version']}

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for name in ['intake', 'output', 'method']: p.add_argument('--' + name, required=True)
    print(json.dumps(main(p.parse_args())))
