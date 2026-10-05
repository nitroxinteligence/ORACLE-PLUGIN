#!/usr/bin/env python3
"""Windows x64 candidate, preserving the expanded reviewed Oracle UI/content.
Never executes PE files or signs vendor binaries. Requires a publisher-admitted
Windows content variant; the Mac envelope cannot authorize another runtime.
"""
import argparse,gzip,hashlib,importlib.util,json,pathlib,re,shutil,stat,subprocess,zipfile
from portable_vendor_pins import PINS as UPSTREAM_PINS
ROOT=pathlib.Path(__file__).resolve().parents[1]
metadata_spec=importlib.util.spec_from_file_location('windows_plugin_metadata',ROOT/'scripts/windows-plugin-metadata.py')
metadata_module=importlib.util.module_from_spec(metadata_spec);metadata_spec.loader.exec_module(metadata_module)
runtime_spec=importlib.util.spec_from_file_location('windows_runtime_archive',ROOT/'scripts/windows-runtime-archive.py')
runtime_module=importlib.util.module_from_spec(runtime_spec);runtime_spec.loader.exec_module(runtime_module)
limits_spec=importlib.util.spec_from_file_location('portable_archive_limits',ROOT/'scripts/portable-archive-limits.py')
limits_module=importlib.util.module_from_spec(limits_spec);limits_spec.loader.exec_module(limits_module)
SOURCE=ROOT/'packages/oracle-desktop-portable'
spec=importlib.util.spec_from_file_location('windows_vendor_probe',ROOT/'scripts/package-windows-runtime-probe.py')
vendor=importlib.util.module_from_spec(spec);spec.loader.exec_module(vendor)
NAME='oracle-system-windows-v017';LIMIT=limits_module.MAX_ARCHIVE_BYTES
MAC_VERIFIER_SHA=UPSTREAM_PINS['bun']['darwin-arm64']['sha256']
def sha(path):
 h=hashlib.sha256()
 with path.open('rb') as stream:
  for block in iter(lambda:stream.read(1048576),b''):h.update(block)
 return h.hexdigest()
def canonical(path,directory=False):
 path=pathlib.Path(path).absolute()
 if path.resolve()!=path or any(p.is_symlink() for p in [path,*path.parents]):raise ValueError('canonical_input_required')
 if directory:
  if not path.is_dir():raise ValueError('directory_required')
 elif not path.is_file() or path.stat().st_nlink!=1:raise ValueError('regular_input_required')
 return path
def files(root):
 for path in sorted(root.rglob('*')):
  if path.is_symlink():raise ValueError('symlink_in_payload')
  if path.is_file():yield path
VERIFY=r'''
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [modulePath,resourceRoot,envelopePath,payloadRoot]=process.argv.slice(1);
const {loadReviewedContentTrust,verifyPortableContentManifest,loadAdmittedContentFile}=await import(pathToFileURL(modulePath).href);
const admitted=verifyPortableContentManifest(readFileSync(envelopePath),{trust:loadReviewedContentTrust(resourceRoot),platform:'win32-x64'});
const files=admitted.manifest.files.filter(row=>!row.path.startsWith('content/'));
for(const row of files)loadAdmittedContentFile(admitted,row.path,payloadRoot);
if(!files.some(row=>row.path==='runtime/bun.exe'))throw new Error('Signed Windows runtime path required');
console.log(JSON.stringify({manifestSHA256:admitted.manifestSHA256,releaseID:admitted.manifest.release_id,sequence:admitted.manifest.sequence,files}));
'''
def admit(verifier,envelope,payload):
 if verifier.stat().st_size!=UPSTREAM_PINS['bun']['darwin-arm64']['bytes'] or sha(verifier)!=MAC_VERIFIER_SHA:raise ValueError('reviewed_verifier_runtime_required')
 locked=[SOURCE/'content-admission.mjs',ROOT/'Resources/updates/sources.json',ROOT/'Resources/updates/distribution-keys.json',envelope]
 before={p:sha(p) for p in locked}
 result=subprocess.run([str(verifier),'--no-env-file','--no-install','-e',VERIFY,str(locked[0]),str(ROOT/'Resources'),str(envelope),str(payload)],cwd=ROOT,env={'PATH':'/usr/bin:/bin','DO_NOT_TRACK':'1'},capture_output=True,text=True,timeout=180,check=True)
 if len(result.stdout.encode())>16000000 or any(sha(p)!=v for p,v in before.items()):raise ValueError('content_admission_drift')
 admitted=json.loads(result.stdout)
 if admitted['manifestSHA256']!=before[envelope]:raise ValueError('envelope_admission_mismatch')
 return admitted

