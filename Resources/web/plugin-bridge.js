/* MCP Apps transport for the complete Oracle UI. No note data is published
 * to model context automatically. Native WKWebView keeps its existing bridge. */
(function (root) {
 'use strict';
 const PROTOCOL='2026-01-26',MAX_PENDING=128;
 const slowMethods=new Set(['gbrainRead','onboardingConnect','codexPlugins','codexPluginsRefresh']);
 function createBridge(env,options={}) {
  const pending=new Map();let sequence=0,initialization=null,initialized=false,disposed=false,origin=null;
  let capabilities={},hostContext={},teardownTask=null;
  const timeoutMS=options.timeoutMS||90000,initializeTimeoutMS=options.initializeTimeoutMS||15000;
  const embedded=()=>!!env.parent&&env.parent!==env;
  const active=()=>!env.webkit?.messageHandlers?.oracle&&embedded();
  function send(message){env.parent.postMessage(message,origin||'*');}
  function notify(method,params={}){send({jsonrpc:'2.0',method,params});}
  function emit(type,detail){env.dispatchEvent(new env.CustomEvent('oracle-plugin-'+type,{detail}));}
  function cancel(id,reason){try{notify('notifications/cancelled',{requestId:id,reason});}catch{}}
  function cancelPending(reason='Oracle bloqueado'){
   for(const [id,item] of pending){env.clearTimeout(item.timeout);pending.delete(id);if(!item.local)cancel(id,reason);item.reject(Error(reason));}
  }
  function request(method,params={},milliseconds=timeoutMS,scope){
   if(disposed)return Promise.reject(Error('A interface do Oracle foi encerrada. Reabra o plugin.'));
   if(pending.size>=MAX_PENDING)return Promise.reject(Error('Há operações demais em andamento. Aguarde as respostas atuais.'));
   return new Promise((resolve,reject)=>{
    const id='oracle-ui-'+(++sequence);scope?.add(id);
    const complete=fn=>value=>{scope?.delete(id);fn(value);};resolve=complete(resolve);reject=complete(reject);
    const timeout=env.setTimeout(()=>{pending.delete(id);cancel(id,'timeout');reject(Error('A operação não respondeu a tempo. Confira o estado antes de repetir.'));},milliseconds);
    pending.set(id,{resolve,reject,timeout});
    try{send({jsonrpc:'2.0',id,method,params});}catch(error){env.clearTimeout(timeout);pending.delete(id);reject(error);}
   });
  }
  function applyContext(next){
   hostContext={...hostContext,...next};
   if(env.document?.documentElement)env.document.documentElement.dataset.oracleDisplayMode=hostContext.displayMode||'inline';
   emit('host-context',hostContext);
  }
  function ready(){
   if(!active())return Promise.reject(Error('Abra o Oracle no aplicativo macOS ou em um host MCP Apps compatível.'));
   if(disposed)return Promise.reject(Error('A interface do Oracle foi encerrada. Reabra o plugin.'));
   if(!initialization){
    initialization=request('ui/initialize',{protocolVersion:PROTOCOL,appInfo:{name:'Oracle',version:'1.0.0'},appCapabilities:{availableDisplayModes:['inline','fullscreen']}},initializeTimeoutMS).then(result=>{
     if(result?.protocolVersion!==PROTOCOL)throw Error('O host não suporta esta versão do protocolo MCP Apps.');
     capabilities=result.hostCapabilities||{};initialized=true;
     notify('ui/notifications/initialized');applyContext(result.hostContext||{});reportSize();return result;
    }).catch(error=>{initialization=null;throw error;});
   }
   return initialization;
  }
  function unwrap(result){
   if(result?.isError)throw Error(result.content?.filter(item=>item.type==='text').map(item=>item.text).join('\n')||'Não foi possível concluir a operação.');
   if(!result?.structuredContent||!Object.prototype.hasOwnProperty.call(result.structuredContent,'value'))throw Error('Resposta do Oracle inválida. Confira o estado antes de repetir.');
   return result.structuredContent.value;
  }
  async function exportSnapshot(stillActive){
   const original=env.document.querySelector('#app');
   if(!original||!env.Image)throw Error('A imagem da interface ainda não está disponível para exportar neste host.');
   const rasterLayers=[],copy=original.cloneNode(true),sourceNodes=[original,...original.querySelectorAll('*')],copyNodes=[copy,...copy.querySelectorAll('*')];
   // Capture the complete visible interface, as the native WKWebView snapshot
   // does. Keep styles local and preserve the existing PNG export contract.
   sourceNodes.forEach((node,index)=>{const computed=env.getComputedStyle(node),target=copyNodes[index];for(let n=0;n<computed.length;n++){const property=computed[n];target.style.setProperty(property,computed.getPropertyValue(property).replace(/url\(["']?[^)"']*#([^)"']+)["']?\)/g,'url(#$1)'));}if(node instanceof env.HTMLInputElement)target.setAttribute('value',node.value);});

   // SVG-image renderers can drop referenced filters on HTML images. Flatten
   // the existing alpha matrix into the copy, using the original image bytes.
   sourceNodes.forEach((node,index)=>{
    if(node.tagName!=='IMG'||!env.getComputedStyle(node).filter.includes('metallic-background-alpha'))return;
    const matrix=env.document.querySelector('#metallic-background-alpha feColorMatrix')?.getAttribute('values')?.trim().split(/\s+/).map(Number);
    if(!matrix||matrix.length!==20||!node.naturalWidth)return;
    const bitmap=env.document.createElement('canvas');bitmap.width=node.naturalWidth;bitmap.height=node.naturalHeight;
    const bitmapContext=bitmap.getContext('2d');bitmapContext.drawImage(node,0,0);const pixels=bitmapContext.getImageData(0,0,bitmap.width,bitmap.height);
    for(let n=0;n<pixels.data.length;n+=4){const data=pixels.data;data[n+3]=Math.max(0,Math.min(255,matrix[15]*data[n]+matrix[16]*data[n+1]+matrix[17]*data[n+2]+matrix[18]*data[n+3]+matrix[19]*255));}
    bitmapContext.putImageData(pixels,0,0);copyNodes[index].style.setProperty('visibility','hidden');rasterLayers.push({bitmap,node});
   });
   copy.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
   const width=Math.max(1,Math.round(env.innerWidth)),height=Math.max(1,Math.round(env.innerHeight));
   const serializer=new env.XMLSerializer(),documentText=serializer.serializeToString(copy),globalDefs=env.document.querySelector('body > svg > defs');
   const definitions=globalDefs?serializer.serializeToString(globalDefs):'';
   const fontRules=[];for(const sheet of env.document.styleSheets||[]){try{for(const rule of sheet.cssRules)if(rule.type===5)fontRules.push(rule.cssText);}catch{}}
   const fonts=env.document.createElementNS?.('http://www.w3.org/2000/svg','style');if(fonts)fonts.textContent=fontRules.join('\n');
   const fontStyles=fonts?serializer.serializeToString(fonts):'';
   const image=new env.Image();
   const serialized='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'">'+fontStyles+definitions+'<foreignObject width="100%" height="100%">'+documentText+'</foreignObject></svg>';
   await new Promise((resolve,reject)=>{const timeout=env.setTimeout(()=>reject(Error('A exportação da imagem não respondeu a tempo.')),15000);image.onload=()=>{env.clearTimeout(timeout);resolve();};image.onerror=()=>{env.clearTimeout(timeout);reject(Error('Este host não permite capturar a interface como PNG. Exporte pelo aplicativo macOS.'));};image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(serialized);});
   const scale=Math.max(1,Math.min(3,env.devicePixelRatio||1)),canvas=env.document.createElement('canvas');canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
   const context=canvas.getContext('2d');if(!context)throw Error('Este host não disponibiliza exportação PNG.');
   context.fillStyle=env.getComputedStyle(env.document.body).backgroundColor;context.fillRect(0,0,canvas.width,canvas.height);
   let blob;
   try{context.drawImage(image,0,0,canvas.width,canvas.height);for(const {bitmap,node} of rasterLayers){const bounds=node.getBoundingClientRect(),fit=Math.min(bounds.width/bitmap.width,bounds.height/bitmap.height),w=bitmap.width*fit,h=bitmap.height*fit;context.drawImage(bitmap,(bounds.left+(bounds.width-w)/2)*scale,(bounds.top+(bounds.height-h)/2)*scale,w*scale,h*scale);}blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));}catch{throw Error('Este host não permite capturar a interface como PNG. Exporte pelo aplicativo macOS.');}
   if(!blob)throw Error('Não foi possível gerar a imagem PNG.');
   if(!stillActive())throw Error('Exportação cancelada.');
   return blob;
  }
  function dispatch(method,params={},scope){
   return request('tools/call',{name:'oracle_dispatch',arguments:{method,params}},slowMethods.has(method)?Math.max(timeoutMS,120000):timeoutMS,scope).then(unwrap);
  }
  async function saveSnapshot(stillActive,scope){
   let exportID;
   const check=()=>{if(!stillActive())throw Error('Exportação cancelada.');};
   try{
    check();const receipt=await dispatch('exportSnapshotBegin',{},scope);
    if(typeof receipt?.exportID!=='string'||!receipt.exportID)throw Error('Não foi possível iniciar a exportação.');
    exportID=receipt.exportID;check();
    const blob=await exportSnapshot(stillActive);
    if(blob.size>32*1024*1024)throw Error('A imagem excede o limite de exportação de 32 MiB.');
    const bytes=new Uint8Array(await blob.arrayBuffer());check();
    for(let offset=0,index=0;offset<bytes.length;offset+=256*1024,index++){
     check();let binary='';for(const byte of bytes.subarray(offset,offset+256*1024))binary+=String.fromCharCode(byte);
     const accepted=await dispatch('exportSnapshotChunk',{exportID,index,base64:env.btoa(binary)},scope);
     if(accepted?.accepted!==true)throw Error('O Oracle não confirmou o recebimento da imagem.');
    }
    check();const path=await dispatch('exportSnapshot',{exportID},scope);check();
    if(path!==null&&(typeof path!=='string'||!path.startsWith('/')))throw Error('O Oracle não confirmou a gravação da imagem.');
    exportID=null;return path;
   }finally{
    // Failed transfers never claim a saved file. The backend also expires
    // orphaned buffers when the frame vanishes before cleanup can be sent.
    if(exportID&&!disposed)void dispatch('exportSnapshotDiscard',{exportID}).catch(()=>{});
   }
  }

  function runExport(){
   if(pending.size>=MAX_PENDING)return Promise.reject(Error('Há operações demais em andamento. Aguarde as respostas atuais.'));
   return new Promise((resolve,reject)=>{
    const scope=new Set(),id='oracle-local-'+(++sequence);
    const abort=()=>{for(const requestID of scope){const item=pending.get(requestID);if(!item)continue;pending.delete(requestID);env.clearTimeout(item.timeout);cancel(requestID,'Exportação cancelada');item.reject(Error('Exportação cancelada.'));}};
    const timeout=env.setTimeout(()=>{pending.delete(id);abort();reject(Error('A exportação da imagem não respondeu a tempo.'));},timeoutMS);
    pending.set(id,{resolve,reject:error=>{abort();reject(error);},timeout,local:true});
    const finish=(error,value)=>{const item=pending.get(id);if(!item)return;pending.delete(id);env.clearTimeout(timeout);error?reject(error):resolve(value);};
    saveSnapshot(()=>pending.has(id)&&!disposed,scope).then(value=>finish(null,value),error=>finish(error));
   });
  }
  async function call(method,params={}){
   await ready();
   if(disposed)throw Error('A interface do Oracle foi encerrada. Reabra o plugin.');
   if(!capabilities.serverTools)throw Error('Este host não disponibiliza as ferramentas do Oracle para a interface.');
   if(method==='exportSnapshot')return runExport();
   return dispatch(method,params);
  }
  async function requestDisplayMode(mode){
   await ready();
   if(!['inline','fullscreen'].includes(mode)||!hostContext.availableDisplayModes?.includes(mode))throw Error('Este modo de exibição não está disponível no host.');
   const result=await request('ui/request-display-mode',{mode});applyContext({displayMode:result.mode});return result.mode;
  }
  async function shareSelection(selection){
   await ready();
   const path=selection?.path;
   if(typeof path!=='string'||!path||path.length>2048||path.startsWith('/')||path.includes('\\')||path.split('/').includes('..')||/^[a-z]:/i.test(path))throw Error('Selecione uma nota com caminho relativo válido.');
   // This method is called only by an explicit user action. Never send note
   // contents, drafts, absolute vault paths, credentials or the full snapshot.
   return request('ui/update-model-context',{structuredContent:{oracle:{selection:{path,title:String(selection.title||'').slice(0,256)}}}});
  }
  function reportSize(){
   if(!initialized||disposed)return;
   try{notify('ui/notifications/size-changed',{width:Math.round(env.innerWidth||0),height:Math.round(env.innerHeight||0)});}catch{}
  }
  function dispose(reason='A interface do Oracle foi encerrada.'){
   if(disposed)return;disposed=true;cancelPending(reason);
   env.removeEventListener('message',receive);env.removeEventListener('pagehide',onPageHide);env.removeEventListener('resize',reportSize);
   emit('teardown',{reason});
  }
  function onPageHide(){dispose();}
  async function teardown(message){
   if(!teardownTask){
    teardownTask=new Promise((resolve,reject)=>{
     const timeout=env.setTimeout(()=>reject(Error('Não foi possível guardar o rascunho antes de fechar. Volte ao editor e tente novamente.')),15000);
     Promise.resolve().then(()=>env.oraclePrepareToClose?.()??true).then(prepared=>{if(prepared!==true)throw Error('O Oracle ainda não está pronto para fechar.');resolve();}).catch(reject).finally(()=>env.clearTimeout(timeout));
    });
   }
   try{
    await teardownTask;
    if(message.id!==undefined)send({jsonrpc:'2.0',id:message.id,result:{}});
    dispose();
   }catch(error){
    teardownTask=null;
    if(message.id!==undefined)send({jsonrpc:'2.0',id:message.id,error:{code:-32000,message:error.message}});
    emit('teardown-error',{reason:error.message});
   }
  }

  function receive(event){
   if(!active()||disposed||event.source!==env.parent)return;
   const message=event.data;
   if(!message||message.jsonrpc!=='2.0'||(origin&&event.origin!==origin))return;
   if(message.id!==undefined&&!message.method){
    const item=pending.get(message.id);if(!item)return;
    if(!origin&&event.origin&&event.origin!=='null')origin=event.origin;
    pending.delete(message.id);env.clearTimeout(item.timeout);
    if(message.error)item.reject(Error(message.error.message||'O host recusou a operação.'));else item.resolve(message.result);
    return;
   }
   if(!initialized)return;
   if(message.method==='ui/resource-teardown'){
    void teardown(message);return;
   }
   if(message.method==='ui/notifications/host-context-changed'){applyContext(message.params||{});return;}
   if(message.method==='ui/notifications/tool-input'){emit('tool-input',message.params?.arguments||{});return;}
   if(message.method==='ui/notifications/tool-result'){emit('tool-result',message.params||{});return;}
   if(message.method==='ui/notifications/tool-cancelled'){emit('tool-cancelled',{reason:message.params?.reason||'Operação cancelada pelo host.'});return;}
   if(message.method==='notifications/cancelled'){
    const item=pending.get(message.params?.requestId);if(!item)return;pending.delete(message.params.requestId);env.clearTimeout(item.timeout);item.reject(Error(message.params.reason||'Operação cancelada pelo host.'));return;
   }
   if(message.method==='ping'&&message.id!==undefined){send({jsonrpc:'2.0',id:message.id,result:{}});return;}
   if(message.id!==undefined&&message.method)send({jsonrpc:'2.0',id:message.id,error:{code:-32601,message:'Method not found'}});
  }
  env.addEventListener('message',receive);env.addEventListener('pagehide',onPageHide);env.addEventListener('resize',reportSize);
  return {active,ready,call,cancelPending,dispose,shareSelection,requestDisplayMode,get initialized(){return initialized;},get hostContext(){return {...hostContext};}};
 }
 root.OraclePluginBridgeFactory=createBridge;
 root.OraclePluginBridge=createBridge(root);
})(window);
