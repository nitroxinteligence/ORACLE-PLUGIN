import {createHash} from 'node:crypto';

/** A conversation can predate another conversation's explicit selection.
 * The persisted record is only a change hint; restore must acquire and verify
 * the real OS grant. Concurrent UI polls share one attempt. */
export function describeVaultRestorationError(error){
 const code=typeof error?.code==='string'?error.code:'vault_restore_failed';
 const messages={
  directory_grant_stale:'O macOS não conseguiu renovar o acesso ao vault. A instalação existente foi preservada.',
  directory_grant_unavailable:'Não foi possível recuperar o acesso do macOS ao vault. A instalação existente foi preservada.',
  invalid_directory_bookmark:'O registro de acesso ao vault não pôde ser recuperado. Seus arquivos foram preservados.',
  directory_grant_changed:'O macOS encontrou uma pasta diferente do vault autorizado. Seus arquivos foram preservados.',
  ENOENT:'O vault ou um recurso da instalação está temporariamente indisponível. Seus arquivos foram preservados.',
  PROFILE_TOO_LARGE:'O registro local da instalação excedeu o limite. Seus arquivos foram preservados.',
 };
 return {code,retryable:['directory_grant_unavailable','directory_grant_stale','ENOENT','access_denied'].includes(code),message:messages[code]||'Não foi possível recuperar a instalação existente. Seus arquivos foram preservados. Tente recuperar o acesso antes de reinstalar.'};
}

export function createVaultRestoration({profileStore,canRestore,restore,revision=()=>0,describeError,now=Date.now}){
 let pending=null,lastAttempt=null,failures=0,retryAt=0,state={state:'unconfigured',savedSelection:false,error:null};
 const snapshot=()=>structuredClone(state);
 const reset=()=>{lastAttempt=null;failures=0;retryAt=0;state={state:'unconfigured',savedSelection:false,error:null};};
 const failed=(key,error)=>{
  if(key!==lastAttempt)failures=0;
  lastAttempt=key;failures++;retryAt=now()+Math.min(30_000,1000*2**(failures-1));
  state={state:'failed',savedSelection:true,error:describeError(error)};
 };
 const ensure=({retry=false}={})=>{
  if(pending)return pending;
  if(!canRestore())return Promise.resolve(false);
  pending=Promise.resolve().then(async()=>{
   if(!canRestore())return false;
   let key;
   try{
    const profile=await profileStore.load();
    if(!canRestore())return false;
    key=createHash('sha256').update(JSON.stringify([revision(),profile.vaultSelection??null])).digest('hex');
    if(key===lastAttempt&&!retry&&!(state.state==='failed'&&state.error?.retryable===true&&failures<6&&now()>=retryAt))return false;
    if(retry||key!==lastAttempt)failures=0;
    state={state:'restoring',savedSelection:!!profile.vaultSelection,error:null};
    const result=await restore();
    if(result){lastAttempt=key;failures=0;state={state:'restored',savedSelection:true,error:null};}
    else if(state.savedSelection&&describeError)failed(key,{code:'directory_grant_unavailable'});
    else{lastAttempt=key;failures=0;state={state:'unconfigured',savedSelection:false,error:null};}
    return result;
   }catch(error){
    if(!describeError)throw error;
    if(!canRestore())throw error;
    failed(key,error);
    return false;
   }
  }).finally(()=>{pending=null;});
  return pending;
 };
 return Object.freeze({ensure,snapshot,reset,async settled(){await pending;}});
}
