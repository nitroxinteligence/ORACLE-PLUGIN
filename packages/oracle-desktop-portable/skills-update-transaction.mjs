import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {assertPrivatePath} from './profile-store.mjs';
import {assertSkillsRelease,skillsSHA,verifySkillsFile} from './skills-release-admission.mjs';
import {assertSkillsStage} from './skills-release-source.mjs';
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const identity=entry=>[entry.dev,entry.ino,entry.size,entry.mtimeMs,entry.ctimeMs].join(':');
async function readStable(path,maximum,inspectPath){
 if(inspectPath){const inspected=await inspectPath(path);if(inspected?.reparsePoint||inspected?.isReparsePoint)fail('skills_path_collision','Link ou redirecionamento recusado.');}
 const before=await fs.lstat(path);if(before.isSymbolicLink()||!before.isFile()||before.nlink!==1||before.size>maximum)fail('skills_path_collision','Arquivo irregular no acervo.');
 const fd=await fs.open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);try{const opened=await fd.stat();if(identity(opened)!==identity(before))fail('skills_concurrent_change','O arquivo mudou durante a atualização.');const bytes=await fd.readFile();if(bytes.length>maximum||identity(await fd.stat())!==identity(before)||identity(await fs.lstat(path))!==identity(before))fail('skills_concurrent_change','O arquivo mudou durante a atualização.');return {bytes,identity:identity(before)};}finally{await fd.close();}
}
async function targetPath(root,path,{check,inspectPath}){
 let cursor=root;
 for(const part of path.split('/').slice(0,-1)){check();const parent=await fs.lstat(cursor);const next=join(cursor,part);try{await fs.mkdir(next,{mode:0o700});}catch(error){if(error.code!=='EEXIST')throw error;}
  const info=await fs.lstat(next);if(info.isSymbolicLink()||!info.isDirectory()||await fs.realpath(next)!==next)fail('skills_path_collision','Pasta redirecionada recusada.');
  if(inspectPath){const observed=await inspectPath(next);if(observed?.reparsePoint||observed?.isReparsePoint)fail('skills_path_collision','Pasta redirecionada recusada.');}
  const after=await fs.lstat(cursor);if(parent.ino!==after.ino||parent.dev!==after.dev)fail('skills_concurrent_change','A pasta mudou durante a atualização.');cursor=next;
 }check();return join(cursor,path.split('/').at(-1));
}
/** Only unchanged files in an authenticated prior inventory can be replaced.
 * Edited/unmanaged files stay in place; incoming versions and backups remain
 * in private state. Obsolete files stay in the vault. Retry rechecks every file,
 * and an independent complete index plus installer integration are required
 * before committing the release. */
