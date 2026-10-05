#!/usr/bin/env python3
"""Compose a closed portable manifest from explicit upstream and catalog inputs.
Signing and full byte admission remain a separate mandatory step.
"""
import argparse,base64,hashlib,importlib.util,json,pathlib,shutil
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('portable_packager',ROOT/'scripts/package-portable-plugin.py');pkg=importlib.util.module_from_spec(spec);spec.loader.exec_module(pkg)
canon=lambda x:json.dumps(x,ensure_ascii=True,sort_keys=True,separators=(',',':')).encode()
def main(a):
 output=pathlib.Path(a.output).absolute()
 if output.exists() or output.resolve()!=output or not output.is_relative_to(ROOT/'.work'):raise ValueError('fresh_work_output_required')
 output.mkdir(parents=True);payload=output/'payload';payload.mkdir()
 inventory=json.loads(pathlib.Path(a.engine_inventory).read_text())
 for row in inventory['manifest']:
  source=pathlib.Path(row['source']);target=payload/row['target']
  if source.stat().st_size!=row['size'] or pkg.sha(source)!=row['sha256']:raise ValueError('engine_inventory_drift')
  pkg.copy_verified(source,target)
 method=pathlib.Path(a.method).absolute()
 for source in pkg.source_files(method):pkg.copy_verified(source,payload/'resources/gbrain-method'/source.relative_to(method))
 envelope=pathlib.Path(a.catalog_envelope).read_bytes();catalog=json.loads(base64.b64decode(json.loads(envelope)['payload_base64'],validate=True))
 provenance=payload/'engine-source/provenance/oracle-distribution.json';provenance.parent.mkdir(parents=True,exist_ok=True);provenance.write_bytes(envelope)
 content=pathlib.Path(a.catalog_payload).absolute()
 for row in catalog['files']:
  if row['kind']=='gbrain-source':continue
  source=content/row['path'];target=payload/'content'/row['path']
  if source.stat().st_size!=row['size'] or pkg.sha(source)!=row['sha256']:raise ValueError('catalog_content_drift')
  pkg.copy_verified(source,target);target.chmod(row['mode'])
 platform=a.platform;runtime_path='runtime/bun' if platform=='darwin-arm64' else 'runtime/bun.exe';runtime=pathlib.Path(a.runtime).absolute();pkg.copy_verified(runtime,payload/runtime_path);(payload/runtime_path).chmod(0o755)
 files=[]
 for source in pkg.source_files(payload):
  path=source.relative_to(payload).as_posix();kind='runtime' if path==runtime_path else 'method' if path.startswith('resources/gbrain-method/') else 'skill' if path.startswith(('content/SISTEMA/skills/','content/SISTEMA/recursos-skills/')) else 'prompt' if path.startswith('content/SISTEMA/prompts/') else 'tutorial' if path.startswith('content/SISTEMA/Tutoriais/') else 'dependency' if '/node_modules/' in path else 'source'
  files.append({'path':path,'sha256':pkg.sha(source),'bytes':source.stat().st_size,'kind':kind,'mode':493 if source.stat().st_mode&0o111 else 420})
 method_sha=pkg.sha(payload/'resources/gbrain-method/manifest.json')
 manifest={'contract':'portable-content-v1' if platform=='darwin-arm64' else 'portable-content-windows-x64-v1','release_id':a.release_id,'sequence':int(a.sequence),'components':{'runtime':{'source':'portable-source-package','name':'bun','version':pkg.RUNTIME_VERSION,'sha256':pkg.sha(runtime),'bytes':runtime.stat().st_size},'gbrain':{'source':'portable-source-package','version':inventory['sourceVersion'],'commit':inventory['pin'],'entry':'engine-source/vendor/gbrain/src/cli.ts'},'adapter':{'source':'portable-source-package','entry':'engine-source/packages/gbrain-adapter/read.ts'},'method':{'source':'portable-source-package','version':inventory['sourceVersion'],'commit':inventory['pin'],'manifest_sha256':method_sha}},'files':files,'inventory_sha256':hashlib.sha256(canon(files)).hexdigest(),'licenses':[{'component':'gbrain','license':'MIT','path':'engine-source/vendor/gbrain/LICENSE'}]+[{'component':'catalog','license':r['license'],'path':'content/'+r['path']} for r in catalog['licenses'] if isinstance(r,dict) and r.get('license') and r.get('path','').startswith('SISTEMA/')]}
 (output/'manifest.json').write_bytes(canon(manifest));return {'manifest':str(output/'manifest.json'),'payloadRoot':str(payload),'files':len(files),'bytes':sum(r['bytes'] for r in files),'signed':False}
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__)
 for name in ['output','engine-inventory','method','catalog-envelope','catalog-payload','runtime','release-id','sequence']:p.add_argument('--'+name,required=True)
 p.add_argument('--platform',required=True,choices=['darwin-arm64','win32-x64']);print(json.dumps(main(p.parse_args())))
