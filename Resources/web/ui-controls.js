/* Shared select enhancement. The original select remains the source of form values. */
(function(){
 'use strict';let sequence=0,opened=null;const synchronizers=new WeakMap();
 function enhance(select){
  if(select.dataset.oracleSelect||select.multiple||select.size>1)return;
  select.dataset.oracleSelect='true';const host=document.createElement('div');host.className='oracle-select';select.before(host);host.append(select);
  const button=document.createElement('button'),list=document.createElement('div');button.type='button';button.className='select-trigger';button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
  const labelCopy=select.labels?.[0]?.cloneNode(true);labelCopy?.querySelectorAll('select,button').forEach(el=>el.remove());const label=select.getAttribute('aria-label')||labelCopy?.textContent.trim()||'Selecionar';button.setAttribute('aria-label',label);
  list.className='select-options';list.id='oracle-select-'+(++sequence);list.setAttribute('role','listbox');list.setAttribute('aria-label',label);list.hidden=true;button.setAttribute('aria-controls',list.id);
  select.tabIndex=-1;select.setAttribute('aria-hidden','true');host.append(button,list);let cursor=select.selectedIndex,buffer='',lastKey=0;
  const options=()=>[...select.options];
  function sync(){button.disabled=select.disabled;button.textContent=options()[select.selectedIndex]?.textContent||'Selecionar…';list.replaceChildren();options().forEach((option,i)=>{const row=document.createElement('div');row.id=list.id+'-'+i;row.setAttribute('role','option');row.setAttribute('aria-selected',String(i===select.selectedIndex));row.setAttribute('aria-disabled',String(option.disabled));row.textContent=option.textContent;row.onpointerdown=e=>e.preventDefault();row.onclick=e=>{e.preventDefault();e.stopPropagation();if(!option.disabled)choose(i)};list.append(row)})}
  function mark(){[...list.children].forEach((row,i)=>row.classList.toggle('active',i===cursor));const row=list.children[cursor];if(row){button.setAttribute('aria-activedescendant',row.id);if(row.offsetTop<list.scrollTop)list.scrollTop=row.offsetTop;else if(row.offsetTop+row.offsetHeight>list.scrollTop+list.clientHeight)list.scrollTop=row.offsetTop+row.offsetHeight-list.clientHeight}}
  function close(){list.hidden=true;button.setAttribute('aria-expanded','false');button.removeAttribute('aria-activedescendant');if(opened?.host===host)opened=null}
  function open(){opened?.close();sync();list.hidden=false;cursor=select.selectedIndex;button.setAttribute('aria-expanded','true');opened={host,close};const boundary=host.closest('.modal-body,.ob-body')?.getBoundingClientRect()||{top:0,bottom:innerHeight},rect=button.getBoundingClientRect(),below=boundary.bottom-rect.bottom-8,above=rect.top-boundary.top-8,up=below<Math.min(list.scrollHeight,240)&&above>below;host.classList.toggle('opens-up',up);list.style.maxHeight=Math.max(60,Math.min(240,up?above:below))+'px';mark()}
  function choose(i){select.selectedIndex=i;sync();close();button.focus();select.dispatchEvent(new Event('change',{bubbles:true}));queueMicrotask(()=>{if(button.isConnected)return;const replacement=select.id?document.getElementById(select.id):[...document.querySelectorAll('select[aria-label]')].find(el=>el.getAttribute('aria-label')===select.getAttribute('aria-label'));replacement?.closest('.oracle-select')?.querySelector('.select-trigger')?.focus({preventScroll:true})})}
  button.onclick=e=>{e.preventDefault();list.hidden?open():close()};
  button.onkeydown=e=>{
   if(e.key==='Escape'&&!list.hidden){e.preventDefault();e.stopPropagation();close();return}
   if(e.key==='Tab'){close();return}
   if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();if(list.hidden)open();const enabled=options().map((o,i)=>o.disabled?-1:i).filter(i=>i>=0);const at=enabled.indexOf(cursor);cursor=e.key==='Home'?enabled[0]:e.key==='End'?enabled.at(-1):enabled[Math.max(0,Math.min(enabled.length-1,at+(e.key==='ArrowDown'?1:-1)))];mark();return}
   if(e.key==='Enter'||e.key===' '){e.preventDefault();list.hidden?open():choose(cursor);return}
   if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(list.hidden)open();const now=Date.now();buffer=(now-lastKey<700?buffer:'')+e.key.toLocaleLowerCase();lastKey=now;const found=options().findIndex(o=>!o.disabled&&o.textContent.toLocaleLowerCase().startsWith(buffer));if(found>=0){cursor=found;mark()}}
  };
  select.addEventListener('change',sync);synchronizers.set(select,sync);sync();select.addEventListener('focus',()=>button.focus({preventScroll:true}));select.addEventListener('click',e=>{e.preventDefault();button.focus()});if(document.activeElement===select)button.focus({preventScroll:true});
 }
 document.addEventListener('pointerdown',e=>{if(opened&&!opened.host.contains(e.target))opened.close()},true);
 window.addEventListener('resize',()=>opened?.close());
 document.addEventListener('focusin',e=>{if(opened&&!opened.host.contains(e.target))opened.close()});
 const scan=root=>{if(root.nodeType!==1||root.namespaceURI==='http://www.w3.org/2000/svg')return;if(root.matches('select'))enhance(root);root.querySelectorAll('select').forEach(enhance)};
 scan(document.documentElement);new MutationObserver(records=>{for(const record of records){for(const node of record.addedNodes)scan(node);if(record.type==='attributes'&&record.target.matches('select'))synchronizers.get(record.target)?.();}if(opened&&!opened.host.isConnected)opened=null}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
})();
