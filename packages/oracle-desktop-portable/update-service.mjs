import {createSkillsReleaseSource} from './skills-release-source.mjs';
import {createSkillsUpdateTransaction} from './skills-update-transaction.mjs';
import {createPluginUpdateChannel} from './plugin-update-channel.mjs';
import {assertCompleteCodexUserSkillsRegistration} from './codex-user-skills-registration.mjs';
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const requestID=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{7,79}$/.test(value);
/** One detached, deduplicated update at a time. A lost UI acknowledgement does
 * not resend installation; every poll is scoped to the original request ID. */
export function createPortableUpdateService(options){
 const {policy,vault,profileStore,assertInstallerIdle=()=>{},beforeSkillsInstall=()=>{},afterSkillsInstall=async()=>({})}=options;
 const source=options.skillsSource||createSkillsReleaseSource(options),transaction=options.skillsTransaction||createSkillsUpdateTransaction(options),plugin=options.pluginChannel||createPluginUpdateChannel(options);
 let latestSkills=null,current=null,closed=false;const records=new Map();
 const snapshot=()=>current?structuredClone(current.status):{running:false,phase:'idle',skills:null,oracle:null};
 // Feed checks never write the vault or replace executable files. They may
 // run while an existing installation is being verified on conversation boot.
 const assertIdle=()=>{if(current?.status.running&&current.status.operation!=='check')fail('update_busy','A atualização já está em andamento.');};
 const knownStatus=id=>{if(id!==undefined&&!requestID(id))fail('invalid_update_request','Pedido inválido.');return id?(records.has(id)?structuredClone(records.get(id).status):{running:false,phase:'unknown',requestID:id}):snapshot();};
 function start(params,context){
  if(Object.keys(params).some(key=>!['requestID','operation'].includes(key))||!requestID(params.requestID)||!['check','skills','oracle'].includes(params.operation))fail('invalid_update_request','Pedido de atualização inválido.');
  const prior=records.get(params.requestID);if(prior){if(prior.status.operation!==params.operation)fail('update_request_conflict','O mesmo pedido não pode mudar de ação.');return knownStatus(params.requestID);}
  if(closed)fail('update_closed','O serviço foi encerrado.');if(context.signal?.aborted)fail('operation_cancelled','Atualização cancelada.');policy.assertAdmission(context.ticket);
  if(current?.status.running)fail('update_busy','A consulta ou atualização já está em andamento.');
  if(params.operation!=='check')assertInstallerIdle();
  if(params.operation!=='check'&&context.ticket.capability!=='configure')fail('access_denied','Instalação exige autorização de configuração.');
  const selected=vault.status(),controller=new AbortController(),record={controller,status:{...snapshot(),requestID:params.requestID,operation:params.operation,running:true,phase:params.operation==='check'?'checking':'preparing',error:null,receipt:null}};
  records.set(params.requestID,record);while(records.size>8)records.delete(records.keys().next().value);current=record;
  const check=()=>{policy.assertAdmission(context.ticket);if(controller.signal.aborted)fail('operation_cancelled','Atualização pausada.');if(params.operation==='skills'){const active=vault.status();if(!active.selected||active.root!==selected.root||active.generation!==selected.generation)fail('skills_vault_changed','A pasta selecionada mudou.');}};
  const scope={ticket:context.ticket,signal:controller.signal};
  record.task=Promise.resolve().then(async()=>{check();await policy.revalidateAdmission(context.ticket);check();
   if(params.operation==='check'){
    const results=await Promise.allSettled([source.check(scope),plugin.check(scope)]);check();
    if(results[0].status==='fulfilled'){latestSkills=results[0].value;const installed=await source.installed();check();record.status.skills={currentReleaseID:installed.releaseID,latestReleaseID:latestSkills.releaseID,available:latestSkills.sequence>installed.sequence,signatureVerified:true};}
    else record.status.skills={available:false,error:results[0].reason.message};
    if(results[1].status==='fulfilled')record.status.oracle=results[1].value;else record.status.oracle={available:false,error:results[1].reason.message};
    record.status.phase='checked';return;
   }
   if(params.operation==='oracle'){record.status.receipt=await plugin.apply(scope);check();record.status.phase=record.status.receipt.installed?'restart-required':record.status.receipt.registrationRequired?'registration-required':'complete';return;}
   if(!selected.selected)fail('vault_required','Escolha a pasta do Obsidian antes de atualizar o acervo.');if(!latestSkills)fail('skills_check_required','Consulte a atualização de skills primeiro.');
   const previous=await source.installed();check();record.status.phase='downloading';const stage=await source.download(latestSkills,scope);check();beforeSkillsInstall();check();
   const summarize=receipt=>({created:receipt.created,replaced:receipt.replaced,unchanged:receipt.unchanged,conflicts:receipt.conflicts.length,obsoletePreserved:receipt.obsoletePreserved.length,recoveryPath:receipt.recoveryPath,complete:receipt.complete,indexComplete:receipt.indexComplete});
   let integration;
   const receipt=await transaction.install(stage,{...scope,previous,onProgress:progress=>{check();record.status={...record.status,...progress};},afterIndexVerified:async receipt=>{
    check();record.status.receipt=summarize(receipt);
    integration=await afterSkillsInstall({...scope,admitted:stage.admitted,receipt,check});check();record.status.receipt.integration=integration;
    if(stage.admitted.items.length)assertCompleteCodexUserSkillsRegistration(stage.admitted,integration?.registration);
   }});check();record.status.receipt={...summarize(receipt),integration};
   record.status.skills={currentReleaseID:latestSkills.releaseID,latestReleaseID:latestSkills.releaseID,available:false,signatureVerified:true};record.status.phase='complete';
  }).catch(error=>{record.status.phase=controller.signal.aborted?'paused':'failed';record.status.error={code:String(error.code||'update_failed'),message:String(error.message||'Não foi possível atualizar.')};}).finally(()=>{record.status.running=false;});
  return knownStatus(params.requestID);
 }
 return Object.freeze({start,status:knownStatus,snapshot,assertIdle,
  cancel(id){if(!requestID(id)||!records.has(id))fail('invalid_update_request','Atualização desconhecida.');const record=records.get(id);record.controller.abort();return knownStatus(id);},
  revoke(){current?.controller.abort();latestSkills=null;},async close(){closed=true;current?.controller.abort();await current?.task;},async settled(){await current?.task;return snapshot();}
 });
}
