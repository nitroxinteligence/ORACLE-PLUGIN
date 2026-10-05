/* One 2D SVG clock. It schedules visual motion only, never installation work. */
class OracleUniverse2D {
  constructor(host){
    this.host=host;this.host.classList.add('svg-fallback','atlas-flat');
    this.timeline=new OracleMotion.FormationTimeline();this.paused=false;this.disposed=false;
    this.clock=0;this.frames=0;this.samples=[];this.costs=[];this.frame=0;
  }
  sync(model){this.model=model;this.applyFormation();this.schedule();}
  applyFormation(){
    if(!this.model)return;
    const model=this.model,p=this.timeline.progress,total=model.nodes.size;
    const reveal=(element,amount)=>{const opacity=amount>=1?'':String(amount);if(element.style.opacity!==opacity)element.style.opacity=opacity;};
    const core=model.el.querySelector('.oracle-core');if(core)reveal(core,OracleMotion.revealAt(p,'sun'));
    for(const node of model.nodes.values())reveal(node.g,OracleMotion.revealAt(p,'collection',node.index,0,total));
    for(const group of model.groups.values())reveal(group.g,OracleMotion.revealAt(p,'group',model.nodes.get(group.parent)?.index||0,group.index,total));
    for(const leaf of model.leaves.values()){
      const shown=OracleMotion.revealAt(p,'skill',model.nodes.get(leaf.parent)?.index||0,leaf.localIndex,total);
      reveal(leaf.g,shown);const active=shown>.15&&!leaf.retiring,pointerEvents=active?'':'none',tabIndex=active?0:-1;
      if(leaf.g.style.pointerEvents!==pointerEvents)leaf.g.style.pointerEvents=pointerEvents;
      if(leaf.g.tabIndex!==tabIndex)leaf.g.tabIndex=tabIndex;
    }
  }
  schedule(){
    if(this.frame||this.disposed||!this.model||this.paused||document.hidden||window.oracleWindowVisible===false||this.model.data?.hidden)return;
    const ambient=!this.model.reduced&&!this.model.selected&&!this.model.department;
    if(!ambient&&!this.timeline.playing)return;
    this.frame=requestAnimationFrame(now=>this.tick(now));
  }
  tick(now){
    this.frame=0;if(this.disposed||this.paused)return;
    const delta=this.clock?Math.min(100,now-this.clock):0,budget=this.model?.data?.economy?50:33;
    if(this.clock&&delta<budget){this.schedule();return;}
    const start=performance.now();this.clock=now;this.frames++;
    if(delta){this.samples.push(delta);if(this.samples.length>180)this.samples.shift();}
    const previous=this.timeline.progress;
    this.timeline.advance(delta);this.model?.animateOrbits(delta);this.applyFormation();
    if(previous!==this.timeline.progress)this.host.dispatchEvent(new CustomEvent('oracle:formation'));
    this.costs.push(performance.now()-start);if(this.costs.length>180)this.costs.shift();this.schedule();
  }
  setFormation(options){this.timeline.set(options);this.applyFormation();this.schedule();this.host.dispatchEvent(new CustomEvent('oracle:formation'));return this.getFormation();}
  getFormation(){return this.timeline.snapshot();}
  setPaused(value){this.paused=!!value;if(value){cancelAnimationFrame(this.frame);this.frame=0;this.clock=0;}else this.schedule();}
  signalReceipt(){/* No decorative movement is interpreted as task completion. */}
  diagnostics(){const percentile=(a,p)=>a.length?[...a].sort((x,y)=>x-y)[Math.floor((a.length-1)*p)]:null;return {renderer:'SVG 2D',visualOnly:true,frames:this.frames,samples:this.samples.length,frameMedianMs:percentile(this.samples,.5),frameP95Ms:percentile(this.samples,.95),sceneCPU95Ms:percentile(this.costs,.95),gpu:'not measured',paused:this.paused};}
  dispose(){this.disposed=true;cancelAnimationFrame(this.frame);this.frame=0;this.model=null;}
}
window.OracleUniverse2D=OracleUniverse2D;
