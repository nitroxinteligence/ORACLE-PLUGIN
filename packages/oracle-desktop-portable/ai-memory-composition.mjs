import {randomUUID,createHash} from 'node:crypto';
import {lstatSync,realpathSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createServer} from 'node:net';
import {AI_MEMORY_PINS} from './ai-memory-pins.mjs';
import {createAIMemoryRuntime,getAIMemoryRuntimeContext,readAIMemoryOwnedFile} from './ai-memory-runtime.mjs';
import {createAIMemoryProcess} from './ai-memory-process.mjs';
import {createAIMemoryService,registerAIMemoryServiceDelegate} from './ai-memory-service.mjs';
import {createAIMemorySnapshotReader} from './ai-memory-snapshot.mjs';
import {createAIMemoryVaultMirror} from './ai-memory-vault-mirror.mjs';
import {createAIMemoryRelay,createAIMemoryWriteAuthorization} from './ai-memory-relay.mjs';
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=path=>{if(typeof path!=='string'||resolve(path)!==path||realpathSync(path)!==path||!lstatSync(path).isDirectory())fail('ai_memory_composition_path_invalid','Pasta da composição não canônica.');return path;};
async function allocatePort(signal){if(signal?.aborted)fail('operation_cancelled','Operação cancelada.');const server=createServer();try{return await new Promise((resolve,reject)=>{server.once('error',reject);server.listen({host:'127.0.0.1',port:0,exclusive:true},()=>resolve(server.address().port));});}finally{if(server.listening)await new Promise(resolve=>server.close(resolve));}}
/** In-process composition only. The package layout, subprocess arguments,
 * profile and endpoint are fixed here. No JSON grant/approval is accepted.
 * currentBinding supplies live setup consent independently of Codex connection.
 * Portability consent remains a separate authority; absence never enables it.
 */
