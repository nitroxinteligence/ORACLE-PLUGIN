import {createHash,createPublicKey,verify} from 'node:crypto';
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {assertPrivatePath} from './profile-store.mjs';
import {canonicalContentJSON,loadReviewedContentTrust,verifyPortableContentManifest,loadAdmittedContentFile,verifyContentFile} from './content-admission.mjs';
import {createContentInstallationPlan} from './content-installation-plan.mjs';
import {admitSkillsRelease} from './skills-release-admission.mjs';
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const catalogPath='engine-source/provenance/oracle-distribution.json';
const key=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const base64=value=>{if(typeof value!=='string')fail('invalid_catalog_source','Base64 ausente.');const bytes=Buffer.from(value,'base64');if(bytes.toString('base64')!==value)fail('invalid_catalog_source','Base64 não canônico.');return bytes;};
// Native signature authenticates existing catalog packages only. It never
// admits portable runtime/method or replaces portable-content-v1 admission.
function catalogTransport(bytes,trust,admitted){
 let envelope,payload,document;try{envelope=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));payload=base64(envelope.payload_base64);document=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(payload));}catch{fail('invalid_catalog_source','Origem do acervo inválida.');}
 const keys=trust.keys.filter(row=>row.id===envelope.key_id);if(envelope.schema_version!==3||keys.length!==1||payload.length>16000000||!canonicalContentJSON(document).equals(payload))fail('invalid_catalog_source','Origem do acervo incompatível.');
 const publicKey=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),base64(keys[0].public_key_base64)]),format:'der',type:'spki'});
 if(!verify(null,Buffer.concat([Buffer.from('oracle-distribution-v3\0'),payload]),publicKey,base64(envelope.signature_base64)))fail('invalid_catalog_signature','Assinatura do acervo inválida.');
 if(document.schema_version!==3||!/^[-A-Za-z0-9._]{1,80}$/.test(document.release_id??'')||!Array.isArray(document.files)||document.files.length>30000||!Array.isArray(document.packages)||document.packages.length>1024||document.inventory_sha256!==sha(canonicalContentJSON(document.files)))fail('invalid_catalog_source','Inventário do acervo inválido.');
 const portable=new Map(admitted.manifest.files.filter(row=>row.path.startsWith('content/')).map(row=>[row.path,row]));const source=new Map();
 for(const row of document.files.filter(row=>row.kind!=='gbrain-source')){const target=portable.get('content/'+row.path);if(!target||target.sha256!==row.sha256||target.bytes!==row.size||source.has(row.path)||![420,493].includes(row.mode))fail('catalog_inventory_mismatch','Acervo não coincide com o conteúdo portátil assinado.');source.set(row.path,row);}
 if(source.size!==portable.size)fail('catalog_inventory_mismatch','Acervo portátil incompleto.');const packages=[],seen=new Set();
 for(const row of document.packages.filter(row=>row.kind!=='gbrain-source')){
  if(!/^[a-z0-9][a-z0-9-]{0,63}$/.test(row.id??'')||row.asset!==row.id+'.json'||row.url!==`https://github.com/nitroxinteligence/ORACLE-SKILLS/releases/download/${document.release_id}/${row.asset}`||!key(row.sha256)||!Number.isSafeInteger(row.bytes)||row.bytes<1||row.bytes>44000000||!Array.isArray(row.files)||row.files.length<1||row.files.length>1000||!Array.isArray(row.dependencies)||row.dependencies.length)fail('invalid_catalog_package','Pacote fora da origem e limites revisados.');
  let expanded=0;for(const path of row.files){const file=source.get(path);if(!file||file.package_id!==row.id||file.kind!==row.kind||seen.has(path))fail('catalog_inventory_mismatch','Pacotes divergentes.');seen.add(path);expanded+=file.size;}if(expanded!==row.expanded_bytes||expanded>32000000)fail('invalid_catalog_package','Tamanho expandido divergente.');packages.push(row);
 }
 if(seen.size!==source.size)fail('catalog_inventory_mismatch','Pacotes não cobrem o acervo.');return {releaseID:document.release_id,source,packages:packages.filter(row=>row.kind==='specialists')};
}
async function readBounded(path,maximum){await assertPrivatePath(path);const handle=await fs.open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);try{const info=await handle.stat();if(!info.isFile()||info.nlink!==1||info.size>maximum)fail('invalid_content_source','Arquivo irregular.');const bytes=await handle.readFile();const after=await handle.stat();if(info.ino!==after.ino||info.dev!==after.dev||info.size!==after.size||info.mtimeMs!==after.mtimeMs||info.ctimeMs!==after.ctimeMs||bytes.length!==info.size)fail('content_file_changed','Arquivo mudou durante leitura.');return bytes;}finally{await handle.close();}}
/** Private package composition, not RPC. Envelope and native provenance are
 * fixed package paths; HTTP URLs come only from both signed inventories.
 * Keys, access grants and credentials are never downloaded by this provider.
 * Local staged content is reverified; persisted receipts do not grant trust. */
