import {canonicalizeLocalLinks,hasKnownEndpoints} from './link-resolution.ts';
import {LinkDiagnostics,prepareLinkContent,LINK_DIAGNOSTICS_VERSION} from './link-diagnostics.ts';
import {importFromContent} from '../../vendor/gbrain/src/core/import-file.ts';
import {extractPageLinks,makeResolver} from '../../vendor/gbrain/src/core/link-extraction.ts';
import type {BrainEngine} from '../../vendor/gbrain/src/core/engine.ts';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,renameSync,existsSync,openSync,closeSync,fsyncSync,unlinkSync,realpathSync,lstatSync} from 'node:fs';
import {join,dirname,basename,resolve} from 'node:path';
import {sha,canonical,isOwnedMemory,readCandidate,canonicalFiles,isProvenCanonicalRename} from './scope.ts';
import {readCompleteManifest,readIndexReceipt} from './freshness.ts';
import {indexBudget,indexResumeBudget,indexDeadlineError} from './index-resume-policy.ts';
import {ENGINE_COMMIT} from './engine-pins.ts';

export {sha,canonical,isOwnedMemory};
export const inventory=(root:string)=>canonicalFiles(root,Date.now()+480_000);

type RecordRow={path:string;slug:string;sha256:string;canonical_path:string;indexed_content_hash?:string;page_hash?:string;engine_commit?:string};
type Problem={path:string;error:string};
export function atomicJSON(path:string,data:unknown){
  mkdirSync(dirname(path),{recursive:true,mode:0o700});const tmp=path+'.'+randomUUID()+'.tmp';
  if(existsSync(path)&&lstatSync(path).isSymbolicLink())throw Error('Receipt symlink refused');
  try{
    writeFileSync(tmp,JSON.stringify(data),{mode:0o600,flag:'wx'});
    const file=openSync(tmp,'r');try{fsyncSync(file)}finally{closeSync(file)}
    renameSync(tmp,path);
    const directory=openSync(dirname(path),'r');try{fsyncSync(directory)}finally{closeSync(directory)}
  }finally{if(existsSync(tmp))unlinkSync(tmp)}
}
function loadCheckpoint(path:string,root:string):any{
  if(!existsSync(path))return null;
  const value=readIndexReceipt(path);
  if(value.root!==root||!Array.isArray(value.records)||!Array.isArray(value.managed)||value.records.length>60_000||value.managed.length>120_000)throw Error('Checkpoint belongs to another scope or is malformed; preserved for inspection');
  return value;
}

