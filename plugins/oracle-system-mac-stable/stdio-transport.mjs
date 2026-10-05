import {randomUUID} from 'node:crypto';
import {createInterface} from 'node:readline';
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const rpcError=(message,code=-32602)=>Object.assign(new Error(message),{code});

export function startStdio(server,{input=process.stdin,output=process.stdout,maxBytes=4_000_000,maxPending=128,onDrain,onEnd,onOutputError}={}) {
  const requests=new Map(),peerRequests=new Map(),peerSessionID=randomUUID();let writable=true,closed=false,ended=false,protocolReady=false,elicitationAvailable=false;
  const drained=()=>{if(ended&&!closed&&requests.size===0)onDrain?.();};
  const send=value=>{if(writable)output.write(JSON.stringify(value)+'\n');};
  const requestPeer=(method,params,{signal}={})=>{if(method!=='elicitation/create'||!elicitationAvailable||!protocolReady||closed||!writable||signal?.aborted)return Promise.reject(rpcError('O host não disponibilizou confirmação humana.'));if(peerRequests.size>=8)return Promise.reject(rpcError('Há muitas confirmações pendentes.'));const id='oracle-consent-'+randomUUID();return new Promise((resolve,reject)=>{const key=JSON.stringify(id),cleanup=()=>{clearTimeout(timer);peerRequests.delete(key);signal?.removeEventListener('abort',abort);},abort=()=>{cleanup();reject(rpcError('Confirmação cancelada.'));},timer=setTimeout(abort,30000);peerRequests.set(key,{resolve:value=>{cleanup();resolve(value);},reject:error=>{cleanup();reject(error);}});signal?.addEventListener('abort',abort,{once:true});send({jsonrpc:'2.0',id,method,params});});};
  server.setMCPPeer?.({requestPeer,sessionID:peerSessionID,elicitationAvailable:()=>elicitationAvailable&&protocolReady&&!closed});
  const unsubscribeTools=server.onToolsChanged?.(()=>{if(protocolReady)send({jsonrpc:'2.0',method:'notifications/tools/list_changed'});});
  const failOutput=()=>{writable=false;for(const controller of requests.values())controller.abort();for(const target of peerRequests.values())target.reject(rpcError('O host encerrou a confirmação.'));server.clearMCPPeer?.();};
  output.on('error',()=>{failOutput();onOutputError?.();});
  const lines=createInterface({input,crlfDelay:Infinity});
  lines.on('line',line=>{
    let message;
    try{
      if(Buffer.byteLength(line)>maxBytes)throw rpcError('Pedido excede o limite de tamanho.');
      try{message=JSON.parse(line);}catch{throw rpcError('JSON inválido.',-32700);}
      if(object(message)&&message.jsonrpc==='2.0'&&message.method===undefined&&peerRequests.has(JSON.stringify(message.id))){const target=peerRequests.get(JSON.stringify(message.id));if(Object.keys(message).some(key=>!['jsonrpc','id','result','error'].includes(key))||Object.hasOwn(message,'result')===Object.hasOwn(message,'error')||Buffer.byteLength(JSON.stringify(message))>4096)throw rpcError('Resposta de confirmação inválida.');if(message.error)target.reject(rpcError('O host recusou a confirmação.'));else target.resolve(message.result);return;}
      if(!object(message)||message.jsonrpc!=='2.0'||typeof message.method!=='string'||(message.id!==undefined&&message.id!==null&&typeof message.id!=='string'&&typeof message.id!=='number'))throw rpcError('Pedido JSON-RPC inválido.',-32600);
    }catch(error){send({jsonrpc:'2.0',id:null,error:{code:error.code,message:error.message}});return;}
    if(message.id===undefined){
      if(message.method==='notifications/initialized')protocolReady=true;
      if(message.method==='notifications/cancelled')requests.get(JSON.stringify(message.params?.requestId))?.abort();
      return;
    }
    if(message.method==='initialize')elicitationAvailable=object(message.params?.capabilities?.elicitation);
    const key=JSON.stringify(message.id);
    if(requests.has(key)){send({jsonrpc:'2.0',id:message.id,error:{code:-32600,message:'Identificador de pedido repetido.'}});return;}
    if(requests.size>=maxPending){send({jsonrpc:'2.0',id:message.id,error:{code:-32000,message:'Limite de operações simultâneas atingido.'}});return;}
    const controller=new AbortController();requests.set(key,controller);
    Promise.resolve().then(()=>server.request(message.method,message.params??{},{requestID:message.id,signal:controller.signal,peerSessionID})).then(result=>send({jsonrpc:'2.0',id:message.id,result}),error=>send({jsonrpc:'2.0',id:message.id,error:{code:Number.isInteger(error.code)?error.code:-32603,message:error.message}})).finally(()=>{requests.delete(key);drained();});
  });
  const close=()=>{if(closed)return;closed=true;unsubscribeTools?.();server.clearMCPPeer?.();for(const target of peerRequests.values())target.reject(rpcError('O host encerrou a confirmação.'));for(const controller of requests.values())controller.abort();lines.close();};
  lines.on('close',()=>{ended=true;onEnd?.();server.clearMCPPeer?.();for(const target of peerRequests.values())target.reject(rpcError('O host encerrou a confirmação.'));drained();});
  // Drain accepted requests on EOF. Explicit cancellation and shutdown abort
  // them without promising that a committed write was rolled back.
  return {close};
}
