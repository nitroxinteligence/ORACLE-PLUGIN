/** Scope and identity checks around (not instead of) the pinned official engine. */
import {lstatSync,realpathSync,readFileSync,readdirSync} from 'node:fs';
import {resolve,join,isAbsolute,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {parseMarkdown} from '../../vendor/gbrain/src/core/markdown.ts';
import {slugifyPath,hasMalformedPathSegment} from '../../vendor/gbrain/src/core/sync.ts';
import {validateSlug} from '../../vendor/gbrain/src/core/utils.ts';
import {configPath,loadConfigFileOnly,toEngineConfig} from '../../vendor/gbrain/src/core/config.ts';

export const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
export function canonical(value:any):string {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
  return JSON.stringify(value);
}
export function isOwnedMemory(path:string):boolean {
  const value=path.toLowerCase();return value==='inbox/oracle-memory'||value.startsWith('inbox/oracle-memory/');
}
export function scopedNote(root:string,relative:string):string {
  if(typeof relative!=='string'||relative.length>4096||relative.includes('\\')||/[\x00-\x1f\x7f]/.test(relative)||
     relative.split('/').some(p=>!p||p==='.'||p==='..'||p.startsWith('.'))||!relative.toLowerCase().endsWith('.md')) throw Error('Invalid canonical Markdown path');
  let component=root;
  for(const part of relative.split('/')) { component=join(component,part);if(lstatSync(component).isSymbolicLink())throw Error('Symbolic link excluded'); }
  const path=resolve(root,relative),stat=lstatSync(path);
  if(!stat.isFile()||stat.size>2_000_000||!realpathSync(path).startsWith(root+'/')||(stat.size>0&&stat.blocks===0))throw Error('Canonical note unavailable, not locally materialized or outside scope');
  return path;
}
export function readCandidate(root:string,relative:string){
  const path=scopedNote(root,relative),bytes=readFileSync(path);
  if(bytes.length>2_000_000)throw Error('Canonical note exceeds 2 MB');
  const original=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  let text=original;
  if(hasMalformedPathSegment(relative))throw Error('Filename cannot be indexed by the pinned GBrain version');
  let parsed=parseMarkdown(text,relative,{validate:true});
  if(parsed.errors?.some(e=>e.code==='YAML_PARSE')){
    // Upstream agent assets can contain unresolved template variables in the
    // YAML fence. Index the complete source as body text, without evaluating
    // variables or rewriting the canonical file. Ordinary malformed YAML fails.
    const header=original.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    if(!header||!/{{[A-Z][A-Z0-9_]*}}/.test(header))throw Error('Invalid YAML frontmatter');
    text='# Source template\n\n'+original;
    parsed=parseMarkdown(text,relative,{validate:true});
    if(parsed.errors?.some(e=>e.code==='YAML_PARSE'))throw Error('Invalid template projection');
  }
  const expected=slugifyPath(relative);
  let slug=expected;
  if(!expected)slug=parsed.slug;
  else if(parsed.slug!==expected){
    if(slugifyPath(parsed.slug)===expected)slug=parsed.slug;
    // A portable basename slug is common in Obsidian tutorials. Keep the full
    // path authoritative: it cannot redirect this note onto another page.
    else if(parsed.slug!==slugifyPath(basename(relative)))throw Error('Frontmatter slug conflicts with path identity');
  }
  if(!slug)throw Error('Filename has no usable slug');
  const externalID=parsed.frontmatter?.id;
  return {path:relative,canonical_path:path,slug:validateSlug(slug),sha256:sha(bytes),bytes:bytes.length,text,
          external_id:typeof externalID==='string'&&externalID.length?externalID:null};
}

/** A truncated native snapshot is not evidence that the previous canonical path
 * disappeared. Preserve an existing different file, even when its old derived
 * slug is Oracle-owned. Case-only renames on a case-insensitive volume identify
 * the same inode and are safe without treating two files as one. */
export function isProvenCanonicalRename(root:string,oldPath:string,newPath:string,complete:boolean):boolean {
  try{
    const next=lstatSync(scopedNote(root,newPath));
    try{
      const previous=lstatSync(scopedNote(root,oldPath));
      return previous.dev===next.dev&&previous.ino===next.ino;
    }catch(error){
      const code=(error as NodeJS.ErrnoException).code;
      return complete&&(code==='ENOENT'||code==='ENOTDIR');
    }
  }catch{return false}
}

/** Independent final scope check catches create/delete/rename after the native scan.
 * Hidden/dependency trees and symlinks match the native scanner's exclusions. */
export function canonicalFiles(root:string,deadline:number):string[]{
  const pending=[''],files:string[]=[];let visited=0;
  while(pending.length){
    if(Date.now()>deadline)throw Error('Snapshot verification deadline exceeded');
    const dir=pending.pop()!;
    for(const entry of readdirSync(join(root,dir),{withFileTypes:true})){
      if(++visited>180_000)throw Error('Snapshot verification entry limit exceeded');
      if(entry.name.startsWith('.'))continue;
      const relative=dir?dir+'/'+entry.name:entry.name;
      if(isOwnedMemory(relative))continue;
      if(entry.isSymbolicLink())throw Error('Symbolic link in canonical index scope');
      if(entry.isDirectory()){
        if(!['node_modules','vendor','dist','build'].includes(entry.name))pending.push(relative);
      }else if(entry.name.toLowerCase().endsWith('.md')){
        scopedNote(root,relative);files.push(relative);
        if(files.length>60_000)throw Error('Snapshot verification file limit exceeded');
      }
    }
  }
  return files.sort();
}

export function explicitEngineConfig(){
  const profile=process.env.GBRAIN_HOME;
  if(!profile||!isAbsolute(profile)||profile.split(/[\\/]/).includes('..'))throw Error('Select an explicit GBrain profile; global HOME fallback is disabled');
  const path=configPath();
  if(lstatSync(path).isSymbolicLink())throw Error('Symbolic configuration is not an explicit profile');
  // The official file-only API intentionally ignores shell and cwd .env overrides.
  const config=loadConfigFileOnly();
  if(!config)throw Error('The selected profile has no readable .gbrain/config.json');
  if(config.remote_mcp)throw Error('Remote GBrain profiles are not available in offline mode');
  const engine=config.engine||(config.database_path?'pglite':'postgres');
  if(engine==='pglite'){
    if(!config.database_path||!isAbsolute(config.database_path))throw Error('The selected profile must declare an absolute local database_path');
  }else if(engine==='postgres'){
    let url:URL;try{url=new URL(config.database_url||'')}catch{throw Error('The selected profile has no explicit local database endpoint')}
    if(!['postgres:','postgresql:'].includes(url.protocol)||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||
       [...url.searchParams.keys()].some(key=>['host','hostaddr','service','servicefile'].includes(key.toLowerCase())))throw Error('Only explicitly configured local PostgreSQL endpoints are permitted in offline mode');
  }else throw Error('Unsupported official GBrain engine');
  return {...config,engine,engineConfig:toEngineConfig({...config,engine})};
}
