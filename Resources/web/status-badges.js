/* Presentation only: status colors never establish or change a connection. */
(function(){
  const groups={
    positive:['connected','conectado','conectada','active','ativo','ativa','current','updated','completed','complete','success','ready','em_dia','atualizado','concluido','pronto'],
    negative:['disconnected','desconectado','desconectada','missing','absent','ausente','unavailable','indisponivel','error','failed','failure','erro','falha'],
    inactive:['inactive','inativo','inativa','disabled','desativado','desativada','not_started','not_adopted','not_configured','cancelled','canceled'],
    paused:['paused','pausado','pausada','interrupted','interrompido','cancelling','cancelando','suspended','suspenso'],
    pending:['pending','pendente','waiting','aguardando','needs_auth','authorizing','awaiting_approval','awaiting_identity','compatibility_required','publication_pending','recovery_required','unverified','not_checked','nao_verificado','conexao_nao_verificada'],
    info:['installed','instalado','configured','available','install_available','download_available','disponivel','external','starting','running','em_execucao','preserved_edits','rolled_back','selected','recent_activity']
  };
  const tones=Object.create(null);
  for(const [tone,states] of Object.entries(groups))for(const state of states)tones[state]=tone;
  const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,'_');
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tone=state=>tones[normalize(state)]||'inactive';
  function render(state,label){return `<span class="pill status-badge" data-status="${escape(normalize(state))}" data-tone="${tone(state)}">${escape(label)}</span>`}
  function apply(element,state,label){if(!element)return;element.classList.add('pill','status-badge');element.dataset.status=normalize(state);element.dataset.tone=tone(state);element.textContent=label}
  window.OracleStatusBadge=Object.freeze({render,apply,tone});
})();
