import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {createProfileStore} from '../packages/oracle-desktop-portable/profile-store.mjs';
import {createPersistentVaultSelection} from '../packages/oracle-desktop-portable/persistent-vault-selection.mjs';
import {createVaultService} from '../packages/oracle-desktop-portable/vault-service.mjs';
import {createVaultRestoration,describeVaultRestorationError} from '../packages/oracle-desktop-portable/vault-restoration.mjs';

const base=resolve('.work/portable-reopen-tests');await fs.mkdir(base,{recursive:true});
async function scratch(){const root=await fs.mkdtemp(join(base,'synthetic-'));return {root,cleanup:()=>fs.rm(root,{recursive:true,force:true})};}
test('independent stores serialize the whole read/modify/commit transaction',async()=>{
 const work=await scratch();try{
  const first=createProfileStore({dataDir:work.root}),second=createProfileStore({dataDir:work.root});await first.save({preferences:{onboardingStep:'install'}});
  let entered;const ready=new Promise(resolve=>entered=resolve);
  const write=first.update(async value=>{entered();await new Promise(resolve=>setTimeout(resolve,75));return {...value,preferences:{onboardingStep:'vault'}};});
  await ready;const other=second.update(value=>({...value,knowledgeReceipt:{verified:true}}));await Promise.all([write,other]);
  assert.deepEqual(await second.load(),{preferences:{onboardingStep:'vault'},knowledgeReceipt:{verified:true}});
 }finally{await work.cleanup();}
});
test('separate writer processes retain every concurrent counter update',async()=>{
 const work=await scratch();try{
  const store=createProfileStore({dataDir:work.root});await store.save({count:0});
  const module=resolve('packages/oracle-desktop-portable/profile-store.mjs');
  const code=`import {createProfileStore} from ${JSON.stringify(module)};const store=createProfileStore({dataDir:process.argv[1]});for(let i=0;i<8;i++)await store.update(async value=>{await new Promise(resolve=>setTimeout(resolve,5));return {...value,count:value.count+1};});`;
  const run=()=>new Promise((yes,no)=>{const child=spawn(process.execPath,['--input-type=module','--eval',code,work.root],{stdio:['ignore','ignore','pipe'],shell:false});let error='';child.stderr.on('data',value=>error+=value);child.on('error',no);child.on('exit',status=>status===0?yes():no(Error(error)));});
  await Promise.all([run(),run()]);assert.equal((await store.load()).count,16);
 }finally{await work.cleanup();}
});
test('restore needs a live OS lease and the original directory identity; revoke closes it',async()=>{
 const work=await scratch();try{
  const root=join(work.root,'vault');await fs.mkdir(root);const profileStore=createProfileStore({dataDir:join(work.root,'private')});let grants=0,releases=0,stale=false;
  const bookmarks={async createBookmark({path,userInitiated}){assert.equal(userInitiated,true);return {version:1,path,bookmarkBase64:'c3ludGhldGlj'};},async acquireDirectoryGrant(record){if(stale)throw Object.assign(Error(),{code:'directory_grant_stale'});grants++;let live=true;return {path:record.path,assertActive(){assert(live);},release(){if(live){live=false;releases++;}}};}};
  const make=()=>createVaultService({profileStore,selectionAdapter:createPersistentVaultSelection({profileStore,bookmarks,chooseDirectory:async()=>({path:root})})});
  const first=make();await first.selectVault();assert.equal(first.status().selected,true);first.revoke();assert.equal(releases,1);
  const reopened=make();await reopened.restoreVault();assert.equal(reopened.status().root,root);assert.equal(grants,2);await reopened.forgetVault();assert.equal(releases,2);assert.equal(await make().restoreVault(),null);
  await first.selectVault();first.revoke();stale=true;await assert.rejects(make().restoreVault(),{code:'directory_grant_stale'});stale=false;
  await profileStore.update(value=>({...value,vaultSelection:{...value.vaultSelection,rootIdentity:{dev:0,ino:0}}}));await assert.rejects(make().restoreVault(),{code:'directory_grant_changed'});assert.equal(releases,4);
 }finally{await work.cleanup();}
});
test('a saved path and completion flags cannot replace an OS grant',async()=>{
 const work=await scratch();try{
  const profileStore=createProfileStore({dataDir:work.root});await profileStore.save({vaultSelection:{root:work.root},onboardingContentCoordinator:{completed:true,localContentVerified:true}});
  const vault=createVaultService({profileStore,selectionAdapter:{selectVault:async()=>null}});assert.equal(await vault.restoreVault(),null);assert.equal(vault.status().selected,false);
  const forged=createVaultService({profileStore,selectionAdapter:{selectVault:async()=>null,restoreVault:async()=>({root:work.root,persistentSelection:true})}});await assert.rejects(forged.restoreVault(),{code:'EXPLICIT_SELECTION_REQUIRED'});assert.equal(forged.status().selected,false);
 }finally{await work.cleanup();}
});
test('a dormant conversation notices a later bookmark and concurrent polls share one restoration',async()=>{
 let record=null,selected=false,attempts=0,release;
 const barrier=new Promise(resolve=>release=resolve);
 const restoration=createVaultRestoration({profileStore:{load:async()=>({vaultSelection:record})},canRestore:()=>!selected,restore:async()=>{attempts++;if(!record)return false;await barrier;selected=true;return true;}});
 await restoration.ensure();assert.equal(attempts,1);
 record={bookmark:'OS change hint'};
 const polls=Array.from({length:6},()=>restoration.ensure());release();
 assert.deepEqual(await Promise.all(polls),[true,true,true,true,true,true]);assert.equal(attempts,2);
 record={bookmark:'another conversation selected another vault'};await restoration.ensure();assert.equal(attempts,2);
});
test('an invalid OS grant is attempted once until its record or policy generation changes',async()=>{
 let record={bookmark:'stale'},generation=1,attempts=0;
 const restoration=createVaultRestoration({profileStore:{load:async()=>({vaultSelection:record})},canRestore:()=>true,revision:()=>generation,restore:async()=>{attempts++;return false;}});
 for(let i=0;i<6;i++)await restoration.ensure();assert.equal(attempts,1);
 record={bookmark:'renewed'};await restoration.ensure();assert.equal(attempts,2);
 generation++;await restoration.ensure();assert.equal(attempts,3);
});
test('an explicit selection, revocation or shutdown during profile loading prevents grant restoration',async()=>{
 let permitted=true,restoreCalls=0,release;
 const read=new Promise(resolve=>release=resolve);
 const restoration=createVaultRestoration({profileStore:{load:()=>read},canRestore:()=>permitted,restore:async()=>{restoreCalls++;return true;}});
 const pending=restoration.ensure();await Promise.resolve();permitted=false;release({vaultSelection:{bookmark:'existing'}});
 await restoration.settled();assert.equal(await pending,false);assert.equal(restoreCalls,0);
});
test('unexpected restoration failures are visible and do not cache a successful attempt',async()=>{
 let attempts=0;
 const restoration=createVaultRestoration({profileStore:{load:async()=>({vaultSelection:{bookmark:'existing'}})},canRestore:()=>true,restore:async()=>{attempts++;throw Error('Synthetic disk failure');}});
 await assert.rejects(restoration.ensure(),/Synthetic disk failure/);await assert.rejects(restoration.ensure(),/Synthetic disk failure/);assert.equal(attempts,2);
});

