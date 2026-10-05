/* The installation view only admits documents whose receipts are verified by Core.
 * Timelapse is a separate visual snapshot and never calls an installation method. */
(function(){
  let runID=null,baseline=new Set();
  const reveals=new Map();
  function projection(state){
    const progress=state.onboarding||{};
    if(progress.runID&&progress.runID!==runID){runID=progress.runID;baseline=new Set();reveals.clear()}
    if(state.setup?.plan_id===runID&&Array.isArray(state.setupBaselinePaths))baseline=new Set(state.setupBaselinePaths);
    const awaitingSetup=progress.legacyAccess===false&&(progress.licensed===false||['not_started','configuring','review'].includes(progress.status));
    if(awaitingSetup)return {entries:state.entries,collections:[],connectors:[],coreReady:false,forming:false};
    const forming=!!progress.runID&&!['completed','not_started','configuring','review'].includes(progress.status);
    const confirmed=progress.confirmed||[],sources=confirmed.filter(c=>c.kind==='connector');
    if(!forming)return {entries:state.entries,collections:state.collections,connectors:[],coreReady:true,forming:false};
    const verified=new Set(confirmed.filter(c=>c.kind==='skill').map(c=>c.path||c.id));
    const roots=state.config?.libraryRoots||{};
    const entries=state.entries.filter(e=>e.directory||baseline.has(e.path)||verified.has(e.path)||e.name!=='SKILL.md');
    const hasVault=sources.some(c=>c.id==='obsidian');
    const collections=state.collections.filter(c=>entries.some(e=>e.path.startsWith(`${roots.skills||"SISTEMA/skills"}/${c.id}/`)&&(!e.directory||hasVault||baseline.has(e.path))));
    return {entries,collections,connectors:[],coreReady:confirmed.some(c=>c.kind==='core'),forming:true};
  }
  // Reveal only nodes supplied by the verified projection. Keep their timestamps
  // across DOM replacements so receipt polling never restarts an existing entrance.
  function reveal(scope,items,forming,reduced=false){
    let state=reveals.get(scope);
    if(!state){state={seen:new Map(),elements:new WeakMap(),forming:false};reveals.set(scope,state);}
    const animateNew=forming||state.forming,now=performance.now();let order=0;
    state.forming=forming;
    for(const {key,element,edge=false} of items){
      if(!element)continue;
      if(!state.seen.has(key))state.seen.set(key,animateNew?now+Math.min(order++*48,1400):-Infinity);
      if(reduced){state.elements.get(element)?.cancel();continue;}
      if(state.elements.has(element))continue;
      const start=state.seen.get(key),duration=edge?800:640;
      if(now>=start+duration)continue;
      const opacity=getComputedStyle(element).opacity;
      let frames=[{opacity:0},{opacity}];
      if(edge){element.setAttribute('pathLength','1');frames=[{opacity:0,strokeDasharray:'1',strokeDashoffset:'1'},{opacity,strokeDasharray:'1',strokeDashoffset:'0'}];}
      const animation=element.animate(frames,{duration,delay:start-now,fill:'both',easing:'cubic-bezier(.22,.7,.2,1)'});
      state.elements.set(element,animation);
      animation.finished.then(()=>animation.cancel(),()=>{});
    }
  }
  window.OracleInstallationVisual={projection,reveal,reset(){runID=null;baseline=new Set();reveals.clear()}};
})();
