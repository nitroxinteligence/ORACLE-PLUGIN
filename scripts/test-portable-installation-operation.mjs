import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {generateKeyPairSync,sign,randomUUID} from 'node:crypto';
import {createInstallationOperation} from '../packages/oracle-desktop-portable/installation-operation.mjs';
import {onboardingStatus} from '../packages/oracle-desktop-portable/onboarding-status.mjs';
import {createService} from '../packages/oracle-desktop-portable/service.mjs';
import {createProfileStore} from '../packages/oracle-desktop-portable/profile-store.mjs';

test('short request returns while local work continues; cancellation blocks retry until settled',async()=>{
 const operation=createInstallationOperation(),request=new AbortController();let release,owned;
 const waiting=new Promise(resolve=>{release=resolve;});
 assert.equal(operation.start(async({signal,check})=>{owned=signal;await waiting;check();},{signal:request.signal}).running,true);
 await Promise.resolve();request.abort();assert.equal(owned.aborted,false);
 assert.throws(()=>operation.start(()=>{}),{code:'onboarding_busy'});
 operation.cancel();assert.equal(owned.aborted,true);assert.throws(()=>operation.start(()=>{}),{code:'onboarding_busy'});
 release();assert.equal((await operation.settled()).error.code,'onboarding_cancelled');
 operation.start(()=>{throw Object.assign(new Error('Synthetic disk full'),{code:'ENOSPC'});});
 assert.equal((await operation.settled()).error.message,'Synthetic disk full');
});

test('UI status exposes real phase, proven phases and error without claiming completed installation',()=>{
 const policy={snapshot:()=>({active:true,role:'student',capabilities:[]})},vault={status:()=>({selected:true,root:'/synthetic/vault',generation:1})};
 const coordinator={status:'indexing',running:true,localContentVerified:true,localProgress:{completed:3,total:5,confirmed:['signed_plan','content_files','method_readback']},pendingStages:['index_verification','aiMemory','hooks']};
 const input={policy,vault,coordinator,runID:'synthetic-run',operation:{running:true}};
 const state=onboardingStatus(input);assert.equal(state.status,'running');assert.equal(state.phase,'indexing');assert.equal(state.profileMode,'memory-only');assert.equal(state.confirmed.length,3);assert.equal(state.completed,3);assert.equal(state.readiness,false);assert.equal(state.installationCompleted,false);assert.equal(state.hooksTrusted,false);
 const failure=onboardingStatus({...input,coordinator:{...coordinator,running:false,status:'interrupted'},operation:{running:false,error:{code:'ENOSPC',message:'Synthetic disk full'}}});assert.equal(failure.status,'failed');assert.match(failure.message,/disco ficou sem espaço/);
 const partial=onboardingStatus({...input,coordinator:{...coordinator,running:false,status:'index_partial'},operation:{running:false},knowledge:{index:{verified:2050,total:2089,failures:[{path:'/synthetic/private/source.md',error:'ENOSPC: no space left on device, write'}]}}});assert.equal(partial.status,'paused');assert.equal(partial.installationError.code,'ENOSPC');assert.match(partial.message,/2050 de 2089/);assert(!partial.message.includes('/synthetic'));assert.equal(partial.installationProgress.total,2089);assert.equal(partial.installationCompleted,false);
 assert.equal(onboardingStatus({...input,coordinator:{status:'not_started'},operation:{running:false,error:{message:'Old error'}}}).runID,undefined);
 assert.equal(onboardingStatus({...input,policy:{snapshot:()=>({active:false,capabilities:[]})}}).runID,undefined);
});

