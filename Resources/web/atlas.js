/* Stable SVG scene: per-frame updates touch only camera and moved geometry.
 * Folder membership is evidence. Ambient motion is decorative, never telemetry. */
class OracleAtlas {
  static DEFAULT_ZOOM=1.20;
  static presentationEntries(entries=[],skillRoot='SISTEMA/skills'){
    const areas=OracleKnowledge.areas(entries);
    return entries.filter(e=>(skillRoot&&(e.path===skillRoot||e.path.startsWith(skillRoot+'/')))||areas.some(a=>e.path===a.path||e.path.startsWith(a.path+'/')));
  }
  // Deterministic physics phase, independent of DOM. A future scheduler can
  // split the same 180 passes into batches without changing the final geometry.
  static settleCentralKnowledge(nodes,passes=180){
    const model={centralNodes:nodes,centralSeconds:0};
    for(let pass=0;pass<passes;pass++)OracleAtlas.prototype.stepCentralKnowledge.call(model,1,false);
  }
  static departmentColor(id,fallback='#b6bac1'){
    return {'department/code':'#8ac8fa','department/marketing':'#91cdaa','department/content':'#c79de3','department/sales':'#e5c27e'}[id]||fallback;
  }
  constructor(element, callbacks) {
    this.el=element;this.cb=callbacks;this.abort=new AbortController();this.disposed=false;this.ns='http://www.w3.org/2000/svg';
    this.defaults=[[-188,-177],[184,-188],[322,8],[-314,-3],[-208,184],[238,187],[14,277]];
    this.palette=['#dba17c','#91b5ed','#7bc8b4','#d9c276','#b29bd7','#92c399','#d49cae'];
    this.nodes=new Map();this.groups=new Map();this.leaves=new Map();this.context={kind:'global',group:null,page:0};this.department=null;this.catalog=null;this.knowledge=null;this.orbitTracks=new Map();this.history=[];this.layout={nodes:{},leaves:{}};
    this.camera={x:0,y:0,k:1};this.target={...this.camera};this.baseScale=1;this.frame=0;this.selected=null;this.selectedLeaf=null;this.first=true;this.lastDetail='';this.interactionFrames=[];this.updateCosts=[];this.suppressClick=false;
    this.el.innerHTML=`<svg class="atlas-scene" aria-label="Atlas do conhecimento" role="group" tabindex="0"><defs>
      <radialGradient id="oracle-core-fill" cx=".38" cy=".30" r=".75"><stop offset="0" stop-color="#5c5b58"/><stop offset=".6" stop-color="#292a2a"/><stop offset=".88" stop-color="#363735"/><stop offset="1" stop-color="#b7b8b2"/></radialGradient>
      <radialGradient id="oracle-core-halo"><stop stop-color="#eeeeec" stop-opacity=".09"/><stop offset=".35" stop-color="#b5bbc3" stop-opacity=".035"/><stop offset="1" stop-color="#b5bbc3" stop-opacity="0"/></radialGradient>
      <linearGradient id="orbit-silver" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f2f2ef" stop-opacity=".5"/><stop offset=".45" stop-color="#8c929b" stop-opacity=".04"/><stop offset="1" stop-color="#dddeda" stop-opacity=".32"/></linearGradient>
      <radialGradient id="planet-fill" cx=".3" cy=".15" r=".9"><stop stop-color="#232526"/><stop offset=".7" stop-color="#0c0e0f"/><stop offset="1" stop-color="#07090a"/></radialGradient>
    </defs><g class="atlas-camera"><g class="orbital-scaffolding" aria-hidden="true">
      <circle r="100"/><circle r="140"/><circle r="192"/><circle r="256"/><circle r="333"/><circle r="424"/>
    </g><g class="atlas-edges"></g><g class="atlas-groups"></g><g class="atlas-leaves"></g><g class="atlas-nodes"></g>
    <g class="oracle-core" transform="scale(.46)" role="img" tabindex="-1" data-core="true" aria-label="Oracle">
      <circle r="155" fill="url(#oracle-core-halo)" class="core-atmosphere"/><circle r="57" class="core-outline"/>
      <g class="core-orbit ambient"><circle r="62" fill="none" stroke="url(#orbit-silver)" stroke-width=".7" stroke-dasharray="100 38 34 100 18 100"/><circle cx="62" r="2" fill="#d5d6d4"/></g>
      <g class="core-orbit reverse ambient"><circle r="76" fill="none" stroke="#bfc2c5" stroke-opacity=".18" stroke-width=".7"/><circle cx="-76" r="1.4" fill="#9fa4ac"/></g>
      <circle r="49" fill="url(#oracle-core-fill)" stroke="#a9afb6" stroke-opacity=".65" stroke-width=".8"/>
      <circle r="45" fill="none" stroke="#d9dcdd" stroke-opacity=".08" stroke-width=".6"/>
      <image x="-29" y="-29" width="58" height="58" href="brand/symbol-white.svg" aria-hidden="true"/>
      <circle r="55" fill="transparent" class="core-hit"/>
    </g><path class="central-hub-hit" data-central-hub="true" role="button" tabindex="0" aria-label="Abrir conhecimento: vida pessoal e vida profissional" fill="transparent" fill-rule="evenodd" d="M145 0a145 145 0 1 0-290 0a145 145 0 1 0 290 0 M26 0a26 26 0 1 1-52 0a26 26 0 1 1 52 0"/></g></svg><div class="atlas-caption"><span class="atlas-instruction">Role para girar departamentos · Clique para explorar</span></div><nav class="atlas-context glass" aria-label="Navegação do mapa" hidden><button data-map-back aria-label="Voltar um nível">←</button><div class="atlas-breadcrumb"></div><div class="atlas-page" hidden><button data-map-page="-1" aria-label="Skills anteriores">‹</button><span></span><button data-map-page="1" aria-label="Próximas skills">›</button></div></nav>`;
    this.specialistHeading=document.createElement('h3');this.specialistHeading.className='specialist-hover-name';this.specialistHeading.hidden=true;this.specialistHeading.setAttribute('aria-hidden','true');this.el.append(this.specialistHeading);
    this.contextNav=this.el.querySelector('.atlas-context');
    const tabs=document.querySelector('.workspace-tabs');
    if(tabs){let navigation=tabs.closest('.workspace-navigation');if(!navigation){navigation=document.createElement('div');navigation.className='workspace-navigation';tabs.before(navigation);navigation.append(tabs)}navigation.prepend(this.contextNav)}
    this.svg=this.el.querySelector('svg');this.world=this.el.querySelector('.atlas-camera');this.edgeLayer=this.el.querySelector('.atlas-edges');this.nodeLayer=this.el.querySelector('.atlas-nodes');this.leafLayer=this.el.querySelector('.atlas-leaves');this.groupLayer=this.el.querySelector('.atlas-groups');
    this.contextBackdrop=this.make('g',{class:'department-backdrop','aria-hidden':'true',display:'none'},this.svg);this.svg.insertBefore(this.contextBackdrop,this.world);
    this.contextRings=Array.from({length:5},()=>this.make('circle',{class:'department-backdrop-ring'},this.contextBackdrop));
    this.contextTitle=this.make('text',{class:'department-backdrop-title','text-anchor':'middle',dy:'.32em'},this.contextBackdrop);
    this.atmosphereSeconds=0;
    this.starfield=this.make('svg',{class:'oracle-starfield','aria-hidden':'true',focusable:'false'},this.el.closest('#app')||this.el);
    this.expansion=this.make('svg',{class:'atlas-expansion','aria-hidden':'true',focusable:'false'},this.el);
    this.expansionWorld=this.make('g',{},this.expansion);
    this.expansionRings=Array.from({length:OracleAtmosphere.RING_COUNT},()=>this.make('circle',{},this.expansionWorld));
    try{this.universe=new OracleUniverse2D(this.el)}catch(error){this.renderError=String(error);this.el.classList.add('svg-fallback')}
    document.fonts?.load('14px "Oracle Michroma"').then(()=>{if(!this.disposed){this.departmentLabelWidths=null;this.renderContextBackdrop();this.invalidate();}});
    this.bind();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.el.parentElement);for(const panel of document.querySelectorAll('#navigation-panel,#observatory-panel'))this.observer.observe(panel);
    this.listen(document,'visibilitychange',()=>this.setPaused(document.hidden||window.oracleWindowVisible===false||this.data?.hidden||this.data?.paused));
    this.listen(window,'blur',()=>{this.windowInactive=true;this.setPaused(this.pauseRequested)});
    this.listen(window,'focus',()=>{this.windowInactive=false;this.setPaused(this.pauseRequested)});
    this.motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
    this.listen(this.motionPreference,'change',()=>{if(this.data)this.update(this.data)});
  }
  listen(target,type,handler,options={}){target.addEventListener(type,handler,{...options,signal:this.abort.signal})}
  finishReveal(){
    for(const element of this.revealElements||[])window.OracleTransitions?.cancel(element);
    for(const restore of this.revealCleanup||[])restore();
    this.revealCleanup=null;this.revealElements=null;this.el.removeAttribute('data-revealing');
  }
  revealGraph(){
    this.finishReveal();
    if(this.centralLayoutPending||this.data?.hidden||document.hidden||document.querySelector('dialog[open]')||document.body.classList.contains('ob2-configuring'))return false;
    if(this.autoFit!==false){this.resize();this.camera={...this.target};this.draw();}
    if(!window.OracleTransitions||this.reduced)return true;
    const elements=new Set(),pending=[],cleanup=[];this.revealElements=elements;this.revealCleanup=cleanup;this.el.dataset.revealing='true';
    const show=(element,delay,duration=440,line=false)=>{
      if(!element||!element.isConnected)return;
      const opacity=getComputedStyle(element).opacity;
      let frames=[{opacity:0},{opacity}],restore=()=>{};
      if(line&&element.tagName.toLowerCase()==='path'){
        const previous=element.getAttribute('pathLength');let restored=false;
        element.setAttribute('pathLength','1');
        restore=()=>{if(restored)return;restored=true;if(previous===null)element.removeAttribute('pathLength');else element.setAttribute('pathLength',previous)};
        cleanup.push(restore);
        frames=[{opacity:0,strokeDasharray:'1 1',strokeDashoffset:1},{opacity,strokeDasharray:'1 1',strokeDashoffset:0}];
      }
      elements.add(element);
      pending.push(OracleTransitions.animate(element,frames,{delay,duration,name:'graph-reveal'}).then(restore));
    };
    show(this.el.querySelector('.oracle-core'),0,380);
    this.el.querySelectorAll('.orbital-scaffolding circle').forEach((ring,i)=>show(ring,100+i*18,600));
    show(this.starfield,160,600);show(document.querySelector('#galaxy'),160,600);
    // Points appear first. Their connections grow outward before the departments arrive.
    (this.centralNodes||[]).forEach((node,i)=>{const delay=200+Math.min(i,36)*9;show(node.g,delay,360);show(node.edge,delay+230,440,true)});
    let junction=0;for(const node of this.departmentJunctions?.values()||[]){const delay=660+junction++*35;show(node.dot,delay,300);show(node.edge,delay+70,460,true)}
    this.el.querySelectorAll('[data-department-orbit]').forEach((orbit,i)=>show(orbit,760+i*35,440));
    let departments=0,specialists=0;
    for(const node of this.nodes.values()){
      const delay=node.kind==='department'?830+departments++*40:1100+Math.min(specialists++,18)*20;
      show(node.g,delay);show(node.edge,delay-90,460,true);show(node.flow,delay+230);
    }
    let groups=0;for(const node of this.groups.values()){const delay=1160+Math.min(groups++,16)*18;show(node.g,delay);show(node.edge,delay+50,400,true);show(node.bus,delay+110,400,true)}
    let leaves=0;for(const node of this.leaves.values()){const delay=1330+Math.min(leaves++,20)*12;show(node.g,delay,340);show(node.edge,delay+60,340,true)}
    show(this.el.querySelector('.plugin-orbit-layer'),1350);show(this.el.querySelector('.verified-connectors'),1350);
    void Promise.all(pending).then(()=>{if(this.revealElements===elements){this.revealElements=null;this.revealCleanup=null;this.el.removeAttribute('data-revealing')}});
    return true;
  }
  make(tag,attrs={},parent){const el=document.createElementNS(this.ns,tag);if(['path','circle','ellipse','rect','svg'].includes(tag))el.setAttribute('aria-hidden','true');for(const [key,value]of Object.entries(attrs))el.setAttribute(key,String(value));parent?.append(el);return el}
  measureViewport(){
    const visible=id=>{const el=document.querySelector(id);return el&&!el.hidden&&getComputedStyle(el).display!=='none'?el.getBoundingClientRect():null};
    const nav=visible('#navigation-panel'),inspector=visible('#observatory-panel'),header=visible('.app-header');
    const left=nav?nav.right+16:24,right=inspector?inspector.left-16:this.width-24;
    const global=!this.selected&&!this.knowledge;
    const margin=((header?.bottom||82)+74+76)/2;
    const top=global?margin:(header?.bottom||82)+74,bottom=this.height-(global?margin:76);
    return {left,right,top,bottom,width:Math.max(160,right-left),height:Math.max(120,bottom-top),cx:(left+right)/2,cy:(top+bottom)/2};
  }
  viewCenter(){return this.viewport?{x:this.viewport.cx,y:this.viewport.cy}:{x:(this.width||1000)/2,y:(this.height||700)/2}}
  fittedCamera(){
    const v=this.viewport||{left:24,top:156,width:(this.width||1000)-48,height:(this.height||700)-232};
    const c=OracleLayout.fitCamera(this.geometry?.focusBounds||{minX:-470,maxX:470,minY:-390,maxY:390},v.width,v.height,0,18,this.context.group?1.45:Infinity);
    if(!this.selected&&!this.department&&!this.knowledge)return {x:v.left+v.width/2,y:v.top+v.height/2,k:c.k};
    return {x:c.x+v.left,y:c.y+v.top,k:c.k};
  }
  fittedScale(){return this.fittedCamera().k}
  resize(){
    const r=this.el.parentElement.getBoundingClientRect(),oldBase=this.baseScale,oldCenter=this.viewCenter();
    this.width=r.width;this.height=r.height;if(!r.width||!r.height)return;
    this.resizeStarfield();
    this.viewport=this.measureViewport();this.contentTop=this.viewport.top;const center=this.viewCenter(),v=this.viewport;this.renderContextBackdrop();
    const style=this.el.parentElement.style;style.setProperty('--atlas-center-x',center.x+'px');style.setProperty('--atlas-safe-width',v.width+'px');style.setProperty('--atlas-safe-left',v.left+'px');style.setProperty('--atlas-safe-right',(this.width-v.right)+'px');style.setProperty('--atlas-safe-top',v.top+'px');style.setProperty('--atlas-safe-bottom',(this.height-v.bottom)+'px');
    if(this.context.kind==='skill'&&this.selectedLeaf&&!this.first&&this.geometry.leaves.some(l=>l.id===this.selectedLeaf)){const focal=this.geometry.leaves.find(l=>l.id===this.selectedLeaf);this.baseScale=this.fittedScale();const k=this.baseScale*OracleAtlas.DEFAULT_ZOOM;this.target={x:center.x-focal.x*k,y:center.y-focal.y*k,k};this.contextTravelling=true;}
    else if(this.autoFit||this.first){this.fit();if(this.first){this.camera={...this.target};this.first=false}}
    else {
      const world={x:(oldCenter.x-this.target.x)/this.target.k,y:(oldCenter.y-this.target.y)/this.target.k};
      this.baseScale=this.fittedScale();const k=this.baseScale*OracleAtlas.DEFAULT_ZOOM;
      this.target={x:center.x-world.x*k,y:center.y-world.y*k,k};
    }
    this.camera.k=this.target.k;this.lastZoom=null;this.invalidate();
  }
  update(data,immediate=false){
    const manifest=data.departmentManifest??window.OracleDepartmentManifest;
    const skillRoot=data.skillRoot||'SISTEMA/skills';
    const catalogEntries=(data.entries||[]).filter(e=>e.path===skillRoot||e.path.startsWith(skillRoot+'/'));
    const catalogKey=JSON.stringify([data.collections||[],catalogEntries.map(e=>[e.path,e.name,!!e.directory]),manifest,data.departmentAssignments||{},data.skillRoot,data.forming]);
    if(catalogKey!==this.catalogKey){this.catalog=OracleDepartments.createCatalog(data.collections||[],catalogEntries,manifest,data.departmentAssignments,data.skillRoot,data.forming);this.catalogKey=catalogKey}
    const incomingDepartment=Object.prototype.hasOwnProperty.call(data,'selectedDepartment')?data.selectedDepartment||null:this.department;
    const selectionChanged=!this.data||this.selected!==(data.selected||null)||this.selectedLeaf!==(data.selectedLeaf||null)||this.department!==incomingDepartment;
    const route=OracleDepartments.resolveSelection(this.catalog,{specialist:data.selected,leaf:data.selectedLeaf,department:incomingDepartment,group:selectionChanged?null:this.context.group,page:selectionChanged?0:this.context.page});
    const routeChanged=this.knowledge?selectionChanged:!this.sameSelection(route);
    if(routeChanged&&this.data&&!immediate&&(this.knowledge||this.selected!==route.specialist||this.department!==route.department)){this.transitionScene(()=>this.update(data,true),route.specialist||route.department?1:-1);return}
    if(routeChanged&&this.data)this.remember();
    this.data={...data};
    if(!this.knowledge||selectionChanged){this.knowledge=null;this.applySelection(route)}
    this.syncSelectionData();
    this.reduced=!!data.reduced||!!this.motionPreference?.matches;
    this.el.classList.toggle('motion-reduced',this.reduced);this.setPaused(document.hidden||data.hidden||data.paused);
    if(!this.loadedLayout&&data.layout){this.layout=structuredClone({nodes:data.layout.nodes||{},leaves:data.layout.leaves||{}});this.loadedLayout=true}
    const knowledgeAreas=OracleKnowledge.areas(data.entries||[]);
    const key=JSON.stringify([this.catalogKey,data.detail,this.selected,this.department,this.context,this.knowledge,(data.entries||[]).filter(e=>knowledgeAreas.some(a=>e.path===a.path||e.path.startsWith(a.path+'/'))).map(e=>[e.path,e.directory]),Object.keys(this.layout.nodes),Object.keys(this.layout.leaves),(data.plugins||[]).filter(p=>p.status==='connected').map(p=>p.id).sort()]);
    if(key!==this.topologyKey){this.topologyKey=key;this.relayout();if(routeChanged||this.autoFit!==false)this.fit()}
    this.updatePlugins(data.plugins||[]);this.updateCentralKnowledge(data.entries||[]);this.updateConnectors(data.connectors||[]);this.el.classList.toggle('installation-waiting',data.coreReady===false);this.selection();this.draw();this.revealInstallation();
    if(data.events?.length)this.universe?.signalReceipt(data.events.at(-1));
    if(routeChanged)this.notifySelection();
  }
  revealInstallation(){
    const items=[],add=(key,element,edge=false)=>items.push({key,element,edge});
    if(this.data.coreReady!==false)add('core',this.world.querySelector('.oracle-core'));
    for(const node of this.nodes.values()){add('edge/'+node.id,node.edge,true);add('node/'+node.id,node.g);add('flow/'+node.id,node.flow);}
    for(const group of this.groups.values()){add('edge/'+group.id,group.edge,true);add('group/'+group.id,group.g);}
    for(const leaf of this.leaves.values()){add('edge/'+leaf.id,leaf.edge,true);add('leaf/'+leaf.id,leaf.g);}
    for(const node of this.centralNodes||[]){add('knowledge-edge/'+node.path,node.edge,true);add('knowledge/'+node.path,node.g);}
    for(const el of this.el.querySelectorAll('[data-department-orbit],[data-connector]'))add('orbit/'+(el.dataset.departmentOrbit||el.dataset.connector),el);
    OracleInstallationVisual.reveal('atlas',items,!!this.data.forming,this.reduced);
  }
  /** onSelect keeps its first three arguments; the fourth is this typed route. */
  getSelection(){return {kind:this.context.kind,department:this.department,specialist:this.selected,category:this.selected,leaf:this.selectedLeaf,group:this.context.group,page:this.context.page,knowledge:this.knowledge?{...this.knowledge}:null}}
  sameSelection(route){return !this.knowledge&&route.kind===this.context.kind&&route.department===this.department&&route.specialist===this.selected&&route.leaf===this.selectedLeaf&&route.group===this.context.group&&route.page===this.context.page}
  isDepartmentScene(){return !!this.department&&!this.selected&&!this.knowledge}
  applySelection(route){if(this.department!==route.department||this.selected!==route.specialist){this.focusedRotation=0;this.focusedRotationTarget=0}this.department=route.department;this.selected=route.specialist;this.selectedLeaf=route.leaf;this.context={kind:route.kind,group:route.group,page:route.page}}
  syncSelectionData(){if(this.data){this.data.selected=this.selected;this.data.selectedLeaf=this.selectedLeaf;this.data.selectedDepartment=this.department}}
  notifySelection(keyboard=false){this.cb.onSelect?.(this.selected,this.selectedLeaf,keyboard,this.getSelection())}
  searchSkills(query,options={}){return OracleDepartments.search(this.catalog,query,options)}
  revealSkill(path,keyboard=false){const route=OracleDepartments.selectionForSkill(this.catalog,path);if(!route)return false;this.navigate(route.specialist,route.group,route.leaf,route.page,keyboard);return true}
  /** V3 is a presentation of the existing catalog and page, never a new taxonomy. */
  composeOrbitalScene(geometry){
    const colorOf=id=>OracleAtlas.departmentColor(id,this.catalog.departmentByID.get(id)?.color);
    if(this.knowledge)return geometry;
    if(this.selected){
      const color=colorOf(this.catalog.specialistByID.get(this.selected)?.department);
      for(const item of [...geometry.nodes,...geometry.groups,...geometry.leaves])item.color=color;
      for(const item of geometry.nodes)if(item.kind!=='department')item.visualRadius=9;
      return geometry;
    }
    // A department opens its own scene. Keep the complete real page and its
    // navigation, showing no other departments or central knowledge libraries.
    if(this.department){
      const root=geometry.nodes.find(n=>n.kind==='department'),members=geometry.nodes.filter(n=>n.parent===root.id),color=colorOf(root.id);
      const radius=Math.max(170,members.length*32);
      Object.assign(root,{color,visualRadius:27});
      for(const [index,n] of members.entries()){
        const angle=-Math.PI*.78+index*Math.PI*2/Math.max(1,members.length)+(this.focusedRotation||0);
        Object.assign(n,{x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,color,visualRadius:8.25});
        const files=geometry.leaves.filter(l=>l.parent===n.id);
        for(const [i,l] of files.entries()){
          const tier=Math.floor(i/5),count=Math.min(5,files.length-tier*5),a=angle+((i%5)-(count-1)/2)*.28,r=70+tier*42;
          Object.assign(l,{x:n.x+Math.cos(a)*r,y:n.y+Math.sin(a)*r,color,dir:Math.cos(a)>=0?1:-1});
        }
      }
      // Center the department itself and reserve its full sweep while rotating.
      const extent=Math.max(140,...geometry.nodes.concat(geometry.leaves).map(p=>Math.hypot(p.x,p.y)));
      const bounds={minX:-extent-100,maxX:extent+100,minY:-extent-90,maxY:extent+90};
      return {...geometry,bounds,focusBounds:bounds,orbitalRings:[{parent:root.id,x:0,y:0,radius,color}]};
    }
    const hidden=new Set(geometry.nodes.filter(n=>n.id==='department/other'||n.parent==='department/other').map(n=>n.id));
    const scene={...geometry,nodes:geometry.nodes.filter(n=>!hidden.has(n.id)),groups:geometry.groups.filter(n=>!hidden.has(n.parent)),leaves:geometry.leaves.filter(n=>!hidden.has(n.parent))};
    const departments=scene.nodes.filter(n=>n.kind==='department');
    const angles={'department/code':-2.48,'department/marketing':-.66,'department/content':2.48,'department/sales':.66};
    const rings=[];
    const clouds=departments.map((d,index)=>{
      const members=scene.nodes.filter(n=>n.parent===d.id);
      const radius=members.length?Math.max(94,Math.ceil(members.length/8)*68+26):64;
      const angle=departments.length<=5&&angles[d.id]!==undefined?angles[d.id]:Math.PI/2+(index-4)*Math.PI*2/departments.length;
      const distance=Math.max(260,departments.length*52,radius*2.15)+52;
      const saved=this.layout.nodes?.[d.id];
      d.x=Number.isFinite(saved?.x)?saved.x:Math.cos(angle)*distance;
      d.y=Number.isFinite(saved?.y)?saved.y:Math.sin(angle)*distance;
      return {d,members,radius,fixed:Number.isFinite(saved?.x)&&Number.isFinite(saved?.y)};
    });
    // Local orbit bounds, including names, separate dense departments without
    // deleting outliers or turning their sources into a different department.
    for(let pass=0;pass<24;pass++)for(let i=0;i<clouds.length;i++)for(let j=i+1;j<clouds.length;j++){
      const a=clouds[i],b=clouds[j],dx=b.d.x-a.d.x,dy=b.d.y-a.d.y,dist=Math.hypot(dx,dy)||1,min=a.radius+b.radius+110;
      if(dist<min&&!(a.fixed&&b.fixed)){const move=(min-dist)/(a.fixed||b.fixed?1:2),ux=dx/dist,uy=dy/dist;if(!a.fixed){a.d.x-=ux*move;a.d.y-=uy*move}if(!b.fixed){b.d.x+=ux*move;b.d.y+=uy*move}}
    }
    for(const {d,members,radius} of clouds){
      d.color=colorOf(d.id);d.visualRadius=24;
      const phase=Math.atan2(d.y,d.x)-Math.PI/2;
      for(const [index,n] of members.entries()){
        const ring=Math.floor(index/8),count=Math.min(8,members.length-ring*8),r=94+ring*68;
        const angle=phase+(index%8)*Math.PI*2/Math.max(1,count);
        const saved=this.layout.nodes?.[n.id];
        // Old global coordinates are only reusable inside this department's orbit.
        const savedInside=Number.isFinite(saved?.x)&&Number.isFinite(saved?.y)&&Math.hypot(saved.x-d.x,saved.y-d.y)<=r;
        n.x=savedInside?saved.x:d.x+Math.cos(angle)*r;
        n.y=savedInside?saved.y:d.y+Math.sin(angle)*r;
        Object.assign(n,{color:d.color,visualRadius:7.5,orbitRadius:r,localOrbit:savedInside?null:{parent:d.id,radius:r,angle},angle:Math.atan2(n.y,n.x)});
        if(index%8===0)rings.push({parent:d.id,x:d.x,y:d.y,radius:r,color:d.color});
      }
      if(!members.length)rings.push({parent:d.id,x:d.x,y:d.y,radius:64,color:d.color});
    }
    const leaves=scene.leaves;
    for(const n of scene.nodes.filter(n=>n.parent)){
      const files=leaves.filter(l=>l.parent===n.id),parent=scene.nodes.find(d=>d.id===n.parent),angle=Math.atan2(n.y-parent.y,n.x-parent.x);
      for(const [index,l] of files.entries()){
        // Compact fans grow in short tiers from their actual specialist.
        const tier=Math.floor(index/5),count=Math.min(5,files.length-tier*5),a=angle+((index%5)-(count-1)/2)*.30,r=60+tier*40;
        Object.assign(l,{x:n.x+Math.cos(a)*r,y:n.y+Math.sin(a)*r,color:n.color,dir:Math.cos(a)>=0?1:-1});
      }
    }
    if(this.departmentRotation)this.rotateOrbitalGeometry(scene,this.departmentRotation,rings);
    const points=[{x:-170,y:-170},{x:170,y:170},...scene.nodes,...leaves];
    const bounds={minX:Math.min(-530,Math.min(...points.map(p=>p.x))-160),maxX:Math.max(530,Math.max(...points.map(p=>p.x))+160),minY:Math.min(-445,Math.min(...points.map(p=>p.y))-105),maxY:Math.max(445,Math.max(...points.map(p=>p.y))+105)};
    return {...geometry,nodes:scene.nodes,groups:scene.groups,leaves,orbitalRings:rings,bounds,focusBounds:bounds,dedicated:false};
  }
  rotateOrbitalGeometry(scene,angle,rings=[]){
    const c=Math.cos(angle),s=Math.sin(angle);
    for(const n of [...scene.nodes,...scene.groups,...scene.leaves,...rings]){
      const x=n.x,y=n.y;n.x=x*c-y*s;n.y=x*s+y*c;
      if(n.localOrbit)n.localOrbit.angle+=angle;
    }
  }
  rotateDepartments(angle){
    if(!angle||this.selected||this.department||this.knowledge)return;
    const c=Math.cos(angle),s=Math.sin(angle);
    for(const n of [...this.nodes.values(),...this.groups.values(),...this.leaves.values()]){
      const x=n.x,y=n.y;n.x=n.tx=x*c-y*s;n.y=n.ty=x*s+y*c;
      if(n.localOrbit)n.localOrbit.angle+=angle;
    }
    for(const [index,ring] of (this.geometry.orbitalRings||[]).entries()){
      const x=ring.x,y=ring.y;ring.x=x*c-y*s;ring.y=x*s+y*c;
      this.orbitalGuides.children[index]?.setAttribute('transform',`translate(${ring.x} ${ring.y})`);
    }
    this.departmentRotation=(this.departmentRotation||0)+angle;
  }
  rotateFocusedDepartment(angle){
    if(!angle||!this.isDepartmentScene())return;
    const c=Math.cos(angle),s=Math.sin(angle);
    const rotate=(point,xKey,yKey)=>{const x=point[xKey],y=point[yKey];point[xKey]=x*c-y*s;point[yKey]=x*s+y*c};
    for(const point of [...this.nodes.values(),...this.groups.values(),...this.leaves.values()]){
      rotate(point,'x','y');rotate(point,'tx','ty');
      if(point.dir!==undefined)point.dir=point.tx>=0?1:-1;
    }
    for(const point of [...this.geometry.nodes,...this.geometry.groups,...this.geometry.leaves]){
      rotate(point,'x','y');if(point.dir!==undefined)point.dir=point.x>=0?1:-1;
    }
    this.focusedRotation=(this.focusedRotation||0)+angle;
  }
  snapDepartments(){
    if(this.disposed||this.selected||this.department||this.knowledge||this.drag)return;
    const pending=(this.departmentRotationTarget||0)-(this.departmentRotation||0);
    let closest=null;
    for(const n of this.nodes.values())if(n.kind==='department'){
      if(![n.x,n.y].every(Number.isFinite))continue;
      const angle=Math.atan2(n.y,n.x)+pending;
      const delta=Math.atan2(Math.sin(Math.PI/2-angle),Math.cos(Math.PI/2-angle));
      if(!closest||Math.abs(delta)<Math.abs(closest.delta))closest={id:n.id,delta};
    }
    if(closest){this.departmentRotationTarget=(this.departmentRotationTarget||0)+closest.delta;this.el.dataset.snappedDepartment=closest.id;this.invalidate();}
  }
  positionDepartmentLabels(){
    if(this.selected||this.department||this.knowledge)return;
    const {x,y,k}=this.camera,v=this.viewport||{left:20,right:this.width-20,top:80,bottom:this.height-20};
    // Formation can introduce nodes before their first positioned frame.
    if(![x,y,k,v.left,v.right,this.height].every(Number.isFinite)||k<=0)return;
    const font=Math.max(10,Math.min(14,(v.right-v.left)/65));
    this.departmentLabelWidths??=new Map();
    const nodes=[...this.nodes.values()],placed=[];
    const obstacles=nodes.map(n=>({x:x+n.x*k,y:y+n.y*k,r:this.nodeScreenRadius(n,k)+7}));
    const intersects=(box,circle)=>Math.hypot(circle.x-Math.max(box.left,Math.min(box.right,circle.x)),circle.y-Math.max(box.top,Math.min(box.bottom,circle.y)))<circle.r;
    const offsets=[0,.2,-.2,.4,-.4,.65,-.65,.9,-.9,1.2,-1.2,1.6,-1.6,Math.PI];
    for(const n of nodes)if(n.kind==='department'){
      if(![n.x,n.y].every(Number.isFinite))continue;
      const angle=Math.atan2(n.y,n.x);
      const orbit=Math.max(64,...(this.geometry.orbitalRings||[]).filter(r=>r.parent===n.id).map(r=>r.radius));
      n.label.style.fontSize=font/k+'px';
      const metric=n.name+':'+font+':'+k;
      let width=this.departmentLabelWidths.get(metric);
      if(width===undefined){width=n.label.getComputedTextLength()*k;this.departmentLabelWidths.set(metric,width);}
      const portraitRadius=Math.max(0,...nodes.filter(p=>p.parent===n.id&&p.portraitSource).map(p=>this.nodeScreenRadius(p,k)));
      const distance=orbit*k+portraitRadius+30;
      let best=null;
      for(const extra of [0,20,40])for(const offset of offsets){
        const a=angle+offset,ux=Math.cos(a),uy=Math.sin(a),anchor=Math.abs(ux)<.35?'middle':ux>0?'start':'end';
        const left=anchor==='middle'?width/2:anchor==='end'?width:0,right=width-left;
        const sx=Math.max(v.left+left+8,Math.min(v.right-right-8,x+n.x*k+ux*(distance+extra)));
        const sy=Math.max(94+font,Math.min(this.height-26,y+n.y*k+uy*(distance+extra)));
        const box={left:sx-left-3,right:sx+right+3,top:sy-font-3,bottom:sy+font*.35+3};
        const collisions=obstacles.filter(o=>intersects(box,o)).length+placed.filter(o=>box.left<o.right&&box.right>o.left&&box.top<o.bottom&&box.bottom>o.top).length;
        const score=collisions*10000+Math.abs(offset)*100+extra;
        if(!best||score<best.score)best={sx,sy,anchor,box,score};
        if(score===0)break;
      }
      placed.push(best.box);
      n.label.setAttribute('text-anchor',best.anchor);n.label.setAttribute('x',(best.sx-x-n.x*k)/k);n.label.setAttribute('y',(best.sy-y-n.y*k)/k);
    }
  }

  renderOrbitalMaterials(){
    this.orbitalGuides?.remove();this.orbitalGuides=this.make('g',{class:'department-orbits','aria-hidden':'true'},this.world);this.world.insertBefore(this.orbitalGuides,this.edgeLayer);
    for(const ring of this.geometry.orbitalRings||[]){
      const g=this.make('g',{transform:`translate(${ring.x} ${ring.y})`,'data-department-orbit':ring.parent},this.orbitalGuides);g.style.setProperty('--node-accent',ring.color);
      this.make('circle',{r:ring.radius,class:'department-orbit'},g);
      for(let i=0;i<6;i++){const a=i*Math.PI/3;this.make('circle',{cx:Math.cos(a)*ring.radius,cy:Math.sin(a)*ring.radius,r:1.5,class:'orbit-marker'},g);}
    }
    this.junctionLayer?.remove();this.junctionLayer=this.make('g',{class:'department-junctions','aria-hidden':'true'},this.edgeLayer);this.departmentJunctions=new Map();
    if(!this.selected&&!this.department&&!this.knowledge)for(const n of this.geometry.nodes.filter(n=>n.kind==='department')){
      const edge=this.make('path',{class:'department-junction-link',fill:'none'},this.junctionLayer);
      const dot=this.make('circle',{r:2.7,class:'department-junction'},this.junctionLayer);dot.style.fill=n.color;
      this.departmentJunctions.set(n.id,{edge,dot});
    }
    this.el.querySelectorAll('.department-gradient').forEach(el=>el.remove());
    for(const [index,n] of this.geometry.nodes.entries()){
      const id=`v3-planet-${index}`;n.gradient=id;
      const gradient=this.make('radialGradient',{id,cx:'.3',cy:'.22',r:'.85',class:'department-gradient'},this.svg.querySelector('defs'));
      for(const [offset,opacity] of [[0,.30],[.4,.10],[.74,.015],[.94,.24],[1,.60]])this.make('stop',{offset,'stop-color':n.color,'stop-opacity':opacity},gradient);
    }
  }
  relayout(){
    this.spotlight=undefined;let recovered=false;
    if(!this.knowledge){const route=OracleDepartments.resolveSelection(this.catalog,this.getSelection());recovered=!this.sameSelection(route);this.applySelection(route)}
    if(recovered){this.syncSelectionData();this.autoFit=true}
    const ratio=OracleAtlas.DEFAULT_ZOOM,anchor={x:(this.viewCenter().x-this.target.x)/this.target.k,y:(this.viewCenter().y-this.target.y)/this.target.k};
    const pluginRadius=OracleMotion.pluginOrbitRadius(OracleKnowledge.orbitPlugins(this.data.plugins||[]).length);
    const knowledgeEntries=OracleAtlas.presentationEntries(this.data.entries||[],null);
    this.knowledgeOrbit=OracleKnowledge.orbit(knowledgeEntries,pluginRadius);
    const clearance=this.knowledgeOrbit.radius+110;
    this.geometry=this.composeOrbitalScene(this.knowledge?OracleKnowledge.plan(this.data.entries||[],this.knowledge):OracleLayout.hierarchyPlan(this.catalog,this.getSelection(),this.layout,clearance));
    this.renderOrbitalMaterials();
    if(this.knowledge){this.knowledge={...this.geometry.route};this.knowledgeOrbitTimes=[0,0,0];}
    const present=new Set(this.geometry.nodes.map(n=>n.id));
    for(const[id,l]of this.leaves)if(!present.has(l.parent)){l.g.remove();l.edge.remove();this.leaves.delete(id)}
    for(const[id,n]of this.nodes)if(!present.has(id)){n.g.remove();n.edge.remove();n.flow.remove();this.nodes.delete(id)}
    if(this.selected&&!present.has(this.selected)){this.selected=null;this.selectedLeaf=null}
    // Keep rendering order keyed to identity, independent of source enumeration order.
    const ordered=[...this.geometry.nodes].sort((a,b)=>Object.keys(OracleLayout.identities).indexOf(a.id)-Object.keys(OracleLayout.identities).indexOf(b.id)||a.id.localeCompare(b.id));
    ordered.forEach((p,i)=>{
      let n=this.nodes.get(p.id);
      if(!n){
        const edge=this.make('path',{class:'category-edge',fill:'none','data-edge':p.id},this.edgeLayer);
        const flow=this.make('g',{class:'edge-flow ambient','aria-hidden':'true'},this.edgeLayer);
        const colors=['#92d9f3','#c3a2ef','#eeafbc','#e8d28e','#93d6b9','#a7bbf4'];
        const duration=(p.kind==='department'?8.4:6.8)+(i%3)*.7;
        const particleCount=p.kind==='specialist'?2:6,perDirection=particleCount/2;
        for(let j=0;j<particleCount;j++){
          const returning=j>=perDirection;
          const particle=this.make('g',{class:'fluid-particle','data-direction':returning?'return':'outbound'},flow);
          const scale=this.make('g',{class:'fluid-scale'},particle);
          const body=this.make('circle',{class:'fluid-body',r:1.65,fill:colors[(i+j)%colors.length]},scale);
          body.style.setProperty('--fluid-color',colors[(i+j)%colors.length]);
          body.style.animationDelay=`${-j*.8-i*.3}s`;
          const begin=-duration*(((j%perDirection)/perDirection+(returning?1/(2*perDirection):0)+i*.173)%1);
          this.make('animateMotion',{dur:`${duration}s`,begin:`${begin}s`,repeatCount:'indefinite',rotate:'auto',calcMode:'linear',keyPoints:returning?'1;0':'0;1',keyTimes:'0;1'},particle);
          this.make('animate',{attributeName:'opacity',values:'0;.85;.85;0',keyTimes:'0;.08;.92;1',dur:`${duration}s`,begin:`${begin}s`,repeatCount:'indefinite'},particle);
        }
        const g=this.make('g',{class:'category-node',role:'button',tabindex:0,'data-category':p.id},this.nodeLayer);
        this.make('circle',{r:31,class:'selection-ring'},g);this.make('circle',{r:25,class:'planet-surface',fill:'url(#planet-fill)'},g);
        const symbol=this.make('svg',{x:-10,y:-10,width:20,height:20,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':1.1,'stroke-linecap':'round','stroke-linejoin':'round',class:'category-symbol'},g);
        this.make('path',{d:paths[p.icon]||paths.note},symbol);
        const label=this.make('text',{y:60,'text-anchor':'middle',class:'category-name'},g),count=this.make('text',{y:77,'text-anchor':'middle',class:'category-count'},g);
        n={id:p.id,x:p.x,y:p.y,edge,flow,g,label,count};this.nodes.set(p.id,n);
      }
      if(!this.selected&&!this.department&&!this.knowledge){n.g.querySelector('.category-symbol').removeAttribute('transform');n.g.querySelector('.selection-ring').setAttribute('r',31);n.g.querySelector('.planet-surface').setAttribute('r',25)}
      Object.assign(n,{name:p.name,color:p.color,tx:p.x,ty:p.y,index:i,skills:p.skills,angle:p.angle,kind:p.kind,parent:p.parent,department:p.department,empty:p.empty,state:p.state,specialistCount:p.specialistCount,visualRadius:p.visualRadius,orbitRadius:p.orbitRadius,localOrbit:p.localOrbit});this.palette[i]=p.color;
      n.g.querySelector('.planet-surface').style.fill=`url(#${p.gradient})`;
      this.updatePortrait(n,p);
      n.g.dataset.kind=p.kind||'knowledge';n.g.dataset.state=p.state||'';n.g.classList.toggle('department-node',p.kind==='department');
      n.g.style.setProperty('--node-accent',p.color);n.edge.style.setProperty('--node-accent',p.color);n.flow.style.setProperty('--node-accent',p.color);n.label.textContent=p.kind==='department'?p.name.toLocaleUpperCase('pt-BR'):p.name;
      n.label.style.display=p.kind==='department'?'block':'';
      n.label.style.fill=p.kind==='department'?'#eee':'';
      n.count.textContent=p.kind==='department'?`${p.specialistCount} especialistas`:`${p.skills.length} ${this.knowledge?'notas':'skills'}`;
      const description=this.knowledge?`${p.name} · Pasta · ${n.count.textContent}`:p.kind==='department'?`${p.name} · Departamento · ${n.count.textContent} · ${p.skills.length} skills`:`${p.name} · Especialista · ${p.skills.length?`${p.skills.length} skills`:'Fonte presente, sem skills'}`;

      n.g.setAttribute('aria-label',`${description}. Enter explora; espaço enquadra; Alt e arrasto reorganizam.`);
      // Existing dedicated-scene CSS hides category edges; department members
      // need their real parent edge in SVG fallback as well as in WebGL.
      const edgeDisplay=this.geometry.dedicated?(p.parent?'block':'none'):'block';n.edge.style.display=edgeDisplay;n.flow.style.display=edgeDisplay;
    });
    const groupIDs=new Set(this.geometry.groups.map(g=>g.id));
    for(const [id,g] of this.groups)if(!groupIDs.has(id)){g.g.remove();g.edge.remove();g.bus.remove();this.groups.delete(id)}
    for(const p of this.geometry.groups){
      let group=this.groups.get(p.id);const parent=this.nodes.get(p.parent);
      if(!group){
        const edge=this.make('path',{class:'group-edge',fill:'none'},this.edgeLayer),bus=this.make('path',{class:'routing-edge',fill:'none'},this.edgeLayer);
        const g=this.make('g',{class:'atlas-group',role:'button',tabindex:0,'data-group':p.id},this.groupLayer);
        const hit=this.make('circle',{r:15,fill:'transparent',class:'group-hit'},g);
        this.make('rect',{x:-5,y:-5,width:10,height:10,rx:2,transform:'rotate(45)',class:'group-junction'},g);
        const label=this.make('text',{y:-15,'text-anchor':'middle',class:'group-name'},g);
        group={id:p.id,x:parent.x,y:parent.y,g,edge,bus,label,hit};this.groups.set(p.id,group);
      }
      Object.assign(group,{...p,x:group.x,y:group.y,tx:p.x,ty:p.y});
      const groupColor=p.color||OracleLayout.identity(p.parent).color;
      group.g.style.setProperty('--node-accent',groupColor);group.edge.style.setProperty('--node-accent',groupColor);group.bus.style.setProperty('--node-accent',groupColor);
      group.g.classList.toggle('department-specialist',!!p.specialistID);
      group.g.style.display=p.rootMembership?'none':'';group.g.setAttribute('aria-hidden',String(!!p.rootMembership));
      group.label.textContent=p.name.length>22?p.name.slice(0,20)+'…':p.name;
      const description=p.kind==='specialist'?'Especialista digital':p.kind==='folder'?'Pasta':'Faixa alfabética';

      group.g.setAttribute('aria-label',`${description} ${p.name}, ${p.skills.length} skills. Enter explora este grupo.`);
    }
    if(this.width){this.baseScale=this.fittedScale();const k=this.baseScale*ratio;this.target={x:this.viewCenter().x-anchor.x*k,y:this.viewCenter().y-anchor.y*k,k};this.camera.k=k;this.lastZoom=null}
    this.buildLeaves(ratio);this.lastSelectionKey=null;this.lastLabelK=null;this.invalidate();if(recovered)this.notifySelection();
  }
  updatePortrait(node,point){
    const portrait=point.kind==='specialist'&&!this.knowledge?window.OraclePortraits?.[point.id]:null;
    if(node.portraitSource===portrait)return;
    node.portraitSource=portrait;node.g.classList.remove('has-portrait');
    node.portrait?.remove();node.portrait=null;
    if(!portrait)return;
    const [x,y,size]=portrait.crop;
    const frame=this.make('svg',{class:'specialist-portrait',viewBox:`${x} ${y} ${size} ${size}`,'aria-hidden':'true',overflow:'hidden'},node.g);
    const defs=this.make('defs',{},frame),clipID='portrait-mask-'+point.id;
    const clip=this.make('clipPath',{id:clipID,clipPathUnits:'userSpaceOnUse'},defs);
    this.make('circle',{cx:x+size/2,cy:y+size/2,r:size/2},clip);
    const image=this.make('image',{width:portrait.width,height:portrait.height,'clip-path':`url(#${clipID})`,'aria-hidden':'true'},frame);
    node.portrait=frame;
    image.addEventListener('load',()=>{if(node.portrait===frame){node.g.classList.add('has-portrait');this.invalidate();}},{once:true});
    image.addEventListener('error',()=>{if(node.portrait===frame){node.g.classList.remove('has-portrait');frame.remove();node.portrait=null;}},{once:true});
    image.setAttribute('href',portrait.src);
  }

  buildLeaves(level=this.camera.k/this.baseScale){
    if(!this.geometry)return;
    const visible=(this.contextTravelling?this.target.k/this.baseScale:level)>.500001,rows=visible?this.geometry.leaves:[],wanted=new Set(rows.map(l=>l.id));
    for(const[id,l]of this.leaves)if(!wanted.has(id)&&(this.selected||this.department||this.knowledge||this.geometry.hierarchy)){l.g.remove();l.edge.remove();this.leaves.delete(id)}
    for(const[id,l]of this.leaves)if(!wanted.has(id)&&!l.retiring){
      if(l.g.contains(document.activeElement))this.groups.get(l.group)?.g.focus({preventScroll:true});
      l.retiring=true;l.lifeTarget=0;l.g.setAttribute('tabindex','-1');l.g.style.pointerEvents='none';
      const source=this.groups.get(l.group)||this.nodes.get(l.parent);l.tx=source?.x??l.x;l.ty=source?.y??l.y;
    }
    for(const p of rows){
      const n=this.nodes.get(p.parent),group=this.groups.get(p.group)||n;let l=this.leaves.get(p.id);
      if(!l){
        const edge=this.make('path',{class:'skill-edge',fill:'none'},this.edgeLayer);
        const g=this.make('g',{class:'skill-node',role:'button',tabindex:0,'data-skill':p.id},this.leafLayer);
        const hit=this.make('circle',{r:13,fill:'transparent',class:'skill-hit'},g);
        this.make('circle',{r:4.5,class:'skill-dot'},g);this.make('circle',{r:8,class:'skill-selection'},g);
        this.make('path',{d:'M-2.5 -4h3l2 2v6h-5z M.5 -4v2h2 M-1 0h2 M-1 2h2',class:'skill-glyph'},g);
        const label=this.make('text',{y:4,class:'skill-name'},g);
        const name=p.name;label.textContent=name.length>34?name.slice(0,32)+'…':name;
        g.setAttribute('aria-label',`${name}. Enter seleciona; espaço abre documento.`);
        l={...p,x:this.reduced?p.x:group.x,y:this.reduced?p.y:group.y,g,edge,label,hit,life:0};this.leaves.set(p.id,l);this.lastSelectionKey=null;
        l.arriveAt=performance.now()+(this.reduced?0:group.index*22+p.localIndex*12);
      }
      Object.assign(l,{tx:p.x,ty:p.y,parent:p.parent,name:p.name,source:p.source,group:p.group,depth:p.depth,index:p.index,localIndex:p.localIndex,route:p.route,dir:p.dir,custom:p.custom,retiring:false,lifeTarget:1});
      Object.assign(l,{knowledge:!!p.knowledge,directory:!!p.directory,area:p.area,color:p.color});
      l.g.classList.toggle('knowledge-node',!!p.knowledge);l.g.classList.toggle('knowledge-folder',!!p.directory);

      if(p.knowledge){l.orbitAngle=p.angle;l.orbitRadius=Math.hypot(p.x,p.y);l.orbitRing=Math.round((l.orbitRadius-260)/105);l.g.dataset.orbitTrack=`scene-${l.orbitRing}`;l.g.setAttribute('aria-label',p.tooltip);l.g.querySelector('.skill-dot').style.fill=p.color;l.g.querySelector('.skill-glyph').setAttribute('d',p.directory?'M-4 -2h3l1 1h4v5h-8z M-4 -2v-2h3l1 2':'M-2.5 -4h3l2 2v6h-5z M.5 -4v2h2 M-1 0h2 M-1 2h2')}
      l.g.style.pointerEvents='';l.g.setAttribute('tabindex','0');
      l.g.style.setProperty('--node-accent',p.color||this.palette[n.index]);l.edge.style.setProperty('--node-accent',p.color||this.palette[n.index]);
      l.label.setAttribute('text-anchor',p.dir===1?'start':'end');
    }
    this.leafLevel=visible;this.geometryMoving=true;
  }
  updatePlugins(plugins){
    const connected=OracleKnowledge.orbitPlugins(plugins);
    const key=JSON.stringify(connected.map(p=>[p.id,p.name,p.iconDataURL]));if(key===this.pluginKey)return;this.pluginKey=key;
    this.lastSelectionKey=null;this.pluginLayer?.remove();this.pluginLayer=this.make('g',{class:'plugin-orbit-layer'},this.world);
    const radius=OracleMotion.pluginOrbitRadius(connected.length);this.pluginRadius=radius;
    const track=this.setOrbitTrack('plugins',radius,72,1,0);
    this.make('circle',{r:radius,class:'plugin-orbit-ring'},this.pluginLayer);
    this.make('circle',{r:radius,class:'plugin-orbit-current ambient'},this.pluginLayer);
    connected.forEach((p,i)=>{
      const angle=-Math.PI/2+i*Math.PI*2/connected.length;
      const g=this.make('g',{class:'orbital-plugin',role:'button',tabindex:0,'data-orbit-plugin':p.id,'data-orbit-track':'plugins',transform:`translate(${Math.cos(angle)*radius} ${Math.sin(angle)*radius})`,'aria-label':`${p.name}, conectado`},this.pluginLayer);
      track.nodes.push({el:g,angle});
      g.dataset.tooltip=p.name+' · conectado';this.make('circle',{r:13,class:'plugin-disc'},g);
      if(/^data:image\/(png|jpeg|webp);base64,/.test(p.iconDataURL||''))this.make('image',{x:-8,y:-8,width:16,height:16,href:p.iconDataURL},g);
      else{const symbol=this.make('svg',{x:-8,y:-8,width:16,height:16,viewBox:'0 0 24 24',fill:'none',stroke:'#fff','stroke-width':1.3,'aria-hidden':'true'},g);this.make('path',{d:paths.orbit},symbol)}
    });
    this.drawOrbitTrack(track);
  }
  cancelCentralLayout(){
    this.centralLayoutRevision=(this.centralLayoutRevision||0)+1;
    if(this.centralLayoutFrame)cancelAnimationFrame(this.centralLayoutFrame);
    if(this.centralLayoutPending)this.centralLayoutCanceled=true;
    this.centralLayoutFrame=0;this.centralLayoutPending=false;this.centralLayoutInputKey=null;this.centralLayoutModel=null;
  }
  scheduleCentralLayout(nodes,commit,inputKey){
    const revision=this.centralLayoutRevision,model={nodes,passes:0};
    this.centralLayoutModel=model;this.centralLayoutPending=true;this.centralLayoutInputKey=inputKey;this.centralLayoutCanceled=false;
    const run=()=>{
      this.centralLayoutFrame=0;if(this.disposed||revision!==this.centralLayoutRevision)return;
      try{
        const start=performance.now();
        do{const passes=Math.min(12,180-model.passes);OracleAtlas.settleCentralKnowledge(nodes,passes);model.passes+=passes;}
        while(model.passes<180&&performance.now()-start<6);
        if(model.passes<180){this.centralLayoutFrame=requestAnimationFrame(run);return;}
        commit();this.centralLayoutPending=false;this.centralLayoutModel=null;this.centralLayoutInputKey=null;
        this.cb.onCentralLayout?.();
      }catch(error){
        this.cancelCentralLayout();this.centralLayoutError=String(error);this.renderError=String(error);
        try{this.cb.onError?.(error);}catch{}
      }
    };
    this.centralLayoutFrame=requestAnimationFrame(run);
  }
  updateCentralKnowledge(entries){
    const centralEntries=OracleAtlas.presentationEntries(entries,null);
    const inputKey=JSON.stringify([this.data.vault,this.data.forming,centralEntries.map(e=>[e.path,e.name,!!e.directory])]);
    if(inputKey===this.centralKnowledgeInputKey){if(this.centralLayoutPending)this.cancelCentralLayout();this.centralLayoutCanceled=false;return;}
    if(inputKey===this.centralLayoutInputKey)return;
    this.cancelCentralLayout();
    const areas=OracleKnowledge.areas(centralEntries).map(area=>({...area,color:area.id==='personal'?'#d4a1cc':'#84cbbb',entries:OracleKnowledge.areaEntries(centralEntries,area)}));
    const key=JSON.stringify(areas.map(a=>[a.id,a.path,a.exists,a.entries.map(e=>[e.path,e.name,e.directory])]));
    if(key===this.centralKnowledgeKey){this.centralKnowledgeInputKey=inputKey;this.centralLayoutCanceled=false;return;}
    const previousNodes=new Map((this.centralNodes||[]).map(n=>[n.path,{x:n.x,y:n.y,vx:n.vx,vy:n.vy}]));
    const layers={knowledge:this.make('g',{class:'knowledge-orbit-layer central-knowledge-layer','aria-label':'Rede de conhecimento'})};
    const gradients=this.make('defs'),centralNodes=[];this.centralSeconds??=0;
    const hash=path=>{let value=2166136261;for(const char of path)value=Math.imul(value^char.charCodeAt(0),16777619);return (value>>>0)/4294967295;};
    for(const [index,area] of areas.entries()){
      const layer=layers.knowledge;
      // Only actual path membership is connected. The overview is bounded;
      // opening any root keeps the existing complete folder/page navigation.
      const ordered=[...new Map(area.entries.filter(e=>e.path!==area.path&&(e.directory||/\.md$/i.test(e.path))).map(e=>[e.path,e])).values()]
        .sort((a,b)=>a.path.split('/').length-b.path.split('/').length||a.path.localeCompare(b.path,'pt-BR'));
      const items=[{path:area.path,name:area.name,directory:true,root:true},...ordered.slice(0,49)];
      const byPath=new Map(items.map(item=>[item.path,{...item,children:[],area:area.id,color:area.color,seed:hash(item.path)}]));
      const root=byPath.get(area.path),angle=-Math.PI*.75+index*Math.PI/2;
      for(const n of byPath.values())if(!n.root){
        let path=n.path.slice(0,n.path.lastIndexOf('/'));
        while(path!==area.path&&!byPath.has(path)&&path.includes('/'))path=path.slice(0,path.lastIndexOf('/'));
        n.parent=byPath.get(path)||root;n.parent.children.push(n);
      }
      const weight=n=>n.weight=n.children.length?n.children.reduce((sum,child)=>sum+weight(child),0):1;
      weight(root);
      const place=(n,start,span,depth)=>{
        const a=n.root?start+span/2+(n.seed-.5)*.5:n.seed*Math.PI*2,r=n.root?37:45+depth*8+n.seed*55;
        n.bx=Math.cos(a)*r;n.by=Math.sin(a)*r;n.angle=a;n.depth=depth;
        let cursor=start;
        for(const child of n.children){const width=span*child.weight/n.weight;place(child,cursor,width,depth+1);cursor+=width;}
      };
      place(root,angle-.68,1.36,0);
      // A short, deterministic separation pass keeps close descendants distinct
      // without producing more orbital rings or changing folder relationships.
      const nodes=[...byPath.values()];
      for(let pass=0;pass<28;pass++)for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i],b=nodes[j],dx=b.bx-a.bx,dy=b.by-a.by,d=Math.hypot(dx,dy)||.1,min=a.root||b.root?14:8;
        if(d<min){const step=(min-d)*.3,ux=d===.1?1:dx/d,uy=d===.1?0:dy/d;if(!a.root){a.bx-=ux*step;a.by-=uy*step}if(!b.root){b.bx+=ux*step;b.by+=uy*step}}
      }
      const edges=this.make('g',{class:'central-knowledge-edges','aria-hidden':'true'},layer);
      for(const n of nodes){
        const name=n.name?.replace(/\.md$/i,'')||n.path.split('/').at(-1).replace(/\.md$/i,'');
        const type=n.root?'área':n.directory?'pasta':'nota';
        n.edge=this.make('path',{class:'central-knowledge-edge',fill:'none','data-parent-path':n.parent?.path||'','data-child-path':n.path},edges);
        const attrs={class:`knowledge-orbit-node central-knowledge-node${n.directory?' central-folder':''}`,role:'button',tabindex:0,'data-knowledge-path':n.path,'data-knowledge-area':area.id,'data-orbit-track':'central-knowledge','aria-label':`${name} · ${type}${n.root&&ordered.length>49?' · 49 de '+ordered.length+' itens nesta visão; abra para explorar todos':''}`};
        const g=n.g=this.make('g',attrs,layer);g.dataset.nodeName=name;const colors=['#8ac8fa','#e5c27e','#c79de3','#91cdaa','#e899a6','#8ed2d8','#d6a184','#a9b7ed'];g.style.setProperty('--library-color',n.root?area.color:colors[Math.min(7,Math.floor(n.seed*8))]);
        this.make('circle',{r:n.root?18:5,fill:'transparent',class:'knowledge-orbit-hit'},g);
        this.make('circle',{r:n.root?12:n.directory?3.8:2.1,class:'knowledge-orbit-dot'},g);
        if(n.root)this.decorateAreaRoot(g,name,area.color,gradients);
        else if(n.directory)this.make('path',{d:'M-3 -1.5h2l1 1h3v3.5h-6z M-3 -1.5v-1.5h2l1 1.5',class:'central-folder-glyph'},g);
        centralNodes.push(n);
      }
    }
    this.prepareCentralKnowledge(centralNodes);
    const forming=this.data.forming;
    this.scheduleCentralLayout(centralNodes,()=>{
      if(forming)for(const node of centralNodes){const previous=previousNodes.get(node.path);if(previous)for(const field of ['x','y','vx','vy'])node[field]=previous[field];}
      for(const gradient of [...gradients.children]){this.svg.querySelector('#'+gradient.getAttribute('id'))?.remove();this.svg.querySelector('defs').append(gradient);}
      this.knowledgeLayer?.remove();
      this.knowledgeLayer=layers.knowledge;
      for(const layer of Object.values(layers))this.world.insertBefore(layer,this.world.querySelector('.oracle-core'));
      this.centralNodes=centralNodes;this.centralLayoutError=null;this.centralKnowledgeKey=key;this.centralKnowledgeInputKey=inputKey;
      this.drawCentralKnowledge();this.lastSelectionKey=null;this.selection();this.revealInstallation();this.invalidate();
    },inputKey);
  }
  prepareCentralKnowledge(nodes){
    for(const n of nodes){
      n.x=n.bx;n.y=n.by;n.vx=0;n.vy=0;
      n.radius=Math.min(5.4,1.5+Math.sqrt(n.children.length+(n.parent?1:0))*.7);
      n.g.querySelector('.knowledge-orbit-dot').style.r=n.radius+'px';
    }
  }
  relaxCentralKnowledge(){this.prepareCentralKnowledge(this.centralNodes||[]);OracleAtlas.settleCentralKnowledge(this.centralNodes||[],180);}
  stepCentralKnowledge(step,ambient=true){
    const nodes=this.centralNodes||[],time=this.centralSeconds||0;
    for(const n of nodes){n.ax=-n.x*.0007;n.ay=-n.y*.0007;}
    // Center force, repulsion, link tension and link distance keep a live mesh.
    // These edges express real folder ancestry, not unprovided note backlinks.
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      const a=nodes[i],b=nodes[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.1;
      const force=Math.min(.65,12/(d*d));
      a.ax-=dx/d*force;a.ay-=dy/d*force;b.ax+=dx/d*force;b.ay+=dy/d*force;
    }
    for(const n of nodes){
      const parent=n.parent||{x:0,y:0},dx=n.x-parent.x,dy=n.y-parent.y,d=Math.hypot(dx,dy)||1;
      const force=(d-(n.parent?23:43))*(n.parent?.root ? .0018 : .003);
      n.ax-=dx/d*force;n.ay-=dy/d*force;
      if(n.parent){n.parent.ax+=dx/d*force;n.parent.ay+=dy/d*force;}
      if(ambient){n.ax+=Math.sin(time*.55+n.seed*19)*.018;n.ay+=Math.cos(time*.48+n.seed*23)*.018;}
    }
    for(const n of nodes){
      n.vx=(n.vx+n.ax*step)*.82;n.vy=(n.vy+n.ay*step)*.82;
      n.x+=n.vx*step;n.y+=n.vy*step;
      const radius=Math.hypot(n.x,n.y)||1,limit=Math.max(31+n.radius,Math.min(142,radius));
      if(radius!==limit){n.x*=limit/radius;n.y*=limit/radius;n.vx*=.4;n.vy*=.4;}
    }
  }
  drawCentralKnowledge(){
    for(const n of this.centralNodes||[])n.g.setAttribute('transform',`translate(${n.x} ${n.y})`);
    for(const n of this.centralNodes||[]){
      const a=Math.atan2(n.y,n.x),parent=n.parent||{x:Math.cos(a)*24,y:Math.sin(a)*24};
      const dx=n.x-parent.x,dy=n.y-parent.y,d=Math.hypot(dx,dy)||1,start=n.parent?.radius||0,end=n.radius;
      n.edge.setAttribute('d',`M${parent.x+dx/d*start} ${parent.y+dy/d*start} L${n.x-dx/d*end} ${n.y-dy/d*end}`);
    }
  }
  setOrbitTrack(key,radius,period,direction,breathing){
    const track=this.orbitTracks.get(key)||{key,seconds:0};Object.assign(track,{radius,period,direction,breathing,nodes:[],guide:null});this.orbitTracks.set(key,track);return track;
  }
  decorateAreaRoot(g,name,color,defs=this.svg.querySelector('defs')){
    g.classList.add('area-root');
    const id=`v3-area-${g.dataset.knowledgeArea||'personal'}`;
    defs.querySelector(`#${id}`)?.remove();
    const gradient=this.make('radialGradient',{id,cx:'.3',cy:'.22',r:'.85'},defs);
    for(const [offset,opacity] of [[0,.30],[.4,.10],[.74,.015],[.94,.24],[1,.60]])this.make('stop',{offset,'stop-color':color,'stop-opacity':opacity},gradient);
    const disc=g.querySelector('.knowledge-orbit-dot');disc.style.fill=`url(#${id})`;disc.style.stroke=color;
    const label=this.make('text',{y:30,'text-anchor':'middle',class:'area-root-label'},g);label.textContent=name;
  }
  drawOrbitTrack(track){
    for(const node of track.nodes){const p=OracleMotion.orbitalPosition(track.radius,node.angle,track.seconds,track.period,track.direction,track.breathing);node.el.setAttribute('transform',`translate(${p.x} ${p.y})`)}
    if(track.guide)track.guide.setAttribute('r',OracleMotion.orbitalPosition(track.radius,0,track.seconds,track.period,track.direction,track.breathing).radius);
  }
  resizeStarfield(){
    const key=`${this.width}:${this.height}`;if(key===this.starfieldSize)return;this.starfieldSize=key;
    this.starfield.setAttribute('viewBox',`0 0 ${this.width} ${this.height}`);
    this.starfield.replaceChildren();
    for(const p of OracleAtmosphere.starField(this.width,this.height))this.make('circle',{cx:p.x,cy:p.y,r:p.r,opacity:p.opacity},this.starfield);
  }
  drawExpandingRings(){
    const outer=(this.knowledgeOrbit?.radius||this.pluginRadius||105);
    const plan=OracleAtmosphere.expandingRings(outer,this.atmosphereSeconds);
    for(let i=0;i<plan.length;i++){this.expansionRings[i].setAttribute('r',plan[i].r);this.expansionRings[i].setAttribute('opacity',plan[i].opacity)}
  }
  animateOrbits(delta){
    if(this.disposed||this.paused||this.reduced||document.hidden||window.oracleWindowVisible===false||this.selected||this.department||this.drag||this.geometryMoving||this.contextTravelling||this.el.classList.contains('scene-travelling'))return;
    const keyboard=document.documentElement.dataset.inputMode!=='pointer'?this.keyboardFocus?.orbit:null;
    if(this.knowledge){
      const deltaSeconds=Math.min(100,Math.max(0,delta))/1000;
      for(let ring=0;ring<3;ring++)if(this.hovered?.orbit!==`scene-${ring}`&&keyboard!==`scene-${ring}`)this.knowledgeOrbitTimes[ring]+=deltaSeconds;
      let changed=false;
      for(const l of this.leaves.values())if(l.knowledge&&!l.retiring){
        const p=OracleMotion.orbitalPosition(l.orbitRadius,l.orbitAngle,this.knowledgeOrbitTimes[l.orbitRing],120+l.orbitRing*30,l.orbitRing%2?-1:1);
        if(l.x!==p.x||l.y!==p.y){l.x=l.tx=p.x;l.y=l.ty=p.y;l.dir=p.x>=0?1:-1;changed=true;}
      }
      if(changed)this.draw(false);
      return changed;
    }
    // Collective inspection enlarges the network without stopping its motion.
    this.centralSeconds=(this.centralSeconds||0)+Math.min(100,Math.max(0,delta))/1000;this.stepCentralKnowledge(Math.min(2,Math.max(0,delta)/33));this.drawCentralKnowledge();
    for(const track of this.orbitTracks.values()){
      // Freeze the whole ring during inspection: a paused item can never be overtaken.
      if(track.key===this.hovered?.orbit||track.key===keyboard)continue;
      track.seconds+=Math.min(100,Math.max(0,delta))/1000;this.drawOrbitTrack(track);
    }
    // The existing clock drives a very slow local orbit. It freezes while a
    // department, specialist, modal, hover or keyboard target is being read.
    if(!this.hovered?.category&&!this.keyboardFocus?.category){
      let moved=false;
      for(const n of this.nodes.values())if(n.localOrbit){
        const parent=this.nodes.get(n.parent);if(!parent)continue;
        n.localOrbit.angle+=Math.min(100,Math.max(0,delta))/1000*Math.PI*2/420;
        const x=parent.x+Math.cos(n.localOrbit.angle)*n.localOrbit.radius,y=parent.y+Math.sin(n.localOrbit.angle)*n.localOrbit.radius;
        this.translateNode(n,x-n.x,y-n.y,n.id);moved=true;
      }
      if(moved)this.draw(false);
    }
    // Share the ambient scheduler and its pause/reduced-motion/visibility guards.
    this.atmosphereSeconds+=Math.min(100,Math.max(0,delta))/1000;
    this.drawExpandingRings();
  }
  updateConnectors(connectors){
    const outerRadius=(this.knowledgeOrbit?.radius||this.pluginRadius||105);
    const key=JSON.stringify([connectors.map(c=>[c.id,c.label]),outerRadius]);if(key===this.connectorKey)return;this.connectorKey=key;
    this.lastSelectionKey=null;this.connectorLayer?.remove();this.connectorLayer=this.make('g',{class:'verified-connectors'},this.world);
    connectors.forEach((c,i)=>{
      const angle=-Math.PI/2+i*Math.PI*2/Math.max(3,connectors.length),radius=Math.max(158,outerRadius+38);
      const g=this.make('g',{class:'verified-connector',role:'button',tabindex:0,'data-connector':c.id,transform:`translate(${Math.cos(angle)*radius} ${Math.sin(angle)*radius})`,'aria-label':c.id==='gbrain'?'Second Brain conectado':'Obsidian conectado'},this.connectorLayer);
      g.dataset.tooltip=c.id==='gbrain'?'Second Brain · verificado':'Obsidian · '+c.label;
      this.make('circle',{r:16,fill:'#191919',stroke:'#ffffff40','stroke-width':.8},g);
      const symbol=this.make('svg',{x:-9,y:-9,width:18,height:18,viewBox:'0 0 24 24',fill:'none',stroke:'#ddd','stroke-width':1.2,'stroke-linecap':'round','stroke-linejoin':'round'},g);
      this.make('path',{d:paths[c.id==='gbrain'?'brain':'folder']},symbol);
    });
  }
  selection(){
    const detail=Number(this.data?.detail??3),level=this.camera.k/this.baseScale;
    const key=[this.selected,this.department,this.selectedLeaf,this.context.group,this.context.page,this.knowledge?.path,this.knowledge?.page,Math.round(level*10),this.leaves.size,this.nodes.size,detail].join('|');if(key===this.lastSelectionKey)return;this.lastSelectionKey=key;
    this.el.dataset.context=this.context.kind;this.el.dataset.library=this.knowledge?.area||'';
    for(const layer of this.el.querySelectorAll('.central-hub-hit,.oracle-core,.plugin-orbit-layer,.verified-connectors,.orbital-scaffolding,.knowledge-orbit-layer')){layer.style.display=this.selected||this.department||this.knowledge?'none':'';layer.setAttribute('aria-hidden',String(!!this.selected||!!this.department||!!this.knowledge))}
    for(const n of this.nodes.values()){const active=n.id===this.selected||!!this.knowledge||n.kind==='department'&&n.id===this.department&&!this.selected;n.g.classList.toggle('selected',active);n.g.classList.toggle('subdued',!!this.selected&&!active);n.edge.classList.toggle('selected',active);n.edge.classList.toggle('subdued',!!this.selected&&!active);n.flow.classList.toggle('flow-visible',active||!this.selected);n.g.setAttribute('aria-pressed',String(active))}
    for(const g of this.groups.values()){
      const active=g.id===this.context.group,member=g.parent===this.selected,dim=!!this.selected&&!member||!!this.context.group&&!active;
      g.g.classList.toggle('selected',active);g.g.classList.toggle('member',member);g.g.classList.toggle('subdued',dim);g.edge.classList.toggle('subdued',dim);g.edge.style.visibility='';g.g.setAttribute('aria-pressed',String(active));
    }
    for(const l of this.leaves.values()){const member=l.parent===this.selected||!!this.department||!!this.knowledge,dim=!!this.selected&&l.parent!==this.selected||!!this.context.group&&l.group!==this.context.group;l.g.classList.toggle('selected',l.id===this.selectedLeaf);l.g.classList.toggle('subdued',dim);l.edge.classList.toggle('selected',l.id===this.selectedLeaf);l.edge.classList.toggle('member',member);l.g.setAttribute('aria-pressed',String(l.id===this.selectedLeaf))}
    this.renderContext();
  }
  renderContext(){
    this.renderContextBackdrop();
    const nav=this.contextNav;nav.hidden=!this.selected&&!this.department&&!this.knowledge;
    const crumbs=nav.querySelector('.atlas-breadcrumb');crumbs.replaceChildren();
    const add=(label,action,current=false)=>{const b=document.createElement('button');b.textContent=label;if(current)b.setAttribute('aria-current','page');else b.onclick=action;crumbs.append(b)};
    add('Universo',()=>this.select(null));
    if(this.knowledge){
      const area=this.geometry.area,path=this.knowledge.path;
      add(area.name,()=>this.navigateKnowledge(area.id,area.path),path===area.path);
      let prefix=area.path;
      for(const part of path.slice(area.path.length).split('/').filter(Boolean)){prefix+='/'+part;const folder=prefix;add(part,()=>this.navigateKnowledge(area.id,folder),folder===path)}
      const page=nav.querySelector('.atlas-page');page.hidden=this.geometry.pages<=1;
      page.querySelector('span').textContent=`${this.knowledge.page+1} / ${this.geometry.pages}`;
      page.querySelector('[data-map-page="-1"]').disabled=this.knowledge.page===0;
      page.querySelector('[data-map-page="1"]').disabled=this.knowledge.page>=this.geometry.pages-1;
      let empty=this.el.querySelector('.knowledge-empty');if(!empty){empty=document.createElement('div');empty.className='knowledge-empty';this.el.append(empty)}
      empty.hidden=this.geometry.total>0;empty.textContent=area.exists?'Esta pasta ainda não tem notas ou subpastas.':'Esta área será criada no Obsidian pela configuração do Oracle.';
      return;
    }
    let empty=this.el.querySelector('.knowledge-empty');if(!empty){empty=document.createElement('div');empty.className='knowledge-empty';empty.setAttribute('role','status');this.el.append(empty)}
    const department=this.catalog.departmentByID.get(this.department),specialist=this.catalog.specialistByID.get(this.selected);
    const message=!this.catalog.manifestValid?'Classificação indisponível. As fontes descobertas continuam em Outros especialistas.':specialist?.empty?'Esta fonte está presente, mas não contém arquivos SKILL.md.':department?.state==='no-skills'?'Os especialistas deste departamento estão presentes, mas ainda não contêm skills.':'';
    empty.hidden=!message;empty.textContent=message;
    if(department)add(department.name,()=>this.setDepartment(department.id),!this.selected);
    if(this.selected)add(this.nodes.get(this.selected)?.name||this.selected,()=>this.focus(this.selected),!this.context.group);
    const group=this.groups.get(this.context.group);
    if(group)add(group.name,()=>this.focusGroup(group.id),!this.selectedLeaf);
    if(this.selectedLeaf)add(this.selectedLeaf.split('/').at(-2).replace(/-/g,' '),null,true);
    const page=nav.querySelector('.atlas-page'),total=this.geometry.pages||1;page.hidden=total<=1||!!this.selectedLeaf;
    page.querySelector('span').textContent=`${this.context.page+1} / ${total}`;page.querySelector('[data-map-page="-1"]').disabled=this.context.page===0;page.querySelector('[data-map-page="1"]').disabled=this.context.page>=total-1;
  }
  renderContextBackdrop(){
    if(!this.contextBackdrop)return;
    const department=this.knowledge?null:this.catalog?.departmentByID.get(this.department||this.catalog?.specialistByID.get(this.selected)?.department);
    const active=!!department&&(!!this.department||!!this.selected),key=active?department.id:null,changed=key!==this.backdropDepartment;
    this.backdropDepartment=key;this.contextBackdrop.setAttribute('display',active?'inline':'none');
    if(!active||!this.viewport)return;
    const {cx,cy,width,height}=this.viewport;
    this.contextBackdrop.setAttribute('transform',`translate(${cx} ${cy})`);
    this.contextTitle.textContent=department.name.toLocaleUpperCase('pt-BR');
    const size=Math.min(116,width*.8/(this.contextTitle.textContent.length*.95));
    this.contextTitle.setAttribute('font-size',size);
    const measured=this.contextTitle.getComputedTextLength();if(measured>width*.86)this.contextTitle.setAttribute('font-size',size*width*.86/measured);
    const spacing=Math.max(width,height)*.115;
    this.contextRings.forEach((ring,i)=>ring.setAttribute('r',spacing*(i+1)));
    if(changed&&!this.reduced&&window.OracleTransitions){
      void OracleTransitions.animate(this.contextTitle,[{opacity:0},{opacity:1}],{duration:600,name:'department-background'});
      this.contextRings.forEach((ring,i)=>{void OracleTransitions.animate(ring,[{opacity:0,transform:'scale(.55)',transformOrigin:'0px 0px'},{opacity:1,transform:'scale(1)',transformOrigin:'0px 0px'}],{duration:800,delay:i*70,name:'department-background'});});
    }
  }
  edgePath(x1,y1,x2,y2,bend=.035){const dx=x2-x1,dy=y2-y1;return `M${x1} ${y1} C${x1+dx*.34-dy*bend} ${y1+dy*.34+dx*bend},${x1+dx*.72-dy*bend*.5} ${y1+dy*.72+dx*bend*.5},${x2} ${y2}`}
  nodeScreenRadius(node,k=this.camera.k){
    return node.portraitSource?Math.max((node.visualRadius||25)*k,this.selected===node.id?52:this.department?19:12):Math.max((node.visualRadius||25)*k,node.kind==='department'?15:4.5);
  }
  planetEdge(parent,node,flow=false){
    const px=parent?.x||0,py=parent?.y||0,dx=node.x-px,dy=node.y-py,distance=Math.hypot(dx,dy)||1,k=this.camera.k;
    const from=parent?this.nodeScreenRadius(parent,k)/k:!flow&&this.departmentJunctions?.has(node.id)?72:23;
    const to=this.nodeScreenRadius(node,k)/k;
    return this.edgePath(px+dx/distance*from,py+dy/distance*from,node.x-dx/distance*to,node.y-dy/distance*to,.055);
  }
  draw(syncUniverse=true){
    if(this.disposed)return;const started=performance.now(),{x,y,k}=this.camera;
    this.world.setAttribute('transform',`translate(${x} ${y}) scale(${k})`);
    this.expansionWorld.setAttribute('transform',`translate(${x} ${y}) scale(${k})`);this.drawExpandingRings();
    for(const [id,junction] of this.departmentJunctions||[]){const n=this.nodes.get(id);if(!n)continue;const angle=Math.atan2(n.y,n.x),x=Math.cos(angle),y=Math.sin(angle);junction.dot.setAttribute('cx',x*70);junction.dot.setAttribute('cy',y*70);junction.edge.setAttribute('d',`M${x*23} ${y*23} L${x*70} ${y*70}`);}
    for(const n of this.nodes.values()){const parent=this.nodes.get(n.parent),px=parent?.x||0,py=parent?.y||0;if(n._x!==n.x||n._y!==n.y||n._px!==px||n._py!==py||k!==this.lastLabelK){n.g.setAttribute('transform',`translate(${n.x} ${n.y})`);n.edge.setAttribute('d',this.planetEdge(parent,n));for(const motion of n.flow.querySelectorAll('animateMotion'))motion.setAttribute('path',this.planetEdge(parent,n,true));for(const scale of n.flow.querySelectorAll('.fluid-scale'))scale.setAttribute('transform',`scale(${(n.kind==='specialist'?.58:1)/k})`);n._x=n.x;n._y=n.y;n._px=px;n._py=py}}
    if(k!==this.lastLabelK){
      for(const n of this.nodes.values()){
        const screenRadius=this.nodeScreenRadius(n,k);
        if(n.portrait){const r=screenRadius/k;for(const [key,value] of Object.entries({x:-r,y:-r,width:r*2,height:r*2}))n.portrait.setAttribute(key,value);}
        n.g.querySelector('.planet-surface').setAttribute('r',screenRadius/k);
        n.g.querySelector('.selection-ring').setAttribute('r',(screenRadius+5)/k);
        n.g.querySelector('.category-symbol').setAttribute('transform',`scale(${(n.kind==='department' ? .72 : 1)*Math.max(1,.85/k)})`);
        n.label.style.fontSize=`${(n.kind==='department'?14:11)/k}px`;n.label.setAttribute('y',(screenRadius+20)/k);
      }
      for(const label of this.el.querySelectorAll('.area-root-label'))label.style.fontSize=`${11/k}px`;
    }
    for(const group of this.groups.values()){
      const parent=this.nodes.get(group.parent);
      if(group._x!==group.x||group._y!==group.y||group._px!==parent.x||group._py!==parent.y){
        group.g.setAttribute('transform',`translate(${group.x} ${group.y})`);group.edge.setAttribute('d',this.edgePath(parent.x,parent.y,group.x,group.y,.035));
        group._x=group.x;group._y=group.y;group._px=parent.x;group._py=parent.y;
      }
      const routed=[...this.leaves.values()].filter(l=>l.group===group.id&&l.route&&!l.retiring);
      if(routed.length){
        const columns=new Map();for(const l of routed){const col=l.route.column;if(!columns.has(col))columns.set(col,[]);columns.get(col).push(l)}
        const top=Math.min(...routed.map(l=>l.y))-40,left=Math.min(...routed.map(l=>l.x))-65,right=Math.max(...routed.map(l=>l.x))-34;
        let d=`M${group.x} ${group.y} C${left} ${group.y},${left} ${top},${left+18} ${top} L${right} ${top}`;
        for(const members of columns.values()){const x=members[0].x-34,bottom=Math.max(...members.map(l=>l.y));d+=` M${x} ${top} L${x} ${bottom}`}
        group.bus.setAttribute('d',d);group.busOpacity=Math.min(...routed.map(l=>l.life??1))*.48;group.bus.style.opacity=String(group.busOpacity*OracleMotion.revealAt(this.getFormation().progress,'group',parent.index,group.index,this.nodes.size));
      }else {group.busOpacity=0;group.bus.style.opacity='0';}
      if(k!==this.lastLabelK){group.label.style.fontSize=`${10/k}px`;group.label.setAttribute('y',-14/k)}
    }
    for(const l of this.leaves.values()){
      l.g.style.setProperty('--leaf-life',l.life??1);
      const parent=l.route&&!l.retiring?{x:l.x-l.route.offset,y:l.y}:this.groups.get(l.group)||this.nodes.get(l.parent);
      if(l._x!==l.x||l._y!==l.y||l._px!==parent.x||l._py!==parent.y){l.g.setAttribute('transform',`translate(${l.x} ${l.y})`);l.edge.setAttribute('d',this.edgePath(parent.x,parent.y,l.x,l.y,.035));l._x=l.x;l._y=l.y;l._px=parent.x;l._py=parent.y}
      if(k!==this.lastLabelK){l.g.querySelector('.skill-glyph').setAttribute('transform',`scale(${1/k})`);if(l.knowledge)l.g.querySelector('.skill-dot').setAttribute('r',(l.directory?10:8)/k);l.label.style.fontSize=`${11/k}px`;l.label.setAttribute('x',l.dir*9/k);l.label.setAttribute('y',3/k)}
    }
    if(k!==this.lastLabelK||this.geometryMoving||this.drag||!syncUniverse)this.layoutTargets();
    this.lastLabelK=k;if(this.lastZoom!==k){this.cb.onZoom?.((this.contextTravelling?this.target.k:k)/this.baseScale);this.lastZoom=k}
    this.selection();this.layoutLabels();this.positionDepartmentLabels();this.renderSpecialistHeading();if(syncUniverse)this.universe?.sync(this);this.updateCosts.push(performance.now()-started);if(this.updateCosts.length>180)this.updateCosts.shift();
  }
  setSpecialistSpotlight(id){
    if(this.spotlight===id)return;this.spotlight=id;
    this.el.classList.toggle('specialist-spotlight',!!id);
    const mark=(element,match)=>{element.classList.toggle('hover-muted',!!id&&!match);element.classList.toggle('hover-focused',!!id&&match)};
    const department=this.catalog?.departmentByID.has(id),member=node=>node?.id===id||!!department&&node?.parent===id;
    for(const n of this.nodes.values()){mark(n.g,member(n));mark(n.edge,member(n));mark(n.flow,member(n))}
    for(const g of this.groups.values()){mark(g.g,g.id===id||department&&member(this.nodes.get(g.parent)));mark(g.edge,g.id===id||department&&member(this.nodes.get(g.parent)));mark(g.bus,g.id===id||department&&member(this.nodes.get(g.parent)))}
    for(const l of this.leaves.values()){mark(l.g,l.id===id||department&&member(this.nodes.get(l.parent)));mark(l.edge,l.id===id||department&&member(this.nodes.get(l.parent)))}
    for(const ring of this.el.querySelectorAll('[data-department-orbit]'))mark(ring,ring.dataset.departmentOrbit===id);
    const central=(this.centralNodes||[]).find(n=>n.path===id),neighbours=new Set(central?[central.path,central.parent?.path,...central.children.map(n=>n.path)]:[]);
    for(const n of this.centralNodes||[])mark(n.edge,id==='central-network'||n.path===id||n.parent?.path===id);
    for(const el of this.el.querySelectorAll('.knowledge-orbit-node,.oracle-core,.verified-connectors,.plugin-orbit-layer,.orbital-scaffolding'))mark(el,id==='central-network'&&el.classList.contains('central-knowledge-node')||neighbours.has(el.dataset.knowledgePath)||el.dataset.knowledgePath===id||id==='core'&&el.matches('.oracle-core'));
  }
  renderSpecialistHeading(){
    const keyboard=document.documentElement.dataset.inputMode!=='pointer'?this.keyboardFocus:null,state=this.inspectionMode==='keyboard'&&keyboard?keyboard:this.hovered&&(this.hovered.category||this.hovered.skill||this.hovered.group||this.hovered.element)?this.hovered:keyboard;
    const central=!!state?.central&&!this.selected&&!this.department&&!this.knowledge&&!this.drag;
    this.el.classList.toggle('central-inspecting',central);
    if(central){this.specialistHeading.hidden=true;this.setSpecialistSpotlight('central-network');return;}
    let node=this.leaves.get(state?.skill)||this.nodes.get(state?.category)||this.groups.get(state?.group),point;
    if(!node&&state?.element){const el=state.element,rect=el.getBoundingClientRect(),host=this.el.getBoundingClientRect();point={x:rect.x+rect.width/2-host.x,y:rect.y+rect.height/2-host.y};node={id:el.dataset.knowledgePath||'core',name:el.dataset.nodeName||'Oracle'};}
    const sx=point?.x??(node?this.camera.x+node.x*this.camera.k:-1),sy=point?.y??(node?this.camera.y+node.y*this.camera.k:-1),heading=this.specialistHeading;
    const show=!!node&&sx>=0&&sx<=this.width&&sy>=0&&sy<=this.height&&!this.drag&&!this.el.classList.contains('scene-travelling');
    const labelled=!!node&&(node.kind==='department'&&!this.selected&&!this.department&&!this.knowledge||this.department&&!this.selected&&node.kind==='specialist'||!!this.selected&&(this.nodes.has(node.id)||node.g?.classList.contains('label-visible')));
    heading.hidden=!show||labelled;this.setSpecialistSpotlight(show?node.id:null);
    if(!show||labelled)return;
    if(heading.textContent!==node.name)heading.textContent=node.name;
    const v=this.viewport||{left:12,right:this.width-12,top:24,bottom:this.height-24};
    heading.style.maxWidth=Math.min(320,Math.max(120,v.right-v.left-16))+'px';
    const width=heading.offsetWidth,height=heading.offsetHeight,radius=Math.max((node.visualRadius||12)*this.camera.k,12);
    heading.style.left=Math.max(v.left+width/2,Math.min(v.right-width/2,sx))+'px';
    let top=sy+radius+12;if(top+height>v.bottom)top=sy-radius-height-12;
    heading.style.top=Math.max(v.top,Math.min(v.bottom-height,top))+'px';
  }
  layoutTargets(){
    // Dense overview targets must not cover a neighbouring point's centre.
    // Context zoom grows the targets up to 24/28 px; keyboard targets stay available.
    const k=this.camera.k,size=28/k,cells=new Map();
    const points=[...this.groups.values(),...[...this.leaves.values()].filter(l=>!l.retiring)];
    for(const p of points){const key=`${Math.floor(p.x/size)},${Math.floor(p.y/size)}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(p)}
    for(const p of points){const cx=Math.floor(p.x/size),cy=Math.floor(p.y/size);let radius=(p.group?12:14)/k;
      for(let x=cx-1;x<=cx+1;x++)for(let y=cy-1;y<=cy+1;y++)for(const other of cells.get(`${x},${y}`)||[])if(other!==p)radius=Math.min(radius,Math.hypot(p.x-other.x,p.y-other.y)*.46);
      p.hit.setAttribute('r',Math.max(.5/k,radius));
      if(p.knowledge)p.g.querySelector('.skill-dot').setAttribute('r',Math.min((p.directory?10:8)/k,radius*.78));
    }
  }
  layoutLabels(){
    const {x,y,k}=this.camera,level=k/this.baseScale,detail=Number(this.data?.detail??3),boxes=[];
    const candidates=[...this.leaves.values()].sort((a,b)=>Number(b.id===this.selectedLeaf)-Number(a.id===this.selectedLeaf)||Number(b.parent===this.spotlight)-Number(a.parent===this.spotlight)||(a.localIndex||0)-(b.localIndex||0)||a.index-b.index);
    let count=0;
    for(const l of candidates){
      const limit=l.route?Math.max(9,Math.min(34,Math.floor((205*k-29)/5.7))):34;
      const label=l.name.length>limit?l.name.slice(0,limit-1)+'…':l.name;
      if(l.label.textContent!==label)l.label.textContent=label;
      const inspected=!!this.selected||this.knowledge||l.id===this.selectedLeaf||l.id===this.hovered?.skill||l.id===this.keyboardFocus?.skill||l.parent===this.spotlight;
      const eligible=inspected&&!l.retiring&&(l.id===this.selectedLeaf||detail>0&&count<Math.max(24,detail*24));
      const sx=x+l.x*k,sy=y+l.y*k,width=Math.min(190,l.label.textContent.length*5.7),height=16,padding=l.knowledge?15:9;
      let dir=l.dir;if(sx+padding+width>this.width-8)dir=-1;if(sx-padding-width<8)dir=1;
      const box={left:dir===1?sx+padding:sx-padding-width,right:dir===1?sx+padding+width:sx-padding,top:sy-height/2,bottom:sy+height/2};
      const obstructsNode=this.context.group&&[...this.leaves.values()].some(other=>other!==l&&!other.retiring&&other.group===this.context.group&&x+other.x*k+10>box.left&&x+other.x*k-10<box.right&&y+other.y*k+10>box.top&&y+other.y*k-10<box.bottom);
      const fits=eligible&&!obstructsNode&&box.left>=8&&box.right<=this.width-8&&box.top>=24&&box.bottom<=this.height-8&&!boxes.some(b=>box.left<b.right+6&&box.right>b.left-6&&box.top<b.bottom+3&&box.bottom>b.top-3);
      l.label.setAttribute('text-anchor',dir===1?'start':'end');l.label.setAttribute('x',dir*padding/k);l.g.classList.toggle('label-visible',fits);
      if(fits){boxes.push(box);count++}
    }
  }
  invalidate(){if(this.disposed||this.frame||document.hidden||window.oracleWindowVisible===false||this.data?.hidden)return;this.frame=requestAnimationFrame(now=>this.tick(now))}
  tick(now=performance.now()){
    const interval=now-(this.lastTick||now-16.67),delta=Math.min(50,interval);if(this.lastTick){this.interactionFrames.push(interval);if(this.interactionFrames.length>180)this.interactionFrames.shift()}this.lastTick=now;this.frame=0;
    const t=this.reduced?1:1-Math.exp(-delta/95);let moving=false;
    if(!this.selected&&!this.department&&!this.knowledge){const remaining=(this.departmentRotationTarget||0)-(this.departmentRotation||0);if(Math.abs(remaining)>.00001){this.rotateDepartments(Math.abs(remaining)<.0001?remaining:remaining*t);moving=true;}}
    if(this.isDepartmentScene()){const remaining=(this.focusedRotationTarget||0)-(this.focusedRotation||0);if(Math.abs(remaining)>.00001){this.rotateFocusedDepartment(Math.abs(remaining)<.0001?remaining:remaining*t);moving=true;}}
    for(const key of ['x','y','k']){const d=this.target[key]-this.camera[key];if(Math.abs(d)>(key==='k'?.00001:.02)){this.camera[key]+=d*t;moving=true}else this.camera[key]=this.target[key]}
    if(this.geometryMoving){let geometryMoving=false;for(const p of [...this.nodes.values(),...this.groups.values(),...this.leaves.values()]){if(this.drag?.node===p)continue;if(!this.reduced&&p.arriveAt>now){geometryMoving=true;continue}if(p.life!==undefined){p.life=this.reduced?p.lifeTarget:p.life+(p.lifeTarget-p.life)*(1-Math.exp(-delta/95));if(Math.abs(p.lifeTarget-p.life)>.01)geometryMoving=true;else p.life=p.lifeTarget;if(!p.life&&p.retiring){p.g.remove();p.edge.remove();this.leaves.delete(p.id);continue}}for(const axis of ['x','y']){const d=p['t'+axis]-p[axis];if(Number.isFinite(d)&&Math.abs(d)>.04){p[axis]+=d*(this.reduced?1:1-Math.exp(-delta/130));geometryMoving=true}else if(Number.isFinite(d))p[axis]=p['t'+axis]}}this.geometryMoving=geometryMoving;moving||=geometryMoving}
    if(((this.contextTravelling?this.target.k:this.camera.k)/this.baseScale>.500001)!==this.leafLevel)this.buildLeaves();
    this.draw();if(moving||this.geometryMoving)this.invalidate();else {this.lastTick=0;this.contextTravelling=false;}
  }
  pointerWorld(clientX,clientY){const r=this.el.getBoundingClientRect();return{x:(clientX-r.left-this.camera.x)/this.camera.k,y:(clientY-r.top-this.camera.y)/this.camera.k}}
  zoomAt(factor,clientX,clientY){
    // Fixed user-requested scale. Panning and context framing remain available;
    // wheel, pinch, keyboard and legacy callers cannot silently change the zoom.
    const next=this.baseScale*OracleAtlas.DEFAULT_ZOOM;
    if(this.target.k!==next){const center=this.viewCenter(),wx=(center.x-this.target.x)/this.target.k,wy=(center.y-this.target.y)/this.target.k;this.target={x:center.x-wx*next,y:center.y-wy*next,k:next};}
    this.camera.k=next;this.invalidate();
  }
  fit(){
    this.autoFit=true;this.contextTravelling=true;
    const fitted=this.fittedCamera(),center=this.viewCenter(),zoom=OracleAtlas.DEFAULT_ZOOM;
    // Keep 100% as the measured fit; enlarge around its center without rebasing the label.
    this.baseScale=fitted.k;
    this.target={x:center.x+(fitted.x-center.x)*zoom,y:center.y+(fitted.y-center.y)*zoom,k:fitted.k*zoom};
    this.camera.k=this.target.k;
    this.lastZoom=null;this.invalidate();
  }
  transitionScene(change,direction=1){
    this.cb.onNavigate?.();this.specialistHeading.hidden=true;this.setSpecialistSpotlight(null);
    const token=(this.sceneToken||0)+1;this.sceneToken=token;
    for(const animation of this.sceneAnimations||[])animation.cancel();
    const layers=[this.svg,this.el.querySelector('.universe-webgl')].filter(Boolean);
    const settle=()=>{
      if(this.disposed||token!==this.sceneToken)return false;
      change();this.camera={...this.target};this.lastLabelK=null;
      if((this.selected||this.department||this.knowledge)&&!this.reduced){
        const now=performance.now();
        for(const g of this.groups.values()){g.x=0;g.y=0;g.arriveAt=now+50+Math.min(g.index*12,120)}
        for(const l of this.leaves.values())if(!l.retiring){l.x=0;l.y=0;l.life=0;l.arriveAt=now+100+Math.min(l.localIndex*8,200)}
        this.geometryMoving=true;
      }
      this.draw();this.invalidate();return true;
    };
    if(this.reduced||document.hidden){this.el.classList.remove('scene-travelling');settle();return}
    this.el.classList.add('scene-travelling');
    this.sceneAnimations=layers.map(layer=>layer.animate([
      {opacity:1,transform:'translateX(0)'},{opacity:0,transform:`translateX(${-direction*90}px)`}
    ],{duration:180,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'}));
    Promise.all(this.sceneAnimations.map(a=>a.finished)).then(()=>{
      if(!settle())return;
      for(const animation of this.sceneAnimations)animation.cancel();
      this.sceneAnimations=layers.map(layer=>layer.animate([
        {opacity:0,transform:`translateX(${direction*120}px)`},{opacity:1,transform:'translateX(0)'}
      ],{duration:560,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'}));
      return Promise.all(this.sceneAnimations.map(a=>a.finished));
    }).then(()=>{
      if(token!==this.sceneToken)return;
      for(const animation of this.sceneAnimations||[])animation.cancel();
      this.sceneAnimations=[];this.el.classList.remove('scene-travelling');
    }).catch(error=>{if(token!==this.sceneToken)return;for(const a of this.sceneAnimations||[])a.cancel();this.sceneAnimations=[];this.el.classList.remove('scene-travelling');if(error.name!=='AbortError'){this.sceneError=String(error);console.error(error)}});
  }
  remember(){
    this.history.push({selected:this.selected,department:this.department,leaf:this.selectedLeaf,context:{...this.context},knowledge:this.knowledge?{...this.knowledge}:null,camera:{...this.target},base:this.baseScale,width:this.width,height:this.height,center:this.viewCenter(),autoFit:this.autoFit,focus:this.keyboardFocus?{...this.keyboardFocus}:null});
    if(this.history.length>32)this.history.shift();
  }
  back(immediate=false){
    if(!immediate&&this.history.length){this.transitionScene(()=>this.back(true),-1);return}
    this.finishFormationForInput();let prior=this.history.pop();while(prior&&(prior.selected&&!this.catalog.specialistByID.has(prior.selected)||!prior.selected&&prior.department&&!this.catalog.departmentByID.has(prior.department)))prior=this.history.pop();
    if(!prior){if(this.selected||this.department||this.knowledge)this.select(null);else this.fit();return}
    this.knowledge=prior.knowledge?{...prior.knowledge}:null;
    if(this.knowledge){this.department=null;this.selected=null;this.selectedLeaf=null;this.context={kind:'knowledge',group:null,page:0}}
    else this.applySelection(OracleDepartments.resolveSelection(this.catalog,{...prior.context,specialist:prior.selected,department:prior.department,leaf:prior.leaf}));
    this.syncSelectionData();this.topologyKey=null;
    this.relayout();this.baseScale=this.fittedScale();
    const center={x:((prior.center?.x??(prior.width||this.width)/2)-prior.camera.x)/prior.camera.k,y:((prior.center?.y??(prior.height||this.height)/2)-prior.camera.y)/prior.camera.k},k=this.baseScale*OracleAtlas.DEFAULT_ZOOM;
    this.target={x:this.viewCenter().x-center.x*k,y:this.viewCenter().y-center.y*k,k};this.autoFit=prior.autoFit;
    this.camera.k=k;
    // Restore the saved center while keeping the fixed user-requested scale.
    if(!this.selected&&!this.department&&!this.knowledge)this.fit();
    this.lastSelectionKey=null;this.selection();this.invalidate();this.notifySelection();
    if(prior.focus&&document.documentElement.dataset.inputMode!=='pointer'){
      const target=this.leaves.get(prior.focus.skill)||this.groups.get(prior.focus.group)||this.nodes.get(prior.focus.category);
      target?.g.focus({preventScroll:true});
    }
  }
  /** Logical IDs only: setDepartment('department/code'), never collection 'code'. */
  setDepartment(id,{page=0,keyboard=false,immediate=false}={}){
    if(!id){this.navigate(null,null,null,0,keyboard,immediate);return true}
    if(!this.catalog?.departmentByID.has(id))return false;
    const route=OracleDepartments.resolveSelection(this.catalog,{department:id,page});
    if(this.sameSelection(route)){this.fit();return true}
    if(!immediate&&(this.knowledge||this.selected||this.department!==id)){this.transitionScene(()=>this.setDepartment(id,{page,keyboard,immediate:true}),1);return true}
    this.finishFormationForInput();this.remember();this.knowledge=null;this.applySelection(route);this.syncSelectionData();
    this.topologyKey=null;this.contextTravelling=true;this.relayout();this.fit();this.lastSelectionKey=null;this.selection();this.invalidate();this.notifySelection(keyboard);
    return true;
  }
  navigate(category,group=null,leaf=null,page=0,keyboard=false,immediate=false){
    this.finishFormationForInput();
    if(!leaf&&this.catalog?.departmentByID.has(category)){this.setDepartment(category,{page,keyboard,immediate});return}
    const route=OracleDepartments.resolveSelection(this.catalog,{specialist:category,group,leaf,page,department:category?this.department:null});
    if(this.sameSelection(route)){this.fit();return}
    if(!immediate&&(this.knowledge||this.selected!==route.specialist||this.department!==route.department||this.context.group!==route.group)){this.transitionScene(()=>this.navigate(category,group,leaf,page,keyboard,true),route.specialist?1:-1);return}
    this.remember();
    this.knowledge=null;this.applySelection(route);this.contextTravelling=true;this.syncSelectionData();
    this.topologyKey=null;this.relayout();this.fit();
    if(this.selectedLeaf){const p=this.geometry.leaves.find(l=>l.id===this.selectedLeaf);if(p){const k=this.baseScale*OracleAtlas.DEFAULT_ZOOM;this.target={x:this.viewCenter().x-p.x*k,y:this.viewCenter().y-p.y*k,k};this.camera.k=k;this.autoFit=false}}
    this.lastSelectionKey=null;this.selection();this.invalidate();this.notifySelection(keyboard);
  }
  navigateKnowledge(area,path,page=0,immediate=false){
    if(!OracleKnowledge.areaDefinitions.some(row=>row.id===area))return false;
    const route=OracleKnowledge.resolve(this.data.entries||[],{area,path,page});
    if(this.knowledge&&this.knowledge.area===route.area&&this.knowledge.path===route.path&&this.knowledge.page===route.page){this.fit();return}
    if(!immediate){this.transitionScene(()=>this.navigateKnowledge(area,path,page,true),1);return}
    this.finishFormationForInput();this.remember();this.knowledge=route;this.selected=null;this.selectedLeaf=null;this.department=null;
    this.context={kind:'knowledge',group:null,page:0};this.contextTravelling=true;
    this.syncSelectionData();this.topologyKey=null;
    this.relayout();this.fit();this.lastSelectionKey=null;this.selection();this.invalidate();this.notifySelection();
  }
  focus(id){if(this.knowledge&&id===this.geometry.nodes[0]?.id){this.fit();return}if(this.catalog?.departmentByID.has(id)){this.setDepartment(id);return}if(this.catalog?.specialistByID.has(id))this.navigate(id)}
  focusGroup(id){const group=this.groups.get(id)||this.catalog?.specialistByID.get(this.selected)?.groups.find(g=>g.id===id);if(group)this.navigate(group.parent,id)}
  pageGroup(delta){
    if(this.knowledge){this.navigateKnowledge(this.knowledge.area,this.knowledge.path,this.knowledge.page+delta);return}
    if(this.selectedLeaf||!Number.isFinite(delta))return;
    const page=Math.max(0,Math.min((this.geometry.pages||1)-1,this.context.page+Math.trunc(delta)));
    if(page===this.context.page)return;
    if(this.selected)this.navigate(this.selected,this.context.group,null,page);
    else if(this.department)this.setDepartment(this.department,{page});
  }
  select(category,leaf=null,keyboard=false){
    if(this.knowledge&&!leaf&&category===this.geometry.nodes[0]?.id){this.fit();return}
    if(this.knowledge&&leaf){const entry=this.leaves.get(leaf);if(entry?.directory)this.navigateKnowledge(entry.area,entry.id);else this.openDocument(leaf);return}
    if(leaf){this.revealSkill(leaf,keyboard);return}
    if(this.catalog?.departmentByID.has(category)){this.setDepartment(category,{keyboard});return}
    this.navigate(category,null,null,0,keyboard);
  }
  openDocument(path){return this.cb.onOpen?.(path)}
  restoreLayout(layout){this.layout=structuredClone(layout||{nodes:{},leaves:{}});this.topologyKey=null;this.relayout();this.fit()}
  reset(){this.restoreLayout({nodes:{},leaves:{}});this.persistSoon()}
  translateNode(node,dx,dy,category){
    let x=Math.max(-1500,Math.min(1500,node.x+dx)),y=Math.max(-1500,Math.min(1500,node.y+dy));
    if(this.drag?.node===node&&node.orbitRadius){
      const parent=this.nodes.get(node.parent),distance=parent?Math.hypot(x-parent.x,y-parent.y):0;
      if(distance>node.orbitRadius){x=parent.x+(x-parent.x)*node.orbitRadius/distance;y=parent.y+(y-parent.y)*node.orbitRadius/distance;}
    }
    dx=x-node.x;dy=y-node.y;node.x=node.tx=x;node.y=node.ty=y;
    if(category){if(this.drag?.node===node)node.localOrbit=null;for(const g of this.groups.values())if(g.parent===category){g.x+=dx;g.y+=dy;g.tx=g.x;g.ty=g.y}for(const l of this.leaves.values())if(l.parent===category&&!l.custom){l.x+=dx;l.y+=dy;l.tx=l.x;l.ty=l.y}}else node.custom=true;
  }
  persistSoon(){clearTimeout(this.saveTimer);if(this.data?.replay)return;this.saveTimer=setTimeout(()=>{this.cb.onLayout?.(this.layout)},300)}
  diagnostics(){const p=(a,q)=>{if(!a.length)return null;const b=[...a].sort((x,y)=>x-y);return Math.round(b[Math.floor((b.length-1)*q)]*100)/100};return {...this.universe?.diagnostics(),interactionSamples:this.interactionFrames.length,interactionFrameMedianMs:p(this.interactionFrames,.5),interactionFrameP95Ms:p(this.interactionFrames,.95),sceneUpdateCPU95Ms:p(this.updateCosts,.95),departmentManifestValid:this.catalog?.manifestValid,departmentManifestErrors:this.catalog?.manifestErrors||[],selection:this.getSelection(),catalogSkills:this.catalog?.skillCount,renderedSkills:this.geometry?.leaves.length}}
  setFormation(options){return this.universe?.setFormation(options)||{progress:1,playing:false,phase:'complete',visualOnly:true}}
  getFormation(){return this.universe?.getFormation()||{progress:1,playing:false,phase:'complete',visualOnly:true}}
  finishFormationForInput(){if(this.data?.replay)return;if(this.getFormation().progress<1)this.setFormation({progress:1,playing:false})}
  setPaused(paused){this.pauseRequested=!!paused;this.paused=!!paused||!!this.windowInactive||!!document.querySelector('dialog[open]');
    if(document.hidden||window.oracleWindowVisible===false||this.data?.hidden){cancelAnimationFrame(this.frame);this.frame=0;this.lastTick=0}
    else if(!paused)this.invalidate();this.el.classList.toggle('ambient-paused',this.paused);this.universe?.setPaused(this.paused);if(this.svg.pauseAnimations){if(this.paused)this.svg.pauseAnimations();else this.svg.unpauseAnimations()}}
  bind(){
    this.listen(this.contextNav,'click',event=>{event.stopPropagation();if(event.target.closest('[data-map-back]'))this.back();const page=event.target.closest('[data-map-page]');if(page)this.pageGroup(Number(page.dataset.mapPage));});
    for(const type of ['pointerdown','keydown','wheel'])this.listen(document,type,()=>this.finishReveal(),{capture:true,passive:true});
    const targetState=element=>({category:element?.closest?.('[data-category]')?.dataset.category,skill:element?.closest?.('[data-skill]')?.dataset.skill,group:element?.closest?.('[data-group]')?.dataset.group,element:element?.closest?.('[data-knowledge-path],[data-central-hub]'),orbit:element?.closest?.('[data-orbit-track]')?.dataset.orbitTrack,central:!!element?.closest?.('[data-central-hub],.central-knowledge-layer')});
    this.listen(this.el,'pointerover',e=>{if(!this.drag){this.inspectionMode='pointer';this.hovered=targetState(e.target);this.renderSpecialistHeading();this.universe?.sync(this)}});
    this.listen(this.el,'pointerleave',()=>{this.hovered=null;this.renderSpecialistHeading();this.universe?.sync(this)});
    this.listen(this.el,'focusin',e=>{this.finishFormationForInput();this.inspectionMode='keyboard';this.keyboardFocus=targetState(e.target);this.renderSpecialistHeading();this.universe?.sync(this)});
    this.listen(this.el,'focusout',e=>{this.keyboardFocus=targetState(e.relatedTarget);this.renderSpecialistHeading();this.universe?.sync(this)});
    this.listen(this.el,'gesturestart',e=>{e.preventDefault();this.gestureScale=this.target.k});this.listen(this.el,'gesturechange',e=>{e.preventDefault();if(this.gestureScale)this.zoomAt((this.gestureScale*e.scale)/this.target.k,e.clientX,e.clientY)});
    this.listen(this.el,'wheel',e=>{
      if(e.target.closest('.atlas-context'))return;e.preventDefault();
      if(e.ctrlKey||e.metaKey){this.zoomAt(1,e.clientX,e.clientY);return;}
      if(this.selected||this.knowledge||this.drag||this.el.classList.contains('scene-travelling'))return;
      this.finishFormationForInput();
      const units=e.deltaMode===1?16:e.deltaMode===2?this.height:1;
      const delta=(Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX)*units;
      if(this.isDepartmentScene()){this.focusedRotationTarget=(this.focusedRotationTarget??this.focusedRotation??0)+Math.max(-240,Math.min(240,delta))*.003;this.invalidate();return;}
      this.departmentRotationTarget=(this.departmentRotationTarget??this.departmentRotation??0)+Math.max(-240,Math.min(240,delta))*.003;
      delete this.el.dataset.snappedDepartment;clearTimeout(this.departmentSnapTimer);this.departmentSnapTimer=setTimeout(()=>this.snapDepartments(),180);
      this.invalidate();
    },{passive:false});
    this.listen(this.el,'pointerdown',e=>{if(e.button!==0||e.target.closest('.atlas-context,[data-central-hub],[data-core],[data-orbit-plugin],[data-connector],[data-group],[data-knowledge-path]'))return;this.finishFormationForInput();this.drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,category:e.target.closest('[data-category]')?.dataset.category,skill:e.target.closest('[data-skill]')?.dataset.skill,moved:false};e.target.closest('[tabindex]')?.focus({preventScroll:true})});
    this.listen(this.el,'pointermove',e=>{const d=this.drag;if(d&&e.pointerId===d.id&&Math.hypot(e.clientX-d.sx,e.clientY-d.sy)>=4)d.moved=true});
    this.listen(window,'pointerup',e=>{const d=this.drag;if(!d||e.pointerId!==d.id)return;this.drag=null;d.moved||=Math.hypot(e.clientX-d.sx,e.clientY-d.sy)>=4;if(d.moved){this.suppressClick=true;this.lastDragAt=performance.now();setTimeout(()=>this.suppressClick=false,0)}else if(d.skill)this.select(this.leaves.get(d.skill)?.parent,d.skill);else if(d.category)this.select(d.category);else if(this.selectedLeaf&&!e.target.closest('[data-central-hub],[data-core],[data-orbit-plugin],[data-connector],[data-group],[data-knowledge-path]'))this.back();this.universe?.sync(this)});
    this.listen(this.el,'pointercancel',()=>{this.drag=null});
    this.listen(this.el,'dblclick',e=>{if(this.suppressClick||performance.now()-(this.lastDragAt||0)<350||e.target.closest('[data-central-hub],[data-knowledge-path]'))return;const cat=e.target.closest('[data-category]')?.dataset.category,skill=e.target.closest('[data-skill]')?.dataset.skill;if(cat)this.focus(cat);else if(skill){const node=this.leaves.get(skill);if(node?.knowledge&&node.directory)this.navigateKnowledge(node.area,node.id);else this.openDocument(skill)}else this.fit()});
    this.listen(this.el,'click',e=>{if(this.suppressClick)return;if(!this.selected&&!this.department&&!this.knowledge&&e.target.closest('[data-central-hub],.central-knowledge-node')){this.cb.onOpenKnowledge?.();return;}const knowledge=e.target.closest('[data-knowledge-path]');if(knowledge){const path=knowledge.dataset.knowledgePath,area=knowledge.dataset.knowledgeArea,entry=this.data.entries.find(p=>p.path===path);if(!entry||entry.directory)this.navigateKnowledge(area,path);else this.openDocument(path);return}if(e.target.closest('[data-map-back]')){this.back();return}const paging=e.target.closest('[data-map-page]');if(paging){this.pageGroup(Number(paging.dataset.mapPage));return}const group=e.target.closest('[data-group]')?.dataset.group;if(group){this.focusGroup(group);return}const connector=e.target.closest('[data-connector]')?.dataset.connector;if(connector){e.stopPropagation();this.cb.onConnector?.(connector);return}const id=e.target.closest('[data-orbit-plugin]')?.dataset.orbitPlugin;if(id){e.stopPropagation();this.cb.onPlugin?.(id)}});
    this.listen(this.el,'keydown',e=>{if(e.target.closest('.atlas-context')&&e.key!=='Escape')return;const knowledge=e.target.closest('[data-central-hub],[data-knowledge-path]');if(knowledge&&['Enter',' '].includes(e.key)){e.preventDefault();knowledge.dispatchEvent(new MouseEvent('click',{bubbles:true}));return}const group=e.target.closest('[data-group]')?.dataset.group;if(group&&['Enter',' '].includes(e.key)){e.preventDefault();this.focusGroup(group);return}const connector=e.target.closest('[data-connector]')?.dataset.connector;if(connector&&['Enter',' '].includes(e.key)){e.preventDefault();this.cb.onConnector?.(connector);return}const plugin=e.target.closest('[data-orbit-plugin]')?.dataset.orbitPlugin;if(plugin&&['Enter',' '].includes(e.key)){e.preventDefault();this.cb.onPlugin?.(plugin);return}const cat=e.target.closest('[data-category]')?.dataset.category,skill=e.target.closest('[data-skill]')?.dataset.skill;const node=skill?this.leaves.get(skill):cat?this.nodes.get(cat):null;
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.back();return}if(e.key==='+'||e.key==='='){e.preventDefault();this.zoomAt(1.2);return}if(e.key==='-'){e.preventDefault();this.zoomAt(1/1.2);return}if(e.key==='0'){e.preventDefault();this.fit();return}
      if(node&&!this.knowledge&&!this.isDepartmentScene()&&e.altKey&&!this.data?.replay&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const delta=e.shiftKey?25:8;this.translateNode(node,e.key==='ArrowLeft'?-delta:e.key==='ArrowRight'?delta:0,e.key==='ArrowUp'?-delta:e.key==='ArrowDown'?delta:0,cat);this.layout[skill?'leaves':'nodes'][skill||cat]={x:node.x,y:node.y};this.draw();this.persistSoon();return}
      if(!e.altKey&&['ArrowLeft','ArrowRight'].includes(e.key)&&this.selected){e.preventDefault();const ids=(this.catalog.departmentByID.get(this.department)?.specialists||this.catalog.specialists).map(c=>c.id),index=ids.indexOf(this.selected);if(ids.length)this.focus(ids[(index+(e.key==='ArrowLeft'?-1:1)+ids.length)%ids.length]);return}if(e.key==='Enter'&&e.target.closest('[data-core]')){e.preventDefault();this.select(null);return}
      if(e.key==='Enter'&&node){e.preventDefault();this.select(skill?node.parent:cat,skill,true)}if(e.key===' '){e.preventDefault();if(skill){if(node?.knowledge&&node.directory)this.navigateKnowledge(node.area,node.id);else this.openDocument(skill)}else if(cat)this.focus(cat);else this.fit()}
    });
  }
  dispose(){if(this.disposed)return;this.cancelCentralLayout();this.finishReveal();this.disposed=true;this.sceneToken=(this.sceneToken||0)+1;for(const a of this.sceneAnimations||[])a.cancel();this.abort.abort();this.observer.disconnect();cancelAnimationFrame(this.frame);clearTimeout(this.saveTimer);clearTimeout(this.eventTimer);clearTimeout(this.departmentSnapTimer);this.frame=0;this.universe?.dispose();this.nodes.clear();this.groups.clear();this.leaves.clear();this.orbitTracks.clear();this.starfield?.remove();this.contextNav?.remove();this.el.replaceChildren()}
}
window.OracleAtlas=OracleAtlas;
