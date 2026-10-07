"""Destructive-cleanup boundaries exercised only in disposable directories."""
from pathlib import Path
import tempfile
import unittest
from portable_release_workspace import portable_release_workspace


class ReleaseWorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name).resolve()
        self.outside = self.root / 'host-plugin-data'
        self.outside.mkdir()
        self.profile = self.outside / 'profile.json'
        self.profile.write_text('{"vaultSelection":"retained"}')

    def tearDown(self):
        self.temporary.cleanup()

    def test_completed_job_keeps_report_and_removes_only_its_copies(self):
        (self.root / '.work').mkdir()
        unrelated = self.root / '.work' / 'other-task.txt'
        unrelated.write_text('preserve')
        with portable_release_workspace(self.root) as job:
            (job / 'current-boot').mkdir()
            (job / 'current-boot/report.json').write_text('{"passed":true}')
            (job / 'runtime-copy').write_bytes(b'discardable')
            (job / 'profile-link').symlink_to(self.outside, target_is_directory=True)
        self.assertFalse(job.exists())
        self.assertEqual(self.profile.read_text(), '{"vaultSelection":"retained"}')
        self.assertEqual(unrelated.read_text(), 'preserve')
        retained = self.root / '.work/portable-release-reports' / job.name
        self.assertEqual((retained / 'current-boot-report.json').read_text(), '{"passed":true}')

    def test_failed_job_is_cleaned_and_retains_diagnostics(self):
        with self.assertRaisesRegex(RuntimeError, 'synthetic failure'):
            with portable_release_workspace(self.root) as job:
                (job / 'current-boot').mkdir()
                (job / 'current-boot/stderr.log').write_text('synthetic diagnostic')
                raise RuntimeError('synthetic failure')
        self.assertFalse(job.exists())
        retained = self.root / '.work/portable-release-reports' / job.name
        self.assertEqual((retained / 'current-boot-stderr.log').read_text(), 'synthetic diagnostic')
        self.assertTrue(self.profile.exists())

    def test_retention_requires_an_explicit_option(self):
        with portable_release_workspace(self.root, keep_work=True) as job:
            (job / 'runtime-copy').write_bytes(b'explicit retention')
        self.assertTrue((job / 'runtime-copy').exists())

    def test_replaced_workspace_cannot_remove_a_host_profile(self):
        with self.assertRaisesRegex(ValueError, 'workspace changed'):
            with portable_release_workspace(self.root) as job:
                job.rename(job.with_name(job.name + '-original'))
                job.symlink_to(self.outside, target_is_directory=True)
        self.assertEqual(self.profile.read_text(), '{"vaultSelection":"retained"}')


if __name__ == '__main__':
    unittest.main()
