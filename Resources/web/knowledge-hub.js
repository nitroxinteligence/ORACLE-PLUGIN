/* Read-only, extractive overview of existing personal and professional documents.
 * Content stays local to this dialog; no inference, persistence or account sync. */
window.OracleKnowledgeHub={open(hooks){
 const {esc,icon}=hooks;let entries=hooks.entries||[],areas=OracleKnowledge.areas(entries);
 const tabs=[{id:'personal',name:'Vida pessoal',icon:'person',description:'Quem você é, o que importa e os planos que orientam sua vida.'},{id:'professional',name:'Vida profissional',icon:'code',description:'Sua atuação, sua empresa e o que você está construindo.'}];
 let active='personal',generation=0;const cache=new Map();
 if(hooks.modal(`<h1>Seu conhecimento</h1><div class="knowledge-hub"><p class="hub-description">Sua vida pessoal e profissional, organizada no seu segundo cérebro.</p><nav class="hub-tabs" role="tablist" aria-label="Áreas do conhecimento">${tabs.map((t,i)=>`<button type="button" role="tab" id="hub-tab-${t.id}" aria-controls="hub-panel" aria-selected="${i===0}" tabindex="${i===0?0:-1}" data-hub-tab="${t.id}">${icon(t.icon)}<span>${t.name}</span></button>`).join('')}</nav><section id="hub-panel" role="tabpanel" tabindex="0" aria-labelledby="hub-tab-personal"></section></div>`,{family:'knowledge-hub',key:'knowledge-hub'})===false)return;
 const root=document.querySelector('.knowledge-hub'),panel=root.querySelector('#hub-panel');
 const title=()=>`<div class="hub-intro"><p>${tabs.find(t=>t.id===active).description}</p></div>`;
 const plain=text=>String(text||'').replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g,(_,path,label)=>label||path).replace(/<[^>]*>/g,'').replace(/[*_`]/g,'').replace(/^[-*>]\s*/,'').replace(/\s+/g,' ').trim();
 const shorten=(text,max=440)=>text.length<=max?text:text.slice(0,max).replace(/\s+\S*$/,'')+'…';
 function excerpts(text){
  const blocks=String(text||'').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/,'').replace(/```[\s\S]*?```/g,'').split(/\r?\n\s*\r?\n/);let heading='';const out=[];
  for(const block of blocks){const lines=block.split(/\r?\n/);const body=[];for(const line of lines){if(/^#{1,6}\s/.test(line)){heading=plain(line.replace(/^#+\s*/,''));continue}if(!/^\s*\|/.test(line))body.push(line)}const value=plain(body.map(line=>line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/,'')).join(' '));if(value.length>24)out.push({text:shorten(value),heading})}
  return out;
 }
 const definitions={
  personal:[['Quem você é',/identidade|sobre mim|perfil|quem|familia|família/],['Rotina e interesses',/rotina|saude|saúde|habito|hábito|interesse|lazer|aprend/],['Planos e prioridades',/plano|objetivo|meta|prioridade|proximo|próximo|futuro/]],
  professional:[['Atuação e empresa',/empresa|negocio|negócio|atuacao|atuação|perfil|oferta|servico|serviço|cliente|produto/],['Projetos e responsabilidades',/projeto|responsab|entrega|equipe|constru|trabalho/],['Direção profissional',/objetivo|meta|prioridade|carreira|direção|direcao|proximo|próximo|estrateg|estratég/]]
 };
 function summary(model){
  panel.setAttribute('aria-busy','false');
  const seen=new Set(),all=[];
  for(const doc of model.docs)for(const item of excerpts(doc.text)){const key=item.text.toLocaleLowerCase('pt-BR');if(!seen.has(key)){seen.add(key);all.push({...item,doc})}}
  const groups=definitions[active].map(([name,pattern])=>({name,pattern,items:[]}));
  for(const item of all){const subject=item.heading+' '+item.text;const group=groups.find(g=>g.pattern.test(item.heading))||groups.find(g=>g.pattern.test(subject))||groups[0];group.items.push(item)}
  const lead=all.find(x=>/resumo|panorama|identidade|sobre|perfil|contexto/i.test(x.heading))||all[0];
  const included=new Set(lead?[lead.doc]:[]);
  const sourceButton=doc=>`<button type="button" class="hub-inline-source" data-hub-source="${[...included].indexOf(doc)}">${icon('note')}${esc(doc.title)}</button>`;
  const cards=groups.map(group=>{const items=group.items.filter(x=>x!==lead).slice(0,4);items.forEach(x=>included.add(x.doc));return items.length?`<section class="hub-topic"><h3>${esc(group.name)}</h3><ul>${items.map(x=>`<li><p>${esc(x.text)}</p>${sourceButton(x.doc)}</li>`).join('')}</ul></section>`:''}).join('');
  const area=active==='personal'?'vida pessoal':'vida profissional';
  const empty=model.errors.length
   ? `<div class="hub-empty hub-empty-error">${icon('note')}<h2>Não foi possível reunir suas notas</h2><p>Tente novamente para consultar esta área do seu segundo cérebro.</p><button class="secondary" type="button" data-hub-retry>Tentar novamente</button></div>`
   : `<div class="hub-empty">${icon(active==='personal'?'person':'code')}<h2>Comece pela sua ${area}</h2><p>${active==='personal'?'Organize seus valores, sua rotina e seus planos':'Organize sua atuação, seus projetos e seus objetivos'} com uma conversa guiada no Codex. Suas notas aparecerão aqui.</p><button class="primary hub-build-context" type="button">Organizar ${area}</button></div>`;
  panel.innerHTML=(lead?title():'')+(window.ORACLE_PREVIEW?'<div class="hub-demo">Perfil de demonstração · dados fictícios</div>':'')+(lead?`<article class="hub-overview"><h2>Panorama</h2><p>${esc(lead.text)}</p>${sourceButton(lead.doc)}</article>${cards?'<div class="hub-topics">'+cards+'</div>':''}`:empty)+(model.errors.length&&lead?`<p class="hub-summary-status" role="status">Resumo parcial. ${model.errors.length} ${model.errors.length===1?'fonte não pôde ser lida':'fontes não puderam ser lidas'}.</p>`:'')+(included.size?`<details class="hub-provenance"><summary>Fontes consultadas · ${included.size}</summary><p>Trechos das suas notas, organizados por assunto. ${model.total>model.docs.length?'Este panorama usa '+model.docs.length+' de '+model.total+' registros encontrados. ':''}As informações refletem suas fontes e podem incluir registros antigos.</p><div>${[...included].map((doc,i)=>`<button type="button" data-hub-source="${i}">${icon('note')}<span>${esc(doc.title)}<small>${esc(doc.origin)}</small></span></button>`).join('')}</div></details>`:'')+`<div class="hub-summary-actions">${lead?'<button class="quiet-link hub-build-context" type="button">Organizar '+area+'</button>':''}${model.more?'<button class="secondary" type="button" data-hub-more>Ampliar resumo</button>':''}${model.errors.length&&lead?'<button class="secondary" type="button" data-hub-retry>Tentar novamente</button>':''}</div>`;
  panel.querySelector('.hub-build-context')?.addEventListener('click',()=>hooks.prompts?.(active));
  if(!matchMedia('(prefers-reduced-motion:reduce)').matches&&!document.body.classList.contains('reduced'))panel.animate([{opacity:.35},{opacity:1}],{duration:180,easing:'ease-out'});
  panel.querySelectorAll('[data-hub-source]').forEach(b=>b.onclick=()=>[...included][Number(b.dataset.hubSource)].open());
  panel.querySelector('[data-hub-more]')?.addEventListener('click',()=>load(true));
  panel.querySelector('[data-hub-retry]')?.addEventListener('click',()=>{cache.delete(active);load()});
 }
 function localFiles(id){
  const area=areas.find(a=>a.id===id),roots=area?.exists?[area.path]:[];
  if(id==='professional')roots.push('PROJETOS');
  const score=e=>/resumo|perfil|identidade|sobre|contexto|visao|visão/i.test(e.path)?0:/AGENTS\.md$/i.test(e.path)?3:1;
  return entries.filter(e=>!e.directory&&/\.md$/i.test(e.path)&&!/(?:^|\/)AGENTS\.md$/i.test(e.path)&&roots.some(r=>e.path.startsWith(r+'/'))).sort((a,b)=>score(a)-score(b)||a.path.split('/').length-b.path.split('/').length||a.path.localeCompare(b.path,'pt-BR'));
 }
 async function readLocal(id,limit){
  const files=localFiles(id),chosen=files.slice(0,limit),model={docs:[],errors:[],total:files.length,more:files.length>limit,limit};
  // Bound native reads, including when the user changes tabs during loading.
  for(let i=0;i<chosen.length;i+=3){const rows=await Promise.allSettled(chosen.slice(i,i+3).map(async e=>{const doc=await hooks.call('read',{path:e.path});return {title:e.name?.replace(/\.md$/i,'')||e.path.split('/').at(-1),origin:e.path,text:doc.text||'',open:()=>hooks.openNote(e.path)}}));for(const row of rows)if(row.status==='fulfilled')model.docs.push(row.value);else model.errors.push(row.reason?.message||'Leitura indisponível')}
  return model;
 }
 async function load(more=false){
  const id=active,token=++generation,previous=cache.get(id),limit=more?(previous?.limit||12)+12:12;
  if(previous&&!more){summary(previous);return}
  panel.innerHTML='<div class="hub-skeleton" role="status"><span class="sr-only">Reunindo suas notas…</span><i></i><i></i><i></i><i></i></div>';
  panel.setAttribute('aria-busy','true');
  try{const model=await readLocal(id,limit);if(token===generation&&active===id){cache.set(id,model);summary(model)}}catch(error){if(token===generation&&active===id)summary({docs:[],errors:[error.message],total:0})}
 }
 function select(id){active=id;root.querySelectorAll('[data-hub-tab]').forEach(b=>{const selected=b.dataset.hubTab===id;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1});panel.setAttribute('aria-labelledby','hub-tab-'+id);void load()}
 root.querySelectorAll('[data-hub-tab]').forEach((button,index)=>{button.onclick=()=>select(button.dataset.hubTab);button.onkeydown=e=>{let next;if(e.key==='ArrowRight')next=(index+1)%tabs.length;if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();const tab=root.querySelectorAll('[data-hub-tab]')[next];tab.focus();select(tab.dataset.hubTab)}}});
 window.OracleKnowledgeHub.refresh=next=>{if(!root.isConnected||!root.closest('dialog')?.open)return;entries=next||[];areas=OracleKnowledge.areas(entries);cache.clear();void load();};
 void load();
}};
