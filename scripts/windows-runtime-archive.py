"""Deterministic, pinned Windows runtime archive and native MCP launcher config."""
import gzip
import hashlib
import pathlib
import re

CHUNK = 1024 * 1024
MEMBER_LIMIT = 100_000_000
LAUNCHER_PATH = 'scripts/launch-windows-runtime.ps1'


def sha256(path):
    digest = hashlib.sha256()
    with pathlib.Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(CHUNK), b''):
            digest.update(block)
    return digest.hexdigest()


def archive_runtime(source, destination, expected_sha256, expected_bytes=None):
    """Compress the original pinned executable without modifying its bytes."""
    source, destination = pathlib.Path(source), pathlib.Path(destination)
    if not re.fullmatch(r'[a-f0-9]{64}', expected_sha256):
        raise ValueError('invalid_runtime_pin')
    if source.resolve() == destination.resolve():
        raise ValueError('runtime_archive_overwrites_source')
    if sha256(source) != expected_sha256 or (expected_bytes is not None and source.stat().st_size != expected_bytes):
        raise ValueError('runtime_pin_mismatch')
    created = False
    try:
        with source.open('rb') as original, destination.open('xb') as output:
            created = True
            with gzip.GzipFile(filename='', fileobj=output, mode='wb', compresslevel=9, mtime=0) as packed:
                digest, count = hashlib.sha256(), 0
                for block in iter(lambda: original.read(CHUNK), b''):
                    digest.update(block)
                    count += len(block)
                    packed.write(block)
        if digest.hexdigest() != expected_sha256 or (expected_bytes is not None and count != expected_bytes):
            raise ValueError('runtime_changed_during_archive')
        if destination.stat().st_size >= MEMBER_LIMIT:
            raise ValueError('runtime_archive_member_too_large')
        return {'path': 'runtime/bun.exe.gz', 'sha256': sha256(destination),
                'bytes': destination.stat().st_size, 'expandedBytes': count}
    except FileExistsError:
        raise
    except BaseException:
        if created:
            destination.unlink(missing_ok=True)
        raise


def windows_mcp_server(launcher_sha256, runtime_sha256, packed_runtime):
    """Host substitutions stay in env values, never interpolated as PS source."""
    if not re.fullmatch(r'[a-f0-9]{64}', launcher_sha256):
        raise ValueError('invalid_launcher_pin')
    if not re.fullmatch(r'[a-f0-9]{64}', runtime_sha256):
        raise ValueError('invalid_runtime_pin')
    if (packed_runtime.get('path') != 'runtime/bun.exe.gz' or
            not re.fullmatch(r'[a-f0-9]{64}', packed_runtime.get('sha256', '')) or
            type(packed_runtime.get('bytes')) is not int or
            type(packed_runtime.get('expandedBytes')) is not int or
            not 0 < packed_runtime['bytes'] < MEMBER_LIMIT or
            not 0 < packed_runtime['expandedBytes'] <= 268435456):
        raise ValueError('invalid_archive_pin')
    command = (
        "$ErrorActionPreference='Stop';try{"
        "$p=[IO.Path]::Combine($env:ORACLE_PORTABLE_PLUGIN_ROOT,'scripts','launch-windows-runtime.ps1');"
        "$s=[IO.File]::ReadAllBytes($p);$h=[Security.Cryptography.SHA256]::Create();"
        "$v=([BitConverter]::ToString($h.ComputeHash($s))).Replace('-','').ToLowerInvariant();$h.Dispose();"
        "if($v -ne '" + launcher_sha256 + "'){throw 'Oracle launcher checksum mismatch'};"
        "& ([scriptblock]::Create([Text.Encoding]::UTF8.GetString($s)))"
        "}catch{[Console]::Error.WriteLine('Oracle runtime startup failed: '+$_.Exception.Message);exit 1}"
    )
    return {'type': 'stdio', 'command': 'powershell.exe',
            'args': ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command],
            'cwd': '${PLUGIN_ROOT}',
            'env': {'ORACLE_PORTABLE_PLUGIN_ROOT': '${PLUGIN_ROOT}',
                    'ORACLE_PORTABLE_PLUGIN_DATA': '${PLUGIN_DATA}',
                    'ORACLE_WINDOWS_RUNTIME_SHA256': runtime_sha256,
                    'ORACLE_WINDOWS_ARCHIVE_SHA256': packed_runtime['sha256'],
                    'ORACLE_WINDOWS_ARCHIVE_BYTES': str(packed_runtime['bytes']),
                    'ORACLE_WINDOWS_RUNTIME_BYTES': str(packed_runtime['expandedBytes'])}}