test('service install responds before a stalled source; polling, explicit cancellation and failed resume work',{timeout:3000},async()=>{
 const base=resolve('.work/portable-installation-operation-test');await fs.mkdir(base,{recursive:true});
 const root=await fs.mkdtemp(join(base,'synthetic-')),vaultRoot=join(root,'vault');await fs.mkdir(vaultRoot);
 const pair=generateKeyPairSync('ed25519');let sourceStarted,sourceSignal,failSource=false,providersClosed=false,closed=false;
 const sourceReady=new Promise(resolve=>{sourceStarted=resolve;});
 const service=await createService({root:resolve('packages/oracle-desktop-portable'),resourcesRoot:resolve('Resources'),dataDir:join(root,'private'),providers:{close(){assert.equal(service.installationOperation.snapshot().running,false);providersClosed=true;}},keys:{version:1,keys:{synthetic:pair.publicKey.export({type:'spki',format:'der'}).subarray(-32).toString('base64')}},selectionAdapter:{selectVault:async()=>({root:vaultRoot,explicitSelection:true})},contentSourceProvider:async({signal})=>{
  if(failSource)throw Object.assign(new Error('Synthetic disk full'),{code:'ENOSPC'});
  sourceSignal=signal;sourceStarted();await new Promise((resolve,reject)=>{const abort=()=>reject(Object.assign(new Error('Synthetic source cancelled'),{code:'onboarding_cancelled'}));if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});});
 }});
 const dispatch=(method,params={},context={})=>service.dispatcher.dispatch(method,params,context);
 try{
  const bytes=Buffer.from(JSON.stringify({version:3,product:'oracle-macos',keyID:'synthetic',licenseID:randomUUID(),subject:'Synthetic installation only',issuedAt:Math.floor(Date.now()/1000)-1,role:'student',accessKeyHash:'a'.repeat(64)}));
  await service.policy.activate('ORACLE3.'+bytes.toString('base64url')+'.'+sign(null,Buffer.concat([Buffer.from('ORACLE3.'),bytes]),pair.privateKey).toString('base64url'));await dispatch('chooseVault');
  assert.equal((await dispatch('snapshot')).features.updates,false);
  const options={localMemoryPortability:{schemaVersion:1,acknowledgment:'oracle_local_memory_portability_v1',vaultSelectionRevision:String(service.vault.status().generation)}};
  const request=new AbortController(),installed=await dispatch('onboardingInstallMemoryOnly',options,{signal:request.signal});assert.equal(installed.status,'running');assert(installed.runID);
  await sourceReady;request.abort();assert.equal(sourceSignal.aborted,false);
  assert.equal((await dispatch('onboardingStatus')).phase,'preparing');await assert.rejects(dispatch('onboardingInstallMemoryOnly',options),{code:'onboarding_busy'});await assert.rejects(dispatch('onboardingResume'),{code:'onboarding_busy'});
  await dispatch('onboardingCancel');assert.equal(sourceSignal.aborted,true);
  for(let n=0;n<30&&service.installationOperation.snapshot().running;n++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal((await dispatch('onboardingStatus')).status,'cancelled');assert.deepEqual(await fs.readdir(vaultRoot),[]);
  failSource=true;assert.equal((await dispatch('onboardingResume')).status,'running');await service.installationOperation.settled();
  const failed=await dispatch('onboardingStatus');assert.equal(failed.status,'failed');assert.equal(failed.installationError.code,'ENOSPC');assert.match(failed.message,/disco ficou sem espaço/);assert.equal(failed.installationCompleted,false);
  await dispatch('revoke');assert.equal((await dispatch('onboardingStatus')).runID,undefined);
  await dispatch('chooseVault');options.localMemoryPortability.vaultSelectionRevision=String(service.vault.status().generation);failSource=false;sourceSignal=null;
  const closingSourceReady=new Promise(resolve=>{sourceStarted=resolve;});await dispatch('onboardingInstallMemoryOnly',options);await closingSourceReady;assert(sourceSignal);
  await service.close();closed=true;assert.equal(sourceSignal.aborted,true);assert.equal(providersClosed,true);assert.equal(service.installationOperation.snapshot().running,false);
 }finally{if(!closed)await service.close();await fs.rm(root,{recursive:true,force:true});}
});


