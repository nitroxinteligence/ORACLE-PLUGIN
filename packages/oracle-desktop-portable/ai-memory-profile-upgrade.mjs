import {readFileSync,lstatSync,realpathSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {AI_MEMORY_PINS,AI_MEMORY_GENERATIONS} from './ai-memory-pins.mjs';
import {upgradeClosedProfile,recoverClosedProfile} from './closed-profile-upgrade.mjs';
import {verifyAIMemoryUpgradeCandidate} from './ai-memory-process.mjs';
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function owned(path,limit=128000){if(realpathSync(path)!==path)fail('ai_memory_profile_unowned','Perfil redirecionado.');const row=lstatSync(path);if(!row.isFile()||row.isSymbolicLink()||row.nlink!==1||row.size>limit||row.mode&0o077)fail('ai_memory_profile_unowned','Arquivo privado irregular.');return readFileSync(path);}
function inventoryValue(value){if(value instanceof Uint8Array)return {base64:Buffer.from(value).toString('base64')};if(typeof value==='bigint')return value.toString();return value;}
async function records(dataDir,expected){
 const {Database}=await import('bun:sqlite'),db=new Database(join(dataDir,'db/memory.sqlite'),{readonly:true,strict:true,safeIntegers:true});
 try{db.run('PRAGMA query_only=ON');db.run('BEGIN DEFERRED TRANSACTION');const result={};let total=0,count=0;
  const tables=expected?Object.keys(expected):db.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '%fts%' AND name NOT LIKE 'sqlite_%' AND name!='refinery_schema_history'").all().map(r=>r.name).sort();
  for(const name of tables){if(!/^[a-z_]+$/.test(name))fail('ai_memory_schema_diverged','Schema inválido.');const columns=expected?expected[name].columns:db.query('PRAGMA table_info("'+name+'")').all().map(r=>r.name);const rows=[];
   for(const row of db.query('SELECT '+columns.map(c=>'"'+c+'"').join(',')+' FROM "'+name+'"').iterate()){if(++count>100000)fail('ai_memory_upgrade_limit','Perfil excedeu o limite de migração.');const json=JSON.stringify(Object.fromEntries(columns.map(c=>[c,inventoryValue(row[c])])));total+=Buffer.byteLength(json);if(total>128000000)fail('ai_memory_upgrade_limit','Perfil excedeu 128 MB de registros.');rows.push(sha(Buffer.from(json)));}
   result[name]={columns,rows:rows.sort()};
  }return result;
 }finally{try{db.run('ROLLBACK');}catch{}db.close();}
}
/** Only the reviewed previous owned composition can migrate. All old columns,
 * rows, workspace/project identity and consent bindings must survive. */
export async function upgradeAIMemoryProfile({profileRoot,binary,installationID,binding,check,signal,acquireLock}={}){
 const expectedOwner={owner:'oracle-portable-ai-memory',installationID,profileRoot};
 const workspace='oracle-profile-'+sha(Buffer.from(profileRoot)).slice(0,16),project='vault-'+sha(Buffer.from(binding.vault)).slice(0,16);
 const expectedReceipt={owner:'oracle-portable-ai-memory-profile',installationID,profileRoot,dataDir:join(profileRoot,'data'),workspace,project,vault:binding.vault};
 let originalReceipt;
 const admitOld=async root=>{check();const owner=JSON.parse(owned(join(root,'oracle-owned.json'),4096)),generation=AI_MEMORY_GENERATIONS.find(row=>row.binarySHA256===owner.binarySHA256);if(!generation||Object.entries(expectedOwner).some(([key,value])=>owner[key]!==value)||Object.keys(owner).sort().join(',')!=='binarySHA256,installationID,owner,profileRoot')fail('ai_memory_profile_unowned','Perfil pertence a outra composição.');const receipt=JSON.parse(owned(join(root,'profile-prepared.json'),8192));if(Object.entries({...expectedReceipt,...generation}).some(([key,value])=>receipt[key]!==value)||sha(owned(join(root,'data/config.toml')))!==receipt.configSHA256)fail('ai_memory_profile_unowned','Recibo anterior não corresponde ao perfil.');const info=lstatSync(join(root,'data'));if(realpathSync(join(root,'data'))!==join(root,'data')||receipt.dataIdentity?.dev!==info.dev||receipt.dataIdentity?.ino!==info.ino)fail('ai_memory_profile_changed','Identidade anterior mudou.');originalReceipt=receipt;};
 await recoverClosedProfile({root:profileRoot,admitOld,check,async acquireRecoveryLease(roots){
  if(typeof acquireLock!=='function')fail('profile_lock_unavailable','Recuperação exige a trava oficial.');const releases=[];
  try{for(const root of roots)if(existsSync(join(root,'data')))releases.push(await acquireLock(join(root,'data/.serve.lock')));return async()=>{for(const release of releases.reverse())await release();};}catch(error){for(const release of releases.reverse())await release();throw error;}
 }});
 if(!existsSync(join(profileRoot,'oracle-owned.json')))return {upgraded:false,newProfile:true};
 const previousOwner=JSON.parse(owned(join(profileRoot,'oracle-owned.json'),4096));if(previousOwner.binarySHA256===AI_MEMORY_PINS.binarySHA256)return {upgraded:false};
 if(typeof acquireLock!=='function')fail('profile_lock_unavailable','Migração exige a trava oficial.');
 const release=await acquireLock(join(profileRoot,'data/.serve.lock'));
 try{return await upgradeClosedProfile({root:profileRoot,version:AI_MEMORY_PINS.version,admitOld,check,async prepare(candidate){
  const dataDir=join(candidate,'data'),before=await records(dataDir);
  await verifyAIMemoryUpgradeCandidate({binary,dataDir,executionHome:join(candidate,'execution-home'),tmpDir:join(candidate,'tmp'),workspace,project,signal,checkpoint:check});
  const after=await records(dataDir,before);if(JSON.stringify(after)!==JSON.stringify(before))fail('ai_memory_upgrade_readback','A migração alterou registros anteriores. Originais preservados.');
  const configSHA256=sha(owned(join(dataDir,'config.toml')));if(configSHA256!==originalReceipt.configSHA256)fail('ai_memory_config_changed','A migração alterou a configuração.');
  const info=lstatSync(dataDir),nextOwner={...expectedOwner,binarySHA256:AI_MEMORY_PINS.binarySHA256},nextReceipt={...originalReceipt,binarySHA256:AI_MEMORY_PINS.binarySHA256,schemaSHA256:AI_MEMORY_PINS.schemaSHA256,version:AI_MEMORY_PINS.version,dataIdentity:{dev:info.dev,ino:info.ino}};
  writeFileSync(join(candidate,'oracle-owned.json'),JSON.stringify(nextOwner),{mode:0o600});writeFileSync(join(candidate,'profile-prepared.json'),JSON.stringify(nextReceipt),{mode:0o600});check();
 }});}finally{await release();}
}
