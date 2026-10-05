import {createPrivateKey,createPublicKey,createHash,sign,timingSafeEqual} from 'node:crypto';
import {constants,lstatSync,realpathSync,openSync,fstatSync,readFileSync,closeSync} from 'node:fs';
import {open,link,unlink,lstat,readdir} from 'node:fs/promises';
import {dirname,resolve,join,relative} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {canonicalContentJSON,loadReviewedContentTrust,portableContentContractDetails,verifyPortableContentManifest,loadAdmittedContentFile} from '../packages/oracle-desktop-portable/content-admission.mjs';

const signedEnvelopes=new WeakMap();
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
export function assertPortableSigningKey(privateKey,keyID,trust){
  let key;try{key=privateKey?.type==='private'?privateKey:createPrivateKey(privateKey);}catch{fail('invalid_signing_key','Chave de assinatura inválida.');}
  if(key.asymmetricKeyType!=='ed25519'||trust?.algorithm!=='Ed25519'||trust?.schema_version!==1||!Array.isArray(trust.keys)||typeof keyID!=='string')fail('invalid_signing_key','Assinatura exige Ed25519 e confiança pública revisada.');
  const matches=trust.keys?.filter(row=>row.id===keyID)??[];
  if(matches.length!==1)fail('untrusted_content_signer','Identificador ausente ou duplicado na confiança pública.');
  const expected=Buffer.from(matches[0].public_key_base64??'','base64');
  const actual=createPublicKey(key).export({type:'spki',format:'der'}).subarray(-32);
  if(expected.length!==32||expected.toString('base64')!==matches[0].public_key_base64||!timingSafeEqual(actual,expected))fail('signing_key_mismatch','A chave privada não corresponde à chave pública revisada.');
  return key;
}
/** Library inputs are trusted operator configuration, not RPC or profile data.
 * All schema/pins/path/hash/magic gates reuse the production admission loader.
 * Nothing is returned or written unless the complete inventory verifies. */
export async function signPortableContent({manifest,payloadRoot,privateKey,keyID,trust=loadReviewedContentTrust(),minimumSequence=0}={}){
  let definition;try{definition=portableContentContractDetails(manifest?.contract);}catch{fail('invalid_content_manifest','Manifesto exige um contrato de plataforma revisado.');}
  const key=assertPortableSigningKey(privateKey,keyID,trust),payload=canonicalContentJSON(manifest);
  const envelope=canonicalContentJSON({schema_version:definition.contract,key_id:keyID,payload_base64:payload.toString('base64'),signature_base64:sign(null,Buffer.concat([Buffer.from(definition.domain),payload]),key).toString('base64')});
  const admitted=verifyPortableContentManifest(envelope,{trust,minimumSequence,platform:definition.platform});
  if(typeof payloadRoot!=='string'||resolve(payloadRoot)!==payloadRoot)fail('invalid_content_source','Raiz do payload deve ser absoluta e canônica.');
  for(const row of admitted.manifest.files)loadAdmittedContentFile(admitted,row.path,payloadRoot);
  const byPath=new Map(admitted.manifest.files.map(row=>[row.path,row]));const expected=new Set(byPath.keys()),directories=new Set();for(const path of expected){const parts=path.split('/');for(let i=1;i<parts.length;i++)directories.add(parts.slice(0,i).join('/'));}let count=0;
  const walk=async(dir,prefix='')=>{for(const name of await readdir(dir)){const path=join(dir,name),local=prefix?`${prefix}/${name}`:name,stat=await lstat(path);if(stat.isSymbolicLink())fail('invalid_content_source','Links não são permitidos no payload.');if(stat.isDirectory()){if(!directories.has(local))fail('unlisted_content_file','Diretório fora do inventário.');await walk(path,local);}else{if(!stat.isFile()||!expected.has(local)||++count>30000)fail('unlisted_content_file','Arquivo extra ou irregular no payload.');const row=byPath.get(local);if((stat.mode&0o777)!==row.mode)fail('content_mode_changed','Modo do arquivo difere do inventário.');}}};
  await walk(payloadRoot);if(count!==expected.size)fail('incomplete_content_components','Inventário incompleto.');
  signedEnvelopes.set(envelope,digest(envelope));return envelope;
}
/** New output only: hard-link commit is atomic and refuses an existing target.
 * No key, native schema3 resource or payload file is mutated. */
