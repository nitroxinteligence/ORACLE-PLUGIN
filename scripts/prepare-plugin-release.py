#!/usr/bin/env python3
"""Inspect both closed ZIPs and stage the immutable marketplace tree."""
import argparse, hashlib, json, pathlib, stat, zipfile

def main(a):
    root = pathlib.Path(__file__).resolve().parents[1]; output = pathlib.Path(a.output).absolute()
    if output.exists() or output.resolve() != output or not output.is_relative_to(root / '.work'): raise ValueError('Fresh canonical publisher output required')
    output.mkdir(parents=True); platforms = {}; mac = None
    for platform, name, file in [('darwin-arm64', 'oracle-system-mac-v017', a.mac), ('win32-x64', 'oracle-system-windows-v017', a.windows)]:
        archive = pathlib.Path(file).absolute(); data = archive.read_bytes()
        if len(data) >= 100000000: raise ValueError('Plugin archive limit')
        inventory = {}; package = output / 'plugins' / name; package.mkdir(parents=True)
        with zipfile.ZipFile(archive) as z:
            if len(z.infolist()) > 100 or z.testzip(): raise ValueError('Closed ZIP invalid')
            for row in z.infolist():
                path = pathlib.PurePosixPath(row.filename); mode = row.external_attr >> 16
                if row.is_dir() or path.is_absolute() or '..' in path.parts or path.parts[0] != name or len(path.parts) < 2 or stat.S_ISLNK(mode): raise ValueError('Unsafe marketplace member')
                member = pathlib.PurePosixPath(*path.parts[1:]).as_posix()
                if member in inventory: raise ValueError('Duplicate marketplace member')
                content = z.read(row); permissions = mode & 0o777
                if permissions not in [0o644, 0o755]: raise ValueError('Unexpected marketplace mode')
                target = package / member; target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(content); target.chmod(permissions)
                inventory[member] = {'sha256': hashlib.sha256(content).hexdigest(), 'bytes': len(content), 'mode': permissions}
            manifest = json.loads((package / 'plugin.json').read_text()); legacy = json.loads((package / '.codex-plugin/plugin.json').read_text())
            if manifest['name'] != name or manifest['version'] != a.version or any(legacy[k] != manifest[k] for k in ['name', 'version']): raise ValueError('Stable plugin metadata mismatch')
        platforms[platform] = {'name': name, 'path': 'plugins/' + name, 'asset': 'Oracle-System-' + a.version + ('-Mac.zip' if platform == 'darwin-arm64' else '-Windows.zip'), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'files': inventory}
    manifest_dir = output / '.agents/plugins'; manifest_dir.mkdir(parents=True)
    (manifest_dir / 'marketplace.json').write_text(json.dumps({'name': 'oracle-system', 'interface': {'displayName': 'Oracle System'}, 'plugins': [{'name': p['name'], 'source': {'source': 'local', 'path': './' + p['path']}} for p in platforms.values()]}, indent=2) + '\n')
    (output / 'platforms.json').write_text(json.dumps(platforms, indent=2) + '\n'); return {'output': str(output), 'platforms': list(platforms)}

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for name in ['mac', 'windows', 'version', 'output']: p.add_argument('--' + name, required=True)
    print(json.dumps(main(p.parse_args())))
