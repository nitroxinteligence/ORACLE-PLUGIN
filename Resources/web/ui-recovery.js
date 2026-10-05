/* Read-only recovery for interrupted startup. It never repeats installation. */
window.OracleUIRecovery=(()=>{
 let card,revision=0;
 function clear(){revision++;if(card)card.hidden=true;}
 function show(error,retry){
  if(!card){card=document.createElement('aside');card.className='oracle-ui-recovery';card.setAttribute('role','alert');card.innerHTML='<strong>Não foi possível abrir o Oracle.</strong><p></p><button type="button" class="secondary">Tentar novamente</button>';document.body.append(card);}
  const epoch=++revision,button=card.querySelector('button');card.querySelector('p').textContent=error?.message||'A conexão com o plugin foi interrompida.';card.hidden=false;button.disabled=false;
  button.onclick=async()=>{if(epoch!==revision)return;button.disabled=true;try{await retry();if(epoch===revision)clear();}catch(next){if(epoch===revision)show(next,retry);}finally{if(epoch===revision)button.disabled=false;}};
 }
 return {show,clear};
})();
