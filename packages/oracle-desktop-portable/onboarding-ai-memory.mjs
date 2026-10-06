import {getAIMemoryRuntimeContext} from './ai-memory-runtime.mjs';
import * as serviceReceipts from './ai-memory-service.mjs';
import {assertAIMemoryMirrorReceipt} from './ai-memory-vault-mirror.mjs';
import {AI_MEMORY_PINS} from './ai-memory-pins.mjs';
import {verifyAIMemoryInstallation,assertAIMemoryInstallationReceipt} from './ai-memory-installation-verifier.mjs';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const receipts=new WeakMap();
export function assertOnboardingAIMemoryReceipt(receipt){const state=receipts.get(receipt);if(!state)fail('ai_memory_phase_unverified');state.check();return receipt;}

/** Trusted, lazy composition only. createBackend admits a private owned runtime
 * and returns {runtime,service,port,snapshotReader?,mirror?,portabilityAuthorization?}.
 * Setup is authorized by the configure ticket; it never grants conversation,
 * portability, Codex, hook or scheduler consent. Journal fields are advisory.
 * Verifier injection is a synthetic-test seam, never a transport parameter. */
export function createOnboardingAIMemory({policy,vault,profileStore,createBackend,
 runtimeContextProvider=getAIMemoryRuntimeContext,
 serviceReceiptVerifier=(receipt,options)=>{if(typeof serviceReceipts.assertAIMemoryServiceReceipt!=='function')fail('ai_memory_service_receipt_unavailable');return serviceReceipts.assertAIMemoryServiceReceipt(receipt,options);},
 serviceReceiptCurrentVerifier=(receipt,options)=>{if(typeof serviceReceipts.assertAIMemoryServiceReceiptCurrent!=='function')fail('ai_memory_service_receipt_unavailable');return serviceReceipts.assertAIMemoryServiceReceiptCurrent(receipt,options);},
 mirrorReceiptVerifier=assertAIMemoryMirrorReceipt}={}){
 if(!policy||!vault||!profileStore||typeof createBackend!=='function')fail('ai_memory_phase_unavailable');
 let epoch=0,busy=false,controller=null,backend=null,proof=null,installation=null,phase='pending';
 const cancel=()=>{epoch++;controller?.abort();backend?.service?.cancel();proof=null;installation=null;phase='cancelled';};
 const status=()=>{try{if(proof)assertOnboardingAIMemoryReceipt(proof);}catch{proof=null;phase='pending';}try{if(installation)assertAIMemoryInstallationReceipt(installation);}catch{installation=null;}return Object.freeze({phase,verified:!!proof,receipt:proof,installationVerified:!!installation,installationReceipt:installation,portability:proof?.portability??'pending',running:busy,completed:false,captureEnabled:false,hooksTrusted:false,codexConnected:false});};
 return Object.freeze({status,cancel,async close(){cancel();await backend?.service?.close?.();},
  async verifyInstallation({ticket,planHash,signal}={}){
   if(busy)fail('ai_memory_busy');if(!/^[a-f0-9]{64}$/.test(planHash??''))fail('ai_memory_binding_invalid');
   const selected=vault.status(),expected=epoch,local=new AbortController(),abort=()=>local.abort();if(!selected.selected)fail('vault_required');signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();controller=local;busy=true;installation=null;
   const check=()=>{policy.assertAdmission(ticket);const current=vault.status();if(ticket.capability!=='configure'||expected!==epoch||local.signal.aborted||!current.selected||current.root!==selected.root||current.generation!==selected.generation)fail('ai_memory_binding_changed');};
   try{check();await policy.revalidateAdmission(ticket);check();
    backend=await createBackend({ticket,binding:Object.freeze({vault:selected.root,selectionRevision:String(selected.generation),planHash,setupAuthorized:true}),signal:local.signal,restoreOnly:true});check();
    const context=runtimeContextProvider(backend.runtime);context.assertCurrent(ticket);if(context.binding.planHash!==planHash)fail('ai_memory_binding_invalid');
    installation=await verifyAIMemoryInstallation({backend,ticket,signal:local.signal,check});check();phase='installed';return assertAIMemoryInstallationReceipt(installation);
   }finally{busy=false;if(controller===local)controller=null;signal?.removeEventListener('abort',abort);}
  },
  async prepare({ticket,planHash,signal}={}){
   if(busy)fail('ai_memory_busy');if(!/^[a-f0-9]{64}$/.test(planHash??''))fail('ai_memory_binding_invalid');
   const selected=vault.status();if(!selected.selected)fail('vault_required');
   const expected=epoch,local=new AbortController(),abort=()=>local.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();controller=local;busy=true;proof=null;
   let context,consent;
   const check=()=>{policy.assertAdmission(ticket);const current=vault.status();if(ticket?.capability!=='configure'||expected!==epoch||local.signal.aborted||!current.selected||current.root!==selected.root||current.generation!==selected.generation)fail('ai_memory_binding_changed');context?.assertCurrent(ticket);if(consent)backend.portabilityAuthorization.assertCurrent(consent);};
   const save=async()=>{check();await profileStore.update(profile=>({...profile,onboardingAIMemory:{schemaVersion:1,phase,planHash,verified:!!proof,portability:proof?.portability??'pending',completed:false}}),{beforeCommit:check});check();};
   const stopped=()=>backend?.service?.cancel();local.signal.addEventListener('abort',stopped,{once:true});
   const monitor=setInterval(()=>{try{check();}catch{local.abort();}},50);monitor.unref?.();
   try{
    check();await policy.revalidateAdmission(ticket);check();phase='admitting';await save();
    // Every resume obtains fresh admission. Persisted booleans are never used.
    await backend?.service?.close?.();check();
    backend=await createBackend({ticket,binding:Object.freeze({vault:selected.root,selectionRevision:String(selected.generation),planHash,setupAuthorized:true}),signal:local.signal});check();
    context=runtimeContextProvider(backend?.runtime);check();
    const binding=context.binding;
    if(binding.vault!==selected.root||binding.selectionRevision!==String(selected.generation)||binding.planHash!==planHash||binding.setupAuthorized!==true||!Number.isSafeInteger(binding.consentGeneration)||binding.consentGeneration<0||backend.runtime.version!==AI_MEMORY_PINS.version||backend.runtime.binarySHA256!==AI_MEMORY_PINS.binarySHA256||backend.runtime.versionExecutionVerified!==true)fail('ai_memory_binding_invalid');
    phase='preparing';await save();
    const service=await backend.service.prepare({ticket,port:backend.port,signal:local.signal});check();await serviceReceiptVerifier(service,{service:backend.service});check();
    if(service.localProtocolVerified!==true||service.httpProtocolVerified!==true||service.identityVerified!==true||service.healthVerified!==true||service.serviceAvailable!==true||service.serverVersion!==AI_MEMORY_PINS.version||service.workspace!==context.workspace||service.project!==context.project)fail('ai_memory_readiness_unverified');
    let portability='pending',mirror=null,portableSnapshot=null;
    if(backend.portabilityAuthorization){
     // Absence of explicit current consent keeps portability pending. Revoked
     // or stale consent still aborts an already authorized operation.
     try{consent=await backend.portabilityAuthorization.requireCurrent({ticket,selection:selected,signal:local.signal});}catch(error){check();if(!['ai_memory_portability_consent_required','ai_memory_consent_required'].includes(error.code))throw error;}
     check();
     if(consent){if(!backend.snapshotReader||!backend.mirror)fail('ai_memory_mirror_unavailable');phase='mirroring';await save();const snapshot=await backend.snapshotReader.read({ticket,signal:local.signal});portableSnapshot=snapshot;check();mirror=await backend.mirror.publish(snapshot,{ticket,signal:local.signal});check();mirrorReceiptVerifier(mirror,{snapshot});check();portability=mirror.complete===true?'verified':'pending';}
    }
    await backend.service.assertReady();check();await policy.revalidateAdmission(ticket);check();
    const receipt=Object.freeze({version:AI_MEMORY_PINS.version,binarySHA256:AI_MEMORY_PINS.binarySHA256,versionExecutionVerified:true,localProtocolVerified:true,httpProtocolVerified:true,identityVerified:true,healthVerified:true,serviceAvailable:true,workspace:context.workspace,project:context.project,portability,mirror,captureEnabled:false,hooksTrusted:false,codexConnected:false,completed:false});
    receipts.set(receipt,{check:()=>{check();serviceReceiptCurrentVerifier(service,{service:backend.service});if(portability==='verified')mirrorReceiptVerifier(mirror,{snapshot:portableSnapshot});}});proof=receipt;phase='verified';await save();assertOnboardingAIMemoryReceipt(receipt);return receipt;
   }catch(error){proof=null;phase=local.signal.aborted?'cancelled':'interrupted';backend?.service?.cancel();try{check();await save();}catch{}throw error;
   }finally{clearInterval(monitor);local.signal.removeEventListener('abort',stopped);signal?.removeEventListener('abort',abort);if(controller===local)controller=null;busy=false;}
  }
 });
}
