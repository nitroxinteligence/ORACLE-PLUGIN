#!/usr/bin/env python3
"""Repack an existing portable ZIP with a bounded streaming payload transaction."""
import argparse, contextlib, copy, gzip, hashlib, importlib.util, json, pathlib, re, shutil, subprocess, tempfile, threading, zipfile

metadata_spec = importlib.util.spec_from_file_location('windows_plugin_metadata', pathlib.Path(__file__).with_name('windows-plugin-metadata.py'))
metadata_module = importlib.util.module_from_spec(metadata_spec)
metadata_spec.loader.exec_module(metadata_module)
compression_spec = importlib.util.spec_from_file_location('portable_payload_compression', pathlib.Path(__file__).with_name('portable-payload-compression.py'))
compression_module = importlib.util.module_from_spec(compression_spec)
compression_spec.loader.exec_module(compression_module)
compressed = compression_module.compressed
windows_spec = importlib.util.spec_from_file_location('windows_runtime_archive', pathlib.Path(__file__).with_name('windows-runtime-archive.py'))
windows_module = importlib.util.module_from_spec(windows_spec)
windows_spec.loader.exec_module(windows_module)
limits_spec = importlib.util.spec_from_file_location('portable_archive_limits', pathlib.Path(__file__).with_name('portable-archive-limits.py'))
limits_module = importlib.util.module_from_spec(limits_spec)
limits_spec.loader.exec_module(limits_module)

CHUNK = 1024 * 1024
LIMIT = 100_000_000
ALLOWED_REPLACEMENTS = frozenset({
    'profile-store.mjs', 'profile-content-receipts.mjs', 'profile-write-lock.mjs', 'persistent-vault-selection.mjs', 'vault-restoration.mjs', 'mac-bookmark-provider.mjs', 'platform-host-providers.mjs',
    'vault-content-transaction.mjs', 'private-method-restore.mjs', 'ai-memory-composition.mjs', 'ai-memory-runtime.mjs', 'ai-memory-process.mjs', 'onboarding-ai-memory.mjs', 'ai-memory-installation-verifier.mjs', 'codex-user-skills-registration.mjs',
    'codex-installation-provider.mjs',
    'knowledge-interview-service.mjs', 'codex-interview-link.mjs', 'host-capabilities.mjs', 'windows-shell-provider.mjs',
    'resources/web/knowledge-prompts.js', 'resources/web/onboarding-v2.js', 'resources/web/onboarding.js',
    'official-hooks-installer.mjs', 'onboarding-coordinator.mjs', 'memory-consent.mjs', 'maintenance-policy.mjs', 'server.mjs', 'runtime-payload.mjs',
    'codex-connection-provider.mjs', 'onboarding-status.mjs', 'catalog-snapshot.mjs', 'service.mjs', 'runtime-cache-lock.mjs',
    'vault-service.mjs', 'knowledge-service.mjs', 'gbrain-source-runner.mjs',
    'gbrain-mcp-session.mjs', 'official-memory-relay.mjs',
    'resources/web/app.js', 'resources/web/flat-universe.js', 'ui-resource.mjs',
    'runtime-bootstrap.mjs', 'stdio-transport.mjs', 'mcp-metadata.mjs', 'scripts/launch-mcp.sh',
    'runtime-binary-source.mjs', 'content-installation-plan.mjs', 'content-source-composition.mjs',
    'resources/web/index.html', 'resources/web/atlas.js', 'resources/web/universe.js',
    'resources/web/installation-visual.js', 'resources/web/preview.js', 'resources/web/transitions.js',
    'resources/web/ui-controls.js', 'resources/web/style.css', 'resources/web/atlas-motion.css',
    'resources/web/audit.css', 'resources/web/orbital-v3.css',
})
RETIRED_PATHS = frozenset({'resources/web/library.js', 'resources/web/library-gallery.js',
    'resources/web/preview-gallery-graph.png', 'resources/web/preview-gallery-knowledge.png',
    *(f'resources/web/gallery/metallic-{i:02d}.webp' for i in range(1, 7))})