test('verified local installation finishes independently of optional Codex consent gates',()=>{
 const policy={snapshot:()=>({active:true,role:'student',capabilities:[]})},vault={status:()=>({selected:true,root:'/synthetic/vault',generation:1})};
 const coordinator={status:'local_content_verified',running:false,localContentVerified:true,indexVerified:true,requiredComponents:{aiMemory:false},pendingStages:['codex','integrationReceipts','hooks','capture','maintenance']};
 const input={policy,vault,coordinator,runID:'synthetic-local',operation:{running:false}};
 const state=onboardingStatus(input);assert.equal(state.knowledgeInterviewAvailable,true);assert.equal(state.status,'completed');assert.equal(state.phase,'ready');assert.equal(state.installationCompleted,true);assert.equal(state.readiness,false);assert.equal(state.integrationPending,true);assert.deepEqual(state.pendingStages,['codex','integrationReceipts']);assert.deepEqual(state.integrationActions,[]);assert.equal(state.hooksTrusted,false);
 const requested=onboardingStatus({...input,integration:{connected:true,discoveryVerified:true,captureRequested:true,maintenanceRequested:true}});assert.deepEqual(requested.pendingStages,['integrationReceipts','hooks','capture','maintenance']);assert.equal(requested.codexRuntime.runtimeReady,false);assert.equal(requested.codexRuntime.skillDiscoveredByCodex,true);assert.equal(requested.maintenance.registered,false);assert.match(requested.integrationMessage,/ainda não confirma/);
 for(const alteration of [{status:'cancelled'},{status:'interrupted'},{status:'index_partial'},{indexVerified:false},{localContentVerified:false},{requiredComponents:{aiMemory:true},aiMemoryVerified:true,aiMemory:{}}])assert.equal(onboardingStatus({...input,coordinator:{...coordinator,...alteration}}).installationCompleted,false);
 assert.equal(onboardingStatus({...input,operation:{running:true}}).installationCompleted,false);
 assert.equal(onboardingStatus({...input,operation:{cancelled:true}}).installationCompleted,false);
 assert.equal(onboardingStatus({...input,operation:{error:{code:'verification_failed',message:'Synthetic failure'}}}).installationCompleted,false);
});

test('optional Codex connection failure does not cancel local AI Memory; vault revocation still does',async()=>{
 const base=resolve('.work/portable-installation-operation-test');await fs.mkdir(base,{recursive:true});const root=await fs.mkdtemp(join(base,'connection-'));const vaultRoot=join(root,'vault');await fs.mkdir(vaultRoot);
 const pair=generateKeyPairSync('ed25519');let localCancels=0,listener=()=>{};
 const service=await createService({root:resolve('packages/oracle-desktop-portable'),resourcesRoot:resolve('Resources'),dataDir:join(root,'private'),providers:{},keys:{version:1,keys:{synthetic:pair.publicKey.export({type:'spki',format:'der'}).subarray(-32).toString('base64')}},selectionAdapter:{selectVault:async()=>({root:vaultRoot,explicitSelection:true})},
 aiMemoryFactory:async()=>({tools:async()=>[],invoke(){},cancel(){localCancels++;},close:async()=>{}}),
 codexConnectionFactory:()=>({async authorizeExplicitly(){listener();throw Object.assign(new Error('Synthetic account unavailable'),{code:'codex_connection_unavailable'});},verifyActiveConnection:async()=>({connected:false,explicitAuthorization:false}),revoke:async()=>{listener();},onChange(fn){listener=fn;return()=>{listener=()=>{};};},close(){},skillsList:async()=>[]})});
 const dispatch=(method,params={})=>service.dispatcher.dispatch(method,params);
 try{
  const bytes=Buffer.from(JSON.stringify({version:3,product:'oracle-macos',keyID:'synthetic',licenseID:randomUUID(),subject:'Synthetic connection isolation',issuedAt:Math.floor(Date.now()/1000)-1,role:'student',accessKeyHash:'b'.repeat(64)}));
  await service.policy.activate('ORACLE3.'+bytes.toString('base64url')+'.'+sign(null,Buffer.concat([Buffer.from('ORACLE3.'),bytes]),pair.privateKey).toString('base64url'));await dispatch('chooseVault');const initial=localCancels;
  await assert.rejects(dispatch('onboardingConnect'),{code:'codex_connection_unavailable'});assert.equal(localCancels,initial,'optional connection must not stop local runtime');
  listener();assert.equal(localCancels,initial,'external account change must not stop local runtime');
  await dispatch('onboardingCancelLogin');assert.equal(localCancels,initial,'cancelling optional login must not stop local runtime');
  await dispatch('revoke');assert(localCancels>initial,'vault revocation must stop local runtime');
 }finally{await service.close();await fs.rm(root,{recursive:true,force:true});}
});

