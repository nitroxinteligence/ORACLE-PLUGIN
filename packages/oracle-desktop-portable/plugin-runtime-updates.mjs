import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {admitPluginRelease,assertPluginRelease,newerPluginVersion} from './plugin-release-admission.mjs';
import {extractSignedPluginArchive} from './plugin-package-archive.mjs';
import {assertPrivatePath} from './profile-store.mjs';
import {skillsSHA} from './skills-release-admission.mjs';
import {releaseBytes} from './release-network.mjs';
import {acquireRuntimeCacheLock} from './runtime-cache-lock.mjs';
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
async function read(path,maximum){await assertPrivatePath(path);const handle=await fs.open(path,constants.O_RDONLY|constants.O_NOFOLLOW);try{const before=await handle.stat();if(!before.isFile()||before.nlink!==1||before.size>maximum)fail('plugin_inventory_changed','Arquivo irregular na atualização.');const bytes=await handle.readFile(),after=await handle.stat();if(before.ino!==after.ino||before.size!==after.size||before.mtimeMs!==after.mtimeMs)fail('plugin_inventory_changed','Arquivo mudou durante a leitura.');return bytes;}finally{await handle.close();}}
async function verify(root,pack,check){
 const names=[];async function walk(dir,prefix=''){await assertPrivatePath(dir);for(const entry of await fs.readdir(dir,{withFileTypes:true})){check();const path=prefix?prefix+'/'+entry.name:entry.name;if(entry.isDirectory())await walk(join(dir,entry.name),path);else if(entry.isFile())names.push(path);else fail('plugin_inventory_changed','Recurso irregular na atualização.');}}await walk(root);
 if(names.sort().join('\0')!==Object.keys(pack.files).sort().join('\0'))fail('plugin_inventory_changed','Inventário da atualização alterado.');
 for(const path of names){check();const row=pack.files[path],bytes=await read(join(root,path),row.bytes);if(bytes.length!==row.bytes||skillsSHA(bytes)!==row.sha256||(await fs.lstat(join(root,path))).mode%512!==row.mode)fail('plugin_inventory_changed','Arquivo da atualização alterado.');}check();
}
/** Imported plugins update their owned runtime in PLUGIN_DATA. Account plugin
 * identity and host cache stay owned by the host. The pointer is never proof:
 * boot re-admits the publisher signature and complete immutable package. */
export function createPluginRuntimeUpdates({dataDir,trust,bundleVersion,platform=`${process.platform}-${process.arch}`,fetchImpl=globalThis.fetch,verifyPackage=verify}={}){
 const parent=join(dataDir,'plugin-updates'),pointer=join(dataDir,'plugin-runtime-update.json');
 return Object.freeze({
  async apply(candidate,envelope,{check=()=>{},signal}={}){
   const admission=check;check=()=>{if(signal?.aborted)fail('operation_cancelled','Atualização cancelada.');admission();};
   assertPluginRelease(candidate);const pack=candidate.platforms[platform];if(!pack)fail('plugin_release_incompatible','Plataforma ausente.');check();
   if(!newerPluginVersion(candidate.version,bundleVersion))return {installed:false,message:'ORACLE está na versão disponível.'};
   await assertPrivatePath(dataDir);await fs.mkdir(parent,{mode:0o700,recursive:true});await assertPrivatePath(parent);check();
   const key=candidate.manifestSHA256,destination=join(parent,key),packageRoot=join(destination,'package');let stage;
   try{
    try{await fs.lstat(destination);await verifyPackage(packageRoot,pack,check);}
    catch(error){if(error.code!=='ENOENT')throw error;
     stage=await fs.mkdtemp(join(parent,'.pending-'));const stagedPackage=join(stage,'package');await fs.mkdir(stagedPackage,{mode:0o700});check();
     const url=`https://github.com/nitroxinteligence/ORACLE-PLUGIN/releases/download/${candidate.releaseID}/${pack.asset}`;
     const bytes=await releaseBytes(url,{maximum:pack.bytes,expectedBytes:pack.bytes,fetchImpl,signal,check,timeoutMS:300000});check();
     await extractSignedPluginArchive(bytes,pack,stagedPackage,{check});await verifyPackage(stagedPackage,pack,check);check();
     if(skillsSHA(envelope)!==key)fail('plugin_inventory_changed','Manifesto da atualização alterado.');await fs.writeFile(join(stage,'release.json'),envelope,{flag:'wx',mode:0o600});check();
     try{await fs.rename(stage,destination);stage=null;}catch(error){if(!['EEXIST','ENOTEMPTY'].includes(error.code))throw error;await verifyPackage(packageRoot,pack,check);}
    }
    const unlock=await acquireRuntimeCacheLock({cache:parent,key:'active-update',signal});try{
     check();const previous=await read(pointer,64000).then(bytes=>JSON.parse(bytes)).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
     if(previous?.sequence>candidate.sequence||previous?.sequence===candidate.sequence&&previous.manifestSHA256!==key)fail('plugin_rollback','Uma atualização mais recente já foi instalada.');
     const temporary=pointer+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temporary,JSON.stringify({schemaVersion:1,manifestSHA256:key,sequence:candidate.sequence,version:candidate.version}),{flag:'wx',mode:0o600});check();await fs.rename(temporary,pointer);}finally{await fs.unlink(temporary).catch(()=>{});}
    }finally{await unlock();}
    return {installed:true,restartRequired:true,latestVersion:candidate.version,message:'ORACLE atualizado. Reabra o plugin para usar a nova versão; seu vault e suas escolhas foram preservados.'};
   }finally{if(stage)await fs.rm(stage,{recursive:true,force:true});}
  },
  async selected({check=()=>{}}={}){
   let active;try{active=JSON.parse(await read(pointer,64000));}catch(error){if(error.code==='ENOENT')return null;throw error;}
   if(active.schemaVersion!==1||!digest(active.manifestSHA256)||!Number.isSafeInteger(active.sequence))fail('plugin_inventory_changed','Registro da atualização inválido.');
   const directory=join(parent,active.manifestSHA256),envelope=await read(join(directory,'release.json'),2000000);if(skillsSHA(envelope)!==active.manifestSHA256)fail('plugin_inventory_changed','Manifesto da atualização alterado.');
   const admitted=admitPluginRelease(envelope,{trust,minimumSequence:active.sequence,knownManifestSHA256:active.manifestSHA256});if(admitted.version!==active.version||!admitted.platforms[platform])fail('plugin_release_incompatible','Atualização incompatível.');
   if(!newerPluginVersion(admitted.version,bundleVersion))return null;
   const packageRoot=join(directory,'package');if(resolve(packageRoot)!==packageRoot)fail('plugin_inventory_changed','Pasta da atualização inválida.');await verifyPackage(packageRoot,admitted.platforms[platform],check);return {packageRoot,version:admitted.version};
  }
 });
}
