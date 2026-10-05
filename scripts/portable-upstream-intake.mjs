import fs from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {latestRelease,releaseBytes} from '../packages/oracle-desktop-portable/release-network.mjs';
import {skillsSHA} from '../packages/oracle-desktop-portable/skills-release-admission.mjs';
import {createPublisherFetch} from './publisher-fetch.mjs';
const execute=promisify(execFile),fail=message=>{throw new Error(message);};
const official=Object.freeze({gbrain:'garrytan/gbrain',aiMemory:'akitaonrails/ai-memory'});
async function json(url,fetchImpl){return JSON.parse((await releaseBytes(url,{maximum:2000000,fetchImpl,redirects:false,timeoutMS:15000})).toString('utf8'));}
export async function upstreamCandidates({fetchImpl=globalThis.fetch}={}){
 const output={schemaVersion:1,checkedAt:new Date().toISOString(),components:{},downloaded:false,qualified:false};
 for(const [name,repository] of Object.entries(official)){
  const release=await latestRelease(repository,{fetchImpl});if(!/^v\d+\.\d+\.\d+(?:\.\d+)?$/.test(release.tag_name))fail('Unsupported upstream stable version.');
  let ref=await json(`https://api.github.com/repos/${repository}/git/ref/tags/${release.tag_name}`,fetchImpl),object=ref.object;
  for(let hop=0;object?.type==='tag'&&hop<3;hop++){if(!/^[a-f0-9]{40}$/.test(object.sha??''))fail('Invalid upstream tag object.');object=(await json(`https://api.github.com/repos/${repository}/git/tags/${object.sha}`,fetchImpl)).object;}
  if(object?.type!=='commit'||!/^[a-f0-9]{40}$/.test(object.sha??''))fail('Upstream tag did not resolve to an immutable commit.');
  const assets=release.assets.map(row=>({name:row.name,bytes:row.size,sha256:row.digest?.replace(/^sha256:/,''),url:row.browser_download_url}));
  output.components[name]={repository,version:release.tag_name.slice(1),tag:release.tag_name,commit:object.sha,publishedAt:release.published_at,assets};
 }return output;
}
export async function downloadUpstreamCandidates(candidates,output,{fetchImpl=globalThis.fetch,cloneSource=true}={}){
 if(resolve(output)!==output||await fs.realpath(resolve(output,'..'))!==resolve(output,'..'))fail('Explicit canonical new intake directory required.');await fs.mkdir(output,{mode:0o700});
 const downloaded=[];const ai=candidates.components.aiMemory;
 for(const name of ['ai-memory-macos-aarch64.tar.gz','ai-memory-windows-x86_64.zip','ai-memory-hooks.tar.gz']){
  const matches=ai.assets.filter(row=>row.name===name);if(matches.length!==1)fail('Required official AI Memory artifact absent.');const asset=matches[0];
  if(!/^[a-f0-9]{64}$/.test(asset.sha256??'')||!Number.isSafeInteger(asset.bytes)||asset.bytes<1||asset.bytes>44000000||asset.url!==`https://github.com/${ai.repository}/releases/download/${ai.tag}/${name}`)fail('Official upstream asset digest/origin invalid.');
  const bytes=await releaseBytes(asset.url,{fetchImpl,maximum:asset.bytes,expectedBytes:asset.bytes});if(skillsSHA(bytes)!==asset.sha256)fail('Official upstream artifact digest mismatch.');await fs.writeFile(join(output,name),bytes,{flag:'wx',mode:0o600});downloaded.push({name,bytes:bytes.length,sha256:asset.sha256});
 }
 if(cloneSource)for(const [name,component] of Object.entries(candidates.components)){
  const target=join(output,name==='gbrain'?'gbrain':'ai-memory-source');await execute('git',['-c','core.hooksPath=/dev/null','clone','--depth','1','--branch',component.tag,'--single-branch',`https://github.com/${component.repository}.git`,target],{env:{PATH:process.env.PATH||'/usr/bin:/bin',HOME:output,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'},timeout:300000,maxBuffer:1000000});
  const observed=(await execute('git',['-C',target,'rev-parse','HEAD'],{timeout:5000})).stdout.trim();if(observed!==component.commit)fail('Upstream checkout does not match the immutable release commit.');downloaded.push({source:name,commit:observed});
 }
 const receipt={...candidates,downloaded:true,artifacts:downloaded,qualified:false};await fs.writeFile(join(output,'intake.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});return receipt;
}
export async function main(args=process.argv.slice(2)){
 const options={};for(let i=0;i<args.length;i+=2){if(!['--output','--download'].includes(args[i])||!args[i+1]||options[args[i]])fail('Usage: --output /absolute/new/directory --download yes|no');options[args[i]]=args[i+1];}
 const fetchImpl=createPublisherFetch(),candidates=await upstreamCandidates({fetchImpl});if(options['--download']==='yes'){if(!options['--output'])fail('Output required.');return downloadUpstreamCandidates(candidates,options['--output'],{fetchImpl});}
 if(options['--download']!==undefined&&options['--download']!=='no')fail('Download must be yes or no.');return candidates;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().then(result=>process.stdout.write(JSON.stringify({components:Object.fromEntries(Object.entries(result.components).map(([key,row])=>[key,{repository:row.repository,version:row.version,commit:row.commit}])),downloaded:result.downloaded,qualified:false})+'\n')).catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
