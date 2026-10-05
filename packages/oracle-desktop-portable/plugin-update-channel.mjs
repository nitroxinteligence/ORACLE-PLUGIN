import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {homedir} from 'node:os';
import {loadReviewedContentTrust} from './content-admission.mjs';
import {admitPluginRelease,assertPluginRelease,newerPluginVersion,PLUGIN_REPOSITORY,PLUGIN_MARKETPLACE} from './plugin-release-admission.mjs';
import {skillsSHA} from './skills-release-admission.mjs';
import {latestRelease,releaseBytes} from './release-network.mjs';
import {discoverCodexHost} from './codex-host-provider.mjs';
const execute=promisify(execFile),fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
export async function verifyPluginReleaseDirectory(root,files){
 if(resolve(root)!==root||await fs.realpath(root)!==root)fail('plugin_path_collision','Pasta do plugin redirecionada.');const names=[];
 async function walk(dir,prefix=''){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const path=prefix?prefix+'/'+entry.name:entry.name,local=join(dir,entry.name),info=await fs.lstat(local);if(info.isSymbolicLink())fail('plugin_path_collision','Link recusado no pacote.');if(info.isDirectory())await walk(local,path);else if(info.isFile()&&info.nlink===1)names.push(path);else fail('plugin_path_collision','Arquivo irregular no pacote.');}}
 await walk(root);if(names.sort().join('\0')!==Object.keys(files).sort().join('\0'))fail('plugin_inventory_changed','O pacote do host não coincide com o inventário assinado.');
 for(const path of names){const file=join(root,path),before=await fs.lstat(file),row=files[path];if(before.size!==row.bytes||process.platform!=='win32'&&(before.mode&0o777)!==row.mode)fail('plugin_inventory_changed','Tamanho ou permissão do pacote divergente.');const hash=createHash('sha256');for await(const block of createReadStream(file))hash.update(block);const after=await fs.lstat(file);if(before.ino!==after.ino||before.size!==after.size||before.mtimeMs!==after.mtimeMs||hash.digest('hex')!==row.sha256)fail('plugin_inventory_changed','Pacote do host mudou.');}return true;
}
/** Updates use only the host's supported plugin CLI. No host cache mutation,
 * account login, personal model execution or application restart is performed. */
