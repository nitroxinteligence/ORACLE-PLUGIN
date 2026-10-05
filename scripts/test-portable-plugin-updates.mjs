import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {join,dirname} from 'node:path';import {sign} from 'node:crypto';
import {updateFixture} from './portable-updates-fixture.mjs';
import {canonicalContentJSON} from '../packages/oracle-desktop-portable/content-admission.mjs';
import {skillsSHA} from '../packages/oracle-desktop-portable/skills-release-admission.mjs';
import {createPluginUpdateChannel} from '../packages/oracle-desktop-portable/plugin-update-channel.mjs';
async function pluginFixture(t,{automatic=true,tamper=false}={}){
 const f=await updateFixture(t),name='oracle-system-mac-stable',identity=name+'@oracle-system',version='0.1.20',home=join(f.root,'home'),codexHome=join(home,'.codex'),marketRoot=join(f.root,'marketplace'),cache=join(codexHome,'plugins/cache/oracle-system',name),hostPackageRoot=join(cache,'0.1.19'),sourceRoot=join(marketRoot,'plugins',name);
 const content={'plugin.json':JSON.stringify({name,version}),'.codex-plugin/plugin.json':'{}','runtime-payload-manifest.json':'{}','runtime-payload.br':'synthetic payload','runtime-payload.mjs':'export {};'};
 const files=Object.fromEntries(Object.entries(content).map(([path,value])=>[path,{sha256:skillsSHA(Buffer.from(value)),bytes:Buffer.byteLength(value),mode:420}]));
 for(const [path,value] of Object.entries(content)){await fs.mkdir(dirname(join(sourceRoot,path)),{recursive:true});await fs.writeFile(join(sourceRoot,path),value);}
 await fs.mkdir(hostPackageRoot,{recursive:true});await fs.writeFile(join(f.bundleRoot,'plugin.json'),JSON.stringify({name,version:'0.1.19'}));
 const doc={contract:'oracle-plugin-release-v1',repository:'https://github.com/nitroxinteligence/ORACLE-PLUGIN',marketplace:'oracle-system',version,releaseID:'oracle-system-'+version,sequence:3,sourceRevision:'b'.repeat(40),pluginABI:1,publishedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString(),platforms:{},engines:{gbrain:{repository:'garrytan/gbrain',version:'0.60.68.0',commit:'b'.repeat(40)},aiMemory:{repository:'akitaonrails/ai-memory',version:'2.5.2',commit:'c'.repeat(40)}}};
 for(const [platform,plugin,system] of [['darwin-arm64',name,'Mac'],['win32-x64','oracle-system-windows-stable','Windows']])doc.platforms[platform]={name:plugin,path:'plugins/'+plugin,asset:'Oracle-System-'+version+'-'+system+'.zip',bytes:100,sha256:'a'.repeat(64),files};
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
 const fetchImpl=async url=>new Response(String(url).endsWith('/releases/latest')?JSON.stringify(metadata):envelope);
 const channel=createPluginUpdateChannel({...f,hostPackageRoot,home,codexHome,platform:'darwin-arm64',fetchImpl,runCLI}),context={ticket:f.ticket};
 return {...f,channel,context,hostPackageRoot,adds:()=>adds};
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
