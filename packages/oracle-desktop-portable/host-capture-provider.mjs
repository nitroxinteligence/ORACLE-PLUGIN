import {createCaptureVaultWriter} from './capture-vault-writer.mjs';
import {createHash} from 'node:crypto';
import {realpathSync} from 'node:fs';
import {sep} from 'node:path';
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const sha=value=>createHash('sha256').update(value).digest('hex');
/** Host-specific verifier must authenticate current approved hook invocation,
 * eventID, workspace and payload digest. JSON input alone is never evidence.
 * No default verifier: preparing a hooks file is not trusting/executing it. */
export function createHostHookAuthority({verifyEvent}={}){
 const proofs=new WeakMap();let epoch=0;
 return Object.freeze({
  async admit(payload,evidence,{workspace,signal}={}){
   if(typeof verifyEvent!=='function')fail('capture_host_evidence_unavailable','Este host ainda não fornece evidência de execução do hook autorizado.');
   const digest=sha(JSON.stringify(payload)),expected=epoch;
   const verified=await verifyEvent({evidence,payloadDigest:digest,workspace,signal});
   if(signal?.aborted||expected!==epoch||verified?.approvedHook!==true||verified.workspace!==workspace||verified.payloadDigest!==digest||typeof verified.eventID!=='string'||!verified.eventID||verified.eventID.length>256||typeof verified.assertCurrent!=='function')fail('capture_host_evidence_invalid','A origem desta captura não foi verificada.');
   verified.assertCurrent();const proof=Object.freeze({});proofs.set(proof,{digest,verified,epoch});return proof;
  },
  assertCurrent(proof,payload){const record=proofs.get(proof);if(!record||record.epoch!==epoch||record.digest!==sha(JSON.stringify(payload)))fail('capture_host_evidence_invalid','A origem da captura mudou.');record.verified.assertCurrent();return record.verified.eventID;},revoke(){epoch++;},
 });
}
/** Journals only documented UserPromptSubmit/Stop messages from current trusted
 * workspace, with original capture opt-in. Never opens transcript_path, emits
 * canonical facts, performs inference or installs/trusts hooks. */
export function createHostCaptureProvider({policy,vault,consent,profileStore,hookAuthority,workspaceProvider}={}){
 const writer=createCaptureVaultWriter({policy,vault,consent,profileStore,hookAuthority});
 return Object.freeze({async capture(payload,evidence,{signal}={}){
  if(!['UserPromptSubmit','Stop'].includes(payload?.hook_event_name))return {status:'not_supported',executed:false};
  const ticket=policy.requireCapability('configure'),proof=await consent.requireCurrent({ticket,signal});
  if(!consent.captureChoices().autoCapture)return {status:'not_consented',executed:false};
  if(typeof workspaceProvider!=='function'||!hookAuthority)fail('capture_host_evidence_unavailable','A captura exige o workspace e o hook confiados no host.');
  const workspace=await workspaceProvider({ticket,signal});
  if(typeof workspace?.path!=='string'||typeof workspace.assertCurrent!=='function'||realpathSync(workspace.path)!==workspace.path||typeof payload.cwd!=='string'||realpathSync(payload.cwd)!==payload.cwd||payload.cwd!==workspace.path&&!payload.cwd.startsWith(workspace.path+sep))fail('capture_workspace_invalid','Hook fora do workspace Oracle autorizado.');
  const text=payload[payload.hook_event_name==='Stop'?'last_assistant_message':'prompt'];
  if(!['session_id','turn_id'].every(key=>typeof payload[key]==='string'&&payload[key].length&&Buffer.byteLength(payload[key])<=256)||typeof text!=='string'||!text.trim()||Buffer.byteLength(text)>64000)fail('capture_payload_invalid','A captura exige mensagem e identificadores válidos, até 64 KB.');
  const hostProof=await hookAuthority.admit(payload,evidence,{workspace:workspace.path,signal}),binding=consent.binding();
  const guard=()=>{policy.assertAdmission(ticket);consent.assertCurrent(proof);workspace.assertCurrent();hookAuthority.assertCurrent(hostProof,payload);if(signal?.aborted)fail('operation_cancelled','Captura cancelada.');};guard();
  const normalized=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),turn=sha(JSON.stringify([consent.captureEpoch(),payload.session_id,payload.turn_id]));
  const excluded=payload.hook_event_name==='UserPromptSubmit'&&/(?:nao|nunca)\s+(?:guarde|salve|memorize|registre|retenha)|nao anote|do not (?:remember|save|retain)|off.the.record/.test(normalized)||/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}|\bgh[pousr]_[A-Za-z0-9]{25,}/.test(text);
  const row={schemaVersion:1,source:'codex_workspace_hooks_v1',epoch:consent.captureEpoch(),vault:binding.vault,session:sha(payload.session_id),turn:sha(payload.turn_id),role:payload.hook_event_name==='Stop'?'assistant':'user',text},id=sha(JSON.stringify(row));let result;
  await policy.revalidateAdmission(ticket);guard();await profileStore.update(profile=>{
   guard();const journal=profile.maintenanceCapture??={schemaVersion:1,events:{},excludedTurns:{}};
   if(excluded||journal.excludedTurns[turn]){if(!journal.excludedTurns[turn]&&Object.keys(journal.excludedTurns).length>=5000)fail('capture_limit','Limite de exclusões atingido.');journal.excludedTurns[turn]=true;result={status:'excluded',executed:false};}
   else if(journal.events[id]){if(sha(JSON.stringify(journal.events[id].payload))!==id)fail('capture_conflict','Registro alterado; original preservado.');result={status:'already_captured',executed:false,id};}
   else{if(Object.keys(journal.events).length>=5000)fail('capture_limit','Limite de 5 mil capturas atingido.');journal.events[id]={payload:row,hostEventID:hookAuthority.assertCurrent(hostProof,payload),receivedAt:new Date().toISOString()};if(Buffer.byteLength(JSON.stringify(journal))>7000000)fail('capture_limit','Limite local de captura atingido.');result={status:'captured',executed:true,id};}return profile;
  },{beforeCommit:guard});guard();if(result.status==='excluded')return result;return writer.publish(row,{payload,hostProof,ticket,consentProof:proof,workspace,signal});
 },revoke(){hookAuthority?.revoke();}});
}
