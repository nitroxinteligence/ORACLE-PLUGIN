#!/usr/bin/env python3
"""Package the official host CLI installer without a second embedded runtime."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FILES = ('Instalar Oracle.command', 'installer-lib.sh', 'LEIA-ME.txt', 'local-package.sh')


def package(version, output, plugin_archive=None, approved_sha256=None):
    if not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise ValueError('Invalid release version')
    source = ROOT / 'distribution/portable/installer'
    output = Path(output)
    if output.exists():
        raise ValueError('Output already exists')
    descriptor = None
    if plugin_archive is not None:
        plugin_archive = Path(plugin_archive)
        actual = hashlib.sha256(plugin_archive.read_bytes()).hexdigest()
        if actual != approved_sha256:
            raise ValueError('Archive does not match independently approved SHA-256')
        with zipfile.ZipFile(plugin_archive) as original:
            prefix = 'oracle-system-mac-0-1-32/'
            for row in original.infolist():
                if not row.filename.startswith(prefix) or '..' in Path(row.filename).parts or ((row.external_attr >> 16) & 0o170000) == 0o120000:
                    raise ValueError('Unsafe or unsupported plugin source')
            if original.testzip() is not None:
                raise ValueError('Plugin CRC failed')
            metadata = json.loads(original.read(prefix + 'plugin.json'))
            if metadata.get('name') != prefix[:-1] or metadata.get('version') != version:
                raise ValueError('Plugin identity or version mismatch')
        descriptor = {'schemaVersion': 1, 'kind': 'complete-mac-installer', 'version': version, 'pluginName': prefix[:-1], 'sha256': actual, 'bytes': plugin_archive.stat().st_size}
    output.parent.mkdir(parents=True, exist_ok=True)
    try:
        with zipfile.ZipFile(output, 'x', compression=zipfile.ZIP_DEFLATED, allowZip64=False) as archive:
            for name in FILES:
                file = source / name
                if not file.is_file() or file.is_symlink():
                    raise ValueError('Installer source missing or linked')
                entry = zipfile.ZipInfo(f'Oracle-System-Instalador/{name}', (2026, 10, 24, 0, 0, 0))
                entry.compress_type = zipfile.ZIP_DEFLATED
                entry.create_system = 3
                entry.external_attr = (0o100755 if name.endswith(('.command', '.sh')) else 0o100644) << 16
                archive.writestr(entry, file.read_bytes())
            if descriptor:
                entry = zipfile.ZipInfo('Oracle-System-Instalador/plugin-archive.json', (2026, 10, 24, 0, 0, 0))
                entry.external_attr = 0o100644 << 16
                archive.writestr(entry, json.dumps(descriptor, indent=2) + '\n')
                # The qualified inner ZIP is already compressed. Store it byte
                # for byte, preserving its independent approved hash.
                archive.write(plugin_archive, 'Oracle-System-Instalador/plugin.zip', compress_type=zipfile.ZIP_STORED)
    except BaseException:
        output.unlink(missing_ok=True)
        raise
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', required=True)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--plugin-archive', type=Path)
    parser.add_argument('--sha256', help='Independently approved inner plugin SHA-256')
    args = parser.parse_args()
    print(package(args.version, args.output, args.plugin_archive, args.sha256))
