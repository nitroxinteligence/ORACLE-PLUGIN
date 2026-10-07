// Actual signed corpus, original runtimes and local installation in disposable
// state. License and folder selection are explicit synthetic composition seams.
import fs from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {generateKeyPairSync,randomUUID,sign,createHash} from 'node:crypto';

const options=Object.fromEntries(process.argv.slice(2).reduce((rows,value,index,all)=>index%2?rows:[...rows,[value,all[index+1]]],[]));
const root=resolve(options['--payload-root']||''),work=resolve('.work');
if(!root.startsWith(work+'/')||await fs.realpath(root)!==root)throw Error('Isolated admitted payload root required');
const {createService}=await import(pathToFileURL(join(root,'service.mjs')));
const {createPlatformHostProviders}=await import(pathToFileURL(join(root,'platform-host-providers.mjs')));
let scratch;
if(options['--output']){
 scratch=resolve(options['--output']);if(!scratch.startsWith(work+'/')||await fs.realpath(dirname(scratch))!==dirname(scratch))throw Error('Fresh canonical qualification output inside .work required');await fs.mkdir(scratch,{mode:0o700});
}else{const base=join(work,'portable-onboarding-qualification');await fs.mkdir(base,{recursive:true});scratch=await fs.mkdtemp(join(base,'synthetic-'));}
const vault=join(scratch,'vault'),data=join(scratch,'private'),userHome=join(scratch,'user');
await fs.mkdir(vault,{mode:0o700});await fs.mkdir(data,{mode:0o700});
await fs.mkdir(userHome,{mode:0o700});
const legacyWorkspace=join(data,'codex-workspaces',createHash('sha256').update(vault).digest('hex'));
const legacyAgents=Buffer.from('# Oracle System workspace\nPlano assinado: '+ 'a'.repeat(64)+'\n');
await fs.mkdir(legacyWorkspace,{recursive:true,mode:0o700});await fs.writeFile(join(legacyWorkspace,'AGENTS.md'),legacyAgents,{mode:0o600});
const metadata='SISTEMA/skills/codigo/frontend/impeccable/agents/openai.yaml';
const original=Buffer.from('interface:\n  display_name: Impeccable\n  short_description: Use when the user wants to design, redesign, shape, critique, audit, polish, clarify,...\n  default_prompt: Use Impeccable to redesign, critique, audit, or polish this frontend.');
await fs.mkdir(dirname(join(vault,metadata)),{recursive:true});await fs.writeFile(join(vault,metadata),original);
await fs.mkdir(join(vault,'PESSOAL'));await fs.writeFile(join(vault,'PESSOAL/original.md'),'# Synthetic personal note\nKeep this original.\n');
const pair=generateKeyPairSync('ed25519'),publicKey=pair.publicKey.export({type:'spki',format:'der'}).subarray(-32).toString('base64');
const platform=await createPlatformHostProviders();if(!platform.directoryBookmarks)throw Error('Actual macOS bookmark provider required');
const service=await createService({root,dataDir:data,codexUserHome:userHome,providers:{...platform,chooseDirectory:async()=>({path:vault,authorization:'explicit-user-selection'})},codexConnectionFactory:()=>null,keys:{version:1,keys:{synthetic:publicKey}}});
let monitor,deadline;
try{
 const license=Buffer.from(JSON.stringify({version:3,product:'oracle-macos',keyID:'synthetic',licenseID:randomUUID(),subject:'Synthetic local installation qualification',issuedAt:Math.floor(Date.now()/1000)-1,role:'student',accessKeyHash:'b'.repeat(64)}));
 const activation='ORACLE3.'+license.toString('base64url')+'.'+sign(null,Buffer.concat([Buffer.from('ORACLE3.'),license]),pair.privateKey).toString('base64url');await service.policy.activate(activation);
 const ticket=service.policy.requireCapability('configure');await service.profileStore.update(profile=>({...profile,license:activation}),{beforeCommit:()=>service.policy.assertAdmission(ticket)});
 const dispatch=(method,params={})=>service.dispatcher.dispatch(method,params);
 await dispatch('onboardingChooseVault');const selected=await dispatch('onboardingStatus');
 await dispatch('onboardingInstallMemoryOnly',{localMemoryPortability:{schemaVersion:1,acknowledgment:'oracle_local_memory_portability_v1',vaultSelectionRevision:selected.vaultSelectionRevision},maintenance:{enabled:false,autoCapture:false,remoteProcessing:false,installOfficialHooks:false}});
 let previous='';monitor=setInterval(()=>{const phase=service.coordinator.snapshot().status;if(phase!==previous){previous=phase;process.stdout.write(JSON.stringify({phase})+'\n');}},5000);
 const result=await Promise.race([service.installationOperation.settled(),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('Local installation exceeded qualification deadline')),600000);})]);
 if(result.error)throw Error(JSON.stringify(result.error));
 const state=await dispatch('onboardingStatus');
 if(state.installationCompleted!==true||state.localContentVerified!==true||state.aiMemoryVerified!==true||state.status!=='completed')throw Error('Local installation not complete: '+JSON.stringify({status:state.status,phase:state.phase,message:state.message}));
 const backup=join(data,'readable-metadata-backups',createHash('sha256').update(original).digest('hex')+'.yaml');
 if(!(await fs.readFile(backup)).equals(original)||!(await fs.readFile(join(vault,metadata),'utf8')).includes('Oracle Frontend Impeccable'))throw Error('Reviewed metadata migration or original backup failed');
 if(await fs.readFile(join(vault,'PESSOAL/original.md'),'utf8')!=='# Synthetic personal note\nKeep this original.\n')throw Error('Personal fixture changed');
 if(!(await fs.readFile(join(legacyWorkspace,'AGENTS.md'))).equals(legacyAgents))throw Error('Previous Codex workspace changed');
 const {admitSkillsRelease}=await import(pathToFileURL(join(root,'skills-release-admission.mjs')));
 const trust=JSON.parse(await fs.readFile(join(root,'resources/updates/distribution-keys.json'),'utf8'));
 const skills=admitSkillsRelease(await fs.readFile(join(root,'engine-source/provenance/oracle-distribution.json')),{trust});
 const destination=join(userHome,'.agents/skills'),names=await fs.readdir(destination);
 if(!skills.items.length||names.length!==skills.items.length)throw Error('Packaged installer did not register the complete signed skills catalog');
 for(const item of skills.items){if(!names.includes(item.hostName)||await fs.realpath(join(destination,item.hostName,'SKILL.md'))!==join(vault,item.entry))throw Error('Registered skill readback diverged');}
 const report={passed:true,scope:'Actual packaged local installation with previous public skill metadata and legacy Codex workspace',signedCorpus:true,realGBrainIndex:true,realAIMemoryRuntime:true,actualOSBookmark:true,metadataUpdated:true,originalBackupVerified:true,personalFixturePreserved:true,legacyCodexWorkspacePreserved:true,registeredSkills:skills.items.length,registrationVerified:true,codexDiscoveryVerified:false,dataDir:data,userHome,vault,installationCompleted:state.installationCompleted,syntheticLicense:true,syntheticFolderSelection:true,personalProfileUsed:false,hooksRequested:false,codexConnectionRequested:false,maintenanceRequested:false};
 await fs.writeFile(join(scratch,'report.json'),JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify({report:join(scratch,'report.json'),...report})+'\n');
}finally{clearInterval(monitor);clearTimeout(deadline);await service.close();}
