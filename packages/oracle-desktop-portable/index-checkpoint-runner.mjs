/** Resume only the backend's explicit bounded checkpoints. No source download,
 * budget enlargement, partial deletion reconciliation or inferred completion.
 * 256 passes is finite and conservatively supports 128k notes at the official
 * default 500 upserts; a larger vault remains explicitly partial. */
export async function runIndexCheckpoints({knowledge,check,signal,maxPasses=256}={}){
 if(typeof knowledge?.refresh!=='function'||typeof check!=='function'||!Number.isSafeInteger(maxPasses)||maxPasses<1||maxPasses>256)throw new TypeError('Invalid checkpoint composition');
 let previous=-1,total=null,last;
 const partial=(result,reason,passes)=>({...result,complete:false,state:'partial',checkpointContinuation:{passes,limit:maxPasses,stopped:reason}});
 for(let passes=1;passes<=maxPasses;passes++){
  check();if(signal?.aborted)throw Object.assign(new Error('onboarding_cancelled'),{code:'onboarding_cancelled'});
  last=await knowledge.refresh({signal});check();if(signal?.aborted)throw Object.assign(new Error('onboarding_cancelled'),{code:'onboarding_cancelled'});
  if(last.complete===true&&last.state==='current')return {...last,checkpointContinuation:{passes,limit:maxPasses,stopped:'current'}};
  const progress=last.index;
  if(progress?.needs_resume!==true||!Number.isSafeInteger(progress.total)||!Number.isSafeInteger(progress.verified)||progress.total<0||progress.verified<0||progress.verified>progress.total)return partial(last,'backend_not_resumable',passes);
  if(total!==null&&progress.total!==total)return partial(last,'source_changed',passes);
  total=progress.total;if(progress.verified<=previous)return partial(last,'no_progress',passes);previous=progress.verified;
 }
 return partial(last,'pass_limit',maxPasses);
}
