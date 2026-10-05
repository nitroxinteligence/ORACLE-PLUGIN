/** Retries need a finite larger window for full-snapshot ownership checks and
 * atomic graph reconciliation. The caller must pass this next budget and size
 * its process timeout accordingly; a running request never extends its deadline.
 */
export const MAX_INDEX_BUDGET_MS=480_000;
export function indexBudget(value:unknown):number {
  const requested=Number(value);
  return Math.min(MAX_INDEX_BUDGET_MS,Math.max(100,Number.isFinite(requested)&&requested!==0?requested:25_000));
}
export function indexResumeBudget(current:number,timeBudgetReached:boolean):number {
  const budget=indexBudget(current);
  return timeBudgetReached?Math.min(MAX_INDEX_BUDGET_MS,Math.max(120_000,budget*2)):budget;
}
export function indexDeadlineError(error:unknown):boolean {
  const message=error instanceof Error?error.message:String(error);
  return message==='Bounded indexing budget reached; resume from checkpoint'||message==='Snapshot verification deadline exceeded';
}
