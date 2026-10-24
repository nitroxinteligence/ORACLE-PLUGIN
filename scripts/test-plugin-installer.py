#!/usr/bin/env python3
"""Exercise host CLI control flow without changing the user's plugin registry."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / 'distribution/portable/installer/installer-lib.sh'
spec = importlib.util.spec_from_file_location('installer_package', ROOT / 'scripts/package-plugin-installer.py')
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)


class InstallerTest(unittest.TestCase):
    def fixture(self, directory, marketplaces=None, denied=False):
        root = Path(directory)
        cli = root / 'official-cli-fixture'
        cli.write_text('''#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
root = Path(__file__).parent
args = sys.argv[1:]
with (root / 'calls.jsonl').open('a') as stream: stream.write(json.dumps(args) + '\\n')
if args[:3] == ['plugin','marketplace','list']:
 print((root / 'marketplaces.json').read_text())
elif args[:2] == ['plugin','add']:
 if (root / 'denied').exists():
  print('Plugin installation is disabled by your administrator', file=sys.stderr); sys.exit(1)
 print(json.dumps({'pluginId':'oracle-system-mac-stable@oracle-system','version':'0.1.42'}))
else: print(json.dumps({'marketplaceName':'oracle-system','alreadyAdded':False}))
''')
        cli.chmod(0o755)
        (root / 'marketplaces.json').write_text(json.dumps({'marketplaces': marketplaces or []}))
        if denied:
            (root / 'denied').touch()
        (root / 'scratch').mkdir()
        result = subprocess.run(['/bin/bash', '-c', 'set -euo pipefail; source "$1"; oracle_install "$2" "$3"',
                                 'installer-test', str(LIB), str(cli), str(root / 'scratch')], text=True, capture_output=True, timeout=15)
        calls = [json.loads(line) for line in (root / 'calls.jsonl').read_text().splitlines()]
        return result, calls

    def test_first_install_and_existing_marketplace_keep_one_identity(self):
        base = ROOT / '.work/import-installer-tests'
        base.mkdir(parents=True, exist_ok=True)
        for existing in (False, True):
            with tempfile.TemporaryDirectory(dir=base) as directory:
                marketplaces = [{'name': 'oracle-system', 'marketplaceSource': {'sourceType': 'git', 'source': 'https://github.com/nitroxinteligence/ORACLE-PLUGIN.git'}}] if existing else []
                result, calls = self.fixture(directory, marketplaces)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn('Oracle System 0.1.42 instalado', result.stdout)
                self.assertEqual(calls[-1], ['plugin', 'add', 'oracle-system-mac-stable@oracle-system', '--json'])
                self.assertEqual(calls[1][:3], ['plugin', 'marketplace', 'upgrade' if existing else 'add'])
                self.assertFalse(any('remove' in call for call in calls))

    def test_policy_failure_is_visible_and_does_not_trigger_cleanup(self):
        base = ROOT / '.work/import-installer-tests'
        base.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base) as directory:
            result, calls = self.fixture(directory, denied=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('disabled by your administrator', result.stderr)
            self.assertNotIn('instalado pelo gerenciador', result.stdout)
            self.assertFalse(any('remove' in call for call in calls))

    def test_unrelated_marketplace_is_preserved_before_any_mutation(self):
        base = ROOT / '.work/import-installer-tests'
        base.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base) as directory:
            result, calls = self.fixture(directory, [{'name': 'oracle-system', 'marketplaceSource': {'sourceType': 'git', 'source': 'https://example.invalid/unrelated.git'}}])
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('foi preservada', result.stderr)
            self.assertEqual(len(calls), 1)

    def test_archive_keeps_executable_bit_and_refuses_to_replace_existing_files(self):
        base = ROOT / '.work/import-installer-tests'
        base.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base) as directory:
            output = Path(directory) / 'installer.zip'
            packager.package('0.1.42', output)
            with zipfile.ZipFile(output) as archive:
                self.assertIsNone(archive.testzip())
                self.assertEqual(len(archive.infolist()), 3)
                entry = archive.getinfo('Oracle-System-Instalador/Instalar Oracle.command')
                self.assertEqual((entry.external_attr >> 16) & 0o777, 0o755)
                self.assertNotIn('runtime/bun', '\n'.join(archive.namelist()))
            before = output.read_bytes()
            with self.assertRaisesRegex(ValueError, 'already exists'):
                packager.package('0.1.42', output)
            self.assertEqual(output.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
