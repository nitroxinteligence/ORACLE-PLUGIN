import {spawn} from 'node:child_process';
import {lstatSync,realpathSync,accessSync,constants} from 'node:fs';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const digest=value=>createHash('sha256').update(value).digest('hex');
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);

/** Public Codex CLI app-server only, cross-platform transport shape. This is not
 * Windows qualification. No daemon/proxy, private Desktop DB, auth.json parsing,
 * token export, login/start or inference. Host supplies reviewed executable/cwd
 * and explicit environment; API/token environment variables are never inherited.
 * Protocol: https://learn.chatgpt.com/docs/app-server (account/read, refreshToken:false).
 * spawnImpl/validateLaunch are trusted test seams, never RPC parameters. */
export function createCodexAppServerTransport({executablePath,cwd,environment,spawnImpl=spawn,validateLaunch,timeoutMS=10000}={}){
 if(typeof executablePath!=='string'||resolve(executablePath)!==executablePath||typeof cwd!=='string'||resolve(cwd)!==cwd||!object(environment)||Object.keys(environment).some(key=>!['HOME','CODEX_HOME','PATH','LANG','TERM','SystemRoot','WINDIR'].includes(key))||Object.values(environment).some(v=>typeof v!=='string'||v.includes('\0'))||!Number.isSafeInteger(timeoutMS)||timeoutMS<1||timeoutMS>30000)fail('codex_launch_configuration_required');
 const env=Object.freeze({...environment});let child=null,starting=null,stamp=null,nextID=0,generation=0,closed=false;
 const pending=new Map(),listeners=new Set();
 const invalidate=()=>{generation++;stamp=child?randomUUID():null;for(const fn of listeners)fn();};
 const rejectAll=code=>{for(const request of pending.values())request.reject(Object.assign(new Error(code),{code}));pending.clear();};
 function stop(){const prior=child;child=null;starting=null;stamp=null;invalidate();rejectAll('codex_connection_closed');prior?.stdin?.end();prior?.kill?.();}
 function write(value){if(!child||closed)fail('codex_connection_closed');child.stdin.write(JSON.stringify(value)+'\n');}
 function request(method,params,{signal}={}){
  if(signal?.aborted)return Promise.reject(Object.assign(new Error('codex_request_cancelled'),{code:'codex_request_cancelled'}));
  return new Promise((resolveResult,reject)=>{
   if(pending.size>=4){reject(Object.assign(new Error('codex_queue_full'),{code:'codex_queue_full'}));return;}
   const id=++nextID,timer=setTimeout(()=>{cleanup();stop();reject(Object.assign(new Error('codex_request_timeout'),{code:'codex_request_timeout'}));},timeoutMS);
   const abort=()=>{cleanup();stop();reject(Object.assign(new Error('codex_request_cancelled'),{code:'codex_request_cancelled'}));};
   const cleanup=()=>{clearTimeout(timer);pending.delete(id);signal?.removeEventListener('abort',abort);};
   pending.set(id,{resolve:value=>{cleanup();resolveResult(value);},reject:error=>{cleanup();reject(error);}});signal?.addEventListener('abort',abort,{once:true});
   try{write({id,method,params});}catch{cleanup();reject(Object.assign(new Error('codex_transport_error'),{code:'codex_transport_error'}));}
  });
 }
 async function start({signal}={}){
  if(signal?.aborted)fail('codex_request_cancelled');
  if(closed)fail('codex_connection_closed');if(child&&!starting)return;if(starting)return starting;
  const launch=()=>{
   const executable=realpathSync(executablePath);if(!lstatSync(executable).isFile()||!lstatSync(cwd).isDirectory()||realpathSync(cwd)!==cwd)fail('codex_launch_invalid');accessSync(executablePath,constants.X_OK);
  };(validateLaunch||launch)();
  const process=spawnImpl(executablePath,['app-server','--listen','stdio://'],{cwd,env,stdio:['pipe','pipe','pipe'],shell:false});child=process;stamp=randomUUID();let buffer=Buffer.alloc(0),stderrBytes=0;
  process.stdout.on('data',chunk=>{
   if(child!==process)return;buffer=Buffer.concat([buffer,Buffer.from(chunk)]);if(buffer.length>512000){stop();return;}
   let newline;while((newline=buffer.indexOf(10))>=0){const line=buffer.subarray(0,newline);buffer=buffer.subarray(newline+1);if(!line.length)continue;let value;
    try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(line));}catch{stop();return;}
    if(!object(value)){stop();return;}
    if(typeof value.method==='string'){
     if(Object.hasOwn(value,'id')){if(!(Number.isSafeInteger(value.id)||typeof value.id==='string'&&value.id.length<=64)){stop();return;}try{write({id:value.id,error:{code:-32601,message:'Unsupported request'}});}catch{stop();}}
     else if(value.method==='account/updated')invalidate();
    }else if(Number.isSafeInteger(value.id)&&pending.has(value.id)){
     const target=pending.get(value.id);if(value.error)target.reject(Object.assign(new Error('codex_rpc_error'),{code:'codex_rpc_error'}));else if(Object.hasOwn(value,'result'))target.resolve(value.result);else stop();
    }
   }
  });
  // Drain and count stderr, never retain/log token-bearing diagnostics.
  process.stderr.on('data',chunk=>{stderrBytes+=Buffer.byteLength(chunk);if(stderrBytes>128000&&child===process)stop();});
  process.stdin.on?.('error',()=>{if(child===process)stop();});
  process.on('error',()=>{if(child===process)stop();});process.on('close',()=>{if(child===process)stop();});
  starting=(async()=>{try{await request('initialize',{clientInfo:{name:'oracle_portable_connection',title:'Oracle portable connection',version:'0.1.0'}},{signal});if(child!==process||closed)fail('codex_connection_changed');write({method:'initialized'});}catch{stop();fail('codex_initialization_failed');}finally{if(child===process)starting=null;}})();return starting;
 }
 return Object.freeze({async account({signal}={}){await start({signal});const expected=stamp;const result=await request('account/read',{refreshToken:false},{signal});if(!child||expected!==stamp)fail('codex_connection_changed');
   const account=result?.account,connected=object(account)&&account.type==='chatgpt';
   // Account identity stays hashed and private to this module. Nullable email is
   // supported by the public protocol, but cannot bind a durable consent.
   const identifier=typeof account?.id==='string'&&account.id?account.id:typeof account?.email==='string'&&account.email?account.email:null;
   return Object.freeze({connected,identityFingerprint:connected&&identifier?digest('chatgpt\0'+identifier):null,transportSessionID:stamp});},
  async skillsList({cwd:workspace,signal}={}){if(typeof workspace!=='string'||resolve(workspace)!==workspace||realpathSync(workspace)!==workspace||!lstatSync(workspace).isDirectory())fail('codex_workspace_required');await start({signal});const expected=stamp;const result=await request('skills/list',{cwds:[workspace],forceReload:true},{signal});if(!child||expected!==stamp)fail('codex_connection_changed');return result;},
  onChange(fn){listeners.add(fn);return()=>listeners.delete(fn);},sessionID:()=>stamp,stop,close(){closed=true;stop();}});
}

