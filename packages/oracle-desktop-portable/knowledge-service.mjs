import fs from 'node:fs/promises';
import {existsSync,constants} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {join,resolve} from 'node:path';
import {assertPrivatePath} from './profile-store.mjs';
import {createGBrainSourceRunner,GBRAIN_SOURCE_PIN} from './gbrain-source-runner.mjs';
import {waitForProfileLock} from './profile-write-lock.mjs';

const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const absent=()=>({state:'unavailable',indexing:false,error:'Prepare o índice local antes de consultar a memória.'});

// Runtime locations are trusted package/composition inputs. No RPC may select a
// runtime, profile, CLI argument, database, model, endpoint or source directory.
export function createKnowledgeService({policy,vault,profileStore,dataDir,runtimeConfig,acquireLock}={}) {
  let queue=Promise.resolve(),epoch=0,running=false,latest=null,pending=0;
  const controllers=new Set();
  const selection=()=>{const value=vault.status();if(!value.selected)fail('vault_required','Escolha seu Obsidian antes de preparar o índice.');return value;};
  function cancel(){epoch++;latest=null;for(const controller of controllers)controller.abort();}
  async function privateDirectory(path,check){
    let ancestor=path;
    while(!existsSync(ancestor))ancestor=resolve(ancestor,'..');
    await assertPrivatePath(ancestor);check();await fs.mkdir(path,{recursive:true,mode:0o700});await assertPrivatePath(path);check();
  }
  async function atomicFile(path,value,check){
    await assertPrivatePath(resolve(path,'..'));check();
    try{const info=await fs.lstat(path);if(info.isSymbolicLink()||!info.isFile()||info.nlink!==1)fail('profile_invalid','O estado local precisa de revisão.');}catch(error){if(error.code!=='ENOENT')throw error;}
    const temp=path+'.'+randomUUID()+'.tmp';
    try{await fs.writeFile(temp,value,{flag:'wx',mode:0o600});check();await assertPrivatePath(resolve(path,'..'));check();await fs.rename(temp,path);check();}
    finally{await fs.unlink(temp).catch(()=>{});}
  }
  function run(work,{signal,capability='useOracle'}={}) {
    if(pending>=8)fail('engine_queue_full','Há muitas consultas em andamento. Aguarde antes de tentar novamente.');
    const selected=selection(),ticket=policy.requireCapability(capability),expected=epoch,controller=new AbortController();
    pending++;
    const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();controllers.add(controller);
    const check=()=>{policy.assertAdmission(ticket);const current=vault.status();if(controller.signal.aborted||expected!==epoch||!current.selected||current.generation!==selected.generation||current.root!==selected.root)fail('operation_cancelled','A autorização ou a pasta mudou. Retome a atualização do índice.');};
    const task=queue.then(async()=>{
      check();await policy.revalidateAdmission(ticket);check();running=true;
      const timer=setInterval(()=>{try{check();}catch{controller.abort();}},50);timer.unref?.();
      let lock,lockIdentity,release;
      try{
        if(!runtimeConfig)fail('engine_unavailable','Os componentes de busca local não estão disponíveis nesta instalação.');
        const stateRoot=join(dataDir,'knowledge',digest(selected.root));
        for(const relative of ['','gbrain/profile','gbrain/workspace','events','execution-home','tmp'])await privateDirectory(join(stateRoot,relative),check);
        // The pinned upstream kernel lease serializes conversations and is
        // released by the OS after a crash. Old O_EXCL locks stay protected.
        const lockPath=join(stateRoot,'operation.lock');
        if(acquireLock){
          if(existsSync(lockPath))fail('engine_busy','Outra versão está usando o índice local. Encerre essa conversa antes de retomar.');
          const kernelPath=join(stateRoot,'operation.kernel.lock');try{await assertPrivatePath(kernelPath);const info=await fs.lstat(kernelPath);if(!info.isFile()||info.nlink!==1)fail('profile_invalid','Trava local inválida.');}catch(error){if(error.code!=='ENOENT')throw error;}
          release=await waitForProfileLock(acquireLock,kernelPath,{signal:controller.signal,check});check();
        }else{
          try{lock=await fs.open(lockPath,'wx',0o600);}catch(error){if(error.code==='EEXIST')fail('engine_busy','Outro processo está usando o índice local. Aguarde antes de tentar novamente.');throw error;}
          await lock.writeFile(JSON.stringify({pid:process.pid,runID:randomUUID()}));lockIdentity=await lock.stat();check();
        }
        const bunConfig=join(stateRoot,'bunfig.toml');await atomicFile(bunConfig,'# Oracle isolated runtime: no preloads or providers\n',check);
        const runner=createGBrainSourceRunner({...runtimeConfig,stateRoot,vaultRoot:selected.root,bunConfig});
        const context={selected,ticket,check,signal:controller.signal,runner,stateRoot};
        const value=await work(context);check();await policy.revalidateAdmission(ticket);check();return value;
      }catch(error){
        latest=null;
        if(controller.signal.aborted)fail('operation_cancelled','Operação pausada. O índice precisa ser verificado antes de continuar.');
        if(error.code)throw error;
        fail('engine_operation_failed','Não foi possível concluir a operação de busca local. Os arquivos originais foram preservados.');
      }finally{
        clearInterval(timer);running=false;
        await release?.();
        if(lock){const lockPath=join(dataDir,'knowledge',digest(selected.root),'operation.lock');try{const current=await fs.lstat(lockPath);if(lockIdentity&&current.dev===lockIdentity.dev&&current.ino===lockIdentity.ino&&!current.isSymbolicLink())await fs.unlink(lockPath);}catch(error){if(error.code!=='ENOENT')throw error;}finally{await lock.close();}}
      }
    });
    queue=task.catch(()=>{});
    return task.finally(()=>{pending--;controllers.delete(controller);signal?.removeEventListener('abort',abort);});
  }
  async function initialize(context){
    const {runner,selected,check,signal}=context,marker=join(runner.profile,'oracle-owned.json');
    await runner.read({operation:'upgrade-profile',root:selected.root},{signal});check();
    if(existsSync(marker)){
      await assertPrivatePath(marker);const record=JSON.parse(await fs.readFile(marker,'utf8'));check();
      if(record.owner!=='OracleCompanion'||record.schema_version!==2||record.vault_root!==selected.root)fail('engine_target_changed','O índice pertence a outra pasta. Preserve o perfil e confira a configuração.');
      const result=await runner.read({operation:'status'},{signal});check();
      if(result.value.commit!==GBRAIN_SOURCE_PIN||result.value.inference!==false)fail('engine_policy_changed','A configuração da busca local precisa de revisão.');
      if(context.ticket.capability==='configure'){await runner.read({operation:'prepare-writer',root:selected.root},{signal});check();}
      return;
    }
    if(existsSync(join(runner.profile,'.gbrain/config.json')))fail('engine_unowned','Já existe uma configuração sem recibo neste perfil. Preserve-a antes de continuar.');
    if(typeof vault.prepareMemoryDirectory!=='function')fail('memory_directory_unavailable','A preparação da pasta de memória ainda não está disponível.');
    const memoryRoot=await vault.prepareMemoryDirectory({signal});check();
    if(memoryRoot!==join(selected.root,'INBOX/oracle-memory'))fail('memory_target_changed','A pasta de memória mudou durante a preparação.');
    await runner.read({operation:'initialize',root:selected.root},{signal});check();
    if(context.ticket.capability==='configure'){await runner.read({operation:'prepare-writer',root:selected.root},{signal});check();}
  }
  const scanSignature=scan=>digest(scan.notes.map(row=>({path:row.path,revision:row.revision,bytes:row.bytes})).sort((a,b)=>a.path.localeCompare(b.path)));
  async function refresh(options={}) {
    return run(async context=>{
      const {runner,selected,ticket,check,signal}=context;
      const scan=await vault.scan({force:true});check();
      if(!scan.complete||!scan.allowDeletionReconciliation)fail('scan_partial','A leitura da pasta está parcial. Nenhuma exclusão será conciliada; confira os arquivos antes de indexar.');
      await initialize(context);check();
      const indexed=(await runner.read({operation:'index',source:'oracle-vault',root:selected.root,files:scan.notes.map(note=>note.path),scan_complete:true,generation:String(selected.generation),budget_ms:90000},{signal})).value;check();
      const engine=(await runner.read({operation:'status'},{signal})).value;check();
      const after=await vault.scan({force:true});check();
      const complete=indexed.complete===true&&after.complete&&scanSignature(after)===scanSignature(scan);
      const receipt={schemaVersion:1,runID:randomUUID(),sourcePin:GBRAIN_SOURCE_PIN,runtimeSHA256:runtimeConfig.runtimeSHA256,vaultRoot:selected.root,vaultGeneration:selected.generation,policyGeneration:ticket.generation,admissionCapability:ticket.capability,verifiedAt:new Date().toISOString(),indexComplete:complete,index:indexed,scanSignature:scanSignature(scan),engineVersion:engine.version,inference:engine.inference,installationCompleted:false};
      await profileStore.update(value=>({...value,knowledgeReceipt:receipt}),{beforeCommit:check});check();latest=receipt;
      return {state:complete?'current':'partial',indexing:false,complete,verified_at:receipt.verifiedAt,index:indexed,inference:false,installationCompleted:false};
    },{...options,capability:'configure'});
  }
  async function verifyExisting(options={}){
    return run(async context=>{
      const {runner,selected,ticket,check,signal}=context,marker=join(runner.profile,'oracle-owned.json');
      await assertPrivatePath(marker);const owner=JSON.parse(await fs.readFile(marker,'utf8'));check();
      if(owner.owner!=='OracleCompanion'||owner.schema_version!==2||owner.vault_root!==selected.root)fail('engine_target_changed','O índice pertence a outra pasta.');
      const manifestPath=join(runner.profile,'oracle-vault-manifest.json');await assertPrivatePath(manifestPath);check();
      const handle=await fs.open(manifestPath,constants.O_RDONLY|constants.O_NOFOLLOW);let manifest;
      try{const info=await handle.stat();if(!info.isFile()||info.nlink!==1||info.size>16000000)fail('profile_invalid','Manifesto do índice inválido.');manifest=JSON.parse(await handle.readFile('utf8'));}finally{await handle.close();}
      check();const engine=(await runner.read({operation:'status'},{signal})).value;check();
      if(engine.commit!==GBRAIN_SOURCE_PIN||engine.inference!==false)fail('engine_policy_changed','A configuração da busca local precisa de revisão.');
      const scan=await vault.scan({force:true});check();if(!scan.complete)fail('scan_partial','A leitura da pasta está parcial. Os arquivos foram preservados.');
      const notes=scan.notes.filter(row=>!/^INBOX\/oracle-memory(?:\/|$)/i.test(row.path));
      const records=Array.isArray(manifest.records)?manifest.records:[],expected=new Map(records.map(row=>[row.path,row.sha256]));
      const complete=manifest.complete===true&&manifest.root===selected.root&&expected.size===records.length&&notes.length===expected.size&&notes.every(row=>expected.get(row.path)===row.revision)&&engine.index?.complete===true;
      if(!complete)return {state:'stale',complete:false,indexing:false,inference:false};
      const receipt={schemaVersion:1,runID:randomUUID(),sourcePin:GBRAIN_SOURCE_PIN,runtimeSHA256:runtimeConfig.runtimeSHA256,vaultRoot:selected.root,vaultGeneration:selected.generation,policyGeneration:ticket.generation,admissionCapability:ticket.capability,verifiedAt:new Date().toISOString(),indexComplete:true,index:engine.index,scanSignature:scanSignature(scan),engineVersion:engine.version,inference:false,installationCompleted:false};
      await profileStore.update(value=>({...value,knowledgeReceipt:receipt}),{beforeCommit:check});check();latest=receipt;
      return {state:'current',complete:true,indexing:false,index:engine.index,inference:false};
    },{...options,capability:'configure'});
  }
  async function read(params,options={}) {
    if(!params||Object.keys(params).some(key=>!['operation','source','slug','query'].includes(key))||!['status','search','get','graph','list'].includes(params.operation))fail('invalid_request','Consulta de memória inválida.');
    if(params.operation!=='status'&&(!['oracle-vault','oracle-memory'].includes(params.source)||['get','graph'].includes(params.operation)&&(typeof params.slug!=='string'||!params.slug||params.slug.length>1024)||params.operation==='search'&&(typeof params.query!=='string'||!params.query.trim()||params.query.length>500)))fail('invalid_request','Escolha uma biblioteca e uma consulta válida.');
    return run(async context=>{
      const marker=join(context.runner.profile,'oracle-owned.json');if(!existsSync(marker))fail('engine_unconfigured','Prepare o índice local antes de consultar a memória.');
      await initialize(context);context.check();
      const result=await context.runner.read(params,{signal:context.signal});context.check();return result.value;
    },options);
  }
  async function status(){
    if(!policy.snapshot().active||!vault.status().selected||!latest)return {...absent(),indexing:running};
    const ticket=policy.requireCapability('useOracle'),selected=vault.status(),receipt=latest,expected=epoch;
    if(selected.root!==latest.vaultRoot||selected.generation!==latest.vaultGeneration)return absent();
    policy.assertAdmission(ticket);const current=vault.status();if(expected!==epoch||latest!==receipt||!current.selected||current.root!==selected.root||current.generation!==selected.generation)return absent();
    // A poll reports the last verification, never rehashes the vault. Canonical
    // reads and explicit refresh retain their own admission and integrity checks.
    return {state:receipt.indexComplete?'stale':'partial',stale:true,freshness:'unverified',indexing:running,complete:receipt.indexComplete,verified_at:receipt.verifiedAt,inference:false};
  }
  function syncSnapshot(){
    const selected=vault.status();if(!policy.snapshot().active||!selected.selected||!latest||latest.vaultRoot!==selected.root||latest.vaultGeneration!==selected.generation)return {status:'unconfigured',running,inference:false};
    return {status:latest.indexComplete?'verified':'partial',stale:true,freshness:'unverified',running,inference:false,verified_at:latest.verifiedAt,index:latest.index,installationCompleted:false};
  }
  return Object.freeze({refresh,verifyExisting,read,status,syncSnapshot,cancel,async close(){cancel();await queue;}});
}
