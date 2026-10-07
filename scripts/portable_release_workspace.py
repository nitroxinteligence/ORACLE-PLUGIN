"""Own one disposable release workspace and retain only bounded gate reports."""
from contextlib import contextmanager
import json
from pathlib import Path
import shutil
import stat
import tempfile

REPORTS = (
    'previous-boot/report.json', 'previous-boot/stderr.log',
    'current-boot/report.json', 'current-boot/stderr.log',
    'onboarding/report.json', 'migration/report.json', 'lifecycle-report.json',
)


def private_directory(path):
    path.mkdir(mode=0o700, exist_ok=True)
    if path.is_symlink() or path.resolve() != path or not path.is_dir():
        raise ValueError('Canonical private release directory required')


@contextmanager
def portable_release_workspace(root, *, keep_work=False):
    root = Path(root).resolve()
    work = root / '.work'
    private_directory(work)
    job = Path(tempfile.mkdtemp(prefix='release-', dir=work))
    identity = job.stat()
    try:
        yield job
    finally:
        current = job.lstat()
        if not stat.S_ISDIR(current.st_mode) or (current.st_dev, current.st_ino) != (identity.st_dev, identity.st_ino):
            raise ValueError('Release workspace changed; automatic removal refused')
        reports = work / 'portable-release-reports'
        private_directory(reports)
        retained = reports / job.name
        retained.mkdir(mode=0o700)
        copied = []
        for name in REPORTS:
            source = job / name
            if not source.exists():
                continue
            info = source.lstat()
            if source.resolve() != source or not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size > 1_000_000:
                raise ValueError('Irregular qualification report; workspace retained')
            target = retained / name.replace('/', '-')
            with target.open('xb') as output:
                target.chmod(0o600)
                output.write(source.read_bytes())
            copied.append(target.name)
        if not keep_work:
            shutil.rmtree(job)
        (retained / 'retention.json').write_text(json.dumps({
            'workspace': str(job), 'transientArtifactsRemoved': not keep_work,
            'reports': copied,
        }, indent=2) + '\n')
        (retained / 'retention.json').chmod(0o600)
