#!/usr/bin/env python3
"""Real copied GBrain + compiled adapter, synthetic PGLite, kernel-denied network.

Run from the implementation worktree after compiling its private adapter:
  python3 packages/gbrain-adapter/offline-integration.py
All generated state stays under .work/data-build; no real profile or vault is read.
"""
from __future__ import annotations
import hashlib, json, os, pathlib, signal, subprocess, sys, uuid, shutil

ROOT = pathlib.Path(__file__).resolve().parents[2]
ENGINE = ROOT / '.work/data-build/Resources/engine'
FIXTURE = ROOT / '.work/data-build/fixtures' / ('adapter-' + uuid.uuid4().hex)
WORKSPACE, PROFILE, VAULT = (FIXTURE / name for name in ('workspace', 'profile', 'vault'))
for directory in (WORKSPACE, PROFILE, VAULT, FIXTURE/'home', FIXTURE/'tmp', FIXTURE/'events'):
    directory.mkdir(parents=True)
ENV = {'PATH': '/usr/bin:/bin:/usr/sbin:/sbin', 'HOME': str(FIXTURE/'home'),
       'TMPDIR': str(FIXTURE/'tmp'), 'LANG': 'en_US.UTF-8', 'GBRAIN_HOME': str(PROFILE),
       'GBRAIN_SKIP_UPDATE_CHECK': '1', 'GBRAIN_HOOKS': '0', 'GBRAIN_DATABASE_URL': '',
       'DATABASE_URL': '', 'ORACLE_RECEIPT_DIR': str(FIXTURE/'events')}
SANDBOX = ['/usr/bin/sandbox-exec', '-p', '(version 1)(allow default)(deny network*)']
CHECKS: list[str] = []

def run(binary: pathlib.Path | str, args: list[str], payload: dict | None = None,
        env: dict | None = None, timeout: int = 90) -> subprocess.CompletedProcess:
    command = SANDBOX + [str(binary)] + args
    process = subprocess.Popen(command, cwd=WORKSPACE, env=env or ENV, stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True)
    try:
        output, error = process.communicate(None if payload is None else json.dumps(payload).encode(), timeout=timeout)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.communicate(timeout=5)
        raise AssertionError('Bounded fixture subprocess timed out: ' + str(binary))
    return subprocess.CompletedProcess(command, process.returncode, output.decode(errors='replace'), error.decode(errors='replace'))

def check(value: bool, title: str) -> None:
    if not value:
        raise AssertionError(title)
    CHECKS.append(title)
    print('PASS', title, flush=True)

def official(*args: str) -> str:
    result = run(ENGINE/'gbrain', list(args))
    if result.returncode:
        raise AssertionError('Official engine failed: ' + result.stdout[-2500:] + result.stderr[-2500:])
    return result.stdout

def request(operation: str, env: dict | None = None, **params) -> dict:
    result = run(ENGINE/'oracle-gbrain-read', [], {'operation': operation, **params}, env)
    lines = [line for line in result.stdout.splitlines() if line.startswith('{')]
    if not lines:
        raise AssertionError('Adapter returned no JSON: ' + result.stderr[-2500:] + result.stdout[-2500:])
    response = json.loads(lines[-1])
    if (result.returncode == 0) != bool(response.get('ok')):
        raise AssertionError('Exit status does not match JSON result')
    return response

def index(files: list[str] | None = None, complete: bool = True, **limits) -> dict:
    files = sorted(str(p.relative_to(VAULT)) for p in VAULT.rglob('*.md')) if files is None else files
    response = request('index', source='oracle-vault', root=str(VAULT), files=files,
                       scan_complete=complete, generation=len(CHECKS), budget_ms=60_000, **limits)
    if not response.get('ok'):
        raise AssertionError('Index request failed before receipt: ' + str(response))
    return response['value']

def put(path: str, content: str) -> None:
    destination = VAULT/path
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(content)

def slugs() -> set[str]:
    response=request('list', source='oracle-vault')
    if not response.get('ok'): raise AssertionError(str(response))
    return {row['slug'] for row in response['value']}

