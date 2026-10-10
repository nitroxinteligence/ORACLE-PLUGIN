import {assertOnboardingAIMemoryReceipt} from './onboarding-ai-memory.mjs';
import {runIndexCheckpoints} from './index-checkpoint-runner.mjs';
import {createContentInstallationPlan} from './content-installation-plan.mjs';
import {createVaultContentTransaction} from './vault-content-transaction.mjs';
import {verifyGBrainMethodInstallation,assertVerifiedGBrainMethod} from './method-installation-verifier.mjs';
import {assertAIMemoryInstallationReceipt} from './ai-memory-installation-verifier.mjs';
const fail=code=>{throw Object.assign(new Error(code),{code});};
// Resolve the public phase against current proof, independently of journal text.
export const onboardingCoordinatorPhaseStatus=(phase,aiMemoryVerified)=>phase==='ai_memory_verified'&&!aiMemoryVerified?'ai_memory_pending':phase;
const requiredDefaults=Object.freeze({aiMemory:true,codex:true,integrationReceipts:true,hooks:true,capture:true,maintenance:true});

/** Local content and mandatory AI Memory runtime phases only. sourceProvider is trusted release composition and
 * must return a newly signature-admitted {admitted,payloadRoot}; no UI roots/URLs.
 * Persisted progress is resumable context, never grants, method proof or readiness.
 * AI Memory uses only live branded phase receipts; Codex and other consent
 * integrations remain explicit pending gates. No whole-system completion. */
