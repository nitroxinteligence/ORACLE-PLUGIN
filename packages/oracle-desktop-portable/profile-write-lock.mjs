import fs from 'node:fs/promises';
const fail=code=>{throw Object.assign(new Error(code),{code});};

// Product composition supplies the pinned upstream kernel lock. The directory
// implementation is for standalone stores without that addon; it never breaks
// another writer's lock by age or PID. Read/modify/rename share the same lease.
export async function acquireDirectoryProfileLock(path){
 try{await fs.mkdir(path,{mode:0o700});}catch(error){if(error.code==='EEXIST')fail('profile_write_busy');throw error;}
 const identity=await fs.lstat(path);let released=false;
 return async()=>{if(released)return;released=true;const current=await fs.lstat(path);if(current.isSymbolicLink()||current.dev!==identity.dev||current.ino!==identity.ino)fail('profile_lock_changed');await fs.rmdir(path);};
}
export async function waitForProfileLock(acquire,path,{signal,check=()=>{},timeoutMS=60000}={}){
 const deadline=Date.now()+timeoutMS;
 for(;;){check();if(signal?.aborted)fail('operation_cancelled');
  try{return await acquire(path);}catch(error){if(!['profile_in_use','profile_write_busy'].includes(error.code))throw error;if(Date.now()>=deadline)fail('profile_write_busy');}
  await new Promise(resolve=>setTimeout(resolve,25));
 }
}
