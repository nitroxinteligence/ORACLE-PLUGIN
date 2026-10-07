#!/usr/bin/env python3
"""Run the status/snapshot regression in a disposable, offline WKWebView."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--web-root', type=Path, default=ROOT / 'Resources/web')
    parser.add_argument('--harness', type=Path)
    args = parser.parse_args()
    web = args.web_root.absolute()
    if web.resolve() != web or not web.is_relative_to(ROOT):
        raise ValueError('Canonical project or disposable packaged web sources required')
    parent = ROOT / '.work/status-refresh-ui'
    parent.mkdir(parents=True, exist_ok=True)
    if parent.resolve() != parent:
        raise ValueError('Disposable canonical output required')
    scratch = Path(tempfile.mkdtemp(prefix='synthetic-', dir=parent))
    assets = scratch / 'assets'
    assets.mkdir()
    hashes = {}
    for source in web.rglob('*'):
        if source.is_symlink():
            raise ValueError('Linked web source rejected')
        if not source.is_file():
            continue
        name = source.relative_to(web)
        target = assets / name
        target.parent.mkdir(parents=True, exist_ok=True)
        data = source.read_bytes()
        target.write_bytes(data)
        hashes[str(name)] = hashlib.sha256(data).hexdigest()
    # Reuse only the public synthetic preview data and preserve the native
    # WKWebView bridge. No production profile or account is loaded.
    seed = (web / 'preview.js').read_text()
    opening = 'window.webkit={messageHandlers:{oracle:{postMessage({id,method,params:p}){'
    if seed.count(opening) != 1 or seed.count(')}}}};') != 1:
        raise ValueError('Synthetic bridge source changed; review required')
    seed = seed.replace("if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {", 'if (true) {', 1)
    seed = seed.replace(opening, 'window.__oracleFixtureReceive=function({id,method,params:p}){', 1).replace(')}}}};', ')};', 1)
    test = (ROOT / 'scripts/test-onboarding-status-refresh.js').read_text()
    fixture = scratch / 'fixture.js'
    fixture.write_text(seed + '\nwindow.__oracleFixtureRun=async()=>{await new Promise(resolve=>setTimeout(resolve,220));try{const result=await (async()=>{\n' + test + '\n})();window.webkit.messageHandlers.fixture.postMessage({type:"done",...result});}catch(error){window.webkit.messageHandlers.fixture.postMessage({type:"done",passed:0,failed:1,error:String(error),stack:error.stack});}};')
    for name in ['home', 'tmp', 'cache']:
        (scratch / name).mkdir()
    env = {'PATH': '/usr/bin:/bin:/usr/sbin:/sbin', 'HOME': str(scratch / 'home'), 'CFFIXED_USER_HOME': str(scratch / 'home'), 'TMPDIR': str(scratch / 'tmp') + '/', 'CLANG_MODULE_CACHE_PATH': str(scratch / 'cache')}
    home = str(Path.home())
    sandbox = '(version 1)\n(allow default)\n(deny network*)\n' + f'(deny file-write* (require-all (require-not (subpath {json.dumps(str(scratch))})) (require-not (literal "/dev/null"))))\n'
    if args.harness:
        original = args.harness.absolute()
        if original.resolve() != original or not original.is_relative_to(ROOT / '.work') or not original.is_file():
            raise ValueError('Reviewed disposable fixture harness required')
        harness = scratch / 'fixture'
        shutil.copy2(original, harness)
    else:
        source = scratch / 'fixture.m'
        shutil.copy2(ROOT / 'scripts/atlas-web-fixture.m', source)
        harness = scratch / 'fixture'
        subprocess.run(['/usr/bin/clang', '-fobjc-arc', '-fno-modules', '-O0', '-g0', '-framework', 'AppKit', '-framework', 'WebKit', str(source), '-o', str(harness)], cwd=scratch, env=env, check=True)
    sandbox += f'(deny file-read* (require-all (subpath {json.dumps(home)}) (require-not (subpath {json.dumps(str(scratch))})) (require-not (literal {json.dumps(str(harness))}))))\n'
    policy = scratch / 'runtime.sb'
    policy.write_text(sandbox)
    report = scratch / 'report.json'
    result = subprocess.run(['/usr/bin/sandbox-exec', '-f', str(policy), str(harness), str(assets), str(fixture), str(report)], cwd=scratch, env=env, capture_output=True, text=True, timeout=90)
    (scratch / 'native.log').write_text(result.stdout + result.stderr)
    if not report.is_file():
        raise RuntimeError('Native fixture did not produce a report: ' + str(result.returncode) + ' ' + (result.stdout + result.stderr)[-1500:])
    data = json.loads(report.read_text())
    data.update(sourceHashes=hashes, sourcesUnchangedDuringRun=all(hashlib.sha256((web / name).read_bytes()).hexdigest() == digest for name, digest in hashes.items()), isolation={'personalProfileUsed': False, 'network': 'denied', 'websiteData': 'nonpersistent'})
    report.write_text(json.dumps(data, indent=2) + '\n')
    print(json.dumps({'report': str(report), 'passed': data['passed'], 'failed': data['failed'], 'sourcesUnchangedDuringRun': data['sourcesUnchangedDuringRun']}))
    if result.returncode or data['failed'] or not data['sourcesUnchangedDuringRun']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
