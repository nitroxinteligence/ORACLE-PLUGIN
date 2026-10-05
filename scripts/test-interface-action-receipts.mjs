import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {resolve,join} from 'node:path';
import vm from 'node:vm';
import {createService} from '../packages/oracle-desktop-portable/service.mjs';
import {createProfileStore} from '../packages/oracle-desktop-portable/profile-store.mjs';

test('removing interface lock does not grant a license, a vault or capture consent',async t=>{
 const root=await fs.mkdtemp(resolve('.work/interface-receipts-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const dataDir=join(root,'private');
 await createProfileStore({dataDir}).save({locked:true,protected:true,vault:'/synthetic/stale-vault',role:'owner'});
 const service=await createService({root:resolve('packages/oracle-desktop-portable'),resourcesRoot:resolve('Resources'),dataDir,providers:{}});
 t.after(()=>service.close());
 assert.equal((await service.dispatcher.dispatch('boot',{})).locked,false);
 assert.equal(service.policy.snapshot().active,false);
 assert.equal(service.vault.status().selected,false);
 assert.equal(service.memoryConsent.snapshot().portabilityAuthorized,false);
 for(const method of ['lock','unlock','protect'])await assert.rejects(service.dispatcher.dispatch(method,{}),{code:'UNSUPPORTED_CAPABILITY'});
 await assert.rejects(service.dispatcher.dispatch('read',{path:'Note.md'}),{code:'access_denied'});
 const generation=service.policy.snapshot().generation;
 await service.close();
 assert.equal(service.policy.snapshot().blocked,true);
 assert.ok(service.policy.snapshot().generation>generation);
});

test('feedback confirms only actual action receipts and stays quiet for reads and cancelled actions',async()=>{
 const context={window:{}};vm.runInNewContext(await fs.readFile('Resources/web/action-feedback.js','utf8'),context);
 const notices=[],toast=(text,tone)=>notices.push({text,tone}),complete=(method,value,label)=>context.window.OracleActionFeedback.completed(method,value,{label,toast});
 for(const value of [false,null,undefined,{cancelled:true},{opened:false}])complete('copy',value,'prompt');
 complete('snapshot',true);complete('saveDraft',{saved:true});complete('onboardingOpenKnowledgeCodex',{opened:false});
 assert.deepEqual(notices,[]);
 complete('copy',true,'prompt');complete('onboardingOpenKnowledgeCodex',{opened:true,promptSent:false});
 assert.equal(notices[0].text,'Prompt copiado.');assert.equal(notices[0].tone,'success');
 assert.match(notices[1].text,/Pressione Enviar/);
});
