// Actual packaged lifecycle against an already qualified disposable install.
// Native OS bookmarks and original runtimes, no personal profile or account.
import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {generateKeyPairSync,randomUUID,sign,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const options=Object.fromEntries(process.argv.slice(2).reduce((rows,value,index,all)=>index%2?rows:[...rows,[value,all[index+1]]],[]));
const work=resolve('.work'),root=resolve(options['--payload-root']||'');
const isolated=value=>{const target=resolve(value);if(!target.startsWith(work+'/'))throw Error('Disposable qualification paths required');return target;};
isolated(root);if(await fs.realpath(root)!==root)throw Error('Canonical admitted payload required');
const {createService}=await import(pathToFileURL(join(root,'service.mjs')));
const {createPlatformHostProviders}=await import(pathToFileURL(join(root,'platform-host-providers.mjs')));
const finish=async service=>{let phase='';const timer=setInterval(()=>{const current=service.coordinator.snapshot().status;if(current!==phase){phase=current;process.stdout.write(JSON.stringify({pid:process.pid,phase})+'\n');}},2500);try{const result=await service.installationOperation.settled();assert.equal(result?.error,null,JSON.stringify(result));return service.dispatcher.dispatch('onboardingStatus');}finally{clearInterval(timer);}};
if(options['--child-profile']){
 const dataDir=isolated(options['--child-profile']),userHome=isolated(options['--user-home']);
 const service=await createService({root,dataDir,codexUserHome:userHome,codexConnectionFactory:()=>null,keys:{version:1,keys:{'synthetic-reopen':options['--public-key']}}});
 try{
  if(options['--dormant']){
   assert.equal(service.vault.status().selected,false);process.stdout.write('ready\n');
   await new Promise(resolve=>{process.stdin.once('data',resolve);process.stdin.resume();});process.stdin.pause();
   const polls=await Promise.all(Array.from({length:6},()=>service.dispatcher.dispatch('onboardingStatus')));for(const poll of polls)assert.equal(poll.hasVault,true);
  }
  const state=await finish(service);assert.equal(state.status,'completed');assert.equal(state.resumeExisting,true);assert.equal(state.aiMemoryRuntime.runtimeReady,false);await fs.writeFile(isolated(options['--output']),JSON.stringify({passed:true,runID:state.runID,pid:process.pid,dormantResumed:!!options['--dormant']}));
 }finally{await service.close();}
}else{
 const previousPath=isolated(options['--installation-report']),previous=JSON.parse(await fs.readFile(previousPath));assert(previous.passed&&previous.installationCompleted&&previous.personalProfileUsed===false);
 const dataDir=isolated(previous.dataDir||join(dirname(previousPath),'private')),vault=isolated(previous.vault),userHome=isolated(previous.userHome);
 const reportPath=isolated(options['--output']),scratch=dirname(reportPath);await fs.mkdir(scratch,{recursive:true});
 const pair=generateKeyPairSync('ed25519'),publicKey=pair.publicKey.export({type:'spki',format:'der'}).subarray(-32).toString('base64'),keys={version:1,keys:{'synthetic-reopen':publicKey}};
 const payload=Buffer.from(JSON.stringify({version:3,product:'oracle-macos',keyID:'synthetic-reopen',licenseID:randomUUID(),subject:'Disposable reopen qualification',issuedAt:Math.floor(Date.now()/1000)-1,role:'student',accessKeyHash:'c'.repeat(64)}));
 const license='ORACLE3.'+payload.toString('base64url')+'.'+sign(null,Buffer.concat([Buffer.from('ORACLE3.'),payload]),pair.privateKey).toString('base64url');
 // Only disposable fixture setup: both conversations start with a valid
 // license but without a durable selection, before the first picker action.
 const profilePath=join(dataDir,'profile.json'),initialProfile=JSON.parse(await fs.readFile(profilePath));let previousMethodHash,previousMethodFingerprint,currentMethodRoot;
 if(options['--previous-root']){
  const oldRoot=isolated(options['--previous-root']),oldMethod=isolated(options['--previous-method-root']);
  for(const path of [oldRoot,oldMethod])assert.equal(await fs.realpath(path),path);
  const oldAdmission=await import(pathToFileURL(join(oldRoot,'content-admission.mjs'))),oldVerifier=await import(pathToFileURL(join(oldRoot,'method-installation-verifier.mjs')));
  const admitted=oldAdmission.verifyPortableContentManifest(await fs.readFile(join(oldRoot,'resources/updates/portable-content.json')),{trust:oldAdmission.loadReviewedContentTrust(join(oldRoot,'resources'))});
  await oldVerifier.verifyGBrainMethodInstallation({admitted,methodRoot:oldMethod});
  currentMethodRoot=join(dataDir,'installed-method',createHash('sha256').update(await fs.readFile(join(root,'resources/updates/portable-content.json'))).digest('hex'));
  await fs.rename(currentMethodRoot,join(scratch,'retained-current-method'));
  const previousMethodRoot=join(dataDir,'installed-method',admitted.manifestSHA256);await fs.cp(oldMethod,previousMethodRoot,{recursive:true,errorOnExist:true,force:false});
  previousMethodFingerprint=async()=>Object.fromEntries(await Promise.all(admitted.manifest.files.filter(row=>row.path.startsWith('resources/gbrain-method/')).map(async row=>{const file=join(previousMethodRoot,row.path.slice('resources/gbrain-method/'.length));return [row.path,createHash('sha256').update(await fs.readFile(file)).digest('hex')];})));
  previousMethodHash=await previousMethodFingerprint();
  // This journal generation is a synthetic migration seam. Completion still
  // requires signed vault readback, the OS grant, real index and owned memory.
  initialProfile.contentInstallations=Object.fromEntries(Object.entries(initialProfile.contentInstallations).map(([key,row])=>[key,{...row,manifestSHA256:admitted.manifestSHA256}]));
  initialProfile.portableContentFeed={sequence:admitted.manifest.sequence,manifestSHA256:admitted.manifestSHA256,releaseID:admitted.manifest.release_id};
 }
 await fs.writeFile(profilePath,JSON.stringify({...initialProfile,license,vaultSelection:null}),{mode:0o600});
 let pickerCalls=0;const platform=await createPlatformHostProviders();assert(platform.directoryBookmarks);
 const providers={...platform,chooseDirectory:async()=>{pickerCalls++;return {path:vault,authorization:'explicit-user-selection'};}};
 const open=()=>createService({root,dataDir,codexUserHome:userHome,providers,codexConnectionFactory:()=>null,keys});
 const child=number=>new Promise((yes,no)=>{const output=join(scratch,'conversation-'+number+'.json'),command=spawn(process.execPath,[resolve('scripts/qualify-portable-reopen.mjs'),'--payload-root',root,'--child-profile',dataDir,'--user-home',userHome,'--public-key',publicKey,'--output',output],{shell:false,stdio:['ignore','ignore','pipe']});let error='';command.stderr.on('data',value=>error+=value);command.on('error',no);command.on('exit',async status=>{try{if(status!==0)throw Error(error);yes(JSON.parse(await fs.readFile(output)));}catch(failure){no(failure);}});});
 const dormantOutput=join(scratch,'dormant-conversation.json'),dormant=spawn(process.execPath,[resolve('scripts/qualify-portable-reopen.mjs'),'--payload-root',root,'--child-profile',dataDir,'--user-home',userHome,'--public-key',publicKey,'--dormant','true','--output',dormantOutput],{shell:false,stdio:['pipe','pipe','pipe']});let dormantError='';dormant.stderr.on('data',value=>dormantError+=value);
 const dormantDone=new Promise((yes,no)=>{dormant.on('error',no);dormant.on('exit',async code=>{try{if(code!==0)throw Error(dormantError);yes(JSON.parse(await fs.readFile(dormantOutput)));}catch(error){no(error);}});});dormantDone.catch(()=>{});
 const dormantReady=new Promise((yes,no)=>{const timeout=setTimeout(()=>{dormant.kill('SIGKILL');no(Error('Dormant conversation boot timed out'));},30000);let stdout='';dormant.stdout.on('data',bytes=>{stdout+=bytes;if(stdout.includes('ready\n')){clearTimeout(timeout);yes();}});dormant.once('error',error=>{clearTimeout(timeout);no(error);});dormant.once('exit',code=>{clearTimeout(timeout);if(code!==0)no(Error(dormantError));});});
 let service=await open(),runID,contentBefore,stageBefore,protectedBefore;
 const profile=()=>JSON.parse(fsSyncProfile());
 function fsSyncProfile(){return readFileSync(join(dataDir,'profile.json'),'utf8');}
 const protectedPaths=[join(vault,'PESSOAL/original.md'),join(dataDir,'ai-memory/oracle-owned.json'),join(dataDir,'ai-memory/profile-prepared.json'),join(dataDir,'ai-memory/data/config.toml'),join(dataDir,'ai-memory/data/db/memory.sqlite')];
 const fingerprint=async()=>Object.fromEntries(await Promise.all(protectedPaths.map(async file=>{const info=await fs.stat(file);return [file,{sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex'),mtimeMs:info.mtimeMs}];})));
 try{
  await dormantReady;
  contentBefore=profile().contentInstallations;stageBefore=await fs.readdir(join(dataDir,'content-staging'));protectedBefore=await fingerprint();
  await service.dispatcher.dispatch('onboardingChooseVault');const first=await finish(service);assert.equal(first.status,'completed');assert.equal(first.resumeExisting,true);assert.equal(first.aiMemoryInstallationVerified,true);assert.equal(first.aiMemoryRuntime.runtimeReady,false);assert.equal(pickerCalls,1);runID=first.runID;
  await service.dispatcher.dispatch('onboardingKnowledgeWelcomeSeen',{runID,vault});
  dormant.stdin.end('\n');const resumed=await dormantDone;assert.equal(resumed.dormantResumed,true);assert.equal(resumed.runID,runID);assert.notEqual(resumed.pid,process.pid);assert.equal(pickerCalls,1);
 }finally{if(dormant.exitCode===null)dormant.kill('SIGKILL');await service.close();}
 service=await open();
 try{
  assert.equal(service.vault.status().selected,true);const reopened=await finish(service);assert.equal(reopened.status,'completed');assert.equal(reopened.runID,runID);assert.deepEqual(reopened.knowledgeWelcome,{runID,vault});assert.equal(pickerCalls,1);assert.equal(reopened.hooksTrusted,false);assert.equal(reopened.captureReady,false);assert.equal(reopened.codexConnected,false);assert.equal(service.memoryConsent.snapshot().portabilityAuthorized,false);
  const {createMCPServer}=await import(pathToFileURL(join(root,'server.mjs')));const server=createMCPServer({...service,version:'qualification'});
  for(let i=0;i<2;i++)await server.request('tools/call',{name:'oracle_open',arguments:{}});
  assert.equal((await service.dispatcher.dispatch('onboardingStatus')).runID,runID);
 }finally{await service.close();}
 const children=await Promise.all([child(1),child(2)]);for(const result of children){assert(result.passed);assert.equal(result.runID,runID);}assert.notEqual(children[0].pid,children[1].pid);
 assert.deepEqual(profile().contentInstallations,contentBefore);assert.deepEqual(await fs.readdir(join(dataDir,'content-staging')),stageBefore);assert.deepEqual(await fingerprint(),protectedBefore);
 // A user's changed skill must be preserved and must not become completion
 // merely because an old journal says installed. Retry repeats verification.
 const changed=join(vault,'SISTEMA/skills/codigo/frontend/impeccable/SKILL.md'),original=await fs.readFile(changed),edited=Buffer.from('# Synthetic changed skill\nPreserve this user edit.\n');await fs.writeFile(changed,edited);
 try{service=await open();try{await service.installationOperation.settled();const failed=await service.dispatcher.dispatch('onboardingStatus');assert.equal(failed.installationCompleted,false);assert(['failed','interrupted'].includes(failed.status));await service.dispatcher.dispatch('onboardingResume');await service.installationOperation.settled();assert((await fs.readFile(changed)).equals(edited));assert.deepEqual(profile().contentInstallations,contentBefore);assert.deepEqual(await fs.readdir(join(dataDir,'content-staging')),stageBefore);}finally{await service.close();}}finally{await fs.writeFile(changed,original);}
 // Explicit revocation removes the durable grant. A subsequent selection can
 // recover the same installation without downloading or reinstalling.
 service=await open();try{await finish(service);await service.dispatcher.dispatch('revoke');assert.equal(profile().vaultSelection,null);}finally{await service.close();}
 service=await open();try{assert.equal(service.vault.status().selected,false);assert.equal((await service.dispatcher.dispatch('onboardingStatus')).installationCompleted,false);await service.dispatcher.dispatch('onboardingChooseVault');const recovered=await finish(service);assert.equal(recovered.status,'completed');assert.equal(recovered.runID,runID);assert.equal(pickerCalls,2);}finally{await service.close();}
 const {createProfileStore}=await import(pathToFileURL(join(root,'profile-store.mjs'))),{createProfileKernelLock}=await import(pathToFileURL(join(root,'profile-kernel-lock.mjs'))),{GBRAIN_NATIVE_PINS}=await import(pathToFileURL(join(root,'gbrain-native-pins.mjs')));
 const addon=join(root,GBRAIN_NATIVE_PINS[`${process.platform}-${process.arch}`].path),crashDir=join(scratch,'crash-profile-'+randomUUID()),store=createProfileStore({dataDir:crashDir,acquireLock:createProfileKernelLock(addon)});await store.save({count:0});
 const code=`import {createProfileStore} from ${JSON.stringify(pathToFileURL(join(root,'profile-store.mjs')).href)};import {createProfileKernelLock} from ${JSON.stringify(pathToFileURL(join(root,'profile-kernel-lock.mjs')).href)};const store=createProfileStore({dataDir:${JSON.stringify(crashDir)},acquireLock:createProfileKernelLock(${JSON.stringify(addon)})});const timer=setInterval(()=>{},1000);await store.update(async value=>{process.stdout.write('locked\\n');await new Promise(()=>{});return value;});clearInterval(timer);`;
 const writer=spawn(process.execPath,['--eval',code],{shell:false,stdio:['ignore','pipe','pipe']});let diagnostic='';writer.stderr.on('data',value=>diagnostic+=value);
 const stopped=new Promise(resolve=>writer.on('exit',resolve));await new Promise((yes,no)=>{const timer=setTimeout(()=>{writer.kill('SIGKILL');no(Error('Kernel lock fixture timed out: '+diagnostic));},10000);writer.stdout.once('data',value=>{clearTimeout(timer);assert.equal(String(value),'locked\n');yes();});writer.once('error',error=>{clearTimeout(timer);no(error);});});writer.kill('SIGKILL');await stopped;await store.update(value=>({...value,count:value.count+1}));assert.equal((await store.load()).count,1);
 if(previousMethodFingerprint){assert.deepEqual(await previousMethodFingerprint(),previousMethodHash);assert((await fs.stat(currentMethodRoot)).isDirectory());}
 const report={passed:true,scope:'Packaged existing-installation restart with actual macOS bookmark, dormant conversation, two separate concurrent conversations and preservation checks',payloadRoot:root,packageReceiptSHA256:createHash('sha256').update(await fs.readFile(join(root,'portable-package-receipt.json'))).digest('hex'),actualOSBookmark:true,realGBrainStatus:true,realAIMemoryInstalledSchema:true,aiMemoryServiceStartedOnReopen:false,stableRunID:true,welcomePreserved:true,repeatedOracleOpen:true,concurrentProcesses:2,dormantConversationResumed:true,kernelLockRecoveredAfterCrash:true,contentReinstalled:false,contentDownloaded:false,protectedFilesPreserved:true,editedSkillPreserved:true,forgedJournalNotCompletion:true,revocationVerified:true,legacyInstallRecoveredAfterOneSelection:true,personalProfileUsed:false,accountAccessed:false,hooksTrusted:false,captureEnabled:false,installationReport:previousPath,privateMethodMigrationVerified:!!previousMethodFingerprint,syntheticPreviousJournal:!!previousMethodFingerprint};
 await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify({report:reportPath,...report})+'\n');
}
