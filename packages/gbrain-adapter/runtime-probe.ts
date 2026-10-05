/** Execute only the official schema command on a disposable profile. macOS
 * confines writes to that copy and denies network; no user notes are writable. */
import {mkdirSync,openSync,closeSync,readFileSync,statSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
export async function probeRuntime(executable:string,profile:string):Promise<void> {
 if(process.platform!=='darwin')throw Error('Second Brain runtime validation requires macOS');
 profile=realpathSync(profile);
 const temporary=join(profile,'oracle-update-tmp');mkdirSync(temporary,{recursive:true,mode:0o700});
 const log=join(temporary,'schema.log'),fd=openSync(log,'w',0o600);
 // JSON quoting also escapes quotes and backslashes in sandbox string literals.
 const policy=`(version 1)(allow default)(deny network*)(deny file-write*)(allow file-write* (subpath ${JSON.stringify(profile)}))`;
 const child=Bun.spawn(['/usr/bin/sandbox-exec','-p',policy,executable,'apply-migrations','--force-schema','--yes'],{
  cwd:profile,env:{PATH:'/usr/bin:/bin',HOME:profile,GBRAIN_HOME:profile,TMPDIR:temporary,GBRAIN_SKIP_UPDATE_CHECK:'1',GBRAIN_HOOKS:'0',BUN_RUNTIME_TRANSPILER_CACHE_PATH:temporary},stdin:'ignore',stdout:fd,stderr:fd
 });
 let expired=false;
 const timeout=setTimeout(()=>{expired=true;child.kill('SIGKILL')},180_000);
 try {
  const code=await child.exited;
  if(expired)throw Error('A verificação do Second Brain excedeu o prazo; versão anterior preservada.');
  if(code!==0)throw Error('A nova versão do Second Brain não passou na verificação local; versão anterior preservada.');
  if(statSync(log).size>2_000_000)throw Error('A verificação do Second Brain excedeu o limite de diagnóstico.');
  // CLI currently exits zero only after schema-only completion. Require its
  // positive completion message too, instead of accepting a no-op help response.
  if(!/Applied \d+ schema migration\(s\); now at v\d+\./.test(readFileSync(log,'utf8')))throw Error('A nova versão não confirmou a verificação do banco; versão anterior preservada.');
 } finally {clearTimeout(timeout);closeSync(fd)}
}
