/** Fault injection around the REAL pinned PGLite transaction, not a fake engine. */
import {createEngine} from '../../vendor/gbrain/src/core/engine-factory.ts';
import {explicitEngineConfig,canonicalFiles} from './scope.ts';
import {indexVault} from './index.ts';
import {readFileSync,writeFileSync,unlinkSync,realpathSync} from 'node:fs';
import {join} from 'node:path';

let engine:Awaited<ReturnType<typeof createEngine>>|undefined,exitStatus=0;
try{
  const raw=process.env.ORACLE_FIXTURE_VAULT,profile=process.env.GBRAIN_HOME;
  if(!raw||!profile||!raw.includes('/.work/')||!profile.includes('/.work/'))throw Error('Only explicitly selected synthetic .work state is permitted');
  const root=realpathSync(raw),config=explicitEngineConfig();
  if(config.engine!=='pglite')throw Error('Fault tests never connect to PostgreSQL');
  engine=await createEngine(config.engineConfig);await engine.connect(config.engineConfig);
  const scope={sourceId:'oracle-vault'};
  const call=(budget=60_000)=>indexVault(engine!,{operation:'index',source:'oracle-vault',root,files:canonicalFiles(root,Date.now()+10_000),scan_complete:true,budget_ms:budget});
  writeFileSync(join(root,'transaction-obsolete.md'),'# Transaction obsolete\n\nUnique synthetic content.\n');
  writeFileSync(join(root,'transaction-keeper.md'),'# Transaction keeper\n\n[[transaction-obsolete]]\n');
  if(!(await call()).complete)throw Error('Initial official transaction fixture did not index');
  const getPage=engine.getPage,realTransaction=engine.transaction.bind(engine);
  engine.getPage=async()=>{throw Error('Synthetic interruption during unchanged verification')};
  if((await call()).complete)throw Error('Interrupted verification must remain partial');
  engine.getPage=getPage;
  let reconciliations=0;
  engine.transaction=async fn=>{reconciliations++;return realTransaction(fn)};
  const resumed=await call();
  if(!resumed.complete||!resumed.no_op||reconciliations!==0)throw Error('Unchanged checkpoint must finish without rebuilding verified relations');
  console.log('PASS unchanged checkpoint reuses verified relations without a transaction');
  writeFileSync(join(root,'transaction-keeper.md'),'# Transaction keeper\n\nChanged synthetic content after interruption.\n');
  engine.transaction=async fn=>realTransaction(async tx=>fn(new Proxy(tx,{get(target,key){
    if(key==='removeLinksByPagesAndSource')return async()=>{throw Error('Synthetic interruption after imports')};
    const method=Reflect.get(target,key);return typeof method==='function'?method.bind(target):method;
  }})));
  if((await call()).complete)throw Error('Interrupted changed import must remain partial');
  reconciliations=0;
  engine.transaction=async fn=>{reconciliations++;return realTransaction(fn)};
  const changed=await call();
  if(!changed.complete||changed.no_op||changed.changed!==0||reconciliations<1)throw Error('Changed checkpoint must rebuild relations even with zero new imports');
  console.log('PASS changed checkpoint reconciles imported changes before completion');
  engine.transaction=realTransaction;
  // Exhaust the real request deadline precisely inside atomic finalization.
  // A synthetic clock avoids a slow wall-clock test and leaves the real engine
  // and every ownership/concurrent-edit check in the exercised path.
  writeFileSync(join(root,'transaction-keeper.md'),'# Transaction keeper\n\nBudget-limited changed content. See [[transaction-obsolete]].\n');
  const manifestBeforeBudget=readFileSync(join(profile,'oracle-vault-manifest.json'));
  const clock=Date.now;
  engine.transaction=async fn=>realTransaction(async tx=>{
    Date.now=()=>clock()+60_001;
    try{return await fn(tx)}finally{Date.now=clock}
  });
  const limited=await call();engine.transaction=realTransaction;
  if(limited.complete||!limited.needs_resume||!limited.budget_exhausted||limited.interrupted_phase!=='reconcile'||limited.recommended_budget_ms!==120_000)throw Error('Deadline exhaustion did not produce a bounded explicit retry');
  if(!readFileSync(join(profile,'oracle-vault-manifest.json')).equals(manifestBeforeBudget))throw Error('Budget-limited reconciliation changed complete manifest');
  const budgetRecovered=await call(limited.recommended_budget_ms);
  if(!budgetRecovered.complete||budgetRecovered.changed!==0||budgetRecovered.no_op)throw Error('Larger explicit retry did not finalize already imported owned pages');
  console.log('PASS finalization deadline preserves complete receipt and larger explicit retry finishes with zero imports');
  // Canonical edit during the transaction must roll graph writes back even in
  // the larger window, and the human's bytes must remain untouched.
  writeFileSync(join(root,'transaction-keeper.md'),'# Transaction keeper\n\n[[transaction-obsolete]]\n');
  if(!(await call()).complete)throw Error('Could not restore concurrent-edit fixture');
  const beforeConcurrent=readFileSync(join(profile,'oracle-vault-manifest.json'));
  const concurrentBytes='# Human edit during finalization\n';
  let edited=false;
  engine.transaction=async fn=>realTransaction(async tx=>fn(new Proxy(tx,{get(target,key){
    const method=Reflect.get(target,key);
    if(key==='removeLinksByPagesAndSource')return async(...args:any[])=>{
      if(!edited){writeFileSync(join(root,'transaction-keeper.md'),concurrentBytes);edited=true}
      return method.apply(target,args);
    };
    return typeof method==='function'?method.bind(target):method;
  }})));
  // Add a new owned page so this is a required transaction rather than a no-op.
  writeFileSync(join(root,'transaction-window.md'),'# Window\n\n[[transaction-keeper]]\n');
  const concurrent=await call(120_000);engine.transaction=realTransaction;
  if(!edited||concurrent.complete||concurrent.budget_exhausted||concurrent.needs_resume||!readFileSync(join(profile,'oracle-vault-manifest.json')).equals(beforeConcurrent))throw Error('Canonical edit failed to prevent finalization');
  if(readFileSync(join(root,'transaction-keeper.md'),'utf8')!==concurrentBytes)throw Error('Canonical human edit was overwritten');
  if(!(await call(120_000)).complete)throw Error('Canonical concurrent-edit recovery failed');
  console.log('PASS larger finalization window still rolls back on a concurrent canonical edit and preserves human bytes');
  writeFileSync(join(root,'transaction-keeper.md'),'# Transaction keeper\n\n[[transaction-obsolete]]\n');
  if(!(await call()).complete)throw Error('Could not restore relation fixture');
  const manifest=join(profile,'oracle-vault-manifest.json'),before=readFileSync(manifest);
  const linksBefore=JSON.stringify(await engine.getLinks('transaction-keeper',scope));
  unlinkSync(join(root,'transaction-obsolete.md'));
  const transaction=engine.transaction.bind(engine);let deletedInside=false;
  engine.transaction=async fn=>transaction(async tx=>{
    const proxy=new Proxy(tx,{get(target,key){
      const method=Reflect.get(target,key);
      if(key==='deletePages')return async(...args:any[])=>{const result=await method.apply(target,args);if(result.length)deletedInside=true;return result};
      if(key==='removeLinksByPagesAndSource')return async(...args:any[])=>{
        if(deletedInside)throw Error('Synthetic failure after derived deletion and before link reconciliation');
        return method.apply(target,args);
      };
      return typeof method==='function'?method.bind(target):method;
    }});
    return fn(proxy);
  });
  const interrupted=await call();
  if(!deletedInside||interrupted.complete||!await engine.getPage('transaction-obsolete',scope))throw Error('Official transaction did not roll back the injected deletion');
  if(!readFileSync(manifest).equals(before))throw Error('Partial reconciliation changed the complete manifest');
  if(JSON.stringify(await engine.getLinks('transaction-keeper',scope))!==linksBefore)throw Error('Rollback did not preserve previous graph relations');
  console.log('PASS real official transaction rolls back deletion and relations after injected failure');
  engine.transaction=transaction;
  if(!(await call()).complete||await engine.getPage('transaction-obsolete',scope))throw Error('Recovery did not commit the complete desired snapshot');
  console.log('PASS recovery resumes after transaction failure and commits only the verified snapshot');
}catch(error){console.error(error);exitStatus=1}
finally{try{if(engine)await engine.disconnect()}catch(error){console.error(error);exitStatus=1}}
process.exit(exitStatus);