try:
    denied=run(sys.executable, ['-c', 'import socket,errno\ntry: socket.socket().connect(("127.0.0.1",9))\nexcept OSError as e: print(e.errno);raise SystemExit(0 if e.errno in (errno.EPERM,errno.EACCES) else 1)\nraise SystemExit(2)'])
    check(denied.returncode == 0, 'Kernel sandbox denies network, including loopback')
    check('0.48.4.0' in official('--version'), 'Copied official bundled engine is pinned 0.48.4.0')
    official('init', '--pglite', '--no-embedding')
    (PROFILE/'oracle-owned.json').write_text(json.dumps({'owner':'OracleCompanion','schema_version':1}))
    official('sources', 'add', 'oracle-vault', '--name', 'Synthetic fixture')
    put('one.md', '# One\n\nalpha original\n')
    put('two.md', '# Two\n\nSee [[one]].\n')
    value=index()
    if not value.get('complete'): print('INDEX RECEIPT:',json.dumps(value),flush=True)
    check(value['complete'] and value['verified']==2, 'Complete canonical snapshot indexed by official engine')
    manifest=PROFILE/'oracle-vault-manifest.json'
    checkpoint=PROFILE/'oracle-vault-checkpoint.json'
    check(json.loads(manifest.read_text())['complete'] is True and not checkpoint.exists(), 'Complete manifest separate from checkpoint')
    get=request('get', source='oracle-vault', slug='one')
    check(get.get('ok') and get['value']['freshness']=='current_at_read', 'Get verifies canonical content hash before returning')
    put('one.md', '# One\n\nbeta changed externally\n')
    check(request('get',source='oracle-vault',slug='one').get('ok') is False, 'External edit refuses stale get')
    before=manifest.read_bytes()
    put('two.md', '# Two\n\nChanged too. See [[one]].\n')
    value=index(max_upserts=1)
    check(not value['complete'] and value['needs_resume'], 'Bounded upsert quota creates resumable partial work')
    check(manifest.read_bytes()==before and checkpoint.exists(), 'Partial work cannot overwrite last complete manifest')
    value=index(max_upserts=1)
    check(value['complete'], 'Resume reuses verified checkpoint and completes')
    check(request('get',source='oracle-vault',slug='one').get('ok') is True, 'Get becomes current after complete reindex')
    before=manifest.read_bytes()
    put('Note File.md', '# Collision A\n')
    put('note-file.md', '# Collision B\n')
    value=index()
    check(not value['complete'] and value.get('upserts')==0, 'Slug collisions detected before any derived upsert')
    check(manifest.read_bytes()==before and 'note-file' not in slugs(), 'Collision preserves both canonical files and previous index')
    (VAULT/'Note File.md').unlink();(VAULT/'note-file.md').unlink()
    (VAULT/'two.md').unlink()
    put('safe.md','# Safe sibling\n')
    value=index(complete=False)
    check(not value['complete'] and 'two' in slugs(), 'Partial scan never reconciles deleted derived pages')
    check(manifest.read_bytes()==before, 'Partial-scan receipt leaves complete manifest unchanged')
    value=index()
    check(value['complete'] and 'two' not in slugs(), 'Confirmed complete snapshot reconciles derived deletion only')
    (VAULT/'one.md').rename(VAULT/'renamed.md')
    value=index()
    check(value['complete'] and 'one' not in slugs() and request('get',source='oracle-vault',slug='renamed').get('ok'), 'Canonical rename updates mapping and removes old derived identity')
    put('Friendly Name.md','# Friendly name\n')
    check(index()['complete'], 'Space-containing canonical path indexes with official slug')
    (VAULT/'Friendly Name.md').rename(VAULT/'friendly-name.md')
    check(index()['complete'] and request('get',source='oracle-vault',slug='friendly-name').get('ok'), 'Slug-equivalent rename updates source_path instead of skipping stale identity')
    put('renamed.md','')
    check(index()['complete'] and request('get',source='oracle-vault',slug='renamed').get('ok'), 'Empty canonical edit safely replaces derived content')
    put('identified.md','---\nid: fixture-external-id\n---\n# Identity\n')
    check(index()['complete'],'Official frontmatter identity imports without remote inference')
    (VAULT/'identified.md').rename(VAULT/'identity-renamed.md')
    check(index()['complete'] and request('get',source='oracle-vault',slug='identity-renamed').get('ok'), 'Owned canonical rename preserves frontmatter identity using official force-rechunk API')
    before=manifest.read_bytes()
    put('identity-duplicate.md','---\nid: fixture-external-id\n---\n# Different content\n')
    value=index()
    check(not value['complete'] and value.get('upserts')==0 and manifest.read_bytes()==before, 'Duplicate frontmatter identity fails preflight before derived upserts')
    (VAULT/'identity-duplicate.md').unlink()
    put('identical-a.md','# Template\n');put('identical-b.md','# Template\n')
    check(index()['complete'] and {'identical-a','identical-b'}<=slugs(),'Identical content at distinct canonical paths remains distinct')
    put('Partial Owner.md','# Partial owner\n\noriginal identity\n')
    check(index()['complete'],'Existing owned slug fixture is completely indexed')
    before=manifest.read_bytes()
    put('partial-owner.md','# Partial collision\n\ndifferent canonical file\n')
    omitted=[str(path.relative_to(VAULT)) for path in VAULT.rglob('*.md') if path.name!='Partial Owner.md']
    value=index(files=omitted,complete=False)
    check(not value['complete'] and value.get('upserts')==0 and manifest.read_bytes()==before,
          'Partial scan cannot mistake a still-existing owned canonical file for a rename')
    check(request('get',source='oracle-vault',slug='partial-owner').get('ok') is True,
          'Partial alias collision preserves the previously verified derived page')
    (VAULT/'partial-owner.md').unlink()
    put('身份.md','---\nslug: fixture-old-identity\n---\n# Identity fallback\n')
    check(index()['complete'],'Official non-path slug fallback is indexed with canonical mapping')
    put('身份.md','---\nslug: fixture-new-identity\n---\n# Identity fallback\n')
    value=index()
    if not value.get('complete'):print('IDENTITY RECEIPT:',json.dumps(value),flush=True)
    check(value['complete'] and 'fixture-old-identity' not in slugs() and request('get',source='oracle-vault',slug='fixture-new-identity').get('ok'),
          'Changing a canonical frontmatter identity removes the obsolete derived slug only after full verification')
    before=manifest.read_bytes()
    value=index(files=['../escape.md'])
    check(not value['complete'] and manifest.read_bytes()==before, 'Traversal input cannot change canonical or complete state')
    hostile={**ENV,'GBRAIN_DATABASE_URL':'postgresql://remote.invalid/private','DATABASE_URL':'postgresql://remote.invalid/private'}
    check(request('status',env=hostile).get('ok') is True, 'Official file-only config ignores ambient database retargeting')
    missing={**ENV};missing.pop('GBRAIN_HOME')
    check(request('status',env=missing).get('ok') is False, 'Missing explicit profile refuses global HOME fallback')
    check(not list((FIXTURE/'home').glob('.gbrain/*')), 'No implicit global profile was created')
    bun=pathlib.Path(os.environ.get('ORACLE_TEST_BUN') or shutil.which('bun') or '/nonexistent-bun')
    if not bun.is_file(): raise AssertionError('Select an available Bun executable via ORACLE_TEST_BUN for transaction fault tests')
    fault=run(bun,[str(ROOT/'packages/gbrain-adapter/transaction-tests.ts')],env={**ENV,'ORACLE_FIXTURE_VAULT':str(VAULT)})
    if fault.returncode: raise AssertionError(fault.stdout[-4000:]+fault.stderr[-4000:])
    check('rolls back deletion and relations' in fault.stdout,'Real PGLite transaction rolls back injected reconciliation failure')
    check('recovery resumes' in fault.stdout,'Checkpoint recovery succeeds after injected reconciliation failure')
    report={'passed':True,'checks':CHECKS,'fixture':str(FIXTURE),'network':'kernel-denied',
            'engine_sha256':hashlib.sha256((ENGINE/'gbrain').read_bytes()).hexdigest(),
            'adapter_sha256':hashlib.sha256((ENGINE/'oracle-gbrain-read').read_bytes()).hexdigest()}
    (ROOT/'.work/data-build/offline-integration-result.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({'passed':len(CHECKS),'fixture':str(FIXTURE)}),flush=True)
except BaseException:
    print('SYNTHETIC FIXTURE PRESERVED:',FIXTURE,file=sys.stderr,flush=True)
    raise
