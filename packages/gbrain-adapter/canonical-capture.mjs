/** Exclusive canonical capture around the official importer/fact writer.
 * Trusted composition only. Journal ownership is never accepted from RPC JSON.
 * A missing completion receipt with an existing fence is an uncertain commit,
 * not permission to insert another fact. No rollback of committed facts is claimed. */
import {constants,openSync,closeSync,writeFileSync,readFileSync,lstatSync,realpathSync,mkdirSync,existsSync,fsyncSync,renameSync,unlinkSync} from 'node:fs';
import {join,relative} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const same=(a,b)=>a.dev===b.dev&&a.ino===b.ino;
function read(path,max=2_000_000){
 const before=lstatSync(path);if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1||before.size>max||realpathSync(path)!==path)fail('capture_conflict','Arquivo de captura inseguro ou alterado.');
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);try{const bytes=readFileSync(fd);if(!same(before,lstatSync(path))||bytes.length!==before.size)fail('capture_conflict','A captura mudou durante a leitura.');return bytes;}finally{closeSync(fd);}
}
function directory(path,admit,privateDirectory=false){admit();try{mkdirSync(path,{mode:0o700});}catch(error){if(error.code!=='EEXIST')throw error;}const st=lstatSync(path);if(!st.isDirectory()||st.isSymbolicLink()||realpathSync(path)!==path||(privateDirectory&&(st.mode&0o077)))fail('capture_conflict','Diretório de captura inseguro.');admit();}
function exclusive(path,bytes,admit){admit();const fd=openSync(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);try{admit();writeFileSync(fd,bytes);fsyncSync(fd);admit();}finally{closeSync(fd);}}
export function captureIdentity(params){
 const value={fact:params.fact,provenance:params.provenance,kind:params.kind??'fact',visibility:params.visibility??'world',ttl:params.ttl??null,session_id:params.session_id??null};
 return hash(JSON.stringify(value));
}
export async function prepareCanonicalCapture({engine,profile,params,assertAdmission,importPage}){
 const admit=assertAdmission;admit();if(realpathSync(profile)!==profile||lstatSync(profile).isSymbolicLink())fail('capture_conflict','Perfil de captura inseguro.');
 const owner=JSON.parse(read(join(profile,'oracle-owned.json'),32_000));const root=join(owner.vault_root,'INBOX/oracle-memory');
 if(realpathSync(root)!==root||lstatSync(root).isSymbolicLink()||!(await engine.listAllSources()).some(row=>row.id==='oracle-memory'&&row.local_path===root))fail('capture_source_changed','O acervo de memória mudou.');admit();
 const key=captureIdentity(params),slug='topics/oracle-capture-'+key,file=join(root,slug+'.md'),journal=join(profile,'oracle-captures');directory(journal,admit,true);directory(join(root,'topics'),admit);
 const receiptFile=join(journal,key+'.json');let record;
 if(existsSync(receiptFile)){
  record=JSON.parse(read(receiptFile,64_000));if(record.version!==1||record.key!==key||record.root!==root||record.slug!==slug||typeof record.nonce!=='string')fail('capture_conflict','Recibo de captura não corresponde ao acervo.');
 }else{
  if(existsSync(file))fail('capture_conflict','Uma nota existente ocupa o destino de captura. Ela foi preservada.');
  record={version:1,key,root,slug,nonce:randomUUID(),state:'prepared'};exclusive(receiptFile,JSON.stringify(record),admit);
 }
 const marker='<!-- Oracle canonical capture '+key+' '+record.nonce+' -->';
 const initial='---\ntitle: Memória capturada\ntype: topic\n---\n\n# Memória capturada\n\n'+marker+'\n';
 if(!existsSync(file)){
  if(record.state==='complete')fail('capture_conflict','O Markdown da captura foi removido. Sincronize o acervo antes de tentar novamente.');
  exclusive(file,initial,admit);
 }
 const canonical=read(file);if(!canonical.toString('utf8').includes(marker))fail('capture_conflict','A nota no destino pertence a outra captura. Ela foi preservada.');admit();
 const factID=record.result?.content?.map(row=>{try{return JSON.parse(row.text).id;}catch{return undefined;}}).find(value=>value!==undefined);
 if(record.state==='complete'&&factID!==undefined){
  const active=await engine.executeRaw('SELECT id FROM facts WHERE source_id=$1 AND entity_slug=$2 AND id=$3 AND expired_at IS NULL AND (valid_until IS NULL OR valid_until>NOW())',['oracle-memory',slug,Number(factID)]);admit();
  if(active.length){if(hash(canonical)!==record.markdownSHA256)fail('capture_conflict','O Markdown da captura mudou desde o recibo. Sincronize e revise a nota antes de repetir.');return {replay:record.result,slug};}
  // Forget/TTL is authoritative: an explicit subsequent remember is a new
  // request. Keep the expired fence; never resurrect by returning old success.
 }else if(canonical.toString('utf8')!==initial){
  fail('capture_reconciliation_required','Esta captura possui gravação pendente de confirmação. Revise a nota no acervo antes de tentar novamente; nenhum fato foi duplicado.');
 }
 const before=hash(canonical),imported=await importPage(slug,canonical.toString('utf8'),relative(root,file));admit();
 if(imported.error||imported.status==='error'||imported.slug!==slug||hash(read(file))!==before)fail('capture_conflict','A captura mudou durante sua indexação. O original foi preservado.');
 const page=await engine.getPage(slug,{sourceId:'oracle-memory'});if(!page||page.slug!==slug)fail('capture_import_failed','A captura Markdown não foi vinculada ao acervo de memória.');admit();
 return {slug,params:{...params,entity:slug},complete(result){
  admit();if(result.isError)return;const bytes=read(file);if(!bytes.toString('utf8').includes(marker))fail('capture_conflict','A captura foi alterada durante a gravação.');
  const old=read(receiptFile,64_000),next={...record,state:'complete',result,markdownSHA256:hash(bytes)},temp=receiptFile+'.'+randomUUID()+'.tmp';
  try{exclusive(temp,JSON.stringify(next),admit);admit();if(!read(receiptFile,64_000).equals(old))fail('capture_conflict','O recibo de captura mudou.');renameSync(temp,receiptFile);admit();}finally{if(existsSync(temp))unlinkSync(temp);}
 }};
}