NEW_BOOTSTRAP_EXTERNALS = frozenset({'runtime-cache-lock.mjs', 'runtime-bootstrap.mjs', 'stdio-transport.mjs', 'mcp-metadata.mjs', 'runtime-binary-source.mjs'})
SHARED_BOOTSTRAP_MODULES = frozenset({'stdio-transport.mjs', 'mcp-metadata.mjs'})



def zip32_info(info):
    """Retain member metadata without forcing ZIP64 for these bounded archives."""
    if info.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
        raise ValueError('unsupported_zip32_compression')
    entry = zipfile.ZipInfo(info.filename, info.date_time)
    for field in ('compress_type', 'create_system', 'external_attr', 'internal_attr', 'comment', 'file_size'):
        setattr(entry, field, getattr(info, field))
    entry.create_version = entry.extract_version = 20
    extra, position = bytearray(), 0
    while position < len(info.extra):
        if position + 4 > len(info.extra):
            raise ValueError('invalid_zip_extra')
        kind = int.from_bytes(info.extra[position:position + 2], 'little')
        size = int.from_bytes(info.extra[position + 2:position + 4], 'little')
        end = position + 4 + size
        if end > len(info.extra):
            raise ValueError('invalid_zip_extra')
        if kind != 0x0001:
            extra.extend(info.extra[position:end])
        position = end
    entry.extra = bytes(extra)
    return entry


def digest(stream):
    value = hashlib.sha256()
    for block in iter(lambda: stream.read(CHUNK), b''):
        value.update(block)
    return value.hexdigest()


def file_sha(path):
    with pathlib.Path(path).open('rb') as stream:
        return digest(stream)


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def valid_path(value):
    if not isinstance(value, str) or '\\' in value or '\0' in value or value.startswith('/') or any(p in ('', '.', '..') for p in value.split('/')):
        raise ValueError('unsafe_payload_path')


def validate_manifest(manifest):
    formats = {1: ['oracle-concat-gzip-v1'], 2: ['oracle-concat-gzip-v2', 'oracle-concat-brotli-v2']}
    if manifest.get('format') not in formats.get(manifest.get('schemaVersion'), []):
        raise ValueError('unsupported_payload_format')
    seen = {}
    for row in manifest['files']:
        valid_path(row['path'])
        if row['path'] in seen or row['bytes'] < 0 or row['mode'] not in (0o644, 0o755):
            raise ValueError('invalid_payload_descriptor')
        if 'source' in row:
            original = seen.get(row['source'])
            if not original or 'source' in original or any(row[k] != original[k] for k in ('bytes', 'sha256', 'mode')):
                raise ValueError('invalid_payload_alias')
        seen[row['path']] = row
    if sum(row['bytes'] for row in seen.values()) != manifest['expandedBytes']:
        raise ValueError('expanded_bytes_mismatch')
    return seen


