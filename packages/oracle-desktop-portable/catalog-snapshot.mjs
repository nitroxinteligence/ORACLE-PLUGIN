import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {onboardingStatus} from './onboarding-status.mjs';

const defaults=[['ads','Ads','megaphone'],['code','Code','code'],['contents','Contents','note'],['customer-finder','Customer Finder','search'],['marketing','Marketing','chart'],['personal-branding','Personal Branding','person']];
export const libraryRoots=Object.freeze({skills:'SISTEMA/skills'});
export function loadCatalog(resourcesRoot) {
  const manifest=JSON.parse(readFileSync(join(resourcesRoot,'catalog/manifest.json'),'utf8'));
  const departments=JSON.parse(readFileSync(join(resourcesRoot,'catalog/departments.json'),'utf8'));
  if(manifest.schema_version!==1||!Array.isArray(manifest.collections)||!Array.isArray(departments.departments))throw new Error('Catálogo Oracle inválido.');
  return {collections:manifest.collections,departments};
}
function discoveredCollections(entries,departments,root) {
  const rows=defaults.map(([id,name,icon])=>({id,name,icon})),known=new Set(rows.map(row=>row.id));
  const normalized=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const departmentNames=new Set(departments.departments.flatMap(row=>[row.name,...(row.aliases||[])]).map(normalized));
  const extra=new Set();
  for(const entry of entries) {
    if(entry.directory||entry.name!=='SKILL.md'||!entry.path.startsWith(root+'/'))continue;
    const parts=entry.path.slice(root.length+1).split('/');
    const index=parts.length>2&&departmentNames.has(normalized(parts[0]))&&(parts[0]!==normalized(parts[0])||parts.length>=4&&parts[1]!=='skills')?1:0;
    if(parts.length>index+1&&!known.has(parts[index]))extra.add(parts[index]);
  }
  for(const id of [...extra].sort())rows.push({id,name:id.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),icon:'tool'});
  return rows;
}
export function unavailableMemoryStatus() {return {state:'unavailable',indexing:false,error:'O índice do Second Brain ainda não foi configurado nesta instalação.'};}
export async function createSnapshot({policy,vault,profileStore,catalog,dataDir,knowledge,libraryPending=false}) {
  const access=policy.snapshot(),profile=await profileStore.load();
  const preferences=profile.preferences||{};
  const selected=access.active?vault.status():{selected:false,root:null};
  const config={libraryRoots:{skills:preferences.libraryRoots?.skills||libraryRoots.skills},departmentAssignments:preferences.departmentAssignments||{},layout:preferences.layout||{},visualPreferences:preferences.visualPreferences||{},projects:[],...(selected.selected?{vault:selected.root}:{})};
  const value={features:{updates:false,portableUpdates:true},config,entries:[],collections:[],events:[],engine:'não verificado',coverage:'Arquivos locais autorizados; índice e integração ainda não verificados.',
    memorySync:unavailableMemoryStatus(),operations:{setup:false,gbrain:knowledge?.syncSnapshot().running||false},
    onboarding:onboardingStatus({policy,vault,preferences,knowledge:knowledge?.syncSnapshot()}),codexPlugins:{status:'not_verified'},
    catalog:[],departmentManifest:null,distributionDepartmentAssignments:{},
    gbrainMethod:{verified:false},gbrainSync:{status:'not_configured'},maintenance:{enabled:false,registered:false,status:'not_configured'},setupBaselinePaths:[],projects:[]};
  if(!access.active)return value;
  if(knowledge){value.memorySync=await knowledge.status();value.gbrainSync=knowledge.syncSnapshot();value.engine=value.gbrainSync.status==='verified'?'GBrain oficial · busca local':value.engine;}
  value.home=dataDir;value.catalog=catalog.collections;value.departmentManifest=catalog.departments;
  if(selected.selected&&libraryPending) {
    // The installer is changing directory contents. Inventory after it settles;
    // a pending inventory never authorizes deletion reconciliation.
    value.scan={complete:false,partial:false,pending:true,allowDeletionReconciliation:false};
  } else if(selected.selected) {
    const scan=await vault.scanLibrary({reuse:true});
    value.entries=scan.entries;
    value.scan={complete:scan.complete,partial:scan.partial,pending:false,inspected:scan.inspected,allowDeletionReconciliation:scan.allowDeletionReconciliation,signature:scan.signature,at:scan.at,verified_at:scan.verified_at,cached:scan.cached===true,stale:scan.stale===true,freshness:scan.freshness,issues:scan.issues,issueCount:scan.issueCount,unavailableCount:scan.unavailableCount,coverage:'Markdown local até 2 MB, pastas e imagens locais; conteúdo oculto, links e dependências excluídos.'};
    if(!scan.complete)value.scanError='A leitura foi parcial. Confira a disponibilidade dos arquivos e o tamanho da pasta.';
  }
  const currentSelection=vault.status();
  if(selected.selected&&(!currentSelection.selected||currentSelection.root!==selected.root||currentSelection.generation!==selected.generation))throw Object.assign(new Error('A pasta mudou durante a leitura. Atualize a biblioteca novamente.'),{code:'vault_selection_changed'});
  value.collections=discoveredCollections(value.entries,catalog.departments,config.libraryRoots.skills);
  return value;
}
