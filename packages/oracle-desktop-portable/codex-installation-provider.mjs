import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {assertPrivatePath} from './profile-store.mjs';
import {assertAdmittedContentManifest} from './content-admission.mjs';
import {verifyGBrainMethodInstallation,assertVerifiedGBrainMethod} from './method-installation-verifier.mjs';

const fail=code=>{throw Object.assign(new Error(code),{code});};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const setup=`---
name: oracle-setup
description: Consultar conhecimento local e usar as skills do Oracle System quando a tarefa precisar de memória, fontes ou métodos.
---
# Oracle System
Leia AGENTS.md e a skill oracle-gbrain-method deste workspace. Use somente as ferramentas Oracle atualmente expostas pelo plugin para o vault autorizado. Instalação, descoberta de skills, execução e confiança de hooks são estados diferentes. Não inicialize outro cérebro, configure provedores, altere arquivos globais ou fabrique recibos. Uma escrita autorizada exige readback do Markdown original no Obsidian. Nenhuma captura automática, publicação, manutenção ou exercício inicial está autorizado por esta skill.
`;
const method=`---
name: oracle-gbrain-method
description: Descobrir e aplicar os métodos oficiais GBrain quando a tarefa exigir memória, conhecimento, fontes ou organização.
---
# Método oficial GBrain
Leia .oracle/gbrain-method/ORACLE-CAPABILITIES.md e resolver.json. Use upstream/skills/RESOLVER.md e os triggers oficiais para selecionar o método adequado; leia o SKILL.md e suas referências antes de agir. Os caminhos upstream são relativos a .oracle/gbrain-method/upstream. Codex raciocina; GBrain indexa. oracle-vault é derivado e somente leitura. Escritas autorizadas em oracle-memory exigem readback canônico. AI Memory usa escopo operacional separado e espelha no vault somente sob autorização vigente. Não execute dream, synthesize, minions, embeddings, bootstrap, migrações ou hooks globais. Não configure APIs, não capture conversas nem crie schedules por mera existência dos arquivos. Descoberta não comprova execução.
`;

/** Only in-memory publisher admission plus the CURRENT selected vault can
 * prepare a project. Disk journals are diagnostic, never an authority source.
 * No HOME/config/auth edits, no hooks or model turns. A secondary MCP process
 * cannot inherit the live UI consent. Only the current plugin owns MCP. */