@contextlib.contextmanager
def expanded(z, member, brotli, node):
    source = z.open(member)
    if not brotli:
        try:
            with gzip.GzipFile(fileobj=source) as stream:
                yield stream
        finally:
            source.close()
        return
    process = subprocess.Popen([node, '-e', "process.stdin.pipe(require('node:zlib').createBrotliDecompress()).pipe(process.stdout)"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    errors = []
    def feed():
        try:
            shutil.copyfileobj(source, process.stdin, CHUNK)
        except Exception as error:
            errors.append(error)
        finally:
            process.stdin.close()
            source.close()
    thread = threading.Thread(target=feed)
    thread.start()
    try:
        yield process.stdout
        thread.join()
        error_text = process.stderr.read()
        if process.wait() or errors:
            raise ValueError('brotli_decode_failed: ' + error_text.decode(errors='replace'))
    finally:
        if process.poll() is None:
            process.kill()
        process.stdout.close()
        thread.join()
        process.wait()
        process.stderr.close()


def copy_row(stream, row, output=None, capture=None):
    checksum = hashlib.sha256()
    remaining = row['bytes']
    while remaining:
        block = stream.read(min(CHUNK, remaining))
        if not block:
            raise ValueError('truncated_payload: ' + row['path'])
        checksum.update(block)
        if output is not None:
            output.write(block)
        if capture is not None:
            capture.write(block)
        remaining -= len(block)
    if checksum.hexdigest() != row['sha256']:
        raise ValueError('file_checksum_mismatch: ' + row['path'])


def repack(base, output, version, replacements, node, compression='keep', plugin_name=None, canonical_icon=False, remove_libraries=False):
    if plugin_name is not None and not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,63}', plugin_name):
        raise ValueError('invalid_plugin_name')
    base, output = pathlib.Path(base), pathlib.Path(output)
    if base.resolve() == output.resolve() or output.exists():
        raise ValueError('output_must_be_new')
    base_sha = file_sha(base)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='repack-', dir=output.parent) as temp_name, zipfile.ZipFile(base) as z:
        temp = pathlib.Path(temp_name)
        if z.testzip():
            raise ValueError('base_zip_crc_failed')
        roots = {name.split('/')[0] for name in z.namelist()}
        if len(roots) != 1:
            raise ValueError('multiple_zip_roots')
        root = roots.pop() + '/'
        output_root = plugin_name + '/' if plugin_name else root
        def output_name(name):
            return output_root + name[len(root):]
        manifest_name = root + 'runtime-payload-manifest.json'
        old = json.loads(z.read(manifest_name))
        descriptors = validate_manifest(old)
        removals = RETIRED_PATHS if remove_libraries else frozenset()
        brotli = old['format'] == 'oracle-concat-brotli-v2'
        output_brotli = brotli if compression == 'keep' else compression == 'brotli'
        if compression not in ('keep', 'gzip', 'brotli'):
            raise ValueError('unsupported_output_compression')
        output_schema = old['schemaVersion'] if compression == 'keep' else 2
        payload_name = root + ('runtime-payload.br' if brotli else 'runtime-payload.gz')
        output_payload_name = root + ('runtime-payload.br' if output_brotli else 'runtime-payload.gz')
        with z.open(payload_name) as stream:
            if digest(stream) != old['payloadSHA256']:
                raise ValueError('base_payload_checksum_failed')
        changes = {}
        external_changes = {}
        if canonical_icon:
            icon = 'assets/icon-mono.png'
            descriptor = descriptors.get(icon)
            if descriptor is None or root + icon not in z.namelist():
                raise ValueError('canonical_icon_missing_from_package_layer')
            if hashlib.sha256(z.read(root + icon)).hexdigest() != descriptor['sha256']:
                raise ValueError('canonical_icon_layers_differ')
        for target, source in replacements.items():
            valid_path(target)
            if target not in ALLOWED_REPLACEMENTS and target not in {
                'resources/ai-memory/hooks/' + row['path'] for row in json.loads((pathlib.Path(__file__).resolve().parents[1] / 'Resources/ai-memory/hooks/manifest.json').read_text())['files']
            } | {'resources/ai-memory/hooks/manifest.json'}:
                raise ValueError('replacement_outside_allowed_source: ' + target)
            data = pathlib.Path(source).read_bytes()
            if root + target in z.namelist() or target in NEW_BOOTSTRAP_EXTERNALS:
                external_changes[root + target] = data
            if target in descriptors or target in SHARED_BOOTSTRAP_MODULES or (root + target not in z.namelist() and target not in NEW_BOOTSTRAP_EXTERNALS):
                changes[target] = data
        for name in ('plugin.json', '.codex-plugin/plugin.json'):
            metadata = json.loads(z.read(root + name))
            metadata['version'] = version
            if plugin_name is not None:
                metadata['name'] = plugin_name
            if canonical_icon:
                interface = metadata['extensions']['com.openai']['interface'] if name == 'plugin.json' else metadata['interface']
                for field in ('logo', 'logoDark', 'composerIcon', 'composerIconDark'):
                    interface[field] = './assets/icon-mono.png'
            external_changes[root + name] = json_bytes(metadata)
        # Different imported plugins must not share the same MCP namespace.
        # Preserve the reviewed launcher/env while binding both portable and
        # compatibility configurations to the exact plugin identity.
        package_name = json.loads(external_changes[root + 'plugin.json'])['name']
        for name in ('mcp.json', '.mcp.json'):
            if root + name not in z.namelist():
                raise ValueError('mcp_configuration_missing: ' + name)
            mcp = json.loads(z.read(root + name))
            servers = mcp.get('mcpServers')
            if not isinstance(servers, dict) or len(servers) != 1:
                raise ValueError('single_reviewed_mcp_server_required')
            mcp['mcpServers'] = {package_name: next(iter(servers.values()))}
            external_changes[root + name] = json_bytes(mcp)
            if name in descriptors:
                changes[name] = external_changes[root + name]
        is_windows = root + 'runtime/bun.exe' in z.namelist() or 'packedRuntime' in old
        packed_runtime, runtime_archive, removed_external = None, None, {root + name for name in removals if root + name in z.namelist()}
        if is_windows:
            portable, legacy = metadata_module.windows_plugin_metadata(json.loads(external_changes[root + 'plugin.json']))
            external_changes[root + 'plugin.json'] = json_bytes(portable)
            external_changes[root + '.codex-plugin/plugin.json'] = json_bytes(legacy)
            # The runtime payload and import-facing overlay carry the same identity.
            changes['.codex-plugin/plugin.json'] = external_changes[root + '.codex-plugin/plugin.json']
            if 'packedRuntime' not in old:
                runtime_source, runtime_archive = temp / 'bun.exe', temp / 'bun.exe.gz'
                with z.open(root + 'runtime/bun.exe') as source, runtime_source.open('wb') as destination:
                    shutil.copyfileobj(source, destination, CHUNK)
                packed_runtime = windows_module.archive_runtime(runtime_source, runtime_archive, old['runtimeSHA256'])
                launcher = pathlib.Path(__file__).resolve().parents[1] / 'packages/oracle-desktop-portable' / windows_module.LAUNCHER_PATH
                external_changes[root + windows_module.LAUNCHER_PATH] = launcher.read_bytes()
                server = windows_module.windows_mcp_server(file_sha(launcher), old['runtimeSHA256'], packed_runtime)
                metadata = json.loads(external_changes[root + 'plugin.json'])
                mcp = {'$schema': 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json', 'mcpServers': {metadata['name']: server}}
                external_changes[root + 'mcp.json'] = external_changes[root + '.mcp.json'] = json_bytes(mcp)
                removed_external.add(root + 'runtime/bun.exe')
        if (plugin_name is not None or canonical_icon) and '.codex-plugin/plugin.json' in descriptors:
            changes['.codex-plugin/plugin.json'] = external_changes[root + '.codex-plugin/plugin.json']
        if 'plugin.json' in descriptors:
            changes['plugin.json'] = external_changes[root + 'plugin.json']
        # The existing receipt stays historical; add an explicit incremental provenance.
        capture_paths = {'portable-package-receipt.json'}
        aliases_by_source = {}
        for row in old['files']:
            if 'source' in row:
                aliases_by_source.setdefault(row['source'], []).append(row['path'])
        capture_paths.update(p for p in set(changes) | set(removals) if p in aliases_by_source)
        captures = {}
        with expanded(z, payload_name, brotli, node) as stream:
            for row in old['files']:
                if 'source' in row:
                    continue
                captured = temp / ('capture-' + str(len(captures))) if row['path'] in capture_paths else None
                if captured:
                    with captured.open('wb') as destination:
                        copy_row(stream, row, capture=destination)
                    captures[row['path']] = captured
                else:
                    copy_row(stream, row)
            if stream.read(1):
                raise ValueError('base_payload_extra_bytes')
        receipt_path = captures.get('portable-package-receipt.json')
        if receipt_path:
            receipt = json.loads(receipt_path.read_bytes())
            receipt.pop('experimental', None)
            receipt['product'] = 'Oracle System'
            receipt_changes = dict(changes)
            receipt_changes.update({name[len(root):]: data for name, data in external_changes.items() if name[len(root):] in replacements or name[len(root):] in receipt.get('files', {})})
            for name, data in receipt_changes.items():
                checksum = hashlib.sha256(data).hexdigest()
                for field in ('files', 'originalUIHashes'):
                    if field == 'files' or name in receipt.get(field, {}):
                        receipt.setdefault(field, {})[name] = checksum
            for name in removals:
                for field in ('files', 'originalUIHashes'):
                    receipt.get(field, {}).pop(name, None)
            receipt['incrementalRepack'] = {'version': version, 'baseArchiveSHA256': base_sha, 'changedPaths': sorted(receipt_changes), 'removedPaths': sorted(removals & descriptors.keys()), 'originalSignedContentPreserved': True, 'published': False}
            changes['portable-package-receipt.json'] = json_bytes(receipt)
        packed = temp / 'payload'
        rows, seen = [], {}
        with expanded(z, payload_name, brotli, node) as stream, compressed(packed, output_brotli, node) as destination:
            for original in old['files']:
                if original['path'] in removals:
                    if 'source' not in original:
                        copy_row(stream, original)
                    continue
                row = copy.deepcopy(original)
                row.pop('source', None)
                data = changes.get(row['path'])
                if data is not None:
                    row['bytes'], row['sha256'] = len(data), hashlib.sha256(data).hexdigest()
                key = (row['sha256'], row['bytes'], row['mode'])
                alias = output_schema == 2 and key in seen
                if alias:
                    row['source'] = seen[key]
                else:
                    seen[key] = row['path']
                if 'source' not in original:
                    copy_row(stream, original, output=destination if data is None and not alias else None)
                if data is not None and not alias:
                    destination.write(data)
                elif 'source' in original and not alias:
                    captured = captures.get(original['source'])
                    if captured is None:
                        raise ValueError('alias_source_not_available')
                    with captured.open('rb') as source:
                        copy_row(source, original, output=destination)
                rows.append(row)
            if stream.read(1):
                raise ValueError('base_payload_extra_bytes')
            for name, data in changes.items():
                if name in descriptors:
                    continue
                row = {'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'mode': 0o644}
                key = (row['sha256'], row['bytes'], row['mode'])
                if output_schema == 2 and key in seen:
                    row['source'] = seen[key]
                else:
                    seen[key] = name
                    destination.write(data)
                rows.append(row)
        manifest = copy.deepcopy(old)
        output_format = 'oracle-concat-brotli-v2' if output_brotli else f'oracle-concat-gzip-v{output_schema}'
        manifest.update(schemaVersion=output_schema, format=output_format, files=rows, expandedBytes=sum(r['bytes'] for r in rows), payloadSHA256=file_sha(packed))
        if packed_runtime:
            manifest['packedRuntime'] = packed_runtime
        validate_manifest(manifest)
        external_changes[manifest_name] = json_bytes(manifest)
        with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=9, allowZip64=False) as target:
            for info in z.infolist():
                if info.filename in removed_external:
                    continue
                entry = zip32_info(info)
                if info.filename == payload_name:
                    entry.filename = entry.orig_filename = output_payload_name
                entry.filename = entry.orig_filename = output_name(entry.filename)
                with target.open(entry, 'w') as dest:
                    if info.filename in external_changes:
                        dest.write(external_changes[info.filename])
                    elif info.filename == payload_name:
                        with packed.open('rb') as source:
                            shutil.copyfileobj(source, dest, CHUNK)
                    else:
                        with z.open(info) as source:
                            shutil.copyfileobj(source, dest, CHUNK)
            template = z.getinfo(root + 'runtime-payload-platform.mjs')
            for name in sorted(set(external_changes) - set(z.namelist())):
                entry = zipfile.ZipInfo(output_name(name), template.date_time)
                entry.create_version = entry.extract_version = 20
                entry.compress_type = zipfile.ZIP_DEFLATED
                entry.create_system = template.create_system
                entry.external_attr = template.external_attr
                target.writestr(entry, external_changes[name], compresslevel=9)
            if runtime_archive:
                entry = zipfile.ZipInfo(output_name(root + packed_runtime['path']), template.date_time)
                entry.compress_type = zipfile.ZIP_DEFLATED
                entry.external_attr = template.external_attr
                entry.file_size = runtime_archive.stat().st_size
                with runtime_archive.open('rb') as source, target.open(entry, 'w') as destination:
                    shutil.copyfileobj(source, destination, CHUNK)
        if output.stat().st_size >= LIMIT:
            output.unlink()
            raise ValueError('archive_exceeds_100mb')
        with zipfile.ZipFile(output) as result:
            if result.testzip():
                raise ValueError('result_zip_crc_failed')
            for info in z.infolist():
                if info.filename not in external_changes and info.filename != payload_name and info.filename not in removed_external:
                    with z.open(info) as before, result.open(output_name(info.filename)) as after:
                        if digest(before) != digest(after):
                            raise ValueError('unchanged_external_file_drift')
            for name, expected in external_changes.items():
                with result.open(output_name(name)) as stream:
                    if digest(stream) != hashlib.sha256(expected).hexdigest():
                        raise ValueError('changed_external_readback_drift: ' + name)
            with result.open(output_name(output_payload_name)) as stream:
                if digest(stream) != manifest['payloadSHA256']:
                    raise ValueError('result_payload_checksum_failed')
            with expanded(result, output_name(output_payload_name), output_brotli, node) as stream:
                for row in rows:
                    if 'source' not in row:
                        copy_row(stream, row)
                if stream.read(1):
                    raise ValueError('result_payload_extra_bytes')
            if runtime_archive:
                with gzip.GzipFile(fileobj=result.open(output_name(root + packed_runtime['path']))) as stream:
                    if digest(stream) != manifest['runtimeSHA256']:
                        raise ValueError('packed_runtime_readback_drift')
        archive_limits = limits_module.validate_archive(output)
        changed = sorted(r['path'] for r in rows if any(r.get(k) != descriptors.get(r['path'], {}).get(k) for k in ('bytes', 'sha256')))
        if file_sha(base) != base_sha:
            raise ValueError('base_archive_drift')
        result = {'archive': str(output.resolve()), 'sha256': file_sha(output), 'bytes': output.stat().st_size, 'limitBytes': LIMIT, 'archiveLimits': archive_limits, 'packedRuntime': packed_runtime, 'baseArchiveSHA256': base_sha, 'format': manifest['format'], 'files': len(rows), 'aliases': sum('source' in r for r in rows), 'changedPaths': changed, 'removedPaths': sorted(removals & descriptors.keys()), 'changedExternalPaths': sorted(name[len(root):] for name in external_changes), 'removedExternalPaths': sorted(name[len(root):] for name in removed_external), 'zipCRCVerified': True, 'zip32Headers': True, 'allPayloadFileHashesVerified': True, 'unchangedExternalFilesVerified': True, 'published': False}
        if plugin_name is not None:
            result['pluginName'] = plugin_name
            result['archiveRoot'] = output_root.rstrip('/')
        output.with_suffix('.receipt.json').write_bytes(json_bytes(result))
        return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--version', required=True)
    parser.add_argument('--replacements', required=True, help='JSON object of payload path to source file')
    parser.add_argument('--node', default=shutil.which('node'))
    parser.add_argument('--compression', choices=('keep', 'gzip', 'brotli'), default='keep')
    parser.add_argument('--plugin-name', help='Explicit new package identity for a separately imported plugin')
    parser.add_argument('--canonical-icon', action='store_true', help='Use the verified branding asset present in both package layers')
    parser.add_argument('--remove-libraries', action='store_true', help='Remove retired Prompts/Tutorials UI code and assets')
    args = parser.parse_args()
    print(json.dumps(repack(args.base, args.output, args.version, json.loads(pathlib.Path(args.replacements).read_text()), args.node, args.compression, args.plugin_name, args.canonical_icon, args.remove_libraries), indent=2))


if __name__ == '__main__':
    main()
