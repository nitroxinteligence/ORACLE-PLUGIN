import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {AI_MEMORY_PINS} from './ai-memory-pins.mjs';
const snapshots=new WeakMap();
const fail=code=>{throw Object.assign(new Error(code),{code});};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
// Foundation JSONSerialization sortedKeys compatibility, including solidus
// escaping and Int64 numeric precision (Bun SQLite safeIntegers uses bigint).
export function portableSnapshotJSON(value,pretty=false){
 const encode=(item,level=0)=>{
  if(item===null)return 'null';if(typeof item==='string')return JSON.stringify(item).replaceAll('/','\\/');
  if(typeof item==='bigint')return item.toString();if(typeof item==='number'&&Number.isFinite(item))return JSON.stringify(item);if(typeof item==='boolean')return String(item);
  const array=Array.isArray(item),keys=array?item.map((_,i)=>i):Object.keys(item).sort();if(!keys.length)return array?'[]':'{}';
  const rows=keys.map(key=>(array?'':encode(String(key))+(pretty?' : ':':'))+encode(item[key],level+1));
  if(!pretty)return (array?'[':'{')+rows.join(',')+(array?']':'}');
  return (array?'[':'{')+'\n'+rows.map(row=>'  '.repeat(level+1)+row).join(',\n')+'\n'+'  '.repeat(level)+(array?']':'}');
 };return Buffer.from(encode(value));
}
function scopePath(path){if(typeof path!=='string'||resolve(path)!==path||realpathSync(path)!==path)fail('ai_memory_database_path_invalid');let cursor='/';const chain=[];for(const part of path.slice(1).split('/')){cursor=join(cursor,part);const entry=lstatSync(cursor);if(entry.isSymbolicLink())fail('ai_memory_database_symlink');chain.push([cursor,entry]);}return chain;}
function unchanged(chain){for(const [path,stamp] of chain){const next=lstatSync(path);if(next.isSymbolicLink()||next.dev!==stamp.dev||next.ino!==stamp.ino)fail('ai_memory_database_changed');}}
function normalize(value){
 if(value instanceof Uint8Array){if(value.byteLength>2000000)fail('ai_memory_field_limit');return Object.freeze({base64:Buffer.from(value).toString('base64')});}
 if(typeof value==='string'){if(Buffer.byteLength(value)>2000000)fail('ai_memory_field_limit');return value;}
 if(value===null||typeof value==='bigint'||typeof value==='number'&&Number.isFinite(value))return value;fail('ai_memory_invalid_sql_value');
}
/** Only the official owned-runtime branded context supplies database/scope. The
 * optional runtimeContextProvider is a trusted synthetic test seam, never RPC.
 * One READONLY query_only deferred transaction, exact reviewed schema, no union.
 * Conversation history requires a separate trusted consent callback and remains
 * excluded by default. Auth/index/embedding/lease/audit tables are never selected. */
