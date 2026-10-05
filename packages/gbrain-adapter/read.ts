/** Official pinned engine only: bounded input, explicit profiles, verified freshness. */
import {createEngine} from '../../vendor/gbrain/src/core/engine-factory.ts';
import {toEngineConfig} from '../../vendor/gbrain/src/core/config.ts';
import {ownedConfig} from './owned-runtime.ts';
import {explicitEngineConfig} from './scope.ts';
import {assertFreshPage,indexFreshness} from './freshness.ts';
import {assertRuntimeAvailable,acquireRuntimeAccess,releaseRuntimeAccess} from './runtime-gate.ts';
import {ENGINE_VERSION,ENGINE_COMMIT} from './engine-pins.ts';
import {existsSync,readFileSync,writeFileSync,realpathSync,lstatSync} from 'node:fs';
import {join} from 'node:path';

if(Bun.argv.includes('--mcp')){
  const {startMemoryMcp}=await import('./mcp.ts');await startMemoryMcp();
}else{
  console.log=(...args)=>console.error(...args);
  let engine:Awaited<ReturnType<typeof createEngine>>|undefined;
  let access:Awaited<ReturnType<typeof acquireRuntimeAccess>>|undefined;
  let response:{ok:boolean;value?:unknown;error?:string}={ok:false,error:'No operation completed'};
  const safeError=(error:unknown)=>String(error instanceof Error?error.message:error).replace(/(?:postgres(?:ql)?|https?):\/\/\S+/gi,'[endpoint omitted]').slice(0,600);
  try{
    const chunks:Uint8Array[]=[];let size=0;
    for await(const chunk of Bun.stdin.stream()){
      size+=chunk.byteLength;if(size>16_000_000)throw Error('Adapter request exceeds 16 MB');chunks.push(chunk);
    }
    const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if(!input||!['initialize','prepare-writer','upgrade-profile','status','search','get','graph','list','index','backup','runtime-generation'].includes(input.operation))throw Error('Unsupported operation');
    if(input.operation!=='runtime-generation'&&(input.owned===true||input.operation==='index'||input.operation==='backup')){
      if(!process.env.GBRAIN_HOME)throw Error('Explicit profile required');
      access=await acquireRuntimeAccess(process.env.GBRAIN_HOME);assertRuntimeAvailable(process.env.GBRAIN_HOME);
    }
    if(input.operation==='upgrade-profile'){
      const {upgradeOwnedProfile}=await import('./upgrade-owned.ts');response={ok:true,value:await upgradeOwnedProfile(input)};
    }else if(input.operation==='prepare-writer'){
      const {prepareOwnedWriter}=await import('./initialize-owned.ts');response={ok:true,value:await prepareOwnedWriter(input)};
    }else if(input.operation==='initialize'){
      const {initializeOwnedProfile}=await import('./initialize-owned.ts');response={ok:true,value:await initializeOwnedProfile(input)};
    }else if(input.operation==='runtime-generation'){
      const {runRuntimeGeneration}=await import('./runtime-generation.ts');response={ok:true,value:await runRuntimeGeneration(input)};
    }else if(input.operation==='backup'){
      // Backup owns its official writer; never open an outer engine around it.
      const {runGBrainBackupOperation}=await import('./backup.ts');
      response={ok:true,value:await runGBrainBackupOperation(input)};
    }else{
      const owned=input.owned===true||input.operation==='index';
      const config=owned?ownedConfig():explicitEngineConfig();
      const engineConfig=owned?toEngineConfig(config):config.engineConfig;
      engine=await createEngine(engineConfig);await engine.connect(engineConfig);
      if(owned)assertRuntimeAvailable(process.env.GBRAIN_HOME!);
      let value:unknown;
      if(input.operation==='index'){
        const versionFile=join(process.env.GBRAIN_HOME!,'oracle-engine-version.json');
        let generation:any=null;
        if(existsSync(versionFile)){
          if(realpathSync(versionFile)!==versionFile||lstatSync(versionFile).isSymbolicLink())throw Error('Engine receipt redirected');
          generation=JSON.parse(readFileSync(versionFile,'utf8'));
          if(generation.commit!==ENGINE_COMMIT)throw Error('Engine generation differs from current runtime');
        }
        const {indexVault}=await import('./index.ts');value=await indexVault(engine,{...input,force:input.force===true||generation?.needsReindex===true,force_upgrade:input.force!==true&&generation?.needsReindex===true});
        if((value as any)?.complete===true&&generation?.needsReindex===true)writeFileSync(versionFile,JSON.stringify({...generation,needsReindex:false}),{mode:0o600});
      }else if(input.operation==='status'){
        const sources=await engine.listAllSources();
        value={version:ENGINE_VERSION,commit:ENGINE_COMMIT,engine:config.engine||'postgres',
          sources:sources.map(s=>({id:s.id,name:s.name,local_path:s.local_path})),
          capabilities:['keyword-search','get-page','explicit-links'],inference:false,index:indexFreshness()};
      }else{
        const sourceId=input.source;if(typeof sourceId!=='string'||!sourceId||sourceId==='__all__')throw Error('Choose one source');
        const scope={sourceId};
        if(input.operation==='search')value=await engine.searchKeyword(String(input.query||'').slice(0,500),{...scope,limit:30});
        else if(input.operation==='list')value=(await engine.listPages({...scope,limit:100,sort:'updated_desc'})).map(p=>({slug:p.slug,title:p.title,source_id:p.source_id,updated_at:p.updated_at}));
        else if(input.operation==='get')value=assertFreshPage(await engine.getPage(String(input.slug),scope));
        else{if(sourceId==='oracle-vault')assertFreshPage(await engine.getPage(String(input.slug),scope));value=await engine.getLinks(String(input.slug),scope)}
      }
      response={ok:true,value};
    }
  }catch(error){response={ok:false,error:safeError(error)}}
  finally{try{if(engine)await engine.disconnect()}catch(error){response={ok:false,error:'Engine cleanup failed: '+safeError(error)}}finally{if(access)await releaseRuntimeAccess(access)}}
  await Bun.stdout.write(JSON.stringify(response)+'\n');
  process.exit(response.ok?0:1);
}
