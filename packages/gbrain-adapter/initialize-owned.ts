/** Oracle's library index is an explicit, local API profile. Creating it does
 * not activate GBrain's separate managed-writer administration or shared skills.
 * An already managed brain is refused, never downgraded or reconfigured. */
import {existsSync,lstatSync,realpathSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createEngine} from '../../vendor/gbrain/src/core/engine-factory.ts';
import {toEngineConfig,type GBrainConfig} from '../../vendor/gbrain/src/core/config.ts';
import {addSource} from '../../vendor/gbrain/src/core/sources-ops.ts';
import {ENGINE_VERSION,ENGINE_COMMIT} from './engine-pins.ts';

export async function initializeOwnedProfile(input:any){
 const profile=process.env.GBRAIN_HOME,root=input.root;
 if(typeof profile!=='string'||resolve(profile)!==profile||realpathSync(profile)!==profile||typeof root!=='string'||resolve(root)!==root||realpathSync(root)!==root||profile===root||profile.startsWith(root+'/')||root.startsWith(profile+'/'))throw Error('Explicit disjoint canonical profile and vault required');
 const memory=join(root,'INBOX/oracle-memory');
 for(const path of [root,join(root,'INBOX'),memory,profile])if(lstatSync(path).isSymbolicLink()||realpathSync(path)!==path||!lstatSync(path).isDirectory())throw Error('Canonical memory/profile directory required');
 const dir=join(profile,'.gbrain'),file=join(dir,'config.json'),marker=join(profile,'oracle-owned.json');
 const expected={owner:'OracleCompanion',schema_version:2,vault_root:root};
 if(existsSync(marker)&&(lstatSync(marker).isSymbolicLink()||realpathSync(marker)!==marker||JSON.stringify(JSON.parse(readFileSync(marker,'utf8')))!==JSON.stringify(expected)))throw Error('Profile belongs to another composition');
 if(existsSync(file)){
  if(!existsSync(marker))throw Error('Existing unowned GBrain configuration preserved');
  return {initialized:true,restored:true};
 }
 mkdirSync(dir,{recursive:true,mode:0o700});if(realpathSync(dir)!==dir||lstatSync(dir).isSymbolicLink())throw Error('Configuration directory redirected');
 const config:GBrainConfig={engine:'pglite',database_path:join(dir,'brain.pglite'),embedding_disabled:true};
 const engineConfig=toEngineConfig(config),engine=await createEngine(engineConfig);
 try{
  await engine.connect(engineConfig);
  await engine.initSchema();
  // The official library engine supports profiles before managed activation.
  // Never change this flag, grant a writer identity or touch an existing brain.
  const enabled=await engine.executeRaw<{enabled:boolean}>('SELECT enabled FROM persistence_brain WHERE singleton=1');
  if(enabled[0]?.enabled)throw Error('Managed writer activation requires its independent administration flow');
  const sources=await engine.listAllSources();
  if(!sources.some(s=>s.id==='oracle-vault'))await addSource(engine,{id:'oracle-vault',name:'Obsidian'});
  if(!sources.some(s=>s.id==='oracle-memory'))await addSource(engine,{id:'oracle-memory',name:'Memória do Oracle',localPath:memory,force:true});
  await engine.setConfig('search.mcp_keyword_only','true');
  if(!existsSync(marker))writeFileSync(marker,JSON.stringify(expected),{flag:'wx',mode:0o600});
  writeFileSync(file,JSON.stringify(config),{flag:'wx',mode:0o600});
  writeFileSync(join(profile,'oracle-engine-version.json'),JSON.stringify({version:ENGINE_VERSION,commit:ENGINE_COMMIT}),{flag:'wx',mode:0o600});
  return {initialized:true,restored:false,inference:false,managedWriterActivated:false};
 }finally{await engine.disconnect();}
}

/** Explicit Configure action only, after the owned profile and current vault
 * have been verified. Registers the stock stdio lane with the existing Oracle
 * operation ceiling. Never replaces a revoked credential, activates managed
 * persistence, adds admin scope or touches a preexisting external brain. */
export async function prepareOwnedWriter(input:any){
 const profile=process.env.GBRAIN_HOME!,root=input.root;
 if(ENGINE_VERSION==='0.48.4.0')return {prepared:false,required:false};
 if(realpathSync(profile)!==profile||typeof root!=='string'||realpathSync(root)!==root)throw Error('Canonical owned writer scope required');
 const expected={owner:'OracleCompanion',schema_version:2,vault_root:root};
 if(JSON.stringify(JSON.parse(readFileSync(join(profile,'oracle-owned.json'),'utf8')))!==JSON.stringify(expected))throw Error('Writer profile belongs to another composition');
 const {ownedConfig}=await import('./owned-runtime.ts');const config=ownedConfig(),engineConfig=toEngineConfig(config),engine=await createEngine(engineConfig);
 try{
  await engine.connect(engineConfig);
  const memory=(await engine.listAllSources()).find(s=>s.id==='oracle-memory');
  if(memory?.local_path!==join(root,'INBOX/oracle-memory'))throw Error('Canonical writer source changed');
  // Dynamic resolution keeps the historical native adapter pinned to its own
  // engine. This API is part of the separately admitted modern source package.
  const identity=await import(new URL('../../vendor/gbrain/src/core/persistence/identity.ts',import.meta.url).href);
  const grant={sourceIds:['oracle-memory','oracle-vault'],operations:['remember','recall','entity','context_pack','delta','forget','search','get_page','list_pages','get_links','get_backlinks','traverse_graph','put_page'],scopes:['read','write'],slugPrefixes:null};
  const local=await identity.registerLocalWriter(engine,'stdio',grant,false);
  const verified=await identity.verifyLocalWriter(engine,local);
  const actual=verified.grant;
  if(actual.scopes.some((s:string)=>!grant.scopes.includes(s))||actual.sourceIds.some((s:string)=>!grant.sourceIds.includes(s))||!actual.operations||actual.operations.some((s:string)=>!grant.operations.includes(s)))throw Error('Existing writer grant exceeds the Oracle ceiling');
  return {prepared:true,required:true,adminGranted:false,managedPersistenceActivated:false};
 }finally{await engine.disconnect();}
}