export async function indexVault(engine:BrainEngine,input:any){
  const selected=process.env.GBRAIN_HOME,receiptDir=process.env.ORACLE_RECEIPT_DIR;
  if(!selected||!receiptDir)throw Error('Indexing requires the isolated Oracle-owned profile');
  const profile=realpathSync(selected),marker=join(profile,'oracle-owned.json');
  if(input.inventory_file!==undefined){
    const hash=input.inventory_sha256,path=String(input.inventory_file),directory=join(profile,'oracle-index-input');
    if(input.files!==undefined||typeof hash!=='string'||!/^[a-f0-9]{64}$/.test(hash)||path!==join(directory,hash+'.json')||realpathSync(directory)!==directory||lstatSync(path).isSymbolicLink())throw Error('Index inventory transport is outside the owned profile');
    const before=lstatSync(path);
    if(!before.isFile()||before.nlink!==1||before.size>64_000_000||(before.size>0&&before.blocks===0))throw Error('Invalid inventory transport file');
    const bytes=readFileSync(path),after=lstatSync(path);
    if(sha(bytes)!==hash||before.ino!==after.ino||before.mtimeMs!==after.mtimeMs||before.size!==bytes.length)throw Error('Index inventory transport changed');
    const inventory=JSON.parse(bytes.toString('utf8'));
    if(inventory.schema_version!==1||inventory.root!==input.root||!Array.isArray(inventory.files)||inventory.files.length!==input.inventory_count||inventory.files.length>60_000)throw Error('Incomplete inventory transport');
    input={...input,files:inventory.files};
  }
  if(resolve(selected)!==profile||lstatSync(selected).isSymbolicLink()||lstatSync(marker).isSymbolicLink())throw Error('Profile ownership path changed');
  const ownership=JSON.parse(readFileSync(marker,'utf8'));
  const requested=resolve(String(input.root)),root=realpathSync(requested);
  if(requested!==root||lstatSync(requested).isSymbolicLink()||ownership.owner!=='OracleCompanion'||ownership.schema_version!==2||ownership.vault_root!==root)throw Error('Source/target ownership mismatch');
  if(root===profile||root.startsWith(profile+'/')||profile.startsWith(root+'/'))throw Error('Index source overlaps its profile');
  if(engine.kind!=='pglite'||input.source!=='oracle-vault')throw Error('Invalid derived-source scope');
  const sources=await engine.listAllSources(),derived=sources.find(row=>row.id==='oracle-vault'),memory=sources.find(row=>row.id==='oracle-memory');
  const memoryRoot=join(root,'INBOX/oracle-memory');
  if(!derived||derived.local_path||memory?.local_path!==memoryRoot||realpathSync(memoryRoot)!==memoryRoot||lstatSync(join(root,'INBOX')).isSymbolicLink()||lstatSync(memoryRoot).isSymbolicLink())throw Error('Canonical memory or derived target changed');
  const stateRoot=resolve(profile,'../..');
  if(resolve(receiptDir)!==join(stateRoot,'events'))throw Error('Receipt destination must stay inside Oracle state');
  if(input.force!==undefined&&typeof input.force!=='boolean')throw Error('force must be boolean');
  if(process.env.ORACLE_PLAN_EVENTS_DIR&&(!/^[a-f0-9-]{36}$/i.test(input.plan_ref||'')||resolve(process.env.ORACLE_PLAN_EVENTS_DIR)!==join(stateRoot,'setup/events',input.plan_ref)))throw Error('Plan event target changed');
  for(const path of [receiptDir,process.env.ORACLE_PLAN_EVENTS_DIR].filter(Boolean) as string[]) {
    let cursor=path;
    while(cursor!==stateRoot){if(existsSync(cursor)&&lstatSync(cursor).isSymbolicLink())throw Error('Event directory symlink refused');cursor=dirname(cursor);}
  }
  let files:string[]=[];
  const run=randomUUID(),now=()=>new Date().toISOString();
  const started=Date.now(),budget=indexBudget(input.budget_ms),deadline=started+budget;
  const maxUpserts=Math.min(5000,Math.max(1,Number(input.max_upserts)||500));
  const manifestPath=join(profile,'oracle-vault-manifest.json'),checkpointPath=join(profile,'oracle-vault-checkpoint.json');
  const previous=readCompleteManifest(profile);
  if(previous&&realpathSync(previous.root)!==root)throw Error('Complete manifest belongs to another canonical root');
  const checkpoint=loadCheckpoint(checkpointPath,root);
  const pendingPath=join(profile,'oracle-vault-pending.json');
  const pending=existsSync(pendingPath)?readIndexReceipt(pendingPath):null;
  if(pending&&pending.root!==root)throw Error('Pending ownership belongs to another vault');
  const normalize=(row:RecordRow):RecordRow=>({...row,indexed_content_hash:row.indexed_content_hash??row.page_hash});
  const historical:RecordRow[]=[...(previous?.records||[]),...(pending?.records||[]),...(checkpoint?.managed||[]),...(checkpoint?.records||[])].map(normalize);
  const latestOwnership=new Map<string,RecordRow>(historical.map(row=>[row.slug,row]));
  const managed=new Map<string,RecordRow>(historical.map(row=>[row.path+'\0'+row.slug,row]));
  const reusable=new Map<string,RecordRow>([...(previous?.records||[]),...(checkpoint?.records||[])].map((row:RecordRow)=>[row.path,normalize(row)]));
  const records:RecordRow[]=[],failures:Problem[]=[],candidates:Omit<ReturnType<typeof readCandidate>,'text'>[]=[];
  let phase='preflight',upserts=0,removed=0,links=0,sequence=0,needsResume=false,reconciled=false,noOp=false;
  let failurePhase:string|undefined,timeBudgetReached=false;
  const problem=(path:string,error:unknown)=>{if(failures.length<100)failures.push({path,error:String(error instanceof Error?error.message:error).slice(0,300)})};
  const event=(type:string,summary:string)=>{
    const id=sha(run+type+sequence++),document={schema_version:1,event_id:id,sequence:Date.now()*1000+sequence,source:'gbrain',event_type:type,
      phase:'index',completed:records.length,total:files.length,run_id:run,plan_ref:input.plan_ref||null,received_at:now(),occurred_at:now(),
      sanitized_summary:summary,coverage:'derived-vault-source',observed_status:type.endsWith('verified')?'verified':'partial'};
    atomicJSON(join(receiptDir,id+'.json'),document);
    if(process.env.ORACLE_PLAN_EVENTS_DIR)atomicJSON(join(process.env.ORACLE_PLAN_EVENTS_DIR,id+'.json'),document);
  };
  const save=()=>{
    const checkpoint={schema_version:2,run_id:run,root,phase,records,managed:[...managed.values()],failures,complete:false,
                      generation:input.generation??null,scan_complete:input.scan_complete===true,at:now(),
                      budget_ms:budget,elapsed_ms:Date.now()-started,...(failurePhase?{failure_phase:failurePhase,interrupted_phase:failurePhase}:{}),
                      recommended_budget_ms:indexResumeBudget(budget,timeBudgetReached)};
    atomicJSON(checkpointPath,{...checkpoint,receipt_sha256:sha(canonical(checkpoint))});
  };
  const check=()=>{
    if(process.env.ORACLE_CANCEL_FILE&&existsSync(process.env.ORACLE_CANCEL_FILE))throw Error('Indexing cancelled');
    if(Date.now()>deadline){needsResume=true;timeBudgetReached=true;throw Error('Bounded indexing budget reached; resume from checkpoint')}
  };
  event('gbrain.index_started','Verificação do índice derivado iniciada');
  try{
    if(input.files!==undefined&&(!Array.isArray(input.files)||input.files.length>60_000||input.files.some((path:unknown)=>typeof path!=='string')))throw Error('Invalid canonical inventory');
    files=input.files===undefined?canonicalFiles(root,deadline):input.files.filter((path:string)=>!isOwnedMemory(path));
    if(input.scan_complete!==false){
      if(canonical([...files].sort())!==canonical(canonicalFiles(root,deadline)))throw Error('Incomplete or stale inventory; no writes or deletion reconciliation permitted');
      input={...input,scan_complete:true};
    }
    // Resolve EVERY identity with official parser/slug APIs BEFORE the first upsert.
    // Two spellings collapsing to one slug can never overwrite each other.
    const seenPaths=new Set<string>(),seenSlugs=new Map<string,string>(),seenExternalIDs=new Map<string,string>();let totalBytes=0;
    for(const relative of files){
      check();
      try{
        if(typeof relative!=='string'||seenPaths.has(relative))throw Error('Duplicate or invalid canonical path');
        seenPaths.add(relative);
        const row=readCandidate(root,relative);totalBytes+=row.bytes;
        if(totalBytes>128_000_000)throw Error('Snapshot exceeds the 128 MB bounded content budget');
        const other=seenSlugs.get(row.slug);
        if(other!==undefined)throw Error(`Slug collision with ${other}; rename one canonical note`);
        if(row.external_id){
          const duplicate=seenExternalIDs.get(row.external_id);
          if(duplicate!==undefined)throw Error(`Frontmatter identity collision with ${duplicate}; no canonical note was changed`);
          seenExternalIDs.set(row.external_id,relative);
        }
        seenSlugs.set(row.slug,relative);
        const {text,...metadata}=row;candidates.push(metadata);
        if(candidates.length%64===0)Bun.gc(true);
      }catch(error){problem(String(relative),error)}
    }
    if(failures.length)throw Error('Preflight failed; no derived upsert was performed');
    Bun.gc(true);
    // Page read projections deliberately do not expose source_path in this pin.
    // Use the official batch path resolver rather than assuming an internal field.
    const mappings=new Map<string,string>();
    const paths=[...new Set([...candidates.map(row=>row.path),...historical.map(row=>row.path)])];
    for(let start=0;start<paths.length;start+=200){
      check();for(const [path,slug] of await engine.resolveSlugsByPaths(paths.slice(start,start+200),{sourceId:'oracle-vault'}))mappings.set(path,slug);
    }
    // Also protect existing rows not represented by our ownership receipts.
    const forceOwnedRename=new Set<string>(),checkedOwnership=new Set<string>();
    for(const row of candidates){
      check();const page=await engine.getPage(row.slug,{sourceId:'oracle-vault'});
      const owned=latestOwnership.get(row.slug);
      const prior=owned&&mappings.get(owned.path)===row.slug?owned:undefined;
      if(page&&(!prior||(prior.indexed_content_hash&&prior.indexed_content_hash!==page.content_hash)))throw Error(`Derived page changed without an ownership receipt: ${row.path}`);
      checkedOwnership.add(row.slug);
      if(checkedOwnership.size%64===0)Bun.gc(true);
      if(page&&mappings.get(row.path)!==row.slug&&!historical.some(old=>old.slug===row.slug&&mappings.get(old.path)===row.slug&&
          isProvenCanonicalRename(root,old.path,row.path,input.scan_complete===true)))throw Error(`Existing canonical identity collision: ${row.path}`);
      if(row.external_id){
        const duplicate=await engine.findDuplicatePage('oracle-vault',{hash:row.sha256,frontmatterId:row.external_id});
        if(duplicate&&duplicate.slug!==row.slug){
          const old=historical.find(old=>old.slug===duplicate.slug&&mappings.get(old.path)===duplicate.slug&&!seenPaths.has(old.path)&&
              isProvenCanonicalRename(root,old.path,row.path,input.scan_complete===true));
          if(!old)throw Error(`Unowned external identity collision: ${row.path}`);
          // Official forceRechunk overrides identity dedup only for a proven
          // owned canonical rename whose old path is absent from this snapshot.
          forceOwnedRename.add(row.path);
        }
      }
    }
    for(const old of latestOwnership.values()){
      if(checkedOwnership.has(old.slug))continue;
      check();const page=await engine.getPage(old.slug,{sourceId:'oracle-vault'});
      if(page&&old.indexed_content_hash&&page.content_hash!==old.indexed_content_hash)throw Error(`Edited derived page preserved: ${old.path}`);
    }
    // Persist the entire preflighted intent set ONCE before any import. Checkpoint
    // progress is then batched (25), not an O(N²) full fsync on every single note.
    // After a crash at most 24 imports need readback/replay; intents stay durable.
    for(const {bytes,...row} of candidates)managed.set(row.path+'\0'+row.slug,row);
    if(managed.size>120_000)throw Error('Derived ownership intent budget exceeded');
    phase='upsert';save();
    for(const candidate of candidates){
      check();
      const {bytes,...row}=candidate;
      const current=readCandidate(root,row.path);
      if(current.sha256!==row.sha256||current.slug!==row.slug)throw Error(`Canonical note changed during indexing: ${row.path}`);
      const page=await engine.getPage(row.slug,{sourceId:'oracle-vault'}),prior=reusable.get(row.path);
      const reusableGeneration=!input.force||input.force_upgrade===true&&prior?.engine_commit===ENGINE_COMMIT;
      if(reusableGeneration&&prior?.sha256===row.sha256&&page?.content_hash===prior.indexed_content_hash&&mappings.get(row.path)===row.slug){records.push(prior);continue}
      if(upserts>=maxUpserts){needsResume=true;throw Error('Bounded upsert count reached; resume from checkpoint')}
      // Intent was committed before this batch; canonical content is never written.
      const imported=await importFromContent(engine,row.slug,current.text,{noEmbed:true,sourceId:'oracle-vault',sourcePath:row.path,
        filename:basename(row.path,'.md'),allowEmptyOverwrite:true,forceRechunk:input.force===true||forceOwnedRename.has(row.path)||(!!page&&mappings.get(row.path)!==row.slug)});
      if(imported.error||imported.slug!==row.slug||imported.status==='error')throw Error(imported.error||'Official import did not preserve the requested identity');
      const verified=await engine.getPage(row.slug,{sourceId:'oracle-vault'});
      const verifiedMapping=await engine.resolveSlugsByPaths([row.path],{sourceId:'oracle-vault'});
      if(!verified||verifiedMapping.get(row.path)!==row.slug||typeof verified.content_hash!=='string'||!/^[a-f0-9]{64}$/.test(verified.content_hash))throw Error('Official engine source-path or content-hash readback failed');
      records.push({...row,indexed_content_hash:verified.content_hash,page_hash:verified.content_hash,engine_commit:ENGINE_COMMIT});upserts++;
      if(upserts%25===0){save();event('gbrain.index_progress',`${records.length} documentos verificados`);Bun.gc(true)}
    }
    if(input.scan_complete!==true)throw Error('Native scan was partial or unverified; no deletions or link reconciliation permitted');
    phase='verify-snapshot';save();check();
    const actual=canonicalFiles(root,deadline);
    if(JSON.stringify(actual)!==JSON.stringify([...files].sort()))throw Error('Canonical scope changed (create/delete/rename) during indexing');
    for(let i=0;i<records.length;i++){check();const row=records[i]!;if(readCandidate(root,row.path).sha256!==row.sha256)throw Error(`Canonical note changed before reconciliation: ${row.path}`);if((i+1)%64===0)Bun.gc(true)}
    const fingerprint=(rows:RecordRow[])=>canonical(rows.map(row=>[row.path,row.slug,row.sha256,row.indexed_content_hash??row.page_hash]).sort((a,b)=>a[0]!.localeCompare(b[0]!)));
    const unchangedSnapshot=fingerprint(previous?.records||[])===fingerprint(records);
    const desiredPaths=new Set(records.map(row=>row.path)),desiredSlugs=new Set(records.map(row=>row.slug));
    // An interrupted verification alone does not invalidate verified relations.
    // Imported changes and obsolete managed slugs still require reconciliation.
    noOp=upserts===0&&!pending&&unchangedSnapshot&&previous?.complete===true&&previous?.link_diagnostics_version===LINK_DIAGNOSTICS_VERSION&&
      ![...managed.values()].some(row=>!desiredSlugs.has(row.slug));
    // Build every relation first. A parse/cancellation failure cannot remove any
    // previously good relation or page. Reconciliation below is one official tx.
    const resolver=makeResolver(engine,{mode:'batch',sourceId:'oracle-vault'});
    const byPath=new Map(records.map(row=>[row.path,row.slug])),known=new Set(records.map(row=>row.slug));
    const relations:any[]=[],diagnostics=new LinkDiagnostics(known);let relationBytes=0,relationPages=0;
    Bun.gc(true);
    phase='prepare-relations';save();
    for(const row of noOp?[]:records){
      check();if(++relationPages%25===0)Bun.gc(true);const page=await engine.getPage(row.slug,{sourceId:'oracle-vault'});
      if(!page||page.content_hash!==row.indexed_content_hash)throw Error('Index changed during relation preparation');
      const prepared=prepareLinkContent(page.compiled_truth);diagnostics.externalReferences(row.path,prepared.external);
      const extracted=await extractPageLinks(page.slug,canonicalizeLocalLinks(prepared.content,row.path,byPath),page.frontmatter,page.type,resolver,{globalBasename:false});
      for(const ref of extracted.unresolved)diagnostics.unresolved(row.path,ref.name,ref.field);
      for(const relation of extracted.candidates){
        if(!hasKnownEndpoints(relation,page.slug,known)){diagnostics.unresolved(row.path,relation.targetSlug);continue}
        relations.push({...relation,from:relation.fromSlug||page.slug});
        relationBytes+=Buffer.byteLength(JSON.stringify(relations[relations.length-1]));
        if(relations.length>100_000||relationBytes>64_000_000)throw Error('Explicit relation budget exceeded');
      }
    }
    phase='reconcile';save();check();
    if(!noOp)await engine.transaction(async tx=>{
      const obsolete=[...managed.values()].filter(old=>!desiredSlugs.has(old.slug));
      for(let start=0;start<obsolete.length;start+=200){
        check();const batch=obsolete.slice(start,start+200);
        const resolved=await tx.resolveSlugsByPaths(batch.map(row=>row.path),{sourceId:'oracle-vault'});
        const removable:string[]=[];
        for(const row of batch){
          check();
          if(resolved.get(row.path)===row.slug){
            const page=await tx.getPage(row.slug,{sourceId:'oracle-vault'});
            if(page&&row.indexed_content_hash&&page.content_hash!==row.indexed_content_hash)throw Error('Edited derived row preserved before deletion');
            removable.push(row.slug);continue;
          }
          const page=await tx.getPage(row.slug,{sourceId:'oracle-vault'});
          if(!page)continue;
          // A frontmatter identity change may create a second slug for the SAME
          // path; the official path->slug map returns only one. The prior complete
          // receipt's indexed hash proves the superseded page is still ours.
          if(desiredPaths.has(row.path)&&row.indexed_content_hash&&page.content_hash===row.indexed_content_hash){removable.push(row.slug);continue}
          throw Error(`Derived ownership changed before reconciliation: ${row.path}`);
        }
        const slugs=[...new Set(removable)];
        removed+=(await tx.deletePages(slugs,{sourceId:'oracle-vault'})).length;
      }
      const pages=records.map(row=>({slug:row.slug,source_id:'oracle-vault'}));
      for(let start=0;start<pages.length;start+=300){check();await tx.removeLinksByPagesAndSource(pages.slice(start,start+300),{linkSource:'markdown'});await tx.removeLinksByPagesAndSource(pages.slice(start,start+300),{linkSource:'frontmatter'});await tx.removeLinksByPagesAndSource(pages.slice(start,start+300),{linkSource:'wikilink-resolved'})}
      for(let start=0;start<relations.length;start+=200){
        check();links+=await tx.addLinksBatch(relations.slice(start,start+200).map(link=>({
          from_slug:link.from,to_slug:link.targetSlug,context:link.context,link_type:link.linkType,
          link_source:link.linkSource||'markdown',origin_slug:link.originSlug,origin_field:link.originField,
          from_source_id:'oracle-vault',to_source_id:'oracle-vault',origin_source_id:'oracle-vault'})));
      }
      // Final membership/hash check inside the same transaction prevents a failed
      // snapshot from committing derived deletions. Canonical notes are read only.
      if(JSON.stringify(canonicalFiles(root,deadline))!==JSON.stringify(actual))throw Error('Canonical scope changed before commit');
      for(const row of records){check();if(readCandidate(root,row.path).sha256!==row.sha256)throw Error('Canonical note changed before commit')}
    });
    reconciled=true;
    if(noOp)links=previous?.explicit_links||0;
    const linkDiagnostics=noOp?Object.fromEntries(Object.keys(diagnostics.snapshot()).map(key=>[key,previous[key]])):diagnostics.snapshot();
    const payload={schema_version:2,run_id:run,root,records:records.map(row=>({...row,page_hash:row.indexed_content_hash})),complete:true,at:now(),generation:input.generation??null,
      snapshot_signature:input.snapshot_signature??null,removed_from_derived_index:removed,explicit_links:links,
      ...linkDiagnostics,source:'oracle-vault',excluded_sources:['INBOX/oracle-memory'],changed:upserts,unchanged:records.length-upserts,no_op:noOp};
    const manifest={...payload,receipt_sha256:sha(canonical(payload))};
    // Last complete manifest is immutable until the full tx has committed.
    atomicJSON(manifestPath,manifest);unlinkSync(checkpointPath);if(existsSync(pendingPath))unlinkSync(pendingPath);
    event('gbrain.index_verified',`${records.length} documentos e ${links} relações verificados`);
    return {total:files.length,verified:records.length,complete:true,failures:[],explicit_links:links,...linkDiagnostics,removed_from_derived_index:removed,changed:upserts,unchanged:records.length-upserts,no_op:noOp,receipt_sha256:manifest.receipt_sha256,manifest_file_sha256:sha(readFileSync(manifestPath))};
  }catch(error){
    failurePhase=phase;timeBudgetReached=timeBudgetReached||indexDeadlineError(error);
    if(timeBudgetReached)needsResume=true;
    problem('',error);phase='partial';save();event('gbrain.index_failed','Índice parcial; manifesto completo anterior e notas canônicas preservados');
    return {total:files.length,verified:records.length,upserts,complete:false,failures,needs_resume:needsResume,reconciliation_committed:reconciled,removed_from_derived_index:reconciled?removed:0,
      failure_phase:failurePhase,interrupted_phase:failurePhase,budget_ms:budget,elapsed_ms:Date.now()-started,budget_exhausted:timeBudgetReached,recommended_budget_ms:indexResumeBudget(budget,timeBudgetReached)};
  }
}
