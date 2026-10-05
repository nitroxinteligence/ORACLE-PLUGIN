import {realpathSync,lstatSync} from 'node:fs';
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
/** Discovery is not execution. Workspace/required paths and managed-file verifier
 * come from the admitted installation, never model or UI fields. No turn/start. */
export function createCodexSkillsRouting({connection,policy,vault,installationProvider}={}){
 const receipts=new WeakMap();let epoch=0;
 const check=record=>{policy.assertAdmission(record.ticket);const selected=vault.status();if(record.epoch!==epoch||!selected.selected||selected.root!==record.root||selected.generation!==record.generation)fail('codex_skills_changed','A instalação ou o vault mudou.');record.installation.assertCurrent();};
 return Object.freeze({
  async discover({signal}={}){
   if(typeof installationProvider!=='function'||typeof connection?.skillsList!=='function')fail('codex_skills_unavailable','A descoberta exige a instalação verificada no workspace do Codex.');
   const ticket=policy.requireCapability('configure'),selected=vault.status();if(!selected.selected)fail('vault_required','Escolha o Obsidian.');
   const account=await connection.verifyActiveConnection();if(!account.connected||!account.explicitAuthorization)fail('relay_connection_inactive','Conecte explicitamente ao Codex.');
   const installation=await installationProvider({ticket,signal});if(typeof installation?.assertCurrent!=='function'||typeof installation?.verifyManagedFiles!=='function'||!Array.isArray(installation.requiredPaths)||!installation.requiredPaths.length)fail('codex_skills_unavailable','As skills instaladas ainda não foram verificadas.');
   const canonical=path=>typeof path==='string'&&realpathSync(path)===path&&lstatSync(path).isDirectory();
   if(!canonical(installation.workspace)||installation.requiredPaths.some(path=>typeof path!=='string'||realpathSync(path)!==path))fail('codex_skills_unavailable','O workspace ou as skills não correspondem à instalação.');
   const record={ticket,root:selected.root,generation:selected.generation,epoch,installation,sessionID:account.sessionID};check(record);await policy.revalidateAdmission(ticket);check(record);await installation.verifyManagedFiles({signal});check(record);
   const result=await connection.skillsList({cwd:installation.workspace,signal});check(record);
   const row=Array.isArray(result?.data)?result.data.find(row=>row.cwd===installation.workspace):null;
   if(!row||!Array.isArray(row.skills)||row.errors?.length)fail('codex_skills_missing','O Codex não descobriu todas as skills no workspace autorizado.');
   const found=new Set(row.skills.filter(skill=>skill.enabled===true&&typeof skill.path==='string').map(skill=>{try{return realpathSync(skill.path);}catch{return null;}}));
   if(installation.requiredPaths.some(path=>!found.has(path)))fail('codex_skills_missing','Há skills instaladas ainda não descobertas pelo Codex.');
   const current=await connection.verifyActiveConnection();check(record);if(signal?.aborted||!current.connected||current.sessionID!==record.sessionID)fail('codex_skills_changed','A conexão mudou.');await installation.verifyManagedFiles({signal});check(record);
   const receipt=Object.freeze({discoveryVerified:true,skills:installation.requiredPaths.length,workspace:installation.workspace,modelExecutionVerified:false,hooksTrusted:false});receipts.set(receipt,record);return receipt;
  },
  assertCurrent(receipt){const record=receipts.get(receipt);if(!record)fail('codex_skills_receipt_invalid','Descoberta não verificada.');check(record);return receipt;},
  invalidate(){epoch++;},
 });
}
