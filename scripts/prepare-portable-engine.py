#!/usr/bin/env python3
"""Stage immutable upstream source and frozen dependencies without package links.
No provisioning, shared-vendor mutation, custom native compilation or activation.
"""
import argparse, hashlib, json, os, pathlib, subprocess
from portable_vendor_pins import PINS
ROOT = pathlib.Path(__file__).resolve().parents[1]
OMIT = {'fsevents', '@sentry/profiling-node', 'typescript', 'playwright', 'playwright-core', 'fast-check', 'pure-rand', 'bun-types', 'tree-sitter-wasms'}
NATIVE = {'.node', '.dylib', '.dll', '.exe', '.so', '.a', '.o'}

def prepare(source, output, platform, commit, version):
    source, output = pathlib.Path(source).absolute(), pathlib.Path(output).absolute()
    if source.resolve() != source or output.resolve() != output or output.exists() or not output.is_relative_to(ROOT / '.work'):
        raise ValueError('Canonical checkout and fresh .work destination required.')
    observed = subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()
    if observed != commit: raise ValueError('Checkout differs from immutable upstream release.')
    output.mkdir(parents=True)
    tree, records, packages = output / 'engine-source', [], []
    native_name = {'darwin-arm64': 'darwin-arm64.node', 'win32-x64': 'win32-x64.node'}[platform]
    def copy(original, dest, blob=None, native=False):
        original = original.resolve(strict=True)
        data = original.read_bytes()
        if blob and hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() != blob:
            raise ValueError('Modified tracked upstream source: ' + str(original.relative_to(source)))
        if not native and (data[:4] in [bytes.fromhex('cffaedfe'), b'\x7fELF'] or data[:2] == b'MZ'):
            raise ValueError('Unexpected compiled dependency: ' + original.name)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data); dest.chmod(0o755 if original.stat().st_mode & 0o111 else 0o644)
        records.append({'source': str(dest), 'target': dest.relative_to(output).as_posix(), 'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    for row in subprocess.check_output(['git', '-C', str(source), 'ls-tree', '-rz', 'HEAD']).split(b'\0'):
        if not row: continue
        meta, path = row.split(b'\t'); mode, kind, oid = meta.split(); path = path.decode()
        selected = path.startswith(('src/', 'vendor/', 'patches/', 'skills/')) or path in ['package.json', 'bun.lock', 'LICENSE']
        selected = selected or path in ['native/locks/README.md', 'native/locks/prebuilds/manifest.json', 'native/locks/vendor/node-v22.15.0/LICENSE', 'native/locks/prebuilds/' + native_name]
        if not selected: continue
        if mode not in [b'100644', b'100755']: raise ValueError('Nonregular tracked upstream member.')
        copy(source / path, tree / 'vendor/gbrain' / path, oid.decode(), path.endswith('.node'))
    def deps(directory, destination, ancestors=()):
        for entry in sorted(directory.iterdir()):
            if entry.name.startswith('.'): continue
            if entry.name.startswith('@'): deps(entry, destination / entry.name, ancestors); continue
            actual = entry.resolve(strict=True)
            if actual in ancestors or not (actual / 'package.json').is_file(): continue
            package = json.loads((actual / 'package.json').read_text()); name = package.get('name', '')
            if name in OMIT or name.startswith(('@swc/', '@tree-sitter-grammars/', '@types/', '@playwright/')): continue
            allfiles = sorted(actual.rglob('*'))
            if any(p.suffix in NATIVE for p in allfiles if 'node_modules' not in p.relative_to(actual).parts): continue
            dest = destination / entry.name
            for file in allfiles:
                rel = file.relative_to(actual)
                if 'node_modules' in rel.parts or any(p in ['.github', '.history'] for p in rel.parts) or not file.is_file() or file.is_symlink(): continue
                copy(file, dest / rel)
            packages.append({'name': package['name'], 'version': package['version'], 'license': package.get('license'), 'logicalPath': dest.relative_to(output).as_posix()})
            if (actual / 'node_modules').is_dir(): deps(actual / 'node_modules', dest / 'node_modules', ancestors + (actual,))
    deps(source / 'node_modules', tree / 'vendor/gbrain/node_modules')
    for file in sorted((ROOT / 'packages/gbrain-adapter').glob('*')):
        if file.is_file() and file.suffix in ['.ts', '.mjs']: copy(file, tree / 'packages/gbrain-adapter' / file.name)
    copy(ROOT / 'packages/oracle-desktop-portable/closed-profile-upgrade.mjs', tree / 'packages/oracle-desktop-portable/closed-profile-upgrade.mjs')
    pin = tree / 'packages/gbrain-adapter/engine-pins.ts'
    pin.write_text('export const ENGINE_VERSION=' + json.dumps(version) + ';\nexport const ENGINE_COMMIT=' + json.dumps(commit) + ';\nexport const ENGINE_HISTORY=' + json.dumps(PINS['gbrainHistory']) + ';\n')
    for row in records:
        data = pathlib.Path(row['source']).read_bytes(); row['size'] = len(data); row['sha256'] = hashlib.sha256(data).hexdigest()
    inventory = {'pin': commit, 'sourceVersion': version, 'manifest': records, 'packages': packages, 'missing': [], 'unexpectedNativeFiles': [], 'aiMemoryIncluded': False}
    (output / 'engine-inventory.json').write_text(json.dumps(inventory, indent=2) + '\n')
    return {'files': len(records), 'packages': len(packages), 'bytes': sum(r['size'] for r in records), 'platform': platform, 'inventory': str(output / 'engine-inventory.json')}

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for name in ['source', 'output', 'commit', 'version']: p.add_argument('--' + name, required=True)
    p.add_argument('--platform', required=True, choices=['darwin-arm64', 'win32-x64']); a = p.parse_args()
    print(json.dumps(prepare(a.source, a.output, a.platform, a.commit, a.version)))