test('a transient OS failure remains recovery and explicit retry works with unchanged persisted data',async()=>{
 const original={license:'preserved license',vaultSelection:{bookmark:'opaque OS bookmark'}};let denied=true,selected=false,calls=0;
 const restoration=createVaultRestoration({profileStore:{load:async()=>structuredClone(original)},canRestore:()=>!selected,describeError:describeVaultRestorationError,restore:async()=>{calls++;if(denied)throw Object.assign(Error(),{code:'directory_grant_unavailable'});selected=true;return true;}});
 assert.equal(await restoration.ensure(),false);assert.equal(restoration.snapshot().state,'failed');assert.equal(restoration.snapshot().savedSelection,true);
 for(let i=0;i<5;i++)await restoration.ensure();assert.equal(calls,1);
 denied=false;assert.equal(await restoration.ensure({retry:true}),true);assert.equal(calls,2);assert.equal(restoration.snapshot().state,'restored');
 assert.deepEqual(original,{license:'preserved license',vaultSelection:{bookmark:'opaque OS bookmark'}});
});

test('OS bookmark renewal verifies the same directory identity and atomically preserves unrelated profile state',async()=>{
 const work=await scratch();try{
  const root=join(work.root,'vault'),moved=join(work.root,'moved');await fs.mkdir(root);
  const store=createProfileStore({dataDir:join(work.root,'private')});let path=root,renew=false,releases=0;
  const bookmarks={createBookmark:async()=>({version:1,path:root,bookmarkBase64:'b2xk'}),acquireDirectoryGrant:async(record,options)=>{
   if(renew)assert.equal(options.allowRelocation,true);let live=true;
   return {path,...(renew?{bookmark:{version:1,path,bookmarkBase64:'bmV3'}}:{}),assertActive(){assert(live);},release(){if(live){live=false;releases++;}}};
  }};
  const make=()=>createVaultService({profileStore:store,selectionAdapter:createPersistentVaultSelection({profileStore:store,bookmarks,chooseDirectory:async()=>({path:root})})});
  const first=make();await first.selectVault();first.revoke();await store.update(value=>({...value,license:'preserved',preferences:{capture:false},contentInstallations:{original:{completed:true}}}));
  const before=await store.load();await fs.rename(root,moved);path=moved;renew=true;
  const reopened=make();await reopened.restoreVault();assert.equal(reopened.status().root,moved);
  const after=await store.load();assert.equal(after.vaultSelection.bookmark.path,moved);assert.equal(after.vaultSelection.bookmark.bookmarkBase64,'bmV3');
  assert.deepEqual(after.vaultSelection.rootIdentity,before.vaultSelection.rootIdentity);for(const key of ['license','preferences','contentInstallations'])assert.deepEqual(after[key],before[key]);
  reopened.revoke();await fs.mkdir(root);path=root;const protectedProfile=await store.load();
  await assert.rejects(make().restoreVault(),{code:'directory_grant_changed'});assert.deepEqual(await store.load(),protectedProfile);assert.equal(releases,3);
 }finally{await work.cleanup();}
});

