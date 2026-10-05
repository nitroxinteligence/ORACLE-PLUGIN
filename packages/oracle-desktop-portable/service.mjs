import {readFileSync,existsSync} from 'node:fs';
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {resolve,join,basename} from 'node:path';
import {createAccessPolicy} from './access-policy.mjs';
import {createHostCapabilities,validatedExternalURL} from './host-capabilities.mjs';
import {createProfileStore,assertPrivatePath} from './profile-store.mjs';
import {createVaultService} from './vault-service.mjs';
import {createPlatformHostProviders} from './platform-host-providers.mjs';
import {createDispatcher,createVaultHandlers} from './dispatcher.mjs';
import {loadCatalog,createSnapshot} from './catalog-snapshot.mjs';
import {onboardingStatus} from './onboarding-status.mjs';
import {createInstallationOperation} from './installation-operation.mjs';
import {createKnowledgeService} from './knowledge-service.mjs';
import {createExportBuffer} from './export-buffer.mjs';
import {createOnboardingCoordinator} from './onboarding-coordinator.mjs';
import {createRelayAuthorization,createOfficialMemoryRelay} from './official-memory-relay.mjs';
import {createGBrainSourceRunner} from './gbrain-source-runner.mjs';
import {createAIMemoryComposition} from './ai-memory-composition.mjs';
import {createOnboardingAIMemory} from './onboarding-ai-memory.mjs';
import {createMemoryConsentAuthority} from './memory-consent.mjs';
import {createMCPHumanRequestBroker} from './mcp-human-request-broker.mjs';
import {createCodexHostProvider} from './codex-host-provider.mjs';
import {createCodexSkillsRouting} from './codex-skills-routing.mjs';
import {createOfficialHooksInstaller} from './official-hooks-installer.mjs';
import {createCodexInstallationProvider} from './codex-installation-provider.mjs';
import {createHostHookAuthority,createHostCaptureProvider} from './host-capture-provider.mjs';
import {createPortableContentSource} from './content-source-composition.mjs';
import {createPortableAccessGrantResolver} from './access-grant-composition.mjs';
import {createKnowledgeInterviewService} from './knowledge-interview-service.mjs';
import {createPortableUpdateService} from './update-service.mjs';

const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const noArgs=p=>{if(Object.keys(p).length)fail('invalid_request','Esta ação não aceita argumentos.');};
const dictionary=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const safeRoot=value=>typeof value==='string'&&value.length>0&&!value.startsWith('/')&&!value.includes('\\')&&!value.split('/').some(part=>!part||part==='.'||part==='..');

// The default host is discovered only on the explicit Connect action. Existing
// Codex account selection stays with the official CLI; no HOME/CODEX_HOME override,
// credentials, login, model invocation or account lookup occurs at service boot.
function lazyHostConnection({policy,vault,dataDir}){
  let actual=null,closed=false;const listeners=new Set();
  const inactive=()=>({connected:false,explicitAuthorization:false,sessionID:''});
  const get=()=>{if(closed)fail('codex_connection_unavailable','A conexão foi encerrada.');if(!actual){const host=createCodexHostProvider();if(!host.available)fail('codex_connection_unavailable','O Codex oficial não está disponível neste host.');actual=host.createConnection({policy,vault,cwd:dataDir,environment:{PATH:process.env.PATH||'/usr/bin:/bin',LANG:process.env.LANG||'en_US.UTF-8'}});actual.onChange(()=>{for(const listener of listeners)listener();});}return actual;};
  return {authorizeExplicitly:options=>get().authorizeExplicitly(options),verifyActiveConnection:()=>actual?actual.verifyActiveConnection():Promise.resolve(inactive()),revoke:()=>actual?actual.revoke():Promise.resolve(inactive()),skillsList:options=>{if(!actual?.skillsList)fail('codex_skills_unavailable','Conecte explicitamente ao Codex antes da descoberta.');return actual.skillsList(options);},onChange(listener){listeners.add(listener);return()=>listeners.delete(listener);},close(){closed=true;actual?.close();}};
}

// Setup admission is created only by the signed-content coordinator phase.
// Setup never grants portability, chat capture, hooks or connection consent.
function defaultAIMemoryBackend({root,policy,vault,profileStore,dataDir,relayAuthorization,portabilityAuthorization,verifyExplicitRequest,notifyToolsChanged}){
  let binding=null,composition=null,consentGeneration=0;
  const phase=createOnboardingAIMemory({policy,vault,profileStore,createBackend:async({ticket,binding:requested,signal})=>{
    policy.assertAdmission(ticket);const selected=vault.status();
    if(ticket.capability!=='configure'||!selected.selected||requested.vault!==selected.root||requested.selectionRevision!==String(selected.generation)||requested.setupAuthorized!==true)fail('ai_memory_binding_changed','O preparo da memória exige o plano e a pasta atuais.');
    let next;try{next=portabilityAuthorization?.binding?.();}catch{}
    next??=Object.freeze({...requested,consentGeneration:binding&&['vault','selectionRevision','planHash'].every(key=>binding[key]===requested[key])?binding.consentGeneration:++consentGeneration});
    if(['vault','selectionRevision','planHash'].some(key=>next[key]!==requested[key]))fail('ai_memory_consent_changed','A autorização pertence a outro plano.');
    if(binding&&JSON.stringify(binding)!==JSON.stringify(next)){await composition?.close();composition=null;}binding=next;
    composition??=createAIMemoryComposition({bundleRoot:resolve(root),dataDir,policy,vault,profileStore,currentBinding:()=>binding,relayAuthorization,portabilityAuthorization,verifyExplicitRequest});
    const backend=await composition.createBackend({ticket,binding,signal});portabilityAuthorization?.attachMigrationProvider?.({snapshotReader:backend.snapshotReader,mirror:backend.mirror,currentBinding:()=>binding});notifyToolsChanged();return backend;
  }});
  return {phase,async tools(options){if(!composition)return [];const result=await composition.tools(options);return result;},invoke(name,args,options){if(!composition)fail('ai_memory_unavailable','Prepare o AI Memory antes de usar esta ferramenta.');return composition.invoke(name,args,options);},cancel(){phase.cancel();composition?.cancel();notifyToolsChanged();},async close(){await phase.close();await composition?.close();}};
}

