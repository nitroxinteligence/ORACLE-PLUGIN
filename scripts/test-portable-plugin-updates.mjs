import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {join,dirname} from 'node:path';import {sign} from 'node:crypto';
import {updateFixture} from './portable-updates-fixture.mjs';
import {canonicalContentJSON} from '../packages/oracle-desktop-portable/content-admission.mjs';
import {skillsSHA} from '../packages/oracle-desktop-portable/skills-release-admission.mjs';
import {createPluginUpdateChannel} from '../packages/oracle-desktop-portable/plugin-update-channel.mjs';
import {deflateRawSync} from 'node:zlib';
import {extractSignedPluginArchive} from '../packages/oracle-desktop-portable/plugin-package-archive.mjs';
import {createPluginRuntimeUpdates} from '../packages/oracle-desktop-portable/plugin-runtime-updates.mjs';
import {admitPluginRelease} from '../packages/oracle-desktop-portable/plugin-release-admission.mjs';
function zip(content,root){
 const locals=[],directory=[];let offset=0;
 for(const [path,text] of Object.entries(content)){
  const name=Buffer.from(root+'/'+path),data=Buffer.from(text),compressed=deflateRawSync(data),local=Buffer.alloc(30),central=Buffer.alloc(46);
  local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(8,8);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
  central.writeUInt32LE(0x02014b50);central.writeUInt16LE(0x314,4);central.writeUInt16LE(20,6);central.writeUInt16LE(8,10);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE((0o100644*65536)>>>0,38);central.writeUInt32LE(offset,42);
  locals.push(local,name,compressed);directory.push(central,name);offset+=local.length+name.length+compressed.length;
 }
 const dir=Buffer.concat(directory),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(Object.keys(content).length,8);end.writeUInt16LE(Object.keys(content).length,10);end.writeUInt32LE(dir.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...locals,dir,end]);
}
async function pluginFixture(t,{automatic=true,tamper=false,manual=false}={}){
 const f=await updateFixture(t),name='oracle-system-mac-stable',identity=name+'@oracle-system',version='0.1.20',home=join(f.root,'home'),codexHome=join(home,'.codex'),marketRoot=join(f.root,'marketplace'),cache=join(codexHome,'plugins/cache/oracle-system',name),hostPackageRoot=join(cache,'0.1.19'),sourceRoot=join(marketRoot,'plugins',name);
 const content={'plugin.json':JSON.stringify({name,version}),'.codex-plugin/plugin.json':'{}','runtime-payload-manifest.json':'{}','runtime-payload.br':'synthetic payload','runtime-payload.mjs':'export {};'};
 const files=Object.fromEntries(Object.entries(content).map(([path,value])=>[path,{sha256:skillsSHA(Buffer.from(value)),bytes:Buffer.byteLength(value),mode:420}]));
 for(const [path,value] of Object.entries(content)){await fs.mkdir(dirname(join(sourceRoot,path)),{recursive:true});await fs.writeFile(join(sourceRoot,path),value);}
 await fs.mkdir(hostPackageRoot,{recursive:true});await fs.writeFile(join(hostPackageRoot,'plugin.json'),JSON.stringify({name:manual?'oracle-system-mac-0-1-32':name,version:'0.1.19'}));await fs.writeFile(join(f.bundleRoot,'plugin.json'),JSON.stringify({name:manual?'oracle-system-mac-0-1-32':name,version:'0.1.19'}));
 const doc={contract:'oracle-plugin-release-v1',repository:'https://github.com/nitroxinteligence/ORACLE-PLUGIN',marketplace:'oracle-system',version,releaseID:'oracle-system-'+version,sequence:3,sourceRevision:'b'.repeat(40),pluginABI:1,publishedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString(),platforms:{},engines:{gbrain:{repository:'garrytan/gbrain',version:'0.60.68.0',commit:'b'.repeat(40)},aiMemory:{repository:'akitaonrails/ai-memory',version:'2.5.2',commit:'c'.repeat(40)}}};
 const archive=zip(content,name);
 for(const [platform,plugin,system] of [['darwin-arm64',name,'Mac'],['win32-x64','oracle-system-windows-stable','Windows']])doc.platforms[platform]={name:plugin,path:'plugins/'+plugin,asset:'Oracle-System-'+version+'-'+system+'.zip',bytes:archive.length,sha256:skillsSHA(archive),files};
 const payload=canonicalContentJSON(doc),envelope=canonicalContentJSON({schema_version:'oracle-plugin-release-v1',key_id:'synthetic',payload_base64:payload.toString('base64'),signature_base64:sign(null,Buffer.concat([Buffer.from('oracle-plugin-release-v1\0'),payload]),f.pair.privateKey).toString('base64')}),manifestURL='https://github.com/nitroxinteligence/ORACLE-PLUGIN/releases/download/'+doc.releaseID+'/oracle-plugin-release.json';
 const metadata={tag_name:doc.releaseID,draft:false,prerelease:false,assets:[{name:'oracle-plugin-release.json',size:envelope.length,digest:'sha256:'+skillsSHA(envelope),browser_download_url:manifestURL}]};
 let installedVersion='0.1.19',adds=0;
 const install=async()=>{await fs.rm(hostPackageRoot,{recursive:true,force:true});await fs.cp(sourceRoot,join(cache,version),{recursive:true});installedVersion=version;};
 const runCLI=async args=>{
  if(args[0]==='list')return {installed:[{pluginId:identity,name,marketplaceName:'oracle-system',version:installedVersion,installed:true,enabled:true}]};
  if(args[0]==='marketplace'&&args[1]==='list')return {marketplaces:[{name:'oracle-system',root:marketRoot,marketplaceSource:{sourceType:'git',source:'https://github.com/nitroxinteligence/ORACLE-PLUGIN.git'}}]};
  if(args[0]==='marketplace'&&args[1]==='upgrade'){if(automatic)await install();if(tamper)await fs.writeFile(join(sourceRoot,'runtime-payload.br'),'changed');return {marketplaceName:'oracle-system'};}
  if(args[0]==='add'){adds++;await install();return {pluginId:identity,version,installedPath:join(cache,version)};}
  throw Error('Unexpected official host operation');
 };
 const fetchImpl=async url=>new Response(String(url).endsWith('/releases/latest')?JSON.stringify(metadata):String(url).endsWith('.zip')?archive:envelope);
 const channel=createPluginUpdateChannel({...f,hostPackageRoot,home,codexHome,platform:'darwin-arm64',fetchImpl,runCLI}),context={ticket:f.ticket};
 return {...f,channel,context,hostPackageRoot,adds:()=>adds,doc,envelope,archive};
}
test('marketplace upgrade replaces the installed version and removes the old cache',async t=>{
 const f=await pluginFixture(t);await f.profileStore.update(value=>({...value,retainedMarker:'synthetic'}));assert.equal((await f.channel.check(f.context)).available,true);
 const result=await f.channel.apply(f.context);assert.equal(result.installed,true);assert.equal(result.latestVersion,'0.1.20');assert.equal(f.adds(),0);await assert.rejects(fs.stat(f.hostPackageRoot),{code:'ENOENT'});assert.equal((await f.profileStore.load()).retainedMarker,'synthetic');
});
test('hosts that only refresh the marketplace use the official add operation',async t=>{
 const f=await pluginFixture(t,{automatic:false});await f.channel.check(f.context);assert.equal((await f.channel.apply(f.context)).installed,true);assert.equal(f.adds(),1);
});
test('changed marketplace bytes cannot be confirmed or passed to add',async t=>{
 const f=await pluginFixture(t,{automatic:false,tamper:true});await f.channel.check(f.context);await assert.rejects(f.channel.apply(f.context),{code:'plugin_inventory_changed'});assert.equal(f.adds(),0);
});
test('manual import consults the same signed distribution and updates only its persistent runtime',async t=>{
 const f=await pluginFixture(t,{manual:true});await fs.writeFile(join(f.dataDir,'retained.md'),'PERSONAL');
 assert.equal((await f.channel.check(f.context)).available,true);const applied=await f.channel.apply(f.context);assert.equal(applied.installed,true);assert.equal(applied.restartRequired,true);assert.equal(f.adds(),0);
 const runtime=createPluginRuntimeUpdates({dataDir:f.dataDir,trust:f.trust,bundleVersion:'0.1.19',platform:'darwin-arm64'}),active=await runtime.selected();assert.equal(active.version,'0.1.20');assert.equal(await fs.readFile(join(active.packageRoot,'plugin.json'),'utf8'),JSON.stringify({name:'oracle-system-mac-stable',version:'0.1.20'}));
 assert.equal(await fs.readFile(join(f.dataDir,'retained.md'),'utf8'),'PERSONAL');assert.equal((await fs.stat(f.hostPackageRoot)).isDirectory(),true);
 await fs.writeFile(join(active.packageRoot,'runtime-payload.br'),'TAMPERED');await assert.rejects(runtime.selected(),{code:'plugin_inventory_changed'});
});
test('signature, inventory, roots and interruption block runtime activation and preserve the previous pointer',async t=>{
 const f=await pluginFixture(t,{manual:true});await f.channel.check(f.context);await f.channel.apply(f.context);const pointer=join(f.dataDir,'plugin-runtime-update.json'),before=await fs.readFile(pointer),output=join(f.root,'rejected');await fs.mkdir(output);
 const changed=Buffer.from(f.archive);changed[45]^=1;await assert.rejects(extractSignedPluginArchive(changed,f.doc.platforms['darwin-arm64'],output));assert.deepEqual(await fs.readdir(output),[]);
 await assert.rejects(extractSignedPluginArchive(f.archive,{...f.doc.platforms['darwin-arm64'],name:'unrelated'},output));assert.deepEqual(await fs.readdir(output),[]);
 const active=JSON.parse(before);active.manifestSHA256='f'.repeat(64);await fs.writeFile(pointer,JSON.stringify(active));const runtime=createPluginRuntimeUpdates({dataDir:f.dataDir,trust:f.trust,bundleVersion:'0.1.19',platform:'darwin-arm64'});await assert.rejects(runtime.selected(),{code:'ENOENT'});await fs.writeFile(pointer,before);
 const controller=new AbortController();controller.abort();await assert.rejects(runtime.apply(admitPluginRelease(f.envelope,{trust:f.trust}),f.envelope,{signal:controller.signal}),{code:'operation_cancelled'});assert.deepEqual(await fs.readFile(pointer),before);
});
