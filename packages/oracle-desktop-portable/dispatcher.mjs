// Capabilities come from the application composition, never from UI claims.
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const fail=(message,code)=>Object.assign(new Error(message),{code});
export function createDispatcher({handlers={},authorize}={}) {
  if(!object(handlers))throw new TypeError('Handlers Oracle inválidos.');
  const operations=new Map(Object.entries(handlers));
  for(const [name,handler] of operations)if(typeof handler!=='function'||!/^[a-zA-Z][a-zA-Z0-9]{0,79}$/.test(name))throw new TypeError('Capacidade Oracle inválida.');
  return {
    methods(){return [...operations.keys()];},
    async dispatch(method,params={},context={}) {
      if(typeof method!=='string'||!/^[a-zA-Z][a-zA-Z0-9]{0,79}$/.test(method)||!object(params))throw fail('Pedido Oracle inválido.','INVALID_REQUEST');
      const handler=operations.get(method);
      if(!handler)throw fail('Esta ação ainda não está disponível nesta instalação do Oracle.','UNSUPPORTED_CAPABILITY');
      if(typeof authorize!=='function')throw fail('O acesso ao Oracle ainda não foi autorizado.','ADMISSION_REQUIRED');
      const request={method,params,signal:context.signal,requestID:context.requestID};
      const work=async()=>{
        if(request.signal?.aborted)throw fail('Operação cancelada. Confira o estado antes de repetir.','CANCELLED');
        const value=await handler(params,request);
        if(request.signal?.aborted)throw fail('Operação cancelada. Confira o estado antes de repetir.','CANCELLED');
        return value;
      };
      // Authorization wraps the work so revocation/expiry can be checked again
      // before returning data and by mutating services before their commit.
      return authorize(request,work);
    }
  };
}

export function createVaultHandlers(vaultService) {
  if(!vaultService)throw new TypeError('Serviço do vault ausente.');
  const document=note=>({path:note.path,hash:note.revision,text:note.content,editable:true});
  return {
    chooseVault:()=>vaultService.selectVault(),
    revoke:()=>vaultService.revoke(),
    read:async p=>{
      const note=await vaultService.readNote(p.path);
      const draft=await vaultService.reopenDraft(p.path);
      return {...document(note),...(draft?{draft:{path:draft.path,vault:draft.vault,originalHash:draft.expectedRevision,text:draft.content,updatedAt:draft.updatedAt}}:{})};
    },
    saveNote:async p=>{
      const result=await vaultService.saveNote({path:p.path,expectedRevision:p.hash,content:p.text});
      if(result.status==='saved')return {...result,document:document(result.document)};
      if(result.status==='conflict')return {...result,current:document(result.current)};
      throw fail('A gravação ainda não foi confirmada.','UNCONFIRMED_WRITE');
    },
    saveDraft:async p=>{
      const draft=await vaultService.saveDraft({path:p.path,expectedRevision:p.hash,content:p.text});
      return {saved:true,path:draft.path,originalHash:draft.expectedRevision};
    },
    ...(typeof vaultService.discardDraft==='function'?{discardDraft:p=>vaultService.discardDraft(p.path)}:{})
  };
}
