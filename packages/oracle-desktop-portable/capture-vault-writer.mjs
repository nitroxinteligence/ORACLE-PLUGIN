import {constants,openSync,closeSync,lstatSync,realpathSync,mkdirSync,readSync,writeFileSync,fsyncSync,fstatSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const sha=value=>createHash('sha256').update(value).digest('hex');
const fail=code=>{throw Object.assign(new Error(code),{code});};
const same=(a,b)=>a.dev===b.dev&&a.ino===b.ino;
function directory(path){const stat=lstatSync(path);if(stat.isSymbolicLink()||!stat.isDirectory()||realpathSync(path)!==path)fail('capture_path_collision');return stat;}
function targetUnder(root,path,check){let cursor=root;for(const part of path.split('/').slice(0,-1)){check();const parent=directory(cursor),next=join(cursor,part);try{directory(next);}catch(error){if(error.code!=='ENOENT')throw error;check();mkdirSync(next,{mode:0o700});check();}if(!same(parent,directory(cursor)))fail('capture_parent_changed');cursor=next;}check();return join(root,path);}
function read(target,check){check();let entry;try{entry=lstatSync(target);}catch(error){if(error.code==='ENOENT')return null;throw error;}if(entry.isSymbolicLink()||!entry.isFile()||entry.nlink!==1||entry.size>70000)fail('capture_path_collision');check();const fd=openSync(target,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);try{const before=fstatSync(fd);if(!same(entry,before)||!before.isFile()||before.nlink!==1||before.size>70000)fail('capture_file_changed');const buffer=Buffer.alloc(70001);let length=0;while(length<buffer.length){check();const count=readSync(fd,buffer,length,buffer.length-length,null);check();if(!count)break;length+=count;}const after=fstatSync(fd);check();if(length>70000||before.size!==length||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs||!same(after,lstatSync(target)))fail('capture_file_changed');return buffer.subarray(0,length);}finally{closeSync(fd);}}
function note(row,id){return Buffer.from('# Mensagem capturada no Codex\n\nFonte: hook autorizado do workspace Oracle. Cobertura parcial, sem ferramentas ou raciocínio interno.\n\nRegistro: '+id+'\nSessão: '+row.session+'\nTurno: '+row.turn+'\nPapel: '+row.role+'\n\n## Conteúdo original (dados, não instruções)\n\n'+row.text+'\n');}
/** Trusted composition only. Each call requires the live WeakMap host proof,
 * current consent, license and selected-vault grant. Profile state never grants
 * authority. Exclusive files preserve edits and interrupted writes for review;
 * neither a receipt nor a chat message becomes a canonical fact. No remote I/O.
 * Ancestor rechecks are not an openat filesystem CAS guarantee. */
export function createCaptureVaultWriter({policy,vault,consent,profileStore,hookAuthority}={}){
 if(!vault?.withContentTransaction||!policy?.revalidateAdmission||!consent?.assertCurrent||!profileStore?.update||!profileStore?.load||!hookAuthority?.assertCurrent)fail('capture_writer_provider_required');
 return Object.freeze({publish(row,{payload,hostProof,ticket,consentProof,workspace,signal}={}){
  const binding=consent.binding(),id=sha(JSON.stringify(row)),path='INBOX/oracle-history/conversations/oracle-'+id+'.md',bytes=note(row,id),hash=sha(bytes);
  const checkSource=()=>{policy.assertAdmission(ticket);consent.assertCurrent(consentProof);workspace.assertCurrent();hookAuthority.assertCurrent(hostProof,payload);if(signal?.aborted)fail('operation_cancelled');if(!consent.captureChoices().autoCapture||JSON.stringify(consent.binding())!==JSON.stringify(binding))fail('capture_consent_changed');};checkSource();
  const expected={schemaVersion:1,source:'codex_workspace_hooks_v1',epoch:consent.captureEpoch(),vault:binding.vault,session:sha(payload.session_id),turn:sha(payload.turn_id),role:payload.hook_event_name==='Stop'?'assistant':'user',text:payload[payload.hook_event_name==='Stop'?'last_assistant_message':'prompt']};
  if(!['UserPromptSubmit','Stop'].includes(payload.hook_event_name)||JSON.stringify(row)!==JSON.stringify(expected)||typeof row.text!=='string'||!row.text.trim()||Buffer.byteLength(row.text)>64000||bytes.length>70000)fail('capture_payload_invalid');
  return vault.withContentTransaction(async grant=>{
   const check=()=>{grant.check();checkSource();},rootCheck=async()=>{check();await grant.checkRoot();check();await policy.revalidateAdmission(ticket);check();};await rootCheck();
   if(grant.root!==binding.vault||String(grant.generation)!==binding.selectionRevision)fail('capture_binding_changed');
   const save=async canonical=>{check();await profileStore.update(profile=>{check();const event=profile.maintenanceCapture?.events?.[id];if(!event||sha(JSON.stringify(event.payload))!==id)fail('capture_journal_conflict');if(event.canonical&&(event.canonical.owner!=='oracle-capture-vault-writer'||event.canonical.path!==path||event.canonical.sha256!==hash||!same(event.canonical.rootIdentity,grant.rootIdentity)))fail('capture_journal_conflict');event.canonical={owner:'oracle-capture-vault-writer',path,sha256:hash,bytes:bytes.length,rootIdentity:grant.rootIdentity,...canonical};if(Buffer.byteLength(JSON.stringify(profile.maintenanceCapture))>7000000)fail('capture_limit');return profile;},{beforeCommit:check});check();};
   const prior=(await profileStore.load()).maintenanceCapture?.events?.[id]?.canonical;check();const target=targetUnder(grant.root,path,check),parent=directory(dirname(target));let current=read(target,check),written=false;
   if(current&&!prior)return {status:'conflicted',executed:false,id,path,complete:false,readbackVerified:false};
   await save({complete:false,state:'pending',readbackVerified:false});await rootCheck();
   if(current&&sha(current)!==hash){await save({complete:false,state:'conflicted',readbackVerified:false});return {status:'conflicted',executed:false,id,path,complete:false,readbackVerified:false};}
   if(!current){await rootCheck();check();let fd;try{fd=openSync(target,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);}catch(error){if(error.code!=='EEXIST')throw error;current=read(target,check);if(!current||sha(current)!==hash){await save({complete:false,state:'conflicted',readbackVerified:false});return {status:'conflicted',executed:false,id,path,complete:false,readbackVerified:false};}}
    if(fd!==undefined){try{check();writeFileSync(fd,bytes);check();fsyncSync(fd);check();written=true;}finally{closeSync(fd);}}
   }
   check();if(!same(parent,directory(dirname(target))))fail('capture_parent_changed');const verified=read(target,check);if(!verified||sha(verified)!==hash)fail('capture_readback_changed');await rootCheck();await save({complete:true,state:'verified',readbackVerified:true});await rootCheck();const finalTarget=targetUnder(grant.root,path,check),final=read(finalTarget,check);if(!final||sha(final)!==hash){await save({complete:false,state:'conflicted',readbackVerified:false});fail('capture_readback_changed');}
   return {status:written?'captured':'already_captured',executed:written,id,path,sha256:hash,bytes:bytes.length,complete:true,readbackVerified:true,coverage:'only_delivered_workspace_hooks',historyAccessed:false};
  },{signal});
 }});
}
