import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';

/** One serialized, disposable-on-failure MCP session, scoped to its runner. */
export function createGBrainMCPSession({command,args,cwd,env,platform,networkDenied,idleMs=15000}) {
  let session=null,queue=Promise.resolve(),generation=0,cancellation=0,idle;
  const error=(message,code)=>Object.assign(Error(message),{code});
  function stop(reason=error('Official memory session closed','operation_cancelled')) {
    clearTimeout(idle);generation++;
    const current=session;session=null;
    if(!current)return;
    current.reject?.(reason);current.lines.close();current.child.stdin.destroy();
    try{if(platform==='win32')current.child.kill('SIGKILL');else process.kill(-current.child.pid,'SIGKILL');}catch{}
  }
  function close(){cancellation++;stop();}
  function start(key) {
    const child=spawn(command,args,{cwd,env:{...env,ORACLE_MCP_EPOCH_SHA256:key},detached:platform!=='win32',windowsHide:platform==='win32',shell:false,stdio:['pipe','pipe','pipe']});
    const current={key,child,lines:createInterface({input:child.stdout}),id:0,initialized:false,bytes:0,stderr:''};session=current;generation++;
    const failed=reason=>{if(session===current)stop(reason);};
    child.stdout.on('data',data=>{current.bytes+=data.length;if(current.bytes>16000000)failed(error('Official memory output exceeds limit','memory_output_limit'));});
    child.stderr.on('data',data=>{current.stderr=(current.stderr+data.toString()).slice(-16000);});
    child.stdin.on('error',failed);child.on('error',failed);
    child.on('close',code=>failed(Object.assign(error('Official memory process stopped before its reply','memory_process_failed'),{diagnostic:current.stderr,exitCode:code})));
    current.lines.on('close',()=>failed(Object.assign(error('Official memory stream ended','memory_process_failed'),{diagnostic:current.stderr})));
    current.lines.on('line',line=>{
      if(session!==current)return;
      let message;try{message=JSON.parse(line);}catch{return failed(error('Official memory protocol returned invalid JSON','memory_protocol_error'));}
      if(message.id===undefined)return;
      if(!current.resolve||message.id!==current.id)return failed(error('Unexpected official memory response identifier','memory_protocol_error'));
      const resolve=current.resolve,reject=current.reject;current.resolve=null;current.reject=null;
      if(message.error)reject(error(message.error.message||'Official memory protocol error','memory_protocol_error'));else resolve(message.result);
    });
    return current;
  }
  function exchange(current,method,params) {
    return new Promise((resolve,reject)=>{
      current.bytes=0;current.resolve=resolve;current.reject=reject;current.id++;
      current.child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:current.id,method,params})+'\n');
    });
  }
  function request(request,{key,signal,timeoutMs,check}) {
    const expected=cancellation,received=Date.now();
    const task=queue.then(async()=>{
      if(expected!==cancellation||signal?.aborted)throw error('Official memory request cancelled','operation_cancelled');
      try{check();}catch(reason){stop(reason);throw reason;}clearTimeout(idle);
      if(session&&session.key!==key)stop();
      const current=session??start(key);
      const remaining=timeoutMs-(Date.now()-received);
      if(remaining<=0){stop();throw error('Official memory request deadline exceeded','memory_deadline');}
      const assertSession=()=>{if(session!==current)throw error('Official memory session changed','operation_cancelled');check();};
      const abort=()=>stop(error('Official memory request cancelled','operation_cancelled'));
      const timer=setTimeout(()=>stop(error('Official memory request deadline exceeded','memory_deadline')),remaining);
      signal?.addEventListener('abort',abort,{once:true});
      try{
        if(signal?.aborted)abort();
        assertSession();
        if(!current.initialized){
          await exchange(current,'initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'oracle-portable-relay',version:'1.0.0'}});
          assertSession();current.child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');current.initialized=true;
        }
        assertSession();const value=await exchange(current,request.method,request.params??{});assertSession();
        return {value,networkDenied,command,args};
      }catch(reason){if(session===current)stop(reason);throw reason;}
      finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);if(session===current){idle=setTimeout(()=>stop(),idleMs);idle.unref?.();}}
    });
    queue=task.catch(()=>{});return task;
  }
  return Object.freeze({request,close,get generation(){return generation;}});
}
