import {createHash,createPublicKey,verify} from 'node:crypto';
import {canonicalContentJSON,portableContentPath} from './content-admission.mjs';

const admissions=new WeakMap();
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
export const skillsSHA=bytes=>createHash('sha256').update(bytes).digest('hex');
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function skillsBase64(value){
 if(typeof value!=='string')fail('invalid_skills_release','Base64 ausente.');
 const bytes=Buffer.from(value,'base64');if(bytes.toString('base64')!==value)fail('invalid_skills_release','Base64 não canônico.');return bytes;
}
export function skillsPath(path){
 portableContentPath('content/'+path);
 if(!/^SISTEMA\/(skills|recursos-skills)\//.test(path))fail('invalid_skills_path','Arquivo fora do acervo de skills.');
 return path;
}
/** Schema 3 authenticates the complete existing public inventory. Only skill
 * packages are admitted for installation here. Engine metadata cannot grant
 * executable admission or change the engine pin of the running Oracle. */
export function admitSkillsRelease(input,{trust,minimumSequence=0,knownManifestSHA256}={}){
 const bytes=Buffer.from(input);if(!bytes.length||bytes.length>24000000)fail('invalid_skills_release','Manifesto fora dos limites.');
 let envelope,payload,document;try{envelope=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));payload=skillsBase64(envelope.payload_base64);document=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(payload));}catch{fail('invalid_skills_release','Manifesto inválido.');}
 const keys=trust?.keys?.filter(row=>row.id===envelope.key_id);
 if(envelope.schema_version!==3||trust?.algorithm!=='Ed25519'||keys?.length!==1||payload.length>16000000||!canonicalContentJSON(document).equals(payload))fail('invalid_skills_release','Contrato ou emissor inválido.');
 const raw=skillsBase64(keys[0].public_key_base64),signature=skillsBase64(envelope.signature_base64);
 if(raw.length!==32||signature.length!==64||!verify(null,Buffer.concat([Buffer.from('oracle-distribution-v3\0'),payload]),createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),raw]),format:'der',type:'spki'}),signature))fail('invalid_skills_signature','Assinatura do acervo inválida.');
 const hash=skillsSHA(bytes);
 if(document.schema_version!==3||!Number.isSafeInteger(document.sequence)||document.sequence<1||!Number.isSafeInteger(minimumSequence)||minimumSequence<0||document.sequence<minimumSequence||document.sequence===minimumSequence&&knownManifestSHA256&&hash!==knownManifestSHA256||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(document.release_id??''))fail('skills_rollback','A sequência do acervo não pode regredir ou mudar.');
 if(!Array.isArray(document.files)||!document.files.length||document.files.length>30000||document.inventory_sha256!==skillsSHA(canonicalContentJSON(document.files))||!Array.isArray(document.packages)||!document.packages.length||document.packages.length>1024||!Array.isArray(document.licenses)||!document.licenses.length)fail('invalid_skills_inventory','Inventário completo ausente.');
 const all=new Map(),folded=new Set(),directories=new Set();let expanded=0;
 for(const row of document.files){
  if(typeof row.path!=='string'||row.path.length>700||row.path!==row.path.normalize('NFC')||row.path.startsWith('/')||/[\\\x00-\x1f\x7f:]/.test(row.path)||row.path.split('/').some(part=>!part||part==='.'||part==='..')||!hex(row.sha256)||!Number.isSafeInteger(row.size)||row.size<0||row.size>32000000||![420,493].includes(row.mode)||!['specialists','prompts','tutorials','gbrain-source'].includes(row.kind))fail('invalid_skills_inventory','Entrada irregular no inventário.');
  const key=row.path.toLowerCase(),segments=key.split('/'),parents=segments.slice(1).map((_,index)=>segments.slice(0,index+1).join('/'));
  if(folded.has(key)||directories.has(key)||parents.some(parent=>folded.has(parent)))fail('invalid_skills_inventory','Caminhos duplicados ou colidentes.');folded.add(key);parents.forEach(parent=>directories.add(parent));
  if(row.kind==='specialists'){skillsPath(row.path);if(/\.md$/i.test(row.path)&&row.size>2000000)fail('invalid_skills_inventory','Nota excede o limite.');}
  all.set(row.path,row);expanded+=row.size;if(expanded>512000000)fail('invalid_skills_inventory','Acervo excede 512 MB.');
 }
 const covered=new Set(),ids=new Set(),packages=[];
 for(const row of document.packages){
  if(!/^[a-z0-9][a-z0-9-]{0,63}$/.test(row.id??'')||ids.has(row.id)||row.asset!==row.id+'.json'||row.url!==`https://github.com/nitroxinteligence/ORACLE-SKILLS/releases/download/${document.release_id}/${row.asset}`||!hex(row.sha256)||!Number.isSafeInteger(row.bytes)||row.bytes<1||row.bytes>44000000||!Array.isArray(row.files)||!row.files.length||row.files.length>1000||!Array.isArray(row.dependencies)||row.dependencies.length)fail('invalid_skills_package','Pacote fora dos limites e origem revisados.');
  ids.add(row.id);let size=0;for(const path of row.files){const file=all.get(path);if(!file||file.package_id!==row.id||file.kind!==row.kind||covered.has(path))fail('invalid_skills_package','Pacotes não correspondem ao inventário.');covered.add(path);size+=file.size;}
  if(size!==row.expanded_bytes||size>32000000)fail('invalid_skills_package','Tamanho expandido divergente.');if(row.kind==='specialists')packages.push(Object.freeze({...row,files:Object.freeze([...row.files])}));
 }
 if(covered.size!==all.size||!packages.length)fail('invalid_skills_inventory','Pacotes não cobrem o inventário completo.');
 const files=document.files.filter(row=>row.kind==='specialists').map(row=>Object.freeze({...row}));
 const admitted=Object.freeze({releaseID:document.release_id,sequence:document.sequence,manifestSHA256:hash,signatureVerified:true,completeInventory:true,files:Object.freeze(files),packages:Object.freeze(packages)});
 admissions.set(admitted,new Map(files.map(row=>[row.path,row])));return admitted;
}
export function assertSkillsRelease(admitted){if(!admissions.has(admitted))fail('unadmitted_skills_release','Acervo sem admissão assinada.');return admitted;}
export function verifySkillsFile(admitted,path,input){
 const row=admissions.get(admitted)?.get(skillsPath(path)),bytes=Buffer.from(input);
 if(!row||bytes.length!==row.size||skillsSHA(bytes)!==row.sha256)fail('skills_file_changed','Arquivo diverge do inventário assinado.');
 if(['cffaedfe','feedfacf','cafebabe','7f454c46'].includes(bytes.subarray(0,4).toString('hex'))||bytes.subarray(0,2).toString()==='MZ')fail('native_skills_forbidden','Executável nativo recusado no acervo.');return row;
}
