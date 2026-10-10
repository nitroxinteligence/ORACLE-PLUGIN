import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {createProfileStore} from '../packages/oracle-desktop-portable/profile-store.mjs';

async function fixture(t){
  const base=resolve('.work/profile-content-receipts-tests');await fs.mkdir(base,{recursive:true});
  const root=await fs.mkdtemp(join(base,'synthetic-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const store=createProfileStore({dataDir:root});
  return {root,store,file:join(root,'profile.json'),receipts:join(root,'content-installation-receipts')};
}
function journal(label,count=9000){
  return {schemaVersion:1,manifestSHA256:label.repeat(64),releaseID:'synthetic-'+label,sequence:1,rootIdentity:{dev:10,ino:20},state:'complete',completed:true,
    files:Object.fromEntries(Array.from({length:count},(_,i)=>['content/SISTEMA/recursos-skills/'+label+'/'+'skill-synthetic/'.repeat(3)+i+'.md',{status:'verified-existing',sha256:'f'.repeat(64),readbackVerified:true}]))};
}
test('legacy multi-release profile grows beyond 8 MB without losing its vault, license or historical journals',async t=>{
  const f=await fixture(t);
  const prior={vaultSelection:{bookmark:'SYNTHETIC',rootIdentity:{dev:10,ino:20}},license:'SYNTHETIC',preferences:{onboardingStep:'install'},contentInstallations:{a:journal('a'),b:journal('b'),c:journal('c')}};
  const bytes=JSON.stringify(prior,null,2)+'\n';assert(Buffer.byteLength(bytes)<8_000_000);
  await fs.writeFile(f.file,bytes,{mode:0o600});
  const next={...prior,contentInstallations:{...prior.contentInstallations,d:journal('d')}};
  assert(Buffer.byteLength(JSON.stringify(next,null,2))>8_000_000);
  await f.store.update(value=>({...value,contentInstallations:next.contentInstallations}));
  assert.deepEqual(await createProfileStore({dataDir:f.root}).load({includeContentFiles:true}),next);
  assert(Object.values((await f.store.load()).contentInstallations).every(row=>row.filesReceipt&&!row.files));
  assert((await fs.stat(f.file)).size<10_000);
  const persisted=JSON.parse(await fs.readFile(f.file,'utf8'));
  assert.deepEqual(persisted.vaultSelection,prior.vaultSelection);assert.equal(persisted.license,prior.license);
  assert(Object.values(persisted.contentInstallations).every(row=>row.completed&&row.filesReceipt&&!row.files));
  const original=await fs.readdir(f.receipts);assert.equal(original.length,4);
  for(let i=0;i<5;i++)await f.store.update(value=>{value.contentInstallations.d.files['synthetic-extra-'+i]={status:'created',sha256:'e'.repeat(64)};return value;},{includeContentFiles:true});
  assert.equal((await fs.readdir(f.receipts)).length,4);
  const loaded=await f.store.load({includeContentFiles:true});for(const key of ['a','b','c'])assert.deepEqual(loaded.contentInstallations[key],prior.contentInstallations[key]);
  assert.equal(Object.keys(loaded.contentInstallations.d.files).length,9005);
  assert.equal((await fs.stat(f.receipts)).mode&0o777,0o700);
  for(const name of await fs.readdir(f.receipts))assert.equal((await fs.stat(join(f.receipts,name))).mode&0o777,0o600);
});
test('revocation after receipt creation keeps the previous checkpoint and removes unselected bytes',async t=>{
  const f=await fixture(t);const prior={contentInstallations:{a:journal('a',3)},preferences:{welcomeCompleted:true}};
  await f.store.save(prior);const before=await fs.readFile(f.file),names=await fs.readdir(f.receipts);let checks=0;
  await assert.rejects(f.store.update(value=>{value.contentInstallations.a.files.extra={status:'created'};return value;},{includeContentFiles:true,beforeCommit(){if(++checks===4)throw Error('SYNTHETIC_REVOKED');}}),/SYNTHETIC_REVOKED/);
  assert(checks>=4);assert((await fs.readFile(f.file)).equals(before));assert.deepEqual(await f.store.load({includeContentFiles:true}),prior);assert.deepEqual(await fs.readdir(f.receipts),names);
});
test('modified, redirected and hard-linked receipt files fail closed without changing the profile',async t=>{
  const f=await fixture(t);await f.store.save({contentInstallations:{a:journal('a',2)}});
  const before=await fs.readFile(f.file),name=(await fs.readdir(f.receipts))[0],file=join(f.receipts,name),original=await fs.readFile(file);
  await fs.writeFile(file,Buffer.alloc(original.length,32));await assert.rejects(f.store.load({includeContentFiles:true}),/PROFILE_CONTENT_RECEIPT_INVALID/);
  await fs.writeFile(file,original);const outside=join(f.root,'outside.json');await fs.writeFile(outside,original,{mode:0o600});await fs.unlink(file);await fs.symlink(outside,file);
  await assert.rejects(f.store.load({includeContentFiles:true}),/PROFILE_SYMLINK/);await fs.unlink(file);await fs.link(outside,file);await assert.rejects(f.store.load({includeContentFiles:true}),/PROFILE_CONTENT_RECEIPT_INVALID/);
  assert((await fs.readFile(f.file)).equals(before));assert((await fs.readFile(outside)).equals(original));
  await fs.unlink(file);await assert.rejects(f.store.load({includeContentFiles:true}),{code:'ENOENT'});
  await assert.rejects(f.store.update(value=>({...value,preferences:{changed:true}}),{includeContentFiles:true}),{code:'ENOENT'});assert((await fs.readFile(f.file)).equals(before));
});
test('independent processes update receipt checkpoints without deleting a reader or another writer journal',async t=>{
  const f=await fixture(t);await f.store.save({contentInstallations:{a:journal('a',5),b:journal('b',5)}});
  const module=resolve('packages/oracle-desktop-portable/profile-store.mjs');
  const code=`import {createProfileStore} from ${JSON.stringify(module)};const store=createProfileStore({dataDir:process.argv[1]});const key=process.argv[2];for(let i=0;i<10;i++){await store.update(value=>{value.contentInstallations[key].files['checkpoint-'+i]={status:'created'};return value;},{includeContentFiles:true});await store.load({includeContentFiles:true});}`;
  const run=key=>new Promise((yes,no)=>{const child=spawn(process.execPath,['--input-type=module','--eval',code,f.root,key],{stdio:['ignore','ignore','pipe']});let errors='';child.stderr.on('data',value=>errors+=value);child.on('error',no);child.on('exit',status=>status===0?yes():no(Error(errors)));});
  await Promise.all([run('a'),run('b')]);const profile=await f.store.load({includeContentFiles:true});
  assert.equal(Object.keys(profile.contentInstallations.a.files).length,15);assert.equal(Object.keys(profile.contentInstallations.b.files).length,15);assert.equal((await fs.readdir(f.receipts)).length,2);
});
test('unrelated configuration keeps its original 8 MB bound and failed writes preserve prior state',async t=>{
  const f=await fixture(t);await f.store.save({vaultSelection:{bookmark:'SYNTHETIC'}});const before=await fs.readFile(f.file);
  await assert.rejects(f.store.update(value=>({...value,unrelated:'x'.repeat(8_000_000)})),/PROFILE_TOO_LARGE/);assert((await fs.readFile(f.file)).equals(before));
});
test('legacy record names cannot change map prototypes or silently discard a receipt',async t=>{
  const f=await fixture(t);const records=JSON.parse('{"__proto__":{},"constructor":{}}');
  records.__proto__=journal('a',1);records.constructor=journal('b',1);
  const value={contentInstallations:records};await f.store.save(value);
  assert.deepEqual(await f.store.load({includeContentFiles:true}),value);
  const saved=JSON.parse(await fs.readFile(f.file));assert.equal(Object.keys(saved.contentInstallations).length,2);assert(Object.hasOwn(saved.contentInstallations,'__proto__'));
});