/** Trusted service action only. authorizeExplicitly({ticket}) must be invoked
 * because the human explicitly chose Connect, after the real policy minted its
 * capability ticket. A UI boolean, MCP initialize or cached profile is not consent.
 * First-use consent stays in memory and is bound to policy/vault/transport epochs.
 * Optional persistence requires injected cryptographically verified storage; this
 * module never restores authorization from writable JSON flags. No login prompt
 * or model selection is introduced; it checks the official CLI's existing account.
 */
export function createCodexConnectionProvider({transport,policy,vault,authorizationPersistence}={}){
 if(!transport?.account||!transport?.sessionID||!policy?.assertAdmission||!policy?.requireCapability||!policy?.revalidateAdmission||!vault?.withContentReadScope)fail('codex_connection_provider_required');
 if(authorizationPersistence&&['saveVerifiedConsent','loadVerifiedConsent','revoke'].some(k=>typeof authorizationPersistence[k]!=='function'))fail('codex_consent_persistence_unavailable');
 let consent=null,epoch=0,busy=false,closed=false;const listeners=new Set();
 const invalidate=()=>{epoch++;consent=null;for(const fn of listeners)fn();};
 const unsubscribe=transport.onChange?.(()=>{if(consent)invalidate();});
 const inactive=()=>Object.freeze({connected:false,explicitAuthorization:false,sessionID:''});
 const check=record=>{if(closed||!record||record.epoch!==epoch)fail('codex_consent_changed');policy.assertAdmission(record.ticket);const selected=vault.status();if(!selected.selected||selected.root!==record.root||selected.generation!==record.vaultGeneration||transport.sessionID()!==record.transportSessionID)fail('codex_consent_changed');};
 async function authorize(ticket,{signal,restored}={}){
  if(busy)fail('codex_connection_busy');busy=true;const expected=epoch;
  try{
   policy.assertAdmission(ticket);if(ticket.capability!=='configure')fail('codex_consent_ticket_required');await policy.revalidateAdmission(ticket);if(expected!==epoch||closed)fail('codex_consent_changed');
   return await vault.withContentReadScope(async grant=>{
    const guard=()=>{grant.check();policy.assertAdmission(ticket);if(expected!==epoch||closed||signal?.aborted)fail('codex_consent_changed');};
    guard();const account=await transport.account({signal});guard();await grant.checkRoot();guard();
    if(!account.connected){invalidate();return inactive();}
    if(restored&&(!account.identityFingerprint||restored.identityFingerprint!==account.identityFingerprint))fail('codex_consent_account_changed');
    const record={ticket,epoch,root:grant.root,vaultGeneration:grant.generation,transportSessionID:account.transportSessionID,identityFingerprint:account.identityFingerprint,sessionID:randomUUID()};
    if(!restored&&authorizationPersistence&&account.identityFingerprint){await authorizationPersistence.saveVerifiedConsent({identityFingerprint:account.identityFingerprint,purpose:'oracle-memory-relay',beforeCommit:guard});guard();}
    consent=record;check(record);return Object.freeze({connected:true,explicitAuthorization:true,sessionID:record.sessionID});
   },{signal});
  }catch(error){invalidate();throw error;}finally{busy=false;}
 }
 return Object.freeze({authorizeExplicitly:({ticket,signal}={})=>authorize(ticket,{signal}),
  async restore({signal}={}){if(!authorizationPersistence)fail('codex_consent_persistence_unavailable');const expected=epoch,verified=await authorizationPersistence.loadVerifiedConsent({purpose:'oracle-memory-relay'});if(expected!==epoch||closed)fail('codex_consent_changed');if(!verified||verified.purpose!=='oracle-memory-relay'||typeof verified.identityFingerprint!=='string')return inactive();return authorize(policy.requireCapability('configure'),{signal,restored:verified});},
  async verifyActiveConnection(){const record=consent;if(!record)return inactive();try{check(record);await policy.revalidateAdmission(record.ticket);check(record);const account=await transport.account();check(record);if(!account.connected||account.transportSessionID!==record.transportSessionID||account.identityFingerprint!==record.identityFingerprint)fail('codex_consent_account_changed');return Object.freeze({connected:true,explicitAuthorization:true,sessionID:record.sessionID});}catch{invalidate();return inactive();}},
  async skillsList({cwd,signal}={}){const record=consent;check(record);await policy.revalidateAdmission(record.ticket);check(record);if(typeof transport.skillsList!=='function')fail('codex_skills_unavailable');const result=await transport.skillsList({cwd,signal});check(record);await policy.revalidateAdmission(record.ticket);check(record);return result;},
  async revoke(){invalidate();try{await authorizationPersistence?.revoke({purpose:'oracle-memory-relay'});}finally{transport.stop();}return inactive();},onChange(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  close(){closed=true;invalidate();unsubscribe?.();transport.close();},
 });
}
