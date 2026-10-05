/* Markdown is data, never executable markup. Marked is used only as a lexer;
   this renderer emits a closed set of tags and no source-controlled attributes. */
(function (global) {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const entities = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0'};
  const decode = text => String(text ?? '').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (all, key) => {
    if (key[0] !== '#') return entities[key.toLowerCase()] ?? all;
    const n = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2),16) : Number(key.slice(1));
    return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '\ufffd';
  });
  function linkKind(href) {
    const text = decode(href).trim();
    if (!text || /[\u0000-\u001f\u007f\\]/.test(text) || text.startsWith('//')) return null;
    if (/^https?:/i.test(text)) {
      try {const url=new URL(text);return url.host && !url.username && !url.password ? {kind:'external',value:url.href} : null;} catch {return null;}
    }
    if (/^[a-z][a-z\d+.-]*:/i.test(text)) return null;
    return {kind:'local',value:text};
  }
  function resolveLocal(href, sourcePath, entries) {
    const link=linkKind(href);
    if (!link || link.kind !== 'local') throw Error('Este link não aponta para uma nota local permitida.');
    let path, fragment;
    try {const parts=link.value.split('#');path=decodeURIComponent(parts.shift());fragment=decodeURIComponent(parts.join('#'));} catch {throw Error('Link com codificação inválida.');}
    if (/[\u0000-\u001f\u007f\\?]/.test(path) || path.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(path)) throw Error('Caminho não permitido.');
    const source=String(sourcePath || '');
    if (source.startsWith('/') || source.split('/').includes('..')) throw Error('A origem desta nota precisa ser confirmada.');
    const pieces=path.startsWith('/') ? [] : source.split('/').slice(0,-1);
    if (!path && source) pieces.push(source.split('/').at(-1));
    else for (const part of path.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') {if (!pieces.length) throw Error('O link sai da pasta autorizada.');pieces.pop();}
      else pieces.push(part);
    }
    const target=pieces.join('/'), candidates=[target, ...(target.toLowerCase().endsWith('.md') ? [] : [target+'.md'])];
    const notes=entries.filter(e=>!e.directory && /\.md$/i.test(e.path));
    let matches=notes.filter(e=>candidates.includes(e.path));
    if (!matches.length) matches=notes.filter(e=>candidates.some(c=>c.normalize('NFC').toLowerCase()===e.path.normalize('NFC').toLowerCase()));
    if (matches.length !== 1) throw Error(matches.length ? 'Há mais de uma nota para este link. Escolha a fonte pela busca.' : 'Nota não encontrada na pasta autorizada.');
    return {path:matches[0].path,fragment};
  }
  function resolveWiki(href, sourcePath, entries) {
    const link=linkKind(href);
    if(!link||link.kind!=='local')throw Error('Relação local não permitida.');
    const at=link.value.indexOf('#'),raw=at<0?link.value:link.value.slice(0,at),anchor=at<0?'':link.value.slice(at);
    if(!raw)return resolveLocal(anchor,sourcePath,entries);
    if(raw.includes('/')){
      if(raw.startsWith('.')||raw.startsWith('/'))return resolveLocal(link.value,sourcePath,entries);
      // Explicit vault path wins only when it resolves to one actual note.
      const rootCandidates=entries.filter(e=>!e.directory&&[raw,raw+'.md'].some(p=>p.normalize('NFC').toLowerCase()===e.path.normalize('NFC').toLowerCase()));
      if(rootCandidates.length)return resolveLocal('/'+link.value,sourcePath,entries);
      return resolveLocal(link.value,sourcePath,entries);
    }
    const name=raw.replace(/\.md$/i,'').normalize('NFC').toLowerCase();
    const matches=entries.filter(e=>!e.directory&&/\.md$/i.test(e.path)&&e.path.split('/').at(-1).replace(/\.md$/i,'').normalize('NFC').toLowerCase()===name);
    if(matches.length!==1)throw Error(matches.length?'Há mais de uma nota para esta relação. Escolha a fonte pela busca.':'Nota citada não encontrada na pasta autorizada.');
    return resolveLocal('/'+matches[0].path+anchor,sourcePath,entries);
  }
  function render(input) {
    const text=String(input ?? '').replace(/\r\n?/g,'\n').replace(/^\uFEFF/,'').replace(/^---\n[\s\S]*?\n---(?:\n|$)/,'');
    if (!text.trim()) return '<p>Documento vazio.</p>';
    if (text.length > 2_000_000) return '<p>Documento excede o limite de leitura.</p>';
    if (!global.marked?.lexer) return '<pre>'+escape(text)+'</pre>';
    let budget=50000;
    const guard=depth=>{if (--budget<0 || depth>32) throw Error('Limite de estrutura Markdown');};
    const wiki=value=>{
      const source=decode(value),pattern=/\[\[([^\]\n]+)\]\]/g;let result='',offset=0;
      for (const match of source.matchAll(pattern)) {
        result+=escape(source.slice(offset,match.index));
        const [target,...label]=match[1].split('|');
        result+='<button type="button" class="wiki-link" data-wiki="'+escape(target)+'">'+escape(label.join('|')||target)+'</button>';
        offset=match.index+match[0].length;
      }
      return result+escape(source.slice(offset));
    };
    const inline=(tokens,depth=0,interactive=true)=>(tokens||[]).map(t=>{
      guard(depth);
      switch(t.type) {
        case 'strong': return '<strong>'+inline(t.tokens,depth+1,interactive)+'</strong>';
        case 'em': return '<em>'+inline(t.tokens,depth+1,interactive)+'</em>';
        case 'del': return '<del>'+inline(t.tokens,depth+1,interactive)+'</del>';
        case 'codespan': return '<code>'+escape(decode(t.text))+'</code>';
        case 'br': return '<br>';
        case 'link': {
          const label=inline(t.tokens,depth+1,false)||escape(decode(t.text)),link=linkKind(t.href);
          return !interactive || !link ? label : '<button type="button" class="document-link" data-'+link.kind+'="'+escape(link.value)+'">'+label+(link.kind==='external'?' ↗':'')+'</button>';
        }
        case 'image': return '<span class="markdown-image-alt">'+escape('Imagem: '+decode(t.text))+'</span>';
        case 'html': return escape(t.raw || t.text);
        case 'escape': return escape(decode(t.text));
        case 'text': return t.tokens ? inline(t.tokens,depth+1,interactive) : interactive ? wiki(t.text) : escape(decode(t.text));
        default: return escape(t.raw || t.text || '');
      }
    }).join('');
    const block=(tokens,depth=0)=>(tokens||[]).map(t=>{
      guard(depth);
      switch(t.type) {
        case 'space': case 'def': return '';
        case 'heading': {const n=Math.min(6,Math.max(2,Number(t.depth)+1));return '<h'+n+'>'+inline(t.tokens,depth+1)+'</h'+n+'>';}
        case 'paragraph': return '<p>'+inline(t.tokens,depth+1)+'</p>';
        case 'text': return t.tokens ? inline(t.tokens,depth+1) : escape(decode(t.text));
        case 'code': return '<pre><code>'+escape(t.text)+'</code></pre>';
        case 'html': return '<pre>'+escape(t.raw || t.text)+'</pre>';
        case 'hr': return '<hr>';
        case 'blockquote': return '<blockquote>'+block(t.tokens,depth+1)+'</blockquote>';
        case 'list': {const tag=t.ordered?'ol':'ul',start=t.ordered&&Number.isSafeInteger(t.start)?' start="'+t.start+'"':'';return '<'+tag+start+'>'+t.items.map(i=>{guard(depth+1);return '<li>'+(i.task?'<span aria-label="'+(i.checked?'Concluído':'Pendente')+'">'+(i.checked?'☑':'☐')+'</span> ':'')+block(i.tokens,depth+1)+'</li>';}).join('')+'</'+tag+'>';}
        case 'table': return '<div class="markdown-table"><table><thead><tr>'+t.header.map(c=>'<th scope="col">'+inline(c.tokens,depth+1)+'</th>').join('')+'</tr></thead><tbody>'+t.rows.map(row=>'<tr>'+row.map(c=>'<td>'+inline(c.tokens,depth+1)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
        default: return escape(t.raw || t.text || '');
      }
    }).join('\n');
    try {return block(global.marked.lexer(text,{gfm:true,breaks:false}));}
    catch {return '<p>Estrutura muito complexa; exibindo o texto original.</p><pre>'+escape(text)+'</pre>';}
  }
  global.OracleMarkdown=Object.freeze({render,resolveLocal,resolveWiki,linkKind});
})(globalThis);
