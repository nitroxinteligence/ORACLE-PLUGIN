import {validateLicense} from './access-policy.mjs';
const fail=code=>{throw Object.assign(new Error('Não foi possível validar sua chave de acesso.'),{code});};

/** Trusted private activation endpoint only. No raw key, URL, device or role is
 * accepted from RPC here. The issuer signature and key hash remain authority;
 * a successful HTTP reply never grants access by itself. No grant is persisted. */
export function createAccessGrantClient({endpoint,allowedOrigins,keys,fetchImpl=globalThis.fetch,timeoutMS=10000,now=()=>Math.floor(Date.now()/1000)}={}){
  let url;try{url=new URL(endpoint);}catch{fail('activation_unavailable');}
  if(url.protocol!=='https:'||url.username||url.password||url.hash||!Array.isArray(allowedOrigins)||!allowedOrigins.includes(url.origin)||!keys||typeof fetchImpl!=='function'||!Number.isSafeInteger(timeoutMS)||timeoutMS<1||timeoutMS>30000)fail('activation_unavailable');
  const trust=Object.freeze({version:keys.version,keys:Object.freeze({...keys.keys})});
  return async function resolveGrant(accessKeyHash,{signal,beforeAccept=()=>{}}={}){
    if(typeof accessKeyHash!=='string'||!/^[a-f0-9]{64}$/.test(accessKeyHash)||typeof beforeAccept!=='function')fail('invalid_access_key');
    const check=async()=>{if(signal?.aborted)fail('operation_cancelled');await beforeAccept();if(signal?.aborted)fail('operation_cancelled');};
    await check();const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(()=>controller.abort(),timeoutMS);let reader;
    try{
      const reply=await fetchImpl(url.href,{method:'POST',redirect:'error',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({accessKeyHash}),signal:controller.signal});await check();
      if(!reply.ok||reply.redirected||!reply.body)fail('access_grant_unavailable');
      reader=reply.body.getReader();const chunks=[];let length=0;
      while(true){const row=await reader.read();await check();if(row.done)break;if(!(row.value instanceof Uint8Array)||(length+=row.value.byteLength)>8192)fail('invalid_access_grant');chunks.push(Buffer.from(row.value));}
      const bytes=Buffer.concat(chunks,length),grant=bytes.toString('utf8').trim();if(!Buffer.from(bytes.toString('utf8')).equals(bytes))fail('invalid_access_grant');
      const value=await validateLicense(grant,{keys:trust,now:now()});await check();
      if(value.version!==3||value.accessKeyHash!==accessKeyHash)fail('invalid_access_grant');return grant;
    }catch(error){
      if(signal?.aborted)fail('operation_cancelled');
      if(controller.signal.aborted)fail('activation_timeout');
      if(['invalid_license','invalid_license_time','invalid_access_grant','access_grant_unavailable','operation_cancelled'].includes(error.code))fail(error.code);
      fail('activation_unavailable');
    }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);await reader?.cancel().catch(()=>{});reader?.releaseLock();}
  };
}
