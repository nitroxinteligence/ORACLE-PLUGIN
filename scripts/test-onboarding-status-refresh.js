// WKWebView regression using synthetic bridge receipts, never a personal vault.
const checks=[],calls=[],toasts=[];
const check=(name,pass)=>checks.push({name,pass:!!pass});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const completed={schemaVersion:2,licensed:true,hasVault:true,vaultName:'Synthetic vault',vaultPath:'/synthetic/vault',vaultSelectionRevision:'1',runID:'synthetic-refresh',profileMode:'memory-only',status:'completed',phase:'ready',installationCompleted:true,resumeExisting:true,integrationPending:true,integrationActions:[],knowledgeInterviewAvailable:false,hooksTrusted:false,captureReady:false,maintenance:{registered:false}};
const running={...completed,status:'running',phase:'preparing',installationCompleted:false,resumeExisting:false,integrationPending:false};
let status={...running},snapshotStatus={...running},holdStatus=false,heldReply;
state={...state,features:{updates:false},config:{...state.config,vault:completed.vaultPath},onboarding:{...running}};
window.__oracleFixtureReceive=({id,method})=>{
 calls.push(method);
 if(method==='onboardingStatus'&&holdStatus){heldReply=()=>window.oracleReply(id,{value:{...running}});return;}
 setTimeout(()=>window.oracleReply(id,method==='snapshot'?{value:{...state,onboarding:{...snapshotStatus}}}:method==='onboardingStatus'?{value:{...status}}:{error:'Unexpected action: '+method}),0);
};
const mount=refreshAPI=>OracleOnboarding.mount({call,refresh:refreshAPI,toast:message=>toasts.push(message),canOpen:()=>true});
await mount(refresh);
const panel=document.querySelector('.ob2-installation');
check('a real pending receipt keeps the verification notice visible',!panel.hidden);
// The map refresh can finish while the periodic status request is delayed.
holdStatus=true;const delayed=OracleOnboarding.poll();
for(let n=0;n<40&&!heldReply;n++)await wait(10);
snapshotStatus={...completed};await refresh();
check('a completed authoritative snapshot removes the stale notice',panel.hidden&&getComputedStyle(panel).display==='none'&&OracleOnboarding.getState().status==='completed');
heldReply();await delayed;holdStatus=false;
check('an older delayed poll cannot reopen the completed notice',panel.hidden&&OracleOnboarding.getState().status==='completed');
check('hiding the notice does not grant hooks, capture or maintenance',!OracleOnboarding.getState().hooksTrusted&&!OracleOnboarding.getState().captureReady&&!OracleOnboarding.getState().maintenance.registered);
// A slow map refresh must not prevent the next short status poll.
OracleOnboarding.suspend();status={...running};snapshotStatus={...running};
let releaseRefresh,refreshStarted=false;
await mount(()=>{refreshStarted=true;return new Promise(resolve=>releaseRefresh=resolve);});
status={...running,phase:'indexing',installationProgress:{phase:'indexing',completed:1,total:2}};
const first=OracleOnboarding.poll();await wait(80);
status={...completed};const second=OracleOnboarding.poll();await wait(100);
check('status polling can finish while map refresh remains pending',refreshStarted&&panel.hidden&&OracleOnboarding.getState().status==='completed');
releaseRefresh?.();await Promise.all([first,second]);
check('the map remains available after verification finishes',!!document.querySelector('#atlas svg')&&!document.querySelector('.ob2-screen').open);
check('completion uses only read-only status and snapshot calls',calls.every(method=>['onboardingStatus','snapshot'].includes(method)));
check('completion produces no spurious error',toasts.length===0);
OracleOnboarding.suspend();status={...running,phase:'indexing',restoringExisting:true};snapshotStatus={...status};await mount(refresh);
check('existing installation verification keeps the map and update controls visible',panel.hidden&&!document.querySelector('.ob2-screen').open&&!!document.querySelector('#atlas svg'));
check('background verification never claims installation or hook completion',!OracleOnboarding.getState().installationCompleted&&!OracleOnboarding.getState().resumeExisting&&!OracleOnboarding.getState().hooksTrusted);
status={...status,restoringExisting:false,status:'failed',message:'Synthetic readback failure',installationError:{code:'content_existing_conflict'}};await OracleOnboarding.poll();
check('failed background readback remains visible and recoverable',!panel.hidden&&panel.textContent.includes('Synthetic readback failure'));
// A previously configured vault can fail to acquire its OS lease. That is a
// recovery state, even before there is a live runID in this process.
OracleOnboarding.suspend();
const lost={...completed,hasVault:false,vaultPath:'',vaultName:'',runID:undefined,status:'failed',installationCompleted:false,resumeExisting:false,integrationPending:false,message:'A instalação existente foi preservada.',installationError:{code:'directory_grant_unavailable'},vaultRecovery:{state:'failed',savedSelection:true,error:{code:'directory_grant_unavailable',message:'A instalação existente foi preservada.'}}};
status={...lost};snapshotStatus={...lost};const recoveryCalls=[];
window.__oracleFixtureReceive=({id,method})=>{
 recoveryCalls.push(method);
 if(method==='onboardingResume'){status={...completed};snapshotStatus={...completed};}
 setTimeout(()=>window.oracleReply(id,method==='snapshot'?{value:{...state,onboarding:{...snapshotStatus}}}:['onboardingStatus','onboardingResume'].includes(method)?{value:{...status}}:{error:'Unexpected action: '+method}),0);
};
await mount(refresh);
check('a lost OS lease keeps the setup picker closed and shows recovery',!document.querySelector('.ob2-screen').open&&!panel.hidden&&panel.textContent.includes('Recuperar acesso ao vault'));
check('recovery never fabricates completion or vault access',!OracleOnboarding.getState().installationCompleted&&!OracleOnboarding.getState().hasVault);
panel.querySelector('.ob2-retry button').click();
for(let i=0;i<40&&!panel.hidden;i++)await wait(20);
check('retry recovers the existing vault and closes the notice',panel.hidden&&!document.querySelector('.ob2-screen').open&&OracleOnboarding.getState().resumeExisting===true);
check('recovery does not call installation, permissions or the picker',recoveryCalls.includes('onboardingResume')&&recoveryCalls.every(method=>['onboardingStatus','snapshot','onboardingResume'].includes(method)));
OracleOnboarding.suspend();
// Exercise the real updates controls with rejected admission and a lost reply.
const updateCalls=[];let updateMode='reject',updateReceipt=null;
const updateCall=async(method,params)=>{
 updateCalls.push({method,...params});
 if(method==='portableUpdateRequest'){
  if(updateMode==='reject')throw Object.assign(Error('Synthetic installation busy'),{code:'installation_in_progress'});
  updateReceipt={requestID:params.requestID,operation:params.operation,phase:'complete',running:false,skills:{currentReleaseID:'skills-7',latestReleaseID:'skills-7',available:false},oracle:{currentVersion:'0.1.33',latestVersion:'0.1.30',available:false,components:{gbrain:{currentVersion:'0.60.94.0',latestVersion:'0.60.150.0',available:true,qualified:false}}}};
  throw Error('Synthetic lost acknowledgement');
 }
 if(method==='portableUpdateStatus')return params.requestID?updateReceipt?.requestID===params.requestID?updateReceipt:{phase:'unknown',running:false}:{phase:'idle',running:false};
 throw Error('Unexpected updater action: '+method);
};
await OraclePortableUpdates.open({call:updateCall,modal,toast:()=>{},refresh:()=>{throw Error('Query must not refresh the index');},actions,icon,statusBadge,mountMetal:mountUpdateMetal,mountBeam:mountUpdateBeam});
check('a rejected check unlocks Verificar and preserves both source cards',!document.querySelector('#portable-update-check').disabled&&document.querySelectorAll('[data-update-channel]').length===2&&document.querySelector('#portable-update-body').textContent.includes('Synthetic installation busy'));
updateMode='lost-ack';document.querySelector('#portable-update-check').click();
for(let n=0;n<40&&document.querySelector('#portable-update-check').disabled;n++)await wait(20);
check('a lost acknowledgement recovers by ID without resending the request',!document.querySelector('#portable-update-check').disabled&&updateCalls.filter(row=>row.method==='portableUpdateRequest').length===2&&document.querySelector('#portable-update-body').textContent.includes('Consulta concluída'));
check('query stays in the updates modal and calls no installation or index action',document.querySelector('#modal').open&&document.querySelector('#modal').dataset.family==='updates'&&updateCalls.every(row=>['portableUpdateStatus','portableUpdateRequest'].includes(row.method)&&(!row.operation||row.operation==='check')));
check('an older public release is not displayed as a downgrade and upstream qualification is clear',!document.querySelector('[data-update-channel="oracle"]').textContent.includes('→ 0.1.30')&&document.querySelector('[data-update-channel="oracle"]').textContent.includes('aguarda versão compatível do ORACLE'));
OraclePortableUpdates.reset();
return {checks,passed:checks.filter(row=>row.pass).length,failed:checks.filter(row=>!row.pass).length,scope:'Synthetic native WKWebView restore, update query rejection and lost acknowledgement'};
