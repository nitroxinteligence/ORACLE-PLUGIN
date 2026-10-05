import {constants,lstatSync,openSync,closeSync,writeFileSync,fsyncSync,renameSync,unlinkSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import baseline from './readable-skill-metadata-baseline.json' with {type:'json'};

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=code=>{throw Object.assign(new Error(code),{code});};

// Only exact public metadata originals may migrate to their reviewed Oracle
// names. Notes, custom names and any other edits retain the conflict gate.
export function upgradeReadableSkillMetadata({entry,target,bytes,dataDir,check,privateRoot,readBytes}) {
 const known=entry.scope==='vault'&&baseline.files[entry.destination];
 if(!known||entry.sha256!==known.afterSHA256||sha(bytes)!==known.afterSHA256)return null;
 let before;try{before=readBytes(target,8192);}catch(error){if(error.code==='content_path_collision')return null;throw error;}
 if(sha(before)!==known.beforeSHA256)return null;
 const stamp=lstatSync(target),parent=lstatSync(dirname(target));
 const directory=join(dataDir,'readable-metadata-backups');privateRoot(directory,check);
 const backup=join(directory,known.beforeSHA256+'.yaml');
 let fd;
 try{check();fd=openSync(backup,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);writeFileSync(fd,before);fsyncSync(fd);}
 catch(error){if(error.code!=='EEXIST')throw error;}
 finally{if(fd!==undefined)closeSync(fd);}
 if(sha(readBytes(backup,8192))!==known.beforeSHA256)fail('metadata_backup_changed');
 const temporary=join(dirname(target),'.oracle-metadata-'+randomUUID()+'.tmp');
 fd=undefined;
 try{
  check();fd=openSync(temporary,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);writeFileSync(fd,bytes);fsyncSync(fd);closeSync(fd);fd=undefined;
  check();privateRoot(directory,check);
  const current=lstatSync(target),currentParent=lstatSync(dirname(target));
  if(current.dev!==stamp.dev||current.ino!==stamp.ino||current.mtimeMs!==stamp.mtimeMs||current.ctimeMs!==stamp.ctimeMs||currentParent.dev!==parent.dev||currentParent.ino!==parent.ino||sha(readBytes(target,8192))!==known.beforeSHA256)fail('content_file_changed');
  check();renameSync(temporary,target);
  return {status:'updated-readable-metadata',originalSHA256:known.beforeSHA256,backup:'readable-metadata-backups/'+known.beforeSHA256+'.yaml'};
 }finally{if(fd!==undefined)closeSync(fd);try{unlinkSync(temporary);}catch(error){if(error.code!=='ENOENT')throw error;}}
}
