(function(){
 'use strict';
 let current=null,timer=null,automaticTimer=null,generation=0,api=null,lastAutomatic=0,automaticBusy=false,noticeShown=false,renderKey='',lastReceipt='';
 const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const phases={idle:'Pronto para consultar',checking:'Consultando as versões disponíveis…',checked:'Consulta concluída',preparing:'Preparando atualização…',downloading:'Baixando o acervo assinado…',installing:'Atualizando arquivos do acervo…',indexing:'Conferindo o índice completo…',registering:'Registrando as skills no Codex…',complete:'Atualização concluída',paused:'Atualização pausada',failed:'A atualização precisa de atenção','restart-required':'Reabra o plugin para usar a versão nova','registration-required':'Configure o canal público no gerenciador de plugins'};
 function card(title,status,kind){
  const latest=kind==='skills'?status?.latestReleaseID:status?.latestVersion,installed=kind==='skills'?status?.currentReleaseID:status?.currentVersion;
  const state=status?.error?'error':status?.available?'available':status?'current':'unknown';
  const label=status?.error?'Verificação interrompida':status?.available?'Atualização disponível':status?'Atualizado':'Não verificado';
  const text=status?.error?escape(status.error):status?`${escape(installed||'Versão atual')}${latest&&latest!==installed?' → '+escape(latest):''}`:'Use Verificar para consultar esta fonte.';
  return `<section class="update-result update-card ${status?.available?'update-success':status?.error?'update-failure':''}" data-update-channel="${kind}"><div>${api.icon?.(kind==='skills'?'folder':'refresh')||''}<h2>${title}</h2>${api.statusBadge?.(state,label)||''}</div><p>${text}</p>${status?.available?`<div data-portable-update-metal data-oracle-update="${kind}"></div>`:''}</section>`;
 }
 function render(){
  const root=document.querySelector('#portable-update-body');if(!root||!api)return;
  // Polling timestamps are not visual changes. Preserve hovered/focused controls.
  const key=JSON.stringify([current?.requestID,current?.phase,current?.running,current?.operation,current?.done,current?.total,current?.error,card('Acervo de skills',current?.skills,'skills'),card('ORACLE completo',current?.oracle,'oracle'),current?.receipt]);if(key===renderKey)return;renderKey=key;
  const receipt=current?.receipt,error=current?.error,installing=current?.running&&current.operation!=='check';
  const dialog=document.querySelector('#modal');dialog.dataset.family=installing?'update-installing':'updates';
  let beam=dialog.querySelector(':scope > .update-modal-beam');if(installing&&!beam){beam=document.createElement('div');beam.className='ob2-beam update-modal-beam';beam.setAttribute('aria-hidden','true');dialog.prepend(beam);api.mountBeam?.(beam);}else if(!installing&&beam){window.OracleOnboardingEffects?.destroy(beam);beam.remove();}
  if(!current?.running&&current?.requestID){const receiptKey=JSON.stringify([current.requestID,current.phase]);if(receiptKey!==lastReceipt){lastReceipt=receiptKey;if(current.phase==='complete')api.toast(current.operation==='check'?'Consulta de atualizações concluída.':receipt?.message||'Atualização concluída.',current.operation==='check'?'info':'success');else if(current.phase==='paused')api.toast('Atualização pausada.');else if(current.phase==='failed')api.toast(error?.message||'A atualização precisa de atenção.','error');}}
  root.querySelectorAll('[data-portable-update-metal]').forEach(host=>window.OracleOnboardingEffects?.destroy(host));
  root.innerHTML=`<div class="update-status" role="status" aria-live="polite"><div class="ob2-status-body"><span class="${error?'update-error':current?.skills?.available||current?.oracle?.available?'update-ready-badge':''}">${escape(phases[current?.phase]||phases.idle)}${Number.isFinite(current?.done)?` ${current.done}/${current.total}`:''}</span><progress aria-label="Progresso da atualização" ${current?.running?'':'hidden'} ${current?.total>0?`max="${current.total}" value="${current.done||0}"`:''}></progress></div></div>${error?`<p class="update-error">${escape(error.message)}</p>`:''}${installing?'':`<div class="update-results">${card('Acervo de skills',current?.skills,'skills')}${card('ORACLE completo',current?.oracle,'oracle')}</div>`}${receipt?.conflicts?`<p>${receipt.conflicts} arquivos editados foram preservados. As versões recebidas estão na pasta de recuperação.</p>`:''}${receipt?.message?`<p>${escape(receipt.message)}</p>`:''}${receipt?.registrationRequired?'<button class="secondary" id="portable-open-channel">Abrir canal público</button>':''}${receipt?.recoveryPath?'<button class="secondary" id="portable-copy-recovery">Copiar caminho de recuperação</button>':''}`;
  root.querySelectorAll('[data-oracle-update]').forEach(host=>{api.mountMetal?.(host,host.dataset.oracleUpdate==='skills'?'Atualizar skills':'Atualizar ORACLE',()=>start(host.dataset.oracleUpdate));const button=host.querySelector('button');if(button)button.disabled=!!current?.running;});
  const check=document.querySelector('#portable-update-check'),pause=document.querySelector('#portable-update-pause');check.disabled=!!current?.running;check.onclick=()=>start('check');pause.hidden=!current?.running;
  pause.onclick=async()=>{try{current=await api.call('portableUpdateCancel',{requestID:current.requestID});render();if(current.phase!=='paused')api.toast('Pedido de pausa recebido. Confira o estado da atualização.');}catch(error){api.toast(error.message,'error');}};
  root.querySelector('#portable-open-channel')?.addEventListener('click',()=>api.call('openExternal',{url:receipt.url}).catch(error=>api.toast(error.message,'error')));
  root.querySelector('#portable-copy-recovery')?.addEventListener('click',()=>api.call('copy',{text:receipt.recoveryPath},'recovery').catch(error=>api.toast(error.message,'error')));
 }
 async function poll(expected){
  clearTimeout(timer);if(expected!==generation||!api)return;
  try{current=await api.call('portableUpdateStatus',current?.requestID?{requestID:current.requestID}:{});if(expected!==generation)return;render();if(current.running)timer=setTimeout(()=>poll(expected),750);else if(current.phase==='complete'&&current.operation==='skills')await api.refresh();}
  catch(error){if(expected===generation){api.toast(error.message,'error');timer=setTimeout(()=>poll(expected),1500);}}
 }
 async function start(operation){
  if(current?.running)return;const requestID=crypto.randomUUID().replaceAll('-','_'),expected=generation;current={...current,requestID,operation,running:true,phase:operation==='check'?'checking':'preparing',error:null};render();
  try{const response=await api.call('portableUpdateRequest',{requestID,operation});if(expected!==generation)return;current=response;render();}
  catch(error){if(expected!==generation)return;api.toast(error.message,'error');}
  // Read this request after a lost acknowledgement; never blindly resend it.
  void poll(expected);
 }
 async function open(context){
  api=context;generation++;renderKey='';const expected=generation;
  if(!api.modal('<h1>Atualizações</h1><p>As skills são atualizadas no seu Obsidian e disponibilizadas no Codex para uso nos seus projetos. A atualização completa do ORACLE inclui a interface e os componentes do sistema. A consulta é automática; você escolhe quando instalar.</p><div id="portable-update-body"></div>'+api.actions('<button class="update-check-text" id="portable-update-check">Verificar</button><button class="secondary" id="portable-update-pause" hidden>Pausar</button>'),{family:'updates',root:true}))return;
  render();await poll(expected);if(!current?.running&&(!current?.skills||!current?.oracle))await start('check');
 }
 async function automatic(context){
  if(automaticBusy||current?.running||Date.now()-lastAutomatic<3600000)return;automaticBusy=true;lastAutomatic=Date.now();const expected=generation;
  try{const status=await context.call('portableUpdateStatus',{});if(status.running)return;
   const requestID=crypto.randomUUID().replaceAll('-','_');await context.call('portableUpdateRequest',{requestID,operation:'check'});
   let result;for(let attempt=0;attempt<80&&expected===generation;attempt++){await new Promise(resolve=>setTimeout(resolve,750));result=await context.call('portableUpdateStatus',{requestID});if(!result.running)break;}
   if(expected!==generation||!result||result.running)return;current=result;
   if(!noticeShown&&(result.skills?.available||result.oracle?.available)){noticeShown=true;context.toast('Há uma atualização disponível. Abra Atualizações para escolher quando instalar.');}render();
  }catch{/* Unavailable/offline feeds remain visible on the explicit Updates action. */}finally{automaticBusy=false;clearTimeout(automaticTimer);if(expected===generation)automaticTimer=setTimeout(()=>automatic(context),3600000);}
 }
 function reset(){generation++;clearTimeout(timer);clearTimeout(automaticTimer);api=null;current=null;lastAutomatic=0;noticeShown=false;renderKey='';lastReceipt='';}
 window.OraclePortableUpdates=Object.freeze({open,automatic,reset});
})();
