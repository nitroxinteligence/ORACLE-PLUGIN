/* Receipts for explicit actions. Reads, navigation and autosaves stay quiet. */
window.OracleActionFeedback=(()=>{
 'use strict';
 const copies={prompt:'Prompt copiado.',instructions:'Instruções copiadas.',recovery:'Caminho de recuperação copiado.'};
 const codex=new Set(['openCodex','onboardingOpenCodex','onboardingOpenKnowledgeCodex','onboardingOpenIntegrationCodex']);
 function completed(method,value,{label,toast}={}){
  if(value?.cancelled||value===false)return;
  if(method==='copy'&&(value===true||value?.copied===true))toast(copies[label]||'Conteúdo copiado.','success');
  else if(method==='reveal'&&value===true)toast('Arquivo mostrado no Finder.','success');
  else if(method==='openExternal'&&value===true)toast('Link aberto.','success');
  else if(codex.has(method)&&(value===true||value?.opened===true))toast(method==='onboardingOpenKnowledgeCodex'?'Roteiro aberto no Codex. Pressione Enviar para começar.':'Codex aberto.','success');
 }
 return Object.freeze({completed});
})();
