const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const hosts=new Set(['api.github.com','github.com','release-assets.githubusercontent.com','objects.githubusercontent.com','raw.githubusercontent.com']);
/** Fixed publisher origins; callers supply trusted release URLs, never RPC. */
export async function releaseBytes(url,{maximum,expectedBytes,fetchImpl=globalThis.fetch,signal,check=()=>{},timeoutMS=120000,redirects=true}={}){
 if(!Number.isSafeInteger(maximum)||maximum<1||maximum>44000000)fail('release_limit','Limite de download inválido.');
 const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();const deadline=setTimeout(abort,timeoutMS);let reader;
 try{
  let response;for(let hop=0;hop<=4;hop++){
   check();const address=new URL(url);if(address.protocol!=='https:'||address.username||address.password||address.hash||!hosts.has(address.hostname))fail('release_origin','Origem de distribuição recusada.');
   response=await fetchImpl(address.href,{redirect:'manual',signal:controller.signal,cache:'no-store',headers:{Accept:address.hostname==='api.github.com'?'application/vnd.github+json':'application/octet-stream'}});check();
   if(![301,302,303,307,308].includes(response.status))break;
   if(!redirects)fail('release_origin','API de distribuição redirecionada.');await response.body?.cancel();const location=response.headers.get('location');if(!location)fail('release_origin','Redirecionamento sem destino.');url=new URL(location,url).href;response=null;
  }
  if(!response?.ok||!response.body)fail('release_unavailable','A distribuição não respondeu.');
  const declared=response.headers.get('content-length');if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>maximum))fail('release_limit','Download excede o limite.');
  const chunks=[];let length=0;reader=response.body.getReader();for(;;){check();const row=await reader.read();check();if(row.done)break;length+=row.value.byteLength;if(length>maximum)fail('release_limit','Download excede o limite.');chunks.push(Buffer.from(row.value));}
  if(expectedBytes!==undefined&&length!==expectedBytes)fail('release_size','Download incompleto.');return Buffer.concat(chunks,length);
 }catch(error){if(signal?.aborted)fail('operation_cancelled','Atualização cancelada.');if(controller.signal.aborted)fail('release_timeout','A distribuição não respondeu a tempo.');throw error;}
 finally{clearTimeout(deadline);signal?.removeEventListener('abort',abort);await reader?.cancel().catch(()=>{});}
}
export async function latestRelease(repository,options={}){
 if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))fail('release_origin','Repositório inválido.');
 let release;try{release=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await releaseBytes(`https://api.github.com/repos/${repository}/releases/latest`,{...options,maximum:2000000,redirects:false,timeoutMS:15000})));}catch(error){if(error.code)throw error;fail('release_invalid','Release inválida.');}
 if(release.draft!==false||release.prerelease!==false||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(release.tag_name??'')||!Array.isArray(release.assets))fail('release_invalid','Release estável inválida.');return release;
}
