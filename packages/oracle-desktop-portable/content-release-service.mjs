import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {assertPrivatePath} from './profile-store.mjs';
import {assertAdmittedContentManifest,verifyPortableContentManifest,verifyContentFile,portableContentPath} from './content-admission.mjs';
import {createContentInstallationPlan} from './content-installation-plan.mjs';

class ReleaseError extends Error {constructor(code,message){super(message);this.code=code;}}
const fail=(code,message)=>{throw new ReleaseError(code,message);};
const stages=new WeakMap();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function privateDirectory(directory){
  let ancestor=directory;
  while(true){try{await assertPrivatePath(ancestor);break;}catch(error){if(error.code!=='ENOENT')throw error;ancestor=dirname(ancestor);}}
  if(!(await fs.lstat(ancestor)).isDirectory())fail('invalid_content_staging','Pasta de download inválida.');
  await fs.mkdir(directory,{recursive:true,mode:0o700});await assertPrivatePath(directory);
  if(!(await fs.lstat(directory)).isDirectory())fail('invalid_content_staging','Pasta de download inválida.');
}

/** Endpoints/auth/fetch come from trusted distribution composition, never UI.
 * Only inventoried bytes are staged. No downloaded code is executed, no vault
 * is selected, no runtime signature or complete onboarding is inferred here. */
