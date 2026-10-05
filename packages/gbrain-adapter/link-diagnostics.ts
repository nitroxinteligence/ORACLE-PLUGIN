import {stripCodeBlocks} from '../../vendor/gbrain/src/core/link-extraction.ts';

export const LINK_DIAGNOSTICS_VERSION=1;
const SAMPLE_LIMIT=200;
type LocalIssue={path:string;target:string;reason:'missing_endpoint'|'ambiguous_basename'|'unresolved_frontmatter';field?:string};
type ExternalReference={path:string;target:string};
export function isExternalReference(target:string):boolean {
 return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target.trim());
}
/** Preserve the official extractor for local relations. Mask external references
 * before it runs: its bare-slug pass can mistake an image URL suffix for a slug.
 * Code is stripped by the pinned official helper, not interpreted as links.
 */
export function prepareLinkContent(content:string):{content:string;external:string[]} {
 const visible=stripCodeBlocks(content),external:string[]=[];
 const masked=visible.replace(/(?:\b[a-z][a-z\d+.-]*:\/\/|\b(?:mailto|tel|obsidian):|(?<![\w/])\/\/)[^\s<>\]\)"']+/gi,target=>{
  external.push(target);return ' '.repeat(target.length);
 });
 return {content:masked,external};
}
export class LinkDiagnostics {
 private local:LocalIssue[]=[];
 private external:ExternalReference[]=[];
 private localTotal=0;
 private externalTotal=0;
 private basenames=new Map<string,number>();
 constructor(known:Set<string>){
  for(const slug of known){const name=slug.split('/').at(-1)!;this.basenames.set(name,(this.basenames.get(name)||0)+1)}
 }
 externalReferences(path:string,targets:string[]){for(const target of targets){this.externalTotal++;if(this.external.length<SAMPLE_LIMIT)this.external.push({path,target})}}
 unresolved(path:string,target:string,field?:string){
  if(isExternalReference(target)){this.externalReferences(path,[target]);return}
  const reason=field?'unresolved_frontmatter':!target.includes('/')&&(this.basenames.get(target)||0)>1?'ambiguous_basename':'missing_endpoint';
  this.localTotal++;if(this.local.length<SAMPLE_LIMIT)this.local.push({path,target,reason,...(field?{field}:{})});
 }
 snapshot(){return {link_diagnostics_version:LINK_DIAGNOSTICS_VERSION,
  unresolved_link_count:this.localTotal,unresolved_links:this.local,unresolved_link_sample_count:this.local.length,
  unresolved_links_truncated:this.localTotal>this.local.length,
  external_reference_count:this.externalTotal,external_references:this.external,external_reference_sample_count:this.external.length,
  external_references_truncated:this.externalTotal>this.external.length,
  diagnostics_sample_limit:SAMPLE_LIMIT,diagnostics_scope:'official local-link candidates and unresolved frontmatter; external URL occurrences outside code'};}
}
