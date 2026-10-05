#!/usr/bin/env python3
"""Private Windows x64 vendor-runtime probe. Never installs or executes PE files."""
import argparse,hashlib,json,pathlib,stat,struct,zipfile
from portable_vendor_pins import PINS as UPSTREAM_PINS
PINS={'bun':UPSTREAM_PINS['bun']['win32-x64'],'ai-memory':UPSTREAM_PINS['aiMemory']['win32-x64']}
BUN_LICENSE_SHA='7068a9711ef8196d654e143447ed7976b3678ce21145b9da16e1f786528f15bb'
AI_LICENSE_SHA=UPSTREAM_PINS['aiMemory']['win32-x64']['licenseSHA256']
def sha(data):return hashlib.sha256(data).hexdigest()
def regular(path):
 path=pathlib.Path(path)
 if path.is_symlink() or not path.is_file() or path.stat().st_nlink!=1:raise ValueError('only_regular_files')
 if any(p.is_symlink() for p in [path,*path.parents]):raise ValueError('symlink_path')
 return path.read_bytes()
def executable(data,pin):
 if len(data)!=pin['bytes'] or sha(data)!=pin['sha256']:raise ValueError('vendor_executable_drift')
 pe=struct.unpack_from('<I',data,0x3c)[0]
 if data[:2]!=b'MZ' or data[pe:pe+4]!=b'PE\0\0' or struct.unpack_from('<H',data,pe+4)[0]!=0x8664 or struct.unpack_from('<H',data,pe+24)[0]!=0x20b:raise ValueError('windows_x64_pe_required')
 off,size=struct.unpack_from('<II',data,pe+24+112+32)
 if size!=pin['certificateBytes'] or size and (off%8 or off+size>len(data)):raise ValueError('certificate_table_drift')
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--bun-archive',required=True);parser.add_argument('--ai-memory-archive',required=True);parser.add_argument('--bun-license',required=True);parser.add_argument('--output',required=True);args=parser.parse_args()
 repo=pathlib.Path(__file__).resolve().parents[1];output=pathlib.Path(args.output).absolute();work=(repo/'.work').resolve()
 if not output.is_relative_to(work) or output==work or output.exists():raise ValueError('fresh_work_output_required')
 output.mkdir(parents=True);name='oracle-windows-runtime-probe';files={};archives={}
 for key,path in [('bun',args.bun_archive),('ai-memory',args.ai_memory_archive)]:
  data=regular(path);pin=PINS[key]
  if len(data)!=pin['archiveBytes'] or sha(data)!=pin['archiveSHA256']:raise ValueError('official_archive_drift')
  with zipfile.ZipFile(path) as archive:
   if len({i.filename for i in archive.infolist()})!=len(archive.infolist()):raise ValueError('duplicate_archive_members')
   binary=archive.read(pin['member']);executable(binary,pin);files['runtime/'+key+'.exe']=binary
   if key=='ai-memory':
    license=archive.read('LICENSE')
    if sha(license)!=AI_LICENSE_SHA:raise ValueError('ai_license_drift')
    files['licenses/AI-MEMORY-LICENSE']=license;files['vendor/ai-memory/docs/windows.md']=archive.read('docs/windows.md')
  archives[key]={'archiveSHA256':sha(data),'archiveBytes':len(data),'executableSHA256':sha(binary),'executableBytes':len(binary),'certificateTableBytes':pin['certificateBytes'],'authenticodeVerified':False,'executionVerified':False}
 license=regular(args.bun_license)
 if sha(license)!=BUN_LICENSE_SHA:raise ValueError('bun_license_drift')
 files['licenses/BUN-LICENSE.md']=license
 for source in ['portable-windows-probe.mjs','portable-windows-paths.mjs','portable-windows-runtime-pins.mjs']:
  files[source]=regular(repo/'packages/oracle-desktop-portable'/source)
 plugin={'$schema':'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json','name':name,'version':'0.1.0','description':'Prova privada experimental Windows x64: --version dos runtimes oficiais. Não é Oracle completo.','author':{'name':'Mateus M'},'extensions':{'com.openai':{'interface':{'displayName':'Oracle Windows Runtime Probe','shortDescription':'Prova experimental dos runtimes Windows','longDescription':'Bun e AI Memory oficiais intactos. Somente --version em perfil descartável PLUGIN_DATA. Sem vault, setup, DB, captura ou hooks. Host Windows ainda não qualificado.','developerName':'Mateus M','category':'Productivity','capabilities':['Read']}}}}
 files['plugin.json']=json.dumps(plugin,ensure_ascii=False,indent=2).encode()
 files['mcp.json']=json.dumps({'$schema':'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json','mcpServers':{name:{'type':'stdio','command':'./runtime/bun.exe','args':['./portable-windows-probe.mjs'],'cwd':'./','env':{'ORACLE_WINDOWS_PROBE_PLUGIN_DATA':'${PLUGIN_DATA}'}}}},indent=2).encode()
 files['README.md']=('''# Oracle Windows Runtime Probe\n\nExperimento privado Windows x64. Carregue o ZIP pela importação pessoal de plugins se a sua superfície Windows oferecer esse recurso. O comando MCP inicia o Bun oficial diretamente. Solicite `oracle_windows_runtime_probe` para medir somente `--version` de Bun 1.4.2 e AI Memory 2.5.2 em pasta temporária de PLUGIN_DATA.\n\nO arquivo não instala Oracle, não prepara DB/serviço, não acessa vault ou perfil pessoal, não autoriza hooks/Codex/captura e não qualifica a jornada. Assinatura embutida do Bun não assina AI Memory. AI Memory não possui Authenticode embutido e importa VCRUNTIME140.dll; dependência/SmartScreen/política do host ainda precisam ser observados, sem desativar proteções. Não há executável próprio nem comando manual de terminal. Qualificação Windows e ACL privadas estão pendentes.\n''').encode()
 receipt={'scope':'private-windows-x64-runtime-probe-static-package','vendorRuntimes':archives,'windowsHostQualified':False,'runtimeExecutionVerified':False,'ready':False,'serviceAvailable':False,'personalStateIncluded':False,'files':[{'path':path,'bytes':len(data),'sha256':sha(data)} for path,data in sorted(files.items())]}
 files['probe-package-receipt.json']=json.dumps(receipt,indent=2).encode();archive=output/(name+'.zip')
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for path,data in sorted(files.items()):
   entry=zipfile.ZipInfo(name+'/'+path,(2026,10,3,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;entry.external_attr=(stat.S_IFREG|0o644)<<16;z.writestr(entry,data,compresslevel=9)
 if archive.stat().st_size>=100*1024*1024:archive.unlink();raise ValueError('zip_100_mib_limit')
 with zipfile.ZipFile(archive) as z:
  if z.testzip():raise ValueError('zip_crc_failed')
  for path,data in files.items():
   if z.read(name+'/'+path)!=data:raise ValueError('zip_readback_drift')
 result={'archive':str(archive),'sha256':sha(archive.read_bytes()),'bytes':archive.stat().st_size,'members':len(files),'windowsHostQualified':False,'vendorRuntimes':archives}
 (output/'archive-receipt.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
if __name__=='__main__':main()
