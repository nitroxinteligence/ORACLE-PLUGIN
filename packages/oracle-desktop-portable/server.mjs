import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createUIResource} from './ui-resource.mjs';
import {startStdio} from './stdio-transport.mjs';
import {initializeResult,baseTools,uiMeta} from './mcp-metadata.mjs';
export {startStdio} from './stdio-transport.mjs';
export {uiMeta} from './mcp-metadata.mjs';

const root=dirname(fileURLToPath(import.meta.url));
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const rpcError=(message,code=-32602)=>Object.assign(new Error(message),{code});


export function createMCPServer({dispatcher,memoryTools,aiMemoryTools,memoryWriteBroker,webRoot=resolve(root,'../../Resources/web'),icons=[],version='1.0.0'}={}) {
  if(typeof dispatcher?.dispatch!=='function')throw new TypeError('Dispatcher Oracle ausente.');
  const resource=createUIResource({webRoot});
  return {
    setMCPPeer:options=>memoryWriteBroker?.setTransport(options),clearMCPPeer:()=>memoryWriteBroker?.clearTransport(),
    onToolsChanged:listener=>{const remove=[memoryTools?.onChange?.(listener),aiMemoryTools?.onChange?.(listener)];return ()=>remove.forEach(fn=>fn?.());},
    async request(method,params={},context={}) {
      if(!object(params))throw rpcError('Parâmetros MCP inválidos.');
      switch(method) {
        case 'initialize':return initializeResult(params,{icons,version,listChanged:!!(memoryTools?.onChange||aiMemoryTools?.onChange)});
        case 'ping':return {};
        case 'tools/list':return {tools:[...baseTools({icons})
        ,...await memoryTools?.tools({signal:context.signal})||[],...await aiMemoryTools?.tools({signal:context.signal})||[]].map(tool=>({...tool,icons:tool.icons?.length?tool.icons:icons}))};
        case 'resources/list':{const listing=resource.list();return {...listing,resources:listing.resources.map(item=>({...item,icons}))};}
        case 'resources/read':return resource.read(params.uri);
        case 'tools/call':{
          try {
            const args=params.arguments??{};
            if(!object(args))throw rpcError('Argumentos Oracle inválidos.');
            if(params.name==='oracle_open'){
              if(Object.keys(args).length)throw rpcError('Esta ferramenta não aceita argumentos.');
              // Opening the resource is not a claim of license/vault readiness.
              return {content:[{type:'text',text:'Interface Oracle disponível. O acesso será verificado ao abrir.'}],structuredContent:{value:{resourceAvailable:true}},_meta:uiMeta};
            }
            if(typeof params.name==='string'&&params.name.startsWith('oracle_ai_memory_')){if(!aiMemoryTools)throw rpcError('O serviço AI Memory autorizado está indisponível.');const requestID=context.requestID===undefined?undefined:String(context.requestID),hostRequestContext=memoryWriteBroker?.contextFor(params.name,args,requestID,context);return await aiMemoryTools.invoke(params.name,args,{signal:context.signal,requestID,hostRequestContext});}
            if(typeof params.name==='string'&&params.name.startsWith('oracle_memory_')){if(!memoryTools)throw rpcError('A conexão autorizada da memória está indisponível.');const requestID=context.requestID===undefined?undefined:String(context.requestID),hostRequestContext=memoryWriteBroker?.contextFor(params.name,args,requestID,context);return await memoryTools.invoke(params.name,args,{signal:context.signal,requestID,hostRequestContext});}
            if(params.name!=='oracle_dispatch')throw rpcError('Ferramenta desconhecida.');
            if(Object.keys(args).some(key=>!['method','params'].includes(key)))throw rpcError('Pedido Oracle inválido.');
            const value=await dispatcher.dispatch(args.method,args.params??{},context);
            return {content:[{type:'text',text:'Ação Oracle concluída.'}],structuredContent:{value},_meta:{'oracle/dispatch':{method:args.method}}};
          }catch(error){return {content:[{type:'text',text:error.message||'Não foi possível concluir a operação.'}],isError:true,_meta:{'oracle/error':{code:typeof error.code==='string'||Number.isInteger(error.code)?error.code:'operation_failed'},...(params.name==='oracle_dispatch'?{'oracle/dispatch':{method:typeof params.arguments?.method==='string'?params.arguments.method.slice(0,80):''}}:{})}};}
        }
        default:throw rpcError('Método MCP desconhecido.',-32601);
      }
    }
  };
}

export async function createPortableServer({signal,icons,version,hostPackageRoot}={}) {
  if(signal?.aborted)throw new Error('Inicialização Oracle cancelada.');
  const serviceModule=await import('./service.mjs');
  const service=await serviceModule.createService({root,hostPackageRoot});
  let closing;
  const close=()=>closing??=Promise.resolve().then(()=>service.close?.());
  try{
    if(signal?.aborted)throw new Error('Inicialização Oracle cancelada.');
    version??=JSON.parse(readFileSync(resolve(root,'plugin.json'),'utf8')).version;
    icons??=[{src:`data:image/png;base64,${readFileSync(resolve(root,'assets/icon-mono.png')).toString('base64')}`,mimeType:'image/png',sizes:['1254x1254']}];
    return {...createMCPServer({...service,icons,version}),close};
  }catch(error){await close();throw error;}
}

export async function startPortableServer({signal,...options}={}) {
  const server=await createPortableServer({signal,...options});
  let transport,closing;
  const close=()=>{
    if(closing)return closing;
    signal?.removeEventListener('abort',abort);
    transport?.close();
    return closing=server.close();
  };
  const abort=()=>{void close().catch(error=>{process.stderr.write(`Oracle: ${error.message}\n`);process.exitCode=1;});};
  transport=startStdio(server,{onDrain:abort});
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)await close();
  return {close};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const controller=new AbortController();
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>controller.abort());
  startPortableServer({signal:controller.signal}).catch(error=>{process.stderr.write(`Oracle: ${error.message}\n`);process.exitCode=1;});
}
