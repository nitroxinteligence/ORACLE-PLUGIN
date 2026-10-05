import {startStdio} from './stdio-transport.mjs';
import {initializeResult,baseTools} from './mcp-metadata.mjs';

const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const cancelled=()=>Object.assign(new Error('Inicialização Oracle cancelada.'),{code:-32603});
function waitFor(promise,signal){
  if(signal?.aborted)return Promise.reject(cancelled());
  return new Promise((resolve,reject)=>{
    const abort=()=>{signal?.removeEventListener('abort',abort);reject(cancelled());};
    signal?.addEventListener('abort',abort,{once:true});
    promise.then(value=>{signal?.removeEventListener('abort',abort);resolve(value);},error=>{signal?.removeEventListener('abort',abort);reject(error);});
  });
}

// Only these static modules are evaluated before admission. loadServer owns
// complete payload verification and must return a handler, never start STDIO.
export function startRuntimeBootstrap({loadServer,signal,icons=[],version='1.0.0',input=process.stdin,output=process.stdout,onError,onClose,...transportOptions}={}){
  if(typeof loadServer!=='function')throw new TypeError('Carregador Oracle ausente.');
  const controller=new AbortController(),listeners=new Set();
  let server,peer,unsubscribe,transport,admissionError,closed=false,closing;
  const report=error=>{try{onError?.(error);}catch{}};
  const close=()=>{
    if(closed)return closing;
    closed=true;controller.abort();signal?.removeEventListener('abort',abort);
    unsubscribe?.();server?.clearMCPPeer?.();transport?.close();
    // A stalled admission must not hold shutdown open. If it resolves later,
    // the ready continuation closes its returned service without exposing it.
    closing=Promise.resolve().then(()=>server?.close?.()).finally(()=>onClose?.());
    closing.catch(report);return closing;
  };
  const abort=()=>{void close();};
  const loading=Promise.resolve().then(()=>{
    if(controller.signal.aborted)throw cancelled();
    return loadServer({signal:controller.signal});
  }).then(async value=>{
    if(typeof value?.request!=='function')throw new TypeError('Servidor Oracle ausente.');
    if(closed){await value.close?.();throw cancelled();}
    server=value;
    if(peer)server.setMCPPeer?.(peer);
    unsubscribe=server.onToolsChanged?.(()=>{for(const listener of listeners)listener();});
    for(const listener of listeners)listener();
    return server;
  });
  const ready=waitFor(loading,controller.signal);
  ready.catch(error=>{admissionError=error;if(!closed&&!controller.signal.aborted)report(error);});
  const handler={
    setMCPPeer(value){peer=value;server?.setMCPPeer?.(value);},
    clearMCPPeer(){peer=null;server?.clearMCPPeer?.();},
    onToolsChanged(listener){listeners.add(listener);return()=>listeners.delete(listener);},
    async request(method,params={},context={}){
      if(!object(params))throw Object.assign(new Error('Parâmetros MCP inválidos.'),{code:-32602});
      if(closed||controller.signal.aborted||context.signal?.aborted)throw cancelled();
      if(method==='initialize')return initializeResult(params,{icons,version});
      if(method==='ping')return {};
      if(admissionError)throw admissionError;
      if(method==='tools/list'&&!server)return {tools:baseTools({icons})};
      const admitted=await waitFor(ready,context.signal);
      if(closed||controller.signal.aborted||context.signal?.aborted)throw cancelled();
      return admitted.request(method,params,context);
    }
  };
  transport=startStdio(handler,{...transportOptions,input,output,onEnd:()=>{
    // Before admission there are no accepted product writes to drain. Once
    // admitted, preserve the normal transport's EOF drain semantics.
    if(!server)controller.abort();
  },onDrain:abort,onOutputError:abort});
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)abort();
  return {close,ready,signal:controller.signal};
}
