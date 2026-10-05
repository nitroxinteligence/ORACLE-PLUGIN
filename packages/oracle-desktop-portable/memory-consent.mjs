import {randomUUID} from 'node:crypto';
import {MAINTENANCE_MODEL_POLICY} from './maintenance-policy.mjs';
import {assertAdmittedContentManifest} from './content-admission.mjs';
import {getAIMemorySnapshotContext} from './ai-memory-snapshot.mjs';
import {assertAIMemoryMirrorReceipt} from './ai-memory-vault-mirror.mjs';
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);

/** Original Install acknowledgment only. Writable journals describe choices,
 * but never restore admission. Both the pending human action and signed release
 * are private brands, scoped to the real license and selected-vault generation. */
export function createMemoryConsentAuthority({policy,vault,profileStore,now=Date.now}={}){
 if(!policy?.revalidateAdmission||!vault?.status||!profileStore?.update)fail('memory_consent_unavailable','A autorização de memória não está disponível.');
 const pending=new WeakMap(),proofs=new WeakMap();let epoch=0,current=null,migration=null;
 function check(record){policy.assertAdmission(record.ticket);const selected=vault.status();if(record.epoch!==epoch||!selected.selected||selected.root!==record.root||selected.generation!==record.vaultGeneration)fail('ai_memory_consent_changed','A autorização ou a pasta das memórias mudou.');if(record.admitted)assertAdmittedContentManifest(record.admitted);}
 const revoke=()=>{epoch++;current=null;migration=null;};
 function assertCurrent(proof){const record=proofs.get(proof);if(!record||current!==proof)fail('ai_memory_portability_consent_required','Clique Instalar para autorizar as memórias no vault atual.');check(record);return record;}
 return Object.freeze({
  async beginInstallation({ticket,acknowledgment,maintenance={},signal}={}){
   policy.assertAdmission(ticket);if(ticket.capability!=='configure')fail('access_denied','A instalação exige acesso de configuração.');const selected=vault.status();
   if(!selected.selected||!object(acknowledgment)||Object.keys(acknowledgment).some(key=>!['schemaVersion','acknowledgment','vaultSelectionRevision'].includes(key))||acknowledgment.schemaVersion!==1||acknowledgment.acknowledgment!=='oracle_local_memory_portability_v1'||acknowledgment.vaultSelectionRevision!==String(selected.generation))fail('ai_memory_portability_consent_required','Confira o destino local das memórias e clique Instalar para autorizar o vault atual.');
   revoke();const record={ticket,epoch,root:selected.root,vaultGeneration:selected.generation,createdAt:now(),captureEpoch:randomUUID(),planHash:null,choices:Object.freeze({...MAINTENANCE_MODEL_POLICY,installOfficialHooks:maintenance.installOfficialHooks===true,enabled:maintenance.enabled===true,autoCapture:maintenance.enabled===true&&maintenance.autoCapture===true&&maintenance.captureSource==='codex_workspace_hooks_v1',remoteProcessing:maintenance.enabled===true&&maintenance.autoCapture===true&&maintenance.remoteProcessing===true&&maintenance.synthesisScope==='captured_messages_codex_v1'})};
   const guard=()=>{check(record);if(signal?.aborted)fail('operation_cancelled','Operação cancelada.');};guard();await policy.revalidateAdmission(ticket);guard();
   await profileStore.update(profile=>({...profile,memoryConsentChoices:{schemaVersion:1,vaultSelectionRevision:String(selected.generation),acknowledgment:'oracle_local_memory_portability_v1',requested:record.choices,at:new Date(now()).toISOString(),authorityRestored:false}}),{beforeCommit:guard});guard();const request=Object.freeze({});pending.set(request,record);return request;
  },
  async admitInstallation(request,admitted,{ticket,signal}={}){
   const record=pending.get(request);if(!record||now()-record.createdAt>900000)fail('memory_install_action_required','Clique Instalar para confirmar este plano e destino.');check(record);policy.assertAdmission(ticket);if(ticket.capability!=='configure'||ticket.generation!==record.ticket.generation)fail('ai_memory_consent_changed','O acesso à instalação mudou.');assertAdmittedContentManifest(admitted);if(record.planHash&&record.planHash!==admitted.manifestSHA256)fail('memory_install_plan_changed','O plano mudou. Clique Instalar para confirmar a versão atual.');
   await policy.revalidateAdmission(ticket);check(record);if(signal?.aborted)fail('operation_cancelled','Operação cancelada.');
   if(current){const prior=assertCurrent(current);if(prior.planHash===admitted.manifestSHA256)return current;}
   const granted={...record,admitted,planHash:admitted.manifestSHA256};const proof=Object.freeze({});proofs.set(proof,granted);current=proof;record.planHash=granted.planHash;return proof;
  },
  assertCurrent,
  async requireCurrent({ticket,selection,signal}={}){if(!current)fail('ai_memory_portability_consent_required','Autorize as memórias no vault escolhido ao instalar.');const proof=current,record=assertCurrent(proof);if(ticket){policy.assertAdmission(ticket);await policy.revalidateAdmission(ticket);}assertCurrent(proof);if(signal?.aborted||selection&&(selection.root!==record.root||selection.generation!==record.vaultGeneration))fail('ai_memory_consent_changed','A autorização das memórias mudou.');return proof;},
  binding(){const record=assertCurrent(current);return Object.freeze({vault:record.root,selectionRevision:String(record.vaultGeneration),planHash:record.planHash,consentGeneration:record.epoch,setupAuthorized:true});},
  attachMigrationProvider({snapshotReader,mirror,currentBinding}){if(!snapshotReader?.read||!mirror?.publish||typeof currentBinding!=='function')fail('ai_memory_migration_required','A verificação de portabilidade não está disponível.');migration={snapshotReader,mirror,currentBinding};},
  async requireMigrationReady({ticket,signal}={}){
   const proof=await this.requireCurrent({ticket,signal}),record=assertCurrent(proof),provider=migration;if(!provider)fail('ai_memory_migration_required','Prepare as memórias locais antes de gravar.');const binding=provider.currentBinding();if(binding.vault!==record.root||binding.selectionRevision!==String(record.vaultGeneration)||binding.planHash!==record.planHash)fail('ai_memory_consent_changed','A preparação pertence a outro plano ou vault.');
   const snapshot=await provider.snapshotReader.read({ticket,signal});const context=getAIMemorySnapshotContext(snapshot);context.check();assertCurrent(proof);if(context.context.binding.vault!==record.root||context.context.binding.selectionRevision!==String(record.vaultGeneration)||context.context.binding.planHash!==record.planHash)fail('ai_memory_consent_changed','O snapshot pertence a outro plano ou vault.');if(snapshot.sourceSnapshotComplete!==true)fail('ai_memory_migration_required','A leitura da memória ainda não está completa.');
   // An empty, fully scanned OWNED project has nothing historical to migrate.
   // This admits its first explicit page without claiming an existing Markdown.
   if(snapshot.records.length===0)return Object.freeze({migrationReady:true,emptyOwnedProject:true,scope:snapshot.scope});
   const receipt=await provider.mirror.publish(snapshot,{ticket,signal});assertAIMemoryMirrorReceipt(receipt,{snapshot});assertCurrent(proof);if(receipt.complete!==true)fail('ai_memory_migration_required','Há memórias locais pendentes ou arquivos editados. Resolva os conflitos antes de gravar.');return receipt;
  },
  captureEpoch(){return assertCurrent(current).captureEpoch;},
  captureChoices(){const record=assertCurrent(current);return record.choices;},
  snapshot(){try{const record=assertCurrent(current);return {portabilityAuthorized:true,planHash:record.planHash,vaultSelectionRevision:String(record.vaultGeneration),captureRequested:record.choices.autoCapture,remoteRequested:record.choices.remoteProcessing,captureReady:false,hooksTrusted:false};}catch{return {portabilityAuthorized:false,captureRequested:false,remoteRequested:false,captureReady:false,hooksTrusted:false};}},revoke,
 });
}