// Dependencies injected here are trusted composition code, never RPC fields.
export async function createService({root,hostPackageRoot,dataDir=process.env.ORACLE_PORTABLE_PLUGIN_DATA||process.env.PLUGIN_DATA,resourcesRoot,keys,deviceProvider,providers,host,now,selectionAdapter,maxScanEntries,knowledgeRuntime,contentSourceProvider,codexConnectionFactory,accessGrantResolver,aiMemoryFactory,aiMemoryPortabilityAuthorization,aiMemoryVerifyExplicitRequest,codexInstallationProvider,officialHooksInstaller,hostHookVerifier,updateFactory,knowledgeNetworkSandbox=process.platform==='darwin'}={}) {
  if(typeof root!=='string')fail('runtime_required','Pasta do Oracle ausente.');
  const resources=resourcesRoot||[resolve(root,'resources'),resolve(root,'../../Resources')].find(path=>existsSync(join(path,'web/index.html')));
  if(!resources)fail('resources_missing','Os arquivos do Oracle não foram encontrados.');
  const reviewedKeys=keys||JSON.parse(readFileSync(join(resources,'licensing/public-keys.json'),'utf8'));
  if(accessGrantResolver!==undefined&&typeof accessGrantResolver!=='function')fail('invalid_composition','Emissor de acesso inválido.');
  const policy=createAccessPolicy({keys:reviewedKeys,deviceProvider,...(now?{now}:{})});
  const privateFilesystem=process.platform==='win32'?await(await import('./runtime-payload-windows.mjs')).createWindowsRuntimePlatform():undefined;
  const profileStore=createProfileStore({dataDir,privateFilesystem});
  accessGrantResolver??=createPortableAccessGrantResolver({resourcesRoot:resources});
  if(!contentSourceProvider&&existsSync(join(root,'resources/updates/portable-content.json')))contentSourceProvider=createPortableContentSource({bundleRoot:resolve(root),dataDir,profileStore,policy});
  const profile=await profileStore.load();
  // Persisted paths, preferences and roles never grant vault or license access.
  if(typeof profile.license==='string') {
    try{await policy.activate(profile.license);}catch{/* Invalid/unsupported legacy bindings stay inactive. */}
  }
  if(profile.locked===true)policy.block();
  const resolvedProviders=providers||await createPlatformHostProviders();
  const capabilities=createHostCapabilities({providers:resolvedProviders,host,runtime:{name:process.versions.bun?'Bun':'Node.js',version:process.versions.bun||process.versions.node}});
  let pickerSignal,pickerBusy=false;
  const preserveVersionConflict=async(value,{check})=>{check();await assertPrivatePath(dataDir,{privateFilesystem});const dir=join(dataDir,'conflicts');await fs.mkdir(dir,{mode:0o700}).catch(error=>{if(error.code!=='EEXIST')throw error;});await assertPrivatePath(dir,{privateFilesystem});check();const file=join(dir,randomUUID().toUpperCase()+'.md'),handle=await fs.open(file,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);try{check();await handle.writeFile(value.content);await handle.sync();check();return file;}finally{await handle.close();}};
  const vault=createVaultService({profileStore,maxScanEntries,inspectPath:resolvedProviders.inspectPath,reveal:resolvedProviders.reveal,preserveVersionConflict,admission:{createAdmissionTicket:()=>policy.requireCapability('useOracle'),assertAdmissionTicket:ticket=>policy.assertAdmission(ticket)},selectionAdapter:selectionAdapter||{
    async selectVault(){const selected=await capabilities.chooseDirectory({userInitiated:true,signal:pickerSignal});return selected?{root:selected.path,explicitSelection:true}:null;}
  }});
  let runtimeConfig=knowledgeRuntime;
  if(!runtimeConfig&&existsSync(join(root,'portable-package-receipt.json'))&&existsSync(join(root,'engine-source-receipt.json'))) {
    const packageReceipt=JSON.parse(readFileSync(join(root,'portable-package-receipt.json'),'utf8'));
    const engineReceipt=JSON.parse(readFileSync(join(root,'engine-source-receipt.json'),'utf8'));
    if(packageReceipt.engineSourceIncluded===true&&engineReceipt.engineSourcePin==='8c9a8e9a480c388cf7a87dc0c48dd0d56e6c4bb3')runtimeConfig={runtime:resolve(root,process.platform==='win32'?'runtime/bun.exe':'runtime/bun'),runtimeSHA256:packageReceipt.runtimeSHA256,sourceRoot:resolve(root,'engine-source')};
  }
  // Trusted test composition may use an already enforced outer OS sandbox.
  // The production STDIO entrypoint never supplies this option; no env/RPC flag.
  if(typeof knowledgeNetworkSandbox!=='boolean')fail('invalid_composition','Configuração de execução inválida.');
  if(runtimeConfig)runtimeConfig={...runtimeConfig,networkSandbox:knowledgeNetworkSandbox,...(process.platform==='win32'?{systemDirectory:resolvedProviders.systemDirectory}:{})};
  const knowledge=createKnowledgeService({policy,vault,profileStore,dataDir,runtimeConfig});
  const knowledgeInterviews=createKnowledgeInterviewService({policy,vault,profileStore,openCodex:resolvedProviders.openCodex,inspectPath:resolvedProviders.inspectPath,privateFilesystem,
    indexProfile:root=>join(dataDir,'knowledge',createHash('sha256').update(JSON.stringify(root)).digest('hex'),'gbrain/profile')});
  if(codexConnectionFactory!==undefined&&typeof codexConnectionFactory!=='function')fail('invalid_composition','Provider de conexão inválido.');
  const connection=codexConnectionFactory?await codexConnectionFactory({policy,vault,dataDir}):lazyHostConnection({policy,vault,dataDir});
  if(connection&&['authorizeExplicitly','verifyActiveConnection','revoke','onChange','close'].some(key=>typeof connection[key]!=='function'))fail('invalid_composition','Provider de conexão incompleto.');
  let memoryBinding=null,connectBusy=false;const memoryListeners=new Set();const notifyMemoryTools=()=>{for(const listener of memoryListeners)listener();};
  const relayAuthorization=connection?createRelayAuthorization({verifyActiveConnection:()=>connection.verifyActiveConnection()}):null;
  officialHooksInstaller??=createOfficialHooksInstaller({bundleRoot:root,dataDir});let officialHooksReceipt=null;
  const memoryConsent=createMemoryConsentAuthority({policy,vault,profileStore});let pendingMemoryInstallation=null;
  const installationOperation=createInstallationOperation();
  let installationAdmission=false;
  const memoryWriteBroker=createMCPHumanRequestBroker({policy,vault,relayAuthorization});
  codexInstallationProvider??=createCodexInstallationProvider({policy,vault,dataDir,bundleRoot:root,installationStatus:()=>coordinator?.snapshot()||{}});
  const skillsRouting=createCodexSkillsRouting({connection,policy,vault,installationProvider:codexInstallationProvider});
  const hookAuthority=createHostHookAuthority({verifyEvent:hostHookVerifier});
  const capture=createHostCaptureProvider({policy,vault,consent:memoryConsent,profileStore,hookAuthority,workspaceProvider:codexInstallationProvider?async options=>{const installed=await codexInstallationProvider(options);await installed.verifyManagedFiles(options);installed.assertCurrent();return {path:installed.workspace,assertCurrent:installed.assertCurrent};}:undefined});
  aiMemoryPortabilityAuthorization??=memoryConsent;aiMemoryVerifyExplicitRequest??=request=>memoryWriteBroker.verifyExplicitRequest(request);
  let memoryRelay,aiMemoryBackend;const aiMemoryListeners=new Set();const notifyAITools=()=>{for(const listener of aiMemoryListeners)listener();};
  const cancelMemory=({cancelAI=true}={})=>{if(cancelAI){aiMemoryBackend?.cancel();notifyAITools();}memoryBinding?.runner?.closeMemory?.();memoryBinding=null;relayAuthorization?.revoke();memoryRelay?.cancel();notifyMemoryTools();};
  const disconnectMemory=()=>{updates?.revoke();installationOperation.cancel();officialHooksReceipt=null;codexInstallationProvider.invalidate?.();memoryConsent.revoke();skillsRouting.invalidate();capture.revoke();pendingMemoryInstallation=null;memoryWriteBroker.revoke();cancelMemory();if(connection)void Promise.resolve(connection.revoke()).catch(()=>{});};
  const connectionRequired=()=>{if(!connection)fail('codex_connection_unavailable','A conexão com o Codex ainda não está disponível neste host.');return connection;};
  const stateFor=root=>join(dataDir,'knowledge',createHash('sha256').update(JSON.stringify(root)).digest('hex'));
  const epochHash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const verifyIndexBinding=async(selection,check)=>{
    const stateRoot=stateFor(selection.root),file=join(stateRoot,'gbrain/profile/oracle-vault-manifest.json');await assertPrivatePath(file);check();const info=await fs.lstat(file);if(!info.isFile()||info.nlink!==1||info.size>16_000_000)fail('relay_engine_unavailable','Prepare o índice local antes de conectar a memória.');
    const manifest=JSON.parse(await fs.readFile(file,'utf8'));check();
    if(!manifest.complete||manifest.root!==selection.root||!Array.isArray(manifest.records))fail('relay_engine_unavailable','O índice local precisa ser preparado.');
    const scan=await vault.scan();check();const notes=scan.notes.filter(row=>!/^INBOX\/oracle-memory(?:\/|$)/i.test(row.path));
    const expected=new Map(manifest.records.map(row=>[row.path,row.sha256]));
    if(!scan.complete||notes.length!==expected.size||notes.some(row=>expected.get(row.path)!==row.revision)){cancelMemory({cancelAI:false});fail('relay_index_stale','Os arquivos mudaram. Atualize o índice local antes de consultar a memória.');}
    return stateRoot;
  };
  const prepareRelayBinding=async(context)=>{
    if(!connection||!runtimeConfig)return false;
    const proof=await connection.verifyActiveConnection();if(!proof.connected||!proof.explicitAuthorization)return false;
    return vault.withContentReadScope(async grant=>{const check=()=>{grant.check();policy.assertAdmission(context.ticket);if(context.signal?.aborted)fail('operation_cancelled','Conexão cancelada.');};check();
      const selected={root:grant.root,generation:grant.generation},stateRoot=await verifyIndexBinding(selected,check);check();
      const directory=join(stateRoot,'gbrain');await assertPrivatePath(directory);check();
      const path=join(directory,'vault-epoch.json'),bytes=JSON.stringify({schemaVersion:1,reviewedVault:grant.root,vaultGeneration:grant.generation,sessionID:proof.sessionID,policyGeneration:context.ticket.generation,nonce:randomUUID()});
      const temporary=path+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temporary,bytes,{flag:'wx',mode:0o600});check();await assertPrivatePath(directory);check();await fs.rename(temporary,path);check();}finally{await fs.unlink(temporary).catch(()=>{});}
      const confirmed=await connection.verifyActiveConnection();check();if(!confirmed.connected||confirmed.sessionID!==proof.sessionID)fail('relay_connection_inactive','A conexão mudou durante o preparo.');
      cancelMemory({cancelAI:false});memoryBinding={...selected,stateRoot,sessionID:proof.sessionID,vaultEpochSHA256:epochHash(bytes)};notifyMemoryTools();return true;
    },{signal:context.signal});
  };
  if(connection)memoryRelay=createOfficialMemoryRelay({policy,vault,relayAuthorization,verifyExplicitWrite:request=>memoryWriteBroker.verifyExplicitRequest(request),runnerFactory:async({selection,check})=>{
    const bound=memoryBinding;if(!bound||bound.root!==selection.root||bound.generation!==selection.generation)fail('relay_engine_unavailable','Prepare o índice e conecte explicitamente a memória nesta pasta.');
    await verifyIndexBinding(selection,check);check();const proof=await connection.verifyActiveConnection();check();if(!proof.connected||proof.sessionID!==bound.sessionID)fail('relay_connection_inactive','A conexão da memória mudou.');
    const file=join(bound.stateRoot,'gbrain/vault-epoch.json');await assertPrivatePath(file);check();if(epochHash(await fs.readFile(file))!==bound.vaultEpochSHA256)fail('relay_selection_changed','O preparo da memória mudou.');check();
    bound.runner??=createGBrainSourceRunner({...runtimeConfig,stateRoot:bound.stateRoot,vaultRoot:selection.root,bunConfig:join(bound.stateRoot,'bunfig.toml')});
    return {runner:bound.runner,vaultEpochSHA256:bound.vaultEpochSHA256};
  }});
  // Trusted AI phase factory owns real admission/consent, never persisted flags.
  // No factory means unavailable; boot does not start AI runtime or capture.
  if(aiMemoryFactory!==undefined){
    if(typeof aiMemoryFactory!=='function')fail('invalid_composition','Provider AI Memory inválido.');
    aiMemoryBackend=await aiMemoryFactory({policy,vault,profileStore,dataDir,relayAuthorization,notifyToolsChanged:notifyAITools});
    if(aiMemoryBackend&&['tools','invoke','cancel','close'].some(key=>typeof aiMemoryBackend[key]!=='function'))fail('invalid_composition','Provider AI Memory incompleto.');
  }
  if(aiMemoryFactory===undefined)aiMemoryBackend=defaultAIMemoryBackend({root,policy,vault,profileStore,dataDir,relayAuthorization,portabilityAuthorization:aiMemoryPortabilityAuthorization,verifyExplicitRequest:aiMemoryVerifyExplicitRequest,notifyToolsChanged:notifyAITools});
  const aiMemoryTools={onChange(listener){aiMemoryListeners.add(listener);return()=>aiMemoryListeners.delete(listener);},async tools(options){if(!aiMemoryBackend)return [];try{return await aiMemoryBackend.tools(options);}catch(error){if(['ai_memory_unavailable','ai_memory_authorization_unavailable','ai_memory_binding_changed','ai_memory_identity_unverified','relay_connection_inactive','relay_authorization_changed','access_denied','stale_admission','vault_required','ai_memory_portability_required','ai_memory_portability_consent_required','ai_memory_consent_required','ai_memory_service_closed'].includes(error.code))return [];throw error;}},invoke(name,args,options){if(!aiMemoryBackend)fail('ai_memory_unavailable','Conclua a preparação autorizada do AI Memory antes de usar esta ferramenta.');return aiMemoryBackend.invoke(name,args,options);}};
  const unsubscribeConnection=connection?.onChange(()=>cancelMemory({cancelAI:false}));
  const memoryTools={onChange(listener){memoryListeners.add(listener);return()=>memoryListeners.delete(listener);},async tools(options){if(!memoryRelay||!memoryBinding)return [];try{return await memoryRelay.tools(options);}catch(error){if(['relay_connection_inactive','relay_engine_unavailable','relay_index_stale','relay_selection_changed','access_denied','stale_admission','vault_required'].includes(error.code))return [];throw error;}},invoke(name,args,options){if(!memoryRelay)fail('codex_connection_unavailable','Conecte explicitamente ao Codex antes de usar a memória.');return memoryRelay.invoke(name,args,options);}};
  const admittedContentSource=typeof contentSourceProvider==='function'?async options=>{const source=await contentSourceProvider(options);if(pendingMemoryInstallation)await memoryConsent.admitInstallation(pendingMemoryInstallation,source.admitted,options);codexInstallationProvider.admit?.(source,options);return source;}:null;
  const afterLocalVerification=async({ticket,signal,check})=>{
    const installed=await codexInstallationProvider({ticket,signal});check();
    let requestedHooks=false;try{requestedHooks=memoryConsent.captureChoices().installOfficialHooks===true;}catch{}
    if(requestedHooks){
      const consent=await memoryConsent.requireCurrent({ticket,signal});
      const verify=()=>{check();memoryConsent.assertCurrent(consent);installed.assertCurrent();};
      officialHooksReceipt=await officialHooksInstaller({workspace:installed.workspace,check:verify,signal});
    }
  };
  const coordinator=typeof contentSourceProvider==='function'?createOnboardingCoordinator({policy,vault,profileStore,dataDir,knowledge,sourceProvider:admittedContentSource,aiMemoryPhase:aiMemoryBackend?.phase,afterLocalVerification}):null;
  const updates=existsSync(join(root,'engine-source/provenance/oracle-distribution.json'))?(updateFactory||createPortableUpdateService)({bundleRoot:resolve(root),hostPackageRoot,dataDir,policy,vault,profileStore,knowledge,privateFilesystem,inspectPath:resolvedProviders.inspectPath,
    assertInstallerIdle(){installationOperation.assertIdle();if(coordinator?.snapshot().running)fail('onboarding_busy','Aguarde a conclusão da instalação.');},beforeSkillsInstall(){cancelMemory({cancelAI:false});skillsRouting.invalidate();skillsDiscoveryReceipt=null;},async afterSkillsInstall(context){
      const account=await connection?.verifyActiveConnection();
      if(!account?.connected||!account.explicitAuthorization)return {connected:false,discoveryVerified:false};
      try{const memoryReady=await prepareRelayBinding(context);skillsDiscoveryReceipt=await skillsRouting.discover({signal:context.signal});return {connected:true,memoryReady,discoveryVerified:true};}
      catch(error){return {connected:true,discoveryVerified:false,error:String(error.message)};}
    }}):null;
  let exportEpoch=0;const exportControllers=new Set();
  const exports=typeof resolvedProviders.validatePNG==='function'&&typeof resolvedProviders.saveExportPNG==='function'?createExportBuffer({scope:()=>({dataDir,policy:policy.snapshot().generation,vault:vault.status(),epoch:exportEpoch}),assertAdmission:context=>policy.assertAdmission(context.ticket),decodePNG:resolvedProviders.validatePNG,savePNG:resolvedProviders.saveExportPNG}):null;
  const cancelExports=()=>{exportEpoch++;exports?.cancelAll();for(const controller of exportControllers)controller.abort();};
  const exportHandler=(name,p,context)=>{if(!exports)fail('export_unavailable','A exportação PNG ainda não está disponível neste host.');return exports[name](p,context);};
  const finishExport=async(p,context)=>{const controller=new AbortController(),abort=()=>controller.abort();context.signal?.addEventListener('abort',abort,{once:true});if(context.signal?.aborted)abort();exportControllers.add(controller);try{return await exportHandler('finish',p,{...context,signal:controller.signal});}finally{exportControllers.delete(controller);context.signal?.removeEventListener('abort',abort);}};
  const localContent=async(action,p,context)=>{noArgs(p);if(!coordinator)fail('content_source_unavailable','A fonte assinada do acervo ainda não está disponível nesta instalação.');return coordinator[action]({signal:context.signal});};
  let installationRunID=null,skillsDiscoveryReceipt=null;
  const catalog=loadCatalog(resources);
  const status=async()=>{
    const account=connection?await connection.verifyActiveConnection():null;
    let discoveryVerified=false;try{if(account?.connected&&account?.explicitAuthorization&&skillsDiscoveryReceipt){skillsRouting.assertCurrent(skillsDiscoveryReceipt);discoveryVerified=true;}}catch{skillsDiscoveryReceipt=null;}
    // Consent snapshot is live and cannot restore authorization from a journal.
    const consent=memoryConsent.snapshot();let maintenanceRequested=false;try{maintenanceRequested=memoryConsent.captureChoices().enabled===true;}catch{}
    return onboardingStatus({policy,vault,preferences:(await profileStore.load()).preferences||{},knowledge:knowledge.syncSnapshot(),coordinator:coordinator?.snapshot(),operation:installationOperation.snapshot(),runID:installationRunID,
      integration:{officialHooks:officialHooksReceipt,connected:account?.connected===true&&account?.explicitAuthorization===true,discoveryVerified,captureRequested:consent.captureRequested,maintenanceRequested}});
  };
  const startInstallation=(action,context)=>{
    updates?.assertIdle();
    installationOperation.assertIdle();if(coordinator.snapshot().running)fail('onboarding_busy','A instalação já está em andamento.');
    const selected=vault.status(),ticket=context.ticket;
    const check=()=>{policy.assertAdmission(ticket);const active=vault.status();if(!active.selected||active.root!==selected.root||active.generation!==selected.generation)fail('stale_admission','O vault mudou durante a instalação.');};
    installationOperation.start(async({signal,check:assertCurrent})=>{
      await coordinator[action]({signal});
      assertCurrent();notifyAITools();
    },{check,signal:context.signal});installationRunID??=randomUUID();
  };
  const preferences=async(mutator,ticket)=>profileStore.update(value=>{policy.assertAdmission(ticket);value.preferences??={};mutator(value.preferences);return value;},{beforeCommit:()=>policy.assertAdmission(ticket)});
  const resolveGrant=async(hash,{signal,beforeAccept}={})=>{
    const file=join(dataDir,'onboarding/access-grants',hash+'.license');
    try{await assertPrivatePath(file);const handle=await fs.open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
      try{const stat=await handle.stat();if(!stat.isFile()||stat.size>8192||stat.nlink!==1)fail('invalid_access_key','Chave de acesso não reconhecida nesta instalação.');return await handle.readFile('utf8');}finally{await handle.close();}
    }catch(error){if(error.code!=='ENOENT')throw error;if(!accessGrantResolver)fail('activation_unavailable','A ativação por chave ainda não está disponível nesta distribuição.');beforeAccept?.();const grant=await accessGrantResolver(hash,{signal,beforeAccept});beforeAccept?.();return grant;}
  };
  const chooseVault=async(p,context)=>{
    noArgs(p);if(pickerBusy)fail('picker_busy','A escolha da pasta já está em andamento.');pickerBusy=true;pickerSignal=context.signal;
    try{updates?.revoke();disconnectMemory();cancelExports();coordinator?.cancel();knowledge.cancel();const result=await vault.selectVault();return result?{name:basename(result.root)}:null;}finally{pickerSignal=null;pickerBusy=false;}
  };
  const hostAction=async(context,work)=>{
    const generation=policy.snapshot().generation;
    const check=()=>{if(policy.snapshot().blocked||policy.snapshot().generation!==generation)fail('stale_admission','O acesso mudou durante esta ação.');if(context.signal?.aborted)fail('operation_cancelled','Operação cancelada.');};
    check();await work();check();return true;
  };
  const vaultHandlers=createVaultHandlers(vault);
  const handlers={...vaultHandlers,saveNote:async(p,c)=>{try{return await vaultHandlers.saveNote(p,c);}finally{cancelMemory();knowledge.cancel();}},
    portableUpdateRequest:(p,c)=>{if(!updates)fail('update_unavailable','Esta instalação precisa do pacote completo para atualizar.');return updates.start(p,c);},
    portableUpdateStatus:p=>{if(Object.keys(p).some(key=>key!=='requestID'))fail('invalid_update_request','Consulta inválida.');return updates?updates.status(p.requestID):{running:false,phase:'unavailable'};},
    portableUpdateCancel:p=>{if(Object.keys(p).some(key=>key!=='requestID')||!updates)fail('invalid_update_request','Atualização inválida.');return updates.cancel(p.requestID);},
    onboardingPrepareKnowledgeInterview:(p,c)=>knowledgeInterviews.prepare(p,c),
    onboardingOpenKnowledgeCodex:(p,c)=>knowledgeInterviews.open(p,c),
    knowledgeInterviewStatus:(p,c)=>knowledgeInterviews.status(p,c),
    onboardingKnowledgeWelcomeSeen:async(p,c)=>{
      if(Object.keys(p).some(key=>!['runID','vault'].includes(key))||typeof p.runID!=='string'||p.runID!==installationRunID||p.vault!==vault.status().root||(await status()).status!=='completed')fail('invalid_request','A apresentação não corresponde à instalação atual.');
      return vault.withContentReadScope(async scope=>{if(scope.root!==p.vault)fail('stale_admission','A pasta mudou.');await preferences(value=>{scope.check();value.knowledgeWelcome={runID:p.runID,vault:p.vault};},c.ticket);scope.check();return true;},{signal:c.signal});
    },
    onboardingConnect:async(p,c)=>{noArgs(p);if(connectBusy)fail('codex_connection_busy','A conexão já está sendo verificada.');connectBusy=true;cancelMemory({cancelAI:false});try{const account=await connectionRequired().authorizeExplicitly({ticket:c.ticket,signal:c.signal});if(!account.connected)return {connected:false,status:'unavailable',message:'O Codex não confirmou uma conta ChatGPT conectada.'};let memoryReady=false;try{memoryReady=await prepareRelayBinding(c);}catch(error){if(!['ENOENT','relay_engine_unavailable','relay_index_stale'].includes(error.code))throw error;}return {connected:true,status:'connected',memoryReady,...(!memoryReady?{message:'Conexão autorizada. Prepare o índice local para disponibilizar a memória.'}:{})};}finally{connectBusy=false;}},
    onboardingVerifyCodex:async(p,c)=>{noArgs(p);skillsDiscoveryReceipt=await skillsRouting.discover({signal:c.signal});return {skillDiscoveredByCodex:true,modelExecutionVerified:false,hooksTrusted:false};},
    onboardingCheckConnection:async p=>{noArgs(p);const account=await connectionRequired().verifyActiveConnection();return {connected:account.connected&&account.explicitAuthorization,status:account.connected?'connected':'unavailable'};},
    onboardingCancelLogin:async p=>{noArgs(p);connectionRequired();cancelMemory({cancelAI:false});await connection.revoke();return true;},
saveVersion:async(p,c)=>{if(Object.keys(p).some(key=>!['path','hash','text'].includes(key)))fail('invalid_request','Versão inválida.');cancelMemory();knowledge.cancel();try{return await vault.saveVersion({path:p.path,expectedRevision:p.hash,content:p.text},{signal:c.signal});}finally{knowledge.cancel();}},reveal:(p,c)=>{if(Object.keys(p).some(key=>key!=='path'))fail('invalid_request','Arquivo inválido.');return vault.revealNote(p.path,{signal:c.signal});},exportSnapshotBegin:(p,c)=>exportHandler('begin',p,c),exportSnapshotChunk:(p,c)=>exportHandler('chunk',p,c),exportSnapshotDiscard:(p,c)=>exportHandler('discard',p,c),exportSnapshot:finishExport,onboardingContentPlan:(p,c)=>localContent('plan',p,c),onboardingContentInstall:(p,c)=>localContent('install',p,c),onboardingContentResume:(p,c)=>localContent('resume',p,c),onboardingContentStatus:(p,c)=>localContent('status',p,c),chooseVault,onboardingChooseVault:chooseVault,
    boot:async p=>{noArgs(p);return {locked:policy.snapshot().blocked,accessibility:{}};},
    onboardingStatus:async p=>{noArgs(p);return status();},
    snapshot:async p=>{noArgs(p);const value=await createSnapshot({policy,vault,profileStore,catalog,dataDir,knowledge,libraryPending:installationOperation.snapshot()?.running===true||coordinator?.snapshot().running===true||updates?.snapshot().running===true});value.features.portableUpdates=!!updates;value.onboarding=await status();return value;},
    onboardingActivate:async(p,c)=>{
      if(Object.keys(p).some(key=>key!=='code')||typeof p.code!=='string')fail('invalid_access_key','Confira sua chave de acesso.');
      if(policy.snapshot().blocked)fail('access_denied','Desbloqueie o Oracle antes de ativar.');
      const activationGeneration=policy.snapshot().generation;const beforeAccept=()=>{if(c.signal?.aborted)fail('operation_cancelled','Ativação cancelada.');if(policy.snapshot().blocked||policy.snapshot().generation!==activationGeneration)fail('stale_admission','O acesso mudou durante a ativação.');};
      let signed;
      if(p.code.trim().startsWith('ORACLE2.')){signed=p.code.trim();await policy.activate(signed);}
      else await policy.activateAccessKey(p.code,async hash=>{signed=await resolveGrant(hash,{signal:c.signal,beforeAccept});return signed;});
      try{const ticket=policy.requireCapability('configure');await profileStore.update(value=>({...value,license:signed}),{beforeCommit:()=>policy.assertAdmission(ticket)});}catch(error){policy.revoke();vault.revoke();throw error;}
      const access=policy.snapshot();return {valid:access.active,role:access.role,capabilities:access.capabilities};
    },
    lock:async p=>{noArgs(p);capabilities.require('localAuthentication');const ticket=policy.requireCapability('useOracle');await policy.revalidateAdmission(ticket);await profileStore.update(value=>({...value,locked:true}),{beforeCommit:()=>policy.assertAdmission(ticket)});disconnectMemory();cancelExports();coordinator?.cancel();knowledge.cancel();policy.block();return true;},
    unlock:async p=>{
      noArgs(p);const generation=policy.snapshot().generation,authenticate=capabilities.require('localAuthentication');
      const proof=await authenticate();if(proof?.authenticated!==true)fail('authentication_failed','A autenticação local não foi confirmada.');
      if(policy.snapshot().generation!==generation)fail('stale_admission','A autorização mudou durante a autenticação.');
      await profileStore.update(value=>({...value,locked:false}),{beforeCommit:()=>{if(policy.snapshot().generation!==generation)fail('stale_admission','A autorização mudou durante a autenticação.');}});
      policy.unblock();return true;
    },
    revoke:async p=>{noArgs(p);disconnectMemory();cancelExports();coordinator?.cancel();knowledge.cancel();vault.revoke();return true;},
    memoryStatus:async p=>{noArgs(p);return knowledge.status();},
    memoryRefresh:async(p,context)=>{noArgs(p);cancelMemory();const result=await knowledge.refresh({signal:context.signal});if(connection)await prepareRelayBinding(context);return result;},
    prepareGBrain:async(p,context)=>{noArgs(p);cancelMemory();const result=await knowledge.refresh({signal:context.signal});if(connection)await prepareRelayBinding(context);return result;},
    gbrainRead:(p,context)=>knowledge.read(p,{signal:context.signal}),
    onboardingCancel:async p=>{noArgs(p);disconnectMemory();cancelExports();coordinator?.cancel();knowledge.cancel();return true;},
    onboardingResume:async(p,context)=>{noArgs(p);if(installationAdmission)fail('onboarding_busy','A instalação já está em andamento.');if(coordinator){startInstallation('resume',context);return status();}fail('next_phase_unavailable','A instalação do acervo e do método ainda não está disponível. O índice local pode ser atualizado separadamente.');},
    onboardingInstallMemoryOnly:async(p,c)=>{
      if(Object.keys(p).some(key=>!['replaceLegacy','localMemoryPortability','maintenance'].includes(key))||p.replaceLegacy!==undefined&&typeof p.replaceLegacy!=='boolean')fail('invalid_request','Opções de instalação inválidas.');
      const consent=p.localMemoryPortability,selection=vault.status();
      if(!dictionary(consent)||Object.keys(consent).some(key=>!['schemaVersion','acknowledgment','vaultSelectionRevision'].includes(key))||consent.schemaVersion!==1||consent.acknowledgment!=='oracle_local_memory_portability_v1'||consent.vaultSelectionRevision!==String(selection.generation))fail('ai_memory_portability_consent_required','Confira o destino local das memórias e clique Instalar para autorizar o vault atual.');
      const settings=p.maintenance??{},boolKeys=['installOfficialHooks','enabled','autoCapture','remoteProcessing','graphIndexes','consolidateWiki'];
      if(!dictionary(settings)||Object.keys(settings).some(key=>![...boolKeys,'hour','timezone','captureSource','synthesisScope'].includes(key))||boolKeys.some(key=>settings[key]!==undefined&&typeof settings[key]!=='boolean')||settings.hour!==undefined&&(!Number.isInteger(settings.hour)||settings.hour<0||settings.hour>23)||settings.timezone!==undefined&&typeof settings.timezone!=='string'||settings.captureSource!=null&&settings.captureSource!=='codex_workspace_hooks_v1'||settings.synthesisScope!=null&&settings.synthesisScope!=='captured_messages_codex_v1')fail('invalid_request','Opções de manutenção inválidas.');
      if(settings.timezone!==undefined){try{new Intl.DateTimeFormat('pt-BR',{timeZone:settings.timezone});}catch{fail('invalid_request','Horário de manutenção inválido.');}}
      if(!coordinator)fail('next_phase_unavailable','A instalação completa do acervo, método e integrações ainda não está disponível nesta versão. Nenhuma instalação foi iniciada.');
      if(p.replaceLegacy===true)fail('legacy_replacement_unavailable','A substituição da instalação anterior ainda não está disponível; os arquivos existentes foram preservados.');
      installationOperation.assertIdle();if(installationAdmission||coordinator.snapshot().running)fail('onboarding_busy','A instalação já está em andamento.');
      installationAdmission=true;
      try{pendingMemoryInstallation=await memoryConsent.beginInstallation({ticket:c.ticket,acknowledgment:consent,maintenance:settings,signal:c.signal});startInstallation('install',c);return status();}
      finally{installationAdmission=false;}
    },
    maintenanceStatus:async p=>{noArgs(p);return {enabled:false,registered:false,status:'not_configured'};},
    onboardingDraftUI:async(p,context)=>{
      if(Object.keys(p).some(key=>key!=='step')||!['vault','install'].includes(p.step))fail('invalid_request','Etapa inválida.');
      await preferences(value=>{value.onboardingStep=p.step;},context.ticket);return true;
    },
    saveLayout:async(p,context)=>{
      const layout=p.layout;
      if(Object.keys(p).some(key=>key!=='layout')||!dictionary(layout)||!dictionary(layout.nodes)||!dictionary(layout.leaves)||Object.keys(layout.nodes).length>128||Object.keys(layout.leaves).length>2000)fail('invalid_request','Layout inválido.');
      for(const point of [...Object.values(layout.nodes),...Object.values(layout.leaves)]) {
        if(!dictionary(point)||Object.values(point).some(value=>typeof value!=='number')||!Number.isFinite(point.x)||!Number.isFinite(point.y)||Math.abs(point.x)>2000||Math.abs(point.y)>2000)fail('invalid_request','Posição inválida.');
      }
      await preferences(value=>{value.layout=p.layout;},context.ticket);return true;
    },
    saveDepartments:async(p,context)=>{
      if(Object.keys(p).some(key=>key!=='assignments')||!p.assignments||typeof p.assignments!=='object'||Array.isArray(p.assignments)||Object.entries(p.assignments).some(([key,value])=>key.length>512||typeof value!=='string'||!catalog.departments.departments.some(row=>row.id===value)))fail('invalid_request','Departamentos inválidos.');
      await preferences(value=>{value.departmentAssignments=p.assignments;},context.ticket);return true;
    },
    saveLibraryRoot:async(p,context)=>{
      if(Object.keys(p).some(key=>!['library','path'].includes(key))||p.library!=='skills'||!safeRoot(p.path))fail('invalid_request','Pasta da biblioteca inválida.');
      await preferences(value=>{value.libraryRoots??={};value.libraryRoots[p.library]=p.path;},context.ticket);return true;
    },
    saveVisualPreferences:async(p,context)=>{
      const allowed=['reduceMotion','reduceTransparency','economy'];
      if(!Object.keys(p).length||Object.entries(p).some(([key,value])=>!allowed.includes(key)||typeof value!=='boolean'))fail('invalid_request','Preferência visual inválida.');
      const saved=await preferences(value=>{value.visualPreferences={...value.visualPreferences,...p};},context.ticket);return saved.preferences.visualPreferences;
    },
    copy:async(p,context)=>{if(Object.keys(p).some(key=>key!=='text')||typeof p.text!=='string'||Buffer.byteLength(p.text)>2_000_000||Buffer.from(p.text,'utf8').toString('utf8')!==p.text)fail('invalid_request','Texto inválido.');return hostAction(context,()=>capabilities.require('clipboard')(p.text,{signal:context.signal}));},
    openExternal:async(p,context)=>{if(Object.keys(p).some(key=>key!=='url'))fail('invalid_request','Link externo inválido.');const url=validatedExternalURL(p.url);return hostAction(context,()=>capabilities.require('openExternal')(url,{signal:context.signal}));},
  };
  const publicMethods=new Set(['boot','onboardingStatus','onboardingActivate','unlock','lock','copy','openExternal']);
  const dispatcher=createDispatcher({handlers,authorize:async(request,work)=>{
    if(publicMethods.has(request.method))return work();
    if(request.method==='snapshot'&&!policy.snapshot().active&&!policy.snapshot().blocked)return work();
    return policy.runAuthorized(['portableUpdateRequest','portableUpdateCancel','chooseVault','onboardingChooseVault','onboardingDraftUI','saveLayout','saveDepartments','saveVisualPreferences','saveLibraryRoot','prepareGBrain','memoryRefresh','onboardingInstallMemoryOnly','onboardingResume','onboardingCancel','onboardingContentPlan','onboardingContentInstall','onboardingContentResume','onboardingContentStatus','onboardingConnect','onboardingCheckConnection','onboardingCancelLogin','onboardingVerifyCodex'].includes(request.method)?'configure':'useOracle',async ticket=>{request.ticket=ticket;return work();});
  }});
  return {dispatcher,webRoot:join(resources,'web'),policy,vault,profileStore,capabilities,knowledge,coordinator,installationOperation,memoryTools,aiMemoryTools,memoryConsent,memoryWriteBroker,skillsRouting,capture,aiMemoryPhase:aiMemoryBackend?.phase,async close(){
    updates?.revoke();memoryWriteBroker.clearTransport();unsubscribeConnection?.();disconnectMemory();connection?.close();cancelExports();coordinator?.cancel();knowledge.cancel();vault.revoke();policy.block();
    try{await Promise.all([updates?.close(),installationOperation.settled(),knowledge.close(),memoryRelay?.close(),aiMemoryBackend?.close()]);}
    finally{resolvedProviders.close?.();privateFilesystem?.close();}
  }};
}