export function createAIMemorySnapshotReader({runtime,schemaPath,runtimeContextProvider,includeConversationRecords=false,assertConversationConsent,maximumRecords=50000,maximumBytes=64000000}={}){
 if(typeof schemaPath!=='string'||resolve(schemaPath)!==schemaPath||!Number.isSafeInteger(maximumRecords)||maximumRecords<1||maximumRecords>50000||!Number.isSafeInteger(maximumBytes)||maximumBytes<1||maximumBytes>64000000||typeof includeConversationRecords!=='boolean'||includeConversationRecords&&typeof assertConversationConsent!=='function')fail('ai_memory_snapshot_configuration_invalid');
 return Object.freeze({async read({ticket,signal}={}){
  const getContext=runtimeContextProvider||(await import('./ai-memory-runtime.mjs')).getAIMemoryRuntimeContext;
  const context=getContext(runtime);const check=()=>{context.assertCurrent(ticket);if(signal?.aborted)fail('ai_memory_snapshot_cancelled');if(includeConversationRecords)assertConversationConsent({ticket,context});};check();
  const database=join(context.dataDir,'db/memory.sqlite'),chain=scopePath(database);if(!lstatSync(database).isFile())fail('ai_memory_database_path_invalid');
  for(const suffix of ['-wal','-shm','-journal']){try{const path=database+suffix;const entry=lstatSync(path);if(entry.isSymbolicLink()||!entry.isFile()||entry.nlink!==1)fail('ai_memory_database_sidecar_invalid');}catch(error){if(error.code!=='ENOENT')throw error;}}
  const schemaChain=scopePath(schemaPath),schemaBytes=readFileSync(schemaPath);if(schemaBytes.length>1000000||sha(schemaBytes)!==AI_MEMORY_PINS.schemaSHA256)fail('ai_memory_schema_pin_mismatch');const expected=JSON.parse(schemaBytes);unchanged(schemaChain);
  if(expected.version!==AI_MEMORY_PINS.version||expected.commit!==AI_MEMORY_PINS.commit)fail('ai_memory_schema_pin_mismatch');
  const {Database}=await import('bun:sqlite');check();const db=new Database(database,{readonly:true,strict:true,safeIntegers:true});let transaction=false;
  try{
   db.run('PRAGMA busy_timeout=1000');db.run('PRAGMA query_only=ON');db.run('BEGIN DEFERRED TRANSACTION');transaction=true;
   const query=(sql,args=[],rawText=false)=>{const rows=[];let bytes=0;for(const input of db.query(sql).iterate(...args)){check();if(rows.length>=50000)fail('ai_memory_snapshot_record_limit');const row={};for(const [key,value]of Object.entries(input)){if(key.startsWith('__oracle_raw_'))continue;if(rawText&&typeof value==='string'){const raw=input['__oracle_raw_'+key];if(!(raw instanceof Uint8Array)||raw.byteLength>2000000)fail('ai_memory_field_limit');try{row[key]=new TextDecoder('utf-8',{fatal:true}).decode(raw);}catch{fail('ai_memory_invalid_utf8');}}else row[key]=normalize(value);}bytes+=portableSnapshotJSON(row).length;if(bytes>64000000)fail('ai_memory_snapshot_byte_limit');rows.push(row);}return rows;};
   const actual=query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '%fts%' AND name NOT LIKE 'sqlite_%' AND name!='refinery_schema_history'").map(r=>r.name).sort();if(actual.join('\0')!==Object.keys(expected.tables).sort().join('\0'))fail('ai_memory_schema_diverged');
   const primaryKeys=new Map();for(const table of actual){if(!/^[a-z_]+$/.test(table))fail('ai_memory_schema_diverged');const info=query('PRAGMA table_info("'+table+'")');if(portableSnapshotJSON(info.map(r=>({name:r.name,type:r.type}))).toString()!==portableSnapshotJSON(expected.tables[table]).toString())fail('ai_memory_schema_diverged');primaryKeys.set(table,info.filter(r=>r.pk>0).sort((a,b)=>Number(a.pk-b.pk)).map(r=>r.name));}
   const identity=query('SELECT hex(p.id) AS project_id,hex(p.workspace_id) AS workspace_id FROM projects p JOIN workspaces w ON w.id=p.workspace_id WHERE w.name=? AND p.name=?',[context.workspace,context.project]);if(identity.length>1)fail('ai_memory_scope_ambiguous');
   const output=[];let total=0;
   if(identity.length){const p=identity[0].project_id,w=identity[0].workspace_id;if(!/^[A-F0-9]+$/.test(p)||!/^[A-F0-9]+$/.test(w))fail('ai_memory_scope_invalid');const scoped="workspace_id=X'"+w+"' AND project_id=X'"+p+"'",pages='SELECT id FROM pages WHERE '+scoped,entities='SELECT id FROM entities WHERE '+scoped,workstreams='SELECT id FROM workstreams WHERE '+scoped,proposals='SELECT id FROM auto_improve_proposals WHERE '+scoped;
    const predicates={workspaces:"id=X'"+w+"'",projects:"id=X'"+p+"' AND workspace_id=X'"+w+"'",pages:scoped,entities:scoped,sessions:scoped,observations:scoped,handoffs:scoped,page_feedback:scoped,links:'from_page_id IN ('+pages+')',entity_page_links:'entity_id IN ('+entities+') AND page_id IN ('+pages+')',page_evidence:'page_id IN ('+pages+')',auto_improve_runs:scoped,auto_improve_proposals:scoped,auto_improve_rejections:scoped,auto_improve_proposal_events:'proposal_id IN ('+proposals+')',workstreams:scoped,workstream_native_sessions:'workstream_id IN ('+workstreams+')',workstream_events:'workstream_id IN ('+workstreams+')',agent_messages:"(from_workspace_id=X'"+w+"' AND from_project_id=X'"+p+"') OR (to_workspace_id=X'"+w+"' AND to_project_id=X'"+p+"')"};
    for(const table of Object.keys(predicates).sort()){
     if(!includeConversationRecords&&['workstream_events','workstream_native_sessions'].includes(table))continue;
     const rawColumns=expected.tables[table].map(column=>'CAST("'+column.name+'" AS BLOB) AS "__oracle_raw_'+column.name+'"').join(',');
     for(const row of query('SELECT *,'+rawColumns+' FROM "'+table+'" WHERE '+predicates[table],[],true)){const key={};for(const column of primaryKeys.get(table))key[column]=row[column];if(!Object.keys(key).length)fail('ai_memory_record_identity_missing');const bytes=portableSnapshotJSON(row);total+=bytes.length;if(output.length>=maximumRecords||total>maximumBytes)fail('ai_memory_snapshot_limit');output.push(Object.freeze({table,id:sha(portableSnapshotJSON(key)),row:Object.freeze(row),sha256:sha(bytes)}));}
    }
   }
   output.sort((a,b)=>(a.table+'/'+a.id).localeCompare(b.table+'/'+b.id));unchanged(chain);check();
   const binding=context.binding;if(typeof binding?.vault!=='string'||binding.selectionRevision===undefined)fail('ai_memory_binding_invalid');
   const scope=sha(portableSnapshotJSON({vault:binding.vault,revision:String(binding.selectionRevision)},true));
   const snapshot=Object.freeze({sourceVersion:AI_MEMORY_PINS.version,sourceSnapshotComplete:true,records:Object.freeze(output),scope,workspace:context.workspace,project:context.project,bytes:total,includeConversationRecords,excludedConversationSources:Object.freeze(includeConversationRecords?[]:['workstream_events','workstream_native_sessions']),excludedOperationalSources:Object.freeze(['auth','embeddings','indexes','scheduler_leases','debug_audit']),captureEnabled:false,hooksTrusted:false});snapshots.set(snapshot,{context,ticket,check});return snapshot;
  }finally{if(transaction)try{db.run('ROLLBACK');}catch{}db.close();}
 }});
}
export function getAIMemorySnapshotContext(snapshot){const value=snapshots.get(snapshot);if(!value||snapshot.sourceSnapshotComplete!==true)fail('ai_memory_unadmitted_snapshot');value.check();return value;}
