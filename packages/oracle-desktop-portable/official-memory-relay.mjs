const names=Object.freeze(['remember','recall','entity','context_pack','delta','forget','search','get_page','list_pages','get_links','get_backlinks','traverse_graph','put_page']);
const prefix='oracle_memory_';
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
function validate(value,schema,key){
  if(schema.type){const valid=schema.type==='object'?object(value):schema.type==='array'?Array.isArray(value):schema.type==='integer'?Number.isSafeInteger(value):schema.type==='number'?typeof value==='number'&&Number.isFinite(value):typeof value===schema.type;if(!valid)fail('invalid_memory_request','Parâmetro inválido: '+key);}
  if(schema.enum&&!schema.enum.includes(value))fail('invalid_memory_request','Valor inválido: '+key);
  if(Array.isArray(value)&&schema.items)value.forEach((item,index)=>validate(item,schema.items,key+'['+index+']'));
}

/** Trusted connection service only. The verifier must read an explicitly
 * authorized live Codex connection, never RPC params or persisted connected JSON.
 * Tickets are private WeakSet members; revoke on disconnect/authorization change. */
export function createRelayAuthorization({verifyActiveConnection}={}) {
  if(typeof verifyActiveConnection!=='function')fail('relay_authorization_required','A conexão autorizada com o Codex não está disponível.');
  const tickets=new WeakSet();let generation=0;
  const verify=async()=>{const proof=await verifyActiveConnection();if(!object(proof)||proof.connected!==true||proof.explicitAuthorization!==true||typeof proof.sessionID!=='string'||!proof.sessionID)fail('relay_connection_inactive','Conecte explicitamente ao Codex antes de usar a memória nesta conversa.');return proof;};
  const assertActive=ticket=>{if(!tickets.has(ticket)||ticket.generation!==generation)fail('relay_authorization_changed','A autorização da conexão mudou.');};
  return Object.freeze({async requireActive(){const expected=generation,proof=await verify();if(expected!==generation)fail('relay_authorization_changed','A autorização da conexão mudou.');const ticket=Object.freeze({generation,sessionID:proof.sessionID});tickets.add(ticket);return ticket;},assertActive,
    async revalidate(ticket){assertActive(ticket);const proof=await verify();assertActive(ticket);if(ticket.sessionID!==proof.sessionID)fail('relay_authorization_changed','A conexão ativa mudou.');},
    revoke(){generation++;},
  });
}

/** Trusted composition. No caller supplies paths, connection proofs, admission
 * tickets or epochs. The factory binds the already prepared owned engine to the
 * captured selected vault; all 13 operations execute the official MCP adapter. */
