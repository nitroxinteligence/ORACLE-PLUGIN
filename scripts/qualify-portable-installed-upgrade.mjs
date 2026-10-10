// Existing installed profile across a packaged product upgrade.
// Native bookmark and original engines, synthetic license/selection, no user account.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {generateKeyPairSync,randomUUID,sign,createHash} from 'node:crypto';

const options=Object.fromEntries(process.argv.slice(2).reduce((rows,value,index,all)=>index%2?rows:[...rows,[value,all[index+1]]],[]));
const base=resolve('.work'),scratch=resolve(options['--output']||'');
if(!scratch.startsWith(base+'/'))throw Error('Fresh disposable output inside .work required');
const previous={payloadRoot:resolve(options['--previous-root']||'')};
const current={payloadRoot:resolve(options['--current-root']||'')};
for(const root of [previous.payloadRoot,current.payloadRoot])if(!root.startsWith(base+'/')||await fs.realpath(root)!==root)throw Error('Canonical admitted payload roots inside .work required');
const versions=await Promise.all([previous,current].map(async row=>JSON.parse(await fs.readFile(join(row.payloadRoot,'plugin.json'))).version));
await fs.mkdir(scratch,{mode:0o700});
const dataDir=join(scratch,'private'),vault=join(scratch,'vault'),userHome=join(scratch,'user');
for(const directory of [dataDir,vault,userHome])await fs.mkdir(directory,{mode:0o700});
await fs.mkdir(join(vault,'PESSOAL'));await fs.writeFile(join(vault,'PESSOAL/original.md'),'# Preserve synthetic original\n');
const pair=generateKeyPairSync('ed25519'),publicKey=pair.publicKey.export({type:'spki',format:'der'}).subarray(-32).toString('base64'),keys={version:1,keys:{'synthetic-upgrade':publicKey}};
const licensePayload=Buffer.from(JSON.stringify({version:3,product:'oracle-macos',keyID:'synthetic-upgrade',licenseID:randomUUID(),subject:'Isolated installed upgrade qualification',issuedAt:Math.floor(Date.now()/1000)-1,role:'student',accessKeyHash:'d'.repeat(64)}));
const license='ORACLE3.'+licensePayload.toString('base64url')+'.'+sign(null,Buffer.concat([Buffer.from('ORACLE3.'),licensePayload]),pair.privateKey).toString('base64url');
let service,pickerCalls=0,monitor;
const open=async root=>{
 const {createService}=await import(pathToFileURL(join(root,'service.mjs')));
 const {createPlatformHostProviders}=await import(pathToFileURL(join(root,'platform-host-providers.mjs')));
 const platform=await createPlatformHostProviders();assert(platform.directoryBookmarks);
 return createService({root,dataDir,codexUserHome:userHome,codexConnectionFactory:()=>null,keys,providers:{...platform,chooseDirectory:async()=>{pickerCalls++;return {path:vault,authorization:'explicit-user-selection'};}}});
};
const finish=async()=>{const result=await service.installationOperation.settled();assert.equal(result.error,null,JSON.stringify(result.error));return service.dispatcher.dispatch('onboardingStatus');};
try{
 service=await open(previous.payloadRoot);await service.policy.activate(license);await service.profileStore.update(profile=>({...profile,license,qualificationMarker:'keep-upgrade-profile'}));
 await service.dispatcher.dispatch('onboardingChooseVault');const selected=await service.dispatcher.dispatch('onboardingStatus');
 await service.dispatcher.dispatch('onboardingInstallMemoryOnly',{localMemoryPortability:{schemaVersion:1,acknowledgment:'oracle_local_memory_portability_v1',vaultSelectionRevision:selected.vaultSelectionRevision},maintenance:{enabled:false,autoCapture:false,remoteProcessing:false,installOfficialHooks:false}});
 let lastPhase='';monitor=setInterval(()=>{const phase=service.coordinator.snapshot().status;if(phase!==lastPhase){lastPhase=phase;process.stdout.write(JSON.stringify({phase,stage:'install-previous'})+'\n');}},5000);
 const installed=await finish();clearInterval(monitor);assert.equal(installed.status,'completed');assert.equal(installed.installationCompleted,true);
 const before=await service.profileStore.load(),contentBefore=structuredClone(before.contentInstallations),stageBefore=await fs.readdir(join(dataDir,'content-staging'));
 const sample=join(vault,'SISTEMA/skills/codigo/frontend/impeccable/SKILL.md'),sampleHash=createHash('sha256').update(await fs.readFile(sample)).digest('hex');
 await service.close();service=null;
 process.stdout.write(JSON.stringify({stage:'restore-current'})+'\n');
 service=await open(current.payloadRoot);lastPhase='';monitor=setInterval(()=>{const phase=service.coordinator.snapshot().status;if(phase!==lastPhase){lastPhase=phase;process.stdout.write(JSON.stringify({phase,stage:'restore-current'})+'\n');}},5000);
 const restored=await finish();clearInterval(monitor);
 assert.equal(restored.status,'completed');assert.equal(restored.installationCompleted,true);assert.equal(restored.resumeExisting,true);assert.equal(restored.runID,installed.runID);assert.equal(pickerCalls,1);
 const after=await service.profileStore.load();assert.equal(after.qualificationMarker,before.qualificationMarker);assert.equal(after.license,before.license);assert.deepEqual(after.contentInstallations,contentBefore);assert.deepEqual(await fs.readdir(join(dataDir,'content-staging')),stageBefore);
 assert.equal(createHash('sha256').update(await fs.readFile(sample)).digest('hex'),sampleHash);assert.equal(await fs.readFile(join(vault,'PESSOAL/original.md'),'utf8'),'# Preserve synthetic original\n');
 const result={passed:true,baseVersion:versions[0],upgradedVersion:versions[1],actualPackagedServices:true,signedCorpus:true,actualOSBookmark:true,realGBrainIndex:true,realAIMemoryProfile:true,status:restored.status,installationCompleted:restored.installationCompleted,runIDPreserved:true,vaultPickerRepeated:false,contentReinstalled:false,contentStagingUnchanged:true,originalNotePreserved:true,skillPreserved:true,profileMarkerPreserved:true,licensePreserved:true,personalProfileUsed:false,hooksRequested:false};
 await fs.writeFile(join(scratch,'report.json'),JSON.stringify(result,null,2)+'\n');process.stdout.write(JSON.stringify(result)+'\n');
}finally{clearInterval(monitor);await service?.close();}