export async function writePortableContentEnvelope(envelope,output){
  if(!signedEnvelopes.has(envelope)||signedEnvelopes.get(envelope)!==digest(envelope))fail('unverified_signing_output','Saída não pertence a uma emissão validada nesta instância.');
  if(typeof output!=='string'||resolve(output)!==output||realpathSync(dirname(output))!==dirname(output))fail('invalid_signing_output','Saída deve ter pasta canônica existente.');
  const temp=join(dirname(output),`.portable-content-${randomUUID()}.tmp`);let handle;
  try{handle=await open(temp,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o644);await handle.writeFile(envelope);await handle.sync();await handle.close();handle=null;await link(temp,output);}finally{if(handle)await handle.close().catch(()=>{});await unlink(temp).catch(()=>{});}
}
function readExternalKey(path,payloadRoot){
  const absolute=resolve(path),repo=fileURLToPath(new URL('../',import.meta.url));
  if(absolute!==path||realpathSync(absolute)!==absolute||!relative(repo,absolute).startsWith('..')||absolute===payloadRoot||absolute.startsWith(payloadRoot+'/'))fail('invalid_signing_key_path','Chave deve estar em arquivo externo canônico.');
  const stat=lstatSync(absolute);if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||(stat.mode&0o077)||stat.size>16384)fail('invalid_signing_key_path','Arquivo externo da chave exige acesso privado e formato limitado.');
  const fd=openSync(absolute,constants.O_RDONLY|constants.O_NOFOLLOW);try{const opened=fstatSync(fd);if(opened.ino!==stat.ino||opened.dev!==stat.dev)fail('invalid_signing_key_path','Arquivo da chave mudou.');return createPrivateKey(readFileSync(fd));}catch{fail('invalid_signing_key','Não foi possível carregar a chave externa.');}finally{closeSync(fd);}
}
export async function main(args=process.argv.slice(2)){
  const options={};for(let i=0;i<args.length;i+=2){const flag=args[i];if(!['--manifest','--payload-root','--private-key','--key-id','--output','--resources-root','--minimum-sequence'].includes(flag)||!args[i+1]||options[flag]!==undefined)fail('invalid_signing_configuration','Argumentos de emissão inválidos.');options[flag]=args[i+1];}
  for(const flag of ['--manifest','--payload-root','--private-key','--key-id','--output'])if(!options[flag])fail('invalid_signing_configuration',`Configuração explícita ausente: ${flag}.`);
  const payloadRoot=options['--payload-root'],trust=loadReviewedContentTrust(options['--resources-root']);
  const sequence=options['--minimum-sequence']===undefined?0:Number(options['--minimum-sequence']);
  const manifest=JSON.parse(readFileSync(options['--manifest'],'utf8'));
  const privateKey=readExternalKey(options['--private-key'],payloadRoot);
  const envelope=await signPortableContent({manifest,payloadRoot,privateKey,keyID:options['--key-id'],trust,minimumSequence:sequence});
  await writePortableContentEnvelope(envelope,options['--output']);
  return {contract:manifest.contract,release_id:manifest.release_id,sequence:manifest.sequence,files:manifest.files.length,runtimeSignatureVerified:false,output:options['--output']};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().then(result=>process.stdout.write(JSON.stringify(result)+'\n')).catch(error=>{process.stderr.write(`${error.code??'signing_failed'}: Emissão não concluída.\n`);process.exitCode=1;});