export function createOnboardingCoordinator({policy,vault,profileStore,dataDir,knowledge,sourceProvider,transaction,aiMemoryPhase,afterLocalVerification,requiredComponents=requiredDefaults}={}){
 if(!policy||!vault||!profileStore||!knowledge||typeof sourceProvider!=='function')fail('onboarding_coordinator_unavailable');
 if(afterLocalVerification!==undefined&&typeof afterLocalVerification!=='function')fail('onboarding_coordinator_unavailable');
 if(Object.keys(requiredComponents).some(k=>!Object.hasOwn(requiredDefaults,k))||Object.values(requiredComponents).some(v=>typeof v!=='boolean'))fail('invalid_onboarding_requirements');
 const required=Object.freeze({...requiredDefaults,...requiredComponents});
 const installer=transaction||createVaultContentTransaction({vault,policy,profileStore,dataDir});
 let busy=false,controller=null,epoch=0,current=null;
 const snapshot=()=>{
  const selection=vault.status(),active=policy.snapshot().active;
  const valid=active&&selection.selected&&current?.root===selection.root&&current?.generation===selection.generation&&current?.policyGeneration===policy.snapshot().generation;
  const verified=valid&&current?.localContentVerified===true;
  let aiVerified=false;try{if(valid&&current?.aiMemory){assertOnboardingAIMemoryReceipt(current.aiMemory);aiVerified=true;}}catch{}
  let aiInstalled=false;try{if(valid&&current?.aiMemoryInstallation){assertAIMemoryInstallationReceipt(current.aiMemoryInstallation);aiInstalled=true;}}catch{}
  const pending=['aiMemory','codex','integrationReceipts','hooks','capture','maintenance'].filter(k=>required[k]&&(k!=='aiMemory'||!aiVerified&&!aiInstalled));
  if(!verified)pending.unshift('catalog_installation','method_installation');
  if(!valid||current?.indexVerified!==true)pending.push('index_verification');
  // A verified local index/content phase cannot satisfy consent/integration
  // gates. This coordinator deliberately never emits full-system completion.
  return {status:valid?onboardingCoordinatorPhaseStatus(current.phase,aiVerified):'not_started',localContentVerified:!!verified,localContentPhase:verified?'readback_verified':'not_verified',method:verified?current.method:null,manifestSHA256:valid?current.manifestSHA256:null,
   localProgress:{completed:valid?(current.provenPhases||[]).filter(p=>p!=='ai_memory_runtime'||aiVerified).length:0,total:required.aiMemory?5:4,confirmed:valid?(current.provenPhases||[]).filter(p=>p!=='ai_memory_runtime'||aiVerified):[]},
   aiMemoryVerified:aiVerified,aiMemory:aiVerified?current.aiMemory:null,aiMemoryInstallationVerified:aiInstalled,aiMemoryInstallation:aiInstalled?current.aiMemoryInstallation:null,restored:valid&&current?.restored===true,indexVerified:valid&&current?.indexVerified===true,conflict:valid?current?.conflict||null:null,pendingStages:pending,requiredComponents:required,readiness:false,completed:false,running:busy,resumable:valid&&current?.phase!=='not_started'};
 };
 async function run(mode,{signal}={}){
  if(busy)fail('onboarding_busy');const selected=vault.status();if(!selected.selected)fail('vault_required');
  const ticket=policy.requireCapability('configure'),expected=epoch,local=new AbortController(),abort=()=>local.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();controller=local;busy=true;
  const check=()=>{policy.assertAdmission(ticket);const s=vault.status();if(local.signal.aborted||expected!==epoch||!s.selected||s.root!==selected.root||s.generation!==selected.generation)fail('onboarding_cancelled');};
  const save=async phase=>{check();current={...current,root:selected.root,generation:selected.generation,policyGeneration:policy.snapshot().generation,phase};
   await profileStore.update(profile=>({...profile,onboardingContentCoordinator:{schemaVersion:1,phase,manifestSHA256:current.manifestSHA256||null,localContentVerified:current.localContentVerified===true,indexVerified:current.indexVerified===true,aiMemoryVerified:!!current.aiMemory,completed:false,readiness:false}}),{beforeCommit:check});check();};
  try{
   check();await policy.revalidateAdmission(ticket);check();await save('planning');
   if(mode==='restore'&&typeof sourceProvider.verifyInstalled!=='function')fail('installation_restore_unavailable');
   const source=await (mode==='restore'?sourceProvider.verifyInstalled:sourceProvider)({ticket,signal:local.signal});check();
   const plan=createContentInstallationPlan(source?.admitted);current={...current,manifestSHA256:plan.manifestSHA256,localContentVerified:false,indexVerified:false,aiMemory:null,aiMemoryInstallation:null,restored:false,conflict:null,provenPhases:[]};
   const sourceMethod=await verifyGBrainMethodInstallation({admitted:source.admitted,payloadRoot:source.payloadRoot,check});check();assertVerifiedGBrainMethod(sourceMethod);
   current.provenPhases=['signed_plan'];await save('planned');if(mode==='plan')return {...snapshot(),running:false,filesPlanned:plan.entries.length,methodFilesPlanned:sourceMethod.filesVerified};
   await save(mode==='resume'?'resuming':'installing');
   const result=await (mode==='restore'?installer.verify(plan,{payloadRoot:source.payloadRoot,signal:local.signal,updatedSkills:source.updatedSkills}):installer.install(plan,{payloadRoot:source.payloadRoot,signal:local.signal}));check();
   if(!result.completed){current.conflict=result.conflict;await save('conflicted');return {...snapshot(),running:false};}
   current.provenPhases.push('content_files');await save('readback');
   const method=await vault.withContentTransaction(async grant=>{const verify=()=>{check();grant.check();};await grant.checkRoot();verify();
    const receipt=await verifyGBrainMethodInstallation({admitted:source.admitted,methodRoot:result.methodRoot,check:verify});await grant.checkRoot();verify();return receipt;
   },{signal:local.signal});check();assertVerifiedGBrainMethod(method);
   current={...current,method,localContentVerified:true};current.provenPhases.push('method_readback');await save('indexing');
   let index=mode==='restore'?await knowledge.verifyExisting({signal:local.signal}):null;check();
   if(!index?.complete)index=await runIndexCheckpoints({knowledge,check,signal:local.signal});check();
   current.indexVerified=index.complete===true&&index.state==='current';if(current.indexVerified)current.provenPhases.push('local_index');await save(current.indexVerified?'local_content_verified':'index_partial');
   if(current.indexVerified&&afterLocalVerification){await vault.withContentReadScope(async grant=>{const verify=()=>{check();grant.check();};await afterLocalVerification({ticket,signal:local.signal,check:verify,restoring:mode==='restore'});verify();},{signal:local.signal});check();}
   if(current.indexVerified&&required.aiMemory){
    if(!aiMemoryPhase){await save('ai_memory_pending');return {...snapshot(),running:false};}
    await save('ai_memory_preparing');
    if(mode==='restore'){
      const receipt=await aiMemoryPhase.verifyInstallation({ticket,planHash:plan.manifestSHA256,signal:local.signal});check();assertAIMemoryInstallationReceipt(receipt);
      current.aiMemoryInstallation=receipt;current.restored=true;current.provenPhases.push('ai_memory_installation');await save('installation_restored');
    }else{
      const receipt=await aiMemoryPhase.prepare({ticket,planHash:plan.manifestSHA256,signal:local.signal});check();assertOnboardingAIMemoryReceipt(receipt);
      current.aiMemory=receipt;current.provenPhases.push('ai_memory_runtime');await save('ai_memory_verified');
    }
   }
   return {...snapshot(),running:false};
  }catch(error){
   if(current)current={...current,phase:local.signal.aborted||expected!==epoch?'cancelled':'interrupted',aiMemory:null};
   // Once revoked/cancelled, no new journal commit is authorized. The last
   // durable phase remains the resume marker; never write using stale tickets.
   try{check();await save(current?.phase||'interrupted');}catch{}
   throw error;
  }finally{busy=false;if(controller===local)controller=null;signal?.removeEventListener('abort',abort);}
 }
 return Object.freeze({snapshot,async status(){const value=snapshot();if(value.resumable||busy)return value;const prior=(await profileStore.load()).onboardingContentCoordinator;return {...value,resumable:!!prior&&prior.phase!=='not_started',resumePhase:prior?.phase||null};},
  plan:options=>run('plan',options),install:options=>run('install',options),resume:options=>run('resume',options),restore:options=>run('restore',options),cancel(){epoch++;controller?.abort();knowledge.cancel();aiMemoryPhase?.cancel();if(current)current={...current,phase:'cancelled',localContentVerified:false,indexVerified:false,aiMemory:null,aiMemoryInstallation:null};return snapshot();}});
}
