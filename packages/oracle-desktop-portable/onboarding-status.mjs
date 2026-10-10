import {assertOnboardingAIMemoryReceipt} from './onboarding-ai-memory.mjs';
import {basename} from 'node:path';
import {assertAIMemoryInstallationReceipt} from './ai-memory-installation-verifier.mjs';

export function onboardingStatus({policy,vault,preferences={},knowledge,coordinator,operation,runID,integration={},vaultRecovery}) {
  const access=policy.snapshot(),selection=vault.status(),licensed=access.active;
  const recoveryFailed=licensed&&!selection.selected&&vaultRecovery?.savedSelection===true&&vaultRecovery.state==='failed';
  const local=licensed&&selection.selected?coordinator:null;
  let aiMemory=null;try{if(local?.aiMemoryVerified===true)aiMemory=assertOnboardingAIMemoryReceipt(local.aiMemory);}catch{}
  let aiMemoryInstallation=null;try{if(local?.aiMemoryInstallationVerified===true)aiMemoryInstallation=assertAIMemoryInstallationReceipt(local.aiMemoryInstallation);}catch{}
  const labels={aiMemory:'memória local',codex:'conexão com o Codex',integrationReceipts:'verificação da integração',hooks:'autorização dos hooks',capture:'captura de mensagens',maintenance:'registro da manutenção',catalog_installation:'instalação do acervo',method_installation:'instalação do método',integration_receipts:'verificação da integração',index_verification:'verificação do índice'};
  const localInstallationVerified=operation?.running!==true&&local?.running!==true&&!operation?.error&&!operation?.cancelled&&!['cancelled','interrupted','conflicted','index_partial','not_started'].includes(local?.status)&&local?.localContentVerified===true&&local?.indexVerified===true&&(local?.requiredComponents?.aiMemory===false||!!aiMemory||!!aiMemoryInstallation);
  // Integration proof comes from live providers. Requested options are not proof,
  // and declined capture/maintenance cannot become mandatory consent gates.
  const pending=(local?.pendingStages||['catalog_installation','method_installation','integration_receipts']).filter(key=>
    !(key==='codex'&&integration.connected===true)&&
    !(key==='hooks'&&integration.captureRequested!==true)&&
    !(key==='capture'&&integration.captureRequested!==true)&&
    !(key==='maintenance'&&integration.maintenanceRequested!==true));
  const integrationPending=localInstallationVerified&&pending.length>0;
  const running=operation?.running===true||local?.running===true;
  const visibleRun=runID&&local&&(local.status!=='not_started'||running);
  const phase=localInstallationVerified?'ready':{planning:'preparing',planned:'preparing',resuming:'installing',installing:'installing',readback:'verifying',indexing:'indexing',index_partial:'indexing',local_content_verified:'verifying',ai_memory_preparing:'memory',ai_memory_pending:'memory',ai_memory_verified:'verifying'}[local?.status]||'preparing';
  const phaseMessage={preparing:'Conferindo o vault e o acervo.',installing:'Instalando acervo e recursos.',verifying:'Verificando a instalação local.',indexing:'Indexando notas e links.',memory:'Preparando a memória local.',ready:'Instalação local verificada.'}[phase];
  const progress=local?.localProgress||{completed:0,total:4,confirmed:[]};
  const phaseLabels={signed_plan:'Plano assinado conferido',content_files:'Arquivos do acervo conferidos',method_readback:'Método local conferido',local_index:'Índice local conferido',ai_memory_runtime:'Memória local conferida',ai_memory_installation:'Instalação da memória local conferida'};
  const confirmed=(progress.confirmed||[]).map(kind=>({kind:'phase',label:phaseLabels[kind]||kind}));
  const index=knowledge?.index;
  const indexCounted=phase==='indexing'&&Number.isSafeInteger(index?.verified)&&Number.isSafeInteger(index?.total)&&index.verified>=0&&index.total>=index.verified;
  const diskFull=local?.status==='index_partial'&&Array.isArray(index?.failures)&&index.failures.some(item=>/ENOSPC|no space left on device/i.test(String(item?.error||'')));
  const conflict=local?.status==='conflicted'&&typeof local.conflict==='string'?{code:'content_existing_conflict',path:local.conflict,message:'O arquivo '+local.conflict+' já existe com conteúdo diferente. O original foi preservado. Escolha outro vault para continuar sem substituir seus arquivos.'}:null;
  const installationError=operation?.error?.code==='ENOSPC'?{code:'ENOSPC',message:'A instalação não foi concluída porque o disco ficou sem espaço. Libere espaço e tente novamente.'}:operation?.error||conflict;
  const indexMessage=local?.status==='index_partial'?(diskFull?'O índice não foi concluído porque o disco ficou sem espaço. Libere espaço e tente novamente.':'O índice ainda está parcial. Tente novamente para verificar as notas restantes.')+(indexCounted?` ${index.verified} de ${index.total} notas verificadas.`:''):null;
  const state=running?(operation?.cancelled?'cancelling':'running'):operation?.cancelled||local?.status==='cancelled'?'cancelled':operation?.error?'failed':['interrupted','conflicted'].includes(local?.status)?'interrupted':localInstallationVerified?'completed':'paused';
  const message=operation?.cancelled?'Instalação pausada. Confira o estado antes de retomar.':installationError?.message||indexMessage|| (running||localInstallationVerified?phaseMessage:'A instalação ainda precisa de confirmação: '+pending.map(key=>labels[key]||'etapa pendente').join(', ')+'.');
  return {
    knowledgeInterviewAvailable:true,knowledgeWelcome:preferences.knowledgeWelcome||null,
    officialHooks:integration.officialHooks||{installed:false,hooksTrusted:false,captureVerified:false},
    schemaVersion:2,status:recoveryFailed?'failed':visibleRun?state:local?.status||'not_started',...(visibleRun?{runID,profileMode:'memory-only',phase,message,...(installationError?{installationError}:diskFull?{installationError:{code:'ENOSPC',message:indexMessage}}:{}),...(indexCounted?{installationProgress:{phase,completed:index.verified,total:index.total}}:{})}:{}),
    ...(recoveryFailed?{profileMode:'memory-only',phase:'preparing',message:vaultRecovery.error.message,installationError:vaultRecovery.error,vaultRecovery}:{}),licensed,legacyAccess:licensed&&access.role==='owner',
    role:licensed?access.role:'locked',capabilities:access.capabilities,
    legacyProfilePreserved:false,hasVault:licensed&&selection.selected,
    vaultName:licensed&&selection.selected?basename(selection.root):'',
    ...(licensed?{vaultPath:selection.root||''}:{}),
    vaultSelectionRevision:String(selection.generation),resumeExisting:localInstallationVerified&&local?.restored===true,
    hasExistingBrain:false,codexConnected:integration.connected===true,codexRuntime:{runtimeReady:false,skillDiscoveredByCodex:integration.discoveryVerified===true,status:integration.discoveryVerified===true?'discovered':integration.connected===true?'connected':'not_verified'},
    deviceSupport:{supported:false,kind:null,reason:'A ativação vinculada ao aparelho ainda não está disponível nesta instalação.'},
    confirmed,completed:progress.completed,total:progress.total,hooksTrusted:false,captureReady:false,
    maintenance:{enabled:integration.maintenanceRequested===true,registered:false,status:integration.maintenanceRequested===true?'host_registration_unavailable':'not_configured'},
    gbrain:licensed?(knowledge||{status:'unconfigured',inference:false}):{status:'unconfigured',inference:false},
    pendingStages:pending,aiMemoryVerified:!!aiMemory,aiMemory,aiMemoryInstallationVerified:!!aiMemoryInstallation,aiMemoryRuntime:{runtimeReady:!!aiMemory,installationVerified:!!aiMemory||!!aiMemoryInstallation,status:aiMemory?'verified':aiMemoryInstallation?'installed':'not_verified'},
    localContentPhase:local?.localContentPhase||'not_verified',localContentVerified:local?.localContentVerified===true,
    localProgress:progress,
    readiness:false,installationCompleted:localInstallationVerified,integrationPending,
    // The portable plugin finishes locally. Internal integration receipts are
    // retained, but a separate Codex account is not an onboarding action.
    integrationActions:[],
    integrationMessage:localInstallationVerified?'Instalação local verificada. A conexão e a descoberta das skills no Codex são opcionais. '+(integration.discoveryVerified===true?'Skills descobertas; execução de IA ainda não verificada. ':'' )+(integration.captureRequested===true?'A captura aguarda suporte do host à autorização e execução dos hooks. ':'')+(integration.maintenanceRequested===true?'Esta versão ainda não confirma o registro da manutenção no Codex.':''):null,
    ui:{step:preferences.onboardingStep||'vault'},libraryRootChoices:[],
  };
}
