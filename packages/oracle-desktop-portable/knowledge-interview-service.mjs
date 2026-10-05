import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {assertPrivatePath} from './profile-store.mjs';
import {codexInterviewLink} from './codex-interview-link.mjs';

const fail=(message,code='invalid_interview')=>{throw Object.assign(new Error(message),{code});};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const topicOK=topic=>['personal','professional'].includes(topic);
const areaOK=(area,topic)=>(topic==='personal'?['AREAS/pessoal','Pessoal']:['AREAS/profissional','Profissional']).includes(area);
const idOK=id=>typeof id==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id);
const hashOK=hash=>typeof hash==='string'&&/^[a-f0-9]{64}$/.test(hash);
const receiptPath=run=>'SISTEMA/oracle/interviews/'+run+'.json';
const relativeOK=path=>typeof path==='string'&&Buffer.byteLength(path)<=4096&&!/[\\\x00-\x1f\x7f]/.test(path)&&!path.split('/').some(part=>!part||part==='.'||part==='..');
const same=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;
const decode=bytes=>{try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail('O arquivo não contém texto UTF-8 válido.');}};
const args=(p,allowed)=>{if(!object(p)||Object.keys(p).some(key=>!allowed.includes(key)))fail('Pedido de entrevista inválido.','invalid_request');};

/** Reads originals under the live selection. No receipt or note is written here. */
async function readOriginal(scope,relative,limit,inspectPath){
  if(!relativeOK(relative))fail('O comprovante contém um caminho fora da área aprovada.');
  await scope.checkRoot();let target=scope.root;const chain=[];
  for(const [index,part] of relative.split('/').entries()){
    target=join(target,part);scope.check();
    await inspectPath?.(target,{check:scope.check});const stat=await fs.lstat(target);scope.check();
    if(stat.isSymbolicLink()||(index<relative.split('/').length-1?!stat.isDirectory():!stat.isFile()||stat.nlink!==1||stat.size>limit))fail('O arquivo é inválido, excede o limite ou atravessa um link.');
    chain.push({target,stat});
  }
  const handle=await fs.open(target,constants.O_RDONLY|(process.platform==='win32'?0:constants.O_NOFOLLOW));
  try{
    scope.check();const before=await handle.stat();if(!same(before,chain.at(-1).stat))fail('O arquivo mudou durante a conferência.');
    const buffer=Buffer.alloc(Math.min(limit,before.size)+1);let length=0;
    while(length<buffer.length){scope.check();const read=await handle.read(buffer,length,buffer.length-length,length);if(!read.bytesRead)break;length+=read.bytesRead;}
    const bytes=buffer.subarray(0,length);scope.check();if(bytes.length>limit||bytes.length!==before.size||!same(before,await handle.stat()))fail('O arquivo mudou durante a conferência.');
    for(const item of chain){await inspectPath?.(item.target,{check:scope.check});const after=await fs.lstat(item.target);scope.check();if(after.isSymbolicLink()||after.dev!==item.stat.dev||after.ino!==item.stat.ino||item.target===target&&!same(after,before))fail('O caminho mudou durante a conferência.');}
    await scope.checkRoot();return bytes;
  }finally{await handle.close();}
}

