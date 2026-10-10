import fs from 'node:fs/promises';
import {join} from 'node:path';
import {constants} from 'node:fs';
import {assertPrivatePath} from './profile-store.mjs';
import {loadReviewedContentTrust} from './content-admission.mjs';
import {admitSkillsRelease,assertSkillsRelease,skillsSHA,skillsBase64,verifySkillsFile} from './skills-release-admission.mjs';
import {releaseBytes,latestRelease} from './release-network.mjs';
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const repository='nitroxinteligence/ORACLE-SKILLS';
const stages=new WeakMap();
export function assertSkillsStage(stage){if(!stages.has(stage))fail('unadmitted_skills_stage','Download sem admissão.');return stage;}
/** Independent skill feed, existing public schema 3 signature and private cache. */
export function createSkillsReleaseSource({bundleRoot,dataDir,policy,profileStore,vault,fetchImpl=globalThis.fetch,privateFilesystem}={}){
 const trust=loadReviewedContentTrust(join(bundleRoot,'resources'));let current;
 const check=({ticket,signal})=>{policy.assertAdmission(ticket);if(signal?.aborted)fail('operation_cancelled','Atualização cancelada.');};
 async function baseline(){if(!current){const bytes=await fs.readFile(join(bundleRoot,'engine-source/provenance/oracle-distribution.json'));current=admitSkillsRelease(bytes,{trust});}return current;}
 return Object.freeze({baseline,
  async installed(){const bundled=await baseline(),record=(await profileStore.load()).skillsInstallation;if(!record||vault&&record.vault!==vault.status().root)return bundled;
   if(!/^[a-f0-9]{64}$/.test(record.manifestSHA256??''))fail('invalid_skills_receipt','Recibo de acervo inválido.');
   const path=join(dataDir,'skills-manifests',record.manifestSHA256+'.json');await assertPrivatePath(path,{privateFilesystem});const info=await fs.lstat(path);if(!info.isFile()||info.nlink!==1||info.size>24000000)fail('invalid_skills_receipt','Manifesto instalado irregular.');
   const bytes=await fs.readFile(path);if(skillsSHA(bytes)!==record.manifestSHA256)fail('invalid_skills_receipt','Manifesto instalado mudou.');
   // A newer executable bundle is not proof that its corpus was installed.
   // Keep the actual signed installed version until the skills transaction ends.
   return admitSkillsRelease(bytes,{trust,minimumSequence:record.sequence||0,knownManifestSHA256:record.manifestSHA256});
  },
  async check(options){await policy.revalidateAdmission(options.ticket);check(options);const bundled=await baseline(),profile=await profileStore.load(),prior=profile.skillsFeed||{};
   const release=await latestRelease(repository,{fetchImpl,signal:options.signal,check:()=>check(options)}),assets=release.assets.filter(row=>row.name==='oracle-distribution.json');
   if(assets.length!==1||!Number.isSafeInteger(assets[0].size)||assets[0].size<1||assets[0].size>24000000||!/^sha256:[a-f0-9]{64}$/.test(assets[0].digest??'')||assets[0].browser_download_url!==`https://github.com/${repository}/releases/download/${release.tag_name}/oracle-distribution.json`)fail('invalid_skills_release','Asset de acervo inválido.');
   const asset=assets[0],bytes=await releaseBytes(asset.browser_download_url,{fetchImpl,signal:options.signal,check:()=>check(options),maximum:24000000,expectedBytes:asset.size});
   if('sha256:'+skillsSHA(bytes)!==asset.digest)fail('skills_file_changed','Manifesto diverge do asset publicado.');
   const floor=Math.max(bundled.sequence,prior.sequence||0),known=floor===prior.sequence?prior.manifestSHA256:bundled.manifestSHA256,admitted=admitSkillsRelease(bytes,{trust,minimumSequence:floor,knownManifestSHA256:known});
   if(admitted.releaseID!==release.tag_name)fail('invalid_skills_release','Manifesto não pertence à release.');
   await policy.revalidateAdmission(options.ticket);check(options);
   const manifestDir=join(dataDir,'skills-manifests');await assertPrivatePath(dataDir,{privateFilesystem});await fs.mkdir(manifestDir,{recursive:true,mode:0o700});await assertPrivatePath(manifestDir,{privateFilesystem});check(options);
   const manifestPath=join(manifestDir,admitted.manifestSHA256+'.json');try{await fs.writeFile(manifestPath,bytes,{mode:0o600,flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;await assertPrivatePath(manifestPath,{privateFilesystem});if(skillsSHA(await fs.readFile(manifestPath))!==admitted.manifestSHA256)fail('skills_file_changed','Cache do manifesto alterado.');}
   await profileStore.update(value=>{check(options);const latest=value.skillsFeed||{};if(latest.sequence>admitted.sequence||latest.sequence===admitted.sequence&&latest.manifestSHA256!==admitted.manifestSHA256)fail('skills_rollback','A release mudou durante a consulta.');return {...value,skillsFeed:{sequence:admitted.sequence,manifestSHA256:admitted.manifestSHA256,releaseID:admitted.releaseID}};},{beforeCommit:()=>check(options)});
   check(options);return admitted;
  },
  async download(admitted,options){assertSkillsRelease(admitted);await policy.revalidateAdmission(options.ticket);check(options);
   await assertPrivatePath(dataDir,{privateFilesystem});const cache=join(dataDir,'skills-release-cache');await fs.mkdir(cache,{recursive:true,mode:0o700});await assertPrivatePath(cache,{privateFilesystem});
   const files=new Map(),inventory=new Map(admitted.files.map(row=>[row.path,row]));
   for(const pkg of admitted.packages){check(options);const path=join(cache,pkg.sha256+'.json');let bytes;
    try{await assertPrivatePath(path,{privateFilesystem});const fd=await fs.open(path,constants.O_RDONLY|constants.O_NOFOLLOW);try{const before=await fd.stat();if(!before.isFile()||before.nlink!==1||before.size!==pkg.bytes)fail('skills_file_changed','Cache irregular.');bytes=await fd.readFile();const after=await fd.stat();if(before.ino!==after.ino||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs)fail('skills_file_changed','Cache mudou durante a leitura.');}finally{await fd.close();}}
    catch(error){if(error.code!=='ENOENT')throw error;bytes=await releaseBytes(pkg.url,{fetchImpl,signal:options.signal,check:()=>check(options),maximum:pkg.bytes,expectedBytes:pkg.bytes});if(skillsSHA(bytes)!==pkg.sha256)fail('skills_file_changed','Pacote diverge do inventário.');check(options);await assertPrivatePath(cache,{privateFilesystem});await fs.writeFile(path,bytes,{mode:0o600,flag:'wx'});}
    if(bytes.length!==pkg.bytes||skillsSHA(bytes)!==pkg.sha256)fail('skills_file_changed','Cache diverge do inventário.');
    let doc;try{doc=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('invalid_skills_package','Pacote inválido.');}
    if(doc.schema_version!==3||doc.release_id!==admitted.releaseID||doc.id!==pkg.id||!Array.isArray(doc.files)||doc.files.length!==pkg.files.length)fail('invalid_skills_package','Identidade do pacote diverge.');
    for(const row of doc.files){check(options);const expected=inventory.get(row.path);if(!expected||expected.package_id!==pkg.id||files.has(row.path)||row.sha256!==expected.sha256||row.size!==expected.size||row.mode!==expected.mode)fail('invalid_skills_package','Arquivo fora do pacote.');const content=skillsBase64(row.content_base64);verifySkillsFile(admitted,row.path,content);files.set(row.path,content);}
   }
   if(files.size!==admitted.files.length)fail('invalid_skills_inventory','Download incompleto.');await policy.revalidateAdmission(options.ticket);check(options);
   const stage=Object.freeze({admitted,read(path){const bytes=files.get(path);verifySkillsFile(admitted,path,bytes??Buffer.alloc(0));return Buffer.from(bytes);}});stages.set(stage,true);return stage;
  }
 });
}
