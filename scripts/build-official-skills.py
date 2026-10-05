#!/usr/bin/env python3
"""Package immutable public Git blobs, not an operator's working tree/profile.

All official skill assets and their resolvable local reference closure keep their
upstream paths and bytes. The Codex entrypoint is a distinct Oracle adapter; raw
upstream skills are a reference library OUTSIDE automatic skill discovery. No
upstream scripts are run. No network, personal identity, profile or keys are read.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import posixpath
import re
import subprocess

PIN = '2efaaf8f8a817b5b82e023383618fdcdb1cc5f7d'
VERSION = '0.48.4.0'
REPOSITORY = 'https://github.com/garrytan/gbrain'
MAX_BYTES = 100_000_000
ROOT = Path(__file__).resolve().parent.parent


def encoded(value):
    return (json.dumps(value, sort_keys=True, ensure_ascii=False, indent=2) + '\n').encode()


def sha(data):
    return hashlib.sha256(data).hexdigest()


def safe_output(path):
    path = Path(os.path.abspath(path))
    if not path.is_relative_to(ROOT) or path == ROOT:
        raise ValueError('Output must be inside this checkout')
    for p in (path, *path.parents):
        if p == ROOT.parent:
            break
        if p.is_symlink():
            raise ValueError('Output traverses a symlink: ' + str(p))
    return path


def build(source: Path, output: Path, check: bool = False, *, pin: str = PIN, version: str = VERSION, maximum_bytes: int = MAX_BYTES):
    PIN, VERSION = pin, version
    MAX_BYTES = maximum_bytes
    if not isinstance(MAX_BYTES, int) or not 1 <= MAX_BYTES <= 160_000_000:
        raise ValueError('Official reference closure budget exceeds 160 MB')
    if not re.fullmatch(r'[a-f0-9]{40}', PIN) or not re.fullmatch(r'\d+\.\d+\.\d+\.\d+', VERSION):
        raise ValueError('Explicit immutable pin and four-part upstream version required')
    source = source.resolve(strict=True)
    output = safe_output(output)
    if output.is_relative_to(source) or source.is_relative_to(output):
        raise ValueError('Source and output overlap')
    def git(*args):
        return subprocess.check_output(['git', '-C', str(source), *args], stderr=subprocess.PIPE)
    if git('rev-parse', 'HEAD').decode().strip() != PIN:
        raise ValueError('GBrain checkout does not match the reviewed compatibility pin')
    tree = {}
    for entry in git('ls-tree', '-rz', PIN).split(b'\0'):
        if entry:
            metadata, path = entry.split(b'\t', 1)
            mode, kind, oid = metadata.decode().split()
            if kind == 'blob':
                tree[path.decode()] = (mode, oid)
    # cat-file reads only pinned blobs (untracked profiles can never be packaged).
    process = subprocess.Popen(['git', '-C', str(source), 'cat-file', '--batch'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    cache = {}
    def blob(path):
        if path not in cache:
            mode, oid = tree[path]
            if mode not in ('100644', '100755'):
                raise ValueError('Upstream symlink/submodule refused: ' + path)
            process.stdin.write((oid + '\n').encode()); process.stdin.flush()
            header = process.stdout.readline().split()
            if len(header) != 3 or header[1] != b'blob':
                raise ValueError('Invalid Git blob response')
            cache[path] = process.stdout.read(int(header[2]))
            blob_header = ('blob ' + str(len(cache[path]))).encode() + bytes([0])
            if hashlib.sha1(blob_header + cache[path]).hexdigest() != oid:
                raise ValueError('Pinned Git object integrity mismatch: ' + path)
            if process.stdout.read(1) != b'\n':
                raise ValueError('Truncated Git blob')
            if sum(map(len, cache.values())) > MAX_BYTES:
                raise ValueError('Official reference closure exceeds safety cap')
        return cache[path]
    try:
        if json.loads(blob('package.json'))['version'] != VERSION:
            raise ValueError('Pinned package version mismatch')
        selected = {p for p in tree if p.startswith('skills/')}
        selected |= {'LICENSE', 'package.json'}
        required = ['skills/RESOLVER.md', 'skills/_AGENT_README.md', 'skills/query/SKILL.md', 'skills/brain-ops/SKILL.md', 'skills/capture/SKILL.md', 'skills/maintain/SKILL.md']
        if not set(required).issubset(selected):
            raise ValueError('Pinned official method is incomplete')
        references = []
        visited = set()
        # Explicit repository-local references and relative Markdown links. API
        # identifiers / CLI examples are not executable package dependencies.
        absolute = re.compile(r'(?<![\w/])((?:skills|docs|recipes|templates|src|scripts)/[A-Za-z0-9_./-]+(?:#[A-Za-z0-9_-]+)?)')
        relative = re.compile(r'\]\((\.{1,2}/[^\s)]+)\)')
        while selected - visited:
            path = sorted(selected - visited)[0]
            visited.add(path)
            data = blob(path)
            if not path.endswith(('.md', '.json', '.yaml', '.yml')):
                continue
            text = data.decode('utf8')
            targets = [(m.group(1), m.group(1)) for m in absolute.finditer(text)]
            targets += [(m.group(1), posixpath.normpath(posixpath.join(posixpath.dirname(path), m.group(1)))) for m in relative.finditer(text)]
            for raw, target in targets:
                target = target.split('#', 1)[0].rstrip('.,:;/')
                matches = [target] if target in tree else [p for p in tree if p.startswith(target + '/')]
                # Only actual tracked dependencies enter the bundle. Example,
                # runtime and historical missing refs remain explicitly recorded.
                if matches:
                    for candidate in matches:
                        if candidate.startswith(('.git/', 'node_modules/', 'test/', 'tests/')):
                            continue
                        selected.add(candidate)
                    references.append({'from': path, 'reference': raw, 'target': target, 'status': 'packaged'})
                else:
                    references.append({'from': path, 'reference': raw, 'target': target, 'status': 'upstream_example_or_unavailable'})
            if len(selected) > 5000:
                raise ValueError('Reference closure exceeds 5000 files')
        files = {}
        for path in sorted(selected):
            files['upstream/' + path] = blob(path)
        routes = []
        for path in sorted(p for p in selected if p.startswith('skills/') and p.endswith('/SKILL.md')):
            text = blob(path).decode()
            head = text.split('---', 2)[1] if text.startswith('---') else ''
            name = re.search(r'^name:\s*([^\n]+)', head, re.M)
            triggers = re.search(r'^triggers:\s*\n((?:[ \t]+[^\n]*\n)+)', head, re.M)
            phrases = re.findall(r'^\s*-\s*[\'\"]?(.*?)[\'\"]?\s*$', triggers[1], re.M) if triggers else []
            routes.append({'name': name[1].strip(' \"\'') if name else PurePosixPath(path).parent.name, 'path': 'upstream/' + path, 'triggers': phrases, 'execution': 'reference_only'})
        files['resolver.json'] = encoded({'schema_version': 1, 'upstream_resolver': 'upstream/skills/RESOLVER.md', 'routes': routes, 'automatic_invocation': False})
        refs = {json.dumps(r, sort_keys=True): r for r in references}
        files['references.json'] = encoded({'schema_version': 1, 'references': [refs[k] for k in sorted(refs)], 'note': 'Only pinned public tracked files. Unavailable upstream examples are not executable dependencies.'})
        files['ORACLE-CAPABILITIES.md'] = b'''# Oracle execution boundary\n\nGBrain 0.48.4.0 indexes canonical vault knowledge. Codex performs reasoning.\nWhen available, AI Memory keeps separate operational state and uses the server\nand scopes verified in the Oracle workspace AGENTS.md. Obsidian Markdown\nremains canonical. Upstream bytes are preserved under upstream/ with\nthe upstream MIT license. They are reference documentation, not permission to\nexecute every upstream command or install anything.\n\nRead resolver.json and upstream/skills/RESOLVER.md to find a relevant method;\nfrontmatter triggers remain upstream's routing authority. Read that method and\nits linked conventions before the requested task, subject to this boundary.\n\nSupported: source-scoped keyword search, recall/entity/context_pack/delta,\nget_page/list_pages/get_links/get_backlinks/traverse_graph. Authorized durable\nwrites: put_page/remember/forget via the Oracle MCP, only in oracle-memory.\nVerify the write through GBrain and its canonical Markdown before claiming it.\nThe derived oracle-vault source is read-only to Codex. Index synchronization is\nthe deterministic Oracle sync API, not gbrain autopilot or an independent DB.\n\nUnavailable: GBrain model calls, embedding providers, semantic query requiring\na provider, synthesize, dream, minions, upgrades, migrations, global hooks,\nbootstrap harness, headless pre-approval, provider/API-key setup and telemetry.\nDo not turn a reference to those into an execution fallback. Report the limit.\nNever initialize another brain, change source targets, bypass Codex trust,\nread private Codex storage, or write outside the authorized vault/profile.\nNo first-memory exercise, guided first use, tutorial or cold-start prompts.\nNo automatic capture or schedule is implied by reading an upstream skill; the\nuser's explicit request and Oracle's separately approved maintenance govern it.\n'''
        files['ORACLE-CAPABILITIES.md'] = files['ORACLE-CAPABILITIES.md'].replace(b'GBrain 0.48.4.0', ('GBrain ' + VERSION).encode())
        manifest = {'schema_version': 1, 'id': 'gbrain-official-method', 'version': VERSION, 'commit': PIN, 'repository': REPOSITORY, 'license': 'MIT', 'license_path': 'upstream/LICENSE', 'private_data': False, 'source': 'pinned_git_objects_only', 'codex_docs_reviewed': '2026-09-11', 'codex_docs': ['https://developers.openai.com/codex/skills/', 'https://developers.openai.com/codex/guides/agents-md/', 'https://developers.openai.com/codex/hooks/'], 'method_count': len(routes), 'files': [{'path': p, 'sha256': sha(data), 'bytes': len(data), 'upstream_path': p[9:] if p.startswith('upstream/') else None, 'upstream_git_blob': tree[p[9:]][1] if p.startswith('upstream/') else None, 'executable': p.startswith('upstream/') and tree[p[9:]][0] == '100755'} for p, data in sorted(files.items())]}
        files['manifest.json'] = encoded(manifest)
        old = json.loads((output / 'manifest.json').read_text()) if (output / 'manifest.json').exists() else {}
        prior = {r['path']: r['sha256'] for r in old.get('files', [])}
        # Fail before changing any file when a local modification is found.
        for path, data in files.items():
            dest = safe_output(output / path)
            if dest.exists() and path != 'manifest.json' and sha(dest.read_bytes()) not in (sha(data), prior.get(path)):
                raise ValueError('Modified package file preserved: ' + path)
            if check and (not dest.exists() or dest.read_bytes() != data):
                raise ValueError('Package missing or stale: ' + path)
        for path in prior.keys() - files.keys():
            dest = safe_output(output / path)
            if dest.exists() and sha(dest.read_bytes()) != prior[path]:
                raise ValueError('Modified obsolete package file preserved: ' + path)
        if not check:
            for path, data in files.items():
                dest = safe_output(output / path)
                dest.parent.mkdir(parents=True, exist_ok=True)
                if not dest.exists() or dest.read_bytes() != data:
                    temp = dest.with_name(dest.name + '.build-tmp')
                    if temp.exists() or temp.is_symlink():
                        raise ValueError('Unexpected package staging file')
                    with temp.open('xb') as stream:
                        stream.write(data)
                    temp.replace(dest)
                # Reference scripts keep original mode; they are never executed here.
                os.chmod(dest, 0o755 if path.startswith('upstream/') and tree[path[9:]][0] == '100755' else 0o644)
            for path in prior.keys() - files.keys():
                dest = safe_output(output / path)
                if dest.exists():
                    dest.unlink()
        return {'version': VERSION, 'commit': PIN, 'files': len(files), 'methods': len(routes), 'bytes': sum(map(len, files.values())), 'manifest_sha256': sha(files['manifest.json']), 'verified': check}
    finally:
        process.stdin.close(); process.stdout.close(); process.wait(timeout=10)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT / 'vendor/gbrain')
    parser.add_argument('--output', type=Path, default=ROOT / 'Resources/gbrain-method')
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--pin', default=PIN)
    parser.add_argument('--version', default=VERSION)
    parser.add_argument('--maximum-bytes', type=int, default=MAX_BYTES)
    args = parser.parse_args()
    print(json.dumps(build(args.source, args.output, args.check, pin=args.pin, version=args.version, maximum_bytes=args.maximum_bytes), sort_keys=True))
