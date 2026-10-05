import {execFileSync,spawnSync} from 'node:child_process';
import {lstatSync,realpathSync,accessSync,constants,openSync,closeSync,readSync,fstatSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createCodexAppServerTransport,createCodexConnectionProvider} from './codex-connection-provider.mjs';
export const CODEX_HOST_TEAM='2DC432GLL2';
export const CODEX_HOST_BUNDLE_ID='com.openai.codex';
const bundles=Object.freeze(['/Applications/Codex.app','/Applications/ChatGPT.app']);
const layouts=Object.freeze(['Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex','Contents/Resources/codex']);
const admissions=new WeakSet();
const fail=code=>{throw Object.assign(new Error(code),{code});};
const same=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;
function regularChain(path){let cursor='/';const chain=[];for(const part of path.slice(1).split('/')){cursor=join(cursor,part);const entry=lstatSync(cursor);if(entry.isSymbolicLink())fail('codex_host_symlink');chain.push([cursor,entry]);}if(realpathSync(path)!==path)fail('codex_host_symlink');return chain;}
const unchanged=chain=>chain.every(([path,stamp])=>same(stamp,lstatSync(path)));
function run(command,args){return execFileSync(command,args,{encoding:'utf8',timeout:30000,maxBuffer:2000000,stdio:['ignore','pipe','pipe'],env:{PATH:'/usr/bin:/bin:/usr/sbin:/sbin',LANG:'en_US.UTF-8'}});}
function signature(path){const result=spawnSync('/usr/bin/codesign',['-dv','--verbose=4',path],{encoding:'utf8',timeout:10000,maxBuffer:200000,stdio:['ignore','pipe','pipe']});if(result.status!==0||result.error)fail('codex_signature_metadata_unavailable');return result.stderr;}
function hashFile(path){const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);try{const before=fstatSync(fd);if(!before.isFile()||before.size>400000000||before.nlink!==1)fail('codex_binary_invalid');const hash=createHash('sha256'),chunk=Buffer.alloc(1000000);let count,total=0;while((count=readSync(fd,chunk,0,chunk.length,null))>0){hash.update(chunk.subarray(0,count));total+=count;if(total>400000000)fail('codex_binary_invalid');}if(total!==before.size||!same(before,fstatSync(fd))||!same(before,lstatSync(path)))fail('codex_host_changed');return hash.digest('hex');}finally{closeSync(fd);}}
function inspectBundle(bundlePath){
 const chain=regularChain(bundlePath),bundle=lstatSync(bundlePath);if(!bundle.isDirectory())fail('codex_bundle_invalid');
 const info=join(bundlePath,'Contents/Info.plist');const infoChain=regularChain(info);if(!lstatSync(info).isFile()||lstatSync(info).size>256000)fail('codex_bundle_invalid');
 const id=run('/usr/bin/plutil',['-extract','CFBundleIdentifier','raw','-o','-',info]).trim();if(id!==CODEX_HOST_BUNDLE_ID)fail('codex_bundle_identity_mismatch');
 const requirement='=identifier "'+CODEX_HOST_BUNDLE_ID+'" and anchor apple generic and certificate leaf[subject.OU] = "'+CODEX_HOST_TEAM+'"';
 run('/usr/bin/codesign',['--verify','--deep','--strict','--test-requirement',requirement,bundlePath]);
 run('/usr/bin/codesign',['--verify','--strict','--test-requirement','=notarized',bundlePath]);
 const appSignature=signature(bundlePath);if(!appSignature.includes('TeamIdentifier='+CODEX_HOST_TEAM)||!appSignature.includes('Authority=Developer ID Application:')||!appSignature.includes('Authority=Apple Root CA'))fail('codex_publisher_mismatch');
 for(const layout of layouts){
  const executablePath=join(bundlePath,layout);let binaryChain;
  try{binaryChain=regularChain(executablePath);}catch(error){if(error.code==='ENOENT')continue;throw error;}
  if(!lstatSync(executablePath).isFile())fail('codex_binary_invalid');accessSync(executablePath,constants.X_OK);
  const binarySignature=signature(executablePath),adhoc=/Signature=adhoc|flags=.*adhoc/.test(binarySignature);
  let binarySignatureVerified=false;
  if(!adhoc){run('/usr/bin/codesign',['--verify','--strict','--test-requirement','=anchor apple generic and certificate leaf[subject.OU] = "'+CODEX_HOST_TEAM+'"',executablePath]);if(!binarySignature.includes('TeamIdentifier='+CODEX_HOST_TEAM))fail('codex_publisher_mismatch');binarySignatureVerified=true;}
  else run('/usr/bin/codesign',['--verify','--strict',executablePath]);
  const seal=join(bundlePath,'Contents/_CodeSignature/CodeResources');const sealChain=regularChain(seal);
  const relative=layout.slice('Contents/'.length).replaceAll('.', '\\.');
  const encoded=run('/usr/bin/plutil',['-extract','files2.'+relative+'.hash2','raw','-o','-',seal]).trim();
  const sealHash=Buffer.from(encoded,'base64');if(sealHash.length!==32||sealHash.toString('base64')!==encoded)fail('codex_resource_seal_unavailable');
  const sha256=hashFile(executablePath);if(sha256!==sealHash.toString('hex'))fail('codex_resource_seal_mismatch');
  if(!unchanged(chain)||!unchanged(infoChain)||!unchanged(binaryChain)||!unchanged(sealChain))fail('codex_host_changed');
  return {executablePath,bundlePath,bundleIdentifier:id,publisherTeamIdentifier:CODEX_HOST_TEAM,bundleSignatureVerified:true,bundleNotarizedRequirementVerified:true,binarySignatureVerified,binaryAdHoc:adhoc,bundleResourceIntegrityVerified:true,binarySHA256:sha256,trustBasis:binarySignatureVerified?'signed-openai-binary-and-sealed-host-resource':'sealed-resource-of-signed-openai-host',accountVerified:false,appServerProtocolVerified:false};
 }
 fail('codex_cli_not_found');
}

