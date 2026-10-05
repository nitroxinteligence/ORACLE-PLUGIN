import {createPublicKey,verify} from 'node:crypto';
import {canonicalContentJSON} from './content-admission.mjs';
import {skillsBase64,skillsSHA} from './skills-release-admission.mjs';
const admitted=new WeakSet();
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
export const PLUGIN_RELEASE_DOMAIN='oracle-plugin-release-v1\0';
export const PLUGIN_REPOSITORY='nitroxinteligence/ORACLE-PLUGIN';
export const PLUGIN_MARKETPLACE='oracle-system';
export const pluginVersion=value=>typeof value==='string'&&/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)&&value.split('.').every(part=>Number.isSafeInteger(Number(part)));
export function newerPluginVersion(next,current){if(!pluginVersion(next)||!pluginVersion(current))fail('invalid_plugin_version','Versão inválida.');const a=next.split('.').map(Number),b=current.split('.').map(Number);for(let i=0;i<3;i++)if(a[i]!==b[i])return a[i]>b[i];return false;}
export function pluginFilePath(path){if(typeof path!=='string'||!path||path.length>700||path.startsWith('/')||/[\\\x00-\x1f\x7f:]/.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..'||/[. ]$/.test(part)))fail('invalid_plugin_path','Caminho irregular no pacote.');return path;}
export function admitPluginRelease(input,{trust,minimumSequence=0,knownManifestSHA256,now=Date.now()}={}){
 const bytes=Buffer.from(input);if(bytes.length>2000000||!bytes.length)fail('invalid_plugin_release','Manifesto do ORACLE fora dos limites.');let envelope,payload,doc;
 try{envelope=JSON.parse(bytes.toString('utf8'));payload=skillsBase64(envelope.payload_base64);doc=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(payload));}catch{fail('invalid_plugin_release','Manifesto do ORACLE inválido.');}
 const keys=trust?.keys?.filter(row=>row.id===envelope.key_id);if(envelope.schema_version!=='oracle-plugin-release-v1'||keys?.length!==1||trust?.algorithm!=='Ed25519'||!canonicalContentJSON(doc).equals(payload))fail('invalid_plugin_release','Emissor ou contrato inválido.');
 const raw=skillsBase64(keys[0].public_key_base64),signature=skillsBase64(envelope.signature_base64);if(raw.length!==32||signature.length!==64||!verify(null,Buffer.concat([Buffer.from(PLUGIN_RELEASE_DOMAIN),payload]),createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),raw]),format:'der',type:'spki'}),signature))fail('invalid_plugin_signature','Assinatura da atualização do ORACLE inválida.');
 const hash=skillsSHA(bytes),published=Date.parse(doc.publishedAt),expires=Date.parse(doc.expiresAt);
 if(doc.contract!=='oracle-plugin-release-v1'||doc.repository!==`https://github.com/${PLUGIN_REPOSITORY}`||doc.marketplace!==PLUGIN_MARKETPLACE||!pluginVersion(doc.version)||doc.releaseID!=='oracle-system-'+doc.version||!Number.isSafeInteger(doc.sequence)||doc.sequence<1||doc.sequence<minimumSequence||doc.sequence===minimumSequence&&knownManifestSHA256&&hash!==knownManifestSHA256||!Number.isFinite(published)||!Number.isFinite(expires)||published>now+300000||expires<=now||expires<=published||expires-published>366*86400000||!/^[a-f0-9]{40}$/.test(doc.sourceRevision??'')||doc.pluginABI!==1)fail('plugin_release_incompatible','Release expirada, incompatível ou com sequência regressiva.');
 for(const [platform,name] of [['darwin-arm64','oracle-system-mac-v017'],['win32-x64','oracle-system-windows-v017']]){
  const pack=doc.platforms?.[platform];if(pack?.name!==name||pack.path!==`plugins/${name}`||pack.asset!==`Oracle-System-${doc.version}-${platform==='darwin-arm64'?'Mac':'Windows'}.zip`||!Number.isSafeInteger(pack.bytes)||pack.bytes<1||pack.bytes>=100000000||!/^[a-f0-9]{64}$/.test(pack.sha256??'')||!pack.files||typeof pack.files!=='object'||Array.isArray(pack.files)||Object.keys(pack.files).length<5||Object.keys(pack.files).length>100)fail('plugin_release_incompatible','Pacote completo ou plataforma ausente.');
  for(const [path,row] of Object.entries(pack.files)){pluginFilePath(path);if(!/^[a-f0-9]{64}$/.test(row.sha256??'')||!Number.isSafeInteger(row.bytes)||row.bytes<0||row.bytes>=120000000||![420,493].includes(row.mode))fail('invalid_plugin_release','Inventário do pacote inválido.');}
  for(const path of ['plugin.json','.codex-plugin/plugin.json','runtime-payload-manifest.json','runtime-payload.br','runtime-payload.mjs'])if(!pack.files[path])fail('invalid_plugin_release','Pacote não contém o runtime completo.');
 }
 for(const [key,repository] of [['gbrain','garrytan/gbrain'],['aiMemory','akitaonrails/ai-memory']])if(doc.engines?.[key]?.repository!==repository||typeof doc.engines[key].version!=='string'||!/^[a-f0-9]{40}$/.test(doc.engines[key].commit??''))fail('invalid_plugin_release','Procedência dos componentes ausente.');
 const release=Object.freeze({...doc,manifestSHA256:hash,signatureVerified:true});admitted.add(release);return release;
}
export function assertPluginRelease(release){if(!admitted.has(release))fail('unadmitted_plugin_release','Atualização sem admissão assinada.');return release;}
