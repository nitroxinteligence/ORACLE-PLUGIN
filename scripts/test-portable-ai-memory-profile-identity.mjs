import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {readFileSync,lstatSync,renameSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {captureAIMemoryDirectoryIdentity,assertAIMemoryStoredDirectoryIdentity,promoteAIMemoryDirectoryIdentity} from '../packages/oracle-desktop-portable/ai-memory-profile-identity.mjs';

const volumeUUID='a'.repeat(32),current={dev:17,ino:200,birthtimeMs:1234000,volumeUUID};
const changed={code:'ai_memory_profile_changed'};
async function fixture(t){
 const base=resolve('.work/ai-memory-identity-tests');await fs.mkdir(base,{recursive:true,mode:0o700});
 const root=await fs.mkdtemp(join(base,'synthetic-')),dataDir=join(root,'data'),receiptPath=join(root,'profile-prepared.json');await fs.mkdir(dataDir,{mode:0o700});
 const identity=await captureAIMemoryDirectoryIdentity(dataDir,{readVolumeUUID:()=>volumeUUID});
 const original={owner:'synthetic-owner',nonce:'keep-me',dataDir,configSHA256:'f'.repeat(64),dataIdentity:{dev:identity.dev+17,ino:identity.ino}};
 const bytes=Buffer.from(JSON.stringify(original));await fs.writeFile(receiptPath,bytes,{mode:0o600});t.after(()=>fs.rm(root,{recursive:true,force:true}));
 return {root,dataDir,receiptPath,identity,bytes,original,options:{receiptPath,originalBytes:bytes,current:identity,readOwnedFile:path=>readFileSync(path),acquireLock:async()=>async()=>{},check(){}}};
}
test('legacy mount-number change retains the exact owned inode, never a replacement',()=>{
 assert.deepEqual(assertAIMemoryStoredDirectoryIdentity({dev:19,ino:200},current),{legacy:true});
 for(const stored of [{dev:19,ino:201},{dev:19,ino:'200'},{dev:19,ino:200,extra:true},null])assert.throws(()=>assertAIMemoryStoredDirectoryIdentity(stored,current),changed);
});
test('persistent UUID, inode and creation time survive a remount and reject replacement',()=>{
 assert.deepEqual(assertAIMemoryStoredDirectoryIdentity({...current,dev:19},current),{legacy:false});
 for(const value of [{...current,volumeUUID:'b'.repeat(32)},{...current,ino:201},{...current,birthtimeMs:1234001}])assert.throws(()=>assertAIMemoryStoredDirectoryIdentity(value,current),changed);
});
test('private directory capture rejects symlinks, public permissions and a changed path',async t=>{
 const f=await fixture(t);await fs.symlink(f.dataDir,join(f.root,'alias'));
 await assert.rejects(captureAIMemoryDirectoryIdentity(join(f.root,'alias'),{readVolumeUUID:()=>volumeUUID}),changed);
 await fs.chmod(f.dataDir,0o755);await assert.rejects(captureAIMemoryDirectoryIdentity(f.dataDir,{readVolumeUUID:()=>volumeUUID}),changed);await fs.chmod(f.dataDir,0o700);
 await assert.rejects(captureAIMemoryDirectoryIdentity(f.dataDir,{readVolumeUUID(){renameSync(f.dataDir,f.dataDir+'-moved');mkdirSync(f.dataDir,{mode:0o700});return volumeUUID;}}),changed);
});
test('legacy metadata promotion preserves every field and acquires the original serve lock',async t=>{
 const f=await fixture(t);let locks=0,releases=0;
 await promoteAIMemoryDirectoryIdentity({...f.options,acquireLock:async()=>{locks++;return async()=>{releases++;};}});
 const receipt=JSON.parse(await fs.readFile(f.receiptPath));assert.deepEqual(receipt,{...f.original,dataIdentity:f.identity});assert.equal(locks,1);assert.equal(releases,1);assert.equal(lstatSync(f.receiptPath).mode&0o777,0o600);
 // A second already-admitted opener can observe the first metadata promotion.
 await promoteAIMemoryDirectoryIdentity(f.options);assert.deepEqual(JSON.parse(await fs.readFile(f.receiptPath)),receipt);
});
test('foreign metadata, inode replacement and a running service cannot be adopted',async t=>{
 for(const scenario of ['foreign','inode','busy']){
  const f=await fixture(t);
  if(scenario==='foreign')await fs.writeFile(f.receiptPath,JSON.stringify({...f.original,nonce:'foreign'}));
  if(scenario==='inode'){await fs.rename(f.dataDir,f.dataDir+'-old');await fs.mkdir(f.dataDir,{mode:0o700});}
  const before=await fs.readFile(f.receiptPath);
  await assert.rejects(promoteAIMemoryDirectoryIdentity({...f.options,...(scenario==='busy'?{acquireLock:async()=>{throw Object.assign(Error('busy'),{code:'profile_in_use'});}}:{})}),{code:scenario==='busy'?'profile_in_use':'ai_memory_profile_changed'});
  assert.deepEqual(await fs.readFile(f.receiptPath),before);
 }
});
test('revocation before commit keeps the old receipt and removes temporary metadata',async t=>{
 const f=await fixture(t);let checks=0;
 await assert.rejects(promoteAIMemoryDirectoryIdentity({...f.options,check(){if(++checks===2)throw Object.assign(Error('revoked'),{code:'stale_admission'});}}),{code:'stale_admission'});
 assert.deepEqual(await fs.readFile(f.receiptPath),f.bytes);assert(!(await fs.readdir(f.root)).some(name=>name.endsWith('.tmp')));
});
test('real Darwin volume UUID is read from the open directory and remains stable',{skip:process.platform!=='darwin'||!process.versions.bun},async t=>{
 const f=await fixture(t),a=await captureAIMemoryDirectoryIdentity(f.dataDir),b=await captureAIMemoryDirectoryIdentity(f.root);
 assert.equal(a.volumeUUID,b.volumeUUID);assert.match(a.volumeUUID,/^[a-f0-9]{32}$/);assert.notEqual(a.volumeUUID,'0'.repeat(32));assert.equal(a.ino,lstatSync(f.dataDir).ino);
});