export function createKnowledgeInterviewService({policy,vault,profileStore,openCodex,inspectPath,indexProfile,privateFilesystem}={}){
  const inVault=(context,work)=>vault.withContentReadScope(async scope=>{
    const ticket=context?.ticket||policy.requireCapability('useOracle');const check=()=>{scope.check();policy.assertAdmission(ticket);if(context?.signal?.aborted)fail('Entrevista cancelada.','operation_cancelled');};
    check();const guarded={...scope,check,checkRoot:async()=>{check();await scope.checkRoot();check();}};
    const result=await work(guarded);check();return result;
  },{signal:context?.signal});
  const currentRun=async(topic,scope)=>{
    const record=(await profileStore.load()).knowledgeInterviews?.[topic];scope.check();
    if(!record||record.vault!==scope.root)return null;
    if(record.schema_version!==1||!idOK(record.run_id)||record.topic!==topic||!areaOK(record.area,topic)||record.receipt_path!==receiptPath(record.run_id))fail('O roteiro local está inválido. Prepare novamente a entrevista.');
    return record;
  };
  return {
    async prepare(p,context={}){
      args(p,['vault','topic','area','prepareWriteScope']);
      if(!topicOK(p.topic)||!areaOK(p.area,p.topic)||typeof p.vault!=='string'||typeof p.prepareWriteScope!=='boolean')fail('A pasta ou a área mudou. Reabra Knowledge Base.','invalid_request');
      return inVault(context,async scope=>{
        if(p.vault!==scope.root)fail('A pasta selecionada mudou. Reabra Knowledge Base.','stale_admission');
        const run=randomUUID(),record={schema_version:1,run_id:run,vault:scope.root,topic:p.topic,area:p.area,receipt_path:receiptPath(run),started_at:new Date().toISOString(),approval:'not_observed',status:'prepared'};
        // A private plan only. The explicit launch opens the selected vault as
        // the workspace; Codex still owns project trust and write permission.
        await profileStore.update(value=>{scope.check();value.knowledgeInterviews??={};value.knowledgeInterviews[p.topic]=record;return value;},{beforeCommit:scope.check});
        return record;
      });
    },
    async open(p,context={}){
      args(p,['vault','prompt','runID']);if(!idOK(p.runID))fail('Prepare novamente o roteiro.','invalid_request');
      if(typeof openCodex!=='function')fail('Este host não pode abrir o Codex. Use Copiar prompt e cole no Codex.','codex_launch_unavailable');
      return inVault(context,async scope=>{
        if(p.vault!==scope.root)fail('A pasta selecionada mudou. Reabra Knowledge Base.','stale_admission');
        const records=(await profileStore.load()).knowledgeInterviews||{};scope.check();
        const record=Object.values(records).find(row=>row?.run_id===p.runID&&row.vault===scope.root);
        if(!record||typeof p.prompt!=='string'||!p.prompt.includes(record.receipt_path)||!p.prompt.includes(record.run_id))fail('O roteiro não corresponde à entrevista preparada.');
        const link=codexInterviewLink({path:scope.root,prompt:p.prompt});scope.check();
        if(await openCodex(link,{signal:context.signal})!==true)fail('O host não confirmou a abertura do Codex. Use Copiar prompt.','codex_launch_failed');
        scope.check();return {opened:true,promptSent:false,workspace:scope.root};
      });
    },
    async status(p,context={}){
      args(p,['topic']);if(!topicOK(p.topic))fail('Área da entrevista inválida.','invalid_request');
      return inVault(context,async scope=>{
        const record=await currentRun(p.topic,scope);
        if(!record)return {status:'not_started',topic:p.topic,message:'Nenhum comprovante de entrevista foi preparado para esta área.'};
        const result={run_id:record.run_id,topic:p.topic,receipt_path:record.receipt_path,approval:'not_observed',files:'not_verified',index:'not_verified',retrieval:'not_verified',status:'awaiting_receipt'};
        let receiptBytes;try{receiptBytes=await readOriginal(scope,record.receipt_path,524288,inspectPath);}catch(error){if(error.code!=='ENOENT')throw error;return {...result,message:'A entrevista ainda não entregou um comprovante. Continue no Codex e volte para conferir.'};}
        let receipt;try{receipt=JSON.parse(decode(receiptBytes));}catch{fail('O comprovante não contém JSON válido.');}
        const approval=receipt?.approval,approvedFacts=approval?.facts,facts=receipt?.facts,files=receipt?.files,pending=receipt?.pending;
        if(!object(receipt)||receipt.schema_version!==1||receipt.run_id!==record.run_id||receipt.vault!==scope.root||receipt.topic!==record.topic||receipt.area!==record.area||!object(approval)||approval.status!=='confirmed_in_codex'||typeof approval.statement!=='string'||!approval.statement.trim()||Buffer.byteLength(approval.statement)>4096||!Array.isArray(approvedFacts)||!approvedFacts.length||approvedFacts.length>500||!Array.isArray(facts)||!facts.length||facts.length>500||!Array.isArray(files)||!files.length||files.length>128||!Array.isArray(pending)||pending.length>500||pending.some(value=>typeof value!=='string'||Buffer.byteLength(value)>8192))fail('Comprovante incompleto: falta vínculo, aprovação declarada, fatos, arquivos ou pendências.');
        const declared=new Map(),texts=new Map();let total=0;
        for(const file of files){
          if(!object(file)||!relativeOK(file.path)||!file.path.startsWith(record.area+'/')||!file.path.endsWith('.md')||declared.has(file.path)||!hashOK(file.sha256)||!Number.isSafeInteger(file.bytes)||file.bytes<0||file.bytes>2000000)fail('O comprovante contém uma nota duplicada, inválida ou fora da área aprovada.');
          const bytes=await readOriginal(scope,file.path,2000000,inspectPath);
          if(bytes.length!==file.bytes||sha(bytes)!==file.sha256)fail('A nota mudou ou não corresponde ao comprovante: '+file.path);
          total+=bytes.length;if(total>16000000)fail('Divida a entrega em registros menores para conferi-la.');declared.set(file.path,file.sha256);texts.set(file.path,decode(bytes));
        }
        const approved=new Map();for(const fact of approvedFacts){if(!object(fact)||typeof fact.id!=='string'||!fact.id||Buffer.byteLength(fact.id)>100||approved.has(fact.id)||typeof fact.text!=='string'||!fact.text.trim()||Buffer.byteLength(fact.text)>8192)fail('A lista revisada de fatos está inválida.');approved.set(fact.id,fact.text);}
        const covered=new Set();for(const fact of facts){if(!object(fact)||covered.has(fact.id)||!approved.has(fact.id)||approved.get(fact.id)!==fact.text||!Array.isArray(fact.paths)||!fact.paths.length||fact.paths.length>16||new Set(fact.paths).size!==fact.paths.length||fact.paths.some(path=>typeof path!=='string'||!texts.get(path)?.includes(fact.text)))fail('Um fato aprovado não foi encontrado integralmente nas notas vinculadas.');covered.add(fact.id);}
        if(covered.size!==approved.size)fail('Há fatos da lista revisada sem cobertura nas notas.');
        for(const [path,hash] of declared)if(sha(await readOriginal(scope,path,2000000,inspectPath))!==hash)fail('A nota mudou durante a conferência: '+path);
        if(sha(await readOriginal(scope,record.receipt_path,524288,inspectPath))!==sha(receiptBytes))fail('O comprovante mudou durante a conferência.');
        Object.assign(result,{approval:'reported_by_codex',files:'verified',facts_covered:facts.length,files_verified:files.length,pending_count:pending.length,pending,receipt_sha256:sha(receiptBytes),index:'pending',status:pending.length?'files_verified_with_pending':'files_verified',checked_at:new Date().toISOString()});
        // Independent index proof, never inferred from files or a model claim.
        if(typeof indexProfile==='function'){
          const directory=indexProfile(scope.root),manifestPath=join(directory,'oracle-vault-manifest.json'),checkpoint=join(directory,'oracle-vault-checkpoint.json');
          try{
            await assertPrivatePath(directory,{privateFilesystem});scope.check();
            const noCheckpoint=async()=>{try{await fs.lstat(checkpoint);return false;}catch(error){if(error.code==='ENOENT')return true;throw error;}};
            if(await noCheckpoint()){
              const indexScope={...scope,root:directory,checkRoot:async()=>{scope.check();await assertPrivatePath(manifestPath,{privateFilesystem});scope.check();}},inspectIndex=privateFilesystem?target=>privateFilesystem.inspect(target):undefined;
              const bytes=await readOriginal(indexScope,'oracle-vault-manifest.json',32000000,inspectIndex),manifest=JSON.parse(decode(bytes));
              const indexed=new Map();let valid=manifest.root===scope.root&&manifest.complete===true&&Array.isArray(manifest.records)&&manifest.records.length<=100000;
              if(valid)for(const row of manifest.records){if(!object(row)||typeof row.path!=='string'||!hashOK(row.sha256)||indexed.has(row.path)){valid=false;break;}indexed.set(row.path,row.sha256);}
              if(valid&&[...declared].every(([path,hash])=>indexed.get(path)===hash)&&await noCheckpoint()&&sha(await readOriginal(indexScope,'oracle-vault-manifest.json',32000000,inspectIndex))===sha(bytes)&&await noCheckpoint())Object.assign(result,{index:'verified',index_generation:manifest.generation??null,index_manifest_sha256:sha(bytes)});
            }
          }catch(error){scope.check();if(!['ENOENT','invalid_interview','SyntaxError'].includes(error.code||error.name))throw error;}
        }
        // Revalidate originals again after index evidence, within this grant.
        for(const [path,hash] of declared)if(sha(await readOriginal(scope,path,2000000,inspectPath))!==hash)fail('A nota mudou durante a conferência: '+path);
        if(sha(await readOriginal(scope,record.receipt_path,524288,inspectPath))!==sha(receiptBytes))fail('O comprovante mudou durante a conferência.');
        result.message=`${facts.length} fatos declarados no comprovante foram encontrados em ${files.length} notas originais. `+(result.index==='verified'?'Essas versões estão no índice local.':'O índice local ainda precisa concluir a atualização dessas notas.');return result;
      });
    },
  };
}