test('concurrent revocation while resolving a stale bookmark cannot resurrect the saved grant',async()=>{
 const work=await scratch();try{
  const root=join(work.root,'vault');await fs.mkdir(root);const info=await fs.stat(root),store=createProfileStore({dataDir:join(work.root,'private')});
  const record={schemaVersion:1,rootIdentity:{dev:info.dev,ino:info.ino},bookmark:{version:1,path:root,bookmarkBase64:'b2xk'}};await store.save({license:'preserved',vaultSelection:record});
  let entered,release,released=0;const ready=new Promise(resolve=>entered=resolve),waiting=new Promise(resolve=>release=resolve);
  const adapter=createPersistentVaultSelection({profileStore:store,chooseDirectory:async()=>null,bookmarks:{async acquireDirectoryGrant(){entered();await waiting;return {path:root,bookmark:{version:1,path:root,bookmarkBase64:'bmV3'},assertActive(){},release(){released++;}};}}});
  const vault=createVaultService({profileStore:store,selectionAdapter:adapter}),opening=vault.restoreVault();await ready;
  await createProfileStore({dataDir:join(work.root,'private')}).update(value=>({...value,vaultSelection:null}));release();
  await assert.rejects(opening,{code:'vault_selection_changed'});assert.equal(vault.status().selected,false);assert.equal(released,1);assert.deepEqual(await store.load(),{license:'preserved',vaultSelection:null});
 }finally{await work.cleanup();}
});

test('selection cannot finish without a persistent OS bookmark provider',async()=>{
 const work=await scratch();try{
  const store=createProfileStore({dataDir:work.root});let picker=0;
  const adapter=createPersistentVaultSelection({profileStore:store,chooseDirectory:async()=>{picker++;return {path:work.root};}});
  await assert.rejects(adapter.selectVault(),{code:'directory_grant_unavailable'});assert.equal(picker,0);assert.deepEqual(await store.load(),{});
 }finally{await work.cleanup();}
});

test('temporary OS errors retry with bounded backoff; identity errors require explicit recovery',async()=>{
 let time=0,calls=0,denied=true;
 const restoration=createVaultRestoration({profileStore:{load:async()=>({vaultSelection:{bookmark:'existing OS selection'}})},canRestore:()=>true,now:()=>time,describeError:describeVaultRestorationError,restore:async()=>{calls++;if(denied)throw Object.assign(Error(),{code:'directory_grant_unavailable'});return true;}});
 await restoration.ensure();time=999;await restoration.ensure();assert.equal(calls,1);
 time=1000;denied=false;assert.equal(await restoration.ensure(),true);assert.equal(calls,2);
 restoration.reset();denied=true;for(let i=0;i<10;i++){time+=60000;await restoration.ensure();}assert.equal(calls,8,'one successful attempt plus at most six failed automatic attempts');
 time+=60000;await restoration.ensure();assert.equal(calls,8);denied=false;assert.equal(await restoration.ensure({retry:true}),true);
 let changed=0;const identity=createVaultRestoration({profileStore:{load:async()=>({vaultSelection:{bookmark:'existing OS selection'}})},canRestore:()=>true,now:()=>time,describeError:describeVaultRestorationError,restore:async()=>{changed++;throw Object.assign(Error(),{code:'directory_grant_changed'});}});
 await identity.ensure();time+=60000;await identity.ensure();assert.equal(changed,1);assert.equal(identity.snapshot().error.retryable,false);
});