export function createAIMemoryComposition({bundleRoot,dataDir,policy,vault,profileStore,currentBinding,portabilityAuthorization,relayAuthorization,verifyExplicitRequest}={}){
 if(typeof currentBinding!=='function'||typeof policy?.requireCapability!=='function'||typeof policy?.revalidateAdmission!=='function'||typeof vault?.status!=='function'||typeof vault?.withContentTransaction!=='function'||typeof profileStore?.load!=='function'||typeof profileStore?.update!=='function')fail('ai_memory_composition_provider_required','Composição exige política, vault, perfil e consentimento atuais.');
 canonical(bundleRoot);if(typeof dataDir!=='string'||resolve(dataDir)!==dataDir)fail('ai_memory_composition_path_invalid','Perfil privado inválido.');
 const binary=join(bundleRoot,'runtime/ai-memory'),schemaPath=join(bundleRoot,'resources/ai-memory/portable-schema-v'+AI_MEMORY_PINS.version+'.json'),licensePath=join(bundleRoot,'licenses/AI-MEMORY-LICENSE');
 const verifyAssets=()=>{if(sha(readAIMemoryOwnedFile(schemaPath,1_000_000))!==AI_MEMORY_PINS.schemaSHA256||sha(readAIMemoryOwnedFile(licensePath,1_000_000))!==AI_MEMORY_PINS.licenseSHA256)fail('ai_memory_content_pin_mismatch','Schema/licença diferem dos pins revisados.');};verifyAssets();
 const liveBinding=()=>{const binding=currentBinding(),selection=vault.status();if(!selection?.selected||binding?.vault!==selection.root||binding?.selectionRevision!==String(selection.generation))fail('ai_memory_binding_changed','O vínculo não corresponde ao vault selecionado.');return binding;};
 let backend=null,creating=false,closed=false,stopping=Promise.resolve();
 return Object.freeze({
  async createBackend({ticket,binding,signal}={}){
   if(closed)fail('ai_memory_composition_closed','Composição encerrada.');if(creating)fail('ai_memory_busy','Composição em preparação.');creating=true;
   try{
    await stopping;if(closed)fail('ai_memory_composition_closed','Composição encerrada.');
    await policy.revalidateAdmission(ticket);if(ticket?.capability!=='configure')fail('access_denied','Memória exige configure.');const current=structuredClone(liveBinding());const assertBinding=()=>{if(JSON.stringify(liveBinding())!==JSON.stringify(current))fail('ai_memory_binding_changed','A autorização mudou durante a composição.');};
    if(binding&&['vault','selectionRevision','planHash','setupAuthorized'].some(key=>binding[key]!==current[key])||binding?.consentGeneration!==undefined&&binding.consentGeneration!==current.consentGeneration)fail('ai_memory_binding_changed','O plano recebido não corresponde à autorização atual.');
    if(backend){getAIMemoryRuntimeContext(backend.runtime).assertCurrent(ticket);return backend;}
    verifyAssets();if(signal?.aborted)fail('operation_cancelled','Operação cancelada.');
    let installationID;await profileStore.update(profile=>{const existing=profile.aiMemoryInstallation;if(existing&&(existing.owner!=='oracle-portable-ai-memory-composition'||!/^[0-9a-f-]{36}$/i.test(existing.installationID??'')))fail('ai_memory_profile_unowned','Identidade própria inválida.');installationID=existing?.installationID??randomUUID();return {...profile,aiMemoryInstallation:{owner:'oracle-portable-ai-memory-composition',installationID}};},{beforeCommit:()=>{policy.assertAdmission(ticket);assertBinding();}});canonical(dataDir);
    assertBinding();const runtime=await createAIMemoryRuntime({binary,profileRoot:join(dataDir,'ai-memory'),installationID,policy,currentBinding:liveBinding}).admit({ticket,signal});
    assertBinding();const process=createAIMemoryProcess({runtime}),rawService=createAIMemoryService({runtime,process});let serviceOpen=true;const preparations=new Set();const ensureService=()=>{if(!serviceOpen)fail('ai_memory_service_closed','Prepare uma nova instância da memória.');};const retire=()=>{if(!serviceOpen)return stopping;serviceOpen=false;if(backend?.runtime===runtime)backend=null;stopping=(async()=>{await rawService.close();await Promise.allSettled([...preparations]);})();return stopping;};const service=Object.freeze({prepare(options){ensureService();const operation=rawService.prepare(options);preparations.add(operation);operation.finally(()=>preparations.delete(operation)).catch(()=>{});return operation;},assertReady(){ensureService();return rawService.assertReady();},invoke(name,input,options){ensureService();return rawService.invoke(name,input,options);},cancel(){if(serviceOpen){rawService.cancel();retire().catch(()=>{});}},close:retire});registerAIMemoryServiceDelegate(rawService,service);const snapshotReader=createAIMemorySnapshotReader({runtime,schemaPath}),mirror=createAIMemoryVaultMirror({vault,policy,profileStore,dataDir});
    let port;do{port=await allocatePort(signal);}while([49374,49375].includes(port));verifyAssets();assertBinding();getAIMemoryRuntimeContext(runtime).assertCurrent(ticket);if(closed)fail('ai_memory_composition_closed','Composição encerrada.');
    const writeAuthorization=verifyExplicitRequest?createAIMemoryWriteAuthorization({verifyExplicitRequest,currentBinding:liveBinding}):undefined;
    const relay=relayAuthorization&&portabilityAuthorization?createAIMemoryRelay({policy,vault,relayAuthorization,portabilityAuthorization,writeAuthorization,service,snapshotReader,mirror}):null;
    backend=Object.freeze({runtime,service,port,snapshotReader,mirror,portabilityAuthorization,writeAuthorization,
     tools(options){if(!relay)fail('ai_memory_authorization_unavailable','Conexão e consentimento de portabilidade exigidos.');return relay.tools(options);},
     invoke(name,input,options){if(!relay)fail('ai_memory_authorization_unavailable','Conexão e consentimento de portabilidade exigidos.');return relay.invoke(name,input,options);},
     prepare(options){return service.prepare({...options,port});},
     cancel(){relay?relay.cancel():service.cancel();},async close(){await (relay?relay.close():service.close());},
    });return backend;
   }finally{creating=false;}
  },
  tools(options){if(!backend)fail('ai_memory_unavailable','Prepare a memória antes de consultar.');return backend.tools(options);},
  invoke(name,input,options){if(!backend)fail('ai_memory_unavailable','Prepare a memória antes de consultar.');return backend.invoke(name,input,options);},
  cancel(){backend?.cancel();},async close(){closed=true;await backend?.close();},
 });
}
