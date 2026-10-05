import {openSync,closeSync,constants,lstatSync,realpathSync,mkdirSync,readSync,writeFileSync,fsyncSync,fstatSync,unlinkSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {getAIMemorySnapshotContext,portableSnapshotJSON} from './ai-memory-snapshot.mjs';
import {AI_MEMORY_PINS} from './ai-memory-pins.mjs';
const receipts=new WeakMap();const fail=code=>{throw Object.assign(new Error(code),{code});};const sha=b=>createHash('sha256').update(b).digest('hex');const same=(a,b)=>a.dev===b.dev&&a.ino===b.ino;
function directory(path){const entry=lstatSync(path);if(entry.isSymbolicLink()||!entry.isDirectory()||realpathSync(path)!==path)fail('ai_memory_mirror_path_collision');return entry;}
function parents(root,relative,check){let cursor=root;for(const component of relative.split('/').slice(0,-1)){if(!component||component==='.'||component==='..'||component.includes('\\'))fail('ai_memory_mirror_path_invalid');const stamp=directory(cursor),next=join(cursor,component);check();try{directory(next);}catch(e){if(e.code!=='ENOENT')throw e;check();mkdirSync(next,{mode:0o700});}check();if(!same(stamp,directory(cursor)))fail('ai_memory_mirror_parent_changed');cursor=next;}return join(root,relative);}
function privateRoot(path,check){if(typeof path!=='string'||resolve(path)!==path)fail('ai_memory_mirror_private_root_required');parents('/',path.slice(1)+'/marker',check);return directory(path);}
function read(target){let entry;try{entry=lstatSync(target);}catch(e){if(e.code==='ENOENT')return null;throw e;}if(entry.isSymbolicLink()||!entry.isFile()||entry.nlink!==1||entry.size>2000000)fail('ai_memory_mirror_path_collision');const fd=openSync(target,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);try{const before=fstatSync(fd);if(!same(before,entry)||before.size>2000000)fail('ai_memory_mirror_file_changed');const buffer=Buffer.alloc(2000001);let length=0;while(length<buffer.length){const n=readSync(fd,buffer,length,buffer.length-length,null);if(!n)break;length+=n;}const after=fstatSync(fd);if(length>2000000||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs||!same(after,lstatSync(target)))fail('ai_memory_mirror_file_changed');return buffer.subarray(0,length);}finally{closeSync(fd);}}
function readbackTarget(root,evidence,check){check();let cursor=root;const parts=evidence.path.split('/');for(const part of parts.slice(0,-1)){cursor=join(cursor,part);directory(cursor);check();}const bytes=read(join(root,evidence.path));check();return !!bytes&&bytes.length===evidence.bytes&&sha(bytes)===evidence.sha256;}
function exclusiveWrite(bytes,target,check){check();const parent=directory(dirname(target));let fd;try{fd=openSync(target,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);}catch(e){if(e.code==='EEXIST')fail('ai_memory_mirror_conflict');throw e;}try{check();writeFileSync(fd,bytes);fsyncSync(fd);check();}finally{closeSync(fd);}if(!same(parent,directory(dirname(target)))||sha(read(target))!==sha(bytes))fail('ai_memory_mirror_readback_changed');}
function filesFor(snapshot){const files=[];for(const record of snapshot.records){if(!/^[a-z_]+$/.test(record.table)||!/^[a-f0-9]{64}$/.test(record.id)||sha(portableSnapshotJSON(record.row))!==record.sha256)fail('ai_memory_snapshot_changed');const namespace='INBOX/oracle-ai-memory/portable/'+snapshot.scope+'/'+record.table+'/'+record.id;
 const json=portableSnapshotJSON({schemaVersion:1,sourceVersion:AI_MEMORY_PINS.version,table:record.table,id:record.id,row:record.row},true);files.push({path:namespace+'.json',bytes:json,record});const text=record.row.body??record.row.summary??record.row.content;
 if(typeof text==='string'){const title=typeof(record.row.title??record.row.subject??record.table)==='string'?(record.row.title??record.row.subject??record.table):record.table;files.push({path:namespace+'.md',bytes:Buffer.from('# '+title.replaceAll('\n',' ')+'\n\n'+text+'\n'),record});}}
 for(const file of files){if(file.bytes.length>2000000)fail('ai_memory_mirror_file_limit');file.hash=sha(file.bytes);}return files;}

/** Only a full branded snapshot from the owned runtime may publish. No UI root,
 * raw records, persisted connected flags or partial database scan is authority.
 * The real vault grant/policy guards every creation and private journal commit.
 * Without NSFileCoordinator/openat provider, differing existing bytes are never
 * replaced: source versions are created exclusively and reported as conflicts.
 * There is no deletion reconciliation, timer, chat capture or automatic hook.
 * afterFile is a trusted synthetic interruption seam, never an RPC parameter. */
export function createAIMemoryVaultMirror({vault,policy,profileStore,dataDir,afterFile}={}){
 if(!vault?.withContentTransaction||!policy?.assertAdmission||!profileStore?.update||!profileStore?.load||typeof dataDir!=='string'||resolve(dataDir)!==dataDir)fail('ai_memory_mirror_provider_required');
 return Object.freeze({publish(snapshot,{ticket,signal}={}){
  const source=getAIMemorySnapshotContext(snapshot);source.check();policy.assertAdmission(ticket);const files=filesFor(snapshot);
  return vault.withContentTransaction(async grant=>{
   const check=()=>{grant.check();source.check();policy.assertAdmission(ticket);if(signal?.aborted)fail('ai_memory_mirror_cancelled');};
   const checkRoot=async()=>{check();await grant.checkRoot();check();await policy.revalidateAdmission(ticket);check();};await checkRoot();
   if(grant.root!==source.context.binding.vault||String(grant.generation)!==String(source.context.binding.selectionRevision))fail('ai_memory_mirror_binding_changed');
   if(dataDir===grant.root||dataDir.startsWith(grant.root+'/')||grant.root.startsWith(dataDir+'/'))fail('ai_memory_mirror_state_inside_vault');privateRoot(dataDir,check);
   const lockPath=join(dataDir,'ai-memory-mirror.lock');check();let lock;try{lock=openSync(lockPath,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);}catch(e){if(e.code==='EEXIST')fail('ai_memory_mirror_busy');throw e;}const lockIdentity=fstatSync(lock);
   let state,written=0,unchanged=0,conflicts=0;const markdown=[],jsonRows=[];
   const save=async()=>{check();await profileStore.update(profile=>({...profile,aiMemoryMirrors:{...profile.aiMemoryMirrors,[snapshot.scope]:state}}),{beforeCommit:check});check();};
   try{
    const prior=(await profileStore.load()).aiMemoryMirrors?.[snapshot.scope];check();if(prior&&(prior.owner!=='oracle-ai-memory-vault-mirror'||prior.rootIdentity?.dev!==grant.rootIdentity.dev||prior.rootIdentity?.ino!==grant.rootIdentity.ino))fail('ai_memory_mirror_journal_binding_changed');
    state={owner:'oracle-ai-memory-vault-mirror',scope:snapshot.scope,rootIdentity:grant.rootIdentity,entries:{...prior?.entries},pending:prior?.pending||null,complete:false};
    if(state.pending){const pending=state.pending,file=files.find(f=>f.hash===pending.hash&&f.record.id===pending.recordID&&f.record.table===pending.table);const extension=file?.path.endsWith('.md')?'.md':'.json';
     const validPaths=file?[file.path,'INBOX/oracle-ai-memory/portable/'+snapshot.scope+'/versions/'+file.record.table+'/'+file.record.id+'/'+file.hash+extension,'INBOX/oracle-ai-memory/portable/'+snapshot.scope+'/recovered/'+file.hash+extension]:[];
     if(!file||typeof pending.base64!=='string'||Buffer.from(pending.base64,'base64').toString('base64')!==pending.base64||Buffer.from(pending.base64,'base64').compare(file.bytes)!==0||!validPaths.includes(pending.path))fail('ai_memory_mirror_journal_requires_review');
     const target=parents(grant.root,pending.path,check),current=read(target);
     if(current&&sha(current)===file.hash)state.entries[pending.path]=file.hash;
     else{const recovered='INBOX/oracle-ai-memory/portable/'+snapshot.scope+'/recovered/'+file.hash+(file.path.endsWith('.md')?'.md':'.json');const recovery=parents(grant.root,recovered,check),existing=read(recovery);if(existing&&sha(existing)!==file.hash)fail('ai_memory_mirror_recovery_conflict');if(!existing){await checkRoot();exclusiveWrite(file.bytes,recovery,check);}state.entries[recovered]=file.hash;}
     state.pending=null;await save();
    }
    if(!snapshot.records.length){const result=Object.freeze({owner:state.owner,scope:snapshot.scope,complete:false,pending:true,reason:'empty_owned_project',sourceSnapshotComplete:true,records:0,markdownVerified:Object.freeze([]),jsonVerified:Object.freeze([]),captureEnabled:false,hooksTrusted:false});receipts.set(result,{snapshot,source});return result;}
    for(const file of files){await checkRoot();let path=file.path,target=parents(grant.root,path,check),current=read(target),versioned=false;
     if(current&&sha(current)!==file.hash){versioned=true;conflicts++;path='INBOX/oracle-ai-memory/portable/'+snapshot.scope+'/versions/'+file.record.table+'/'+file.record.id+'/'+file.hash+(file.path.endsWith('.md')?'.md':'.json');target=parents(grant.root,path,check);current=read(target);if(current&&sha(current)!==file.hash)fail('ai_memory_mirror_version_conflict');}
     state.pending={path,hash:file.hash,base64:file.bytes.toString('base64'),recordID:file.record.id,table:file.record.table};await save();await checkRoot();
     if(!current){exclusiveWrite(file.bytes,target,check);written++;}else unchanged++;
     check();const verified=read(target);if(!verified||sha(verified)!==file.hash)fail('ai_memory_mirror_readback_changed');await checkRoot();state.entries[path]=file.hash;state.pending=null;await save();
     const evidence=Object.freeze({table:file.record.table,id:file.record.id,path,sha256:file.hash,bytes:file.bytes.length,versioned,readbackVerified:true});(path.endsWith('.md')?markdown:jsonRows).push(evidence);if(afterFile){await afterFile(evidence);check();}
    }
    const recheckAll=()=>{for(const rows of [markdown,jsonRows])for(let i=0;i<rows.length;i++){const evidence=rows[i];if(!readbackTarget(grant.root,evidence,check)&&evidence.readbackVerified){conflicts++;rows[i]=Object.freeze({...evidence,readbackVerified:false});}}};
    await checkRoot();recheckAll();state.complete=conflicts===0;await save();
    // The journal is advisory. Repeat after its final await so human edits
    // during another file or the journal commit cannot produce complete:true.
    await checkRoot();recheckAll();check();
    const result=Object.freeze({owner:state.owner,scope:snapshot.scope,records:snapshot.records.length,represented:snapshot.records.length,written,unchanged,conflicts,complete:conflicts===0,sourceSnapshotComplete:true,markdownVerified:Object.freeze(markdown),jsonVerified:Object.freeze(jsonRows),captureEnabled:false,hooksTrusted:false,excludedConversationSources:snapshot.excludedConversationSources,excludedOperationalSources:snapshot.excludedOperationalSources,at:new Date().toISOString()});
    const currentReceipt=()=>{source.check();policy.assertAdmission(ticket);const selection=vault.status();if(!selection.selected||selection.root!==grant.root||selection.generation!==grant.generation||!same(grant.rootIdentity,directory(grant.root)))fail('ai_memory_mirror_receipt_stale');if(result.complete)for(const evidence of [...markdown,...jsonRows])if(!readbackTarget(grant.root,evidence,()=>{source.check();policy.assertAdmission(ticket);}))fail('ai_memory_mirror_receipt_stale');};
    receipts.set(result,{snapshot,source,currentReceipt});return result;
   }finally{closeSync(lock);try{if(same(lockIdentity,lstatSync(lockPath)))unlinkSync(lockPath);}catch(e){if(e.code!=='ENOENT')throw e;}}
  },{signal});
 }});
}
export function assertAIMemoryMirrorReceipt(receipt,{snapshot}={}){const value=receipts.get(receipt);if(!value||snapshot&&value.snapshot!==snapshot)fail('ai_memory_unadmitted_mirror_receipt');value.source.check();value.currentReceipt?.();return receipt;}
