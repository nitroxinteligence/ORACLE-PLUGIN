import {createHash} from 'node:crypto';
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const writes=new Set(['oracle_ai_memory_write_page','oracle_memory_remember','oracle_memory_forget','oracle_memory_put_page']);
/** Only the current MCP peer transport can answer this broker's outgoing
 * elicitation. UI/model arguments never carry approval. App-server account/read
 * is a separate connection and is NOT the human response channel. */
export function createMCPHumanRequestBroker({policy,vault,relayAuthorization}={}){
 const contexts=new WeakMap();let transport=null,epoch=0;
 const revoke=()=>{epoch++;};
 return Object.freeze({
  setTransport({requestPeer,sessionID,elicitationAvailable}={}){revoke();if(typeof requestPeer!=='function'||typeof sessionID!=='string'||!sessionID||typeof elicitationAvailable!=='function')fail('memory_host_consent_unavailable','O host não disponibilizou confirmação de ferramentas.');transport={requestPeer,sessionID,elicitationAvailable};},
  clearTransport(){revoke();transport=null;},
  contextFor(tool,input,requestID,{peerSessionID,signal}={}){if(!writes.has(tool))return undefined;if(!transport||transport.sessionID!==peerSessionID)return undefined;const context=Object.freeze({});contexts.set(context,{tool,inputHash:hash(input),requestID,peerSessionID,epoch,signal,used:false});return context;},
  async verifyExplicitRequest({input,requestID,hostRequestContext}={}){
   const record=contexts.get(hostRequestContext),peer=transport;if(!record||!peer||record.used||record.epoch!==epoch||record.peerSessionID!==peer.sessionID||record.requestID!==requestID||record.inputHash!==hash(input))fail('memory_explicit_request_required','A gravação exige confirmação humana para esta ferramenta e conteúdo.');
   if(!peer.elicitationAvailable())fail('memory_host_consent_unavailable','Este host não oferece confirmação de gravação. Nenhuma memória foi alterada.');
   const ticket=policy.requireCapability('configure'),selected=vault.status();if(!selected.selected)fail('vault_required','Escolha seu Obsidian antes de gravar memórias.');const connection=await relayAuthorization?.requireActive();if(!connection)fail('relay_connection_inactive','Conecte explicitamente ao Codex antes de gravar memórias.');
   const check=()=>{policy.assertAdmission(ticket);relayAuthorization.assertActive(connection);const current=vault.status();if(record.epoch!==epoch||peer!==transport||record.signal?.aborted||!current.selected||current.root!==selected.root||current.generation!==selected.generation)fail('memory_explicit_request_changed','A autorização desta gravação mudou.');};check();await policy.revalidateAdmission(ticket);check();
   record.used=true;const destination=typeof input.path==='string'?input.path:typeof input.slug==='string'?input.slug:record.tool;
   const response=await peer.requestPeer('elicitation/create',{mode:'form',message:`Oracle: confirme ${record.tool==='oracle_memory_forget'?'a expiração':'a gravação'} desta memória no vault ${selected.root.split('/').at(-1)}.\nDestino: ${destination}\n\n${JSON.stringify(input,null,2)}`,requestedSchema:{type:'object',properties:{confirmation:{type:'string',title:'Confirmar esta operação',enum:['Confirmar esta memória']}},required:['confirmation'],additionalProperties:false}},{signal:record.signal});
   check();if(response?.action!=='accept'||response.content?.confirmation!=='Confirmar esta memória'||Object.keys(response.content).length!==1)fail('memory_explicit_request_declined','A gravação não foi confirmada; nenhuma memória foi alterada.');await relayAuthorization.revalidate(connection);check();await policy.revalidateAdmission(ticket);check();return Object.freeze({explicitRequest:true});
  },revoke,
 });
}