export function createCodexInstallationProvider({policy,vault,dataDir,bundleRoot,installationStatus}={}){
 if(!policy?.assertAdmission||!vault?.status||typeof installationStatus!=='function'||resolve(dataDir)!==dataDir||resolve(bundleRoot)!==bundleRoot)fail('codex_installation_unavailable');
 let current=null,epoch=0,queue=Promise.resolve();
 function check(record,signal){
  policy.assertAdmission(record.ticket);assertAdmittedContentManifest(record.admitted);
  const s=vault.status();if(signal?.aborted||record!==current||record.epoch!==epoch||!s.selected||s.root!==record.root||s.generation!==record.generation)fail('codex_installation_changed');
  const status=installationStatus();if(status.localContentVerified!==true||status.indexVerified!==true||status.manifestSHA256!==record.admitted.manifestSHA256)fail('codex_installation_pending');
 }
 async function directory(path,guard){
  await assertPrivatePath(dataDir);guard();
  const relative=path.slice(dataDir.length+1);if(!path.startsWith(dataDir+'/')||relative.split('/').some(x=>!x||x==='.'||x==='..'))fail('codex_installation_path');
  let p=dataDir;for(const part of relative.split('/')){p=join(p,part);await fs.mkdir(p,{mode:0o700}).catch(e=>{if(e.code!=='EEXIST')throw e;});await assertPrivatePath(p);const st=await fs.lstat(p);if(!st.isDirectory())fail('codex_installation_path');guard();}
 }
 async function read(path,guard){
  await assertPrivatePath(path);guard();const h=await fs.open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{const a=await h.stat();if(!a.isFile()||a.nlink!==1||a.size>16000000)fail('codex_installation_file');const bytes=await h.readFile();const b=await h.stat();guard();if(a.dev!==b.dev||a.ino!==b.ino||a.size!==b.size||a.mtimeMs!==b.mtimeMs)fail('codex_installation_changed');return bytes;}finally{await h.close();}
 }
 async function put(path,bytes,guard){
  await directory(dirname(path),guard);
  try{const found=await read(path,guard);if(!found.equals(bytes))fail('codex_installation_conflict');return;}catch(e){if(e.code!=='ENOENT')throw e;}
  guard();const h=await fs.open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);try{await h.writeFile(bytes);await h.sync();guard();}finally{await h.close();}
 }
 async function prepare({ticket,signal}={}){
  const record=current;if(!record)fail('codex_installation_pending');policy.assertAdmission(ticket);if(ticket.capability!=='configure'||ticket.generation!==record.ticket.generation)fail('codex_installation_changed');
  const guard=()=>check(record,signal);guard();await policy.revalidateAdmission(ticket);guard();
  const methodRoot=join(dataDir,'installed-method',record.admitted.manifestSHA256);
  assertVerifiedGBrainMethod(await verifyGBrainMethodInstallation({admitted:record.admitted,methodRoot,check:guard}));guard();
  const workspace=join(dataDir,'codex-workspaces',sha(Buffer.from(record.root))),files=new Map();
  const add=(path,bytes)=>files.set(path,Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes));
  add('.agents/skills/oracle-setup/SKILL.md',setup);add('.agents/skills/oracle-gbrain-method/SKILL.md',method);
  add('AGENTS.md',`# Oracle System workspace\n\nVault canônico: ${JSON.stringify(record.root)}.\nPlano assinado: ${record.admitted.manifestSHA256}.\nCodex é o executor de IA. Consulte as skills oracle-setup e oracle-gbrain-method. A biblioteca oficial está em .oracle/gbrain-method; o acervo está no vault em SISTEMA/skills e SISTEMA/recursos-skills. Leia somente as fontes necessárias à tarefa. Arquivos instalados não autorizam ferramentas, captura, hooks ou publicação. Use as ferramentas atualmente expostas pela instância do plugin Oracle System, com seu consentimento e escopo atuais. Não inicie outra instância MCP: ela não herda a autorização vigente. Nenhuma identidade é inventada neste plano memory-only.\n`);
  add('.oracle/plugin-mcp.json',JSON.stringify({schemaVersion:1,transport:'current-plugin-instance',executable:false,plugin:'Oracle System',tools:['oracle_memory','ai_memory'],connectionVerified:false,authorityRestored:false},null,2));
  for(const row of record.admitted.manifest.files.filter(row=>row.path.startsWith('resources/gbrain-method/'))){const relative=row.path.slice('resources/gbrain-method/'.length);const bytes=await read(join(methodRoot,relative),guard);if(bytes.length!==row.bytes||sha(bytes)!==row.sha256)fail('codex_installation_source_changed');add('.oracle/gbrain-method/'+relative,bytes);}
  await directory(workspace,guard);
  for(const [path,bytes] of files)await put(join(workspace,path),bytes,guard);
  const verifyManagedFiles=async({signal:verifySignal}={})=>{const verify=()=>check(record,verifySignal);for(const [path,bytes] of files){const found=await read(join(workspace,path),verify);if(!found.equals(bytes))fail('codex_installation_conflict');}verify();return true;};
  await verifyManagedFiles({signal});guard();
  const hashes=Object.fromEntries([...files].map(([path,bytes])=>[path,sha(bytes)]));
  await put(join(workspace,'.oracle/managed-installation.json'),Buffer.from(JSON.stringify({schemaVersion:1,owner:'OracleSystem',manifestSHA256:record.admitted.manifestSHA256,vault:record.root,hashes,authorityRestored:false},null,2)),guard);
  return Object.freeze({workspace,requiredPaths:Object.freeze(['oracle-setup','oracle-gbrain-method'].map(name=>join(workspace,'.agents/skills',name,'SKILL.md'))),verifyManagedFiles,assertCurrent:()=>check(record),filesInstalled:files.size,installedBytesVerified:true,discoveryVerified:false,modelExecutionVerified:false,hooksTrusted:false,mcpConnected:false});
 }
 const provider=options=>{const task=queue.then(()=>prepare(options));queue=task.catch(()=>{});return task;};
 provider.admit=(source,{ticket}={})=>{policy.assertAdmission(ticket);if(ticket.capability!=='configure')fail('access_denied');assertAdmittedContentManifest(source?.admitted);const s=vault.status();if(!s.selected)fail('vault_required');if(current?.admitted.manifestSHA256===source.admitted.manifestSHA256&&current.root===s.root&&current.generation===s.generation&&current.ticket.generation===ticket.generation)return;epoch++;current={ticket,admitted:source.admitted,root:s.root,generation:s.generation,epoch,nonce:randomUUID()};};
 provider.invalidate=()=>{epoch++;current=null;};
 return Object.freeze(provider);
}