test('reopening after a temporary OS denial exposes recovery; retry only verifies the existing installation',async()=>{
 const base=resolve('.work/portable-installation-operation-test');await fs.mkdir(base,{recursive:true});const root=await fs.mkdtemp(join(base,'restore-'));
 let service;try{
  const vaultRoot=join(root,'vault'),dataDir=join(root,'private');await fs.mkdir(vaultRoot);const info=await fs.stat(vaultRoot);
  const pair=generateKeyPairSync('ed25519'),keys={version:1,keys:{synthetic:pair.publicKey.export({type:'spki',format:'der'}).subarray(-32).toString('base64')}};
  const bytes=Buffer.from(JSON.stringify({version:3,product:'oracle-macos',keyID:'synthetic',licenseID:randomUUID(),subject:'Synthetic recovery test',issuedAt:Math.floor(Date.now()/1000)-1,role:'student',accessKeyHash:'d'.repeat(64)}));
  const license='ORACLE3.'+bytes.toString('base64url')+'.'+sign(null,Buffer.concat([Buffer.from('ORACLE3.'),bytes]),pair.privateKey).toString('base64url');
  const selection={schemaVersion:1,bookmark:{version:1,path:vaultRoot,bookmarkBase64:'b3BhcXVl'},rootIdentity:{dev:info.dev,ino:info.ino}};
  const original={license,vaultSelection:selection,preferences:{onboardingStep:'install'},contentInstallations:{original:{completed:true,rootIdentity:selection.rootIdentity}}};
  const store=createProfileStore({dataDir});await store.save(original);let denied=true,grants=0,pickers=0,installs=0,verifications=0;
  const source=async()=>{installs++;throw Error('Never install on recovery');};source.verifyInstalled=async()=>{verifications++;throw Object.assign(Error('Synthetic signed readback stops here'),{code:'synthetic_readback'});};
  service=await createService({root:resolve('packages/oracle-desktop-portable'),resourcesRoot:resolve('Resources'),dataDir,keys,codexConnectionFactory:()=>null,aiMemoryFactory:()=>null,contentSourceProvider:source,
   providers:{chooseDirectory:async()=>{pickers++;return {path:vaultRoot};},directoryBookmarks:{createBookmark:async()=>selection.bookmark,acquireDirectoryGrant:async()=>{grants++;if(denied)throw Object.assign(Error('Synthetic OS denied'),{code:'directory_grant_unavailable'});let active=true;return {path:vaultRoot,assertActive(){assert(active);},release(){active=false;}};}}}});
  const dispatch=(method,params={})=>service.dispatcher.dispatch(method,params);
  const failed=await dispatch('onboardingStatus');assert.equal(failed.licensed,true);assert.equal(failed.status,'failed');assert.equal(failed.vaultRecovery.savedSelection,true);assert.equal(failed.hasVault,false);assert.equal(failed.installationCompleted,false);assert.match(failed.message,/preservada/);
  for(let i=0;i<4;i++)await dispatch('onboardingStatus');assert.equal(grants,1);assert.deepEqual(await store.load(),original);
  denied=false;await dispatch('onboardingResume');await service.installationOperation.settled();const recovered=await dispatch('onboardingStatus');
  assert.equal(recovered.hasVault,true);assert.equal(recovered.installationCompleted,false);assert.equal(recovered.installationError.code,'synthetic_readback');assert.equal(grants,2);assert.equal(pickers,0);assert.equal(installs,0);assert.equal(verifications,1);
  const after=await store.load();for(const key of ['license','vaultSelection','contentInstallations','preferences'])assert.deepEqual(after[key],original[key]);
 }finally{await service?.close();await fs.rm(root,{recursive:true,force:true});}
});
