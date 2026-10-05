/** Closed-profile runtime transactions. No model, canonical note writes, global
 * backups or arbitrary migration commands. The app adapter remains pinned.
 * The durable gate blocks new readers/writers; real PGLite locks drain old ones.
 */
import {constants,copyFileSync,existsSync,lstatSync,mkdirSync,openSync,closeSync,fsyncSync,readFileSync,readdirSync,realpathSync,renameSync,unlinkSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve,relative} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createEngine} from '../../vendor/gbrain/src/core/engine-factory.ts';
import {toEngineConfig} from '../../vendor/gbrain/src/core/config.ts';
import {acquireLock,releaseLock} from '../../vendor/gbrain/src/core/pglite-lock.ts';
import {ownedConfig,verifyMemorySource} from './owned-runtime.ts';
import {acquireRuntimeAccess,releaseRuntimeAccess} from './runtime-gate.ts';
import {probeRuntime} from './runtime-probe.ts';

const PIN='2efaaf8f8a817b5b82e023383618fdcdb1cc5f7d';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const stable=(value:any):string=>value===null?'null':Array.isArray(value)?'['+value.map(stable).join(',')+']':typeof value==='object'?'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}':JSON.stringify(value);
function directory(path:string){if(existsSync(path)){if(lstatSync(path).isSymbolicLink()||!lstatSync(path).isDirectory()||realpathSync(path)!==path)throw Error('Runtime transaction directory is not canonical')}else{directory(dirname(path));mkdirSync(path,{mode:0o700})}}
function checked(path:string,limit=16_000_000):Buffer {
 const before=lstatSync(path);
 if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1||before.size>limit||(before.size>0&&before.blocks===0))throw Error('Irregular or unavailable runtime transaction file');
 const bytes=readFileSync(path),after=lstatSync(path);
 if(before.ino!==after.ino||before.dev!==after.dev||before.mtimeMs!==after.mtimeMs||bytes.length!==before.size)throw Error('Runtime transaction source changed');
 return bytes;
}
function atomic(path:string,value:any){
 directory(dirname(path));const temporary=join(dirname(path),'.runtime-'+randomUUID()),bytes=Buffer.from(stable(value));
 const fd=openSync(temporary,'wx',0o600);try{writeFileSync(fd,bytes);fsyncSync(fd)}finally{closeSync(fd)}
 if(existsSync(path))checked(path);
 renameSync(temporary,path);const parent=openSync(dirname(path),'r');try{fsyncSync(parent)}finally{closeSync(parent)}
}
function tree(root:string,copyTo?:string):Record<string,{sha256:string;size:number}> {
 const files:Record<string,{sha256:string;size:number}>={};let bytes=0,count=0;
 function walk(path:string){
  for(const entry of readdirSync(path,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
   if(entry.name==='.gbrain-lock')continue;
   const file=join(path,entry.name),rel=relative(root,file),info=lstatSync(file);
   if(info.isSymbolicLink()||!(info.isDirectory()||info.isFile()))throw Error('Linked runtime profile member refused');
   if(++count>100_000)throw Error('Runtime profile exceeds bounded recovery inventory');
   if(info.isDirectory()){if(copyTo)directory(join(copyTo,rel));walk(file);continue}
   bytes+=info.size;if(bytes>2_000_000_000)throw Error('Runtime profile exceeds 2 GB transaction budget');
   const data=checked(file,512_000_000);files[rel]={sha256:sha(data),size:data.length};
   if(copyTo){directory(dirname(join(copyTo,rel)));copyFileSync(file,join(copyTo,rel),constants.COPYFILE_EXCL);if(sha(checked(join(copyTo,rel),512_000_000))!==files[rel].sha256)throw Error('Runtime recovery copy failed verification')}
  }
 }
 walk(root);return files;
}
async function readback(config:any){
 const engine=await createEngine(toEngineConfig(config));
 try{await engine.connect(toEngineConfig(config));return {stats:await engine.getStats(),sources:await engine.listAllSources({includeArchived:true}),keyword:await engine.getConfig('search.mcp_keyword_only')}}
 finally{await engine.disconnect()}
}
function context(){
 const profile=resolve(process.env.GBRAIN_HOME||'');
 const state=dirname(dirname(profile));
 if(profile!==join(state,'gbrain/profile')||realpathSync(state)!==state)throw Error('Runtime transaction requires the explicit Oracle-owned profile');
 const root=join(state,'updates/runtime'),gate=join(root,'transition.json');directory(root);
 return {state,root,profile,gate};
}
function restore(c:ReturnType<typeof context>,journal:any,folder:string){
 if(journal.state!==c.state||journal.profile!==c.profile||journal.id!==folder.split('/').at(-1))throw Error('Runtime recovery journal belongs to another profile');
 const previous=join(folder,'before');
 if(existsSync(previous)){
  if(!journal.original_inventory||stable(tree(previous))!==stable(journal.original_inventory))throw Error('Runtime recovery preimage changed; gate remains closed');
  // A candidate partially activated before publication cannot have accepted new
  // authorized writes: the transition gate remained in place the entire time.
  if(existsSync(c.profile))renameSync(c.profile,join(folder,'failed-'+randomUUID()));
  renameSync(previous,c.profile);
 }
 const runtime=join(c.root,'current.json');
 if(journal.previous_runtime){atomic(runtime,journal.previous_runtime)}else if(existsSync(runtime)){checked(runtime);unlinkSync(runtime)}
 journal.status='rolled_back';atomic(join(folder,'journal.json'),journal);
 if(existsSync(c.gate)){checked(c.gate);unlinkSync(c.gate)}
 return {complete:true,status:'rolled_back',id:journal.id,profile_restored:true,canonical_files_changed:false};
}
export async function runRuntimeGeneration(input:any){
 const c=context();
 const access=await acquireRuntimeAccess(c.profile);
 try{return await runLocked(input,c)}finally{await releaseRuntimeAccess(access)}
}
async function runLocked(input:any,c:ReturnType<typeof context>){
 if(input.action==='recover'){
  if(!existsSync(c.gate))return {complete:true,status:'no_pending_transaction'};
  const gate=JSON.parse(checked(c.gate).toString());if(!uuid.test(gate.id))throw Error('Invalid runtime transition ID');
  const folder=join(c.root,'generations',gate.id),journalPath=join(folder,'journal.json');
  if(!existsSync(journalPath))throw Error('Runtime intent has no recoverable journal');
  if(gate.kind==='vault')return restoreVault(c,JSON.parse(checked(journalPath).toString()),folder);
  return restore(c,JSON.parse(checked(journalPath).toString()),folder);
 }
 if(input.action==='switch-vault')return switchVault(input,c);
 if(input.action!=='activate'||!uuid.test(input.id)||input.commit!==PIN||input.database_compatibility!=='same-schema')throw Error('Runtime generation or migration is not approved by the bundled adapter');
 if(existsSync(c.gate))throw Error('Recover the pending runtime generation first');
 const config=ownedConfig(),owner=JSON.parse(checked(join(c.profile,'oracle-owned.json')).toString());
 const metadata=input.metadata;
 if(!metadata||metadata.commit!==PIN||!uuid.test(metadata.directory))throw Error('Missing approved runtime metadata');
 const slot=join(c.root,'versions',metadata.directory);
 for(const name of ['gbrain','oracle-gbrain-read']){if(sha(checked(join(slot,name),220_000_000))!==metadata.files?.[name])throw Error('Runtime candidate changed before transaction')}
 const folder=join(c.root,'generations',input.id),candidate=join(folder,'candidate');
 directory(folder);directory(candidate);
 const journal:any={schema_version:1,id:input.id,state:c.state,profile:c.profile,commit:PIN,status:'preparing',metadata,previous_runtime:existsSync(join(c.root,'current.json'))?JSON.parse(checked(join(c.root,'current.json')).toString()):null};
 atomic(join(folder,'journal.json'),journal);
 const gateFD=openSync(c.gate,'wx',0o600);try{writeFileSync(gateFD,stable({id:input.id,state:c.state,profile:c.profile}));fsyncSync(gateFD)}finally{closeSync(gateFD)}
 let engine:Awaited<ReturnType<typeof createEngine>>|undefined;
 const fault=(phase:string)=>{
  if(!c.state.split('/').includes('.work'))return;
  if(input.crash_at===phase)process.exit(86);
  if(input.fail_at===phase)throw Error('Synthetic fault '+phase);
 };
 try{
  fault('after-gate');
  // Drains an already-running MCP operation by acquiring the official lock.
  engine=await createEngine(toEngineConfig(config));await engine.connect(toEngineConfig(config));await verifyMemorySource(engine);
  if(metadata.official_release){
   const tables=await engine.executeRaw<{name:string}>("SELECT tablename AS name FROM pg_tables WHERE schemaname='public' AND tablename='minion_jobs'");
   if(tables.length){
    const pending=await engine.executeRaw<{count:string}>("SELECT count(*)::text AS count FROM minion_jobs WHERE status NOT IN ('completed','failed','cancelled')");
    if(Number(pending[0]?.count||0)>0)throw Error('Há tarefas pendentes no Second Brain. Conclua ou revise essas tarefas antes de atualizar.');
   }
  }
  const before={stats:await engine.getStats(),sources:await engine.listAllSources({includeArchived:true}),keyword:await engine.getConfig('search.mcp_keyword_only')};
  await engine.disconnect();engine=undefined;
  const lock=await acquireLock(config.database_path!,{timeoutMs:40_000});
  try{
   const initial=tree(c.profile,candidate);
   if(stable(initial)!==stable(tree(c.profile)))throw Error('Live profile changed while taking the closed copy');
   journal.original_inventory=initial;atomic(join(folder,'journal.json'),journal);
  }finally{await releaseLock(lock)}
  const raw=JSON.parse(checked(join(candidate,'.gbrain/config.json')).toString());
  const relativeDatabase=relative(c.profile,config.database_path!);
  if(relativeDatabase.startsWith('..')||!relativeDatabase.startsWith('.gbrain/'))throw Error('Database lies outside owned profile');
  raw.database_path=join(candidate,relativeDatabase);atomic(join(candidate,'.gbrain/config.json'),raw);
  if(metadata.official_release)await probeRuntime(join(slot,'gbrain'),candidate);
  fault('after-candidate-probe');
  const observed=await readback({...config,database_path:raw.database_path});
  if(stable(observed)!==stable(before))throw Error('Candidate database readback differs after official initialization');
  fault('after-validation');
  raw.database_path=config.database_path;atomic(join(candidate,'.gbrain/config.json'),raw);
  journal.status='validated';journal.candidate_readback_sha256=sha(Buffer.from(stable(observed)));atomic(join(folder,'journal.json'),journal);
  journal.status='archive_intent';atomic(join(folder,'journal.json'),journal);
  renameSync(c.profile,join(folder,'before'));
  fault('after-archive');
  journal.status='activate_intent';atomic(join(folder,'journal.json'),journal);
  renameSync(candidate,c.profile);
  fault('after-profile-activation');
  atomic(join(c.root,'current.json'),{...metadata,generation:input.id});
  fault('after-runtime-activation');
  if(stable(await readback(config))!==stable(before))throw Error('Activated database failed final readback');
  journal.status='activated';journal.new_writes_allowed=true;journal.owner_vault=owner.vault_root;atomic(join(folder,'journal.json'),journal);
  unlinkSync(c.gate);
  return {complete:true,status:'activated',generation:input.id,database_verified:true,previous_generation:join(folder,'before'),canonical_files_changed:false};
 }catch(error){if(engine){await engine.disconnect();engine=undefined}restore(c,journal,folder);throw error}
 finally{if(engine)await engine.disconnect()}
}

const vaultKeys=['vault','vaultBookmark','gbrainWorkspace','gbrainProfile','gbrainAccess','gbrainVaultSource','libraryRoots'];
// Everything else under onboarding is profile-global, including unknown future
// access records. Account/plugin projections are not vault-owned installation state.
const vaultOnboarding=['state.json','installations','cancel','workspace'];
function vaultPath(path:string){
 if(['gbrain/profile','gbrain/workspace','oracle-workspace','codex-workspace','distribution','updates/runtime/current.json'].includes(path))return path;
 if(/^setup\/[^/]+$/.test(path)&&path!=='setup/locks')return path;
 if(vaultOnboarding.some(name=>path==='onboarding/'+name))return path;
 throw Error('Path is outside the vault profile archive');
}
function legacyFiles(inventory:any):Record<string,{sha256:string;size:number}> {
 if(inventory?.kind!=='directory'||!inventory.files||typeof inventory.files!=='object'||Array.isArray(inventory.files)||Object.keys(inventory.files).length>100_000)throw Error('Invalid legacy onboarding inventory');
 for(const [path,row] of Object.entries(inventory.files) as [string,any][]){
  if(!path||path.startsWith('/')||path.split('/').some(part=>!part||part==='.'||part==='..')||!row||!/^[0-9a-f]{64}$/.test(row.sha256)||!Number.isSafeInteger(row.size)||row.size<0||row.size>512_000_000)throw Error('Unsafe legacy onboarding inventory');
 }
 return inventory.files;
}
function legacyInventory(source:string,inventory:any,vaultOnly=false){
 const expected=legacyFiles(inventory);
 if(existsSync(source)){
  if(lstatSync(source).isSymbolicLink()||!lstatSync(source).isDirectory()||realpathSync(source)!==source)throw Error('Unsafe legacy onboarding directory');
  for(const [path,row] of Object.entries(tree(source)))if((!vaultOnly||vaultOnboarding.includes(path.split('/')[0]))&&stable(row)!==stable(expected[path]))throw Error('Legacy onboarding preimage changed; originals preserved');
 }
 return expected;
}
function legacyChildInventory(name:string,expected:Record<string,{sha256:string;size:number}>,source:string){
 if(expected[name])return {kind:'file',sha256:expected[name].sha256};
 const files=Object.fromEntries(Object.entries(expected).filter(([path])=>path.startsWith(name+'/')).map(([path,row])=>[path.slice(name.length+1),row]));
 if(Object.keys(files).length||existsSync(source)&&lstatSync(source).isDirectory())return {kind:'directory',files};
 throw Error('Legacy onboarding member has no verified preimage');
}
function recoverLegacyGlobal(source:string,destination:string,inventory:any){
 const expected=legacyInventory(source,inventory),pending:string[]=[];
 for(const [path,row] of Object.entries(expected)){
  if(vaultOnboarding.includes(path.split('/')[0]))continue;
  // Do not reactivate unsigned consent/hook/unknown state from an old archive.
  // These access records retain their normal native signature/device gates.
  const from=join(source,path),to=join(destination,path);
  if(path!=='license'&&!/^access-grants\/[^/]+\.license$/.test(path)){if(existsSync(from)&&!existsSync(to))pending.push(path);continue}
  // Existing access records always win. No archive can replace or validate them.
  if(existsSync(to)||!existsSync(from))continue;
  const bytes=checked(from,512_000_000);if(bytes.length!==row.size||sha(bytes)!==row.sha256)throw Error('Archived global onboarding record changed');
  directory(dirname(to));copyFileSync(from,to,constants.COPYFILE_EXCL);
  if(sha(checked(to,512_000_000))!==row.sha256)throw Error('Global onboarding recovery readback failed');
 }
 return pending;
}
function moveLegacyVault(source:string,destination:string,inventory:any){
 const expected=legacyInventory(source,inventory,true);
 for(const name of vaultOnboarding){
  const from=join(source,name),to=join(destination,name);
  if(!existsSync(from))continue;
  const proof=legacyChildInventory(name,expected,from);
  if(existsSync(to)||stable(pathInventory(from))!==stable(proof))throw Error('Legacy vault onboarding conflict; both originals preserved');
  directory(dirname(to));renameSync(from,to);
 }
}
function pathInventory(path:string):any {
 const info=lstatSync(path);if(info.isSymbolicLink())throw Error('Linked profile archive refused');
 return info.isDirectory()?{kind:'directory',files:tree(path)}:{kind:'file',sha256:sha(checked(path,64_000_000))};
}
function restoreVault(c:ReturnType<typeof context>,journal:any,folder:string){
 if(realpathSync(folder)!==folder||journal.state!==c.state||journal.profile!==c.profile||journal.kind!=='vault'||journal.id!==folder.split('/').at(-1)||!Array.isArray(journal.moves))throw Error('Vault recovery belongs to another profile');
 const legacyPending:string[]=[];
 for(const operation of [...journal.moves].reverse()){
  if(!['archive','activate'].includes(operation.direction)||operation.direction==='activate'&&!uuid.test(journal.target_id))throw Error('Invalid vault recovery operation');
  const path=operation.path==='onboarding'?'onboarding':vaultPath(operation.path),active=join(c.state,path);
  const archive=operation.direction==='archive'?join(folder,'before',path):join(c.root,'generations',journal.target_id,'before',path);
  const source=operation.direction==='archive'?archive:active,destination=operation.direction==='archive'?active:archive;
  if(path==='onboarding'){
   if(operation.direction==='archive')legacyPending.push(...recoverLegacyGlobal(source,destination,operation.inventory));
   moveLegacyVault(source,destination,operation.inventory);continue;
  }
  if(!existsSync(source))continue;
  if(existsSync(destination)||stable(pathInventory(source))!==stable(operation.inventory))throw Error('Vault recovery file changed; both profiles are preserved and access remains paused');
  directory(dirname(destination));renameSync(source,destination);
 }
 const config=JSON.parse(checked(join(c.state,'config.json')).toString());
 for(const key of vaultKeys){delete config[key];if(key in journal.previous_fields)config[key]=journal.previous_fields[key]}
 atomic(join(c.state,'config.json'),config);atomic(join(c.state,'vault-profiles/index.json'),journal.previous_index);
 journal.status='rolled_back';atomic(join(folder,'journal.json'),journal);unlinkSync(c.gate);
 return {complete:true,status:'rolled_back',canonical_files_changed:false,legacy_global_recovery_pending:legacyPending};
}
async function switchVault(input:any,c:ReturnType<typeof context>){
 if(!uuid.test(input.id)||typeof input.vault!=='string'||realpathSync(input.vault)!==input.vault||!lstatSync(input.vault).isDirectory()||input.vault===c.state||input.vault.startsWith(c.state+'/')||c.state.startsWith(input.vault+'/'))throw Error('New vault must be a separate canonical directory');
 if(existsSync(c.gate))throw Error('Recover the pending generation before selecting another vault');
 const config=JSON.parse(checked(join(c.state,'config.json')).toString());
 const oldVault=config.vault;
 if(typeof oldVault!=='string'||oldVault===input.vault)throw Error('Vault switch requires two different selected roots');
 const engineConfig=existsSync(join(c.profile,'.gbrain/config.json'))?ownedConfig():null;
 if(engineConfig){const owner=JSON.parse(checked(join(c.profile,'oracle-owned.json')).toString());if(owner.vault_root!==oldVault)throw Error('Selected vault does not own this profile; no data was moved')}

 const indexPath=join(c.state,'vault-profiles/index.json'),index=existsSync(indexPath)?JSON.parse(checked(indexPath).toString()):{roots:{}};
 const target=index.roots?.[sha(Buffer.from(input.vault))],targetID=target?.id;
 if(targetID&&!uuid.test(targetID))throw Error('Invalid archived vault identity');
 const targetRoot=targetID?join(c.state,'vault-profiles',targetID):null;
 const saved=targetRoot?JSON.parse(checked(join(targetRoot,'receipt.json')).toString()):null;
 if(saved&&(saved.vault!==input.vault||saved.transaction!==targetID))throw Error('Archived profile belongs to a different vault');
 const folder=join(c.root,'generations',input.id);directory(folder);
 const previousFields=Object.fromEntries(vaultKeys.filter(key=>key in config).map(key=>[key,config[key]]));
 const journal:any={kind:'vault',id:input.id,state:c.state,profile:c.profile,previous_fields:previousFields,previous_index:index,target_id:targetID||null,moves:[],status:'preparing'};
 atomic(join(folder,'journal.json'),journal);atomic(c.gate,{id:input.id,kind:'vault'});
 // A reconnect is required even if a switch later rolls back; no old MCP
 // process can silently regain access after a subsequent vault selection.
 atomic(join(c.state,'gbrain/vault-epoch.json'),{id:input.id});
 try{
  if(engineConfig){const engine=await createEngine(toEngineConfig(engineConfig));try{await engine.connect(toEngineConfig(engineConfig))}finally{await engine.disconnect()}}
  const paths=['gbrain/profile','gbrain/workspace','oracle-workspace','codex-workspace','distribution','updates/runtime/current.json',...vaultOnboarding.map(name=>'onboarding/'+name)];
  if(existsSync(join(c.state,'setup')))for(const name of readdirSync(join(c.state,'setup')))if(name!=='locks')paths.push(vaultPath('setup/'+name));
  const archiveRows:any[]=[];
  for(const path of paths){
   const active=join(c.state,path);if(!existsSync(active))continue;
   const inventory=pathInventory(active),destination=join(folder,'before',path);
   journal.moves.push({direction:'archive',path,inventory});atomic(join(folder,'journal.json'),journal);
   directory(dirname(destination));renameSync(active,destination);archiveRows.push({path,inventory});
  }
  if(c.state.split('/').includes('.work')&&input.crash_at==='after-vault-archive')process.exit(86);
  const savedRows:any[]=[],legacyPending:string[]=[];
  if(saved)for(const row of saved.files){
   if(row.path!=='onboarding'){savedRows.push(row);continue}
   // Legacy receipts archived the whole directory. Only a bound original
   // transaction can supply missing global bytes; ordinary license verification
   // still decides whether a recovered grant is valid.
   const oldFolder=join(c.root,'generations',targetID);if(realpathSync(oldFolder)!==oldFolder)throw Error('Linked legacy transaction refused');
   const oldJournal=JSON.parse(checked(join(oldFolder,'journal.json')).toString());
   if(oldJournal.kind!=='vault'||oldJournal.id!==targetID||oldJournal.state!==c.state||oldJournal.profile!==c.profile||oldJournal.previous_fields?.vault!==saved.vault||!oldJournal.moves.some((op:any)=>op.direction==='archive'&&op.path==='onboarding'&&stable(op.inventory)===stable(row.inventory)))throw Error('Legacy onboarding archive lacks its original owned journal');
   const source=join(oldFolder,'before/onboarding'),expected=legacyInventory(source,row.inventory);
   legacyPending.push(...recoverLegacyGlobal(source,join(c.state,'onboarding'),row.inventory));
   for(const name of vaultOnboarding){const child=join(source,name);if(existsSync(child))savedRows.push({path:'onboarding/'+name,inventory:legacyChildInventory(name,expected,child)})}
  }
  for(const row of savedRows){
   const path=vaultPath(row.path),source=join(c.root,'generations',targetID,'before',path),destination=join(c.state,path);
   if(existsSync(destination)||stable(pathInventory(source))!==stable(row.inventory))throw Error('Archived vault was edited or active destination appeared; originals preserved');
   journal.moves.push({direction:'activate',path,inventory:row.inventory});atomic(join(folder,'journal.json'),journal);
   directory(dirname(destination));renameSync(source,destination);
  }
  const fields=saved?.fields||{};
  for(const key of vaultKeys){delete config[key];if(key in fields)config[key]=fields[key]}
  config.vault=input.vault;delete config.vaultBookmark;if(typeof input.bookmark==='string')config.vaultBookmark=input.bookmark;
  if(!saved)config.gbrainAccess=false;
  atomic(join(c.state,'config.json'),config);
  // Archive under its final immutable ID. The transaction journal retains the
  // rollback path until the durable commit, so recovery never guesses locations.
  const archiveRoot=join(c.state,'vault-profiles',input.id);directory(archiveRoot);
  atomic(join(archiveRoot,'receipt.json'),{vault:oldVault,fields:previousFields,files:archiveRows,transaction:input.id});
  journal.status='commit_intent';atomic(join(folder,'journal.json'),journal);
  const nextIndex=JSON.parse(JSON.stringify(index));nextIndex.roots||={};delete nextIndex.roots[sha(Buffer.from(input.vault))];nextIndex.roots[sha(Buffer.from(oldVault))]={id:input.id,vault:oldVault};
  // The archive stays in the transaction's before directory; no second move is
  // needed at the commit boundary. The receipt records its immutable location.
  atomic(join(archiveRoot,'receipt.json'),{vault:oldVault,fields:previousFields,files:archiveRows,transaction:input.id});
  atomic(indexPath,nextIndex);journal.status='committed';atomic(join(folder,'journal.json'),journal);unlinkSync(c.gate);
  return {complete:true,status:'vault_selected',vault:input.vault,restored:!!saved,previous_vault_preserved:true,canonical_files_changed:false,legacy_global_recovery_pending:legacyPending};
 }catch(error){restoreVault(c,journal,folder);throw error}
}
