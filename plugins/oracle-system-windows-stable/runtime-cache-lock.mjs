import {promises as fs,constants} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';

const fail=message=>{throw new Error(`Payload Oracle: ${message}`);};
export function processAlive(pid){
  if(!Number.isSafeInteger(pid)||pid<=0)fail('dono da trava inválido');
  try{process.kill(pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;if(error.code==='EPERM')return true;throw error;}
}
async function owner(file){
  const handle=await fs.open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
    const stat=await handle.stat();if(!stat.isFile()||stat.size>1024)fail('trava irregular');
    const value=JSON.parse(await handle.readFile('utf8'));
    if(!Number.isSafeInteger(value.pid)||value.pid<=0||typeof value.token!=='string')fail('trava inválida');
    return value;
  }finally{await handle.close();}
}

// Recovery uses crash-recoverable Lamport bakery participants. Their unique names
// prevent stale cleanup from targeting a successor (unlink has no portable CAS).
function recoveryPattern(key){return new RegExp(`^${key}\\.recovery-([1-9][0-9]*)-([a-f0-9-]{36})$`);}
async function removeRecoveryParticipant(path){
  for(const name of ['prepared','number']){
    try{await fs.unlink(join(path,name));}catch(error){if(error.code!=='ENOENT')throw error;}
  }
  try{await fs.rmdir(path);}catch(error){if(error.code!=='ENOENT')throw error;}
}
async function recoveryParticipants(cache,key){
  const pattern=recoveryPattern(key),entries=[];
  for(const name of await fs.readdir(cache)){
    const match=pattern.exec(name);if(!match)continue;
    const path=join(cache,name);
    try{
      const stat=await fs.lstat(path);
      if(!stat.isDirectory()||stat.isSymbolicLink())fail('recuperação irregular');
      if(!processAlive(Number(match[1]))){await removeRecoveryParticipant(path);continue;}
      entries.push({path,pid:Number(match[1]),token:match[2]});
    }catch(error){if(error.code!=='ENOENT')throw error;}
  }
  return entries;
}
function checkWaiting(signal,deadline){
  if(signal?.aborted)fail('cancelado');
  if(Date.now()>=deadline)fail('runtime ocupado; tempo de espera da trava excedido');
}
async function pause(signal,deadline){
  checkWaiting(signal,deadline);
  try{await delay(Math.min(100,Math.max(1,deadline-Date.now())),undefined,{signal});}
  catch(error){if(error.name==='AbortError')fail('cancelado');throw error;}
}
async function recoveryNumber(participant){
  try{
    const value=await owner(join(participant.path,'number'));
    if(value.pid!==participant.pid||value.token!==participant.token||!Number.isSafeInteger(value.number)||value.number<=0)fail('recuperação inválida');
    return value.number;
  }catch(error){if(error.code==='ENOENT')return 0;throw error;}
}
async function recoverLock({cache,key,lock,token,signal,deadline}){
  const path=join(cache,`${key}.recovery-${process.pid}-${token}`);
  await fs.mkdir(path,{mode:0o700});
  try{
    let maximum=0;
    for(const participant of await recoveryParticipants(cache,key)){
      if(participant.path!==path)maximum=Math.max(maximum,await recoveryNumber(participant));
    }
    const number=maximum+1;if(!Number.isSafeInteger(number))fail('fila de recuperação excedida');
    await fs.writeFile(join(path,'prepared'),JSON.stringify({pid:process.pid,token,number}),{flag:'wx',mode:0o600});
    await fs.rename(join(path,'prepared'),join(path,'number'));
    while(true){
      checkWaiting(signal,deadline);let waiting=false;
      for(const participant of await recoveryParticipants(cache,key)){
        if(participant.path===path)continue;
        const other=await recoveryNumber(participant);
        // A participant without a published number is still choosing its place.
        if(!other||other<number||(other===number&&participant.token<token)){waiting=true;break;}
      }
      if(!waiting)break;
      await pause(signal,deadline);
    }
    try{const current=await owner(lock);if(!processAlive(current.pid))await fs.unlink(lock);}
    catch(error){if(error.code!=='ENOENT')throw error;}
  }finally{await removeRecoveryParticipant(path);}
}

// Publish an already-written owner atomically, without exposing partial metadata.
export async function acquireRuntimeCacheLock({cache,key,signal,timeoutMs=60_000}){
  const lock=join(cache,`${key}.lock`);
  const token=randomUUID(),ticket=join(cache,`${key}.owner-${process.pid}-${token}`);
  await fs.writeFile(ticket,JSON.stringify({pid:process.pid,token}),{flag:'wx',mode:0o600});
  const deadline=Date.now()+timeoutMs;
  try{
    while(true){
      checkWaiting(signal,deadline);
      if(!(await recoveryParticipants(cache,key)).length){
        try{
          await fs.link(ticket,lock);
          return async()=>{
            const current=await owner(lock);
            if(current.token!==token||current.pid!==process.pid)fail('dono da trava mudou');
            await fs.unlink(lock);
          };
        }catch(error){if(error.code!=='EEXIST')throw error;}
        try{
          if(!processAlive((await owner(lock)).pid))await recoverLock({cache,key,lock,token,signal,deadline});
        }catch(error){if(error.code!=='ENOENT')throw error;}
      }
      await pause(signal,deadline);
    }
  }finally{await fs.unlink(ticket);}
}

export async function removeInterruptedRuntimePartials({cache,key,platform}){
  const pattern=new RegExp(`^${key}\\.partial-([1-9][0-9]*)-[a-f0-9-]{36}$`);
  for(const name of await fs.readdir(cache)){
    const match=pattern.exec(name);if(!match||processAlive(Number(match[1])))continue;
    const path=join(cache,name);await platform.inspect(path);
    const stat=await fs.lstat(path);if(!stat.isDirectory()||stat.isSymbolicLink())fail('extração parcial irregular');
    await fs.rm(path,{recursive:true,force:true});
  }
}
