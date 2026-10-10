'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const paths={lock:'M6 10h12v11H6z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3',folder:'M3 6h6l2 2h10v12H3z M3 6V4h6l2 2h10v2',note:'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 15h6 M9 18h5',search:'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',code:'M8 6l-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18',megaphone:'M3 9v6h5l12 5V4L8 9z M8 15l2 6h3l-2-5',shield:'M12 2l9 4v6c0 5-6 9-9 10-3-1-9-5-9-10V6z M8 12l3 3 5-6',chart:'M3 21h19 M5 18v-5h3v5 M11 18V9h3v9 M17 18V4h3v14 M4 9l7-5 4 1 6-4',person:'M17 7a5 5 0 1 1-10 0 5 5 0 0 1 10 0 M3 22v-3a9 9 0 0 1 18 0v3z',chat:'M3 3h18v14H9l-6 4z M7 8h10 M7 12h7',book:'M5 3h15v19H5a2 2 0 0 1 0-4h15 M5 3a2 2 0 0 0-2 2v15 M8 7h8 M8 11h6',tool:'M14 3a6 6 0 0 0-7 8l-5 7 4 4 7-7a6 6 0 0 0 8-7l-5 4-4-4z',mail:'M2 5h20v15H2z M2 5l10 8L22 5',brain:'M8 3a4 4 0 0 0-4 6 5 5 0 0 0 0 8 4 4 0 0 0 8 3V5a3 3 0 0 0-4-2 M16 3a4 4 0 0 1 4 6 5 5 0 0 1 0 8 4 4 0 0 1-8 3 M5 10l3 2 M19 10l-3 2',sliders:'M2 5h7 M15 5h7 M2 12h12 M20 12h2 M2 19h3 M11 19h11 M9 2v6h6V2z M14 9v6h6V9z M5 16v6h6v-6z'};
Object.assign(paths,{orbit:'M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0 M2 17c2 3 21-6 20-10s-21 5-20 10',sidebar:'M3 4h18v16H3z M9 4v16',history:'M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v5l3 2',observatory:'M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',minimize:'M5 12h14',play:'M8 5l12 7-12 7Z',pause:'M8 5v14 M16 5v14',refresh:'M20 7a9 9 0 1 0 1 8 M20 2v6h-6',live:'M12 8v8 M8 12h8 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',fit:'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5 M8 12h8 M12 8v8',back:'M9 5l-6 6 6 6 M3 11h12a6 6 0 0 1 6 6',close:'M6 6l12 12 M18 6L6 18',chevron:'M9 5l7 7-7 7',check:'M5 12l4 4L19 6'});
function icon(name,cls=''){return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.note}"/></svg>`}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
$$('[data-icon]').forEach(e=>e.outerHTML=icon(e.dataset.icon));$('#settings').innerHTML=icon('sliders');
const pending=new Map();let requestID=0,interfaceSuspended=false;
function request(method,params={}){if(window.OraclePluginBridge?.active())return window.OraclePluginBridge.call(method,params);return new Promise((resolve,reject)=>{
 if(!window.webkit?.messageHandlers.oracle){reject(Error('O aplicativo macOS é necessário. Este arquivo não é um app web.'));return}
 if(pending.size>=128){reject(Error('Há operações demais em andamento. Aguarde as respostas atuais.'));return}
 const id=String(++requestID),timeout=setTimeout(()=>{pending.delete(id);reject(Error('A operação não respondeu a tempo. Confira o estado antes de repetir.'));},['gbrainRead','onboardingConnect','codexPlugins','codexPluginsRefresh'].includes(method)?120000:90000);
 pending.set(id,{resolve,reject,timeout});
 try{window.webkit.messageHandlers.oracle.postMessage({id,method,params})}catch(error){clearTimeout(timeout);pending.delete(id);reject(error)}
})}
function call(method,params={},label){return request(method,params).then(value=>{OracleActionFeedback.completed(method,value,{label,toast});return value;});}
window.oracleReply=(id,res)=>{const p=pending.get(id);if(!p)return;pending.delete(id);clearTimeout(p.timeout);res.error?p.reject(Error(res.error)):p.resolve(res.value)};
let state={entries:[],collections:[],events:[],config:{}},selected=null,view='map',query='',zoom=OracleAtlas.DEFAULT_ZOOM,replay=false,cursor=0,timer=null,speed=1,readDocument=null;
const colors=['#dba17c','#91b5ed','#7bc8b4','#d9c276','#b29bd7','#92c399','#d49cae'];
const positions=[[292,132],[564,130],[678,313],[164,310],[248,491],[600,485],[424,574]];
let modalOrigin=null, modalRevision=0, modalDirty=false, settingsTrail=false;
let navigationEpoch=0,noteReadSequence=0,refreshSequence=0,refreshTask=null;
let initialScanTimer=null,initialScanRetries=0,memoryPollTask=null,memoryEpoch=0,lastMemorySignature='';
const navigationBlocked=()=>interfaceSuspended||!!document.querySelector('.ob-dialog[open]')||modalDirty;
let modalSequence=0,modalHistory=[],modalPage=null;
function toast(text,tone='info'){
 if(interfaceSuspended)return;
 const notice=$('#toast'),revision=(toast.revision||0)+1;toast.revision=revision;OracleTransitions.cancel(notice);const dialog=document.querySelector('.ob2-activation[open],.ob2-screen[open],.ob-dialog[open]')||$('#modal');
 if(typeof notice.hidePopover==='function'&&notice.matches(':popover-open'))notice.hidePopover();
 (dialog?.open?dialog:document.body).append(notice);
 notice.dataset.tone=tone;notice.setAttribute('role',tone==='error'?'alert':'status');
 notice.replaceChildren();const mark=document.createElement('span');mark.className='toast-icon';mark.innerHTML=icon(tone==='success'?'check':tone==='error'?'close':'note');
 const message=document.createElement('span');message.textContent=text;notice.append(mark,message);notice.hidden=false;
 if(typeof notice.showPopover==='function'){notice.setAttribute('popover','manual');notice.showPopover();}
 void OracleTransitions.animate(notice,[{opacity:0,transform:'translate(-50%,-10px)'},{opacity:1,transform:'translate(-50%,0)'}],{duration:240,name:'toast-enter'});
 clearTimeout(toast.timer);toast.timer=setTimeout(async()=>{const completed=await OracleTransitions.animate(notice,[{opacity:1,transform:'translate(-50%,0)'},{opacity:0,transform:'translate(-50%,-10px)'}],{duration:180,name:'toast-exit',hold:true});if(!completed||toast.revision!==revision)return;if(typeof notice.hidePopover==='function'&&notice.matches(':popover-open'))notice.hidePopover();notice.hidden=true;OracleTransitions.cancel(notice);document.body.append(notice)},5000);
}
document.addEventListener('close',event=>{const notice=$('#toast');if(notice.hidden||!event.target.contains(notice))return;document.body.append(notice);if(typeof notice.showPopover==='function')notice.showPopover();},true);
function safe(fn){return async(...a)=>{const button=a[0]?.currentTarget instanceof HTMLButtonElement?a[0].currentTarget:null;if(button)button.disabled=true;try{return await fn(...a)}catch(e){toast(e.message,'error')}finally{if(button)button.disabled=false}}}
function modalBreadcrumb(){
 if(!modalHistory.length||modalPage?.family==='settings')return null;
 const nav=document.createElement('nav');nav.className='modal-breadcrumb';nav.setAttribute('aria-label','Caminho desta janela');
 const back=document.createElement('button');back.id='modal-back';back.type='button';back.setAttribute('aria-label','Voltar');back.innerHTML=icon('back')+'<span>Voltar</span>';back.onclick=()=>modalBack();nav.append(back);
 const list=document.createElement('ol');
 const item=(label,index,current=false)=>{const li=document.createElement('li');const el=document.createElement(current?'span':'button');el.textContent=label;el.title=label;if(current)el.setAttribute('aria-current','page');else{el.type='button';el.onclick=()=>modalBack(index)}li.append(el);list.append(li)};
 modalHistory.forEach((page,index)=>item(page.title,index));nav.append(list);return nav;
}
function modalBack(index=modalHistory.length-1){
 const prior=modalHistory[index];
 const restore=()=>{
  if(!prior){closeModal();return}
  modalHistory=modalHistory.slice(0,index);modalPage=prior;modalRevision=prior.revision;
  navigationEpoch++;
  readDocument=prior.document;editorSession=prior.editor;settingsTrail=prior.settings;
  modalDirty=prior.dirty;hideTooltip();
  OracleTransitions.cancel($('#modal-content'));
  $('#modal-content').style.height='';
  $('#modal-content').replaceChildren(...prior.nodes);$('#modal').dataset.family=prior.family;
  const breadcrumb=modalBreadcrumb(),oldBreadcrumb=$('#modal-content .modal-breadcrumb');if(oldBreadcrumb){breadcrumb?oldBreadcrumb.replaceWith(breadcrumb):oldBreadcrumb.remove()}else if(breadcrumb)$('.modal-header>div').prepend(breadcrumb);
  const body=$('.modal-body');if(body)body.scrollTop=prior.scroll;
  const focus=prior.focus?.isConnected?prior.focus:$('#modal-title');focus?.focus({preventScroll:true});
 };
 // Review -> editor preserves the same draft; leaving that draft uses the existing exit guard.
 if(modalDirty&&!(prior?.family==='editor'&&prior.editor===editorSession)){requestEditorExit(false,restore);return}
 restore();
}
function modal(html,options={}){
 if(interfaceSuspended||document.querySelector('.ob-dialog[open]'))return false;
 if(modalDirty&&options.family!=='editor'){requestEditorExit(false,()=>modal(html,options));return false}
 const dialog=$('#modal'), content=$('#modal-content'),opening=!dialog.open;
 content.inert=false;
 OracleTransitions.cancelDialog(dialog,{preserveEntrance:true});
 OracleTransitions.cancel(content);
 content.style.height='';
 if(options.root){modalHistory=[];modalPage=null;}
 const template=document.createElement('template');template.innerHTML=html;
 const heading=template.content.querySelector('h1')||document.createElement('h1');heading.id='modal-title';heading.tabIndex=-1;
 const key=options.key||heading.textContent;
 if(!dialog.open){modalOrigin=document.activeElement;modalHistory=[];modalPage=null}
 if(modalPage){
  const ancestor=modalHistory.findIndex(page=>page.key===key);
  if(ancestor>=0)modalHistory=modalHistory.slice(0,ancestor);
  else if(modalPage.key!==key){
   modalHistory.push({...modalPage,nodes:[...content.childNodes],dirty:modalDirty,scroll:$('.modal-body')?.scrollTop||0,focus:document.activeElement});
   if(modalHistory.length>24)modalHistory.shift();
  }
 }
 modalRevision=++modalSequence;navigationEpoch++;modalDirty=false;hideTooltip();atlasController?.setPaused(true);
 template.content.querySelectorAll('.step-label').forEach(e=>e.remove());
 const footers=[...template.content.children].filter(e=>e.classList.contains('actions'));const footer=footers.at(-1)||document.createElement('div');footer.className='modal-footer';
 footer.querySelectorAll('[data-close]').forEach(e=>e.remove());
 const family=options.family||(template.content.querySelector('.editor')?'editor':template.content.querySelector('.markdown-reader')?'reader':'standard');
 modalPage={key,title:heading.textContent,revision:modalRevision,family,document:readDocument,editor:editorSession,settings:settingsTrail};
 const head=document.createElement('div');head.className='modal-header';const titles=document.createElement('div');const breadcrumb=modalBreadcrumb();titles.append(...(breadcrumb?[breadcrumb]:[]),heading);head.append(titles);
 const close=document.createElement('button');close.className='icon-button modal-close';close.dataset.close='';close.setAttribute('aria-label','Fechar janela');close.dataset.tooltip='Fechar · Esc';close.innerHTML=icon('close');if(!['update-notice','update-installing'].includes(family))head.append(close);
 footer.remove();const body=document.createElement('div');body.className='modal-body';body.append(template.content);
 dialog.querySelector('.update-modal-beam')?.remove();
 content.replaceChildren(head,body,...(footer.children.length?[footer]:[]));dialog.dataset.family=family;
 if(family==='reader'&&!body.querySelector('.reader-layout')){const article=body.querySelector('.markdown-reader');if(article){const layout=document.createElement('div');layout.className='reader-layout';article.before(layout);const outline=document.createElement('nav');outline.className='reader-outline';outline.hidden=true;outline.setAttribute('aria-label','Seções do documento');layout.append(outline,article);mountReaderOutline();}}
 dialog.append($('#tooltip'));if(!dialog.open)dialog.showModal();
 const focus=options.focus?content.querySelector(options.focus):body.querySelector('input:not([type=checkbox]),textarea,select');(focus||heading).focus({preventScroll:true});
 if(opening)OracleTransitions.enterDialog(dialog);
 return true;
}
function closeModal(force=false){
 if(!force&&$('#modal').dataset.family==='update-installing'&&updateBusy)return;
 if(modalDirty&&!force){requestEditorExit();return}
 navigationEpoch++;modalRevision=++modalSequence;return OracleTransitions.dismissDialog($('#modal'),{immediate:force});
}
function actions(extra=''){return `<div class="actions"><button class="secondary" data-close>Concluído</button>${extra}</div>`}
let backdropDown=false;$('#modal').addEventListener('pointerdown',e=>{backdropDown=e.target===$('#modal')});
$('#modal').addEventListener('click',e=>{if(e.target.closest('[data-close]')||(e.target===$('#modal')&&backdropDown))closeModal();backdropDown=false});
$('#modal').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeModal()}});
$('#modal').addEventListener('cancel',e=>{e.preventDefault();closeModal()});
$('#modal').addEventListener('close',()=>{document.body.append($('#tooltip'));modalRevision=++modalSequence;modalDirty=false;settingsTrail=false;modalHistory=[];modalPage=null;hideTooltip();const origin=modalOrigin;modalOrigin=null;if(origin?.isConnected&&!$('#app').inert)origin.focus({preventScroll:true});atlasController?.setPaused(document.hidden||window.oracleWindowVisible===false||view!=='map'||visualPaused)});
function skills(id){return visibleEntries().filter(e=>!e.directory&&OracleDepartments.collectionForEntry(e,state.config.libraryRoots?.skills||"SISTEMA/skills")===id&&e.name==='SKILL.md')}
let departmentCatalogKey=null,departmentCatalogCache=null;
function departmentCatalog(){
 const root=state.config.libraryRoots?.skills||'SISTEMA/skills',entries=visibleEntries().filter(e=>e.path===root||e.path.startsWith(root+'/'));
 const manifest=state.departmentManifest||window.OracleDepartmentManifest,assignments={...state.distributionDepartmentAssignments,...state.config.departmentAssignments};
 const forming=!!state.onboarding?.runID&&!state.onboarding.restoringExisting&&state.onboarding.profileMode==='memory-only'&&state.onboarding.status!=='completed';
 const key=JSON.stringify([state.collections,entries.map(e=>[e.path,e.name,!!e.directory]),manifest,assignments,root,forming]);
 if(key!==departmentCatalogKey){departmentCatalogCache=OracleDepartments.createCatalog(state.collections,entries,manifest,assignments,root,forming);departmentCatalogKey=key;}
 return departmentCatalogCache;
}
function title(e){return e.name==='SKILL.md'?e.path.split('/').slice(-2,-1)[0]:e.name.replace(/\.md$/,'')}
function entryLocation(e){const collection=state.collections.find(c=>OracleDepartments.collectionForEntry(e,state.config.libraryRoots?.skills||"SISTEMA/skills")===c.id);return collection?`${collection.name} · ${e.name==='SKILL.md'?'Skill':'Documento'}`:e.path.split('/').slice(0,-1).slice(-2).join(' / ')||'Pasta principal'}
async function refresh(){
 if(refreshTask)return refreshTask;
 const sequence=++refreshSequence;
 const task=(async()=>{const next=await call('snapshot');if(sequence!==refreshSequence||interfaceSuspended)return;
  const librariesChanged=state.scan?.signature!==next.scan?.signature||state.scan?.pending!==next.scan?.pending||state.scan?.complete!==next.scan?.complete||state.scanError!==next.scanError||JSON.stringify(state.config.libraryRoots)!==JSON.stringify(next.config.libraryRoots);
  const scanErrorChanged=state.scanError!==next.scanError;
  state=next;window.OracleOnboarding?.syncStatus?.(state.onboarding);applyVisualPreferences(false);render();
  if(librariesChanged){window.OracleKnowledgeHub.refresh?.(state.entries);}
  void maybeShowKnowledgeWelcome();
  if(!window.ORACLE_PREVIEW&&state.features?.portableUpdates&&state.onboarding?.status==='completed')void window.OraclePortableUpdates.automatic({call,toast});
  if(!updateBusy){const generation=updateGeneration;void pollUpdateStatus().then(status=>{if(!status||generation!==updateGeneration||sequence!==refreshSequence||interfaceSuspended)return;maybeAutomaticUpdateCheck(status)});}if(state.scanError&&scanErrorChanged)toast(state.scanError);
  clearTimeout(initialScanTimer);if(state.scan?.pending&&initialScanRetries++<20)initialScanTimer=setTimeout(()=>safe(refresh)(),750);else if(!state.scan?.pending)initialScanRetries=0;
 })();
 refreshTask=task;try{return await task}finally{if(refreshTask===task)refreshTask=null}
}
async function refreshVault(){if(state.config.vault&&state.onboarding?.licensed)await call('memoryRefresh');return refresh();}
async function mountOnboarding(){
 try{if(!window.ORACLE_PREVIEW)await window.OracleOnboarding?.mount({call,refresh,getState:()=>state,toast,openSettings:settings,canOpen:()=>!interfaceSuspended&&!$('#modal').open&&!modalDirty});window.OracleUIRecovery?.clear();}
 catch(error){window.OracleUIRecovery?.show(error,recoverInterface);throw error;}
}
async function recoverInterface(){
 const boot=await call('boot');applyAccessibility(boot.accessibility);
 if(boot.locked)throw Error('O acesso ao Oracle foi interrompido. Reabra o aplicativo.');
 $('#app').inert=false;await refresh();await mountOnboarding();void OracleTransitions.enterApp();if(view==='map'&&graphEntrancePending)requestGraphEntrance();finishUpdateStartup();
}
function render(){
 renderTree();renderAtlas();renderResults();graphSurfaceDirty=false;
 renderProgress();renderInspector();
 renderMemoryStatus();renderMemoryFreshness();
 OracleStatusBadge.apply($('#codex-status'),state.codexPlugins?.status==='available'?'connected':state.events.some(e=>e.source==='codex-hook')?'recent_activity':'unverified',state.codexPlugins?.status==='available'?'Conectado':state.events.some(e=>e.source==='codex-hook')?'Atividade recente':'Conexão não verificada');
 renderPlayback();
}
function renderMemoryStatus(){
 $('#footer-status').textContent=state.onboarding?.runID&&state.onboarding?.status!=='completed'?'':state.scanError?(state.scan?.unavailableCount?'Notas do iCloud aguardam download':'Algumas notas não puderam ser lidas'):'';
 const memoryState=state.memorySync?.state;
 const lastVerified=memoryState==='stale'&&state.memorySync?.freshness==='unverified'&&state.memorySync?.complete===true;
 OracleStatusBadge.apply($('#gbrain-status'),memoryState==='current'?'connected':memoryState==='partial'?'error':memoryState==='external'?'selected':'pending',lastVerified?'Última verificação concluída':({current:'Índice atualizado',partial:'Leitura parcial',stale:'Atualização pendente',external:'Perfil externo selecionado',unavailable:'Índice não configurado'})[memoryState]||'Conexão não verificada');
}
async function pollMemoryStatus(){
 if(memoryPollTask)return memoryPollTask;
 if(interfaceSuspended||document.hidden||window.oracleWindowVisible===false||!state.onboarding?.licensed||!state.config.vault)return;
 const epoch=memoryEpoch,vault=state.config.vault;
 const current=()=>epoch===memoryEpoch&&!interfaceSuspended&&state.config.vault===vault;
 const task=(async()=>{
  try{
   const status=await call('memoryStatus');if(!current()||!status||typeof status.state!=='string')return;
   const signature=JSON.stringify([status.state,status.generation,status.indexedGeneration,status.indexing,status.lastScanAt,status.error,status.freshness,status.complete,status.verified_at]);
   state.memorySync=status;
   const statusChanged=signature!==lastMemorySignature;
   if(statusChanged){lastMemorySignature=signature;renderMemoryStatus();renderMemoryFreshness();}
   // This asks for the already cached snapshot, not a scan/index on the UI lane.
   if((status.lastScanAt&&status.lastScanAt!==state.scan?.at)||(statusChanged&&status.state==='unavailable'))await refresh();
  }catch(error){if(current()){state.memorySync={...state.memorySync,state:'unavailable',error:'Não foi possível verificar a memória agora.'};lastMemorySignature='';renderMemoryStatus();renderMemoryFreshness();}}
 })();
 memoryPollTask=task;try{return await task}finally{if(memoryPollTask===task)memoryPollTask=null}
}
// Preserve unchanged branches and their focus, open state and native layout.
function reconcileTreeDOM(host,html){
 const template=document.createElement('template');template.innerHTML=html;
 const identity=node=>{
  if(node.nodeType!==1)return '';
  const data=(node.tagName==='DETAILS'?node.querySelector(':scope > summary'):node)?.dataset;
  return data?.department||data?.collection||data?.folder||data?.path||data?.knowledgePath||'';
 };
 const patch=(current,next)=>{
  const old=[...current.childNodes],used=new Set(),indexed=new Map();
  const token=node=>node.nodeType+':'+node.nodeName+':'+identity(node);
  for(const node of old){const key=token(node);if(!indexed.has(key))indexed.set(key,[]);indexed.get(key).push(node);}
  for(const [index,target] of [...next.childNodes].entries()){
   const match=indexed.get(token(target))?.shift();
   if(!match){current.insertBefore(target,current.childNodes[index]||null);continue;}
   used.add(match);if(current.childNodes[index]!==match)current.insertBefore(match,current.childNodes[index]||null);
   if(match.isEqualNode(target))continue;
   if(match.nodeType!==1){match.nodeValue=target.nodeValue;continue;}
   for(const attribute of [...match.attributes])if(!target.hasAttribute(attribute.name))match.removeAttribute(attribute.name);
   for(const attribute of target.attributes)if(match.getAttribute(attribute.name)!==attribute.value)match.setAttribute(attribute.name,attribute.value);
   patch(match,target);
  }
  for(const node of old)if(!used.has(node))node.remove();
 };
 patch(host,template.content);
}
function renderTree(){
 const entries=visibleEntries();
 const key=JSON.stringify([entries,state.collections,state.config.vault,state.config.libraryRoots,state.config.departmentAssignments,state.departmentManifest||window.OracleDepartmentManifest,state.distributionDepartmentAssignments,state.onboarding,selected,selectedDepartment]);
 if(key===treeRenderKey)return false;treeRenderKey=key;
 const opened=new Set($$('#tree details[open]>summary').map(e=>e.dataset.folder||e.dataset.collection||e.dataset.department));
 const catalog=departmentCatalog();
 const areas=OracleKnowledge.areas(entries);
 const childrenByParent=new Map();for(const e of entries){const parent=e.path.split('/').slice(0,-1).join('/');if(!childrenByParent.has(parent))childrenByParent.set(parent,[]);childrenByParent.get(parent).push(e)};const folder=(path,label,open=false)=>{const children=(childrenByParent.get(path)||[]).filter(e=>!areas.some(a=>a.path===e.path));return `<details ${open||opened.has(path)?'open':''}><summary data-folder="${esc(path)}">${icon('folder')}${esc(label||path.split('/').at(-1))}</summary><div>${children.slice(0,30).map(e=>e.directory?folder(e.path,e.name):`<button class="leaf" data-path="${esc(e.path)}">${icon('note')}<span>${esc(e.name.replace('.md',''))}</span></button>`).join('')}${children.length>30?`<button data-prefix="${esc(path)}">Ver todos →</button>`:''}</div></details>`};
 const roots=new Set(entries.filter(e=>e.directory&&!e.path.includes('/')).map(e=>e.path));
 let html=`<div class="tree-section-label">Departamentos</div>`+catalog.departments.filter(d=>d.id!=='department/other').map(d=>`<details ${selectedDepartment===d.id||opened.has(d.id)?'open':''}><summary data-department="${esc(d.id)}">${icon(d.icon)}<i class="collection-dot" style="background:${d.color}"></i>${esc(d.name)}<span class="count">${d.specialistCount}</span></summary><div>${d.specialists.map(c=>`<details ${selected===c.id||opened.has(c.id)?'open':''}><summary data-collection="${esc(c.id)}">${icon('folder')}${esc(c.name)}<span class="count">${c.skillCount}</span></summary><div>${c.skills.slice(0,9).map(e=>`<button class="leaf" data-path="${esc(e.path)}">${icon('note')}${esc(title(e).replace(/-/g,' '))}</button>`).join('')}${c.skillCount>9?`<button data-prefix="${esc(c.originPath)}">Ver todas →</button>`:''}${!c.skillCount?'<small class="empty-collection">Nenhuma skill nesta fonte</small>':''}</div></details>`).join('')}${d.empty?'<small class="empty-collection">Nenhum especialista instalado</small>':''}</div></details>`).join('');
 html+='<div class=tree-section-label>Seu conhecimento</div>'+areas.map(a=>a.exists?folder(a.path,a.name):`<button data-knowledge-area="${a.id}" data-knowledge-path="${esc(a.path)}">${icon('folder')}${a.name}<span class=count>0</span></button>`).join('');
 const extraRoots=[...roots].filter(p=>!areas.some(a=>a.path===p)).sort((a,b)=>a.localeCompare(b,'pt-BR'));html+='<div class="tree-section-label">Pastas</div>'+extraRoots.map(p=>folder(p)).join('');
 html+=(childrenByParent.get('')||[]).filter(e=>!e.directory).map(e=>`<button class="leaf" data-path="${esc(e.path)}">${icon('note')}${esc(title(e))}</button>`).join('');
 if(!state.config.vault)html='<p class="empty">Seu conhecimento, no seu espaço.<button class="primary" data-connect>Conectar vault</button></p>'+html;
 if($('#tree').oracleHTML===html)return false;$('#tree').oracleHTML=html;reconcileTreeDOM($('#tree'),html);OracleInstallationVisual.reveal('tree',[...$('#tree').querySelectorAll('[data-department],[data-collection],[data-folder],[data-path],[data-knowledge-path]')].map(element=>({element,key:element.dataset.department||element.dataset.collection||element.dataset.folder||element.dataset.path||element.dataset.knowledgePath})),OracleInstallationVisual.projection(state).forming,$('#motion').checked||matchMedia('(prefers-reduced-motion: reduce)').matches);$('#tree').querySelectorAll('[data-collection]').forEach(e=>e.onclick=()=>{selected=e.dataset.collection;selectedDepartment=catalog.specialistByID.get(selected)?.department||null;selectedSkill=null;renderAtlas();renderInspector()});$('#tree').querySelectorAll('[data-department]').forEach(e=>{e.style.setProperty('--department-color',OracleAtlas.departmentColor(e.dataset.department,catalog.departmentByID.get(e.dataset.department)?.color));e.onclick=()=>atlasController?.setDepartment(e.dataset.department)});bindPaths($('#tree'));$('#tree').querySelectorAll('[data-folder],[data-knowledge-path]').forEach(el=>{const path=el.dataset.folder||el.dataset.knowledgePath,area=areas.find(a=>path===a.path||path.startsWith(a.path+'/'));if(area)el.onclick=()=>atlasController?.navigateKnowledge(area.id,path)});$('#tree').querySelector('[data-connect]')?.addEventListener('click',()=>showSetup(0));$('#tree').querySelectorAll('[data-prefix]').forEach(e=>e.onclick=()=>{openSearch(e.dataset.prefix)});
 return true;
}
function bindPaths(container){container.querySelectorAll('[data-path]').forEach(e=>e.onclick=safe(()=>{const entry=visibleEntries().find(n=>n.path===e.dataset.path);if(entry?.directory){openSearch(entry.path)}else return openNote(e.dataset.path)}))}
let inspectorOpenedByMap=false;
let graphEntrancePending=true,graphEntranceFrame=0,graphRenderFrame=0,graphSurfaceDirty=false,atlasRenderKey=null,treeRenderKey=null;
let atlasController=null, selectedSkill=null, selectedDepartment=null, visualPaused=false,replaySession=null,replayProjection=null;
function renderAtlas(){
 if(view!=='map'){atlasController?.setPaused(true);return;}
 const installation=OracleInstallationVisual.projection(state);document.body.classList.toggle('setup-pending',installation.coreReady===false);
 if(!atlasController){atlasRenderKey=null;atlasController=new OracleAtlas($('#atlas'),{onNavigate:hideTooltip,onError:error=>toast(error.message||String(error),'error'),onCentralLayout:()=>{if(view==='map'&&graphEntrancePending)renderAtlas();},onSelect:(id,leaf,keyboard,selection)=>{selected=id;selectedSkill=leaf;selectedDepartment=selection?.department||null;renderInspector();if(leaf){if(!document.body.classList.contains('observatory-open')){inspectorOpenedByMap=true;toggleObservatory(true)}}else if(inspectorOpenedByMap){inspectorOpenedByMap=false;toggleObservatory(false)}},onConnector:id=>id==='gbrain'?safe(memory)():settings(),onOpenKnowledge:safe(openKnowledgeHub),onOpen:safe(openNote),onLayout:safe(async layout=>{if(replay)return;await call('saveLayout',{layout});state.config.layout=structuredClone(layout)}),onZoom:value=>{$('#zoom-label').textContent=Math.round(value*100)+'%'}})}
 const atlasData={vault:state.config.vault,forming:installation.forming&&state.onboarding?.profileMode==='memory-only',skillRoot:state.config.libraryRoots?.skills||'SISTEMA/skills',departmentAssignments:{...state.distributionDepartmentAssignments,...state.config.departmentAssignments},departmentManifest:state.departmentManifest||window.OracleDepartmentManifest,selectedDepartment,collections:replay&&replaySession?.kind==='formation'?replaySession.collections:installation.collections,entries:replay&&replaySession?.kind==='formation'?replaySession.entries:replay?visibleEntries():installation.entries,plugins:[],connectors:installation.connectors,coreReady:installation.coreReady,selected,selectedLeaf:selectedSkill,detail:Number($('#density').value),events:replay?timelineEvents().slice(0,cursor+1):state.events,replay,reduced:$('#motion').checked,economy:$('#economy').checked,layout:state.config.layout,formation:undefined,hidden:view!=='map'||window.oracleWindowVisible===false||installation.coreReady===false,paused:visualPaused||!!document.querySelector('dialog[open]')};
 // Compare the complete input, including layout, roots, receipts and replay.
 // Navigation alone does not invalidate the SVG topology or central inventory.
 const key=JSON.stringify({...atlasData,entries:OracleAtlas.presentationEntries(atlasData.entries,atlasData.skillRoot).map(e=>[e.path,e.name,!!e.directory])});
 if(key!==atlasRenderKey||atlasController.centralLayoutCanceled){atlasController.update(atlasData);atlasRenderKey=key;}
 else{atlasController.data.entries=atlasData.entries;atlasController.setPaused(document.hidden||atlasData.hidden||atlasData.paused);}
 if(graphEntrancePending&&!graphEntranceFrame){
  // Let WebKit lay out the newly visible surface before reading its viewport.
  graphEntranceFrame=requestAnimationFrame(()=>{graphEntranceFrame=requestAnimationFrame(()=>{
   graphEntranceFrame=0;if(view==='map'&&!interfaceSuspended&&graphEntrancePending&&atlasController.revealGraph())graphEntrancePending=false;
  });});
 }
}
function requestGraphEntrance(){graphEntrancePending=true;renderAtlas()}
window.addEventListener('oracle:app-enter',()=>{void OracleTransitions.enterApp();requestGraphEntrance()});
function setView(next,onReady){
 if(navigationBlocked()||!['map','list','folders'].includes(next))return false;
 atlasController?.finishReveal();OracleTransitions.cancelPage();
 $$('.workspace-tabs [data-workspace]').forEach(button=>{const selected=button.dataset.workspace===next;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1});
 OracleTransitions.indicator();
 if(next===view){onReady?.();return true;}
 atlasController?.cancelCentralLayout();view=next;
 if(next==='map')graphEntrancePending=true;
 $('#graph-page').hidden=false;$('#atlas').hidden=next!=='map';$('#results').hidden=next==='map';$('.map-tools').hidden=next!=='map';
 $('#replay-panel').hidden=true;
 if(graphRenderFrame){cancelAnimationFrame(graphRenderFrame);graphRenderFrame=0;}
 if(next==='map'){
  const page=$('#graph-page');page.inert=true;
  graphRenderFrame=requestAnimationFrame(()=>{graphRenderFrame=requestAnimationFrame(()=>{
   graphRenderFrame=0;if(view!==next||interfaceSuspended){page.inert=false;return;}
   let changed=false;
   try{if(graphSurfaceDirty){changed=renderTree();graphSurfaceDirty=false;}}
   catch(error){page.inert=false;toast(error.message,'error');return;}
   const paintGraph=()=>{
    graphRenderFrame=0;if(view!==next||interfaceSuspended){page.inert=false;return;}
    try{renderAtlas();onReady?.();}catch(error){toast(error.message,'error');}finally{page.inert=false;}
   };
   if(changed)graphRenderFrame=requestAnimationFrame(paintGraph);else paintGraph();
  });});
 }else{if(graphSurfaceDirty){renderTree();graphSurfaceDirty=false;}renderResults();onReady?.();}
 atlasController?.setPaused(next!=='map'||!!graphRenderFrame||document.hidden||visualPaused||!!document.querySelector('dialog[open]'));return true;
}
function renderResults(){if(!['list','folders'].includes(view))return;let entries=visibleEntries().filter(e=>(view==='folders'||!e.directory)&&(!query||(e.path+' '+title(e)).toLowerCase().includes(query)));$('#results').innerHTML=`<h2>${view==='list'?'Documentos':'Pastas e documentos'} <small>${entries.length} resultados · fonte local</small></h2>`+(entries.length?entries.slice(0,300).map(e=>`<button class="result" data-path="${esc(e.path)}">${icon(e.directory?'folder':'note')}<div><strong>${esc(title(e))}</strong><small>${esc(entryLocation(e))}</small></div></button>`).join('')+(entries.length>300?'<p class="empty">Mostrando 300 resultados. Refine a busca.</p>':''):'<p class="empty">Nenhum resultado nesta pasta e filtro.</p>');bindPaths($('#results'))}
const collectionDescriptions={ads:'Estratégia, criação e análise de campanhas.',code:'Procedimentos para projetar, construir e revisar software.',contents:'Seu espaço para procedimentos de conteúdo.','customer-finder':'Pesquisa e descoberta de potenciais clientes.',marketing:'Pesquisa, posicionamento e crescimento.','personal-branding':'Seu espaço para identidade e marca pessoal.'};
function renderInspector(){
 if(selectedSkill){renderSkillInspector();return}
 const department=atlasController?.catalog?.departmentByID.get(selectedDepartment);
 if(department&&!selected){$('#inspector-title').textContent=department.name;$('#inspector').innerHTML=`<span class="pill">Departamento</span><div class="big-count">${department.specialistCount}</div><small>${department.specialistCount===1?'especialista instalado':'especialistas instalados'} · ${department.skillCount} skills</small><p class="muted">A organização é visual. Seus arquivos continuam nas pastas originais.</p>${department.specialists.map(s=>`<button class="secondary" data-inspect-specialist="${esc(s.id)}">${esc(s.name)} · ${s.skillCount}</button>`).join('')}${department.skillCount?'<button class="secondary" id="department-search">Buscar neste departamento</button>':''}`;$$('[data-inspect-specialist]').forEach(b=>b.onclick=()=>atlasController.focus(b.dataset.inspectSpecialist));$('#department-search')?.addEventListener('click',()=>openSearch('',{department:department.id}));return}
 const c=state.collections.find(c=>c.id===selected),group=atlasController?.groups.get(atlasController?.context.group);
 if(group){$('#inspector-title').textContent=group.name;$('#inspector').innerHTML=`<span class="pill">${group.kind==='folder'?'Pasta':'Por nome'} · ${esc(c?.name||'')}</span><div class="big-count">${group.skills.length}</div><small>${group.skills.length===1?'skill neste grupo':'skills neste grupo'}</small><p class="muted">${group.kind==='folder'?'Arquivos reunidos na mesma pasta.':'Uma faixa alfabética para explorar sua coleção.'}</p><button id="group-parent" class="secondary">Voltar ao especialista</button>`;$('#group-parent').onclick=()=>atlasController.focus(selected);return}
 $('#inspector-title').textContent=c?c.name:'Observatório';
 $('#inspector').innerHTML=c?`<div class="big-count">${skills(c.id).length}</div><small>${skills(c.id).length===1?'skill disponível':'skills disponíveis'}</small><p class="muted">${esc(collectionDescriptions[c.id]||'Seus procedimentos, reunidos por especialidade.')}</p><button id="view-skills" class="secondary">Explorar skills</button>`:`<div class="inspector-orbit">${icon('brain')}</div><p class="inspector-welcome">Seu conhecimento, conectado.</p><p class="muted">Selecione um especialista para explorar suas skills.</p>`;
 $('#view-skills')?.addEventListener('click',()=>openSearch(departmentCatalog().specialistByID.get(c.id)?.originPath||`${state.config.libraryRoots?.skills||"SISTEMA/skills"}/${c.id}`));
}
function renderProgress(){
 // Only actual receipts control installation progress; replay never enters here as a source.
 const last=state.events.filter(e=>e.phase&&Number.isFinite(e.total)).at(-1), bar=$('#installation-progress');
 const complete=last&&(last.event_type.endsWith('failed')||last.event_type.endsWith('completed')||last.completed>=last.total);
 const active=state.onboarding?.profileMode!=='memory-only'&&(state.operations?.setup||state.operations?.gbrain)&&last&&!complete&&last.total>0;
 bar.hidden=!active;
 if(active){const completed=Math.max(0,Math.min(last.completed||0,last.total));bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(last.total));bar.setAttribute('aria-valuenow',String(completed));bar.setAttribute('aria-valuetext',`${completed} de ${last.total} arquivos verificados`);$('#progress-fill').style.width=(completed/last.total*100)+'%'}
 renderPlayback();
}
let editorSession=null,draftTimer=null,editorWrites=Promise.resolve(),pluginHeldDraft=null;
// Only the active editor can be retained: one note, bound to its exact vault.
// This closure is never rendered while locked or sent to model context.
function retainPluginEditorDraft(){
 if(window.OraclePluginBridge?.active()&&editorSession&&modalDirty)pluginHeldDraft={path:editorSession.path,hash:editorSession.hash,text:editorSession.text,vault:state.config.vault};
}
function clearPluginHeldDraft(path){if(pluginHeldDraft?.path===path&&pluginHeldDraft.vault===state.config.vault)pluginHeldDraft=null;}
async function flushPluginHeldDraft(){
 const held=pluginHeldDraft;if(!held)return;
 if(interfaceSuspended||held.vault!==state.config.vault)throw Error('O rascunho permanece reservado à pasta original. Reabra o Oracle nessa pasta antes de fechar.');
 const saved=await queueEditorWrite(()=>call('saveDraft',{path:held.path,hash:held.hash,text:held.text}));
 if(saved?.saved!==true)throw Error('A gravação do rascunho ainda não foi confirmada.');
 if(pluginHeldDraft===held)pluginHeldDraft=null;
}
function queueEditorWrite(operation){const task=editorWrites.catch(()=>{}).then(operation);editorWrites=task.catch(()=>{});return task}
async function persistEditorDraft(){
 clearTimeout(draftTimer);
 const session=editorSession;if(!session||!modalDirty)return;
 if(session.savePromise)await session.savePromise;
 const revision=session.revision,text=session.text;
 if(text===session.base)return;
 const saved=await queueEditorWrite(()=>call('saveDraft',{path:session.path,hash:session.hash,text}));
 if(window.OraclePluginBridge?.active()&&saved?.saved!==true)throw Error('A gravação do rascunho ainda não foi confirmada.');
 if(saved?.saved===true&&pluginHeldDraft?.text===text)clearPluginHeldDraft(session.path);
 if(editorSession===session&&revision===session.revision){session.saved=true;const status=$('#draft-status');if(status)status.textContent='Rascunho guardado neste Mac'}
 return saved;
}
async function openNote(path){
 if(navigationBlocked())return;
 if(pluginHeldDraft&&(pluginHeldDraft.path!==path||pluginHeldDraft.vault!==state.config.vault))await flushPluginHeldDraft();
 const epoch=navigationEpoch,sequence=++noteReadSequence,document=await call('read',{path});if(epoch!==navigationEpoch||sequence!==noteReadSequence||navigationBlocked())return;
 if(pluginHeldDraft?.path===path&&pluginHeldDraft.vault===state.config.vault)document.draft={path,vault:pluginHeldDraft.vault,originalHash:pluginHeldDraft.hash,text:pluginHeldDraft.text};
 readDocument={...document,relative:path};editorSession=null;
 const name=path.endsWith('/SKILL.md')?path.split('/').at(-2).replace(/-/g,' '):path.split('/').at(-1).replace(/\.md$/i,'');
 modal(`<h1>${esc(name)}</h1>${document.draft&&document.draft.text!==document.text?'<div class="editor-recovery"><p>Há um rascunho que ainda não foi salvo no documento.</p><button class="secondary" id="recover-draft">Retomar</button></div>':''}<div class="document-meta"><span>${path.endsWith('/SKILL.md')?'Skill':'Nota'}</span><span>${Math.max(1,Math.ceil(document.text.split(/\s+/).length/220))} min de leitura</span><span title="${esc(path)}">${esc(path.split('/').slice(0,-1).join(' / '))}</span></div><div class="reader-layout"><nav class="reader-outline" aria-label="Seções do documento" hidden></nav><article class="markdown-reader">${markdown(document.text)}</article></div><details class="source-details"><summary>Detalhes do arquivo</summary><div class="source">${esc(document.path)}<br>SHA-256 ${document.hash}</div></details>${actions(`<button class="secondary" id="reveal-note">Mostrar no Finder</button>${document.editable!==false?'<button class="primary" id="edit-note">Editar</button>':''}`)}`,{family:'reader',key:'document:'+path});
 bindMarkdown($('#modal-content'),path);mountReaderOutline();$('#reveal-note').onclick=safe(()=>call('reveal',{path}));$('#edit-note')?.addEventListener('click',()=>editNote());
 $('#recover-draft')?.addEventListener('click',()=>{editNote(document.draft.text,document.draft.originalHash);if(document.draft.originalHash!==document.hash)showEditorConflict(document)});
 return true;
}
function editNote(draft=readDocument.text,baseHash=readDocument.hash){
 const current=editorSession;
 editorSession=current&&current.path===readDocument.relative?current:{path:readDocument.relative,hash:baseHash,base:readDocument.text,text:draft,revision:0,saved:false};
 const session=editorSession;session.text=draft;
 modal(`<h1>Editar ${esc(session.path.endsWith('/SKILL.md')?session.path.split('/').at(-2).replace(/-/g,' '):session.path.split('/').at(-1))}</h1><div class="document-meta"><span>Markdown</span><span title="${esc(session.path)}">${esc(session.path)}</span></div><div class="editor-status"><span id="draft-status">${session.saved?'Rascunho guardado neste Mac':'O arquivo será salvo na sua pasta do Obsidian'}</span><button id="reload-note">Reler arquivo</button></div><div id="editor-conflict"></div><div class="editor-toolbar"><strong>Conteúdo</strong><span id="editor-count"></span><button type="button" class="quiet-link" id="editor-preview-toggle" aria-expanded="false">Prévia</button></div><div class="editor-workspace"><textarea class="editor" id="editor" aria-label="Conteúdo do documento" autocorrect="off" autocapitalize="off" spellcheck="false" writingsuggestions="false">${esc(draft)}</textarea><article class="markdown-reader editor-preview" hidden></article></div>${actions('<button class="secondary" id="discard-edit">Descartar</button><button class="secondary" id="diff">Ver alterações</button><button class="primary" id="save-note">Salvar</button>')}`,{family:'editor',focus:'#editor',key:'editor:'+session.path});
 modalDirty=session.text!==session.base;
 const updateEditor=()=>{$('#editor-count').textContent=session.text.split('\n').length+' linhas';const preview=$('.editor-preview');if(!preview.hidden){preview.innerHTML=markdown(session.text);bindMarkdown(preview,session.path)}};updateEditor();
 $('#editor-preview-toggle').onclick=()=>{const preview=$('.editor-preview');preview.hidden=!preview.hidden;$('#editor-preview-toggle').setAttribute('aria-expanded',String(!preview.hidden));$('#editor-preview-toggle').textContent=preview.hidden?'Prévia':'Fechar prévia';$('.editor-workspace').classList.toggle('with-preview',!preview.hidden);updateEditor()};
 $('#editor').oninput=()=>{session.text=$('#editor').value;session.revision++;session.saved=false;updateEditor();modalDirty=session.text!==session.base;$('#draft-status').textContent=modalDirty?'Guardando rascunho…':'Sem alterações';clearTimeout(draftTimer);if(modalDirty)draftTimer=setTimeout(()=>safe(persistEditorDraft)(),450)};
 $('#discard-edit').onclick=()=>requestEditorExit(true);
 $('#diff').onclick=()=>reviewEdit(session);
 $('#save-note').onclick=safe(saveEditor);
 $('#reload-note').onclick=safe(async()=>{const doc=await call('read',{path:session.path});if(doc.hash!==session.hash)showEditorConflict(doc);else toast('O documento continua atualizado.')});
}
function showEditorConflict(current){
 if(!editorSession)return;
 const mount=$('#editor-conflict');if(!mount){editNote(editorSession.text);return showEditorConflict(current)}
 const session=editorSession;session.conflict=current;
 mount.innerHTML=`<div class="editor-recovery"><p>Este arquivo mudou no Obsidian. Seu rascunho está guardado. Confira a versão atual antes de salvar.</p><details class="source-details"><summary>Ver versão atual</summary><pre>${esc(current.text)}</pre></details><button class="secondary" id="merge-base">Usar versão atual como base</button></div>`;
 $('#save-note').disabled=true;
 $('#merge-base').onclick=()=>{session.hash=current.hash;session.base=current.text;session.conflict=null;readDocument={...current,relative:session.path};modalDirty=session.text!==session.base;mount.innerHTML='<p class="modal-notice">Revise seu texto com as mudanças do Obsidian antes de salvar.</p>';$('#save-note').disabled=false;safe(persistEditorDraft)();$('#editor').focus()};
 mount.scrollIntoView({block:'nearest'});
}
async function saveEditor(){
 const session=editorSession;if(!session)return;
 if(session.savePromise)return session.savePromise;
 clearTimeout(draftTimer);
 const sent={path:session.path,hash:session.hash,text:session.text,revision:session.revision};
 const save=queueEditorWrite(()=>call('saveNote',{path:sent.path,hash:sent.hash,text:sent.text})).then(result=>{
  if(result.status==='conflict'){session.conflict=result.current;if(editorSession===session)showEditorConflict(result.current);return result}
  if(result.status!=='saved'||!result.document?.hash)throw Error('A gravação ainda não foi confirmada. Seu texto continua no editor.');
  clearPluginHeldDraft(session.path);
  session.base=sent.text;session.hash=result.document.hash;
  modalHistory=modalHistory.filter(page=>!(page.family==='reader'&&page.document?.relative===session.path));
  session.saved=session.text===sent.text;
  modalHistory.forEach(page=>{if(page.editor===session)page.dirty=session.text!==session.base});
  if(editorSession===session){readDocument={...result.document,relative:session.path};modalDirty=session.text!==session.base;const label=$('#draft-status');if(label)label.textContent=modalDirty?'Versão enviada salva. Guardando a digitação mais recente…':'Salvo no arquivo original';}
  return result;
 });
 session.savePromise=save;
 let failure;try{await save}catch(error){failure=error}finally{session.savePromise=null}
 if(editorSession!==session)return;
 // The editor stays mounted. A later revision can never be replaced by the acknowledgement.
 if(modalDirty)await persistEditorDraft();
 if(failure)throw failure;
 if(!session.conflict&&modalPage?.key==='diff:'+session.path)reviewEdit(session);
 if(!session.conflict)toast(modalDirty?'Versão salva. Há novas alterações no rascunho.':'Documento salvo.','success');
 safe(refresh)();
}
function mountReaderOutline(){
 const host=$('.reader-outline'),article=$('.reader-layout .markdown-reader');if(!host||!article)return;
 const headings=[...article.querySelectorAll('h2,h3,h4')];if(headings.length<3)return;
 host.hidden=false;const title=document.createElement('strong');title.textContent='Neste documento';host.append(title);
 headings.forEach(heading=>{const button=document.createElement('button');button.type='button';button.textContent=heading.textContent;button.className=heading.tagName==='H2'?'':'subsection';button.onclick=()=>{heading.tabIndex=-1;heading.scrollIntoView({block:'start',behavior:document.body.classList.contains('reduced')?'instant':'smooth'});heading.focus({preventScroll:true})};host.append(button)});
}
function documentDiff(before,after){
 const old=before.split('\n'),now=after.split('\n'),rows=[];let i=0,j=0;
 const push=(kind,a,b,text)=>rows.push({kind,a,b,text});
 // Bounded LCS aligns inserted lines without marking the rest of the file as changed.
 if(old.length*now.length<=1000000){
  const width=now.length+1,table=new Uint32Array((old.length+1)*width);
  for(let a=old.length-1;a>=0;a--)for(let b=now.length-1;b>=0;b--)table[a*width+b]=old[a]===now[b]?1+table[(a+1)*width+b+1]:Math.max(table[(a+1)*width+b],table[a*width+b+1]);
  while(i<old.length||j<now.length){if(i<old.length&&j<now.length&&old[i]===now[j]){push('same',i+1,j+1,old[i]);i++;j++}else if(j<now.length&&(i===old.length||table[i*width+j+1]>table[(i+1)*width+j])){push('add','',j+1,now[j++])}else push('remove',i+1,'',old[i++])}
 }else{
  while(i<old.length&&j<now.length&&old[i]===now[j]){push('same',i+1,j+1,old[i]);i++;j++}
  let a=old.length,b=now.length;while(a>i&&b>j&&old[a-1]===now[b-1]){a--;b--}
  while(i<a)push('remove',i+1,'',old[i++]);while(j<b)push('add','',j+1,now[j++]);while(i<old.length){push('same',i+1,j+1,old[i]);i++;j++}
 }
 return rows;
}
function reviewEdit(session){
 const rows=documentDiff(session.base,session.text),added=rows.filter(r=>r.kind==='add').length,removed=rows.filter(r=>r.kind==='remove').length;
 modal(`<h1>Suas alterações</h1><div class="document-meta"><span>${esc(session.path)}</span></div><div class="diff-summary"><strong>${added||removed?'Confira antes de salvar':'Sem alterações'}</strong><span>+ ${added} adicionadas</span><span>− ${removed} removidas</span></div><div class="document-diff" role="region" aria-label="Comparação do documento" tabindex="0">${rows.map(r=>`<div class="diff-line diff-${r.kind}"><span class="diff-number" aria-label="Linha original">${r.a}</span><span class="diff-number" aria-label="Linha atual">${r.b}</span><span class="diff-marker">${r.kind==='add'?'+':r.kind==='remove'?'−':' '}</span><code>${esc(r.text)||' '}</code></div>`).join('')}</div>${actions('<button class="secondary" id="back-editor">Voltar ao editor</button><button class="primary" id="save-note">Salvar</button>')}`,{family:'editor',key:'diff:'+session.path});
 modalDirty=session.text!==session.base;$('#back-editor').onclick=()=>editNote(session.text);$('#save-note').onclick=safe(saveEditor);
}
function requestEditorExit(discardOnly=false,onExit=null){
 const leave=onExit||(()=>closeModal());
 if(!editorSession){leave();return}
 if(!modalDirty){leave();return}
 let notice=$('.editor-exit');if(notice){notice.querySelector('button')?.focus();return}
 notice=document.createElement('div');notice.className='editor-exit editor-recovery';notice.setAttribute('role','alert');
 notice.innerHTML=`<p>${discardOnly?'Descartar suas alterações?':'Há alterações que ainda não foram salvas no arquivo.'}</p><button class="secondary" id="keep-editing">Continuar editando</button>${discardOnly?'':'<button class="secondary" id="keep-draft-close">Guardar rascunho e '+(onExit?'voltar':'fechar')+'</button>'}<button class="secondary" id="confirm-discard">Descartar</button>`;
 $('.modal-body').prepend(notice);notice.scrollIntoView({block:'nearest'});
 $('#keep-editing').onclick=()=>{notice.remove();$('#editor')?.focus()};
 $('#keep-draft-close')?.addEventListener('click',safe(async()=>{const draft=editorSession;await persistEditorDraft();editorSession=null;modalDirty=false;await leave();toast('Rascunho guardado neste Mac.','success');if($('#modal').open&&$('#modal').dataset.family==='reader'&&readDocument?.relative===draft.path){let recovery=$('#recover-draft');if(!recovery){const box=document.createElement('div');box.className='editor-recovery';box.innerHTML='<p>Seu rascunho continua guardado.</p><button class=secondary id=recover-draft>Retomar</button>';$('.modal-body').prepend(box);recovery=$('#recover-draft')}recovery.onclick=()=>editNote(draft.text,draft.hash)}}));
 $('#confirm-discard').onclick=safe(async()=>{clearTimeout(draftTimer);await call('discardDraft',{path:editorSession.path});clearPluginHeldDraft(editorSession.path);editorSession=null;modalDirty=false;await leave();toast('Alterações descartadas.','success')});
 $('#keep-editing').focus();
}
window.oraclePrepareToClose=async()=>{if(editorSession?.savePromise)await editorSession.savePromise;await persistEditorDraft();await flushPluginHeldDraft();await window.OracleOnboarding?.prepareToClose?.();await OracleTransitions.exitApp();return true};
function showSetup(options={}){
 if(!window.OracleOnboarding||window.ORACLE_PREVIEW){toast('A configuração funciona no aplicativo para macOS.');return;}
 const enter=()=>{closeModal(true);OracleOnboarding.open(typeof options==='object'?options:{});};
 if(modalDirty){requestEditorExit(false,enter);return;}enter();
}
const pluginStates={connected:'Conectado',disconnected:'Desconectado',installed:'Instalado',needs_auth:'Conectar conta',unavailable:'Indisponível',missing:'Ausente',absent:'Ausente',pending:'Pendente',inactive:'Inativo',disabled:'Inativo',paused:'Pausado',running:'Em execução',error:'Erro'};
const statusBadge=(status,label)=>OracleStatusBadge.render(status,label);
async function conversations(){
 if(navigationBlocked())return;
 const epoch=navigationEpoch,items=await call('conversations');if(epoch!==navigationEpoch||navigationBlocked())return;
 modal(`<h1>Conversas importadas</h1><p>Importe um arquivo Oracle Conversations v1. O histórico das suas contas não é acessado automaticamente.</p><div id="conversation-list">${items.map((c,i)=>`<button class="result" data-conversation="${i}">${icon('chat')}<div><strong>${esc(c.title)}</strong><small>${esc(c.source)}</small></div></button>`).join('')||'<p class="empty">Nenhuma conversa importada.</p>'}</div>${actions('<button class="primary" id="import-conversations">Importar conversas…</button>')}`);
 $('#import-conversations').onclick=safe(async()=>{const e=navigationEpoch;const result=await call('importConversations');if(e===navigationEpoch){await conversations();if(Array.isArray(result))toast('Conversas importadas.','success')}});
 $$('[data-conversation]').forEach(e=>e.onclick=()=>{const c=items[Number(e.dataset.conversation)];modal(`<h1>${esc(c.title)}</h1><div class="source">${esc(c.source)} · conteúdo importado</div><div class="conversation-reader">${c.messages.map(m=>`<section class="conversation-message"><strong>${m.role==='user'?'Você':'Assistente'}</strong><article class="markdown-reader">${markdown(m.text)}</article></section>`).join('')}</div>${actions()}`);bindMarkdown($('#modal-content'),'')});
}
async function instructions(){const revision=modalRevision;const items=await call('instructions');if(revision!==modalRevision)return;modal(`<h1>Instruções dos projetos</h1><p>Consulte as instruções dos projetos que você conectou.</p>${items.map((e,i)=>`<button class="result" data-instruction="${i}">${icon('book')}<div><strong>${esc(e.path)}</strong><small>${esc(e.source.split('/').at(-1))}</small></div></button>`).join('')||'<p class="empty">Conecte um projeto para ver suas instruções.</p>'}${actions('<button class="primary" id="add-project">Autorizar projeto…</button>')}`);$('#add-project').onclick=safe(async()=>{const path=await call('chooseProject');await instructions();if(path)toast('Projeto autorizado.','success')});$$('[data-instruction]').forEach(e=>e.onclick=safe(async()=>{const doc=await call('readInstruction',items[Number(e.dataset.instruction)]);modal(`<h1>Instrução encontrada</h1><div class="source">${esc(doc.path)}</div><article class="markdown-reader">${markdown(doc.text)}</article>${actions()}`,{family:'reader'});bindMarkdown($('#modal-content'),'') }))}
function activity(){modal(`<h1>Histórico técnico</h1><p>Hooks observam apenas caminhos suportados e confiados no Codex. Ferramentas hosted podem não emitir todos os eventos. Stop encerra um turno; silêncio não prova ociosidade, sucesso ou falha.</p><span class="pill">${state.events.filter(e=>e.source==='codex-hook').length} hooks recebidos</span><span class="pill">Sem observação total</span><pre>${esc(state.events.slice(-50).map(e=>`${e.received_at} · ${e.source}\n${e.event_type}: ${e.sanitized_summary}`).join('\n\n')||'Nenhum recibo recebido. A integração não foi comprovada nesta instalação.')}</pre>${actions('<button class="secondary" id="journal-replay">Reproduzir histórico</button>')}`);$('#journal-replay').onclick=safe(startJournal)}
function departmentSettings(){
 const catalog=departmentCatalog();
 modal(`<h1>Organizar departamentos</h1><p>A organização usa os mesmos departamentos do mapa. Os arquivos permanecem nas pastas originais.</p><div class="department-settings">${catalog.specialists.map(c=>`<label class="department-setting"><span>${esc(c.name)}</span><select data-department-choice="${esc(c.id)}">${catalog.departments.map(d=>`<option value="${esc(d.id)}" ${c.department===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select></label>`).join('')||'<p class="empty">Nenhum especialista encontrado nesta fonte.</p>'}</div>${actions('<button class="primary" id="save-departments">Salvar organização</button>')}`);
 $('#save-departments').onclick=safe(async()=>{
  // The native preferences keep their shipped slugs; the shared catalog normalizes them.
  const assignments={...state.config.departmentAssignments,...Object.fromEntries($$('[data-department-choice]').map(e=>[e.dataset.departmentChoice,e.value==='department/other'?'unassigned':e.value.replace(/^department\//,'')]))};
  await call('saveDepartments',{assignments});state.config.departmentAssignments=assignments;if(atlasController)atlasController.topologyKey=null;await refresh();toast('Organização salva. Os arquivos permanecem no lugar.','success');
 });
}

function settings(){
 if(document.querySelector('.ob-dialog[open]'))return;
 if(modalDirty){requestEditorExit(false,settings);return}
 settingsTrail=true;
 const row=(id,name,description,ic='chevron')=>`<button class="setting-row" id="${id}"><span><strong>${name}</strong><small>${description}</small></span>${icon(ic)}</button>`;
 modal(`<h1>Configurações</h1><p class="settings-intro">Seu segundo cérebro e sua conexão com o Codex.</p>
 <section class="settings-section"><h2>Seu espaço</h2><div class="setting-group">
 ${row('knowledge-settings','Knowledge Base','Prompts para organizar sua vida pessoal e profissional','book')}
 ${row('restart-setup','Configurar Oracle','Selecionar a pasta do seu segundo cérebro')}
 ${state.onboarding?.integrationActions?.length?row('optional-integration','Integração com o Codex','Conexão e descoberta das skills são opcionais'):''}
 </div></section>
`,{family:'settings',footer:false,root:true});
 $('#knowledge-settings').onclick=safe(()=>openKnowledgePrompts());
 $('#restart-setup').onclick=vaultSettings;
 $('#optional-integration')?.addEventListener('click',()=>showSetup({connection:true}));

}
function vaultSettings(){
 const vault=state.config.vault||'',name=vault.split('/').filter(Boolean).at(-1)||'Nenhuma pasta selecionada';
 modal(`<h1>Configurar Oracle</h1><p>Selecione a pasta do seu segundo cérebro.</p><div class="vault-settings-current">${icon('folder')}<div><small>Pasta atual</small><strong>${esc(name)}</strong>${vault?`<span>${esc(vault)}</span>`:''}</div></div><p class="vault-settings-note">Trocar a pasta conecta o Oracle ao vault escolhido. Os arquivos da pasta anterior continuam no lugar.</p>${actions('<button class="secondary" id="vault-settings-back">Voltar</button><button class="primary" id="vault-settings-choose">Selecionar outro vault</button>')}`,{family:'vault-settings',key:'vault-settings'});
 $('#vault-settings-back').onclick=settings;
 $('#vault-settings-choose').onclick=safe(async()=>{
  const button=$('#vault-settings-choose');button.disabled=true;
  try{const selected=await call('chooseVault');if(!selected)return;await refresh();await window.OracleOnboarding?.poll?.();vaultSettings();toast('Pasta selecionada.','success');}
  finally{if(button.isConnected)button.disabled=false}
 });
}
async function maintenanceSettings(){
 const value=await call('maintenanceStatus'),sync=state.gbrainSync||{},last=value.lastRun?.lastSuccess;
 const capture=value.autoCapture===true&&value.captureSource==='codex_workspace_hooks_v1';
 const remote=value.remoteProcessing===true&&value.synthesisScope==='captured_messages_codex_v1';
 modal(`<h1>Sincronização e manutenção</h1>
 <p>O índice acompanha o vault enquanto o Oracle estiver aberto e desbloqueado. A indexação básica é local e preserva instalações externas.</p>
 <dl class="ob-review"><dt>Índice</dt><dd>${esc(sync.status==='verified'?'Verificado':sync.status==='external_preserved'?'Instalação externa preservada':sync.status==='needs_attention'?'Precisa de atenção':'Aguardando configuração')}</dd><dt>Última rotina local</dt><dd>${last?esc(new Date(last).toLocaleString('pt-BR')):'Nenhuma execução confirmada'}</dd><dt>Última captura neste vault</dt><dd>${value.captureObserved?esc(new Date(value.lastCapture.at).toLocaleString('pt-BR')):'Ainda sem mensagem recebida neste escopo'}</dd><dt>Agendamento externo</dt><dd>${value.registered?'Confirmado no Codex':value.scheduleState==='disabled'?'Não solicitado':'Pendente no Codex'}</dd></dl>
 <label class="ob-check"><input type="checkbox" id="maintenance-enabled" ${value.enabled?'checked':''} ${value.external?'disabled':''}>Manutenção local diária</label>
 <div class="ob-fields"><label for="maintenance-hour">Horário preferencial</label><select id="maintenance-hour">${Array.from({length:24},(_,h)=>`<option value="${h}" ${h===value.hour?'selected':''}>${String(h).padStart(2,'0')}:00</option>`).join('')}</select><label for="maintenance-zone">Fuso horário</label><input id="maintenance-zone" value="${esc(value.timezone)}" maxlength="80"></div>
 <label class="ob-check"><input type="checkbox" id="maintenance-capture" ${capture?'checked':''}>Capturar prompts e últimas respostas do workspace Oracle</label>
 <p class="muted">Somente mensagens novas recebidas por hooks que você confiou no Codex, inclusive quando o Oracle estiver fechado. Não lê histórico privado, transcrições, raciocínio ou resultados de ferramentas. As mensagens serão guardadas localmente e projetadas em INBOX/oracle-history/conversations. Reativar não recupera mensagens de uma autorização revogada.</p>
 <label class="ob-check"><input type="checkbox" id="maintenance-remote" ${remote?'checked':''}>Consolidar essas capturas na wiki usando o Codex</label>
 <p class="muted">Consentimento separado para processamento remoto. Usa o modelo configurado quando disponível na conta; sem conexão, a fase falha e pode ser retomada. Preserva sínteses com fontes e atualiza a página de memória em WIKI/Oracle. Edições manuais em conflito são preservadas; sua identidade não é alterada.</p>
 <p class="muted">Pausar interrompe novas capturas e a rotina diária; a indexação básica continua. Uma síntese em andamento recebe cancelamento. Conteúdo já enviado não pode ser recolhido. Mensagens já salvas não são apagadas.</p>
 <details><summary>Backup e agendamento</summary><p>Backup do banco exige o consentimento separado nos Ajustes de backup. Preparar um pedido não registra uma tarefa no host. O comando confere novamente consentimento e vault antes de executar; nenhum ID de tarefa é inventado.</p></details>
 <p role="status">${esc(value.message)}</p><p>Última tentativa: ${esc(value.lastRun?.status||'Nenhuma')}${value.lastRun?.message?' · '+esc(value.lastRun.message):''}. ${value.lastRun?.complete===false?'Há fases pendentes; a rotina completa não foi confirmada.':''}</p>
 ${actions('<button class="secondary" id="maintenance-run" '+(!value.enabled||value.external?'disabled':'')+'>Executar agora</button><button class="secondary" id="maintenance-request" '+(!value.enabled||value.external?'disabled':'')+'>Preparar pedido para o Codex</button><button class="primary" id="maintenance-save">Salvar preferências</button>')}`,{key:'maintenance-settings'});
 const updateConsentControls=()=>{const enabled=$('#maintenance-enabled').checked&&!value.external;$('#maintenance-capture').disabled=!enabled;$('#maintenance-remote').disabled=!enabled||!$('#maintenance-capture').checked;if($('#maintenance-remote').disabled)$('#maintenance-remote').checked=false};
 $('#maintenance-enabled').onchange=updateConsentControls;$('#maintenance-capture').onchange=updateConsentControls;updateConsentControls();
 $('#maintenance-save').onclick=safe(async()=>{const enabled=$('#maintenance-enabled').checked,capture=enabled&&$('#maintenance-capture').checked,remote=capture&&$('#maintenance-remote').checked;await call('configureMaintenance',{enabled,timezone:$('#maintenance-zone').value,hour:Number($('#maintenance-hour').value),autoCapture:capture,remoteProcessing:remote,consolidateWiki:remote,captureSource:capture?'codex_workspace_hooks_v1':null,synthesisScope:remote?'captured_messages_codex_v1':null});await refresh();await maintenanceSettings()});
 $('#maintenance-run').onclick=safe(async()=>{const result=await call('maintenanceRun');await maintenanceSettings();toast(result.status==='local_complete'?(result.complete?'Rotina local verificada.':'Parte local verificada; as demais fases continuam pendentes.'):'Manutenção não concluída: '+result.status)});
 $('#maintenance-request').onclick=safe(async()=>{const result=await call('maintenanceScheduleRequest');modal(`<h1>Pedido de agendamento</h1><p>Pedido preparado, ainda não registrado. O aplicativo oficial deverá localizar ou criar a tarefa e confirmar sua existência.</p><pre class="ob-readback">${esc(result.request)}</pre>${actions('<button class="primary" id="copy-maintenance-request">Copiar e abrir Codex</button>')}`);$('#copy-maintenance-request').onclick=safe(async()=>{await call('copy',{text:result.request},'instructions');await call('onboardingOpenCodex');})});
}
function renderPlayback(){
 const journal=replaySession?.kind==='journal',formation=atlasController?.getFormation(),playing=journal?!!timer:!!formation?.playing;
 const max=journal?Math.max(0,replaySession.events.length-1):1000;
 $('#timeline').max=max;$('#timeline').value=replay?(journal?cursor:Math.round((formation?.progress??1)*1000)):max;
 const phase=journal?'Histórico':({sun:'SOL',collections:'Conexões',skills:'Skills',complete:'Completo'}[formation?.phase]||'SOL');
 $('#replay-label').textContent=replay?phase:'Ao vivo';
 $('#play').innerHTML=icon(playing?'pause':'play');
 const label=playing?'Pausar timelapse':replay?'Retomar timelapse':'Iniciar timelapse';
 $('#play').setAttribute('aria-label',label);$('#play').dataset.tooltip=label;
 $('#timeline').setAttribute('aria-valuetext',replay?`${phase}, ${Math.round(Number($('#timeline').value)/Math.max(1,max)*100)}%`:'Visão atual');
 $('#live').disabled=!replay;$('#speed').setAttribute('aria-label',`Velocidade do timelapse: ${speed} vezes`);$('#reset-layout').disabled=replay;
}
function live(){
 clearInterval(timer);timer=null;replay=false;replayProjection=null;replaySession=null;
 atlasController?.setFormation({progress:1,playing:false});
 if(atlasController)atlasController.restoreLayout(state.config.layout);
 render();
}
async function ensureReplay(){
 if(replaySession)return;
 replaySession={kind:'formation',entries:structuredClone(state.entries),collections:structuredClone(state.collections)};
 cursor=0;selected=null;selectedSkill=null;replay=true;renderAtlas();atlasController?.fit();renderInspector();
 atlasController?.setFormation({progress:0,playing:false,duration:12000,rate:speed});
}
function projectReplay(){
 if(replaySession?.kind==='journal'){replayProjection=OracleReplay.projectJournal(replaySession.baseline,replaySession.events,cursor);renderAtlas();renderResults()}
 renderPlayback();
}
async function scrub(){
 const value=Number($('#timeline').value);clearInterval(timer);timer=null;await ensureReplay();replay=true;
 if(replaySession.kind==='journal'){cursor=value;projectReplay()}else{atlasController.setFormation({progress:value/1000,playing:false});renderPlayback()}
}
async function play(){
 visualPaused=false;$('#ambient-toggle').textContent='Pausar atmosfera';atlasController?.setPaused(document.hidden||window.oracleWindowVisible===false||view!=='map'||!!document.querySelector('dialog[open]'));
 if(replaySession?.kind==='journal'){
  if(timer){clearInterval(timer);timer=null;renderPlayback();return}
  const max=replaySession.events.length-1;if(cursor>=max)cursor=0;
  timer=setInterval(()=>{cursor=Math.min(cursor+1,max);if(cursor===max){clearInterval(timer);timer=null}projectReplay()},800/speed);renderPlayback();return;
 }
 await ensureReplay();replay=true;const current=atlasController.getFormation();
 atlasController.setFormation(current.playing?{playing:false}:{progress:current.progress>=1?0:current.progress,playing:true,duration:12000,rate:speed});renderPlayback();
}
async function startJournal(){
 const data=await call('replayData');if(!data.events?.length)throw Error('Nenhum histórico de instalação disponível.');
 clearInterval(timer);timer=null;replaySession={...data,kind:'journal'};cursor=0;replay=true;closeModal();projectReplay();
}
$('#search').onclick=()=>openSearch();$('#refresh').onclick=safe(async()=>{await refreshVault();toast(state.scanError|| (state.scan?.pending?'Leitura da pasta em andamento.':'Pasta relida.'),state.scanError?'error':state.scan?.pending?'info':'success')});$('#settings').onclick=settings;
$('#density').oninput=renderAtlas;$('#motion').checked=matchMedia('(prefers-reduced-motion: reduce)').matches;
$('#motion').onchange=safe(()=>saveVisualPreference('reduceMotion',$('#motion').checked));
$('#timeline').oninput=safe(scrub);$('#play').onclick=safe(play);$('#live').onclick=live;
$('#speed').onclick=()=>{speed=speed===4?1:speed*2;$('#speed').textContent=speed+'×';atlasController?.setFormation({rate:speed});if(timer){clearInterval(timer);timer=null;play()}renderPlayback()};
$('.wordmark').onclick=e=>{e.preventDefault();setView('map',()=>{renderAtlas();atlasController?.select(null);atlasController?.fit()})};
$('#updates').onclick=()=>{showUpdates(false).catch(e=>toast(e.message,'error'))};
function setZoom(factor){atlasController?.zoomAt(factor)}$('#zoom-in').onclick=()=>setZoom(1.2);$('#zoom-out').onclick=()=>setZoom(1/1.2);$('#zoom-reset').onclick=()=>atlasController?.fit();$('#context-back').onclick=()=>atlasController?.back();$('#reset-layout').onclick=()=>{atlasController?.reset();toast('Posições restauradas. Nenhum arquivo foi movido.','success')};$('#economy').onchange=safe(()=>saveVisualPreference('economy',$('#economy').checked));
function suspendInterface(){
 window.OracleUIRecovery?.clear();
 retainPluginEditorDraft();
 startupUpdateReady=false;resetUpdateTracking();
 window.OraclePortableUpdates?.reset();
 clearTimeout(toast.timer);toast.revision=(toast.revision||0)+1;const notice=$('#toast');if(typeof notice.hidePopover==='function'&&notice.matches(':popover-open'))notice.hidePopover();notice.hidden=true;notice.replaceChildren();document.body.append(notice);hideTooltip();
 OracleTransitions.reset();
 if(graphRenderFrame)cancelAnimationFrame(graphRenderFrame);if(graphEntranceFrame)cancelAnimationFrame(graphEntranceFrame);
 graphRenderFrame=0;graphEntranceFrame=0;graphEntrancePending=true;atlasRenderKey=null;treeRenderKey=null;departmentCatalogKey=null;departmentCatalogCache=null;$('#graph-page').inert=false;
 $('#app').dataset.startup='pending';
 view='map';$('#graph-page').hidden=false;$('#navigation-toggle').disabled=false;$$('.workspace-tabs [data-workspace]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.workspace==='map'));b.tabIndex=b.dataset.workspace==='map'?0:-1});
 $('#atlas').hidden=false;$('#results').hidden=true;$('.map-tools').hidden=false;
 OracleTransitions.indicator();
 window.OracleOnboarding?.suspend();OracleInstallationVisual.reset();refreshSequence++;navigationEpoch++;noteReadSequence++;refreshTask=null;
 memoryEpoch++;memoryPollTask=null;lastMemorySignature='';visualPending={};
 clearTimeout(initialScanTimer);initialScanRetries=0;clearTimeout(updatePolling);
 window.OraclePluginBridge?.cancelPending('O transporte do Oracle foi encerrado');
 for(const p of pending.values()){clearTimeout(p.timeout);p.reject(Error('O transporte do Oracle foi encerrado'));}pending.clear();
 replay=false;replayProjection=null;replaySession=null;closeModal(true);if(atlasController){atlasController.dispose();atlasController=null;}
 interfaceSuspended=true;$('#app').inert=true;state={entries:[],collections:[],events:[],config:{}};readDocument=null;editorSession=null;clearTimeout(draftTimer);
 $('#tree').oracleHTML=null;$('#tree').textContent='';$('#results').textContent='';$('#atlas').textContent='';$('#modal-content').textContent='';clearInterval(timer);timer=null;
};
// Deterministic ambient dust; it never represents an agent or event.
for(let i=0;i<46;i++){const e=document.createElement('i');e.className='star';e.style.cssText=`left:${(Math.sin(i*12.9898)*43758.5453%1+1)%1*100}%;top:${(Math.sin(i*78.233)*12731.7%1+1)%1*100}%;width:${i%7===0?2:1}px;height:${i%7===0?2:1}px;opacity:${i%5/18+.04}`;$('#galaxy').append(e)}
function markInterfaceReady(){window.oracleStartupRendered=true;void call('interfaceReady',{schema_version:1}).catch(()=>{});}
call('boot').then(async b=>{applyAccessibility(b.accessibility);if(b.locked)throw Error('O acesso ao Oracle foi interrompido. Reabra o aplicativo.');$('#app').inert=false;void OracleTransitions.enterApp();markInterfaceReady();await refresh();if(view==='map'&&graphEntrancePending)requestGraphEntrance();await mountOnboarding();finishUpdateStartup()}).catch(e=>{if(!interfaceSuspended){$('#app').inert=false;void OracleTransitions.enterApp();window.OracleUIRecovery?.show(e,recoverInterface);}toast(e.message,'error')});
let eventsPollTask=null;
setInterval(()=>{
 if(eventsPollTask||interfaceSuspended||document.hidden||window.oracleWindowVisible===false)return;
 const epoch=memoryEpoch;
 eventsPollTask=call('events').then(events=>{
  if(epoch!==memoryEpoch||interfaceSuspended||document.hidden||window.oracleWindowVisible===false)return;
  if(events.at(-1)?.event_id!==state.events.at(-1)?.event_id){state.events=events;renderProgress();renderAtlas();if(events.at(-1)?.phase&&!$('#modal').open)safe(refresh)()}
 }).catch(()=>{}).finally(()=>{eventsPollTask=null;});
},2500);
setInterval(()=>{if(!interfaceSuspended&&!document.hidden&&window.oracleWindowVisible!==false&&!$('#modal').open)safe(refresh)()},30000);
setInterval(()=>{void pollMemoryStatus();},1800);
// App RPC replies already reach their callers. Host notifications must not
// feed snapshot/refresh replies back into another snapshot request.
let pluginToolResultRefresh=null;
window.addEventListener('oracle-plugin-tool-result',event=>{
 if(event.detail?._meta?.['oracle/dispatch']||modalDirty||pluginToolResultRefresh)return;
 pluginToolResultRefresh=Promise.resolve().then(()=>window.oracleVaultSnapshotChanged?.()).catch(error=>toast(error.message,'error')).finally(()=>{pluginToolResultRefresh=null;});
});
window.addEventListener('oracle-plugin-tool-cancelled',event=>toast(event.detail.reason,'error'));
window.addEventListener('oracle-plugin-teardown',()=>suspendInterface());
window.addEventListener('oracle-plugin-teardown-error',event=>toast(event.detail.reason,'error'));
let pluginAccessibilityPoll=null;
setInterval(()=>{
 if(pluginAccessibilityPoll||!window.OraclePluginBridge?.active()||!window.OraclePluginBridge.initialized||document.hidden||window.oracleWindowVisible===false||interfaceSuspended)return;
 const epoch=memoryEpoch;
 pluginAccessibilityPoll=call('boot').then(boot=>{if(epoch!==memoryEpoch||document.hidden||interfaceSuspended)return;if(boot.locked)suspendInterface();else applyAccessibility(boot.accessibility);}).catch(()=>{}).finally(()=>{pluginAccessibilityPoll=null;});
},5000);
// Native filesystem scans publish immediately; polling remains a fallback for
// missed events and hidden windows. Never wait for the derived engine index.
window.oracleVaultSnapshotChanged=async()=>{
 if(interfaceSuspended||document.hidden)return;
 try{if(refreshTask)await refreshTask;await refresh();}catch(error){toast(error.message,'error');}
};

async function memory(){
 if(navigationBlocked())return;
 modal('<h1>Memória</h1><p>Conectando à sua biblioteca…</p>'+actions());
 const revision=modalRevision,epoch=navigationEpoch;let status;
 try{status=await call('gbrainRead',{operation:'status'});}catch(error){if(epoch!==navigationEpoch)return;modal(`<h1>Memória indisponível</h1><p role="alert">${esc(error.message)}</p>${actions('<button class="secondary" id="memory-retry">Tentar novamente</button>')}`,{key:'Memória'});$('#memory-retry').onclick=safe(memory);return;}
 if(epoch!==navigationEpoch||revision!==modalRevision||!$('#modal').open)return;
 modal(`<span class="step-label">${window.ORACLE_PREVIEW?'MEMÓRIA / DADOS SINTÉTICOS':'MEMÓRIA / SECOND BRAIN '+esc(status.version)}</span><h1>Memória</h1><p>Encontre suas notas e acompanhe suas conexões.</p><label class="field">Biblioteca<select id="memory-source">${status.sources.map(s=>`<option value="${esc(s.id)}">${esc(({default:'Geral','oracle-memory':'Memória do Oracle','oracle-vault':'Obsidian'})[s.id]||s.name||s.id)}</option>`).join('')}</select></label><label class="search"><input id="memory-query" placeholder="Buscar na memória" aria-label="Buscar na memória"></label><div id="memory-results"></div>${actions('<button class="primary" id="memory-search">Buscar</button>')}`);
 if(status.sources.some(s=>s.id==='oracle-vault'))$('#memory-source').value='oracle-vault';
 const freshness=document.createElement('div');freshness.id='memory-freshness';freshness.className='memory-freshness';freshness.setAttribute('role','status');$('.modal-body').prepend(freshness);renderMemoryFreshness();
 const update=document.createElement('button');update.className='secondary';update.textContent='Atualizar índice local';$('.modal-footer').prepend(update);
 update.onclick=safe(async()=>{state.memorySync=await call('memoryRefresh');renderMemoryFreshness();toast(state.memorySync.state==='current'?'Índice atualizado.':'Consulta do índice concluída. Há atualização pendente.',state.memorySync.state==='current'?'success':'info');});
 const source=()=>$('#memory-source').value;
 const viewRevision=modalRevision;let searchSequence=0;
 const renderHits=(hits,src)=>{
  $('#memory-results').innerHTML=hits.map((h,i)=>`<button class="result" data-memory-hit="${i}">${icon('note')}<div><strong>${esc(h.title||h.slug||h.page_slug)}</strong><small>${esc($('#memory-source').selectedOptions[0]?.textContent||'Biblioteca')}</small></div></button>`).join('')||'<p class="empty">Nenhum resultado nesta fonte.</p>';
  $$('[data-memory-hit]').forEach(e=>e.onclick=safe(()=>memoryPage(hits[Number(e.dataset.memoryHit)].slug||hits[Number(e.dataset.memoryHit)].page_slug,src)));
 };
 const search=async()=>{
  const sequence=++searchSequence,query=$('#memory-query').value,src=source();
  const current=()=>sequence===searchSequence&&viewRevision===modalRevision&&$('#modal').open;
  $('#memory-results').innerHTML='<p class="empty" role="status">Consultando esta fonte…</p>';
  $('#memory-results').setAttribute('aria-busy','true');
  try {
   if(!src)throw Error('Nenhuma fonte registrada');
   const hits=await call('gbrainRead',{operation:query?'search':'list',source:src,query});
   if(!current())return;
   if(hits.some(h=>h.source_id&&h.source_id!==src))throw Error('A origem dos resultados não corresponde à fonte selecionada.');
   renderHits(hits,src);
  }catch(e){if(current()){$('#memory-results').innerHTML='<p class="empty">Consulta não concluída.</p>';toast(e.message,'error')}}
  finally{if(current())$('#memory-results').setAttribute('aria-busy','false')}
 };
 $('#memory-search').onclick=search;$('#memory-query').onkeydown=e=>{if(e.key==='Enter')search()};$('#memory-source').onchange=search;if(status.sources.length)await search();
}
async function memoryPage(slug,source){
 const epoch=navigationEpoch,page=await call('gbrainRead',{operation:'get',source,slug});if(epoch!==navigationEpoch)return;if(!page)throw Error('Nota não encontrada');
 let links;try{links=await call('gbrainRead',{operation:'graph',source,slug});}catch(error){links={status:'unavailable',message:error.message};}if(epoch!==navigationEpoch)return;
 const canonical=page.canonical_path||page.frontmatter?.canonical_path||'',prefix=String(state.config.vault||'')+'/';
 const relative=source==='oracle-vault'&&canonical.startsWith(prefix)?canonical.slice(prefix.length):'';
 modal(`<h1>${esc(page.title||slug)}</h1><article class="markdown-reader">${markdown(page.compiled_truth||'')}</article><details class="source-details"><summary>Origem e conexões</summary><div class="source">${esc(source)} / ${esc(slug)}<br>${esc(canonical||page.frontmatter?.origin_source_path||'Caminho de origem não informado')}${page.indexed_hash?'<br>Versão indexada: '+esc(page.indexed_hash):''}</div><pre>${esc(JSON.stringify(links,null,2))}</pre></details>${actions()}`,{family:'reader',key:'memory:'+source+':'+slug});bindMarkdown($('#modal-content'),relative);
}
function renderMemoryFreshness(){
 const element=$('#memory-freshness');if(!element)return;
 const sync=state.memorySync||{},names={current:'Índice local atualizado.',stale:'Alterações aguardam verificação local.',partial:'A leitura ou indexação está parcial. Exclusões não serão reconciliadas.',external:'Perfil externo selecionado. Sua atualização é gerenciada pelo responsável dessa instalação.',unavailable:'Índice local ainda não disponível.'};
 const lastVerified=sync.state==='stale'&&sync.freshness==='unverified'&&sync.complete===true;
 element.textContent=(lastVerified?'Última verificação local concluída. A atualidade dos arquivos será conferida ao consultar ou atualizar o índice.':names[sync.state]||'Atualidade do índice ainda não verificada.')+(sync.indexing?' Indexação em andamento.':'')+(sync.error?' '+sync.error:'');
}
async function reviewGBrain(){const revision=modalRevision;const r=await call('gbrainReadback');if(revision!==modalRevision)return;if(!r.upstream_hash)throw Error('Seu contexto ainda não foi preparado. Continue pela configuração do Oracle.');modal(`<span class="step-label">REVISÃO DO SECOND BRAIN</span><h1>Revisar contexto</h1><p>Confira suas respostas registradas. Confirmações e alterações são feitas na configuração, vinculadas ao plano atual.</p><pre>${esc(window.OracleOnboarding?.formatReadback?.(r.readback)||r.readback)}</pre>${actions('<button class="primary" id="open-identity-setup">Abrir configuração</button>')}`);$('#open-identity-setup').onclick=()=>showSetup({fromSettings:true});}

function renderSkillInspector(){const path=selectedSkill,name=path.split('/').slice(-2,-1)[0],collection=state.collections.find(c=>c.id===selected);$('#inspector-title').textContent=name.replace(/-/g,' ');$('#inspector').innerHTML=`<span class="pill">Skill · ${esc(collection?.name||'')}</span><p class="muted">Um procedimento da sua coleção de especialistas.</p><button id="inspect-skill" class="primary">Ler procedimento</button><button id="edit-selected-skill" class="secondary">Editar</button><button id="focus-parent">Enquadrar coleção →</button>`;$('#inspect-skill').onclick=safe(()=>openNote(path));$('#edit-selected-skill').onclick=safe(async()=>{if(await openNote(path))editNote()});$('#focus-parent').onclick=()=>atlasController?.focus(selected)}

function graphicsDiagnostics(){modal(`<h1>Diagnóstico do atlas</h1><p>Medidas desta janela, sem estimar tempo de GPU. O movimento ambiental é separado de execução real do Codex.</p><pre>${esc(JSON.stringify(atlasController?.diagnostics()||{renderer:'SVG fallback',reason:atlasController?.renderError},null,2))}</pre>${actions()}`)}

window.oracleVisibility=visible=>{window.oracleWindowVisible=visible;atlasController?.setPaused(!visible||view!=='map'||visualPaused||$('#modal').open);document.body.classList.toggle('window-hidden',!visible);if(visible){maybeShowStartupUpdateNotice();refreshVisibleUpdateStatus()}};

$('#ambient-toggle').onclick=()=>{visualPaused=!visualPaused;$('#ambient-toggle').textContent=visualPaused?'Retomar atmosfera':'Pausar atmosfera';atlasController?.setPaused(visualPaused||document.hidden||view!=='map')};

function markdown(text){return OracleMarkdown.render(text)}
function scrollMarkdownFragment(fragment){
 if(!fragment)return;
 const normalized=String(fragment).normalize('NFC').toLocaleLowerCase('pt-BR'),slug=text=>text.replace(/[^\p{L}\p{N}_ -]/gu,'').trim().replace(/\s+/g,'-');
 const heading=[...document.querySelectorAll('.markdown-reader :is(h2,h3,h4,h5,h6)')].find(h=>{const text=h.textContent.normalize('NFC').toLocaleLowerCase('pt-BR');return text===normalized||slug(text)===normalized;});
 if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});heading.scrollIntoView({block:'start'});}
 else toast('Nota aberta; a seção citada não foi encontrada.');
}
function bindMarkdown(container,sourcePath=readDocument?.relative||''){
 container.querySelectorAll('[data-external]').forEach(e=>e.onclick=safe(()=>call('openExternal',{url:e.dataset.external})));
 container.querySelectorAll('[data-local]').forEach(e=>e.onclick=safe(async()=>{
  if(!sourcePath)throw Error('A origem local deste documento não foi confirmada. Abra a nota na fonte original.');
  const target=OracleMarkdown.resolveLocal(e.dataset.local,sourcePath,visibleEntries());
  if(await openNote(target.path))scrollMarkdownFragment(target.fragment);
 }));
 container.querySelectorAll('[data-wiki]').forEach(e=>e.onclick=safe(async()=>{
  let target;try{target=OracleMarkdown.resolveWiki(e.dataset.wiki,sourcePath,visibleEntries());}
  catch(error){openSearch(e.dataset.wiki.split('#')[0]);toast(error.message,'error');return;}
  if(await openNote(target.path))scrollMarkdownFragment(target.fragment);
 }));
}

$('#modal').addEventListener('close',()=>atlasController?.setPaused(document.hidden||window.oracleWindowVisible===false||view!=='map'||visualPaused));

function visibleEntries(){return replayProjection||(state.onboarding?.profileMode==="memory-only"?OracleInstallationVisual.projection(state).entries:state.entries)}
function timelineEvents(){return replay&&replaySession?.kind==='journal'?replaySession.events:state.events}

function setupContinuation(){modal(`<h1>Continuar sua configuração</h1><p>O plano confirmado permanece disponível. A retomada verifica o que já existe e continua pelos recibos, sem criar outro plano.</p><div class="source">Plano ${esc(state.setup.plan_id)}</div>${actions('<button class="primary" id="resume-setup">Abrir retomada local</button>')}`);$('#resume-setup').onclick=()=>showSetup()}

async function reviewBridge(){
 const connected=state.codexPlugins?.status==='available';
 modal(`<h1>Conexão Codex</h1>${statusBadge(connected?'connected':'unverified',connected?'Conectado':'Conexão não verificada')}<p>A conexão é opcional para tarefas remotas. A instalação, consulta e edição locais permanecem disponíveis offline.</p>${actions('<button class="secondary" id="bridge-codex">Abrir Codex</button><button class="primary" id="bridge-connect">Conexão e modelo</button>')}`);
 $('#bridge-codex').onclick=safe(()=>call('openCodex'));$('#bridge-connect').onclick=()=>showSetup({fromSettings:true,connection:true});
}

// One search surface serves the launcher, collection navigation and wiki links.
function openSearch(initial='',scope={}){
 if(navigationBlocked())return;
 const prefix=/^(SISTEMA|INBOX|PROJETOS|AREAS|WIKI|FONTES)\//i.test(initial)?initial:'';
 const catalog=departmentCatalog(),department=catalog.departmentByID.get(scope.department);
 let selectedIndex=0,hits=[],shown=0;
 modal(`<span class="step-label">MEU UNIVERSO</span><h1>Buscar notas e skills</h1>
 <label class="search search-field">${icon('search')}<input id="universe-query" type="search" autocomplete="off" spellcheck="false" aria-label="Buscar notas e skills" placeholder="Nome, assunto ou caminho…" value="${esc(prefix?'':initial)}" aria-controls="search-results"></label>
 ${prefix||department?`<button class="search-scope" id="clear-search-scope">${icon('folder')}${esc(department?.name||prefix)} ${icon('close')}</button>`:''}
 <div class="search-meta" id="search-count" role="status" aria-live="polite"></div>
 <div id="search-results" class="search-results" role="listbox" aria-label="Resultados da busca"></div>
 <div class="actions"><span class="keyboard-guide"><kbd>↑</kbd><kbd>↓</kbd> navegar <kbd>↵</kbd> abrir <kbd>esc</kbd> fechar</span></div>`,{family:'search',focus:'#universe-query'});
 const input=$('#universe-query');input.setAttribute('role','combobox');input.setAttribute('aria-expanded','true');input.setAttribute('aria-autocomplete','list');
 const select=(scroll=true)=>{const buttons=$$('#search-results [role=option]');buttons.forEach((b,i)=>{b.setAttribute('aria-selected',String(i===selectedIndex));b.classList.toggle('active',i===selectedIndex)});if(buttons[selectedIndex]){input.setAttribute('aria-activedescendant',buttons[selectedIndex].id);if(scroll)buttons[selectedIndex].scrollIntoView({block:'nearest'})}else input.removeAttribute('aria-activedescendant')};
 const open=safe(async index=>{const entry=hits[index];if(!entry)return;if(catalog.skillByPath.has(entry.path)){atlasController?.revealSkill(entry.path);renderInspector()}await openNote(entry.path)});
 const host=$('#search-results');
 const append=()=>{
  const start=shown;shown=Math.min(hits.length,shown+10);
  host.insertAdjacentHTML('beforeend',hits.slice(start,shown).map((e,j)=>{const i=start+j;return `<button role="option" aria-selected="${i===selectedIndex}" tabindex="-1" class="result" id="search-option-${i}" data-hit="${i}">${icon('note')}<div><strong>${esc(title(e))}</strong><small>${esc(entryLocation(e))}</small></div><span class="result-enter" aria-hidden="true">↵</span></button>`}).join(''));
  host.querySelectorAll('[data-hit]').forEach(b=>{b.onclick=()=>open(Number(b.dataset.hit));b.onpointermove=()=>{selectedIndex=Number(b.dataset.hit);select(false)}});
  $('#search-count').textContent=hits.length?`${shown} de ${hits.length} resultados`:'Nenhum resultado';
 };
 const search=()=>{
  const terms=OracleDepartments.normalize(input.value).split(/\s+/).filter(Boolean);
  hits=visibleEntries().filter(e=>!e.directory&&(terms.length||prefix||catalog.skillByPath.has(e.path))&&(!prefix||e.path===prefix||e.path.startsWith(prefix+'/'))&&(!department||catalog.skillByPath.get(e.path)?.department===department.id)&&terms.every(t=>OracleDepartments.normalize(title(e)+' '+e.path+' '+entryLocation(e)+' '+(catalog.departmentByID.get(catalog.skillByPath.get(e.path)?.department)?.name||'')).includes(t)));
  hits.sort((a,b)=>{const q=input.value.trim().toLowerCase();return Number(title(b).toLowerCase()===q)-Number(title(a).toLowerCase()===q)||title(a).localeCompare(title(b))});
  shown=0;selectedIndex=0;host.replaceChildren();host.scrollTop=0;append();
  if(!hits.length)host.innerHTML=`<div class="search-empty">${icon('search')}<h2>${input.value?'Não encontramos resultados.':'Nenhuma skill disponível.'}</h2><p>${input.value?'Experimente outro nome ou parte do caminho.':'Pesquise para encontrar outras notas do seu universo.'}</p></div>`;
  select(false);
 };
 const more=()=>{if(shown<hits.length&&host.scrollTop+host.clientHeight>=host.scrollHeight-60)append();};
 host.addEventListener('scroll',more,{passive:true});host.addEventListener('wheel',e=>{if(e.deltaY>0)more();},{passive:true});
 input.oninput=search;input.onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();selectedIndex=Math.max(0,Math.min(hits.length-1,selectedIndex+(e.key==='ArrowDown'?1:-1)));if(selectedIndex>=shown)append();select()}else if(e.key==='Enter'){e.preventDefault();open(selectedIndex)}};
 $('#clear-search-scope')?.addEventListener('click',()=>openSearch(input.value));search();
}

let tooltipTarget=null,tooltipTimer=null;
function hideTooltip(){clearTimeout(tooltipTimer);if(tooltipTarget){tooltipTarget.removeAttribute('aria-describedby');tooltipTarget=null}const tooltip=$('#tooltip');if(typeof tooltip.hidePopover==='function'&&tooltip.matches(':popover-open'))tooltip.hidePopover();tooltip.hidden=true}
function showTooltip(target,immediate=false){
 if(!target?.dataset.tooltip||target.disabled||target.closest('#atlas'))return;hideTooltip();tooltipTarget=target;
 const reveal=()=>{if(!target.isConnected)return;const tooltip=$('#tooltip');tooltip.textContent=target.dataset.tooltip;tooltip.hidden=false;if(typeof tooltip.showPopover==='function'){tooltip.setAttribute('popover','manual');tooltip.showPopover()}target.setAttribute('aria-describedby','tooltip');const r=target.getBoundingClientRect(),t=tooltip.getBoundingClientRect();tooltip.style.left=Math.max(12,Math.min(innerWidth-t.width-12,r.left+r.width/2-t.width/2))+'px';tooltip.style.top=(r.bottom+t.height+14>innerHeight?r.top-t.height-10:r.bottom+10)+'px'};
 if(immediate)reveal();else tooltipTimer=setTimeout(reveal,500);
}
// Tooltips live in the top layer when a modal is open, so dialog controls work too.
document.addEventListener('pointerover',e=>{const target=e.target.closest('[data-tooltip]');if(target&&target!==tooltipTarget)showTooltip(target)});
document.addEventListener('pointerout',e=>{if(tooltipTarget&&!tooltipTarget.contains(e.relatedTarget))hideTooltip()});
document.addEventListener('focusin',e=>{const target=e.target.closest('[data-tooltip]');if(target)showTooltip(target,true);else hideTooltip()});
document.addEventListener('pointerdown',hideTooltip);
// Keep logical focus for navigation, but distinguish pointer focus from keyboard focus.
document.documentElement.dataset.inputMode='keyboard';
function setInputMode(mode){if(document.documentElement.dataset.inputMode===mode)return;document.documentElement.dataset.inputMode=mode;if(atlasController)atlasController.universe?.sync(atlasController)}
document.addEventListener('pointerdown',()=>setInputMode('pointer'),true);
document.addEventListener('keydown',e=>{if(!['Shift','Control','Alt','Meta'].includes(e.key))setInputMode('keyboard')},true);
// WebKit on macOS does not focus every clicked control by default. Keep the
// native app's modal origin and keyboard controls consistent with the browser.
document.addEventListener('click',e=>{const control=e.target.closest('button,input[type=range],summary');if(control&&!control.disabled)control.focus({preventScroll:true})},true);
document.addEventListener('keydown',e=>{
 if(document.querySelector('.ob-dialog[open]')||$('#app').inert)return;
 if(e.key==='Escape'){hideTooltip();if(!e.defaultPrevented&&!document.querySelector('dialog[open]')&&view==='map'&&(atlasController?.selected||atlasController?.knowledge||atlasController?.department)){e.preventDefault();atlasController.back();}}
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!modalDirty)openSearch();}
 if(e.metaKey&&e.key===','){e.preventDefault();if(!modalDirty)settings();}
});

let updatePolling=null,updateBusy=false;
let updateOperation=null,updatePollPending=null,updatePollGeneration=-1;
let updateGeneration=0,updateRequestID=null,updateStarting=false,updatePollAgain=false,updateAutomatic=false;
const updateNames={oracle:'Oracle',gbrain:'Second Brain · GBrain',cognee:'Integração não adotada',skills:'Acervo',memory:'Índice do acervo'};
const updateStates={not_checked:'Não verificado',configured:'Disponível',current:'Em dia',updated:'Atualizado',available:'Atualização disponível',install_available:'Atualização disponível',download_available:'Nova versão disponível',publication_pending:'Publicação pendente',external:'Instalação existente',compatibility_required:'Aguardando validação',recovery_required:'Retomada necessária',not_adopted:'Não adotado',not_configured:'Fonte não configurada',rate_limited:'Consulta adiada',offline:'Sem conexão',error:'Consulta não concluída',preserved_edits:'Personalizações preservadas',rolled_back:'Restaurado'};
let startupUpdateReady=false,startupUpdateNoticeShown=false,latestUpdateStatus=null;
function updateRateLimitDate(status){const date=Date.parse(status?.rateLimitResetAt||'');return Number.isFinite(date)&&date>Date.now()?date:null;}
function updateCatalogInstallableNow(status){return status?.installableNow===true||(status?.installableNow==null&&status?.phase==='complete'&&status.results?.some(row=>row.status==='available'));}
function updateAppInstallableNow(status){return status?.applicationUpdateAvailableNow===true||(status?.applicationUpdateAvailableNow==null&&status?.phase==='complete'&&status.results?.some(row=>row.id==='oracle'&&row.status==='install_available'));}
function onboardingBlocksUpdates(){
 const onboarding={...state.onboarding,...window.OracleOnboarding?.getState?.()};
 return document.body.classList.contains('ob2-configuring')||!!document.querySelector('.ob2-screen[open],.ob2-activation[open]')||!!onboarding.integrationPending||!!(onboarding.runID&&onboarding.status!=='completed');
}
function maybeShowStartupUpdateNotice(){
 if(onboardingBlocksUpdates()||knowledgeWelcomePending())return;
 if(!startupUpdateReady||startupUpdateNoticeShown||!(updateCatalogInstallableNow(latestUpdateStatus)||updateAppInstallableNow(latestUpdateStatus))||latestUpdateStatus.busy||updateBusy||document.hidden||window.oracleWindowVisible===false||$('#app').inert||navigationBlocked()||$('#modal').open)return;
 const onboarding={...state.onboarding,...window.OracleOnboarding?.getState?.()};
 if(!onboarding.hasVault||(!onboarding.licensed&&!onboarding.legacyAccess)||(!onboarding.legacyAccess&&onboarding.status!=='completed')||['starting','running','cancelling','waiting_user'].includes(onboarding.status))return;
 if(!modal(`<h1>Atualização disponível</h1>${actions('<div id="update-notice-metal" data-update-effect></div>')}`,{family:'update-notice',root:true}))return;
 startupUpdateNoticeShown=true;
 mountUpdateMetal($('#update-notice-metal'),'Ver atualização',()=>showUpdates());
}
function finishUpdateStartup(){
 startupUpdateReady=true;
 scheduleAutomaticUpdateCheck();
 // Start the read-only check before the notice opens its dialog.
 if(latestUpdateStatus)maybeAutomaticUpdateCheck(latestUpdateStatus);
 maybeShowStartupUpdateNotice();
}
function reflectUpdateStatus(status,{authoritative=false}={}){
 if(!status||typeof status!=='object')return false;
 // A start acknowledgement is the only operation allowed to switch the request
 // being followed while it is busy. Older reads cannot terminate a newer run.
 if(!authoritative&&(updateStarting||(updateBusy&&updateRequestID&&status.requestID!==updateRequestID)))return false;
 if(!status.requestNotFound&&status.requestID&&status.requestID===latestUpdateStatus?.requestID&&Number.isFinite(status.revision)&&Number.isFinite(latestUpdateStatus.revision)&&status.revision<latestUpdateStatus.revision)return false;
 updateRequestID=status.requestID||null;
 if(status.operation)updateOperation=status.operation;
 latestUpdateStatus=status;updateBusy=!!status.busy;$('#updates').classList.toggle('busy',updateBusy);
 const onboardingBusy=onboardingBlocksUpdates();
 $('#updates').classList.toggle('update-ready',!onboardingBusy&&(updateCatalogInstallableNow(status)||updateAppInstallableNow(status)));
 const pending=!onboardingBusy&&(!!status.knownUpdate||!!status.available||!!status.applicationUpdateAvailable);
 const age=Date.now()-Date.parse(status.checkedAt||status.at||'');
 const recent=Number.isFinite(age)&&age>=-300000&&age<86400000;
 $('#updates').classList.toggle('available',pending);
 $('#updates').classList.toggle('stale',pending&&!recent);
 const label=updateBusy?(pending?'Atualizações — verificando; atualização conhecida':'Atualizações — verificando'):
  pending?(status.available||status.applicationUpdateAvailable?(recent?'Atualizações — atualização disponível':'Atualizações — atualização conhecida; verificar novamente'):updateNewsMessage(status)):'Atualizações';
 $('#updates').setAttribute('aria-label',label);$('#updates').dataset.tooltip='Atualizações';
 maybeShowStartupUpdateNotice();
 return true;
}
let automaticUpdateAttempt=0,automaticUpdateFailures=0,automaticUpdateTimer=null;
function scheduleAutomaticUpdateCheck(){
 clearTimeout(automaticUpdateTimer);
 automaticUpdateTimer=setTimeout(()=>{
  automaticUpdateTimer=null;
  if(startupUpdateReady&&latestUpdateStatus)maybeAutomaticUpdateCheck(latestUpdateStatus,{allowUpdateDialog:true});
  scheduleAutomaticUpdateCheck();
 },60000);
}
function maybeAutomaticUpdateCheck(status,{allowUpdateDialog=false}={}){
 if(!status||window.ORACLE_PREVIEW||state.config?.fixture||document.hidden||window.oracleWindowVisible===false||interfaceSuspended||updateBusy||status.busy)return;
 if($('#modal').open&&!(allowUpdateDialog&&$('#modal').dataset.family==='updates'))return;
 const onboarding={...state.onboarding,...window.OracleOnboarding?.getState?.()};
 // Discovery does not depend on Codex hooks being trusted or on resuming a
 // paused installation. Only an active installation retains exclusive priority.
 if(!onboarding.hasVault||(!onboarding.licensed&&!onboarding.legacyAccess)||['starting','running','cancelling','waiting_user'].includes(onboarding.status))return;
 if(updateRateLimitDate(status))return;
 const now=Date.now(),checked=Date.parse(status.checkedAt||(status.phase==='complete'?status.at:'')||'');
 const hasError=status.phase==='failed'||status.results?.some(r=>['error','offline'].includes(r.status));
 if(automaticUpdateAttempt&&!hasError&&status.phase!=='deferred'&&Number.isFinite(checked)&&now-checked>=0&&now-checked<3600000)return;
 const delay=Math.min(3600000,300000*2**Math.min(automaticUpdateFailures,4));
 if(automaticUpdateAttempt&&now-automaticUpdateAttempt<delay)return;
 automaticUpdateAttempt=now;
 void startUpdateRequest('check-only',true);
}
function updateResultRows(status){
 const displayed=new Map([{id:'oracle',status:'not_checked'},{id:'skills',status:'not_checked'},{id:'gbrain',status:'not_checked',version:status.gbrain_version},...(status.lastVerifiedResults||[]),...(status.pendingUpdates||[])].map(row=>[row.id,row]));
 for(const row of status.results||[]){
  const known=displayed.get(row.id);
  displayed.set(row.id,known&&['offline','error','rate_limited','not_checked'].includes(row.status)?{...known,...row,lastVerified:known}:row);
 }
 const integration=displayed.get('codex'),catalog=displayed.get('skills');
 if(integration&&catalog)displayed.set('skills',{...catalog,localIntegration:integration});
 return [...displayed.values()].filter(row=>row.id!=='codex'&&row.status!=='not_adopted');
}
function updateNewsMessage(status){
 if(status.applicationUpdateAvailable)return 'Uma nova versão do Oracle está disponível para instalar.';
 const rows=[...(status.results||[]),...(status.pendingUpdates||[])];
 if(rows.some(row=>row.publicationPending||row.status==='publication_pending'))return 'Há alterações no GitHub aguardando publicação para os usuários.';
 if(status.knownUpdate)return 'Há uma versão nova aguardando compatibilidade.';
 return 'Verificação concluída.';
}
function oracleInstallable(row){
 if(window.OraclePluginBridge?.active()&&row?.id==='oracle'&&row.pluginUpdate===true&&row.channel==='desktop-plugin')return row.status==='install_available'&&/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(row.version||'');
 if(row?.id!=='oracle'||row.status!=='install_available'||!/^sha256:[a-f0-9]{64}$/.test(row.downloadSHA256||''))return false;
 if(!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(row.version||''))return false;
 try{
  const url=new URL(row.downloadURL),prefix='/nitroxinteligence/ORACLE/releases/download/v'+row.version+'/',name='Oracle-'+row.version+'-macos-arm64.zip';
  return url.protocol==='https:'&&url.hostname==='github.com'&&!url.port&&!url.username&&!url.password&&!url.search&&!url.hash&&url.pathname===prefix+name;
 }catch{return false;}
}
function updateRowMarkup(row){
 const pendingPublication=row.status==='publication_pending',integration=row.localIntegration;
 const message=pendingPublication&&row.publicationPending?(row.id==='oracle'?'Há alterações no GitHub aguardando um novo instalador.':'Há novos arquivos no GitHub aguardando publicação no acervo.'):pendingPublication?(row.publicationMessage||row.message):row.message;
 const counts=row.counts;
 const countText=counts&&Number.isSafeInteger(counts.skills)&&counts.skills>=0?`${counts.skills} skills`:'';
 const version=row.id==='oracle'?`Neste Mac: ${row.installedVersion||'não informado'} · Publicada: ${row.version||'não consultada'}`:row.version?'Versão '+row.version:'';
 const last=row.lastVerified,known=last&&['available','install_available','download_available','compatibility_required','publication_pending'].includes(last.status);
 const retained=last?`<p>${known?'Atualização conhecida':'Última verificação válida preservada'}${last.version?' · versão '+esc(last.version):''}. Nenhuma instalação será iniciada até uma nova consulta válida.</p>`:'';
 return `<section class="update-result ${['available','install_available','download_available'].includes(row.status)?'update-success':['error','offline'].includes(row.status)?'update-failure':''}" data-update-channel="${esc(row.id)}"><div>${icon(row.id==='oracle'?'refresh':row.id==='skills'?'folder':'brain')}<h2>${updateNames[row.id]||esc(row.id)}</h2>${statusBadge(row.status,updateStates[row.status]||'Não verificado')}</div>${row.id==='skills'?'<small>Skills</small>':''}<p>${esc(message||'Use Verificar para consultar esta fonte.')}</p>${version?`<small>${esc(version)}</small>`:''}${countText?`<small>${esc(countText)}</small>`:''}${row.publicationMessage&&!pendingPublication?`<p>${esc(row.publicationMessage)}</p>`:''}${pendingPublication&&row.publishedStatus?'<small>Pacote publicado conferido; novidades ainda não incluídas.</small>':''}${integration?`<details${['error','offline'].includes(integration.status)?' open':''}><summary>Integração com o Codex</summary><p>${esc(integration.message||'O reconhecimento das skills no Codex tem uma verificação própria.')}</p></details>`:''}${retained}${oracleInstallable(row)&&!last?'<button class="secondary" id="install-oracle-update">Atualizar e reiniciar</button>':''}</section>`;
}
const updateEffectHosts=new Set();
function cleanUpdateEffects(){for(const host of updateEffectHosts)if(!host.isConnected||!host.closest('dialog')?.open){OracleOnboardingEffects.destroy(host);updateEffectHosts.delete(host)}}
function mountUpdateMetal(host,label,action){
 if(!host)return;cleanUpdateEffects();updateEffectHosts.add(host);
 OracleOnboardingEffects.button(host,{label,onClick:()=>Promise.resolve(action()).catch(e=>toast(e.message,'error'))});
}
function mountUpdateBeam(host){if(host){updateEffectHosts.add(host);OracleOnboardingEffects.beam(host)}}
function updateStatusMarkup(){return '<div class="update-status" role="status" aria-live="polite"><div class="ob2-status-body"><span id="update-message">Consultando atualizações…</span><progress id="update-progress" aria-label="Progresso da atualização"></progress></div></div>'}
function renderUpdateStatus(status,options){
 if(!reflectUpdateStatus(status,options))return false;cleanUpdateEffects();
 const family=$('#modal').dataset.family;
 if(!$('#modal').open||!['updates','update-installing'].includes(family))return;
 const failed=status.phase==='failed'||status.phase==='interrupted'||status.results?.some(r=>['error','offline'].includes(r.status));
 const succeeded=!updateBusy&&!failed&&status.phase==='complete';
 const installationResults=(status.results||[]).filter(row=>row.id!=='oracle');
 const installComplete=succeeded&&status.operation!=='check-only'&&installationResults.length>0&&installationResults.every(r=>['current','updated','external','rolled_back','preserved_edits','not_adopted','not_configured'].includes(r.publishedStatus||r.status));
 const message=$('#update-message'),progress=$('#update-progress');if(!message||!progress)return;
 message.textContent=updateBusy?(status.message||'Verificando e preparando…'):failed?(status.error||status.results?.find(r=>['error','offline'].includes(r.status))?.message||status.message||'Não foi possível concluir a atualização.'):!succeeded?(status.message||'Use Verificar para consultar as atualizações.'):family==='update-installing'?(installComplete?'Acervo e motor conferidos. Veja os resultados por componente.':status.message||'Verificação concluída; confira os componentes.'):status.available?'Há uma atualização pronta para instalar.':updateNewsMessage(status);
 message.classList.toggle('update-ready-badge',!!succeeded&&(family!=='update-installing'||!!installComplete));message.classList.toggle('update-error',!!failed&&!updateBusy);
 progress.hidden=!updateBusy;
 const total=Number(status.total)||Number(status.bytes_total),done=Number(status.total)?Number(status.completed):Number(status.bytes_downloaded);
 if(total>0&&Number.isFinite(done)){progress.max=total;progress.value=Math.max(0,Math.min(total,done));progress.setAttribute('aria-valuetext',Math.floor(progress.value/total*100)+'% da etapa atual');}else {progress.removeAttribute('value');progress.removeAttribute('aria-valuetext');}
 let cancel=$('#update-cancel-wait');
 if(updateBusy&&status.canCancelWait&&!cancel){cancel=document.createElement('button');cancel.id='update-cancel-wait';cancel.className='secondary';cancel.textContent='Cancelar espera';cancel.onclick=()=>{void cancelUpdateWait()};message.parentElement.append(cancel);}
 if(cancel){cancel.hidden=!(updateBusy&&status.canCancelWait);cancel.disabled=false;}
 if(family==='update-installing'){
  $('#modal-title').textContent=updateBusy?(status.phase==='waiting'?'Aguardando para atualizar…':status.operation==='check-only'?'Verificando atualizações…':'Atualizando acervo e Second Brain…'):installComplete?'Atualização concluída':status.operation==='check-only'&&succeeded?'Verificação concluída':'Atualização não concluída';
  let finish=$('#update-finish');if(!updateBusy&&!finish){finish=document.createElement('button');finish.id='update-finish';finish.className='secondary';finish.textContent='Voltar às atualizações';finish.onclick=()=>{void showUpdates()};message.parentElement.append(finish)}if(finish)finish.hidden=updateBusy;return;
 }
 const limitedUntil=updateRateLimitDate(status),check=$('#check-updates');check.disabled=updateBusy||!!limitedUntil;check.textContent=limitedUntil?'Verificar após '+new Date(limitedUntil).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'Verificar';
 const applyHost=$('#apply-update-metal'),apply=applyHost?.querySelector('button');applyHost.hidden=!updateCatalogInstallableNow(status);if(apply)apply.disabled=updateBusy||!!limitedUntil;
 const results=updateResultRows(status);
 const resultsHTML=results.map(updateRowMarkup).join('');
 const resultsHost=$('#update-results');
 if(!(updateBusy&&!status.results?.length&&resultsHost.children.length)&&resultsHost.oracleHTML!==resultsHTML){resultsHost.innerHTML=resultsHTML;resultsHost.oracleHTML=resultsHTML;}
 const appUpdate=$('#install-oracle-update');
 if(appUpdate){appUpdate.disabled=updateBusy;appUpdate.onclick=safe(async()=>{const row=updateResultRows(latestUpdateStatus).find(item=>item.id==='oracle');if(!oracleInstallable(row))throw Error('Verifique novamente para obter a atualização publicada.');appUpdate.disabled=true;appUpdate.textContent='Preparando atualização…';const result=await call('installOracleUpdate');if(result?.cancelled){appUpdate.textContent='Instalar atualização';return}if(window.OraclePluginBridge?.active()&&result?.installed===true&&result.restartRequired===true){appUpdate.textContent='Atualizar e reiniciar';toast(result.message||'Atualização instalada. Reabra o Oracle no Codex.','success');return}if(!result?.restarting)throw Error('O Oracle não confirmou o reinício da atualização.');appUpdate.textContent='Reiniciando…';});}
 const recoveryHTML=(status.gbrain_rollback?'<button class="secondary" data-rollback="rollback-gbrain">Restaurar Second Brain</button>':'')+(status.skills_rollback?'<button class="secondary" data-rollback="rollback-skills">Restaurar acervo anterior</button>':'');
 const recovery=$('#update-recovery');if(recovery.oracleHTML!==recoveryHTML){recovery.innerHTML=recoveryHTML;recovery.oracleHTML=recoveryHTML;}
 $$('[data-rollback]').forEach(b=>{b.disabled=updateBusy;b.onclick=()=>showUpdates(b.dataset.rollback).catch(e=>toast(e.message,'error'))});
}
function resetUpdateTracking(){
 updateGeneration++;clearTimeout(updatePolling);updatePolling=null;
 updatePollPending=null;updatePollGeneration=-1;updatePollAgain=false;
 updateRequestID=null;updateOperation=null;updateStarting=false;updateBusy=false;updateAutomatic=false;latestUpdateStatus=null;
}
function refreshVisibleUpdateStatus(){
 if(document.hidden||window.oracleWindowVisible===false||interfaceSuspended)return;
 if(updateBusy||($('#modal').open&&['updates','update-installing'].includes($('#modal').dataset.family)))void pollUpdateStatus({fresh:true});
 else if(startupUpdateReady&&latestUpdateStatus)maybeAutomaticUpdateCheck(latestUpdateStatus);
}
async function pollUpdateStatus({fresh=false}={}){
 if(state.features?.updates===false)return null;
 if(interfaceSuspended)return null;
 // Polling follows an operation, not a modal/navigation epoch. Reopening asks for
 // one fresh read after a pending read; a new click need not wait for an old one.
 if(updatePollPending&&updatePollGeneration===updateGeneration){if(fresh)updatePollAgain=true;return updatePollPending;}
 const generation=updateGeneration,requestID=(updateBusy||updateStarting)?updateRequestID:null;
 let retryDelay=800;
 const task=(async()=>{
  try{
   let status=await call('updateStatus',requestID?{requestID}:{});
   if(generation!==updateGeneration||interfaceSuspended)return null;
   if(status?.requestNotFound&&requestID)status={...status,requestID,busy:false,phase:'interrupted',message:'O pedido não foi encontrado. Verifique novamente antes de instalar.',results:[]};
   renderUpdateStatus(status);
   if(updateAutomatic&&!updateBusy){automaticUpdateFailures=(status.phase==='failed'||status.results?.some(r=>['error','offline'].includes(r.status)))?automaticUpdateFailures+1:0;updateAutomatic=false;}
   return status;
  }catch(e){
   if(generation!==updateGeneration||interfaceSuspended)return null;
   retryDelay=1800;
   const message=$('#update-message');if(message&&$('#modal').open)message.textContent='Não foi possível consultar o progresso. Tentando novamente…';
   if(!updateBusy&&$('#modal').open)toast(e.message,'error');
   return null;
  }finally{
   if(updatePollPending===task){updatePollPending=null;updatePollGeneration=-1;}
   if(generation===updateGeneration&&!interfaceSuspended){
    const again=updatePollAgain;updatePollAgain=false;
    if(updateBusy||again){clearTimeout(updatePolling);updatePolling=setTimeout(()=>{void pollUpdateStatus()},again?0:retryDelay);}
   }
  }
 })();updatePollPending=task;updatePollGeneration=generation;return task;
}
async function startUpdateRequest(operation,automatic=false){
 if(updateBusy||updateStarting)return pollUpdateStatus({fresh:true});
 if(!automatic)automaticUpdateAttempt=Date.now();
 const generation=++updateGeneration,requestID=window.crypto.randomUUID();
 clearTimeout(updatePolling);updatePollAgain=false;updateStarting=true;updateAutomatic=automatic;updateOperation=operation;
 updateRequestID=requestID;
 renderUpdateStatus({...latestUpdateStatus,requestID,operation,revision:-1,busy:true,phase:operation==='check-only'?'checking':'preparing',message:operation==='check-only'?'Verificando atualizações…':'Preparando a atualização…',error:null,results:[],canCancelWait:false,completed:0,total:0,bytes_downloaded:0,bytes_total:0},{authoritative:true});
 try{
  const response=await call('updateStart',{operation,requestID,automatic});
  if(generation!==updateGeneration||interfaceSuspended)return null;
  updateStarting=false;
  if(!response||typeof response.requestID!=='string'||!response.status||response.status.requestID!==response.requestID)throw Error('Não foi possível confirmar o início. Conferindo o pedido antes de tentar novamente.');
  updateRequestID=response.requestID;updateOperation=response.operation||response.status.operation;
  renderUpdateStatus(response.status,{authoritative:true});
 }catch(e){
  if(generation!==updateGeneration||interfaceSuspended)return null;
  updateStarting=false;
  // A lost acknowledgement is not permission to resend an installation. Read
  // this exact request first; the native side deduplicates by request ID too.
  renderUpdateStatus({...latestUpdateStatus,busy:true,phase:'checking',message:e.message,canCancelWait:false},{authoritative:true});
 }
 return pollUpdateStatus({fresh:true});
}
async function cancelUpdateWait(){
 if(!latestUpdateStatus?.canCancelWait||!updateRequestID)return;
 const generation=updateGeneration,requestID=updateRequestID,button=$('#update-cancel-wait');if(button)button.disabled=true;
 try{
  const response=await call('updateCancel',{requestID});
  if(generation!==updateGeneration||requestID!==updateRequestID||interfaceSuspended)return;
  if(response?.status)renderUpdateStatus(response.status);else if(response?.requestID)renderUpdateStatus(response);
  toast('Pedido de pausa recebido. Confira o estado da atualização.');
 }catch(e){if(generation===updateGeneration)toast(e.message,'error');}
 finally{if(generation===updateGeneration){if(button?.isConnected)button.disabled=false;void pollUpdateStatus({fresh:true});}}
}
async function showUpdates(operation=null){
 if(state.features?.portableUpdates===true)return window.OraclePortableUpdates.open({call,modal,toast,refresh,actions,icon,statusBadge,mountMetal:mountUpdateMetal,mountBeam:mountUpdateBeam});
 if(state.features?.updates===false){
  modal('<h1>Atualizações</h1><p>Esta versão do plugin recebe atualizações pela instalação de um novo pacote no ChatGPT ou Codex.</p><p>A atualização automática dentro do Oracle ainda não está disponível.</p>',{family:'updates',root:true});
  return;
 }
 startupUpdateNoticeShown=true;
 if(operation===false)operation=null;if(operation===true)operation='check-apply';
 const starting=!!operation&&!updateBusy,installing=starting?operation!=='check-only':updateBusy&&updateOperation&&updateOperation!=='check-only';
 const family=installing?'update-installing':'updates';
 if(!$('#modal').open||$('#modal').dataset.family!==family){
  const content=installing?`<h1>Atualizando acervo e Second Brain…</h1>${updateStatusMarkup()}`:`<h1>Atualizações</h1><p>Oracle, acervo e Second Brain têm atualizações independentes. A consulta é automática ao abrir e a cada hora de uso; a instalação depende da sua escolha.</p>${updateStatusMarkup()}<div id="update-results" class="update-results"></div><div id="update-recovery" class="recovery-actions"></div>${actions('<button class="update-check-text" id="check-updates">Verificar</button><div id="apply-update-metal" data-update-effect></div>')}`;
  if(!modal(content,{family,root:true}))return;
  cleanUpdateEffects();if(installing){const beam=document.createElement('div');beam.className='ob2-beam update-modal-beam';beam.setAttribute('aria-hidden','true');$('#modal').prepend(beam);mountUpdateBeam(beam);}
  if(!installing){$('#check-updates').onclick=()=>{showUpdates('check-only').catch(e=>toast(e.message,'error'))};mountUpdateMetal($('#apply-update-metal'),'Instalar atualização',()=>showUpdates('check-apply'));}
 }
 renderUpdateStatus(latestUpdateStatus||{busy:false,phase:'idle',results:[]});
 if(starting)return startUpdateRequest(operation);
 clearTimeout(updatePolling);const status=await pollUpdateStatus({fresh:true});
 if(status)maybeAutomaticUpdateCheck(status,{allowUpdateDialog:true});
}
new MutationObserver(cleanUpdateEffects).observe($('#modal-content'),{childList:true,subtree:true});
document.addEventListener('close',e=>{if(e.target===$('#modal'))cleanUpdateEffects()},true);

// Panels expand from their own controls. The stage's ResizeObserver preserves camera scale.
let autoHiddenNavigation=false;
function toggleObservatory(open=!document.body.classList.contains('observatory-open')){
 if(open&&!document.body.classList.contains('observatory-open'))$('#observatory-plugins')?.removeAttribute('open');
 if(open&&innerWidth<=1050&&!document.body.classList.contains('navigation-closed')){autoHiddenNavigation=true;toggleNavigation(false)}
 document.body.classList.toggle('observatory-open',open);$('#observatory-panel').hidden=!open;
 if(!open){if(autoHiddenNavigation){autoHiddenNavigation=false;toggleNavigation(true)}($('#atlas [aria-pressed="true"]')||$('#navigation-toggle')).focus({preventScroll:true})}
}
function toggleNavigation(open=document.body.classList.contains('navigation-closed')){
 document.body.classList.toggle('navigation-closed',!open);$('#navigation-toggle').setAttribute('aria-expanded',String(open));
 if(open&&innerWidth<=1050&&document.body.classList.contains('observatory-open'))toggleObservatory(false);
}
$('#observatory-close').onclick=()=>toggleObservatory(false);
$('#navigation-toggle').onclick=()=>toggleNavigation();
$('#replay-restart').onclick=safe(async()=>{live();await ensureReplay();atlasController.setFormation({progress:0,playing:true,duration:12000,rate:speed});renderPlayback()});
$('#atlas').addEventListener('oracle:formation',()=>{if(replay&&replaySession?.kind==='formation')renderPlayback()});

const systemVisual={reduceMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,reduceTransparency:matchMedia('(prefers-reduced-transparency: reduce)').matches};
let visualPending={},visualWrites=Promise.resolve(),visualRevision=0;
function applyVisualPreferences(redraw=true){
 const saved=state.config.visualPreferences||{};
 for(const [key,id] of [['reduceMotion','motion'],['reduceTransparency','transparency'],['economy','economy']]){
  const control=$('#'+id),forced=systemVisual[key]===true;
  control.checked=forced||(visualPending[key]?.value??saved[key]??false);control.disabled=forced;
  control.title=forced?'Definido pelas opções de acessibilidade do macOS':'';
 }
 document.body.classList.toggle('reduced',$('#motion').checked);document.body.classList.toggle('reduce-transparency',$('#transparency').checked);
 if($('#motion').checked)OracleTransitions.finish();
 if(redraw&&atlasController)renderAtlas();
}
async function saveVisualPreference(key,value){
 const epoch=memoryEpoch,revision=++visualRevision;visualPending[key]={value:!!value,revision};applyVisualPreferences();
 const task=visualWrites.catch(()=>{}).then(async()=>{
  if(epoch!==memoryEpoch)throw Error('Preferência cancelada após bloqueio.');
  if(window.ORACLE_PREVIEW)return {...state.config.visualPreferences,[key]:!!value};
  return call('saveVisualPreferences',{[key]:!!value});
 });visualWrites=task;
 try{const saved=await task;if(epoch===memoryEpoch){state.config.visualPreferences={...state.config.visualPreferences,...saved};toast('Preferência salva.','success')}}
 finally{if(epoch===memoryEpoch&&visualPending[key]?.revision===revision){delete visualPending[key];applyVisualPreferences();}}
}
function applyAccessibility(value={}){
 for(const key of ['reduceMotion','reduceTransparency'])if(typeof value[key]==='boolean')systemVisual[key]=value[key];
 applyVisualPreferences();
}
function buildDescription(){const b=state.build||{};return `Oracle ${b.version||'versão não registrada'} · ${b.channel||'canal não registrado'} · commit ${String(b.commit||'não registrado').slice(0,12)}${b.dirty?' · alterações locais':''} · build ${b.buildID||'não registrado'}`;}
window.oracleAccessibility=applyAccessibility;
$('#transparency').checked=matchMedia('(prefers-reduced-transparency: reduce)').matches;
$('#transparency').onchange=safe(()=>saveVisualPreference('reduceTransparency',$('#transparency').checked));
for(const [key,query] of [['reduceMotion','(prefers-reduced-motion: reduce)'],['reduceTransparency','(prefers-reduced-transparency: reduce)']])matchMedia(query).addEventListener('change',event=>applyAccessibility({[key]:event.matches}));
if(innerWidth<=1050)toggleNavigation(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').open){if(document.body.classList.contains('observatory-open'))toggleObservatory(false)}});


window.addEventListener('oracle:onboarding-progress',event=>{
 if(interfaceSuspended)return;
 state.onboarding={...state.onboarding,...event.detail};
 if(!replay)renderAtlas();
 void maybeShowKnowledgeWelcome();
});

// Includes the onboarding dialog. Opening a modal pauses visual time, never the executor.
function syncFloatingSurfaces(){
 const anyModal=!!document.querySelector('dialog[open]');
 const installationCard=document.querySelector('.ob-progress-card');
 document.body.classList.toggle('has-installation-progress',!!installationCard&&!installationCard.hidden);
 atlasController?.setPaused(document.hidden||window.oracleWindowVisible===false||view!=='map'||visualPaused||anyModal);
 if(!anyModal){void maybeShowKnowledgeWelcome();maybeShowStartupUpdateNotice();}
}
document.addEventListener('visibilitychange',()=>{maybeShowStartupUpdateNotice();refreshVisibleUpdateStatus()});
document.addEventListener('close',()=>queueMicrotask(maybeShowStartupUpdateNotice),true);
const floatingSurfaceObserver=new MutationObserver(records=>{if(records.some(r=>r.target instanceof Element&&(r.target.matches('dialog,.ob-progress-card')||r.type==='childList'&&[...r.addedNodes].some(n=>n instanceof Element&&n.matches('.oracle-onboarding')))))syncFloatingSurfaces()});
floatingSurfaceObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open','hidden'],childList:true});

async function backupSettings(){
 const value=await call('backupStatus'),last=value.lastRun||{},id=last.id||last.backup_id;
 const verified=last.complete===true&&last.integrity_verified===true;
 modal(`<h1>Backup privado do banco</h1><p>Cópia local do banco do Second Brain, sem envio remoto. Não inclui Markdown, anexos ou todo o aplicativo. No mesmo disco, não protege contra perda física. Os arquivos são privados, mas não têm criptografia própria.</p><label class="ob-check"><input type="checkbox" id="backup-enabled" ${value.enabled?'checked':''} ${!value.available?'disabled':''}>Autorizar backup privado para este vault</label><p>Consentimento separado da manutenção, captura e processamento remoto. Quando autorizado, a manutenção cria o backup depois da sincronização. Você também pode criar uma cópia manual.</p>${!value.available?'<p role="alert">Configure o perfil local Oracle e autorize seu acesso antes de habilitar backups. Instalações externas são preservadas.</p>':''}<dl class="ob-review"><dt>Última operação verificada</dt><dd>${verified?(last.restore_verified?'Restauração de teste verificada, sem ativação':'Integridade verificada; restauração ainda não testada'):'Nenhuma operação confirmada'}</dd><dt>Identificador</dt><dd>${esc(id||'Nenhum')}</dd></dl><p>A verificação de integridade não prova uma restauração. Restaurar para teste exige confirmação e cria um estado novo, sem substituir ou ativar o banco atual.</p>${actions('<button class="secondary" id="backup-save">Salvar consentimento</button><button class="primary" id="backup-create" '+(!value.enabled?'disabled':'')+'>Criar backup</button><button class="secondary" id="backup-verify" '+(!value.available||!id?'disabled':'')+'>Verificar integridade</button><button class="secondary" id="backup-restore" '+(!value.available||!id?'disabled':'')+'>Testar restauração…</button>')}`,{key:'backup-settings'});
 $('#backup-save').onclick=safe(async()=>{await call('configureBackup',{enabled:$('#backup-enabled').checked});await backupSettings();toast('Preferência de backup salva.','success')});
 $('#backup-create').onclick=safe(async()=>{await call('backupCreate');await backupSettings();toast('Backup criado e integridade verificada. A restauração ainda não foi testada.')});
 $('#backup-verify').onclick=safe(async()=>{await call('backupVerify',{id});await backupSettings();toast('Integridade verificada. Isso não confirma uma restauração.')});
 $('#backup-restore').onclick=()=>{
  modal(`<h1>Testar restauração?</h1><p>O backup ${esc(id)} será restaurado somente em um estado privado novo. O banco ativo e os documentos do vault não serão substituídos. Esta operação não ativa o estado restaurado.</p>${actions('<button class="secondary" id="backup-restore-cancel">Voltar</button><button class="primary" id="backup-restore-confirm">Confirmar restauração de teste</button>')}`);
  $('#backup-restore-cancel').onclick=safe(backupSettings);
  $('#backup-restore-confirm').onclick=safe(async()=>{await call('backupRestore',{id,confirmed:true});await backupSettings();toast('Restauração de teste verificada em estado novo. O banco ativo foi preservado.')});
 };
}

let knowledgeWelcomeBusy=false;
const knowledgeWelcomeShown=new Set();
function knowledgeWelcomePending(){return OracleKnowledgePrompts.welcomeEligible(state.onboarding,state.config.vault)&&!knowledgeWelcomeShown.has(JSON.stringify([state.onboarding.runID,state.config.vault]));}
function knowledgeContext(){return OracleKnowledgePrompts.context(state.config.vault,state.entries);}
function bindKnowledgeCopy(ctx){
 $$('[data-open-knowledge]').forEach(button=>button.onclick=safe(async()=>{
  const id=button.dataset.openKnowledge;button.disabled=true;
  try{
   const latest=await call('snapshot');
   if(latest.config.vault!==ctx.vault)throw Error('A pasta selecionada mudou. Reabra Knowledge Base para abrir o roteiro correto.');
   const fresh=OracleKnowledgePrompts.context(latest.config.vault,latest.entries);
   const area=fresh.areas.find(a=>a.id===id);
   const interview=await call('onboardingPrepareKnowledgeInterview',{vault:fresh.vault,topic:id,area:area.path,prepareWriteScope:true});
   const opened=await call('onboardingOpenKnowledgeCodex',{vault:fresh.vault,runID:interview.run_id,prompt:OracleKnowledgePrompts.build(id,{...fresh,vault:interview.vault,interview})});
   if(opened!==true&&opened?.opened!==true)throw Error('A abertura no Codex não foi confirmada.');
   if($('#knowledge-copy-status'))$('#knowledge-copy-status').textContent='Roteiro aberto no Codex. Pressione Enviar para começar e confira o acesso ao vault. Depois da entrevista, volte aqui para conferir as notas.';
  }finally{if(button.isConnected)button.disabled=false}
 }));
 $$('[data-copy-knowledge]').forEach(button=>button.onclick=safe(async()=>{
  const id=button.dataset.copyKnowledge;button.disabled=true;
  try{
   const latest=await call('snapshot');
   if(latest.config.vault!==ctx.vault)throw Error('A pasta selecionada mudou. Reabra Knowledge Base para copiar o prompt correto.');
   const fresh=OracleKnowledgePrompts.context(latest.config.vault,latest.entries);
   const area=fresh.areas.find(a=>a.id===id);
   const interview=await call('onboardingPrepareKnowledgeInterview',{vault:fresh.vault,topic:id,area:area.path,prepareWriteScope:false});
   const copied=await call('copy',{text:OracleKnowledgePrompts.build(id,{...fresh,vault:interview.vault,interview})},'prompt');
   if(copied!==true&&copied?.copied!==true)throw Error('A cópia do prompt não foi confirmada.');
   if($('#knowledge-copy-status'))$('#knowledge-copy-status').textContent=`Prompt de ${OracleKnowledgePrompts.topics[id].name.toLocaleLowerCase('pt-BR')} copiado. Cole no Codex para começar.`;
  }finally{button.disabled=false}
 }));
 $$('[data-check-knowledge]').forEach(button=>button.onclick=async()=>{
  const id=button.dataset.checkKnowledge,status=document.querySelector(`[data-knowledge-receipt="${id}"]`);
  button.disabled=true;if(status)status.textContent='Conferindo o comprovante e as notas originais…';
  try{
   const latest=await call('snapshot');
   if(latest.config.vault!==ctx.vault)throw Error('A pasta selecionada mudou. Reabra Knowledge Base para conferir a entrevista correta.');
   const result=await call('knowledgeInterviewStatus',{topic:id});
   if(status?.isConnected)status.textContent=result.message+(result.pending_count?` ${result.pending_count} pendências foram declaradas.`:'');
   toast(result.message||'Conferência concluída.',result.status==='files_verified'?'success':'info');
  }catch(error){if(status?.isConnected)status.textContent='Conferência pendente: '+error.message;toast(error.message,'error');}
  finally{if(button.isConnected)button.disabled=false}
 });
}
function openKnowledgePromptPreview(id,ctx){
 const topic=OracleKnowledgePrompts.topics[id];
 if(modal(`<h1>${topic.name}</h1><p class="knowledge-preview-intro">Este roteiro abre no Codex, no espaço vinculado ao seu segundo cérebro.</p><pre class="knowledge-prompt-text">${esc(OracleKnowledgePrompts.build(id,ctx))}</pre><p id="knowledge-copy-status" role="status" aria-live="polite"></p>${actions(`<button class="quiet-link" data-copy-knowledge="${id}">Copiar prompt</button><button class="primary" data-open-knowledge="${id}">Abrir Codex</button>`)}`,{family:'knowledge-prompt-preview',key:'knowledge-prompt-'+id})===false)return;
 bindKnowledgeCopy(ctx);
}
function openKnowledgePrompts({welcome=false,topic=null}={}){
 if(navigationBlocked())return false;
 if(state.onboarding?.knowledgeInterviewAvailable===false){
  if(welcome)return false;
  modal('<h1>Knowledge Base</h1><p>Suas notas pessoais e profissionais estão disponíveis no vault.</p><p>A abertura e a conferência de entrevistas pelo Oracle ainda não estão disponíveis nesta versão do plugin.</p>',{family:'knowledge-prompts',key:'knowledge-prompts'});return true;
 }
 let ctx;try{ctx=knowledgeContext()}catch(error){toast(error.message,'error');return false}
 const topics=OracleKnowledgePrompts.topics;
 const descriptions={personal:'Valores, rotina, relações e planos.',professional:'Carreira, projetos, responsabilidades e negócio.'};
 const subjects={personal:['Quem você é e o que importa','Sua rotina e suas relações','Prioridades para os próximos meses'],professional:['Sua atuação e o valor que entrega','Projetos e responsabilidades atuais','Direção para sua carreira ou negócio']};
 if(modal(`<h1>Knowledge Base</h1><div class="knowledge-start"><h2>${welcome?'Seu segundo cérebro está pronto.':'Dê contexto ao seu segundo cérebro.'}</h2><p>Escolha uma área para organizar com o Codex.</p></div>
 <div class="knowledge-prompt-list">${Object.entries(topics).map(([id,t])=>`<section class="knowledge-prompt-option"><div class="knowledge-prompt-title">${icon(id==='personal'?'person':'code')}<h2>${t.name}</h2></div><p>${descriptions[id]}</p><ul>${subjects[id].map(text=>`<li>${text}</li>`).join('')}</ul><div class="knowledge-prompt-actions"><button class="primary" data-open-knowledge="${id}">Abrir Codex</button><button class="quiet-link" data-preview-knowledge="${id}">Ver prompt</button><button class="quiet-link" data-copy-knowledge="${id}">Copiar prompt</button><button class="quiet-link" data-check-knowledge="${id}">Conferir entrevista</button></div><p class="knowledge-receipt" data-knowledge-receipt="${id}" role="status" aria-live="polite"></p></section>`).join('')}</div>
 <p id="knowledge-copy-status" role="status" aria-live="polite"></p>`,{family:'knowledge-prompts',key:'knowledge-prompts'})===false)return false;
 bindKnowledgeCopy(ctx);
 $$('[data-preview-knowledge]').forEach(button=>button.onclick=()=>openKnowledgePromptPreview(button.dataset.previewKnowledge,ctx));
 if(topic)requestAnimationFrame(()=>$(`[data-open-knowledge="${topic}"]`)?.focus({preventScroll:true}));
 return true;
}
async function maybeShowKnowledgeWelcome(){
 const ob=state.onboarding,vault=state.config.vault;
 if(knowledgeWelcomeBusy||!OracleKnowledgePrompts.welcomeEligible(ob,vault)||interfaceSuspended||document.hidden||window.oracleWindowVisible===false||document.querySelector('dialog[open]')||updateBusy||modalDirty)return;
 const key=JSON.stringify([ob.runID,vault]);if(knowledgeWelcomeShown.has(key))return;
 knowledgeWelcomeBusy=true;
 try{
  if(openKnowledgePrompts({welcome:true})===false)return;
  knowledgeWelcomeShown.add(key);
  await call('onboardingKnowledgeWelcomeSeen',{runID:ob.runID,vault});
  if(state.config.vault===vault&&state.onboarding.runID===ob.runID)state.onboarding.knowledgeWelcome={runID:ob.runID,vault};
 }catch(error){toast('Não foi possível registrar a apresentação. Os prompts continuam disponíveis nos Ajustes.','error');}
 finally{knowledgeWelcomeBusy=false}
}
document.addEventListener('visibilitychange',()=>void maybeShowKnowledgeWelcome());

function openKnowledgeHub(){
 if(navigationBlocked())return;
 return window.OracleKnowledgeHub.open({modal,entries:state.entries,call,openNote:safe(openNote),memoryPage:safe(memoryPage),conversations:safe(conversations),prompts:topic=>openKnowledgePrompts({topic}),esc,icon});
}

$$('.workspace-tabs [data-workspace]').forEach((button,index)=>{
 button.onclick=()=>setView(button.dataset.workspace);
 button.onkeydown=event=>{const buttons=$$('.workspace-tabs [data-workspace]');let next;if(event.key==='ArrowRight')next=(index+1)%buttons.length;if(event.key==='ArrowLeft')next=(index+buttons.length-1)%buttons.length;if(event.key==='Home')next=0;if(event.key==='End')next=buttons.length-1;if(next!==undefined){event.preventDefault();if(setView(buttons[next].dataset.workspace))buttons[next].focus()}};
});
