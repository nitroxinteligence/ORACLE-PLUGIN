#!/usr/bin/env python3
"""Boot the actual Mac ZIP in disposable state and return its admitted payload."""
import argparse, hashlib, json, os, pathlib, re, selectors, stat, subprocess, time, zipfile

def qualify(archive, output, plugin_name='oracle-system-mac-stable'):
    archive, output = pathlib.Path(archive).absolute(), pathlib.Path(output).absolute()
    if output.exists() or output.resolve() != output: raise ValueError('Fresh canonical qualification output required')
    output.mkdir(parents=True); package = output / 'package'; package.mkdir()
    with zipfile.ZipFile(archive) as z:
        names = set(); roots = set()
        if len(z.infolist()) > 100 or z.testzip(): raise ValueError('Invalid closed plugin ZIP')
        for row in z.infolist():
            path = pathlib.PurePosixPath(row.filename); mode = row.external_attr >> 16
            if path.is_absolute() or '..' in path.parts or row.filename in names or stat.S_ISLNK(mode) or row.is_dir(): raise ValueError('Unsafe plugin member')
            names.add(row.filename); roots.add(path.parts[0]); target = package / path
            target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(z.read(row)); target.chmod(mode & 0o777 or 0o644)
        if roots != {plugin_name}: raise ValueError('Explicit Mac identity required')
    bundle = package / plugin_name
    manifests = [json.loads((bundle / name).read_text()) for name in ['plugin.json', '.codex-plugin/plugin.json']]
    version = manifests[0]['version']
    if any(row['name'] != plugin_name or row['version'] != version for row in manifests): raise ValueError('Mac identity/version mismatch')
    configurations = [json.loads((bundle / name).read_text()) for name in ['mcp.json', '.mcp.json']]
    if any(len(row.get('mcpServers', {})) != 1 for row in configurations): raise ValueError('Single reviewed MCP namespace required')
    if tuple(map(int, version.split('.'))) >= (0, 1, 32) and any(list(row['mcpServers']) != [plugin_name] for row in configurations): raise ValueError('MCP namespace must match plugin identity')
    if configurations[0]['mcpServers'] != configurations[1]['mcpServers']: raise ValueError('Portable and legacy MCP configuration mismatch')
    if plugin_name != 'oracle-system-mac-stable' and (not re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+', version) or plugin_name != 'oracle-system-mac-' + version.replace('.', '-')): raise ValueError('Versioned manual Mac identity required')
    home = output / 'home'; home.mkdir(); profile = output / 'profile'
    env = {'HOME': str(home), 'PATH': '/usr/bin:/bin:/usr/sbin:/sbin', 'LANG': 'en_US.UTF-8', 'ORACLE_PORTABLE_PLUGIN_DATA': str(profile)}
    p = subprocess.Popen([str(bundle / 'scripts/launch-mcp.sh')], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=bundle, env=env)
    requests = [{'jsonrpc': '2.0', 'id': 1, 'method': 'initialize', 'params': {'protocolVersion': '2024-11-05', 'capabilities': {}, 'clientInfo': {'name': 'oracle-compatibility-gate', 'version': '1'}}}, {'jsonrpc': '2.0', 'method': 'notifications/initialized', 'params': {}}, {'jsonrpc': '2.0', 'id': 2, 'method': 'tools/list', 'params': {}}, {'jsonrpc': '2.0', 'id': 3, 'method': 'tools/call', 'params': {'name': 'oracle_dispatch', 'arguments': {'method': 'onboardingStatus', 'params': {}}}}]
    p.stdin.write((''.join(json.dumps(r) + '\n' for r in requests)).encode()); p.stdin.flush()
    selector = selectors.DefaultSelector(); selector.register(p.stdout, selectors.EVENT_READ); buffer = b''; responses = []; deadline = time.monotonic() + 120
    try:
        while not any(r.get('id') == 3 for r in responses):
            if time.monotonic() > deadline: raise ValueError('Actual packed boot exceeded deadline')
            if not selector.select(1): continue
            chunk = os.read(p.stdout.fileno(), 65536)
            if not chunk: raise ValueError('Packed server ended before product RPC')
            buffer += chunk
            if len(buffer) > 2000000: raise ValueError('Packed response limit')
            while b'\n' in buffer:
                line, buffer = buffer.split(b'\n', 1)
                if line.strip(): responses.append(json.loads(line))
        p.stdin.close(); p.wait(timeout=15)
    finally:
        if p.poll() is None: p.kill(); p.wait()
        selector.close(); (output / 'stderr.log').write_bytes(p.stderr.read())
    if p.returncode != 0 or any('error' in r for r in responses): raise ValueError('Actual packed product RPC failed')
    initial = next(r['result'] for r in responses if r.get('id') == 1)
    if [r['name'] for r in next(r['result']['tools'] for r in responses if r.get('id') == 2)] != ['oracle_open', 'oracle_dispatch']: raise ValueError('Plugin tool ABI changed')
    if (home / '.codex/hooks.json').exists(): raise ValueError('Unexpected hook installation at boot')
    caches = list((profile / 'runtime-cache').iterdir())
    if len(caches) != 1 or not (caches[0] / 'server.mjs').is_file(): raise ValueError('Admitted expanded tree absent')
    external_hashes_verified = tuple(map(int, version.split('.'))) >= (0, 1, 32)
    if external_hashes_verified:
        inventory = json.loads((caches[0] / 'portable-package-receipt.json').read_text())['files']
        for name, digest in inventory.items():
            member = pathlib.PurePosixPath(name)
            if member.is_absolute() or '..' in member.parts: raise ValueError('Irregular receipt member')
            target = bundle / member if (bundle / member).is_file() else caches[0] / member
            if target.is_symlink() or not target.is_file() or hashlib.sha256(target.read_bytes()).hexdigest() != digest: raise ValueError('Package receipt hash mismatch: ' + name)
    receipt = {'passed': True, 'version': initial['serverInfo']['version'], 'pluginName': plugin_name, 'mcpNamespace': next(iter(configurations[0]['mcpServers'])), 'archiveSHA256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'payloadRoot': str(caches[0]), 'runtime': str(bundle / 'runtime/bun'), 'externalReceiptHashesVerified': external_hashes_verified, 'personalProfileUsed': False, 'hooksInstalled': False}
    (output / 'report.json').write_text(json.dumps(receipt, indent=2) + '\n'); return receipt

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__); p.add_argument('--archive', required=True); p.add_argument('--output', required=True); p.add_argument('--plugin-name', default='oracle-system-mac-stable'); a = p.parse_args(); print(json.dumps(qualify(a.archive, a.output, a.plugin_name)))
