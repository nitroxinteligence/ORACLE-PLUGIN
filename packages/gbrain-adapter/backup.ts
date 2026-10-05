/** Private full-database snapshots of the pinned official GBrain PGLite engine.
 * Same public API as upstream scripts/build-pglite-snapshot.ts. Never runs the
 * backup coverage CLI, sync, git, a model, custom SQL, or a parallel live engine.
 * Restore is a validation-only state: deliberately lacks oracle-owned.json,
 * has no configured vault and cannot be opened by the normal owned adapter.
 */
import {PGLiteEngine} from '../../vendor/gbrain/src/core/pglite-engine.ts';
import {getEmbeddedPgliteOptions} from '../../vendor/gbrain/src/core/pglite-embedded-assets.ts';
import {PGlite} from '../../vendor/gbrain/node_modules/@electric-sql/pglite/dist/index.js';
import {inspectLockHolder,acquireLock,releaseLock} from '../../vendor/gbrain/src/core/pglite-lock.ts';
import {toEngineConfig} from '../../vendor/gbrain/src/core/config.ts';
import {ownedConfig,verifyMemorySource,assertNoInference} from './owned-runtime.ts';
import {createHash,randomUUID} from 'node:crypto';
import {constants,existsSync,lstatSync,realpathSync,readFileSync,readdirSync,mkdirSync,openSync,
  closeSync,fstatSync,readSync,writeSync,fsyncSync,renameSync,unlinkSync} from 'node:fs';
import {resolve,join,dirname,relative} from 'node:path';
import {gunzipSync,gzipSync} from 'node:zlib';

