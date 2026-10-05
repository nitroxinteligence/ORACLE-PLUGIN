import fs from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {homedir} from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {AI_MEMORY_PINS} from './ai-memory-pins.mjs';
import {WINDOWS_RUNTIME_PINS} from './portable-windows-runtime-pins.mjs';

const execute=promisify(execFile),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const events=['SessionStart','UserPromptSubmit','PreToolUse','PostToolUse','PreCompact','Stop','SessionEnd'];
const scriptsManifestSHA256=AI_MEMORY_PINS.hooksManifestSHA256;
const fail=code=>{throw Object.assign(new Error('Não foi possível instalar os hooks oficiais do AI Memory. '+code),{code});};
async function regular(path){const st=await fs.lstat(path);if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1)fail('official_hooks_unsafe_file');return fs.readFile(path);}
async function safeParents(path){let current=resolve(path);for(;;){try{const st=await fs.lstat(current);if(st.isSymbolicLink()||!st.isDirectory())fail('official_hooks_unsafe_path');}catch(e){if(e.code!=='ENOENT')throw e;}const parent=dirname(current);if(parent===current)break;current=parent;}}

/** Uses upstream install-hooks, including its backups, merge rules, data-dir
 * defaults and existing MCP endpoint discovery. Does not edit hook trust,
 * install an MCP server or equate registration with delivered observations. */
export function createOfficialHooksInstaller({bundleRoot,dataDir,environment=process.env,home=homedir(),platform=process.platform,arch=process.arch,run=execute}={}){
 let queue=Promise.resolve();
 async function install({workspace,check,signal}){
  check();if(signal?.aborted)fail('operation_cancelled');
  const windows=platform==='win32';if(!(windows&&arch==='x64'||platform==='darwin'&&arch==='arm64'))fail('official_hooks_platform_unsupported');
  const pin=windows?WINDOWS_RUNTIME_PINS.aiMemory:{sha256:AI_MEMORY_PINS.binarySHA256,bytes:AI_MEMORY_PINS.binaryBytes};
  const name=windows?'ai-memory.exe':'ai-memory',source=join(bundleRoot,'runtime',name),bytes=await regular(source);
  if(bytes.length!==pin.bytes||sha(bytes)!==pin.sha256)fail('official_hooks_binary_mismatch');check();
  const scripts=join(bundleRoot,'resources/ai-memory/hooks'),manifestBytes=await regular(join(scripts,'manifest.json'));
  if(sha(manifestBytes)!==scriptsManifestSHA256)fail('official_hooks_scripts_mismatch');
  const manifest=JSON.parse(manifestBytes);
  if(manifest.version!==AI_MEMORY_PINS.version||manifest.commit!==AI_MEMORY_PINS.commit||manifest.files.length!==16)fail('official_hooks_scripts_mismatch');
  for(const row of manifest.files){if(!/^(codex\/[a-z-]+\.(sh|ps1)|_lib\.sh|lib\/[a-zA-Z0-9_-]+\.ps1)$/.test(row.path))fail('official_hooks_scripts_mismatch');const content=await regular(join(scripts,row.path));if(content.length!==row.bytes||sha(content)!==row.sha256)fail('official_hooks_scripts_mismatch');}check();
  // Commands must outlive the extracted, evictable runtime cache.
  const stable=join(dataDir,'installed-tools','ai-memory',pin.sha256),binary=join(stable,name);
  await safeParents(stable);await fs.mkdir(stable,{recursive:true,mode:0o700});
  try{if(sha(await regular(binary))!==pin.sha256)fail('official_hooks_binary_mismatch');}
  catch(e){
   if(e.code!=='ENOENT')throw e;const temporary=join(stable,'.install-'+randomUUID());
   try{await fs.copyFile(source,temporary,fs.constants.COPYFILE_EXCL);await fs.chmod(temporary,0o700);if(sha(await regular(temporary))!==pin.sha256)fail('official_hooks_binary_mismatch');check();await fs.rename(temporary,binary);}
   finally{await fs.unlink(temporary).catch(e=>{if(e.code!=='ENOENT')throw e;});}
  }
  const env={};for(const key of ['PATH','LANG','SYSTEMROOT','SystemRoot','WINDIR','TEMP','TMP','TMPDIR','APPDATA','LOCALAPPDATA','AI_MEMORY_DATA_DIR'])if(environment[key])env[key]=environment[key];
  env.HOME=home;if(windows)env.USERPROFILE=home;
  env.CODEX_HOME=resolve(environment.CODEX_HOME||join(home,'.codex'));
  const targets=[join(workspace,'.codex/hooks.json'),join(env.CODEX_HOME,'hooks.json')];
  for(const target of targets){check();await safeParents(dirname(target));try{await regular(target);}catch(e){if(e.code!=='ENOENT')throw e;}}
  for(const target of targets){
   check();if(signal?.aborted)fail('operation_cancelled');
   try{await run(binary,['install-hooks','--agent','codex','--apply','--hooks-dir',scripts,'--config-file',target],{env,cwd:workspace,signal,timeout:30000,maxBuffer:262144,windowsHide:true});}
   catch(e){if(signal?.aborted)fail('operation_cancelled');fail('official_hooks_install_failed');}
   check();const value=JSON.parse(await regular(target));
   if(!events.every(event=>value.hooks?.[event]?.some(group=>group.hooks?.some(h=>h.type==='command'&&h.command.includes('ai-memory')&&h.command.includes(' hook --event ')&&h.command.includes('--agent codex')))))fail('official_hooks_readback_failed');
  }
  check();return Object.freeze({installed:true,provider:'ai-memory-install-hooks',version:AI_MEMORY_PINS.version,workspace:targets[0],user:targets[1],events:events.length,hooksTrusted:false,captureVerified:false});
 }
 return options=>{const task=queue.then(()=>install(options));queue=task.catch(()=>{});return task;};
}
