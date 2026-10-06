import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {updateFixture,syntheticRelease} from './portable-updates-fixture.mjs';
import {admitSkillsRelease} from '../packages/oracle-desktop-portable/skills-release-admission.mjs';
import {createCodexUserSkillsRegistration,assertCompleteCodexUserSkillsRegistration} from '../packages/oracle-desktop-portable/codex-user-skills-registration.mjs';

const names=['oracle-skill-'+ 'a'.repeat(20),'oracle-skill-'+ 'b'.repeat(20)];
const entries=['SISTEMA/skills/first/SKILL.md','SISTEMA/skills/second/SKILL.md'];
const reference='SISTEMA/skills/first/references/context.md';
const files={[entries[0]]:`---\nname: ${names[0]}\ndescription: Synthetic first skill.\n---\nRead references/context.md.\n`,[entries[1]]:`---\nname: ${names[1]}\ndescription: Synthetic second skill.\n---\n# Second\n`,[reference]:'# Synthetic original reference\n'};
const items=entries.map((entry,i)=>({kind:'skill',host_name:names[i],entry,required_files:i?[entry]:[entry,reference]}));
async function fixture(t){
 const f=await updateFixture(t,{oldFiles:files,newFiles:files}),userHome=join(f.root,'user');await fs.mkdir(userHome);
 const release=syntheticRelease(f.pair,files,{mutate:doc=>({...doc,items})}),admitted=admitSkillsRelease(release.envelope,{trust:f.trust});
 const register=createCodexUserSkillsRegistration({policy:f.policy,vault:f.vault,userHome});
 return {...f,userHome,destination:join(userHome,'.agents/skills'),register,admitted};
}
test('signed complete directories register in USER scope and retries preserve originals and other skills',async t=>{
 const f=await fixture(t);await fs.mkdir(join(f.destination,'unrelated'),{recursive:true});await fs.writeFile(join(f.destination,'unrelated/SKILL.md'),'USER');
 const first=await f.register({admitted:f.admitted,ticket:f.ticket});assert.equal(first.registered,2);assert.equal(first.created,2);assert.equal(first.registrationVerified,true);assert.equal(first.discoveryVerified,false);assert.equal(first.modelExecutionVerified,false);
 assert.equal(assertCompleteCodexUserSkillsRegistration(f.admitted,first),first);
 for(let i=0;i<2;i++){assert.equal(await fs.realpath(join(f.destination,names[i],'SKILL.md')),join(f.vaultRoot,entries[i]));assert.equal(await fs.readFile(join(f.vaultRoot,entries[i]),'utf8'),files[entries[i]]);}
 assert.equal(await fs.readFile(join(f.destination,names[0],'references/context.md'),'utf8'),files[reference]);
 assert.equal((await f.register({admitted:f.admitted,ticket:f.ticket})).created,0);
 const verified=await f.register.verifyExisting({admitted:f.admitted,ticket:f.ticket});assert.equal(verified.created,0);assert.equal(assertCompleteCodexUserSkillsRegistration(f.admitted,verified),verified);
 assert.equal(await fs.readFile(join(f.destination,'unrelated/SKILL.md'),'utf8'),'USER');assert.equal(existsSync(join(f.userHome,'.codex')),false);
});
test('existing registration rejects changed entrypoints, replaced host links and revocation',async t=>{
 for(const mode of ['entry','link','revoked'])await t.test(mode,async t=>{
  const f=await fixture(t);await f.register({admitted:f.admitted,ticket:f.ticket});
  if(mode==='entry')await fs.writeFile(join(f.vaultRoot,entries[0]),'USER EDIT');
  if(mode==='link'){await fs.unlink(join(f.destination,names[0]));await fs.mkdir(join(f.destination,names[0]));await fs.writeFile(join(f.destination,names[0],'SKILL.md'),'USER SKILL');}
  if(mode==='revoked')f.policy.revoke();
  await assert.rejects(f.register.verifyExisting({admitted:f.admitted,ticket:f.ticket}));
  if(mode==='entry')assert.equal(await fs.readFile(join(f.vaultRoot,entries[0]),'utf8'),'USER EDIT');
  if(mode==='link')assert.equal(await fs.readFile(join(f.destination,names[0],'SKILL.md'),'utf8'),'USER SKILL');
 });
});
test('registration preflight rejects unmanaged collisions, redirected parents and modified references',async t=>{
 for(const mode of ['collision','source-link','destination-link','modified-reference']){
  await t.test(mode,async t=>{const f=await fixture(t);
   if(mode==='collision'){await fs.mkdir(join(f.destination,names[1]),{recursive:true});await fs.writeFile(join(f.destination,names[1],'SKILL.md'),'USER');}
   if(mode==='source-link'){const original=join(f.vaultRoot,'SISTEMA/skills/first');await fs.rename(original,join(f.root,'outside'));await fs.symlink(join(f.root,'outside'),original,'dir');}
   if(mode==='destination-link'){await fs.mkdir(join(f.root,'outside'));await fs.symlink(join(f.root,'outside'),join(f.userHome,'.agents'),'dir');}
   if(mode==='modified-reference')await fs.writeFile(join(f.vaultRoot,reference),'USER EDIT');
   await assert.rejects(f.register({admitted:f.admitted,ticket:f.ticket}));assert.equal(existsSync(join(f.destination,names[0])),false);
   if(mode==='collision')assert.equal(await fs.readFile(join(f.destination,names[1],'SKILL.md'),'utf8'),'USER');
   if(mode==='modified-reference')assert.equal(await fs.readFile(join(f.vaultRoot,reference),'utf8'),'USER EDIT');
  });
 }
});
test('forged admission, malformed signed identities and revoked configuration cannot register skills',async t=>{
 const f=await fixture(t);await assert.rejects(f.register({admitted:{...f.admitted},ticket:f.ticket}),{code:'unadmitted_skills_release'});
 for(const mutate of [items=>items.map(row=>({...row,host_name:'../../outside'})),items=>[items[0],items[0]],items=>items.map(row=>({...row,required_files:[row.entry,'SISTEMA/skills/missing.md']}))]){
  const release=syntheticRelease(f.pair,files,{mutate:doc=>({...doc,items:mutate(items)})});assert.throws(()=>admitSkillsRelease(release.envelope,{trust:f.trust}),{code:'invalid_skills_items'});
 }
 f.policy.revoke();await assert.rejects(f.register({admitted:f.admitted,ticket:f.ticket}));assert.equal(existsSync(f.destination),false);
});
test('cancellation after a created link rolls back only this invocation and preserves updater conflicts',async t=>{
 const f=await fixture(t);let interrupted=false;
 await assert.rejects(f.register({admitted:f.admitted,ticket:f.ticket,check(){if(!interrupted&&existsSync(join(f.destination,names[0]))){interrupted=true;throw Error('Synthetic interruption');}}}));
 assert.deepEqual(await fs.readdir(f.destination),[]);
 await fs.writeFile(join(f.vaultRoot,reference),'USER EDIT');
 const report=await f.register({admitted:f.admitted,ticket:f.ticket,preservedPaths:[reference]});assert.equal(report.registered,1);assert.equal(report.skippedPreserved,1);assert.equal(report.complete,false);assert.equal(existsSync(join(f.destination,names[0])),false);assert.equal(await fs.readFile(join(f.vaultRoot,reference),'utf8'),'USER EDIT');
 assert.throws(()=>assertCompleteCodexUserSkillsRegistration(f.admitted,report),{code:'codex_skills_registration_partial'});
});