export function createPluginUpdateChannel({bundleRoot,hostPackageRoot,policy,profileStore,fetchImpl=globalThis.fetch,platform=`${process.platform}-${process.arch}`,discoverHost=discoverCodexHost,runCLI,home=homedir(),codexHome=process.env.CODEX_HOME||join(home,'.codex')}={}){
 const trust=loadReviewedContentTrust(join(bundleRoot,'resources'));let latest;
 const check=context=>{policy.assertAdmission(context.ticket);if(context.signal?.aborted)fail('operation_cancelled','Atualização cancelada.');};
 async function cli(args,context){check(context);if(runCLI)return runCLI(args,context);const host=discoverHost();if(!host.available)fail('plugin_host_unavailable','Use o gerenciador de plugins do ChatGPT/Codex para esta atualização.');const result=await execute(host.executablePath,['plugin',...args],{cwd:bundleRoot,env:{PATH:process.env.PATH||'/usr/bin:/bin',HOME:home,CODEX_HOME:codexHome,LANG:'en_US.UTF-8',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'},signal:context.signal,timeout:300000,maxBuffer:2000000,windowsHide:true,shell:false});check(context);const after=discoverHost();if(!after.available||after.binarySHA256!==host.binarySHA256)fail('plugin_host_changed','O executável do host mudou.');return JSON.parse(result.stdout);}
 async function marketplace(context){
  const marketplaces=await cli(['marketplace','list','--json'],context),market=marketplaces.marketplaces?.filter(row=>row.name===PLUGIN_MARKETPLACE);
  if(market?.length!==1||typeof market[0].root!=='string')fail('plugin_marketplace_changed','Marketplace não registrado.');
  const marketEntry=market[0];const source=marketEntry.marketplaceSource||marketEntry.source;const url=typeof source==='string'?source:source?.source||source?.url||source?.repository||source?.repo;
  if(source?.sourceType&&source.sourceType!=='git')fail('plugin_marketplace_changed','A fonte do marketplace precisa ser o Git oficial.');
  if(url!==`https://github.com/${PLUGIN_REPOSITORY}`&&url!==`https://github.com/${PLUGIN_REPOSITORY}.git`&&url!==PLUGIN_REPOSITORY)fail('plugin_marketplace_changed','A fonte do marketplace não é a distribuição oficial.');
  return marketEntry;
 }
 async function registered(context){
  const manifest=JSON.parse(await fs.readFile(join(bundleRoot,'plugin.json'),'utf8')),identity=manifest.name+'@'+PLUGIN_MARKETPLACE;
  if(!hostPackageRoot)return {manifest,identity,registered:false};
  const listing=await cli(['list','--marketplace',PLUGIN_MARKETPLACE,'--json'],context),matches=listing.installed?.filter(row=>row.pluginId===identity&&row.installed&&row.enabled);
  if(matches?.length!==1)return {manifest,identity,registered:false};
  const entry=matches[0];
  if(entry.name!==manifest.name||entry.marketplaceName!==PLUGIN_MARKETPLACE||typeof entry.version!=='string')return {manifest,identity,registered:false};
  const root=entry.installedPath||join(codexHome,'plugins/cache',PLUGIN_MARKETPLACE,manifest.name,entry.version);
  if(resolve(root)!==resolve(hostPackageRoot))return {manifest,identity,registered:false};
  return {manifest,identity,registered:true,installed:entry,marketplace:await marketplace(context)};
 }
 return Object.freeze({
  async check(context){await policy.revalidateAdmission(context.ticket);check(context);const manifest=JSON.parse(await fs.readFile(join(bundleRoot,'plugin.json'),'utf8')),prior=(await profileStore.load()).pluginFeed||{};
   const release=await latestRelease(PLUGIN_REPOSITORY,{fetchImpl,signal:context.signal,check:()=>check(context)}),assets=release.assets.filter(row=>row.name==='oracle-plugin-release.json');if(assets.length!==1||!Number.isSafeInteger(assets[0].size)||assets[0].size<1||assets[0].size>2000000||!/^sha256:[a-f0-9]{64}$/.test(assets[0].digest??'')||assets[0].browser_download_url!==`https://github.com/${PLUGIN_REPOSITORY}/releases/download/${release.tag_name}/oracle-plugin-release.json`)fail('invalid_plugin_release','Manifesto da distribuição oficial ausente.');
   const bytes=await releaseBytes(assets[0].browser_download_url,{fetchImpl,signal:context.signal,check:()=>check(context),maximum:2000000,expectedBytes:assets[0].size});if('sha256:'+skillsSHA(bytes)!==assets[0].digest)fail('plugin_inventory_changed','Manifesto diverge da release.');
   const admitted=admitPluginRelease(bytes,{trust,minimumSequence:prior.sequence||0,knownManifestSHA256:prior.manifestSHA256});if(admitted.releaseID!==release.tag_name||!admitted.platforms[platform]||admitted.platforms[platform].name!==manifest.name)fail('plugin_release_incompatible','Release pertence a outra identidade ou plataforma.');
   check(context);await profileStore.update(value=>{check(context);const previous=value.pluginFeed||{};if(previous.sequence>admitted.sequence||previous.sequence===admitted.sequence&&previous.manifestSHA256!==admitted.manifestSHA256)fail('plugin_rollback','A release mudou durante a consulta.');return {...value,pluginFeed:{sequence:admitted.sequence,manifestSHA256:admitted.manifestSHA256,version:admitted.version}};},{beforeCommit:()=>check(context)});latest=admitted;
   return {currentVersion:manifest.version,latestVersion:admitted.version,available:newerPluginVersion(admitted.version,manifest.version),hostManaged:true,releaseURL:`https://github.com/${PLUGIN_REPOSITORY}/releases/tag/${admitted.releaseID}`,marketplaceURL:`https://github.com/${PLUGIN_REPOSITORY}`,signatureVerified:true};
  },
  async apply(context){if(!latest)fail('plugin_check_required','Consulte a atualização do ORACLE primeiro.');assertPluginRelease(latest);const candidate=latest;await policy.revalidateAdmission(context.ticket);check(context);const state=await registered(context);
   if(!state.registered)return {installed:false,registrationRequired:true,url:`https://github.com/${PLUGIN_REPOSITORY}`,message:'Esta instalação foi importada por ZIP. Use o canal público de plugins para receber atualizações pelo host.'};
   if(!newerPluginVersion(candidate.version,state.manifest.version))return {installed:false,restartRequired:false,message:'ORACLE está na versão disponível.'};
   // The CLI owns approval and cache writes. PLUGIN_DATA, vault, licenses and
   // hooks are not copied into, removed from, or restored to the host cache.
   await cli(['marketplace','upgrade',PLUGIN_MARKETPLACE,'--json'],context);check(context);
   const refreshed=await marketplace(context),source=join(refreshed.root,candidate.platforms[platform].path);await verifyPluginReleaseDirectory(source,candidate.platforms[platform].files);check(context);
   // Current Codex also upgrades installed plugins and removes the old cache.
   // Older hosts may only refresh the marketplace. Verify both supported results.
   const listing=await cli(['list','--marketplace',PLUGIN_MARKETPLACE,'--json'],context),matches=listing.installed?.filter(row=>row.pluginId===state.identity&&row.name===state.manifest.name&&row.marketplaceName===PLUGIN_MARKETPLACE&&row.installed&&row.enabled&&row.version===candidate.version);
   let installedRoot;
   if(matches?.length===1)installedRoot=matches[0].installedPath||join(codexHome,'plugins/cache',PLUGIN_MARKETPLACE,state.manifest.name,candidate.version);
   else{
    const result=await cli(['add',state.identity,'--json'],context);if(result.pluginId!==state.identity||result.version!==candidate.version||typeof result.installedPath!=='string')fail('plugin_host_unverified','O host não confirmou a versão esperada.');installedRoot=result.installedPath;
   }
   await verifyPluginReleaseDirectory(resolve(installedRoot),candidate.platforms[platform].files);check(context);
   return {installed:true,restartRequired:true,currentVersion:state.manifest.version,latestVersion:candidate.version,message:'ORACLE atualizado pelo host. Abra uma nova conversa ou reabra o plugin para usar a versão nova.'};
  }
 });
}
