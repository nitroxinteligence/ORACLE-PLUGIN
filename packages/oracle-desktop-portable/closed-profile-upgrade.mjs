import fs from 'node:fs/promises';
import {join,dirname,relative,resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const stable=value=>JSON.stringify(Object.fromEntries(Object.entries(value).sort()));
async function directory(path){if(resolve(path)!==path||await fs.realpath(path)!==path||(await fs.lstat(path)).isSymbolicLink())fail('profile_upgrade_path','Perfil redirecionado.');}
async function bytes(path,maximum=512000000){const before=await fs.lstat(path);if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1||before.size>maximum)fail('profile_upgrade_path','Arquivo irregular no perfil.');const data=await fs.readFile(path),after=await fs.lstat(path);if(before.ino!==after.ino||before.dev!==after.dev||before.mtimeMs!==after.mtimeMs||data.length!==before.size)fail('profile_upgrade_changed','O perfil mudou durante a preparação.');return data;}
export async function profileUpgradeInventory(root,{copyTo,check=()=>{}}={}){
 await directory(root);const output={};let count=0,total=0;
 async function walk(dir){await directory(dir);for(const name of (await fs.readdir(dir)).sort()){
  check();if(name==='.gbrain-lock')continue;const path=join(dir,name),row=await fs.lstat(path),target=relative(root,path);
  if(++count>100000||row.isSymbolicLink()||!row.isDirectory()&&!row.isFile())fail('profile_upgrade_limit','Perfil excedeu o limite ou contém links.');
  if(row.isDirectory()){if(copyTo)await fs.mkdir(join(copyTo,target),{mode:0o700});await walk(path);}
  else{total+=row.size;if(total>2000000000)fail('profile_upgrade_limit','Perfil excedeu 2 GB.');const data=await bytes(path);output[target]={sha256:sha(data),bytes:data.length};if(copyTo){await fs.writeFile(join(copyTo,target),data,{flag:'wx',mode:row.mode&0o700||0o600});if(sha(await bytes(join(copyTo,target)))!==output[target].sha256)fail('profile_upgrade_changed','Cópia de recuperação divergente.');}}
 }}await walk(root);check();return output;
}
async function atomic(path,value){await directory(dirname(path));const temp=path+'.'+randomUUID();const file=await fs.open(temp,'wx',0o600);try{await file.writeFile(JSON.stringify(value));await file.sync();}finally{await file.close();}await fs.rename(temp,path);const parent=await fs.open(dirname(path),'r');try{await parent.sync();}finally{await parent.close();}}
async function exists(path){try{await fs.lstat(path);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}}
/** Closed generation swap. prepare runs only against a copy. The caller owns
 * the engine/process lease and live license/vault admission. Originals survive
 * validation failures, interrupted publication and later explicit recovery. */
export async function recoverClosedProfile({root,admitOld,check=()=>{},acquireRecoveryLease}={}){
 const parent=dirname(root);await directory(parent);const storage=join(parent,'oracle-profile-upgrades');
 if(!await exists(storage))return {recovered:false};await directory(storage);const intentPath=join(storage,sha(Buffer.from(root))+'.json');
 if(await exists(intentPath)){
  const intent=JSON.parse((await bytes(intentPath,16000000)).toString());
  if(intent.root!==root||!/^[-0-9a-f]{36}$/i.test(intent.id??''))fail('profile_upgrade_recovery','Recibo de recuperação inválido.');
  const folder=join(storage,intent.id),before=join(folder,'before');await directory(folder);
  const recoveryRoots=[];for(const path of [root,before])if(await exists(path)){await directory(path);recoveryRoots.push(path);}
  const release=acquireRecoveryLease?await acquireRecoveryLease(recoveryRoots):undefined;
  try{
  if(await exists(before)){
   await admitOld(before);check();
   if(stable(await profileUpgradeInventory(before,{check}))!==stable(intent.originalInventory))fail('profile_upgrade_recovery','A cópia anterior mudou. Preserve-a e revise a recuperação.');
   if(intent.phase==='activated'){
    if(!await exists(root))fail('profile_upgrade_recovery','Perfil ativado ausente.');
    // A completed generation is current. Never replace later user writes.
    await fs.unlink(intentPath);
   }else{
    if(await exists(root))await fs.rename(root,join(folder,'interrupted-'+randomUUID()));
    await fs.rename(before,root);await fs.unlink(intentPath);
   }
  }else{
   if(!await exists(root)||stable(await profileUpgradeInventory(root,{check}))!==stable(intent.originalInventory))fail('profile_upgrade_recovery','Perfil mudou antes da publicação. Originais preservados.');
   await fs.unlink(intentPath);
  }
  }finally{await release?.();}
 }
 return {recovered:true};
}
export async function upgradeClosedProfile({root,version,admitOld,prepare,check=()=>{}}={}){
 if(typeof root!=='string'||resolve(root)!==root||typeof version!=='string'||!/^[-.a-zA-Z0-9]{1,80}$/.test(version)||typeof admitOld!=='function'||typeof prepare!=='function')fail('profile_upgrade_invalid','Composição de atualização inválida.');
 await recoverClosedProfile({root,admitOld,check});
 const parent=dirname(root),storage=join(parent,'oracle-profile-upgrades');await fs.mkdir(storage,{recursive:true,mode:0o700});await directory(storage);const intentPath=join(storage,sha(Buffer.from(root))+'.json');
 check();await directory(root);await admitOld(root);check();
 const id=randomUUID(),folder=join(storage,id),candidate=join(folder,'candidate');await fs.mkdir(folder,{mode:0o700});await fs.mkdir(candidate,{mode:0o700});
 const originalInventory=await profileUpgradeInventory(root,{copyTo:candidate,check});
 if(stable(originalInventory)!==stable(await profileUpgradeInventory(root,{check})))fail('profile_upgrade_changed','O perfil mudou durante a cópia.');
 const intent={schemaVersion:1,id,root,version,phase:'preparing',originalInventory};await atomic(intentPath,intent);
 try{
  await prepare(candidate);check();await directory(candidate);
  if(stable(originalInventory)!==stable(await profileUpgradeInventory(root,{check})))fail('profile_upgrade_changed','O perfil mudou enquanto a versão nova era validada.');
  await admitOld(root);check();intent.phase='publishing';await atomic(intentPath,intent);
  await fs.rename(root,join(folder,'before'));
  try{check();await fs.rename(candidate,root);}catch(error){if(!await exists(root))await fs.rename(join(folder,'before'),root);throw error;}
  intent.phase='activated';await atomic(intentPath,intent);await fs.unlink(intentPath);
  return {upgraded:true,version,recoveryPath:join(folder,'before'),originalFilesPreserved:true};
 }catch(error){
  if(!await exists(join(folder,'before'))&&await exists(root)&&stable(originalInventory)===stable(await profileUpgradeInventory(root)))await fs.unlink(intentPath).catch(()=>{});
  throw error;
 }
}