export function createContentReleaseService({manifestURL,allowedOrigins,resolveFileURL,trust,dataDir,profileStore,assertAdmission,fetchImpl=globalThis.fetch,timeoutMS=120000}={}){
  if(!Array.isArray(allowedOrigins)||!allowedOrigins.length||typeof resolveFileURL!=='function'||typeof assertAdmission!=='function'||!profileStore||typeof dataDir!=='string'||typeof fetchImpl!=='function'||!Number.isSafeInteger(timeoutMS)||timeoutMS<1||timeoutMS>120000)fail('distribution_unavailable','A origem privada de conteúdo ainda não foi configurada.');
  const origins=new Set(allowedOrigins.map(value=>new URL(value).origin));
  const endpoint=value=>{
    let url;try{url=new URL(value);}catch{fail('invalid_distribution_url','Endereço de distribuição inválido.');}
    if(url.protocol!=='https:'||url.username||url.password||url.hash||!origins.has(url.origin))fail('invalid_distribution_url','Origem de distribuição não autorizada.');return url.href;
  };
  const manifestEndpoint=endpoint(manifestURL);
  let pending=false;
  const check=(ticket,signal)=>{assertAdmission(ticket);if(signal?.aborted)fail('operation_cancelled','Atualização cancelada.');};
  async function currentRelease(admitted,ticket,signal){
    check(ticket,signal);const feed=(await profileStore.load()).portableContentFeed;check(ticket,signal);
    if(!feed||feed.sequence!==admitted.manifest.sequence||feed.manifestSHA256!==admitted.manifestSHA256)fail('content_release_changed','Consulte novamente a atualização antes de instalar.');
  }
  async function bytesFromURL(url,maximum,{ticket,signal,onChunk}={}){
    check(ticket,signal);const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
    const deadline=setTimeout(()=>controller.abort(),timeoutMS),chunks=[];let length=0,reader;
    try{
      const response=await fetchImpl(endpoint(url),{redirect:'error',signal:controller.signal});check(ticket,signal);
      if(!response.ok||!response.body||response.redirected)fail('content_download_failed','O servidor privado não disponibilizou o conteúdo.');
      const header=response.headers?.get?.('content-length');if(header!==null&&header!==undefined&&(!/^\d+$/.test(header)||Number(header)>maximum))fail('content_download_limit','O conteúdo excede o limite de download.');
      reader=response.body.getReader();
      while(true){check(ticket,signal);const result=await reader.read();check(ticket,signal);if(result.done)break;
        if(!(result.value instanceof Uint8Array))fail('invalid_content_reply','Resposta de conteúdo inválida.');
        length+=result.value.byteLength;if(length>maximum)fail('content_download_limit','O conteúdo excede o limite de download.');
        if(onChunk)await onChunk(result.value);else chunks.push(Buffer.from(result.value));check(ticket,signal);
      }
      return onChunk?length:Buffer.concat(chunks,length);
    }catch(error){
      if(error instanceof ReleaseError)throw error;
      if(signal?.aborted)fail('operation_cancelled','Atualização cancelada.');
      if(controller.signal.aborted)fail('content_download_timeout','O download privado não respondeu a tempo.');
      fail(typeof error.code==='string'&&/^[a-z0-9_]{1,80}$/.test(error.code)?error.code:'content_download_failed','O download privado não foi concluído. Tente novamente.');
    }
    finally{clearTimeout(deadline);signal?.removeEventListener('abort',abort);await reader?.cancel().catch(()=>{});reader?.releaseLock();}
  }
  async function exclusive(work){if(pending)fail('content_download_busy','Aguarde a atualização de conteúdo atual.');pending=true;try{return await work();}finally{pending=false;}}
  return Object.freeze({
    manifest({ticket,signal}={}){return exclusive(async()=>{
      const bytes=await bytesFromURL(manifestEndpoint,24_000_000,{ticket,signal}),profile=await profileStore.load();check(ticket,signal);
      const prior=profile.portableContentFeed||{},admitted=verifyPortableContentManifest(bytes,{trust,minimumSequence:prior.sequence||0,knownManifestSHA256:prior.manifestSHA256});
      await profileStore.update(value=>{
        check(ticket,signal);const current=value.portableContentFeed||{};
        if(current.sequence>admitted.manifest.sequence||current.sequence===admitted.manifest.sequence&&current.manifestSHA256!==admitted.manifestSHA256)fail('content_rollback_rejected','A versão publicada mudou durante a consulta.');
        value.portableContentFeed={sequence:admitted.manifest.sequence,manifestSHA256:admitted.manifestSHA256,releaseID:admitted.manifest.release_id};return value;
      },{beforeCommit:()=>check(ticket,signal)});check(ticket,signal);return admitted;
    });},
    download(admitted,paths,{ticket,signal}={}){return exclusive(async()=>{
      assertAdmittedContentManifest(admitted);await currentRelease(admitted,ticket,signal);
      if(!Array.isArray(paths)||!paths.length||new Set(paths).size!==paths.length)fail('invalid_content_selection','Seleção de conteúdo inválida.');
      const files=new Map(admitted.manifest.files.map(file=>[file.path,file]));
      for(const path of paths)if(!files.has(portableContentPath(path)))fail('unadmitted_content_file','Arquivo fora do conteúdo assinado.');
      await assertPrivatePath(dataDir);const parent=join(dataDir,'content-staging');await privateDirectory(parent);
      const root=await fs.mkdtemp(join(parent,'download-'));await fs.chmod(root,0o700);const written=[];
      try{
        for(const path of paths){check(ticket,signal);const file=files.get(path),target=join(root,path);await privateDirectory(dirname(target));
          const handle=await fs.open(target,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);let offset=0;
          try{const received=await bytesFromURL(resolveFileURL(admitted.manifest.release_id,path),file.bytes,{ticket,signal,onChunk:async chunk=>{
            let writtenBytes=0;while(writtenBytes<chunk.length){check(ticket,signal);const result=await handle.write(chunk,writtenBytes,chunk.length-writtenBytes,offset);if(!result.bytesWritten)fail('content_write_failed','A gravação do conteúdo foi interrompida.');writtenBytes+=result.bytesWritten;offset+=result.bytesWritten;}
          }});if(received!==file.bytes)fail('content_file_changed','O download não corresponde ao tamanho assinado.');await handle.sync();}finally{await handle.close();}
          check(ticket,signal);await assertPrivatePath(target);const bytes=await fs.readFile(target);verifyContentFile(admitted,path,bytes);written.push({path,bytes:bytes.length,sha256:sha(bytes)});
        }
        await currentRelease(admitted,ticket,signal);const result=Object.freeze({payloadRoot:root,manifestSHA256:admitted.manifestSHA256,files:Object.freeze(written.map(Object.freeze)),completeInventory:written.length===admitted.manifest.files.length,runtimeSignatureVerified:false});stages.set(result,{admitted,root});return result;
      }catch(error){await fs.rm(root,{recursive:true,force:true});throw error;}
    });},
  });
}

export function assertDownloadedContent(stage,admitted){const value=stages.get(stage);if(!value||value.admitted!==admitted)fail('unadmitted_download','O conteúdo não foi baixado e verificado por este serviço.');return stage;}

/** Trusted coordinator adapter: downloads only the admitted local-content plan.
 * Runtime and AI installation require their own verifiers and are not implied. */
export function createReleaseContentSource(releaseService){
  if(typeof releaseService?.manifest!=='function'||typeof releaseService?.download!=='function')fail('distribution_unavailable','A origem privada de conteúdo ainda não foi configurada.');
  return async({ticket,signal}={})=>{
    const admitted=await releaseService.manifest({ticket,signal});
    const plan=createContentInstallationPlan(admitted);
    const stage=await releaseService.download(admitted,plan.entries.map(entry=>entry.source),{ticket,signal});
    assertDownloadedContent(stage,admitted);
    return Object.freeze({admitted,payloadRoot:stage.payloadRoot,download:stage});
  };
}