const VERSION='0.48.4.0', COMMIT='2efaaf8f8a817b5b82e023383618fdcdb1cc5f7d';
const MAX_ARCHIVE=512*1024*1024, MAX_EXPANDED=1024*1024*1024;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILES=['snapshot.tgz','profile-config.json','owner.json','readback.json'];
type Context={state:string;profile:string;root:string;vault:string;owner:any;app:any;config:any};
const sha=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
function stable(value:any):string {
  const sort=(v:any):any=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?
    Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;
  return JSON.stringify(sort(JSON.parse(JSON.stringify(value))));
}
function safePath(path:string):string {
  if (!path.startsWith('/') || path!==resolve(path)) throw Error('Non-canonical backup path');
  let current='/';
  for (const name of path.split('/').filter(Boolean)) {
    current=join(current,name);
    const st=lstatSync(current);if(st.isSymbolicLink())throw Error('Backup paths must not traverse links');
  }
  if(realpathSync(path)!==path)throw Error('Backup path changed');
  return path;
}
function privateDirectory(path:string,create=false,exclusive=false):void {
  safePath(dirname(path));
  if(create) {try{mkdirSync(path,{mode:0o700})}catch(error){if(exclusive || (error as any).code!=='EEXIST')throw error}}
  safePath(path);const st=lstatSync(path);
  if(!st.isDirectory() || st.uid!==process.getuid?.() || (st.mode&0o077)!==0)throw Error('Backup state requires a private owned directory');
}
function checkedRead(path:string,limit=2_000_000):Buffer {
  safePath(path);const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try {
    const before=fstatSync(fd);
    if(!before.isFile() || before.nlink!==1 || before.size>limit || (before.size>0 && before.blocks===0))throw Error('Linked, dataless, oversized or irregular backup input');
    const bytes=Buffer.alloc(before.size);let offset=0;
    while(offset<bytes.length){const n=readSync(fd,bytes,offset,bytes.length-offset,null);if(n<=0)throw Error('Backup input truncated');offset+=n}
    const after=fstatSync(fd),pathNow=lstatSync(path);
    if(before.dev!==pathNow.dev || before.ino!==pathNow.ino || before.size!==after.size || before.mtimeMs!==after.mtimeMs || before.ctimeMs!==after.ctimeMs)throw Error('Backup input changed while reading');
    return bytes;
  } finally {closeSync(fd)}
}
const json=(path:string)=>JSON.parse(checkedRead(path).toString('utf8'));
function writeNew(path:string,value:Buffer|object):void {
  privateDirectory(dirname(path));
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(stable(value)+'\n');
  const fd=openSync(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  try{let offset=0;while(offset<bytes.length)offset+=writeSync(fd,bytes,offset,bytes.length-offset);fsyncSync(fd)}finally{closeSync(fd)}
}
function journal(directory:string,value:object):void {
  const path=join(directory,'journal.json'),temp=join(directory,'.journal-'+randomUUID());
  if(existsSync(path))checkedRead(path);
  writeNew(temp,value);
  try{renameSync(temp,path)}finally{if(existsSync(temp))unlinkSync(temp)}
}
function forbidProviders(value:any):boolean {
  return !!value && typeof value==='object' && Object.entries(value).some(([k,v])=>
    (/api.?key|credential|token|database_url|base_url|embedding_model|chat_model|expansion_model|reranker_model/i.test(k) && v!==null && v!==false && v!=='' && v!==undefined) || forbidProviders(v));
}
function context(input:any):Context {
  if(typeof input.state!=='string' || !process.env.GBRAIN_HOME)throw Error('Explicit owned state required');
  const state=safePath(input.state),profile=safePath(process.env.GBRAIN_HOME);
  if(profile!==join(state,'gbrain/profile'))throw Error('Backup profile/state binding mismatch');
  const owner=json(join(profile,'oracle-owned.json')),app=json(join(state,'config.json'));
  if(owner.owner!=='OracleCompanion' || owner.schema_version!==2 || owner.engine_version!==VERSION ||
     app.gbrainAccess!==true || app.gbrainWorkspace || app.gbrainVaultSource!=='oracle-vault' || app.vault!==owner.vault_root)throw Error('Backup requires the authorized pinned Oracle profile');
  const vault=safePath(owner.vault_root);
  if(state===vault || state.startsWith(vault+'/') || vault.startsWith(state+'/'))throw Error('Backup state cannot overlap its vault');
  checkedRead(join(profile,'.gbrain/config.json'));
  const config=ownedConfig();
  // Backup never performs recovery surgery on the live database. This is the
  // official opt-out; ownedConfig sanitizes the environment before we set it.
  process.env.GBRAIN_PGLITE_WAL_REPAIR='off';
  safePath(config.database_path!);safePath(join(profile,'tmp'));
  if(!lstatSync(config.database_path!).isDirectory())throw Error('Missing database directory');
  process.env.TMPDIR=join(profile,'tmp');
  return {state,profile,root:join(state,'gbrain-backups'),vault,owner,app,config};
}
function consent(c:Context):void {
  const value=json(join(c.root,'consent.json'));
  if(value.schema_version!==1 || value.enabled!==true || value.private!==true || value.network!==false ||
     value.scope!=='full_pglite_database_only' || value.profile!==c.profile || value.vault_root!==c.vault)throw Error('Separate explicit private-database backup consent is required');
}
function cancelled():void {
  if(process.env.ORACLE_CANCEL_FILE && existsSync(process.env.ORACLE_CANCEL_FILE))throw Error('Backup cancelled; no completed backup claimed');
}
function treeGuard(path:string):void {
  safePath(path);
  for(const item of readdirSync(path,{withFileTypes:true})) {
    const p=join(path,item.name),st=lstatSync(p);
    if(st.isSymbolicLink() || (!st.isDirectory() && (!st.isFile() || st.nlink!==1)))throw Error('Database tree contains an unsupported link or special file');
    if(st.isDirectory())treeGuard(p);
  }
}

/** Validate the archive before passing it to the official loader. This is NOT
 * a custom database restore: only format/path checks; PGlite loads the bytes. */
export function validateGBrainSnapshot(bytes:Buffer):{entries:number;expanded_bytes:number} {
  if(bytes.length===0 || bytes.length>MAX_ARCHIVE)throw Error('Snapshot exceeds supported compressed size');
  const tar=gunzipSync(bytes,{maxOutputLength:MAX_EXPANDED});
  const seen=new Set<string>();let position=0,entries=0,ended=false;
  const text=(b:Buffer)=>b.toString('utf8').replace(/\0.*$/s,'');
  while(position+512<=tar.length) {
    const header=tar.subarray(position,position+512);
    if(header.every(v=>v===0)){ended=true;break}
    let sum=0;for(let i=0;i<512;i++)sum+=i>=148&&i<156?32:header[i];
    if(parseInt(text(header.subarray(148,156)).trim(),8)!==sum)throw Error('Snapshot tar checksum mismatch');
    const raw=text(header.subarray(0,100)),prefix=text(header.subarray(345,500));
    const name=(prefix?prefix+'/':'')+raw;
    // PGlite emits /-rooted names in VIRTUAL PGDATA, never host paths.
    const normalized=name.replace(/^\//,'').replace(/^\.\//,'').replace(/\/$/,'');
    if(!normalized || normalized.startsWith('/') || normalized.includes('\\') || /[\x00-\x1f\x7f]/.test(normalized) ||
       normalized.split('/').some(p=>!p || p==='.' || p==='..') || seen.has(normalized.toLowerCase()))throw Error('Unsafe or duplicate snapshot member');
    seen.add(normalized.toLowerCase());
    const type=header[156];if(![0,48,53].includes(type))throw Error('Snapshot links, devices and extended tar headers are not accepted');
    const sizeField=text(header.subarray(124,136)).trim();
    if(!/^[0-7]+$/.test(sizeField))throw Error('Invalid snapshot member size');
    const size=parseInt(sizeField,8);
    if(!Number.isSafeInteger(size) || size<0 || position+512+size>tar.length || (type===53 && size!==0))throw Error('Truncated snapshot member');
    position+=512+Math.ceil(size/512)*512;entries++;
    if(entries>100_000)throw Error('Snapshot has too many entries');
  }
  if(!ended || !entries || !tar.subarray(position).every(v=>v===0))throw Error('Truncated snapshot terminator');
  return {entries,expanded_bytes:tar.length};
}

function snapshotForNewDatabase(bytes:Buffer):Buffer {
  validateGBrainSnapshot(bytes);
  const tar=gunzipSync(bytes,{maxOutputLength:MAX_EXPANDED}),members:Buffer[]=[];
  let position=0;
  const text=(b:Buffer)=>b.toString('utf8').replace(/\0.*$/s,'');
  while(position+512<=tar.length) {
    const h=tar.subarray(position,position+512);if(h.every(v=>v===0))break;
    const prefix=text(h.subarray(345,500)),name=((prefix?prefix+'/':'')+text(h.subarray(0,100))).replace(/^\//,'').replace(/^\.\//,'').replace(/\/$/,'');
    const size=parseInt(text(h.subarray(124,136)).trim(),8),end=position+512+Math.ceil(size/512)*512;
    // Do not transplant archived process ownership into the NEW database.
    // The original snapshot and the live database mutex are never changed.
    if(name!=='.gbrain-lock' && !name.startsWith('.gbrain-lock/'))members.push(tar.subarray(position,end));
    position=end;
  }
  members.push(Buffer.alloc(1024));return gzipSync(Buffer.concat(members));
}

async function readback(engine:PGLiteEngine):Promise<any> {
  const sources=(await engine.listAllSources({includeArchived:true})).sort((a,b)=>a.id.localeCompare(b.id));
  const configuration=await engine.getAllConfig();
  // initSchema stores embedding_model as the existing vector-column shape,
  // even with embedding_disabled=true. It is storage metadata, not gateway
  // authorization; preserve it in the full dump without configuring a model.
  const {embedding_model:storageEmbeddingShape,...runtimeConfiguration}=configuration;
  if(forbidProviders(runtimeConfiguration))throw Error('Database provider configuration is outside the backup binding');
  const refs=(await engine.listAllPageRefs()).sort((a,b)=>(a.source_id+'/'+a.slug).localeCompare(b.source_id+'/'+b.slug));
  const samples=[];
  for(const ref of refs.slice(0,8)) {
    const scope={sourceId:ref.source_id};
    const page=await engine.getPage(ref.slug,{...scope,includeDeleted:true});
    samples.push({source:ref.source_id,slug:ref.slug,page_sha256:sha(stable(page)),
      versions_sha256:sha(stable(await engine.getVersions(ref.slug,scope))),
      tags_sha256:sha(stable(await engine.getTags(ref.slug,scope))),
      facts_sha256:sha(stable(await engine.listFactsByEntity(ref.source_id,ref.slug,{activeOnly:false,limit:100}))),
      timeline_sha256:sha(stable(await engine.getTimeline(ref.slug,scope))),
      chunks_sha256:sha(stable(await engine.getChunks(ref.slug,scope))),
      links_sha256:sha(stable(await engine.getLinks(ref.slug,scope)))});
  }
  return {sources,stats:await engine.getStats(),config_sha256:sha(stable(configuration)),
    refs_sha256:sha(stable(refs)),samples};
}
function captureBinding(c:Context):string {
  return sha(Buffer.concat([checkedRead(join(c.state,'config.json')),checkedRead(join(c.profile,'oracle-owned.json')),checkedRead(join(c.profile,'.gbrain/config.json'))]));
}
async function create(c:Context):Promise<any> {
  consent(c);privateDirectory(c.root);cancelled();treeGuard(c.config.database_path);
  if(inspectLockHolder(c.config.database_path).held)throw Error('GBrain writer is busy; backup did not open or copy it');
  const before=captureBinding(c),id=randomUUID(),directory=join(c.root,id);
  privateDirectory(directory,true,true);
  journal(directory,{status:'starting',private:true,restore_verified:false});
  let engine:PGLiteEngine|undefined;
  try {
    engine=new PGLiteEngine();await engine.connect(toEngineConfig(c.config));
    await verifyMemorySource(engine);
    const sources=await engine.listAllSources({includeArchived:true});
    if(sources.some(s=>!['default','oracle-vault','oracle-memory'].includes(s.id) || (s.id!=='oracle-memory' && s.local_path)))throw Error('Unexpected source outside the owned backup binding');
    const observed=await readback(engine);
    cancelled();assertNoInference();
    // GBrain holds its real writer lock for this entire public snapshot call.
    const blob=await engine.db.dumpDataDir('gzip');
    const bytes=Buffer.from(await blob.arrayBuffer()),archive=validateGBrainSnapshot(bytes);
    cancelled();consent(c);
    if(captureBinding(c)!==before)throw Error('Backup binding changed during snapshot');
    writeNew(join(directory,'snapshot.tgz'),bytes);
    writeNew(join(directory,'profile-config.json'),checkedRead(join(c.profile,'.gbrain/config.json')));
    writeNew(join(directory,'owner.json'),checkedRead(join(c.profile,'oracle-owned.json')));
    writeNew(join(directory,'readback.json'),observed);
    await engine.disconnect();engine=undefined;
    const files=FILES.map(path=>{const data=checkedRead(join(directory,path),MAX_ARCHIVE);return {path,size:data.length,sha256:sha(data)}});
    const manifest={schema_version:1,id,version:VERSION,commit:COMMIT,pglite_version:'0.4.3',engine:'pglite',
      method:'PGLiteEngine.db.dumpDataDir(gzip)',scope:'full_pglite_database_only',private:true,
      state:c.state,profile:c.profile,vault_root:c.vault,vault_files_included:false,restore_verified:false,
      created_at:new Date().toISOString(),archive,files};
    // Manifest is the commit point. Failed/partial directories never verify.
    writeNew(join(directory,'manifest.json'),manifest);
    const result=verify(c,id,sha(checkedRead(join(directory,'manifest.json'))));
    journal(directory,{status:'backup_verified',manifest_sha256:result.manifest_sha256,private:true,restore_verified:false});
    return result;
  } catch(error) {
    journal(directory,{status:'failed',private:true,complete:false,restore_verified:false});throw error;
  } finally {if(engine)await engine.disconnect()}
}
function verify(c:Context,id:unknown,creatingManifestHash?:string):any {
  if(typeof id!=='string' || !UUID.test(id))throw Error('Invalid backup ID');
  privateDirectory(c.root);const directory=join(c.root,id);privateDirectory(directory);
  const manifestBytes=checkedRead(join(directory,'manifest.json')),manifest=JSON.parse(manifestBytes.toString('utf8'));
  const receipt=creatingManifestHash ? null : json(join(directory,'journal.json'));
  if(creatingManifestHash ? sha(manifestBytes)!==creatingManifestHash :
     receipt.status!=='backup_verified' || receipt.manifest_sha256!==sha(manifestBytes))throw Error('Backup manifest has no matching completed receipt');
  if(manifest.schema_version!==1 || manifest.id!==id || manifest.version!==VERSION || manifest.commit!==COMMIT ||
     manifest.pglite_version!=='0.4.3' || manifest.engine!=='pglite' || manifest.private!==true ||
     manifest.scope!=='full_pglite_database_only' || manifest.state!==c.state || manifest.profile!==c.profile || manifest.vault_root!==c.vault ||
     !Array.isArray(manifest.files) || stable(manifest.files.map((f:any)=>f.path).sort())!==stable([...FILES].sort()))throw Error('Incompatible or foreign backup manifest');
  const expected=new Set([...FILES,'manifest.json','journal.json']);
  if(readdirSync(directory).some(name=>!expected.has(name)))throw Error('Unmanifested backup file');
  let total=0;
  for(const file of manifest.files) {
    if(!Number.isSafeInteger(file.size) || file.size<0 || !/^[0-9a-f]{64}$/.test(file.sha256))throw Error('Invalid backup hash/size record');
    const data=checkedRead(join(directory,file.path),MAX_ARCHIVE);
    if(data.length!==file.size || sha(data)!==file.sha256)throw Error('Backup integrity mismatch');total+=data.length;
  }
  const archivedOwner=json(join(directory,'owner.json')),archivedConfig=json(join(directory,'profile-config.json'));
  if(stable(archivedOwner)!==stable(c.owner) || archivedConfig.engine!=='pglite' || archivedConfig.embedding_disabled!==true || forbidProviders(archivedConfig))throw Error('Backup owner or configuration binding changed');
  const archive=validateGBrainSnapshot(checkedRead(join(directory,'snapshot.tgz'),MAX_ARCHIVE));
  if(stable(archive)!==stable(manifest.archive))throw Error('Snapshot inventory mismatch');
  return {status:'backup_verified',complete:true,integrity_verified:true,restore_verified:false,
    id,path:directory,manifest_sha256:sha(manifestBytes),bytes:total,scope:manifest.scope,private:true,vault_files_included:false,
    snapshot_sha256:manifest.files.find((f:any)=>f.path==='snapshot.tgz').sha256,
    readback_file_sha256:manifest.files.find((f:any)=>f.path==='readback.json').sha256};
}
async function restore(c:Context,input:any):Promise<any> {
  if(input.confirmed!==true)throw Error('Restore validation needs separate explicit confirmation');
  const verified=verify(c,input.id),directory=verified.path;
  const bytes=checkedRead(join(directory,'snapshot.tgz'),MAX_ARCHIVE);
  const readbackBytes=checkedRead(join(directory,'readback.json'));
  if(sha(bytes)!==verified.snapshot_sha256 || sha(readbackBytes)!==verified.readback_file_sha256)throw Error('Backup changed after verification');
  // A new exclusive path, chosen here, never a caller-supplied restore target.
  const parent=join(c.root,'restores');privateDirectory(parent,true);
  const target=join(parent,randomUUID());privateDirectory(target,true,true);
  const restoredProfile=join(target,'gbrain-profile');privateDirectory(restoredProfile,true,true);
  const dbPath=join(restoredProfile,'brain.pglite');
  writeNew(join(target,'restore-owned.json'),{owner:'OracleCompanion',purpose:'restore_verification_only',backup_id:input.id,private:true});
  writeNew(join(target,'config.json'),{gbrainAccess:false,restoreOnly:true});
  journal(target,{status:'restoring',backup_id:input.id,restore_verified:false});
  let loader:Awaited<ReturnType<typeof PGlite.create>>|undefined,engine:PGLiteEngine|undefined;
  // Lock ONLY the new DB; no second owner of the live database is ever opened.
  const lock=await acquireLock(dbPath,{timeoutMs:1000});
  try {
    cancelled();
    loader=await PGlite.create({dataDir:dbPath,loadDataDir:new Blob([snapshotForNewDatabase(bytes)]),...await getEmbeddedPgliteOptions()});
    await loader.close();loader=undefined;
  } catch(error) {
    journal(target,{status:'restore_failed',backup_id:input.id,complete:false,restore_verified:false});throw error;
  } finally {try{if(loader)await loader.close()}finally{await releaseLock(lock)}}
  try {
    cancelled();
    engine=new PGLiteEngine();await engine.connect({database_path:dbPath});
    const actual=await readback(engine),expected=JSON.parse(readbackBytes.toString('utf8'));
    if(stable(actual)!==stable(expected))throw Error('Restored database read-back differs from snapshot');
    await engine.disconnect();engine=undefined;
    const result={status:'restore_verified',complete:true,integrity_verified:true,restore_verified:true,
      backup_id:input.id,manifest_sha256:verified.manifest_sha256,new_state:target,database_path:dbPath,
      private:true,activated:false,live_overwritten:false,vault_files_restored:false,
      omitted_transient_members:['.gbrain-lock'],
      readback_sha256:sha(stable(actual)),sampled_pages:actual.samples.length,stats:actual.stats};
    journal(target,result);return result;
  } catch(error){journal(target,{status:'restore_failed',backup_id:input.id,complete:false,restore_verified:false});throw error}
  finally {if(engine)await engine.disconnect()}
}
export async function runGBrainBackupOperation(input:any):Promise<any> {
  if(!['create','verify','restore'].includes(input?.action))throw Error('Unsupported backup operation');
  const c=context(input);
  if(input.action==='create')return create(c);
  if(input.action==='verify')return verify(c,input.id);
  return restore(c,input);
}
