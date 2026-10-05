import {readFileSync,realpathSync} from 'node:fs';
import {resolve,extname,sep,posix} from 'node:path';
import {randomBytes} from 'node:crypto';

import {resourceURI} from './mcp-metadata.mjs';
export {resourceURI} from './mcp-metadata.mjs';
export const mimeType='text/html;profile=mcp-app';

// Original assets are embedded in memory; their sources stay unchanged.
export function createUIResource({webRoot}={}) {
  if(typeof webRoot!=='string'||!webRoot)throw new Error('Pasta da interface Oracle ausente.');
  const web=realpathSync(webRoot);
function localFile(path) {const file=resolve(web,path.split(/[?#]/)[0]);if(!file.startsWith(resolve(web)+sep))throw new Error('Recurso fora do pacote.');const actual=realpathSync(file);if(!actual.startsWith(realpathSync(web)+sep))throw new Error('Recurso fora do pacote.');return actual;}
function dataURI(path) {
  if(/^(data:|https?:|#|blob:)/.test(path))return path;
  const mime={'.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'}[extname(path)]||'application/octet-stream';
  return `data:${mime};base64,${readFileSync(localFile(path)).toString('base64')}`;
}
function resourceHTML() {
  const nonce=randomBytes(18).toString('base64');
  let html=readFileSync(localFile('index.html'),'utf8');
  html=html.replace(/<meta[^>]*http-equiv="Content-Security-Policy"[^>]*>/i,`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'">`);
  html=html.replace(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*>/g,(_,path)=>{
    const css=readFileSync(localFile(path),'utf8').replace(/url\((["']?)([^)'"\s]+)\1\)/g,(match,quote,asset)=>{
      if(/^(data:|https?:|#)/.test(asset))return match;
      return `url("${dataURI(posix.join(posix.dirname(path),asset))}")`;
    });return `<style nonce="${nonce}">${css.replace(/<\/style/gi,'<\\/style')}</style>`;
  });
  html=html.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/g,(_,before,path,after)=>before+dataURI(path)+after);
  html=html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g,(_,path)=>{
    let script=readFileSync(localFile(path),'utf8');
    return `<script nonce="${nonce}">${script.replace(/(?:brand|portraits)\/[A-Za-z0-9_.-]+\.(?:png|svg|jpg|jpeg|webp)/g,asset=>dataURI(asset)).replace(/<\/script/gi,'<\\/script')}</script>`;
  });
  return html;
}

  return {
    list(){return {resources:[{uri:resourceURI,name:'Oracle System',mimeType,_meta:{ui:{prefersBorder:false}}}]};},
    read(uri){
      if(uri!==resourceURI)throw Object.assign(new Error('Recurso desconhecido.'),{code:-32602});
      return {contents:[{uri:resourceURI,mimeType,text:resourceHTML(),_meta:{ui:{prefersBorder:false,csp:{connectDomains:[],resourceDomains:[]}}}}]};
    }
  };
}
