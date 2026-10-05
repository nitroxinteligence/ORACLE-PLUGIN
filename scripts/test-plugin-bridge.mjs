import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../Resources/web/plugin-bridge.js',import.meta.url),'utf8');
function harness({native=false,embedded=true}={}){
 const messages=[],events=[],listeners=new Map(),timers=new Map();let timerID=0;
 const env={innerWidth:960,innerHeight:720,document:{documentElement:{dataset:{}}},
  CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail;}},
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},
  removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
  dispatchEvent(event){events.push(event);for(const fn of listeners.get(event.type)||[])fn(event);},
  setTimeout(fn,ms){const id=++timerID;timers.set(id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);}
 };
 env.parent=embedded?{postMessage(message,origin){messages.push({message,origin});}}:env;
 if(native)env.webkit={messageHandlers:{oracle:{postMessage(){}}}};
 vm.runInNewContext(source,{window:env});
 // Drop default instance listeners; test factory with deterministic timing.
 env.OraclePluginBridge.dispose();events.length=0;
 const bridge=env.OraclePluginBridgeFactory(env,{timeoutMS:40,initializeTimeoutMS:20});
 const receive=(message,{origin='https://host.test',source=env.parent}={})=>{for(const fn of [...listeners.get('message')||[]])fn({source,origin,data:message});};
 const reply=(request,result)=>receive({jsonrpc:'2.0',id:request.id,result});
 const initialize=async(capabilities={serverTools:{}})=>{
  const promise=bridge.ready();const request=messages.at(-1).message;
  reply(request,{protocolVersion:'2026-01-26',hostCapabilities:capabilities,hostContext:{displayMode:'inline',availableDisplayModes:['inline','fullscreen']}});
  await promise;return request;
 };
 return {env,bridge,messages,events,timers,receive,reply,initialize};
}
const tick=async()=>{await Promise.resolve();await Promise.resolve();};
test('a refused initialization can recover on explicit retry without dispatching writes',async()=>{
 const h=harness();const first=h.bridge.call('boot');const init=h.messages.at(-1).message;
 h.receive({jsonrpc:'2.0',id:init.id,error:{code:-32000,message:'Host initializing'}});await assert.rejects(first,/initializing/);
 const retry=h.bridge.call('boot');const next=h.messages.at(-1).message;assert.equal(next.method,'ui/initialize');assert.notEqual(next.id,init.id);
 h.reply(next,{protocolVersion:'2026-01-26',hostCapabilities:{serverTools:{}}});await tick();
 const read=h.messages.at(-1).message;assert.equal(read.params.arguments.method,'boot');h.reply(read,{structuredContent:{value:{locked:false}}});assert.deepEqual(await retry,{locked:false});
 assert.equal(h.messages.filter(row=>row.message.method==='tools/call').length,1);h.bridge.dispose();
});
test('native and ordinary browser do not select plugin transport',async()=>{
 for(const setup of [{native:true},{embedded:false}]){const h=harness(setup);assert.equal(h.bridge.active(),false);await assert.rejects(h.bridge.call('boot'),/host MCP Apps/);assert.equal(h.messages.length,0);h.bridge.dispose();}
});
test('handshake precedes dispatch and preserves complete Oracle payload',async()=>{
 const h=harness();const response=h.bridge.call('read',{path:'SISTEMA/teste.md'});const init=h.messages[0].message;
 assert.equal(init.method,'ui/initialize');assert.equal(h.messages.length,1);
 h.reply(init,{protocolVersion:'2026-01-26',hostCapabilities:{serverTools:{}},hostContext:{displayMode:'fullscreen'}});await tick();
 assert.equal(h.messages[1].message.method,'ui/notifications/initialized');
 const req=h.messages.at(-1).message;assert.equal(req.method,'tools/call');
 assert.deepEqual(JSON.parse(JSON.stringify(req.params)),{name:'oracle_dispatch',arguments:{method:'read',params:{path:'SISTEMA/teste.md'}}});
 assert.equal(h.messages.at(-1).origin,'https://host.test');
 h.reply(req,{structuredContent:{value:{text:'nota sintética',hash:'test'}}});assert.equal((await response).text,'nota sintética');assert.equal(h.timers.size,0);h.bridge.dispose();
});
test('capability refusal and error envelopes never become successful operations',async()=>{
 const h=harness();await h.initialize({});await assert.rejects(h.bridge.call('boot'),/não disponibiliza/);h.bridge.dispose();
 const b=harness();await b.initialize();
 const p=b.bridge.call('write',{path:'test.md'});await tick();b.reply(b.messages.at(-1).message,{isError:true,content:[{type:'text',text:'Escrita recusada'}]});await assert.rejects(p,/Escrita recusada/);
 const invalid=b.bridge.call('boot');await tick();b.reply(b.messages.at(-1).message,{content:[]});await assert.rejects(invalid,/Resposta do Oracle inválida/);b.bridge.dispose();
});
test('spoofed frames and changed origins cannot resolve requests',async()=>{
 const h=harness();await h.initialize();const p=h.bridge.call('boot');await tick();const req=h.messages.at(-1).message;
 h.receive({jsonrpc:'2.0',id:req.id,result:{structuredContent:{value:42}}},{source:{}});
 h.receive({jsonrpc:'2.0',id:req.id,result:{structuredContent:{value:42}}},{origin:'https://other.test'});
 assert.equal(h.timers.size,1);h.reply(req,{structuredContent:{value:7}});assert.equal(await p,7);h.bridge.dispose();
});
test('bounded timeout cancels without retry; late replies are ignored',async()=>{
 const h=harness();await h.initialize();const p=h.bridge.call('save',{text:'synthetic'});await tick();const req=h.messages.at(-1).message;
 const rejection=assert.rejects(p,/não respondeu/);for(const {fn} of [...h.timers.values()])fn();await rejection;
 assert.equal(h.messages.at(-1).message.method,'notifications/cancelled');
 h.reply(req,{structuredContent:{value:true}});assert.equal(h.messages.filter(r=>r.message.method==='tools/call').length,1);h.bridge.dispose();
});
test('lock cancellation, host cancellation and teardown reject pending operations',async()=>{
 const h=harness();await h.initialize();const p=h.bridge.call('snapshot');await tick();h.bridge.cancelPending();await assert.rejects(p,/bloqueado/);
 const q=h.bridge.call('read');await tick();const request=h.messages.at(-1).message;h.receive({jsonrpc:'2.0',method:'notifications/cancelled',params:{requestId:request.id,reason:'Cancelado'}});await assert.rejects(q,/Cancelado/);
 const t=h.bridge.call('snapshot');await tick();h.receive({jsonrpc:'2.0',id:'teardown',method:'ui/resource-teardown'});await assert.rejects(t,/encerrada/);assert.equal(h.timers.size,0);await assert.rejects(h.bridge.call('snapshot'),/encerrada/);
 assert.ok(h.messages.some(r=>r.message.id==='teardown'&&r.message.result));
});
test('notifications stay local; only explicit share sends bounded selection metadata',async()=>{
 const h=harness();await h.initialize();h.receive({jsonrpc:'2.0',method:'ui/notifications/tool-input',params:{arguments:{path:'nota.md'}}});
 h.receive({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:{value:{text:'private'}}}});
 assert.deepEqual(h.events.slice(-2).map(e=>e.type),['oracle-plugin-tool-input','oracle-plugin-tool-result']);
 assert.equal(h.messages.some(r=>r.message.method==='ui/update-model-context'),false);
 const p=h.bridge.shareSelection({path:'test.md',title:'Teste',text:'private',vault:'/private',draft:'private'});await tick();const req=h.messages.at(-1).message;
 assert.deepEqual(JSON.parse(JSON.stringify(req.params)),{structuredContent:{oracle:{selection:{path:'test.md',title:'Teste'}}}});h.reply(req,{});await p;
 await assert.rejects(h.bridge.shareSelection({path:'../secret'}),/relativo válido/);h.bridge.dispose();
});
test('fullscreen is capability checked and follows actual host mode',async()=>{
 const h=harness();await h.initialize();const p=h.bridge.requestDisplayMode('fullscreen');await tick();h.reply(h.messages.at(-1).message,{mode:'inline'});assert.equal(await p,'inline');
 await assert.rejects(h.bridge.requestDisplayMode('pip'),/não está disponível/);h.receive({jsonrpc:'2.0',method:'ui/notifications/host-context-changed',params:{displayMode:'fullscreen'}});assert.equal(h.bridge.hostContext.displayMode,'fullscreen');h.bridge.dispose();
});
test('initialization timeout and unsupported protocol prevent dispatch',async()=>{
 const h=harness();const p=h.bridge.call('boot');const rejected=assert.rejects(p,/não respondeu/);for(const {fn} of [...h.timers.values()])fn();await rejected;assert.equal(h.messages.some(r=>r.message.method==='tools/call'),false);h.bridge.dispose();
 const b=harness();const q=b.bridge.ready();b.reply(b.messages.at(-1).message,{protocolVersion:'unsupported'});await assert.rejects(q,/versão/);b.bridge.dispose();
});
function captureFixture(h){
 let captured='',pngType='',captures=0;
 const copy={style:{setProperty(){}},querySelectorAll(){return [];},setAttribute(){}};
 const original={cloneNode(){return copy;},querySelectorAll(){return [];}};
 h.env.document.querySelector=selector=>selector==='#app'?original:null;h.env.document.body={};
 h.env.document.createElement=type=>{assert.equal(type,'canvas');return {getContext(){return {fillRect(){},drawImage(){}};},toBlob(callback,mime){captures++;pngType=mime;callback(new Blob(['synthetic PNG bytes'],{type:mime}));}};};
 h.env.getComputedStyle=()=>({length:0,backgroundColor:'#000'});h.env.HTMLInputElement=class {};
 h.env.XMLSerializer=class{serializeToString(){return '<div id="app"/>';}};
 h.env.Image=class{set src(value){captured=decodeURIComponent(value);this.onload();}};
 h.env.btoa=value=>Buffer.from(value,'binary').toString('base64');
 return {get captures(){return captures;},get captured(){return captured;},get pngType(){return pngType;}};
}
function respondExports(h,responder){
 const post=h.env.parent.postMessage;
 h.env.parent.postMessage=(message,origin)=>{post(message,origin);if(message.method==='tools/call')queueMicrotask(()=>{const {method,params}=message.params.arguments;try{h.reply(message,{structuredContent:{value:responder(method,params)}});}catch(error){h.reply(message,{isError:true,content:[{type:'text',text:error.message}]});}});};
}
test('export gates before raster and confirms only the native persisted path',async()=>{
 const h=harness();await h.initialize();const capture=captureFixture(h),methods=[];let saved;
 respondExports(h,(method,params)=>{methods.push(method);if(method==='exportSnapshotBegin'){assert.equal(capture.captures,0);return {exportID:'test-export'};}if(method==='exportSnapshotChunk'){assert.equal(params.exportID,'test-export');assert.equal(params.index,0);assert.equal(Buffer.from(params.base64,'base64').toString(),'synthetic PNG bytes');return {accepted:true};}if(method==='exportSnapshot'){assert.equal(capture.captures,1);return '/isolated/unused.png';}throw Error('Unexpected method');});
 // Delay final save reply to verify no success is fabricated after PNG creation.
 const post=h.env.parent.postMessage;h.env.parent.postMessage=(message,origin)=>{if(message.params?.arguments?.method==='exportSnapshot'){saved=message;h.messages.push({message,origin});}else post(message,origin);};
 let resolved=false;const result=h.bridge.call('exportSnapshot').then(value=>{resolved=true;return value;});
 for(let n=0;n<30&&!saved;n++)await new Promise(resolve=>setImmediate(resolve));
 assert.ok(saved);assert.equal(resolved,false);h.reply(saved,{structuredContent:{value:'/isolated/Oracle-universo.png'}});
 assert.equal(await result,'/isolated/Oracle-universo.png');assert.equal(capture.pngType,'image/png');assert.ok(capture.captured.includes('foreignObject')&&capture.captured.includes('id="app"'));assert.equal(h.timers.size,0);h.bridge.dispose();
});
test('export capability and native licence refusal prevent raster',async()=>{
 const unavailable=harness();await unavailable.initialize({});const capture=captureFixture(unavailable);await assert.rejects(unavailable.bridge.call('exportSnapshot'),/não disponibiliza/);assert.equal(capture.captures,0);unavailable.bridge.dispose();
 const h=harness();await h.initialize();const refused=captureFixture(h);respondExports(h,()=>{throw Error('Ative a licença');});await assert.rejects(h.bridge.call('exportSnapshot'),/licença/);assert.equal(refused.captures,0);h.bridge.dispose();
});
test('native chooser cancellation is null and failed write is never successful',async()=>{
 for(const outcome of [null,'failure','invalid']){
  const h=harness();await h.initialize();captureFixture(h);const methods=[];
  respondExports(h,method=>{methods.push(method);if(method==='exportSnapshotBegin')return {exportID:'export'};if(method==='exportSnapshotChunk')return {accepted:true};if(method==='exportSnapshotDiscard')return {discarded:true};if(outcome==='failure')throw Error('Gravação recusada');return outcome==='invalid'?true:null;});
  if(outcome===null)assert.equal(await h.bridge.call('exportSnapshot'),null);else await assert.rejects(h.bridge.call('exportSnapshot'),outcome==='failure'?/Gravação recusada/:/não confirmou a gravação/);
  await tick();assert.equal(methods.includes('exportSnapshotDiscard'),outcome!==null);h.bridge.dispose();
 }
});
test('unconfirmed chunk stops before chooser and discards its buffer',async()=>{
 const h=harness();await h.initialize();captureFixture(h);const methods=[];
 respondExports(h,method=>{methods.push(method);return method==='exportSnapshotBegin'?{exportID:'export'}:{};});
 await assert.rejects(h.bridge.call('exportSnapshot'),/não confirmou o recebimento/);await tick();assert.equal(methods.includes('exportSnapshot'),false);assert.ok(methods.includes('exportSnapshotDiscard'));h.bridge.dispose();
});
test('export timeout cancels a pending native chooser and discards without late success',async()=>{
 const h=harness();await h.initialize();captureFixture(h);let chooser;
 respondExports(h,method=>method==='exportSnapshotBegin'?{exportID:'export'}:{accepted:true});
 const post=h.env.parent.postMessage;h.env.parent.postMessage=(message,origin)=>{if(message.params?.arguments?.method==='exportSnapshot'){chooser=message;h.messages.push({message,origin});}else post(message,origin);};
 const result=h.bridge.call('exportSnapshot');const rejected=assert.rejects(result,/não respondeu/);
 for(let n=0;n<30&&!chooser;n++)await new Promise(resolve=>setImmediate(resolve));assert.ok(chooser);
 const localTimer=[...h.timers.values()][0];localTimer.fn();await rejected;await tick();
 assert.ok(h.messages.some(r=>r.message.method==='notifications/cancelled'&&r.message.params.requestId===chooser.id));
 assert.ok(h.messages.some(r=>r.message.params?.arguments?.method==='exportSnapshotDiscard'));
 h.reply(chooser,{structuredContent:{value:'/isolated/late.png'}});h.bridge.dispose();
});
test('full UI loads transport before app and preserves active SVG renderer',()=>{
 const html=readFileSync(new URL('../Resources/web/index.html',import.meta.url),'utf8');
 assert.ok(html.indexOf('src="plugin-bridge.js"')<html.indexOf('src="app.js"'));
 assert.ok(html.includes('src="atlas.js"')&&html.includes('id="atlas"')&&html.includes('id="graph-page"'));
 new vm.Script(readFileSync(new URL('../Resources/web/app.js',import.meta.url),'utf8'));
});
test('plugin updater accepts its verified transport row and preserves native download gate',()=>{
 const app=readFileSync(new URL('../Resources/web/app.js',import.meta.url),'utf8');
 const functionSource=app.slice(app.indexOf('function oracleInstallable(row){'),app.indexOf('function updateRowMarkup(row){'));
 const check=(active,row)=>vm.runInNewContext(functionSource+';oracleInstallable(row)',{window:{OraclePluginBridge:{active:()=>active}},URL,row});
 const plugin={id:'oracle',channel:'desktop-plugin',pluginUpdate:true,status:'install_available',version:'1.0.1'};
 assert.equal(check(true,plugin),true);assert.equal(check(false,plugin),false);
 for(const changes of [{version:'latest'},{channel:'developer'},{status:'available'},{id:'skills'},{pluginUpdate:false}])assert.equal(check(true,{...plugin,...changes}),false);
 const native={id:'oracle',status:'install_available',version:'1.0.1',downloadSHA256:'sha256:'+'a'.repeat(64),downloadURL:'https://github.com/nitroxinteligence/ORACLE/releases/download/v1.0.1/Oracle-1.0.1-macos-arm64.zip'};
 assert.equal(check(false,native),true);assert.equal(check(false,{...native,downloadSHA256:''}),false);assert.equal(check(false,{...native,downloadURL:'https://example.com/app.zip'}),false);
});
test('teardown waits for draft preparation, refuses failure and allows retry',async()=>{
 const h=harness();await h.initialize();let finish;
 h.env.oraclePrepareToClose=()=>new Promise(resolve=>{finish=resolve;});
 h.receive({jsonrpc:'2.0',id:'draft-teardown',method:'ui/resource-teardown'});await tick();
 assert.equal(h.messages.some(r=>r.message.id==='draft-teardown'),false);
 finish(true);await tick();await tick();
 assert.ok(h.messages.some(r=>r.message.id==='draft-teardown'&&r.message.result));
 await assert.rejects(h.bridge.call('snapshot'),/encerrada/);
 const failed=harness();await failed.initialize();failed.env.oraclePrepareToClose=()=>Promise.reject(Error('Rascunho recusado'));
 failed.receive({jsonrpc:'2.0',id:'failed-teardown',method:'ui/resource-teardown'});await tick();await tick();await tick();
 assert.ok(failed.messages.some(r=>r.message.id==='failed-teardown'&&r.message.error?.message==='Rascunho recusado'));
 assert.equal(failed.events.some(e=>e.type==='oracle-plugin-teardown'),false);
 failed.env.oraclePrepareToClose=async()=>true;failed.receive({jsonrpc:'2.0',id:'retry-teardown',method:'ui/resource-teardown'});await tick();await tick();await tick();
 assert.ok(failed.messages.some(r=>r.message.id==='retry-teardown'&&r.message.result));
});

test('compact app RPC content preserves complete structured note payload',async()=>{
 const h=harness();await h.initialize();
 const value={text:'synthetic note '.repeat(100000),hash:'complete-note-hash'};
 const response=h.bridge.call('read',{path:'synthetic.md'});await tick();
 h.reply(h.messages.at(-1).message,{content:[{type:'text',text:'Ação Oracle concluída.'}],structuredContent:{value},_meta:{'oracle/dispatch':{method:'read'}}});
 const decoded=await response;assert.equal(decoded.text,value.text);assert.equal(decoded.hash,value.hash);h.bridge.dispose();
});