BROTLIFY=r'''
import{createReadStream,createWriteStream}from'node:fs';import{createGunzip,createBrotliCompress,constants}from'node:zlib';import{pipeline}from'node:stream/promises';const[input,output]=process.argv.slice(1);await pipeline(createReadStream(input),createGunzip(),createBrotliCompress({params:{[constants.BROTLI_PARAM_QUALITY]:6,[constants.BROTLI_PARAM_LGWIN]:24}}),createWriteStream(output,{flags:'wx'}));
'''
def package(args):
 base=canonical(args.base_package,True);bun=canonical(args.bun_runtime);ai=canonical(args.ai_memory_runtime);license=canonical(args.ai_memory_license);verifier=canonical(args.verifier_runtime);envelope=canonical(args.content_envelope);payload=canonical(args.content_payload,True)
 vendor.executable(bun.read_bytes(),vendor.PINS['bun']);vendor.executable(ai.read_bytes(),vendor.PINS['ai-memory'])
 if sha(license)!=vendor.AI_LICENSE_SHA:raise ValueError('ai_memory_license_drift')
 admitted=admit(verifier,envelope,payload)
 output=pathlib.Path(args.output).absolute()
 if output.exists() or output.resolve()!=output or not output.is_relative_to((ROOT/'.work').resolve()):raise ValueError('fresh_work_output_required')
 # The base is an expanded qualification tree, never an imported user cache.
 for required in ['server.mjs','resources/web/index.html','resources/catalog/manifest.json','resources/updates/portable-content.json','engine-source-receipt.json']:
  if not (base/required).is_file():raise ValueError('incomplete_base_package: '+required)
 output.mkdir(parents=True);stage=output/NAME;stage.mkdir();copied={}
 excluded={'runtime/bun','runtime/ai-memory','runtime-payload.gz','runtime-payload.br','runtime-payload-manifest.json','portable-package-receipt.json','scripts/launch-mcp.sh','engine-source/vendor/gbrain/native/locks/prebuilds/darwin-arm64.node','.codex-plugin/plugin.json','.mcp.json'}
 for source in files(base):
  member=source.relative_to(base).as_posix()
  if member in excluded:continue
  target=stage/member;target.parent.mkdir(parents=True,exist_ok=True);before=sha(source);shutil.copy2(source,target)
  if sha(source)!=before or sha(target)!=before:raise ValueError('base_changed_during_copy')
  copied[member]=before
 for source in files(SOURCE):
  member=source.relative_to(SOURCE).as_posix()
  if member=='scripts/launch-mcp.sh':continue
  target=stage/member;target.parent.mkdir(parents=True,exist_ok=True);before=sha(source);shutil.copy2(source,target)
  if sha(source)!=before or sha(target)!=before:raise ValueError('source_changed_during_copy')
 for source,member in [(bun,'runtime/bun.exe'),(ai,'runtime/ai-memory.exe'),(license,'licenses/AI-MEMORY-LICENSE'),(envelope,'resources/updates/portable-content.json')]:
  target=stage/member;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
  if sha(source)!=sha(target):raise ValueError('vendor_or_envelope_drift')
 signed={row['path']:row for row in admitted['files']}
 for member,row in signed.items():
  source=canonical(payload/member);target=stage/member;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
  if not target.is_file() or target.stat().st_size!=row['bytes'] or sha(target)!=row['sha256']:raise ValueError('signed_component_drift: '+member)
 for folder in ['engine-source','resources/gbrain-method']:
  for source in files(stage/folder):
   if source.relative_to(stage).as_posix() not in signed:raise ValueError('unsigned_technical_extra')
 engine_receipt=json.loads((stage/'engine-source-receipt.json').read_text())
 engine_rows=[{'target':r['path'],'bytes':r['bytes'],'sha256':r['sha256']} for r in admitted['files'] if r['path'].startswith('engine-source/') and not r['path'].startswith('engine-source/provenance/')]
 engine_receipt.update(engineSourcePin=UPSTREAM_PINS['gbrain']['commit'],engineSourceVersion=UPSTREAM_PINS['gbrain']['version'],inventorySHA256=hashlib.sha256(json.dumps(engine_rows,sort_keys=True,separators=(',',':')).encode()).hexdigest(),inventoryOrigin='signed-windows-content-envelope',contentManifestSHA256=admitted['manifestSHA256'],files=engine_rows,fileCount=len(engine_rows))
 (stage/'engine-source-receipt.json').write_text(json.dumps(engine_receipt,indent=2)+'\n')
 plugin=json.loads((base/'plugin.json').read_text());plugin['name']=NAME;plugin['version']=args.version
 plugin,legacy=metadata_module.windows_plugin_metadata(plugin)
 (stage/'plugin.json').write_text(json.dumps(plugin,ensure_ascii=False,indent=2)+'\n')
 (stage/'.codex-plugin').mkdir(exist_ok=True)
 (stage/'.codex-plugin/plugin.json').write_text(json.dumps(legacy,ensure_ascii=False,indent=2)+'\n')
 packed_runtime=runtime_module.archive_runtime(stage/'runtime/bun.exe',stage/'runtime/bun.exe.gz',sha(bun),bun.stat().st_size)
 server=runtime_module.windows_mcp_server(sha(stage/runtime_module.LAUNCHER_PATH),sha(bun),packed_runtime)
 mcp={'$schema':'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json','mcpServers':{NAME:server}}
 (stage/'mcp.json').write_text(json.dumps(mcp,indent=2)+'\n')
 (stage/'.mcp.json').write_text(json.dumps(mcp,indent=2)+'\n')
 (stage/'README.md').write_text('# Oracle System Windows x64\n\nCandidato privado para importação do ZIP na superfície de plugins compatível. O host inicia Bun oficial diretamente, sem comando manual. Preserva a interface Oracle e o conteúdo técnico admitido pelo distribuidor.\n\nImportação, execução de MCP, ACL, provedores Windows e jornada completa precisam ser verificados em Windows real. AI Memory oficial depende de VCRUNTIME140.dll. Nenhuma instalação de dependência ou alteração de proteções é realizada pelo pacote.\n')
 receipt={'schemaVersion':1,'platform':'win32','architecture':'x64','candidate':True,'runtimeVersion':UPSTREAM_PINS['bun']['version'],'runtimeSHA256':sha(bun),'engineSourceIncluded':True,'engineSourcePin':UPSTREAM_PINS['gbrain']['commit'],'aiMemoryIncluded':True,'runtimeVendorBytesIntact':True,'runtimeAuthenticodeVerified':False,'aiMemoryVersion':UPSTREAM_PINS['aiMemory']['version'],'aiMemorySHA256':sha(ai),'aiMemoryServiceVerified':False,'contentManifestSHA256':admitted['manifestSHA256'],'contentSignatureVerified':True,'windowsHostQualified':False,'hostImportVerified':False,'ready':False,'personalProfileTouched':False,'published':False,'originalUIHashes':{p:v for p,v in copied.items() if p.startswith('resources/web/')},'files':{p.relative_to(stage).as_posix():sha(p) for p in files(stage)}}
 (stage/'portable-package-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
 external={'plugin.json','.codex-plugin/plugin.json','.mcp.json','mcp.json','README.md','assets/icon-mono.png','runtime/bun.exe.gz',runtime_module.LAUNCHER_PATH,'runtime-payload.mjs','runtime-payload-platform.mjs','runtime-cache-lock.mjs','runtime-binary-source.mjs','runtime-payload-windows.mjs','portable-windows-paths.mjs'}
 external.update({'runtime-bootstrap.mjs','stdio-transport.mjs','mcp-metadata.mjs'})
 rows=[];seen={};gz=stage/'runtime-payload.gz'
 with gz.open('wb') as raw,gzip.GzipFile(filename='',mode='wb',fileobj=raw,compresslevel=9,mtime=0) as packed:
  for source in files(stage):
   member=source.relative_to(stage).as_posix()
   if member in {'runtime/bun.exe','runtime/bun.exe.gz',runtime_module.LAUNCHER_PATH,'mcp.json','README.md'} or member=='runtime-payload.gz':continue
   before=sha(source);row={'path':member,'bytes':source.stat().st_size,'sha256':before,'mode':0o755 if source.stat().st_mode&0o111 else 0o644};key=(row['sha256'],row['bytes'],row['mode'])
   if key in seen:row['source']=seen[key]
   else:
    seen[key]=member
    with source.open('rb') as stream:shutil.copyfileobj(stream,packed)
   rows.append(row)
   if sha(source)!=before:raise ValueError('compression_source_drift')
 packed_payload=stage/'runtime-payload.br'
 subprocess.run([str(verifier),'--no-env-file','--no-install','-e',BROTLIFY,str(gz),str(packed_payload)],cwd=ROOT,env={'PATH':'/usr/bin:/bin','DO_NOT_TRACK':'1'},capture_output=True,text=True,timeout=180,check=True)
 gz.unlink()
 manifest={'schemaVersion':2,'format':'oracle-concat-brotli-v2','payloadSHA256':sha(packed_payload),'runtimeSHA256':sha(bun),'packedRuntime':packed_runtime,'expandedBytes':sum(r['bytes'] for r in rows),'files':rows}
 if len(rows)>30000 or manifest['expandedBytes']>700000000:raise ValueError('runtime_payload_limit')
 folded=set()
 for row in rows:
  if row['path'].lower() in folded:raise ValueError('windows_case_collision')
  folded.add(row['path'].lower())
  for part in row['path'].split('/'):
   if not part or part in {'.','..'} or len(part)>255 or re.search(r'[<>:\"\\|?*\x00-\x1f]',part) or part.endswith(('.', ' ')) or re.match(r'^(CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])(?:\.|$)',part,re.I):raise ValueError('windows_payload_path_invalid')
 (stage/'runtime-payload-manifest.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
 external.update({'runtime-payload.br','runtime-payload-manifest.json'})
 archive=output/(NAME+'-windows-x64-'+args.version+'.zip')
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9,allowZip64=False) as z:
  for member in sorted(external):
   entry=zipfile.ZipInfo(NAME+'/'+member,(2026,10,4,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;entry.external_attr=(stat.S_IFREG|0o644)<<16;z.writestr(entry,(stage/member).read_bytes(),compresslevel=9)
 limits_module.validate_archive(archive)
 if archive.stat().st_size>LIMIT:raise ValueError('archive_exceeds_100_mb_limit')
 with zipfile.ZipFile(archive) as z:
  if z.testzip():raise ValueError('zip_crc_failed')
  for member in external:
   if hashlib.sha256(z.read(NAME+'/'+member)).hexdigest()!=sha(stage/member):raise ValueError('zip_readback_drift')
 result={'archive':str(archive),'sha256':sha(archive),'bytes':archive.stat().st_size,'limitBytes':LIMIT,'underLimit':True,'memberCount':len(external),'runtimePayloadFiles':len(rows),'deduplicatedFiles':sum('source' in row for row in rows),'deduplicatedBytes':sum(row['bytes'] for row in rows if 'source' in row),'expandedBytes':manifest['expandedBytes'],'contentManifestSHA256':admitted['manifestSHA256'],'windowsHostQualified':False,'ready':False,'published':False}
 (output/'archive-receipt.json').write_text(json.dumps(result,indent=2)+'\n');return result

def main():
 p=argparse.ArgumentParser(description=__doc__)
 for name in ['base-package','bun-runtime','ai-memory-runtime','ai-memory-license','verifier-runtime','content-envelope','content-payload','output']:p.add_argument('--'+name,required=True)
 p.add_argument('--version',default='0.1.2');print(json.dumps(package(p.parse_args()),indent=2))
if __name__=='__main__':main()