export function createOfficialMemoryRelay({policy,vault,relayAuthorization,runnerFactory,verifyExplicitWrite}={}) {
  if(!policy||!vault||typeof runnerFactory!=='function'||!relayAuthorization||['requireActive','assertActive','revalidate'].some(name=>typeof relayAuthorization[name]!=='function'))fail('relay_authorization_required','A memória exige licença, pasta autorizada e conexão explícita ativa.');
  let queue=Promise.resolve(),pending=0,epoch=0;const controllers=new Set(),runners=new Set(),schemas=new WeakMap();
  function cancel(){epoch++;for(const controller of controllers)controller.abort();for(const runner of runners)runner.closeMemory?.();runners.clear();}
  async function run(work,{signal}={}) {
    if(pending>=8)fail('memory_queue_full','Há muitas consultas de memória em andamento. Aguarde.');
    const selected=vault.status();if(!selected.selected)fail('vault_required','Escolha seu Obsidian antes de usar a memória.');
    const policyTicket=policy.requireCapability('useOracle'),expected=epoch,received=Date.now(),controller=new AbortController();pending++;controllers.add(controller);
    const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
    const task=queue.then(async()=>{
      let relayTicket;
      const check=()=>{policy.assertAdmission(policyTicket);if(relayTicket)relayAuthorization.assertActive(relayTicket);const current=vault.status();if(controller.signal.aborted||expected!==epoch||!current.selected||current.root!==selected.root||current.generation!==selected.generation)fail('relay_selection_changed','A autorização ou a pasta da memória mudou.');};
      if(Date.now()-received>35000)fail('memory_queue_expired','A consulta aguardou demais e não foi executada.');
      check();await policy.revalidateAdmission(policyTicket);check();relayTicket=await relayAuthorization.requireActive();check();
      const timer=setInterval(()=>{try{check();}catch{controller.abort();}},50);timer.unref?.();
      try{
        const bound=await runnerFactory({selection:selected,policyTicket,check,signal:controller.signal});check();
        if(!bound||typeof bound.runner?.memory!=='function'||!/^[a-f0-9]{64}$/.test(bound.vaultEpochSHA256??''))fail('relay_engine_unavailable','A memória oficial ainda não foi preparada para esta pasta.');
        runners.add(bound.runner);
        const request=async(method,params={})=>{check();const response=await bound.runner.memory({method,params},{vaultEpochSHA256:bound.vaultEpochSHA256,signal:controller.signal,timeoutMs:Math.min(45000,Math.max(1,35000-(Date.now()-received)))});check();return response.value;};
        request.runner=bound.runner;request.vaultEpochSHA256=bound.vaultEpochSHA256;
        const value=await work(request);check();await relayAuthorization.revalidate(relayTicket);check();await policy.revalidateAdmission(policyTicket);check();return value;
      }finally{clearInterval(timer);}
    });
    queue=task.catch(()=>{});
    try{return await task;}finally{pending--;controllers.delete(controller);signal?.removeEventListener('abort',abort);}
  }
  async function definitions(request){
    const runner=request.runner,generation=runner.memorySessionGeneration,cached=schemas.get(runner);
    if(Number.isInteger(generation)&&cached?.generation===generation&&cached.epoch===request.vaultEpochSHA256&&cached.pin===runner.sourcePin)return cached.tools;
    const result=await request('tools/list');
    if(!Array.isArray(result?.tools)||result.tools.length!==names.length||new Set(result.tools.map(row=>row.name)).size!==names.length||result.tools.some(row=>!names.includes(row.name)||!object(row.inputSchema)))fail('relay_schema_mismatch','Os contratos da memória oficial precisam de revisão.');
    const tools=JSON.parse(JSON.stringify(result.tools));
    if(Number.isInteger(runner.memorySessionGeneration))schemas.set(runner,{generation:runner.memorySessionGeneration,epoch:request.vaultEpochSHA256,pin:runner.sourcePin,tools});
    return tools;
  }
  return Object.freeze({
    tools(options){return run(async request=>(await definitions(request)).map(tool=>({...JSON.parse(JSON.stringify(tool)),name:prefix+tool.name,description:'Oracle System: memória GBrain do vault selecionado. '+tool.description+' Disponibilidade não confirma conexão ativa. Escritas exigem pedido explícito; não capture chats automaticamente.',_meta:{ui:{visibility:['model']}}})),options);},
    invoke(name,args={},options){
      if(typeof name!=='string'||!name.startsWith(prefix)||!names.includes(name.slice(prefix.length))||!object(args)||Buffer.byteLength(JSON.stringify(args))>500000)fail('invalid_memory_request','Pedido de memória inválido.');
      const input=JSON.parse(JSON.stringify(args));
      return run(async request=>{
        const tool=(await definitions(request)).find(tool=>tool.name===name.slice(prefix.length));
        // Official SDK/operation validation owns detailed schemas and closed keys;
        // the identical args reach that backend, never the simplified read API.
        for(const key of Object.keys(input)){if(!Object.hasOwn(tool.inputSchema.properties,key))fail('invalid_memory_request','Parâmetro de memória desconhecido: '+key);validate(input[key],tool.inputSchema.properties[key],key);}
        for(const key of tool.inputSchema.required||[])if(!Object.hasOwn(input,key))fail('invalid_memory_request','Parâmetro de memória obrigatório: '+key);
        if(['remember','forget','put_page'].includes(tool.name)){if(typeof verifyExplicitWrite!=='function')fail('memory_explicit_request_required','A gravação exige confirmação humana desta operação.');const proof=await verifyExplicitWrite({input,requestID:options?.requestID,hostRequestContext:options?.hostRequestContext});if(proof?.explicitRequest!==true)fail('memory_explicit_request_required','A gravação não foi confirmada.');}
        const result=await request('tools/call',{name:tool.name,arguments:input});
        if(!object(result)||!Array.isArray(result.content))fail('invalid_memory_reply','A memória oficial não retornou um envelope MCP válido.');
        return result;
      },options);
    },cancel,async close(){cancel();await queue;},
  });
}
