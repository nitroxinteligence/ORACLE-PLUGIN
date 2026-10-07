import {mkdtemp,rm} from 'node:fs/promises';
import {renameSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {loadAdmittedContentFile} from './content-admission.mjs';

// A package upgrade changes the private method cache key. Vault files have
// already passed signed readback before this function is called. Prior journal
// entries schedule this migration; they never prove content or grant access.
export async function restorePrivateMethod({plan,admitted,payloadRoot,dataDir,profileStore,grant,check,filesystem}){
 const profile=await profileStore.load();check();
 const installed=Object.values(profile.contentInstallations||{}).filter(row=>row?.completed===true&&row.rootIdentity?.dev===grant.rootIdentity.dev&&row.rootIdentity?.ino===grant.rootIdentity.ino);
 const previous=!installed.some(row=>row.manifestSHA256===plan.manifestSHA256)&&installed.some(row=>/^[a-f0-9]{64}$/.test(row.manifestSHA256??'')&&row.manifestSHA256!==plan.manifestSHA256);
 if(!previous||typeof payloadRoot!=='string')throw Object.assign(new Error('O cache do método instalado está ausente. Os arquivos existentes foram preservados.'),{code:'content_installation_missing'});
 const {directory,privateRoot,pathUnder,same}=filesystem;
 const entries=plan.entries.filter(row=>row.scope==='private-method');
 const files=entries.map(entry=>({entry,bytes:loadAdmittedContentFile(admitted,entry.source,payloadRoot)}));check();
 await grant.checkRoot();check();const parent=join(dataDir,'installed-method');privateRoot(parent,check);
 const stage=await mkdtemp(join(parent,'.restore-'));const identity=directory(stage),destination=join(parent,plan.manifestSHA256);
 try{
  for(const {entry,bytes} of files){check();const path=pathUnder(stage,entry.destination,check);writeFileSync(path,bytes,{flag:'wx',mode:0o600});check();}
  await grant.checkRoot();check();if(!same(identity,directory(stage)))throw Object.assign(Error('O cache privado mudou durante a migração.'),{code:'content_parent_changed'});
  const parentIdentity=directory(parent);check();
  try{renameSync(stage,destination);}catch(error){if(!['EEXIST','ENOTEMPTY'].includes(error.code))throw error;directory(destination);}
  check();if(!same(parentIdentity,directory(parent)))throw Object.assign(Error('A pasta privada mudou durante a migração.'),{code:'content_parent_changed'});
  return destination;
 }finally{
  try{if(same(identity,directory(stage)))await rm(stage,{recursive:true});}catch(error){if(error.code!=='ENOENT')throw error;}
 }
}