export function createSkillsUpdateTransaction({vault,policy,profileStore,dataDir,knowledge,inspectPath,privateFilesystem,afterFile}={}){
 if(!vault?.withContentTransaction||!knowledge?.refresh)fail('skills_update_unavailable','Atualização do acervo não configurada.');
 return Object.freeze({async install(stage,{previous,ticket,signal,onProgress=()=>{},afterIndexVerified}={}){
  if(afterIndexVerified!==undefined&&typeof afterIndexVerified!=='function')fail('skills_update_unavailable','Verificação final da atualização indisponível.');
  assertSkillsStage(stage);assertSkillsRelease(previous);if(ticket?.capability!=='configure')fail('access_denied','Atualização exige autorização de configuração.');
  const admitted=stage.admitted;assertSkillsRelease(admitted);if(admitted.sequence<previous.sequence)fail('skills_rollback','A versão não pode regredir.');
  const old=new Map(previous.files.map(row=>[row.path,row])),selection=vault.status();let receipt;
  await vault.withContentTransaction(async grant=>{
   const check=()=>{grant.check();policy.assertAdmission(ticket);if(signal?.aborted)fail('operation_cancelled','Atualização cancelada.');};
   const current=async()=>{check();await grant.checkRoot();await policy.revalidateAdmission(ticket);check();};await current();await assertPrivatePath(dataDir,{privateFilesystem});
   const parent=join(dataDir,'skills-recovery');await fs.mkdir(parent,{recursive:true,mode:0o700});await assertPrivatePath(parent,{privateFilesystem});
   const recovery=await fs.mkdtemp(join(parent,'update-'));await assertPrivatePath(recovery,{privateFilesystem});
   receipt={schemaVersion:1,releaseID:admitted.releaseID,sequence:admitted.sequence,manifestSHA256:admitted.manifestSHA256,vault:grant.root,rootIdentity:grant.rootIdentity,complete:false,indexComplete:false,recoveryPath:recovery,created:0,replaced:0,unchanged:0,conflicts:[],obsoletePreserved:previous.files.filter(row=>!admitted.files.some(next=>next.path===row.path)).map(row=>row.path)};
   const checkpoint=()=>profileStore.update(value=>({...value,skillsUpdatePending:receipt}),{beforeCommit:check});await checkpoint();
   try{let number=0;for(const row of admitted.files){await current();const incoming=stage.read(row.path);verifySkillsFile(admitted,row.path,incoming);const target=await targetPath(grant.root,row.path,{check,inspectPath});let existing;
     try{existing=await readStable(target,32000000,inspectPath);}catch(error){if(error.code!=='ENOENT')throw error;}
     if(existing&&skillsSHA(existing.bytes)===row.sha256){receipt.unchanged++;}
     else if(existing&&(!old.has(row.path)||skillsSHA(existing.bytes)!==old.get(row.path).sha256)){
      const conflict=join(recovery,skillsSHA(Buffer.from(row.path))+'.incoming');check();await fs.writeFile(conflict,incoming,{mode:0o600,flag:'wx'});receipt.conflicts.push({path:row.path,incoming:conflict});
     }else{
      if(existing){const backup=join(recovery,skillsSHA(Buffer.from(row.path))+'.previous');check();await fs.writeFile(backup,existing.bytes,{mode:0o600,flag:'wx'});}
      const temporary=join(dirname(target),'.oracle-update-'+randomUUID()+'.tmp');
      try{check();const fd=await fs.open(temporary,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);try{await fd.writeFile(incoming);await fd.sync();}finally{await fd.close();}
       await current();await targetPath(grant.root,row.path,{check,inspectPath});
       if(existing){const observed=await readStable(target,32000000,inspectPath);if(observed.identity!==existing.identity||skillsSHA(observed.bytes)!==skillsSHA(existing.bytes))fail('skills_concurrent_change','Uma edição concorrente foi preservada. Tente novamente.');check();await fs.rename(temporary,target);receipt.replaced++;}
       else{check();await fs.copyFile(temporary,target,constants.COPYFILE_EXCL);receipt.created++;}
       const readback=await readStable(target,row.size,inspectPath);verifySkillsFile(admitted,row.path,readback.bytes);await current();
      }finally{await fs.unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
     }
     number++;onProgress({phase:'installing',done:number,total:admitted.files.length,conflicts:receipt.conflicts.length});if(number%32===0)await checkpoint();if(afterFile)await afterFile({path:row.path,receipt});
    }
    await current();await checkpoint();
   }catch(error){try{check();receipt.interrupted=true;await checkpoint();}catch{}throw error;}
  },{signal});
  // Release the canonical writer before the indexer's independent enumeration.
  const check=()=>{policy.assertAdmission(ticket);if(signal?.aborted)fail('operation_cancelled','Atualização cancelada.');const active=vault.status();if(!active.selected||active.root!==receipt.vault||active.generation!==selection.generation)fail('skills_vault_changed','A pasta selecionada mudou.');};
  check();onProgress({phase:'indexing'});
  const index=await knowledge.refresh({signal});check();
  if(index?.complete!==true)fail('skills_index_partial','Os arquivos foram atualizados, mas o índice está parcial. Retome para concluir.');
  receipt.indexComplete=true;
  await profileStore.update(value=>({...value,skillsUpdatePending:receipt}),{beforeCommit:check});check();
  if(afterIndexVerified){onProgress({phase:'registering'});await afterIndexVerified(receipt);check();}
  const completed={...receipt,complete:true};
  await profileStore.update(value=>({...value,skillsInstallation:completed,skillsUpdatePending:null}),{beforeCommit:check});
  receipt=completed;
  return Object.freeze(receipt);
 }});
}