/** Fixed macOS host bundle discovery, no PATH/env/UI candidates and no account
 * execution. A sealed ad hoc binary does not inherit its host's signature: the
 * descriptor distinguishes the two trust bases. inspector is trusted test-only.
 * Updates/replacements require a new discovery and are rejected before launch. */
export function discoverCodexHost({platform=process.platform,inspector=inspectBundle}={}){
 if(platform!=='darwin')return Object.freeze({available:false,platform,reason:'platform_not_qualified',accountVerified:false});
 const issues=[];
 for(const bundlePath of bundles){try{
   const value=inspector(bundlePath);if(value?.bundlePath!==bundlePath||!layouts.some(layout=>value.executablePath===join(bundlePath,layout))||value.bundleIdentifier!==CODEX_HOST_BUNDLE_ID||value.publisherTeamIdentifier!==CODEX_HOST_TEAM||value.bundleSignatureVerified!==true||value.bundleNotarizedRequirementVerified!==true||value.bundleResourceIntegrityVerified!==true||value.binarySignatureVerified!==true&&value.binaryAdHoc!==true||!/^[a-f0-9]{64}$/.test(value.binarySHA256||''))fail('codex_host_untrusted');
   const admitted=Object.freeze({...value,available:true,platform,accountVerified:false,appServerProtocolVerified:false});admissions.add(admitted);return admitted;
  }catch(error){issues.push({bundlePath,code:error.code==='ENOENT'?'not_installed':/^[a-z_]+$/.test(error.code||'')?error.code:'codex_host_verification_failed'});}
 }
 return Object.freeze({available:false,platform,reason:'trusted_codex_cli_unavailable',issues:Object.freeze(issues),accountVerified:false});
}
export function createCodexHostProvider({platform=process.platform,inspector=inspectBundle}={}){
 const discovery=discoverCodexHost({platform,inspector});
 return Object.freeze({discovery,available:discovery.available,
  createConnection({policy,vault,cwd,environment}={}){
   if(!discovery.available||!admissions.has(discovery))fail('trusted_codex_cli_unavailable');
   const validateLaunch=()=>{const current=discoverCodexHost({platform,inspector});if(!current.available||current.executablePath!==discovery.executablePath||current.binarySHA256!==discovery.binarySHA256||current.bundlePath!==discovery.bundlePath)fail('codex_host_changed');};
   const transport=createCodexAppServerTransport({executablePath:discovery.executablePath,cwd,environment,validateLaunch});return createCodexConnectionProvider({transport,policy,vault});
  },
 });
}
