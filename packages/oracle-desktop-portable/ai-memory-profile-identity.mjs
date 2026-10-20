import {constants,openSync,closeSync,fstatSync,lstatSync,realpathSync} from 'node:fs';
import fs from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {randomUUID} from 'node:crypto';

const fail=()=>{throw Object.assign(new Error('A pasta da memória foi substituída. Os dados foram preservados.'),{code:'ai_memory_profile_changed'});};
const same=(a,b)=>a.dev===b.dev&&a.ino===b.ino;
let volumeReader;
/** Darwin attrlist ABI from sys/attr.h: five 32-bit maps after bitmapcount.
 * ATTR_VOL_UUID is the persistent UUID; st_dev identifies the current mount.
 * Read through the opened directory, never by invoking a shell or diskutil. */
export async function loadAIMemoryVolumeReader(){
 if(process.platform!=='darwin')fail();
 return volumeReader??=import('bun:ffi').then(ffi=>{
  const library=ffi.dlopen('/usr/lib/libSystem.B.dylib',{fgetattrlist:{args:['i32','ptr','ptr','usize','u64'],returns:'i32'}});
  return fd=>{
   const attributes=Buffer.alloc(24),output=Buffer.alloc(20);
   attributes.writeUInt16LE(5,0);attributes.writeUInt32LE(0x80040000,8);
   if(library.symbols.fgetattrlist(fd,ffi.ptr(attributes),ffi.ptr(output),20,0n)!==0||output.readUInt32LE(0)!==20||output.subarray(4).every(byte=>byte===0))fail();
   return output.subarray(4).toString('hex');
  };
 });
}
export async function captureAIMemoryDirectoryIdentity(path,{readVolumeUUID}={}){
 const volume=readVolumeUUID??await loadAIMemoryVolumeReader();
 if(realpathSync(path)!==path)fail();
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_DIRECTORY);
 try{
  const before=fstatSync(fd);
  if(!before.isDirectory()||before.mode&0o077||before.uid!==process.getuid()||!Number.isSafeInteger(before.ino)||before.ino<=0||!(before.birthtimeMs>0))fail();
  const volumeUUID=volume(fd);
  if(!/^[a-f0-9]{32}$/.test(volumeUUID)||!same(before,fstatSync(fd))||!same(before,lstatSync(path))||realpathSync(path)!==path)fail();
  return {dev:before.dev,ino:before.ino,birthtimeMs:before.birthtimeMs,volumeUUID};
 }finally{closeSync(fd);}
}
/** Only call after admitting the private owner receipt and its exact config.
 * Legacy receipts have no volume UUID. Their inode must still match at the
 * canonical owned path; promote them once after all remaining checks pass.
 * st_dev remains useful for in-process race checks, never across reboots. */
export function assertAIMemoryStoredDirectoryIdentity(stored,current){
 if(!stored||!Number.isSafeInteger(stored.dev)||!Number.isSafeInteger(stored.ino)||stored.ino<=0||stored.ino!==current.ino)fail();
 const fields=Object.keys(stored).sort().join(',');
 if(fields==='dev,ino')return {legacy:true};
 if(fields!=='birthtimeMs,dev,ino,volumeUUID'||!/^[a-f0-9]{32}$/.test(stored.volumeUUID??'')||stored.volumeUUID!==current.volumeUUID||stored.birthtimeMs!==current.birthtimeMs)fail();
 return {legacy:false};
}
/** Small metadata migration under the original AI Memory serve lock. No init,
 * schema rewrite, content copy, consent change or readiness receipt is created. */
export async function promoteAIMemoryDirectoryIdentity({receiptPath,originalBytes,current,readOwnedFile,acquireLock,check}){
 const release=await acquireLock();let temporary;
 try{
  check();const observed=readOwnedFile(receiptPath,8192),original=JSON.parse(originalBytes),receipt=JSON.parse(observed);
  assertAIMemoryStoredDirectoryIdentity(receipt.dataIdentity,current);
  if(!observed.equals(originalBytes)){
   if(JSON.stringify({...receipt,dataIdentity:original.dataIdentity})!==JSON.stringify(original))fail();
   if(receipt.dataIdentity.volumeUUID===current.volumeUUID)return;
   fail();
  }
  const info=lstatSync(receipt.dataDir);if(!same(current,info))fail();
  temporary=join(dirname(receiptPath),'.profile-identity-'+randomUUID()+'.tmp');
  const file=await fs.open(temporary,'wx',0o600);
  try{await file.writeFile(JSON.stringify({...receipt,dataIdentity:current}));await file.sync();}finally{await file.close();}
  check();if(!readOwnedFile(receiptPath,8192).equals(originalBytes)||!same(current,lstatSync(receipt.dataDir)))fail();
  await fs.rename(temporary,receiptPath);temporary=null;
  const parent=await fs.open(dirname(receiptPath),'r');try{await parent.sync();}finally{await parent.close();}
  check();
 }finally{if(temporary)await fs.unlink(temporary).catch(()=>{});await release();}
}