export function createPortableContentSource({bundleRoot,dataDir,profileStore,policy,fetchImpl=globalThis.fetch,timeoutMS=120000}={}){
 if(typeof bundleRoot!=='string'||resolve(bundleRoot)!==bundleRoot||typeof dataDir!=='string'||resolve(dataDir)!==dataDir||typeof profileStore?.load!=='function'||typeof profileStore?.update!=='function'||typeof policy?.assertAdmission!=='function'||typeof policy?.revalidateAdmission!=='function'||typeof fetchImpl!=='function'||!Number.isSafeInteger(timeoutMS)||timeoutMS<1||timeoutMS>120000)fail('distribution_unavailable','Composição privada de conteúdo não disponível.');
 const envelopePath=join(bundleRoot,'resources/updates/portable-content.json'),trust=loadReviewedContentTrust(join(bundleRoot,'resources'));let busy=false;
 const check=(ticket,signal)=>{policy.assertAdmission(ticket);if(ticket?.capability!=='configure')fail('access_denied','Instalação exige configure.');if(signal?.aborted)fail('operation_cancelled','Instalação cancelada.');};
 async function download(packageInfo,ticket,signal){const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,timeoutMS);let reader;
  try{let url=packageInfo.url,response;for(let redirect=0;redirect<=4;redirect++){check(ticket,signal);const address=new URL(url);if(address.protocol!=='https:'||address.username||address.password||address.hash||!['github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(address.hostname))fail('invalid_distribution_url','Redirecionamento fora da origem aprovada.');response=await fetchImpl(url,{redirect:'manual',signal:controller.signal,cache:'no-store'});check(ticket,signal);if(![301,302,303,307,308].includes(response.status))break;await response.body?.cancel();url=new URL(response.headers.get('location'),url).href;response=null;}
   if(!response?.ok||!response.body)fail('content_download_failed','O pacote do acervo não foi disponibilizado.');reader=response.body.getReader();const chunks=[];let size=0;for(;;){const row=await reader.read();check(ticket,signal);if(row.done)break;size+=row.value.length;if(size>packageInfo.bytes)fail('content_download_limit','Pacote excedeu seu tamanho assinado.');chunks.push(Buffer.from(row.value));}const bytes=Buffer.concat(chunks,size);if(size!==packageInfo.bytes||sha(bytes)!==packageInfo.sha256)fail('content_file_changed','Pacote não corresponde à assinatura.');return bytes;
  }catch(error){if(signal?.aborted)fail('operation_cancelled','Instalação cancelada.');if(controller.signal.aborted)fail('content_download_timeout','O acervo não respondeu a tempo.');throw error;}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);await reader?.cancel().catch(()=>{});}}
 const sourceProvider=async function({ticket,signal}={}){
  if(busy)fail('content_download_busy','Conteúdo em preparação.');busy=true;let stage;
  try{await policy.revalidateAdmission(ticket);check(ticket,signal);let envelope;try{envelope=await readBounded(envelopePath,24000000);}catch(error){if(error.code==='ENOENT')fail('distribution_unavailable','Envelope privado portable-content-v1 não acompanha esta distribuição.');throw error;}
   const profile=await profileStore.load();check(ticket,signal);const prior=profile.portableContentFeed??{};const admitted=verifyPortableContentManifest(envelope,{trust,minimumSequence:prior.sequence??0,knownManifestSHA256:prior.manifestSHA256});
   for(const row of admitted.manifest.files.filter(row=>!row.path.startsWith('content/'))){check(ticket,signal);loadAdmittedContentFile(admitted,row.path,bundleRoot);}
   const provenance=loadAdmittedContentFile(admitted,catalogPath,bundleRoot),skills=admitSkillsRelease(provenance,{trust});
   const plan=createContentInstallationPlan(admitted),transport=catalogTransport(provenance,trust,admitted);
   await assertPrivatePath(dataDir);const parent=join(dataDir,'content-staging');await fs.mkdir(parent,{recursive:true,mode:0o700});await assertPrivatePath(parent);stage=await fs.mkdtemp(join(parent,'verified-'));
   const save=async(path,bytes)=>{check(ticket,signal);verifyContentFile(admitted,path,bytes);const target=join(stage,path);await fs.mkdir(dirname(target),{recursive:true,mode:0o700});await assertPrivatePath(dirname(target));await fs.writeFile(target,bytes,{flag:'wx',mode:0o600});check(ticket,signal);};
   for(const entry of plan.entries.filter(row=>row.scope==='private-method'))await save(entry.source,loadAdmittedContentFile(admitted,entry.source,bundleRoot));
   const cache=join(dataDir,'catalog-packages');await fs.mkdir(cache,{recursive:true,mode:0o700});await assertPrivatePath(cache);
   for(const packageInfo of transport.packages){check(ticket,signal);const cachePath=join(cache,packageInfo.sha256+'.json');let bytes;try{bytes=await readBounded(cachePath,packageInfo.bytes);if(bytes.length!==packageInfo.bytes||sha(bytes)!==packageInfo.sha256)fail('content_file_changed','Cache do pacote alterado.');}catch(error){if(error.code!=='ENOENT')throw error;bytes=await download(packageInfo,ticket,signal);await fs.writeFile(cachePath,bytes,{flag:'wx',mode:0o600});}
    let document;try{document=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('invalid_catalog_package','Pacote não é JSON válido.');}if(document.schema_version!==3||document.release_id!==transport.releaseID||document.id!==packageInfo.id||!Array.isArray(document.files)||document.files.length!==packageInfo.files.length)fail('invalid_catalog_package','Identidade do pacote divergente.');const seen=new Set();
    for(const row of document.files){const expected=transport.source.get(row.path);if(!expected||expected.package_id!==packageInfo.id||seen.has(row.path)||row.sha256!==expected.sha256||row.size!==expected.size||row.mode!==expected.mode)fail('catalog_inventory_mismatch','Arquivo não coincide com o inventário.');seen.add(row.path);await save('content/'+row.path,base64(row.content_base64));}if(seen.size!==packageInfo.files.length)fail('catalog_inventory_mismatch','Pacote incompleto.');
   }
   await policy.revalidateAdmission(ticket);check(ticket,signal);await profileStore.update(value=>{check(ticket,signal);const feed=value.portableContentFeed??{};if(feed.sequence>admitted.manifest.sequence||feed.sequence===admitted.manifest.sequence&&feed.manifestSHA256!==admitted.manifestSHA256)fail('content_rollback_rejected','A release mudou durante a instalação.');return {...value,portableContentFeed:{sequence:admitted.manifest.sequence,manifestSHA256:admitted.manifestSHA256,releaseID:admitted.manifest.release_id}};},{beforeCommit:()=>check(ticket,signal)});check(ticket,signal);
   return Object.freeze({admitted,skills,payloadRoot:stage,source:Object.freeze({fixture:false,completeInventory:false,completeInstallationPlan:true,catalogReleaseID:transport.releaseID,portableReleaseID:admitted.manifest.release_id,installed:false})});
  }catch(error){if(stage)await fs.rm(stage,{recursive:true,force:true});throw error;}finally{busy=false;}
 };
 // Restore admits the fixed signed package again and supplies only reference
 // assets. It does not download, stage, copy, install or restore journal trust.
 sourceProvider.verifyInstalled=async({ticket,signal}={})=>{
  await policy.revalidateAdmission(ticket);check(ticket,signal);
  const envelope=await readBounded(envelopePath,24000000),profile=await profileStore.load();check(ticket,signal);
  const prior=profile.portableContentFeed??{},admitted=verifyPortableContentManifest(envelope,{trust,minimumSequence:prior.sequence??0,knownManifestSHA256:prior.manifestSHA256});
  for(const row of admitted.manifest.files.filter(row=>!row.path.startsWith('content/'))){check(ticket,signal);loadAdmittedContentFile(admitted,row.path,bundleRoot);}
  const provenance=loadAdmittedContentFile(admitted,catalogPath,bundleRoot),skills=admitSkillsRelease(provenance,{trust});catalogTransport(provenance,trust,admitted);check(ticket,signal);
  return Object.freeze({admitted,skills,payloadRoot:bundleRoot,source:Object.freeze({installedReadback:true})});
 };
 return sourceProvider;
}
