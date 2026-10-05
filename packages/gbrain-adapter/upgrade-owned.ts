/** Schema migration of an Oracle-owned library profile, on a closed copy.
 * The caller holds the stable access lease. No canonical Markdown is written,
 * managed writer identity granted, services installed or provider configured. */
import {readFileSync,writeFileSync,existsSync,realpathSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {createEngine} from '../../vendor/gbrain/src/core/engine-factory.ts';
import {toEngineConfig} from '../../vendor/gbrain/src/core/config.ts';
import {ownedConfig} from './owned-runtime.ts';
import {ENGINE_VERSION,ENGINE_COMMIT,ENGINE_HISTORY} from './engine-pins.ts';
import {upgradeClosedProfile,recoverClosedProfile} from '../oracle-desktop-portable/closed-profile-upgrade.mjs';
const stable=(value:any):string=>value===null?'null':Array.isArray(value)?'['+value.map(stable).join(',')+']':typeof value==='object'?'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}':JSON.stringify(value);
async function knowledgeRows(engine:any,columns?:Record<string,string[]>){
 const result:Record<string,{columns:string[];rows:string[]}>= {};
 for(const [table,wanted] of Object.entries({pages:['id','source_id','slug','body','frontmatter'],facts:['id','source_id','entity','content','row_num'],page_versions:['id','source_id','slug','body','frontmatter']})){
  const info=await engine.executeRaw('SELECT column_name FROM information_schema.columns WHERE table_schema=\'public\' AND table_name=$1 ORDER BY ordinal_position',[table]);
  const present=new Set(info.map((r:any)=>r.column_name));const selected=columns?.[table]??wanted.filter(column=>present.has(column));
  if(!selected.length)continue;
  const rows=await engine.executeRaw('SELECT '+selected.map(c=>'"'+c+'"').join(',')+' FROM "'+table+'"');if(rows.length>100000)throw Error('Owned profile exceeds migration record budget');
  result[table]={columns:selected,rows:rows.map(stable).sort()};
 }return result;
}
export async function upgradeOwnedProfile(input:any){
 const root=process.env.GBRAIN_HOME!,vault=input.root;
 if(realpathSync(root)!==root||typeof vault!=='string'||realpathSync(vault)!==vault)throw Error('Explicit canonical migration scope required');
 const check=()=>{if(process.env.ORACLE_CANCEL_FILE&&existsSync(process.env.ORACLE_CANCEL_FILE))throw Error('Upgrade cancelled');};
 const expected={owner:'OracleCompanion',schema_version:2,vault_root:vault};
 const admitOld=async(path:string)=>{check();const file=join(path,'oracle-owned.json');if(realpathSync(path)!==path||realpathSync(file)!==file||stable(JSON.parse(readFileSync(file,'utf8')))!==stable(expected))throw Error('Owned profile changed before migration');};
 await recoverClosedProfile({root,admitOld,check});
 if(!existsSync(join(root,'oracle-owned.json'))){if(existsSync(join(root,'.gbrain/config.json')))throw Error('Unowned configuration preserved');return {upgraded:false,unconfigured:true};}
 await admitOld(root);const config=ownedConfig(),versionFile=join(root,'oracle-engine-version.json');
 if(existsSync(versionFile)){
  if(realpathSync(versionFile)!==versionFile||lstatSync(versionFile).isSymbolicLink())throw Error('Engine receipt redirected');
  const current=JSON.parse(readFileSync(versionFile,'utf8'));if(current.commit===ENGINE_COMMIT)return {upgraded:false,version:ENGINE_VERSION,needsReindex:current.needsReindex===true};
  if(!ENGINE_HISTORY.includes(current.commit))throw Error('Unreviewed earlier engine generation preserved');
 }
 const owner=readFileSync(join(root,'oracle-owned.json'));
 return upgradeClosedProfile({root,version:ENGINE_VERSION,admitOld,check,async prepare(candidate:string){
  const raw=JSON.parse(readFileSync(join(candidate,'.gbrain/config.json'),'utf8'));
  if(raw.engine!=='pglite'||raw.embedding_disabled!==true||raw.database_path!==config.database_path)throw Error('Owned configuration changed');
  const path=join(candidate,'.gbrain/brain.pglite');raw.database_path=path;
  writeFileSync(join(candidate,'.gbrain/config.json'),JSON.stringify(raw),{mode:0o600});
  const candidateConfig={...config,database_path:path},engineConfig=toEngineConfig(candidateConfig),engine=await createEngine(engineConfig);
  try{
   await engine.connect(engineConfig);const before=await knowledgeRows(engine);check();
   await engine.initSchema();check();
   const after=await knowledgeRows(engine,Object.fromEntries(Object.entries(before).map(([table,row])=>[table,row.columns])));
   if(stable(before)!==stable(after))throw Error('Original knowledge rows changed during migration');
   if(await engine.getConfig('search.mcp_keyword_only')!=='true')throw Error('Keyword-only policy changed during migration');
   const sources=await engine.listAllSources(),ownership=JSON.parse(owner.toString());
   if(sources.find(s=>s.id==='oracle-memory')?.local_path!==join(ownership.vault_root,'INBOX/oracle-memory')||!sources.some(s=>s.id==='oracle-vault'&&!s.local_path))throw Error('Source binding changed during migration');
  }finally{await engine.disconnect();}
  raw.database_path=config.database_path;writeFileSync(join(candidate,'.gbrain/config.json'),JSON.stringify(raw),{mode:0o600});
  writeFileSync(join(candidate,'oracle-engine-version.json'),JSON.stringify({version:ENGINE_VERSION,commit:ENGINE_COMMIT,needsReindex:true}),{mode:0o600});check();
 }});
}
