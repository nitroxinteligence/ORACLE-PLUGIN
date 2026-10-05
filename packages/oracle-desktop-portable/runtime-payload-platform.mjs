import {promises as fs} from 'node:fs';
import {isAbsolute,resolve,join} from 'node:path';
export async function runtimePlatform(){
 if(process.platform==='win32')return (await import('./runtime-payload-windows.mjs')).createWindowsRuntimePlatform();
 return {runtimePath:'runtime/bun',enforceModes:true,validateMember(){},async inspect(){},close(){},async privateDirectory(directory){
  if(!isAbsolute(directory)||resolve(directory)!==directory)throw new Error('Payload Oracle: pasta de dados inválida');
  let current='/';for(const part of directory.split('/').filter(Boolean)){current=join(current,part);try{await fs.mkdir(current,{mode:0o700});}catch(error){if(error.code!=='EEXIST')throw error;}const stat=await fs.lstat(current);if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('Payload Oracle: pasta contém link');}
 }};
}
