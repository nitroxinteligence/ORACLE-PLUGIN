import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {join} from 'node:path';
import {updateFixture,syntheticRelease} from './portable-updates-fixture.mjs';
import {admitSkillsRelease,assertSkillsRelease,skillsSHA} from '../packages/oracle-desktop-portable/skills-release-admission.mjs';
import {createSkillsUpdateTransaction} from '../packages/oracle-desktop-portable/skills-update-transaction.mjs';
import {createPortableUpdateService} from '../packages/oracle-desktop-portable/update-service.mjs';
import {createCodexUserSkillsRegistration} from '../packages/oracle-desktop-portable/codex-user-skills-registration.mjs';
const transaction=(f,extra={})=>createSkillsUpdateTransaction({...f,knowledge:{refresh:async()=>({complete:true})},...extra});
test('signed complete skills inventory is independent of engine pins; retired packages never download',async t=>{
 const f=await updateFixture(t,{newFiles:{'SISTEMA/skills/sample/SKILL.md':'# Updated\n','SISTEMA/prompts/retired.md':'Retired'}}),stage=await f.stage();assert.equal(stage.admitted.signatureVerified,true);assert.equal(stage.admitted.files.length,1);assert.ok(!f.fetched.some(url=>url.endsWith('prompts-0001.json')));assert.equal(stage.read('SISTEMA/skills/sample/SKILL.md').toString(),'# Updated\n');assert.throws(()=>stage.read('SISTEMA/prompts/retired.md'));
 assert.throws(()=>assertSkillsRelease({...stage.admitted}),{code:'unadmitted_skills_release'});
 const changed=JSON.parse(f.latest.envelope);changed.signature_base64=Buffer.alloc(64).toString('base64');assert.throws(()=>admitSkillsRelease(Buffer.from(JSON.stringify(changed)),{trust:f.trust}),{code:'invalid_skills_signature'});
 assert.throws(()=>admitSkillsRelease(f.old.envelope,{trust:f.trust,minimumSequence:2}),{code:'skills_rollback'});
 assert.throws(()=>admitSkillsRelease(f.latest.envelope,{trust:f.trust,minimumSequence:2,knownManifestSHA256:'0'.repeat(64)}),{code:'skills_rollback'});
});
test('signed path collisions, incomplete packages and native skills are rejected',async t=>{
 const f=await updateFixture(t);for(const mutate of [doc=>{doc.files.push({...doc.files[0],path:doc.files[0].path.toUpperCase()});doc.inventory_sha256=skillsSHA(Buffer.from('wrong'));return doc;},doc=>{doc.packages[0].files=[];return doc;},doc=>{doc.files[0].path='SISTEMA/skills/../outside';return doc;}]){
  const invalid=syntheticRelease(f.pair,{'SISTEMA/skills/sample/SKILL.md':'Synthetic'},{mutate});assert.throws(()=>admitSkillsRelease(invalid.envelope,{trust:f.trust}));
 }
 const g=await updateFixture(t,{newFiles:{'SISTEMA/skills/sample/SKILL.md':'MZnative'}});await assert.rejects(g.stage(),{code:'native_skills_forbidden'});
});
test('unchanged managed originals replace, new files install and personal/obsolete notes remain',async t=>{
 const f=await updateFixture(t,{oldFiles:{'SISTEMA/skills/sample/SKILL.md':'Old','SISTEMA/skills/obsolete.md':'Keep'},newFiles:{'SISTEMA/skills/sample/SKILL.md':'New','SISTEMA/skills/extra/SKILL.md':'Added'}});await fs.mkdir(join(f.vaultRoot,'AREAS/pessoal'),{recursive:true});await fs.writeFile(join(f.vaultRoot,'AREAS/pessoal/original.md'),'PERSONAL');
 const result=await transaction(f).install(await f.stage(),{previous:f.previous,ticket:f.ticket});assert.equal(result.complete,true);assert.equal(result.indexComplete,true);assert.equal(result.created,1);assert.equal(result.replaced,1);assert.equal(result.obsoletePreserved.length,1);assert.equal(await fs.readFile(join(f.vaultRoot,'AREAS/pessoal/original.md'),'utf8'),'PERSONAL');assert.equal(await fs.readFile(join(f.vaultRoot,'SISTEMA/skills/obsolete.md'),'utf8'),'Keep');assert.equal((await f.source.installed()).sequence,2);
});
test('edited files are preserved with incoming copies; private journals cannot authorize overwrite',async t=>{
 const f=await updateFixture(t);await fs.writeFile(join(f.vaultRoot,'SISTEMA/skills/sample/SKILL.md'),'USER EDIT');await f.profileStore.update(value=>({...value,skillsUpdatePending:{complete:true,files:{'SISTEMA/skills/sample/SKILL.md':'forged'}}}));
 const result=await transaction(f).install(await f.stage(),{previous:f.previous,ticket:f.ticket});assert.equal(result.conflicts.length,1);assert.equal(await fs.readFile(join(f.vaultRoot,'SISTEMA/skills/sample/SKILL.md'),'utf8'),'USER EDIT');assert.equal(await fs.readFile(result.conflicts[0].incoming,'utf8'),'# Updated\n');
});
test('partial index never commits the installed version and retry rechecks files',async t=>{
 const f=await updateFixture(t),stage=await f.stage();let complete=false;
 const worker=transaction(f,{knowledge:{refresh:async()=>({complete})}});await assert.rejects(worker.install(stage,{previous:f.previous,ticket:f.ticket}),{code:'skills_index_partial'});assert.equal((await f.profileStore.load()).skillsInstallation,undefined);assert.equal((await f.profileStore.load()).skillsUpdatePending.complete,false);complete=true;const result=await worker.install(stage,{previous:f.previous,ticket:f.ticket});assert.equal(result.complete,true);assert.equal(result.unchanged,1);
});
test('symlinks, concurrent edits, interruption and revocation preserve originals',async t=>{
 const f=await updateFixture(t);await fs.rename(join(f.vaultRoot,'SISTEMA'),join(f.root,'outside'));await fs.symlink(join(f.root,'outside'),join(f.vaultRoot,'SISTEMA'));await assert.rejects(transaction(f).install(await f.stage(),{previous:f.previous,ticket:f.ticket}),{code:'skills_path_collision'});
 let calls=0,armed=false,target;const g=await updateFixture(t,{inspectPath:async path=>{if(armed&&path===target&&++calls===2)await fs.writeFile(target,'CONCURRENT EDIT');}});target=join(g.vaultRoot,'SISTEMA/skills/sample/SKILL.md');const stage=await g.stage();armed=true;await assert.rejects(transaction(g).install(stage,{previous:g.previous,ticket:g.ticket}),{code:'skills_concurrent_change'});assert.equal(await fs.readFile(target,'utf8'),'CONCURRENT EDIT');
 for(const mode of ['interrupt','license','vault','cancel']){const h=await updateFixture(t,{oldFiles:{'SISTEMA/skills/a.md':'A','SISTEMA/skills/b.md':'B'},newFiles:{'SISTEMA/skills/a.md':'Updated A','SISTEMA/skills/b.md':'Updated B'}}),controller=new AbortController();let first=true;const worker=transaction(h,{afterFile(){if(!first)return;first=false;if(mode==='interrupt')throw new Error('Synthetic interruption');if(mode==='license')h.policy.revoke();if(mode==='vault')h.vault.revoke();if(mode==='cancel')controller.abort();}});await assert.rejects(worker.install(await h.stage(),{previous:h.previous,ticket:h.ticket,signal:controller.signal}));assert.equal(await fs.readFile(join(h.vaultRoot,'SISTEMA/skills/b.md'),'utf8'),'B');assert.equal((await h.profileStore.load()).skillsInstallation,undefined);}
});
test('lost UI acknowledgement is read by request ID and does not reinstall; explicit cancel stops work',async t=>{
 const f=await updateFixture(t);let installed=0,release;const blocker=new Promise(resolve=>release=resolve),updates=createPortableUpdateService({...f,skillsSource:{check:async()=>f.previous,installed:async()=>f.previous,download:async()=>({})},skillsTransaction:{install:async(_stage,{signal})=>{installed++;await blocker;if(signal.aborted)throw new Error('Stopped');return {created:0,replaced:0,unchanged:1,conflicts:[],obsoletePreserved:[],complete:true,indexComplete:true};}},pluginChannel:{check:async()=>({available:false}),apply:async()=>({installed:false})}});
 updates.start({requestID:'check_0001',operation:'check'},{ticket:f.ticket});await updates.settled();const controller=new AbortController();updates.start({requestID:'install_0001',operation:'skills'},{ticket:f.ticket,signal:controller.signal});controller.abort();await new Promise(resolve=>setImmediate(resolve));updates.start({requestID:'install_0001',operation:'skills'},{ticket:f.ticket});assert.equal(installed,1);assert.throws(()=>updates.start({requestID:'install_0001',operation:'oracle'},{ticket:f.ticket}),{code:'update_request_conflict'});updates.cancel('install_0001');release();const status=await updates.settled();assert.equal(status.phase,'paused');assert.equal(installed,1);await updates.close();
});
test('completed update passes authenticated catalog and preserved conflicts to local registration without a Codex account',async t=>{
 const f=await updateFixture(t),updates=createPortableUpdateService({...f,skillsSource:f.source,skillsTransaction:transaction(f),pluginChannel:{check:async()=>({available:false})},afterSkillsInstall:async context=>{
  assertSkillsRelease(context.admitted);assert.equal(context.admitted.sequence,2);assert.equal(context.ticket,f.ticket);assert.equal(context.receipt.complete,false);assert.equal(context.receipt.indexComplete,true);assert.equal((await f.profileStore.load()).skillsInstallation,undefined);context.check();return {localRegistrationCalled:true,connected:false};
 }});
 updates.start({requestID:'check_register_0001',operation:'check'},{ticket:f.ticket});await updates.settled();
 updates.start({requestID:'install_register_0001',operation:'skills'},{ticket:f.ticket});const result=await updates.settled();assert.equal(result.phase,'complete');assert.equal(result.receipt.integration.localRegistrationCalled,true);assert.equal(result.receipt.integration.connected,false);await updates.close();
});
test('registration failure preserves the prior release, keeps recovery and permits a verified retry without an account',async t=>{
 const entry='SISTEMA/skills/sample/SKILL.md',name='oracle-skill-'+ 'a'.repeat(20),f=await updateFixture(t,{items:[{kind:'skill',host_name:name,entry,required_files:[entry]}]}),userHome=join(f.root,'user');await fs.mkdir(userHome);
 const destination=join(userHome,'.agents/skills',name);await fs.mkdir(destination,{recursive:true});await fs.writeFile(join(destination,'SKILL.md'),'UNRELATED USER SKILL');
 const register=createCodexUserSkillsRegistration({policy:f.policy,vault:f.vault,userHome}),updates=createPortableUpdateService({...f,skillsSource:f.source,skillsTransaction:transaction(f),pluginChannel:{check:async()=>({available:false})},afterSkillsInstall:async context=>({registration:await register({...context,preservedPaths:context.receipt.conflicts.map(row=>row.path)}),connected:false})});
 updates.start({requestID:'check_failure_0001',operation:'check'},{ticket:f.ticket});await updates.settled();
 updates.start({requestID:'install_failure_0001',operation:'skills'},{ticket:f.ticket});const failed=await updates.settled(),pending=(await f.profileStore.load()).skillsUpdatePending;
 assert.equal(failed.phase,'failed');assert.equal(failed.error.code,'codex_skills_registration_conflict');assert.equal(failed.receipt.complete,false);assert.equal(failed.receipt.indexComplete,true);assert.equal(failed.receipt.recoveryPath,pending.recoveryPath);assert.equal(pending.complete,false);assert.equal((await f.source.installed()).sequence,1);assert.equal(await fs.readFile(join(destination,'SKILL.md'),'utf8'),'UNRELATED USER SKILL');
 updates.start({requestID:'check_retry_0001',operation:'check'},{ticket:f.ticket});assert.equal((await updates.settled()).skills.available,true);
 await fs.rename(destination,join(userHome,'preserved-user-skill'));updates.start({requestID:'install_retry_0001',operation:'skills'},{ticket:f.ticket});const completed=await updates.settled();assert.equal(completed.phase,'complete');assert.equal(completed.receipt.integration.registration.complete,true);assert.equal(completed.receipt.integration.connected,false);assert.equal(await fs.realpath(join(destination,'SKILL.md')),join(f.vaultRoot,entry));assert.equal((await f.source.installed()).sequence,2);assert.equal((await f.profileStore.load()).skillsUpdatePending,null);await updates.close();
});
test('edited skill references never become a successful partial Codex update',async t=>{
 const entry='SISTEMA/skills/sample/SKILL.md',reference='SISTEMA/skills/sample/references/context.md',name='oracle-skill-'+ 'a'.repeat(20),f=await updateFixture(t,{oldFiles:{[entry]:'# Original',[reference]:'Original reference'},newFiles:{[entry]:'# Updated',[reference]:'Updated reference'},items:[{kind:'skill',host_name:name,entry,required_files:[entry,reference]}]}),userHome=join(f.root,'user');await fs.mkdir(userHome);await fs.writeFile(join(f.vaultRoot,reference),'USER EDIT');
 const register=createCodexUserSkillsRegistration({policy:f.policy,vault:f.vault,userHome}),updates=createPortableUpdateService({...f,skillsSource:f.source,skillsTransaction:transaction(f),pluginChannel:{check:async()=>({available:false})},afterSkillsInstall:async context=>({registration:await register({...context,preservedPaths:context.receipt.conflicts.map(row=>row.path)}),connected:false})});
 updates.start({requestID:'check_edited_0001',operation:'check'},{ticket:f.ticket});await updates.settled();updates.start({requestID:'install_edited_0001',operation:'skills'},{ticket:f.ticket});const result=await updates.settled();
 assert.equal(result.phase,'failed');assert.equal(result.error.code,'codex_skills_registration_partial');assert.equal(result.receipt.complete,false);assert.equal(result.receipt.conflicts,1);assert.equal(result.receipt.integration.registration.skippedPreserved,1);assert.equal((await f.source.installed()).sequence,1);assert.equal(await fs.readFile(join(f.vaultRoot,reference),'utf8'),'USER EDIT');const pending=(await f.profileStore.load()).skillsUpdatePending;assert.equal(pending.indexComplete,true);assert.equal(pending.complete,false);assert.equal(await fs.readFile(pending.conflicts[0].incoming,'utf8'),'Updated reference');await updates.close();
});
test('revocation during final integration cannot commit a complete release',async t=>{
 for(const mode of ['cancel','vault','license'])await t.test(mode,async t=>{
  const f=await updateFixture(t),controller=new AbortController();await assert.rejects(transaction(f).install(await f.stage(),{previous:f.previous,ticket:f.ticket,signal:controller.signal,afterIndexVerified:async()=>{if(mode==='cancel')controller.abort();if(mode==='vault')f.vault.revoke();if(mode==='license')f.policy.revoke();}}));const profile=await f.profileStore.load();assert.equal(profile.skillsInstallation,undefined);assert.equal(profile.skillsUpdatePending.complete,false);assert.equal(profile.skillsUpdatePending.indexComplete,true);
 });
});
test('a signed Codex catalog cannot complete when its registration integration is unavailable',async t=>{
 const entry='SISTEMA/skills/sample/SKILL.md',f=await updateFixture(t,{items:[{kind:'skill',host_name:'oracle-skill-'+ 'a'.repeat(20),entry,required_files:[entry]}]}),updates=createPortableUpdateService({...f,skillsSource:f.source,skillsTransaction:transaction(f),pluginChannel:{check:async()=>({available:false})}});
 updates.start({requestID:'check_missing_0001',operation:'check'},{ticket:f.ticket});await updates.settled();updates.start({requestID:'install_missing_0001',operation:'skills'},{ticket:f.ticket});const result=await updates.settled();assert.equal(result.phase,'failed');assert.equal(result.error.code,'codex_skills_registration_partial');assert.equal(result.receipt.complete,false);assert.equal((await f.source.installed()).sequence,1);await updates.close();
});
