// An admitted installation outlives its short UI request. Explicit cancellation,
// scope revocation and service shutdown own the cancellation of its signal.
export function createInstallationOperation(){
 let current=null;
 const snapshot=()=>current?{running:current.running,cancelled:current.controller.signal.aborted,error:current.error}:null;
 const assertIdle=()=>{if(current?.running)throw Object.assign(new Error('A instalação já está em andamento. Aguarde ou pause antes de tentar novamente.'),{code:'onboarding_busy'});};
 return Object.freeze({snapshot,assertIdle,
  start(work,{check,signal}={}){
   assertIdle();if(signal?.aborted)throw Object.assign(new Error('Operação cancelada.'),{code:'operation_cancelled'});check?.();
   const operation={running:true,controller:new AbortController(),error:null};current=operation;
   const assertCurrent=()=>{if(operation.controller.signal.aborted)throw Object.assign(new Error('Instalação pausada.'),{code:'onboarding_cancelled'});check?.();};
   operation.task=Promise.resolve().then(()=>{assertCurrent();return work({signal:operation.controller.signal,check:assertCurrent});}).catch(error=>{
    operation.error={code:String(error?.code||'installation_failed'),message:String(error?.message||'Não foi possível concluir a instalação.')};
   }).finally(()=>{operation.running=false;});
   return snapshot();
  },
  cancel(){current?.controller.abort();return snapshot();},
  async settled(){await current?.task;return snapshot();}
 });
}
