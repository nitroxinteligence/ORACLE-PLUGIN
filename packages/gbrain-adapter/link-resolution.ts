import {posix} from 'node:path';

/** Map a local Markdown reference through the source-path manifest, never a guessed slug.
 * Upstream treats dir-shaped links without ../ as engine-root references; Obsidian
 * and packaged SKILL.md references use paths relative to the containing file.
 */
export function canonicalizeLocalLinks(content:string,sourcePath:string,byPath:Map<string,string>):string {
  return content
    // This adapter owns only oracle-vault. Do not turn a qualified external ref into a local edge.
    .replace(/\[\[([a-z0-9-]+):([^\]]+)\]\]/gi,(whole,source,target)=>source==='oracle-vault'?`[[${target}]]`:''.padEnd(whole.length,' '))
    .replace(/(!?\[[^\]\n]*\])\((<[^>\n]+>|[^\s)]+)(?:\s+["'][^\n]*?["'])?\)/g,(whole,label,destination)=>{
      if(label.startsWith('!'))return whole;
      let ref=destination.startsWith('<')?destination.slice(1,-1):destination;
      if(/^[a-z][a-z\d+.-]*:/i.test(ref)||ref.startsWith('//'))return whole;
      ref=ref.split(/[?#]/,1)[0];try{ref=decodeURIComponent(ref)}catch{return whole}
      if(!/\.md$/i.test(ref)||ref.includes('\\'))return whole;
      const relative=posix.normalize(ref.startsWith('/')?ref.slice(1):posix.join(posix.dirname(sourcePath),ref));
      if(relative==='..'||relative.startsWith('../'))return whole;
      const slug=byPath.get(relative);
      // A root slug in (parentheses) without .md is intentionally NOT a
      // file ref to the pinned extractor. Its root-exact wikilink grammar
      // keeps the known endpoint even when the origin lives in a subfolder.
      if (!slug) return whole;
      return slug.includes('/') ? `${label}(${slug})` : `[[${slug}|${label.slice(1,-1)}]]`;
    });
}
export function hasKnownEndpoints(candidate:{targetSlug:string;fromSlug?:string},origin:string,known:Set<string>):boolean {
  return known.has(candidate.targetSlug)&&known.has(candidate.fromSlug||origin);
}
