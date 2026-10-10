import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

const OWNER='oracle-profile-content-receipt';
const MAX_RECEIPT_BYTES=16_000_000, MAX_TOTAL_BYTES=64_000_000, MAX_RECEIPTS=10_000;
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const fail=()=>{throw new Error('PROFILE_CONTENT_RECEIPT_INVALID');};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function reference(value){
  if(!object(value)||value.owner!==OWNER||value.schemaVersion!==1||!/^[a-f0-9]{64}$/.test(value.sha256)||!Number.isSafeInteger(value.bytes)||value.bytes<2||value.bytes>MAX_RECEIPT_BYTES||!Number.isSafeInteger(value.entries)||value.entries<0||value.entries>100_000)fail();
  return value;
}
function records(profile){
  if(profile.contentInstallations===undefined)return [];
  if(!object(profile.contentInstallations))fail();
  const rows=Object.entries(profile.contentInstallations);
  if(rows.length>MAX_RECEIPTS||rows.some(([,value])=>!object(value)))fail();
  return rows;
}

// Configuration and advisory file journals have separate bounds. Immutable
// receipt blobs are committed first; profile.json then atomically selects them.
// The profile lease must cover reads as well as collection of old checkpoints.
export function createProfileContentReceipts({root,assertPath,platform,privateFilesystem}={}){
  const directory=join(root,'content-installation-receipts');
  const noFollow=platform==='win32'?0:constants.O_NOFOLLOW;
  async function prepare(){
    await assertPath(root);
    try{await assertPath(directory);}catch(error){if(error.code!=='ENOENT')throw error;}
    await fs.mkdir(directory,{mode:0o700});
  }
  async function privateDirectory(){
    try{await prepare();}catch(error){if(error.code!=='EEXIST')throw error;}
    await assertPath(directory);
    if(!(await fs.lstat(directory)).isDirectory())fail();
    if(privateFilesystem)await privateFilesystem.privateDirectory(directory);else await fs.chmod(directory,0o700);
  }
  async function read(ref){
    reference(ref);await assertPath(directory);
    const file=join(directory,ref.sha256+'.json');await assertPath(file);
    const handle=await fs.open(file,constants.O_RDONLY|noFollow);
    try{
      const info=await handle.stat();
      if(!info.isFile()||info.nlink!==1||info.size!==ref.bytes||!privateFilesystem&&(info.mode&0o077))fail();
      const bytes=await handle.readFile();
      if(bytes.length!==ref.bytes||hash(bytes)!==ref.sha256)fail();
      const files=JSON.parse(bytes);
      if(!object(files)||Object.keys(files).length!==ref.entries)fail();
      if(privateFilesystem)await privateFilesystem.inspect(file);
      return files;
    }finally{await handle.close();}
  }
  return {
    encode(profile){
      const encoded={...profile},blobs=new Map();
      const rows=records(profile);
      if(profile.contentInstallations!==undefined)encoded.contentInstallations=Object.create(null);
      for(const [key,record] of rows){
        let saved={...record};
        if(Object.hasOwn(record,'files')){
          if(!object(record.files))fail();
          const bytes=Buffer.from(JSON.stringify(record.files));
          const ref=reference({owner:OWNER,schemaVersion:1,sha256:hash(bytes),bytes:bytes.length,entries:Object.keys(record.files).length});
          delete saved.files;saved.filesReceipt=ref;blobs.set(ref.sha256,{ref,bytes});
        }else if(record.filesReceipt)reference(record.filesReceipt);
        encoded.contentInstallations[key]=saved;
      }
      return {encoded,blobs};
    },
    async hydrate(profile,{includeContentFiles=false}={}){
      if(typeof includeContentFiles!=='boolean')fail();
      let total=0;
      for(const [,record] of records(profile)){
        if(!record.filesReceipt)continue;
        const ref=reference(record.filesReceipt);if(Object.hasOwn(record,'files'))fail();
        if(includeContentFiles){
          total+=ref.bytes;if(total>MAX_TOTAL_BYTES)fail();
          record.files=await read(ref);delete record.filesReceipt;
        }
      }
      return profile;
    },
    async persist(blobs,admit){
      if(!blobs.size)return;
      admit();await privateDirectory();
      for(const {ref,bytes} of blobs.values()){
        admit();const destination=join(directory,ref.sha256+'.json');
        try{await read(ref);continue;}catch(error){if(error.code!=='ENOENT')throw error;}
        const temporary=join(directory,'.receipt-'+randomUUID()+'.tmp');let handle;
        try{
          handle=await fs.open(temporary,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|noFollow,0o600);
          if(privateFilesystem)await privateFilesystem.inspect(temporary);
          await handle.writeFile(bytes);await handle.sync();await handle.close();handle=null;
          await assertPath(directory);admit();await fs.rename(temporary,destination);await read(ref);
        }finally{await handle?.close();await fs.unlink(temporary).catch(()=>{});}
      }
    },
    async collect(profile,admit){
      const keep=new Set(records(profile).filter(([,row])=>row.filesReceipt).map(([,row])=>reference(row.filesReceipt).sha256+'.json'));
      try{await assertPath(directory);}catch(error){if(error.code==='ENOENT')return;throw error;}
      for(const name of await fs.readdir(directory)){
        if(!/^[a-f0-9]{64}\.json$/.test(name)||keep.has(name))continue;
        const file=join(directory,name);await assertPath(file);const info=await fs.lstat(file);
        if(!info.isFile()||info.nlink!==1||info.size>MAX_RECEIPT_BYTES)fail();
        admit();await fs.unlink(file);
      }
    },
  };
}
