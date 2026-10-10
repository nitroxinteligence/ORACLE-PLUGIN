import test from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {setImmediate as turn} from 'node:timers/promises';
import {startRuntimeBootstrap} from '../packages/oracle-desktop-portable/runtime-bootstrap.mjs';
import {baseTools,initializeResult} from '../packages/oracle-desktop-portable/mcp-metadata.mjs';

function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function fixture(options){
 const input=new PassThrough(),output=new PassThrough(),messages=[];let pending='';
 output.on('data',chunk=>{pending+=chunk;let i;while((i=pending.indexOf('\n'))>=0){messages.push(JSON.parse(pending.slice(0,i)));pending=pending.slice(i+1);}});
 const boot=startRuntimeBootstrap({...options,input,output});
 return {input,messages,boot,send:value=>input.write(JSON.stringify({jsonrpc:'2.0',...value})+'\n')};
}
async function until(check){const deadline=Date.now()+2000;while(!check()){assert.ok(Date.now()<deadline,'bootstrap response did not arrive');await turn();}}

test('initialize, ping and exact static tools respond before admitted resources; cancellation stays isolated',async()=>{
 const load=deferred(),calls=[],icons=[{src:'test-icon'}],version='0.1.8';let loadSignal;
 const f=fixture({icons,version,loadServer:({signal})=>{loadSignal=signal;return load.promise;}});
 try{
  f.send({id:1,method:'initialize',params:{protocolVersion:'2025-11-25'}});
  f.send({id:2,method:'ping'});f.send({id:3,method:'tools/list'});
  f.send({id:4,method:'resources/read',params:{uri:'ui://oracle/workspace'}});
  f.send({id:5,method:'resources/list'});
  await until(()=>f.messages.some(m=>m.id===3));
  assert.deepEqual(f.messages.find(m=>m.id===1).result,initializeResult({protocolVersion:'2025-11-25'},{icons,version}));
  assert.deepEqual(f.messages.find(m=>m.id===2).result,{});
  assert.deepEqual(f.messages.find(m=>m.id===3).result.tools,baseTools({icons,version}));
  assert.equal(f.messages.find(m=>m.id===3).result.tools[0]._meta.ui.resourceUri,'ui://oracle/workspace/0.1.8');
  assert.equal(calls.length,0);assert.ok(!f.messages.some(m=>m.id===4));
  f.send({method:'notifications/cancelled',params:{requestId:5}});
  await until(()=>f.messages.some(m=>m.id===5));assert.ok(f.messages.find(m=>m.id===5).error);assert.equal(loadSignal.aborted,false);
  load.resolve({request(method,params,context){calls.push({method,context});return {admitted:true};},close(){}});
  await until(()=>f.messages.some(m=>m.id===4));assert.deepEqual(f.messages.find(m=>m.id===4).result,{admitted:true});
  assert.equal(calls.length,1);assert.equal(calls[0].context.requestID,4);assert.equal(typeof calls[0].context.peerSessionID,'string');
 }finally{await f.boot.close();}
});

test('failed admission never dispatches resources or advertises product tools',async()=>{
 const load=deferred(),f=fixture({loadServer:()=>load.promise});
 try{
  f.send({id:1,method:'resources/read'});await turn();load.reject(new Error('checksum inválido'));
  await until(()=>f.messages.some(m=>m.id===1));assert.match(f.messages.find(m=>m.id===1).error.message,/checksum/);
  f.send({id:2,method:'tools/list'});await until(()=>f.messages.some(m=>m.id===2));assert.match(f.messages.find(m=>m.id===2).error.message,/checksum/);
 }finally{await f.boot.close();}
});

test('EOF and SIGTERM signal abort pending admission without awaiting a stalled loader; late service closes',async()=>{
 for(const eof of [true,false]){
  const load=deferred(),abort=new AbortController();let signal,closes=0,ended=0,errors=0;
  const f=fixture({signal:abort.signal,loadServer:options=>{signal=options.signal;return load.promise;},onClose:()=>ended++,onError:()=>errors++});
  f.send({id:1,method:'resources/read'});await turn();
  if(eof)f.input.end();else abort.abort();
  await until(()=>ended===1);assert.equal(signal.aborted,true);assert.equal(errors,0);
  load.resolve({request(){throw new Error('must not dispatch');},close(){closes++;}});
  await assert.rejects(f.boot.ready,/cancelada/);await until(()=>closes===1);await f.boot.close();
 }
});

test('admitted peer elicitation and tools notifications preserve transport context and EOF drain',async()=>{
 const load=deferred();let peer,listener,closed=0;
 const f=fixture({loadServer:()=>load.promise});
 try{
  f.send({id:1,method:'initialize',params:{capabilities:{elicitation:{}},protocolVersion:'2025-11-25'}});
  f.send({method:'notifications/initialized'});await until(()=>f.messages.some(m=>m.id===1));
  load.resolve({setMCPPeer(value){peer=value;},clearMCPPeer(){},onToolsChanged(fn){listener=fn;return()=>{};},request(method,params,context){assert.equal(context.peerSessionID,peer.sessionID);return peer.requestPeer('elicitation/create',{message:'Confirmar'},{signal:context.signal});},close(){closed++;}});
  await f.boot.ready;assert.ok(f.messages.some(m=>m.method==='notifications/tools/list_changed'));listener();
  f.send({id:2,method:'tools/call'});await until(()=>f.messages.some(m=>m.method==='elicitation/create'));
  const request=f.messages.find(m=>m.method==='elicitation/create');f.send({id:request.id,result:{action:'accept'}});
  f.input.end();await until(()=>f.messages.some(m=>m.id===2));assert.deepEqual(f.messages.find(m=>m.id===2).result,{action:'accept'});
  await until(()=>closed===1);
 }finally{await f.boot.close();}
});
