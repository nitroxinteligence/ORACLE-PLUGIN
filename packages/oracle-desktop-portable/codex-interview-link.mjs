const fail=()=>{throw Object.assign(new Error('Roteiro ou pasta do Codex inválidos.'),{code:'invalid_request'});};
export function validInterviewRoot(value){
  return typeof value==='string'&&Buffer.byteLength(value)<=4096&&!/[\x00-\x1f\x7f]/.test(value)&&
    ((value.startsWith('/')&&value!=='/'&&!value.includes('\\'))||/^[A-Za-z]:\\[^\\]/.test(value));
}
export function codexInterviewLink({path,prompt}){
  if(!validInterviewRoot(path)||typeof prompt!=='string'||!prompt.trim()||Buffer.byteLength(prompt)>65536||prompt.includes('\0')||Buffer.from(prompt).toString('utf8')!==prompt)fail();
  const url=new URL('codex://threads/new');url.searchParams.set('path',path);url.searchParams.set('prompt',prompt);return url.href;
}
/** Dedicated protocol action. It cannot open arbitrary external URLs or send a turn. */
export function validatedCodexInterviewLink(value){
  if(typeof value!=='string'||value.length>400000||/[\s\x00-\x1f\x7f\\]/.test(value))fail();
  let url;try{url=new URL(value);}catch{fail();}
  if(url.protocol!=='codex:'||url.host!=='threads'||url.pathname!=='/new'||url.username||url.password||url.hash||[...url.searchParams.keys()].join(',')!=='path,prompt')fail();
  if(codexInterviewLink({path:url.searchParams.get('path'),prompt:url.searchParams.get('prompt')})!==url.href)fail();
  return url.href;
}
