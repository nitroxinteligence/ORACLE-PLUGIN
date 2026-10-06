import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,dirname,resolve,relative,sep} from 'node:path';
import {homedir} from 'node:os';
import {assertSkillsRelease,verifySkillsFile} from './skills-release-admission.mjs';

const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const identity=info=>[info.dev,info.ino].join(':');
const stable=info=>[identity(info),info.size,info.mtimeMs,info.ctimeMs].join(':');

/** Registration is required for readiness; optional account discovery and model
 * execution are separate proofs and cannot turn partial registration into success. */
export function assertCompleteCodexUserSkillsRegistration(admitted,registration){
 assertSkillsRelease(admitted);
 if(!admitted.items.length)fail('codex_skills_catalog_missing','O acervo assinado não contém entradas de skills para o Codex.');
 if(registration?.skippedPreserved>0)fail('codex_skills_registration_partial',`${registration.skippedPreserved} skills editadas foram preservadas. O registro da nova versão no Codex ficou incompleto. Confira as versões recebidas na pasta de recuperação e tente novamente.`);
 if(registration?.complete!==true||registration.registrationVerified!==true||registration.releaseID!==admitted.releaseID||registration.registered!==admitted.items.length)fail('codex_skills_registration_partial','O registro completo das skills no Codex não foi confirmado. Tente novamente.');
 return registration;
}

/** Trusted installer composition, never an RPC path. Register signed curated
 * entrypoints in Codex USER scope after local verification, without copying
 * originals, touching account/config or granting connection/hook consent.
 * Windows directory junctions do not require symlink elevation. */
