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
OracleOnboarding.suspend();
return {checks,passed:checks.filter(row=>row.pass).length,failed:checks.filter(row=>!row.pass).length,scope:'Synthetic native WKWebView snapshot completion and delayed polling'};
