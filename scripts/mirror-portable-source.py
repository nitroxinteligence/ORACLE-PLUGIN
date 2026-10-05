#!/usr/bin/env python3
"""Copy the explicit public portable source surface, never native/private state."""
import argparse, json, pathlib, shutil, subprocess
from catalog_safety import check_publication_bytes
ROOT = pathlib.Path(__file__).resolve().parents[1]
SCRIPTS = ['portable_vendor_pins.py', 'portable-upstream-intake.mjs', 'prepare-portable-vendors.py', 'prepare-portable-engine.py', 'prepare-portable-content.py', 'package-portable-plugin.py', 'package-portable-plugin-windows.py', 'package-windows-runtime-probe.py', 'portable-payload-compression.py', 'portable-archive-limits.py', 'windows-plugin-metadata.py', 'windows-runtime-archive.py', 'sign-portable-content.mjs', 'prepare-plugin-release.py', 'sign-plugin-release.mjs', 'qualify-portable-package.py', 'qualify-portable-upstream.mjs', 'portable-updates-fixture.mjs', 'test-portable-skills-updates.mjs', 'test-portable-profile-upgrade.mjs', 'test-portable-content-admission.mjs', 'test-portable-official-hooks.mjs', 'test-plugin-bridge.mjs', 'catalog_safety.py', 'mirror-portable-source.py', 'build-official-skills.py', 'download-portable-baseline.mjs', 'download-reviewed-skills.mjs', 'release-portable.py']

def mirror(destination):
    destination = pathlib.Path(destination).absolute()
    if destination.resolve() != destination or not destination.is_relative_to(ROOT / '.work'): raise ValueError('Canonical isolated mirror inside .work required')
    if (destination / '.git').exists():
        remote = subprocess.check_output(['git', '-C', str(destination), 'config', '--get', 'remote.origin.url'], text=True).strip()
        if remote not in ['https://github.com/nitroxinteligence/ORACLE-PLUGIN.git', 'git@github.com:nitroxinteligence/ORACLE-PLUGIN.git']: raise ValueError('Public distribution checkout required')
        dirty = subprocess.check_output(['git', '-C', str(destination), 'status', '--porcelain'], text=True)
        if dirty: raise ValueError('Existing mirror changes preserved')
    destination.mkdir(parents=True, exist_ok=True)
    generation_path=destination/'Resources/updates/portable-upstream.json'
    published_generations=json.loads(generation_path.read_text()) if generation_path.is_file() else None
    mapping = {}
    for folder in ['packages/oracle-desktop-portable', 'packages/gbrain-adapter', 'Resources/web', 'Resources/ai-memory/portable-hooks']:
        for source in sorted((ROOT / folder).rglob('*')):
            if source.is_file(): mapping[source.relative_to(ROOT).as_posix()] = source
    for path in ['packages/oracle-desktop-plugin/ai-memory-relay.mjs', 'Resources/catalog/manifest.json', 'Resources/catalog/departments.json', 'Resources/licensing/public-keys.json', 'Resources/updates/sources.json', 'Resources/updates/distribution-keys.json', 'Resources/updates/portable-access.json', 'Resources/updates/portable-upstream.json']:
        mapping[path] = ROOT / path
    for source in sorted((ROOT / 'Resources/ai-memory').glob('portable-schema-v*.json')): mapping[source.relative_to(ROOT).as_posix()] = source
    for name in SCRIPTS: mapping['scripts/' + name] = ROOT / 'scripts' / name
    mapping['.github/workflows/portable-release.yml'] = ROOT / 'distribution/portable/workflows/release.yml'
    mapping['README.md'] = ROOT / 'distribution/portable/README.md'
    for name, source in mapping.items():
        if source.is_symlink() or source.resolve() != source or not source.is_file(): raise ValueError('Irregular allowlisted public source')
        check_publication_bytes(name, source.read_bytes())
    # These source directories are owned by the clean publisher checkout.
    for folder in ['packages/oracle-desktop-portable', 'packages/gbrain-adapter', 'Resources/web', 'Resources/ai-memory/portable-hooks']:
        if (destination / folder).exists(): shutil.rmtree(destination / folder)
    for name, source in mapping.items():
        target = destination / name; target.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(source, target)
    # Automatic upstream generations belong to the distribution repository.
    # An approved application push must not erase clients' upgrade ancestry.
    if published_generations:
        incoming=json.loads(generation_path.read_text())
        for name in ['gbrainHistory','aiMemoryHistory']:
            for row in incoming[name]:
                if row not in published_generations[name]:published_generations[name].append(row)
        generation_path.write_text(json.dumps(published_generations,sort_keys=True,indent=2)+'\n')
    (destination / '.gitignore').write_text('.work/\nnode_modules/\n__pycache__/\n*.pyc\n')
    return {'files': len(mapping), 'personalStateIncluded': False}

if __name__ == '__main__':
    import json
    p = argparse.ArgumentParser(description=__doc__); p.add_argument('--destination', required=True); a = p.parse_args(); print(json.dumps(mirror(a.destination)))