export function createCodexUserSkillsRegistration({policy,vault,userHome=homedir(),platform=process.platform}={}){
 if(!policy?.assertAdmission||!policy?.revalidateAdmission||!vault?.status||typeof userHome!=='string'||resolve(userHome)!==userHome)fail('codex_skills_registration_unavailable','Pasta de skills do Codex indisponível.');
 let queue=Promise.resolve();
 async function register({admitted,ticket,signal,check=()=>{},preservedPaths=[]}={}){
  assertSkillsRelease(admitted);
  if(!admitted.items.length)fail('codex_skills_catalog_missing','O acervo assinado não contém entradas de skills para o Codex.');
  const selected=vault.status();
  const guard=()=>{policy.assertAdmission(ticket);check();const active=vault.status();if(ticket?.capability!=='configure'||signal?.aborted||!selected.selected||!active.selected||active.root!==selected.root||active.generation!==selected.generation)fail('codex_skills_registration_changed','A autorização ou a pasta mudou durante o registro das skills.');};
  guard();await policy.revalidateAdmission(ticket);guard();
  async function directory(path,expected){
   guard();const info=await fs.lstat(path);
   if(!info.isDirectory()||info.isSymbolicLink()||await fs.realpath(path)!==path||expected&&identity(info)!==expected)fail('codex_skills_path_collision','A pasta de skills foi redirecionada ou substituída.');
   guard();return identity(info);
  }
  const root=selected.root,rootIdentity=await directory(root),homeIdentity=await directory(userHome);
  const sourceDirectory=async path=>{await directory(root,rootIdentity);let cursor=root;for(const part of relative(root,path).split(sep).filter(Boolean)){cursor=join(cursor,part);await directory(cursor);}guard();};
  async function read(path){
   await sourceDirectory(dirname(path));guard();const before=await fs.lstat(path);
   if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1||before.size>32000000)fail('codex_skills_source_changed','Arquivo irregular na skill instalada.');
   const fd=await fs.open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
   try{if(stable(await fd.stat())!==stable(before))fail('codex_skills_source_changed','Arquivo da skill mudou.');const bytes=await fd.readFile();if(stable(await fd.stat())!==stable(before)||stable(await fs.lstat(path))!==stable(before))fail('codex_skills_source_changed','Arquivo da skill mudou.');guard();return bytes;}finally{await fd.close();}
  }
  const destination=join(userHome,'.agents','skills'),rows=[],skipped=[];
  // Verify sources before creating any registration. Retain updater conflicts.
  for(const item of admitted.items){
   const folder=dirname(item.entry),files=admitted.files.filter(row=>row.path.startsWith(folder+'/'));
   if(preservedPaths.some(path=>files.some(row=>row.path===path)||item.requiredFiles.includes(path))){skipped.push(item.hostName);continue;}
   const required=new Set([...files.map(row=>row.path),...item.requiredFiles]);
   for(const path of required)verifySkillsFile(admitted,path,await read(join(root,path)));
   rows.push({name:item.hostName,source:join(root,folder),entry:join(root,item.entry),entryPath:item.entry,link:join(destination,item.hostName),required});
  }
  const parents=new Map([[userHome,homeIdentity]]);
  for(const part of ['.agents','skills']){
   const parent=[...parents.keys()].at(-1),path=join(parent,part);await directory(parent,parents.get(parent));guard();
   await fs.mkdir(path,{mode:0o700}).catch(error=>{if(error.code!=='EEXIST')throw error;});parents.set(path,await directory(path));
  }
  const targetGuard=async()=>{guard();await directory(root,rootIdentity);for(const [path,id] of parents)await directory(path,id);guard();};
  async function existing(row){
   try{const info=await fs.lstat(row.link);if(!info.isSymbolicLink()||await fs.realpath(row.link)!==row.source)fail('codex_skills_registration_conflict',`A skill ${row.name} já existe em outra pasta. O registro existente foi preservado.`);return true;}
   catch(error){if(error.code==='ENOENT'){try{await fs.lstat(row.link);}catch(missing){if(missing.code==='ENOENT')return false;throw missing;}}throw error;}
  }
  await targetGuard();for(const row of rows)await existing(row);
  const created=[];
  try{
   for(const row of rows){
    await targetGuard();
    for(const path of row.required)verifySkillsFile(admitted,path,await read(join(root,path)));
    if(!await existing(row)){await fs.symlink(row.source,row.link,platform==='win32'?'junction':'dir');created.push(row);}
    await targetGuard();if(!await existing(row)||await fs.realpath(join(row.link,'SKILL.md'))!==row.entry)fail('codex_skills_registration_changed','A leitura do registro da skill divergiu.');
    verifySkillsFile(admitted,row.entryPath,await read(row.entry));
   }
   guard();return Object.freeze({registered:rows.length,created:created.length,skippedPreserved:skipped.length,complete:skipped.length===0,destination,releaseID:admitted.releaseID,requiredPaths:Object.freeze(rows.map(row=>row.entry)),registrationVerified:true,discoveryVerified:false,modelExecutionVerified:false});
  }catch(error){
   // Roll back only links this invocation created and whose target is intact.
   for(const row of created.reverse())try{for(const [path,id] of parents){const info=await fs.lstat(path);if(!info.isDirectory()||info.isSymbolicLink()||identity(info)!==id||await fs.realpath(path)!==path)throw Error('Changed parent');}if(await fs.realpath(row.link)===row.source&&(await fs.lstat(row.link)).isSymbolicLink())await fs.unlink(row.link);}catch{}
   throw error;
  }
 }
 const registration=options=>{const task=queue.then(()=>register(options));queue=task.catch(()=>{});return task;};
 // The restore coordinator already verified the complete signed vault corpus.
 // Check every host link and its signed entrypoint without copying the corpus
 // or rebuilding an immutable Codex workspace on every conversation.
 registration.verifyExisting=async({admitted,ticket,signal,check=()=>{}}={})=>{
  assertSkillsRelease(admitted);const selected=vault.status(),destination=join(userHome,'.agents','skills');
  const guard=()=>{policy.assertAdmission(ticket);check();const current=vault.status();if(ticket.capability!=='configure'||signal?.aborted||!current.selected||current.root!==selected.root||current.generation!==selected.generation)fail('codex_skills_registration_changed','A autorização ou a pasta mudou.');};
  guard();await policy.revalidateAdmission(ticket);guard();
  for(const directory of [userHome,join(userHome,'.agents'),destination]){const entry=await fs.lstat(directory);if(entry.isSymbolicLink()||!entry.isDirectory()||await fs.realpath(directory)!==directory)fail('codex_skills_path_collision','A pasta de skills foi redirecionada.');guard();}
  for(const item of admitted.items){
   const link=join(destination,item.hostName),source=join(selected.root,dirname(item.entry)),entry=join(selected.root,item.entry);
   if(!(await fs.lstat(link)).isSymbolicLink()||await fs.realpath(link)!==source||await fs.realpath(join(link,'SKILL.md'))!==entry)fail('codex_skills_registration_conflict','Um registro de skill pertence a outra pasta. O original foi preservado.');
   let cursor=selected.root;for(const part of item.entry.split('/').slice(0,-1)){cursor=join(cursor,part);const info=await fs.lstat(cursor);if(info.isSymbolicLink()||!info.isDirectory())fail('codex_skills_source_changed','O caminho da skill mudou.');guard();}
   const handle=await fs.open(entry,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
   try{const before=await handle.stat();if(!before.isFile()||before.nlink!==1||before.size>32000000)fail('codex_skills_source_changed','Arquivo irregular na skill.');const bytes=await handle.readFile();if(stable(before)!==stable(await handle.stat())||stable(before)!==stable(await fs.lstat(entry)))fail('codex_skills_source_changed','A skill mudou durante a verificação.');verifySkillsFile(admitted,item.entry,bytes);guard();}finally{await handle.close();}
  }
  return Object.freeze({registered:admitted.items.length,created:0,skippedPreserved:0,complete:true,destination,releaseID:admitted.releaseID,registrationVerified:true,discoveryVerified:false,modelExecutionVerified:false});
 };
 return registration;
}
