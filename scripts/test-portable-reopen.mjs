import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {createProfileStore} from '../packages/oracle-desktop-portable/profile-store.mjs';
import {createPersistentVaultSelection} from '../packages/oracle-desktop-portable/persistent-vault-selection.mjs';
import {createVaultService} from '../packages/oracle-desktop-portable/vault-service.mjs';
import {createVaultRestoration} from '../packages/oracle-desktop-portable/vault-restoration.mjs';

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
