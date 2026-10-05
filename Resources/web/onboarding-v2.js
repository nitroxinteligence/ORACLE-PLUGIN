/* V2 visual controller. The host supplies the native bridge; only receipts advance installation. */
(function () {
  'use strict';
  let api, root, screen, activation, progress, current={}, stage='', timer, generation=0, pending=false, busy=false;
  const dismissedIntegrations=new Set();
  const integrationKey=()=>JSON.stringify([current.runID,current.vaultPath]);
  let progressRun='',progressValue=0,openedRun='',integrationMessage='',repairing=false;
  let integration={enabled:true,autoCapture:false,remoteProcessing:false,hour:15,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone};
  const needsRecovery=value=>value.licensed&&!['starting','running','cancelling','completed'].includes(value.status)&&(value.libraryRootChoices?.length||value.distributionConflicts?.length);
  const motionHandles=new Set();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const logo=()=>'<span class="ob2-logo metallic-lockup" role="img" aria-label="Oracle"><img class="metallic-symbol" src="brand/oracle-planet-chrome-v1.png" alt=""><img class="metallic-wordmark" src="brand/lockup-white.svg" alt=""></span>';
  const folder='<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path class="ob2-folder-back" d="M10 19a5 5 0 0 1 5-5h13l6 7h15a5 5 0 0 1 5 5v22H10Z"/><path class="ob2-folder-front" d="M8 29h48l-5 21H13Z"/></svg>';
  const effects=()=>window.OracleOnboardingEffects;
  const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches||document.body.classList.contains('reduced');
  function clean(container){container?.querySelectorAll('[data-ob2-effect]').forEach(el=>effects()?.destroy(el));}
  function errorToast(error){api?.toast?.(error?.message||String(error),'error');}
  async function invoke(method,params={}){const epoch=generation;const value=await api.call(method,params);if(epoch!==generation)throw Error('Operação encerrada.');return value;}
  function ensure(){
    if(root)return;
    root=document.createElement('section');root.className='oracle-onboarding-v2';
    root.innerHTML='<dialog class="ob2-screen" aria-label="Configuração do Oracle"><div class="ob2-space" aria-hidden="true"><div class="ob2-stars"></div><div class="ob2-orbits"></div></div><main class="ob2-content"></main></dialog><dialog class="ob2-activation" tabindex="-1" aria-labelledby="ob2-activating-title"><div class="ob2-beam" data-ob2-effect></div><div class="ob2-status-body"><h2 id="ob2-activating-title">Ativando…</h2><progress aria-label="Ativando acesso"></progress></div></dialog><aside class="ob2-installation" aria-label="Progresso da instalação" hidden><div class="ob2-beam" data-ob2-effect></div><div class="ob2-status-body"><strong>Instalando seu segundo cérebro…</strong><progress aria-label="Instalação do Second Brain"></progress><p class="ob2-install-error" hidden></p><div class="ob2-retry" data-ob2-effect hidden></div><div class="ob2-codex-actions" hidden><div data-open-codex></div><div data-copy-codex></div><div data-verify-codex></div><div data-dismiss-integration></div></div></div></aside>';
    document.body.append(root);screen=root.querySelector('.ob2-screen');activation=root.querySelector('.ob2-activation');progress=root.querySelector('.ob2-installation');
    screen.addEventListener('cancel',e=>e.preventDefault());activation.addEventListener('cancel',e=>e.preventDefault());
    // Fixed, deterministic star positions; no random rerender or animation loop.
    const stars=root.querySelector('.ob2-stars');
    for(let i=0;i<135;i++){const dot=document.createElement('i');dot.style.left=((i*37.17+11)%100)+'%';dot.style.top=((i*61.73+7)%100)+'%';dot.style.opacity=String(.12+(i%5)*.055);stars.append(dot);}
  }
  async function run(fn){if(busy)return;busy=true;try{await fn();}catch(error){errorToast(error);try{const value=await invoke('onboardingStatus');if(needsRecovery(value))await api.openRecovery?.();}catch{}}finally{busy=false;}}
  function metal(host,label,onClick,disabled=false){effects().button(host,{label,onClick:()=>run(onClick),disabled});}
  function plain(host,label,onClick){const button=document.createElement('button');button.type='button';button.className='ob2-small-button';button.textContent=label;button.onclick=()=>run(onClick);host.replaceChildren(button);}
  function closeScreen(){const wasOpen=screen.open;clean(screen);screen.close();document.body.classList.remove('ob2-configuring');if(wasOpen)window.dispatchEvent(new Event('oracle:app-enter'));}
  const destination=value=>value?.licensed&&value.hasVault&&typeof value.vaultName==='string'&&value.vaultName.trim()&&typeof value.vaultPath==='string'&&value.vaultPath.trim()&&typeof value.vaultSelectionRevision==='string'&&value.vaultSelectionRevision?JSON.stringify([value.vaultName,value.vaultPath,value.vaultSelectionRevision]):null;
  function updateDestination(){
    const host=screen.querySelector('.ob2-destination');if(!host)return;
    host.querySelector('strong').textContent=current.vaultName||'Escolha seu vault';host.querySelector('span').textContent=current.vaultPath||'';
  }
  function show(next){
    ensure();if(next==='install'&&!destination(current))next='vault';stage=next;
    if(next==='progress'||next==='completed'){closeScreen();updateProgress();return;}
    const content=screen.querySelector('.ob2-content');clean(content);
    document.body.classList.add('ob2-configuring');
    if(next==='license'){
      content.innerHTML=logo()+'<h1 class="ob2-intro">Ative o universo do Oracle<br>com sua chave de acesso</h1><form class="ob2-key-form"><label class="ob2-sr-only" for="ob2-key">Chave de acesso</label><input id="ob2-key" type="password" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="***" aria-describedby="ob2-key-error"><p id="ob2-key-error" class="ob2-sr-only" role="alert"></p><div class="ob2-action" data-ob2-effect></div></form>';
      const input=content.querySelector('input');
      input.oninput=()=>{input.removeAttribute('aria-invalid');input.classList.remove('ob2-shake');content.querySelector('#ob2-key-error').textContent='';};
      const activate=async()=>{
        if(!input.value.trim()){invalidKey(input,'Informe sua chave de acesso.');return;}
        const epoch=generation;input.disabled=true;activation.classList.remove('ob2-closing');activation.showModal();effects().beam(activation.querySelector('.ob2-beam'));void animate(activation,[{opacity:0,transform:'scale(.98)'},{opacity:1,transform:'scale(1)'}],240);
        try{
          await invoke('onboardingActivate',{code:input.value.trim()});
          current=await invoke('onboardingStatus');
          if(!current.licensed)throw Error('Não foi possível validar esta chave de acesso.');
          input.value='';if(current.resumeExisting){await closeActivation();show('completed');await api.refresh?.();}else if(current.runID){await closeActivation();show(current.status==='completed'?'completed':'progress');await api.refresh?.();}else{await navigate('vault');await closeActivation();}
        }catch(error){if(epoch===generation){await closeActivation();input.disabled=false;invalidKey(input,error.message);}}
        finally{if(input.isConnected)input.disabled=false;}
      };
      content.querySelector('form').onsubmit=e=>{e.preventDefault();run(activate);};metal(content.querySelector('.ob2-action'),'Ativar',activate);
    }else if(next==='vault'){
      content.innerHTML=logo()+'<h1>Escolha seu Obsidian.</h1><p class="ob2-description"><span>Selecione o vault que você já criou no Obsidian.</span><span>Todo o Second Brain será instalado neste vault.</span></p><div class="ob2-vault-selection"></div><div class="ob2-action" data-ob2-effect></div>';
      updateVaultSelection();
    }else if(next==='install'){
      const portable=Array.isArray(current.integrationActions);
      content.innerHTML=logo()+`<h1>Instale seu segundo cérebro.</h1><p class="ob2-destination">Destino: <strong>${esc(current.vaultName)}</strong><span>${esc(current.vaultPath||'')}</span></p><div class="ob2-integration">${portable?`<div class="ob2-setting"><label for="ob-official-hooks"><input id="ob-official-hooks" type="checkbox" ${integration.installOfficialHooks?'checked':''}><span>Instalar hooks oficiais do AI Memory no espaço Oracle e na configuração do usuário do Codex</span></label></div><p>Após sua autorização no Codex, os hooks do usuário podem guardar mensagens e eventos de ferramentas em todos os projetos, conforme as exclusões do AI Memory. O instalador preserva a configuração existente. A captura usa o serviço AI Memory configurado no computador.</p>`:''}<p>As memórias deste segundo cérebro serão mantidas automaticamente em arquivos no vault escolhido. Guardar conversas e enviar mensagens ao Codex dependem das opções abaixo.</p><div class="ob2-setting"><label for="ob-daily"><input id="ob-daily" type="checkbox" ${integration.enabled?'checked':''}><span>Manutenção diária no Codex</span></label><div class="ob2-time"><label for="ob-daily-hour">Horário</label><select id="ob-daily-hour" aria-label="Horário da manutenção">${Array.from({length:24},(_,h)=>`<option value="${h}" ${h===integration.hour?'selected':''}>${String(h).padStart(2,'0')}:00</option>`).join('')}</select></div></div><div class="ob2-setting"><label for="ob-capture"><input id="ob-capture" type="checkbox" ${integration.autoCapture?'checked':''}><span>Guardar mensagens no espaço Oracle do Codex</span></label></div><div class="ob2-setting"><label for="ob-synthesis"><input id="ob-synthesis" type="checkbox" ${integration.remoteProcessing?'checked':''}><span>Enviar essas mensagens ao Codex para consolidar a wiki</span></label></div><p>A manutenção cria índices com links para organizar o Graph do Obsidian, sem alterar suas notas. GPT-6.1 Sol · esforço médio. Após a instalação local, conclua a autorização dos hooks e o registro da manutenção no Codex. O Mac precisa estar acordado no horário.</p></div><div class="ob2-action" data-ob2-effect></div>`;
      const readIntegration=()=>{const find=id=>content.querySelector('#'+id);integration={...integration,...(portable?{installOfficialHooks:find('ob-official-hooks').checked}:{}),enabled:find('ob-daily').checked,hour:Number(find('ob-daily-hour').value),autoCapture:find('ob-daily').checked&&find('ob-capture').checked,remoteProcessing:find('ob-daily').checked&&find('ob-capture').checked&&find('ob-synthesis').checked};find('ob-capture').disabled=!integration.enabled;find('ob-daily-hour').disabled=!integration.enabled;find('ob-synthesis').disabled=!integration.autoCapture;if(!integration.autoCapture)find('ob-synthesis').checked=false;};
      for(const id of [...(portable?['ob-official-hooks']:[]),'ob-daily','ob-daily-hour','ob-capture','ob-synthesis'])content.querySelector('#'+id).onchange=readIntegration;readIntegration();
      metal(content.querySelector('.ob2-action'),'Instalar',async()=>{
        readIntegration();const reviewedDestination=destination(current),button=content.querySelector('.ob2-action button');button.disabled=true;
        try{
          current=await invoke('onboardingStatus');
          if(!destination(current)){show('vault');throw Error('Escolha o vault que receberá suas memórias antes de instalar.');}
          if(destination(current)!==reviewedDestination){updateDestination();throw Error('O destino mudou. Confira o vault exibido e clique Instalar novamente.');}
          await invoke('onboardingInstallMemoryOnly',{localMemoryPortability:{schemaVersion:1,acknowledgment:'oracle_local_memory_portability_v1',vaultSelectionRevision:current.vaultSelectionRevision},maintenance:{...integration,graphIndexes:integration.enabled,consolidateWiki:integration.remoteProcessing,captureSource:integration.autoCapture?'codex_workspace_hooks_v1':null,synthesisScope:integration.remoteProcessing?'captured_messages_codex_v1':null}});current=await invoke('onboardingStatus');await api.refresh?.();document.body.classList.remove('ob2-configuring');const exit=await animate(screen,[{opacity:1},{opacity:0}],460,true);closeScreen();release(exit);stage='progress';updateProgress();}
        finally{if(button.isConnected)button.disabled=false;}
      });
    }
    if(!screen.open)screen.showModal();
    if(!content.dataset.transitioning)void animate(content,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],320);
    const target=content.querySelector('input,button');if(!activation.open)target?.focus({preventScroll:true});updateProgress();
  }
  function invalidKey(input,text){
    input.setAttribute('aria-invalid','true');input.classList.remove('ob2-shake');void input.offsetWidth;if(!reduced())input.classList.add('ob2-shake');
    const message=screen.querySelector('#ob2-key-error');if(message)message.textContent=text;
    errorToast(Error(text));input.focus({preventScroll:true});
  }
  function release(animation){animation?.cancel();motionHandles.delete(animation);}
  async function animate(element,frames,duration=240,hold=false){
    if(reduced()||!element?.isConnected)return null;
    const animation=element.animate(frames,{duration,easing:'cubic-bezier(.22,.7,.2,1)',fill:'both'});motionHandles.add(animation);
    try{await animation.finished;}catch{}finally{if(!hold)release(animation);}
    return animation;
  }
  async function transitionTo(next){
    const epoch=generation,content=screen.querySelector('.ob2-content');content.dataset.transitioning='true';content.inert=true;
    const exit=await animate(content,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-6px)'}],180,true);
    if(epoch!==generation){release(exit);return;}
    show(next);
    // Keep the outgoing content invisible until the replacement and effects have painted.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(epoch!==generation){release(exit);return;}
    const entrance=animate(content,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],320);
    release(exit);await entrance;content.inert=false;delete content.dataset.transitioning;content.querySelector('input,button')?.focus({preventScroll:true});
  }
  async function closeActivation(){
    activation.classList.add('ob2-closing');const exit=await animate(activation,[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.98)'}],180,true);
    activation.close();clean(activation);release(exit);
  }
  async function navigate(next){await invoke('onboardingDraftUI',{step:next});await transitionTo(next);}
  function updateVaultSelection(){
    const host=screen.querySelector('.ob2-vault-selection'),action=screen.querySelector('.ob2-action');if(!host)return;
    clean(host);
    if(current.hasVault){
      host.innerHTML='<div class="ob2-selected-vault">'+folder+'<div><strong>'+esc(current.vaultName)+'</strong><span>'+esc(current.vaultPath||current.vaultName)+'</span></div><button type="button" class="ob2-change-vault icon-button" aria-label="Trocar pasta" title="Trocar pasta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4"/></svg></button></div>';
      host.querySelector('.ob2-change-vault').onclick=()=>run(async()=>{const selected=await invoke('onboardingChooseVault');if(selected){current=await invoke('onboardingStatus');updateVaultSelection();}});
    }else{
      host.innerHTML='<div class="ob2-vault">'+folder+'<span class="ob2-vault-name">Escolha o vault que receberá os arquivos</span><div class="ob2-vault-action" data-ob2-effect></div></div>';
      metal(host.querySelector('[data-ob2-effect]'),'Escolher pasta',async()=>{const selected=await invoke('onboardingChooseVault');if(selected){current=await invoke('onboardingStatus');updateVaultSelection();}});
    }
    metal(action,'Prosseguir',()=>navigate('install'),!current.hasVault);
  }
  function positionProgress(){
    if(!progress||progress.hidden)return;
    const logo=document.querySelector('#app .wordmark')?.getBoundingClientRect(),tabs=document.querySelector('.workspace-tabs')?.getBoundingClientRect();
    const left=logo?logo.right+24:24,right=tabs?tabs.left-24:innerWidth-24,room=right-left;
    const fitHeight=()=>{progress.style.maxHeight=Math.max(120,innerHeight-parseFloat(progress.style.top||'88')-12)+'px';};
    if(progress.classList.contains('ob2-integrating')){progress.classList.remove('ob2-in-header');progress.style.left=room>=500?(left+right)/2+'px':'50%';progress.style.width=room>=500?Math.min(560,room)+'px':'min(560px,calc(100vw - 40px))';progress.style.top=room>=500?'12px':Math.max(88,(tabs?.bottom||logo?.bottom||64)+12)+'px';fitHeight();return;}
    if(room>=270){progress.style.left=(left+right)/2+'px';progress.style.width=Math.min(380,room)+'px';progress.classList.add('ob2-in-header');progress.style.top=Math.max(12,(logo?(logo.top+logo.bottom)/2:48)-progress.offsetHeight/2)+'px';}
    else{progress.style.left='50%';progress.style.top='88px';progress.style.width='min(380px,calc(100vw - 40px))';progress.classList.remove('ob2-in-header');}
    fitHeight();
  }
  function updateProgress(){
    if(!progress)return;
    const repair=current.status==='completed'&&current.bridgeNeedsReprepare===true;
    const integrating=(current.status==='completed'||current.installationCompleted===true)&&(current.integrationPending===true||repair);
    const portableIntegration=integrating&&Array.isArray(current.integrationActions);
    const installing=repair||!!current.runID&&(current.status!=='completed'||integrating)&&!current.resumeExisting;
    const visible=installing&&!screen.open&&!(portableIntegration&&!repair&&(!current.integrationActions.length||dismissedIntegrations.has(integrationKey())));
    if(!visible){progress.hidden=true;clean(progress);return;}
    const wasHidden=progress.hidden;progress.hidden=false;progress.classList.toggle('ob2-integrating',integrating);
    positionProgress();if(wasHidden){effects().beam(progress.querySelector('.ob2-beam'));void animate(progress,[{opacity:0},{opacity:1}],300);}
    const bar=progress.querySelector('progress'),data=current.installationProgress||{};
    if(progressRun!==current.runID){progressRun=current.runID;progressValue=0;}
    const phases={hydrating:[0,5,'Baixando notas do iCloud'],preparing:[5,10,'Conferindo o vault e o acervo'],downloading:[10,25,'Baixando componentes'],memory:[25,30,'Criando a memória local'],installing:[30,70,'Instalando acervo e recursos'],indexing:[70,90,'Indexando notas e links'],codex:[90,95,'Instalando a integração com o Codex'],verifying:[95,99,'Verificando a instalação'],ready:[99,100,'Instalação local verificada']};
    const phase=phases[current.phase]||phases.preparing;
    let done=Number(data.completed),total=Number(data.total),unit='arquivos';
    if(current.phase==='downloading'){done=Number(data.bytes_downloaded);total=Number(data.bytes_total);unit='bytes';}
    const counted=data.phase===current.phase&&total>0&&Number.isFinite(done);
    const fraction=counted?Math.max(0,Math.min(1,done/total)):0;
    progressValue=Math.max(progressValue,phase[0]+(phase[1]-phase[0])*fraction);
    if(current.installationCompleted===true)progressValue=100;
    bar.max=100;bar.value=progressValue;
    bar.setAttribute('aria-valuetext',phase[2]+(counted?`: ${done} de ${total} ${unit}`:''));
    const actions=progress.querySelector('.ob2-codex-actions');actions.hidden=!integrating;
    const actionMode=repair?'repair':portableIntegration?'portable':'codex';
    if(actions.dataset.mode!==actionMode){for(const host of actions.children)host.replaceChildren();actions.dataset.mode=actionMode;if(!repairing)integrationMessage='';}
    progress.querySelector('strong').textContent=repair?'Atualize a integração local':portableIntegration?'Integração opcional com o Codex':integrating?'Conclua a integração no Codex':phase[2]+(counted&&unit==='arquivos'?` · ${done}/${total}`:'…');
    const failed=['failed','interrupted','paused','cancelled'].includes(current.status);
    const error=progress.querySelector('.ob2-install-error');error.hidden=!failed&&!integrating;
    error.textContent=repair?(integrationMessage||current.bridgeRepairMessage||'O Oracle foi atualizado. Atualize a ligação local com o Codex para continuar.'):integrating?integrationMessage||current.integrationMessage||'Instalação local concluída. Abra o Codex com o roteiro pronto. Revise os hooks e envie a mensagem para registrar a manutenção. Depois clique em Verificar.':failed?(current.message||'Não foi possível concluir a instalação.'):'';
    if(repair&&current.localMemoryPortabilityUpdateNeeded===true)error.textContent+=` Ao atualizar, você autoriza salvar também as memórias deste segundo cérebro no vault ${current.vaultName||'selecionado'} (${current.vaultPath||''}). Captura de conversas, processamento remoto e backup mantêm suas escolhas atuais.`;
    error.classList.toggle('ob2-pending',integrating);
    const retry=progress.querySelector('.ob2-retry');retry.hidden=!failed||integrating;
    if(failed&&!integrating&&!retry.querySelector('button'))metal(retry,'Tentar novamente',async()=>{await invoke('onboardingResume');await poll();});
    if(repair&&!actions.querySelector('button')){
      plain(actions.querySelector('[data-open-codex]'),'Atualizar integração local',async()=>{
        const epoch=generation;repairing=true;openedRun=current.runID;integrationMessage='';updateProgress();
        const params=current.localMemoryPortabilityUpdateNeeded===true?{localMemoryPortability:{schemaVersion:1,acknowledgment:'oracle_local_memory_portability_v1',vaultSelectionRevision:current.vaultSelectionRevision}}:{};
        try{current=await invoke('onboardingReprepareIntegration',params);integrationMessage=current.bridgeRepairMessage||'';updateProgress();api.toast?.(integrationMessage||'Integração local atualizada.');await api.refresh?.();}
        catch(error){
          if(epoch!==generation)return;
          try{current=await invoke('onboardingStatus');}catch{}
          integrationMessage=error.message||'Não foi possível atualizar a integração local.';updateProgress();throw error;
        }finally{if(epoch===generation){repairing=false;updateProgress();}}
      });
    }
    if(repair){const button=actions.querySelector('[data-open-codex] button');if(button){button.disabled=repairing;button.textContent=repairing?'Atualizando…':'Atualizar integração local';}}
    if(portableIntegration&&!repair&&!actions.querySelector('button')){
      plain(actions.querySelector('[data-dismiss-integration]'),'Continuar no Oracle',()=>{dismissedIntegrations.add(integrationKey());updateProgress();});
      if(current.integrationActions.includes('connect'))plain(actions.querySelector('[data-open-codex]'),'Conectar ao Codex',async()=>{
        const value=await invoke('onboardingConnect');current=await invoke('onboardingStatus');integrationMessage=value.message||current.integrationMessage||'';updateProgress();await api.refresh?.();
      });
      if(current.integrationActions.includes('discover'))plain(actions.querySelector('[data-verify-codex]'),'Verificar skills',async()=>{
        await invoke('onboardingVerifyCodex');current=await invoke('onboardingStatus');integrationMessage=current.integrationMessage||'Skills descobertas pelo Codex. Execução e autorização dos hooks têm verificações próprias.';updateProgress();await api.refresh?.();
      });
    }
    if(portableIntegration&&!repair){
      const verify=actions.querySelector('[data-verify-codex] button');
      if(verify){verify.disabled=current.codexConnected!==true;verify.title=verify.disabled?'Conecte ao Codex antes de verificar as skills.':'';}
      const connect=actions.querySelector('[data-open-codex] button');
      if(connect)connect.textContent=current.codexConnected===true?'Reconectar ao Codex':'Conectar ao Codex';
    }
    if(integrating&&!portableIntegration&&!repair&&!actions.querySelector('button')){
      plain(actions.querySelector('[data-open-codex]'),'Abrir Codex',async()=>{await invoke('onboardingOpenIntegrationCodex');});
      plain(actions.querySelector('[data-copy-codex]'),'Copiar instruções',async()=>{const value=await invoke('maintenanceScheduleRequest');await invoke('copy',{text:value.request});api.toast?.('Instruções copiadas. Envie-as em uma conversa no espaço Oracle.');});
      plain(actions.querySelector('[data-verify-codex]'),'Verificar',async()=>{
        const button=actions.querySelector('[data-verify-codex] button');button.disabled=true;button.textContent='Verificando…';
        try {const value=await invoke('onboardingVerifyIntegration');current=value;integrationMessage=value.integrationMessage||'';updateProgress();api.toast?.(integrationMessage||'Verificação concluída.');await api.refresh?.();}
        catch(error){integrationMessage=error.message||'Não foi possível verificar a integração.';updateProgress();throw error;}
        finally {button.disabled=false;button.textContent='Verificar';}
      });
    }
    if(integrating&&!portableIntegration&&!repair&&openedRun!==current.runID){openedRun=current.runID;invoke('onboardingOpenIntegrationCodex').catch(errorToast);}
    positionProgress();
  }

  async function poll(){
    if(pending||!api)return;pending=true;const epoch=generation;
    try{
      const value=await invoke('onboardingStatus');if(epoch!==generation)return;
      const previousStatus=current.status,previousHasVault=current.hasVault,previousDestination=destination(current),before=JSON.stringify([current.status,current.installationProgress,current.confirmed]);current=value;
      if(stage==='install'&&previousDestination!==destination(current)){if(destination(current))updateDestination();else show('vault');}
      else if(stage==='vault'&&(previousHasVault!==current.hasVault||previousDestination!==destination(current)))updateVaultSelection();
      if(needsRecovery(current)&&api.openRecovery){await api.openRecovery();return;}
      // Restore the matching screen when a restarted service returns to setup.
      if(!busy){
        const next=!current.licensed?'license':current.resumeExisting?'completed':current.runID?(current.status==='completed'?'completed':'progress'):current.hasVault&&current.ui?.step==='install'?'install':'vault';
        if(next!==stage)show(next);
      }
      updateProgress();
      if(before!==JSON.stringify([current.status,current.installationProgress,current.confirmed])){
        window.dispatchEvent(new CustomEvent('oracle:onboarding-progress',{detail:{schemaVersion:2,...current}}));
        if(current.runID)await api.refresh?.();
        if(current.status==='completed'&&stage==='progress')show('completed');
      }
    }catch(error){if(epoch===generation)errorToast(error);}finally{if(epoch===generation)pending=false;}
  }
  function suspend(){generation++;for(const animation of motionHandles)animation.cancel();motionHandles.clear();clearInterval(timer);busy=false;pending=false;repairing=false;integrationMessage='';if(root){clean(root);activation.close();screen.close();progress.hidden=true;const content=screen.querySelector('.ob2-content');content.inert=false;delete content.dataset.transitioning;}document.body.classList.remove('ob2-configuring');api=null;}
  window.OracleOnboardingV2={
    async mount(options){suspend();api=options;ensure();current=await invoke('onboardingStatus');const next=!current.licensed?'license':current.resumeExisting?'completed':current.runID?(current.status==='completed'?'completed':'progress'):current.hasVault&&current.ui?.step==='install'?'install':'vault';show(next);timer=setInterval(()=>{if(!document.hidden&&!busy)void poll();},800);},
    open(options={}){if(options.connection){if(current.installationCompleted===true&&Array.isArray(current.integrationActions)){dismissedIntegrations.delete(integrationKey());closeScreen();updateProgress();}return;}show(options.previewStage||(!current.licensed?'license':current.runID&&current.status!=='completed'?'progress':current.hasVault?'install':'vault'));},
    suspend,poll,getState:()=>({...current}),pendingDraft:()=>null,prepareToClose:async()=>{if(busy)throw Error('Aguarde esta etapa antes de fechar a configuração.');},
  };
  window.addEventListener('resize',positionProgress);
  const legacy=window.OracleOnboarding;let controller=window.OracleOnboardingV2;
  async function openRecovery(options){window.OracleOnboardingV2.suspend();controller=legacy;await legacy.mount(options);legacy.open();}
  // Existing incomplete identity plans keep their own consent and recovery path.
  window.OracleOnboarding={
    async mount(options){legacy?.suspend();window.OracleOnboardingV2.suspend();const status=await options.call('onboardingStatus');controller=needsRecovery(status)||status.legacyPlanAvailable&&status.profileMode!=='memory-only'&&status.runID&&status.status!=='completed'?legacy:window.OracleOnboardingV2;return controller.mount({...options,openRecovery:()=>openRecovery(options)});},
    open:options=>controller.open(options),poll:()=>controller.poll(),suspend(){legacy?.suspend();window.OracleOnboardingV2.suspend();},
    getState:()=>controller.getState(),pendingDraft:()=>controller.pendingDraft(),prepareToClose:()=>controller.prepareToClose(),formatReadback:legacy?.formatReadback,
  };
})();
