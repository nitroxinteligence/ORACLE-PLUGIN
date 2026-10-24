#!/usr/bin/env python3
"""Package the official host CLI installer without a second embedded runtime."""
import argparse
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FILES = ('Instalar Oracle.command', 'installer-lib.sh', 'LEIA-ME.txt')


def package(version, output):
    if not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise ValueError('Invalid release version')
    source = ROOT / 'distribution/portable/installer'
    output = Path(output)
    if output.exists():
        raise ValueError('Output already exists')
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
    except BaseException:
        output.unlink(missing_ok=True)
        raise
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', required=True)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    print(package(args.version, args.output))
