const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const T = require('../lib/three.min.js'), DiscoveryFX = require('../js/discovery-fx.js');
function fixture() {
  const launched=[], listeners=new Map();
  function element(tag='div') {
    const el={tagName:tag.toUpperCase(),children:[],style:{},parentNode:null,attributes:{},offsetParent:{},
      setAttribute(k,v){this.attributes[k]=v;},
      appendChild(n){n.parentNode=this;this.children.push(n);return n;},
      removeChild(n){this.children.splice(this.children.indexOf(n),1);n.parentNode=null;},
      remove(){if(this.parentNode)this.parentNode.removeChild(this);},
      get firstChild(){return this.children[0]||null;},
      getBoundingClientRect(){return {left:700,top:20,width:48,height:48,bottom:68};},
      addEventListener(name,fn){listeners.set(this.tagName+name,fn);},removeEventListener(name){listeners.delete(this.tagName+name);},
      animate(frames,timing){let done,fail;const animation={frames,timing,cancelled:false,finished:new Promise((resolve,reject)=>{done=resolve;fail=reject;}),finish(){done();},cancel(){this.cancelled=true;fail(Error('cancelled'));}};launched.push(animation);return animation;}
    };return el;
  }
  const win={addEventListener:(n,f)=>listeners.set('window'+n,f),removeEventListener:n=>listeners.delete('window'+n)};
  const doc={defaultView:win,hidden:false,head:element('head'),createElement:element,getElementById:()=>null,addEventListener:(n,f)=>listeners.set('document'+n,f),removeEventListener:n=>listeners.delete('document'+n)};
  const canvas=element('canvas'),root=element();root.ownerDocument=doc;root.querySelectorAll=()=>[canvas];
  const book=element('button'),star=element('span');
  const real=new T.MeshLambertMaterial({color:0xcf9028}),holo=new T.MeshBasicMaterial({color:0x59d8ff,transparent:true,opacity:.3}),mesh=new T.Mesh(new T.BoxGeometry(10,10,10),holo);
  mesh.userData.real=real;mesh.userData.edges={visible:true};const model=new T.Group();model.add(mesh);model.position.y=7;model.rotation.y=.4;model.scale.setScalar(1.3);
  const g=new T.Group();g.add(model);const site={id:'a11',g,model,alive:false,ring:{visible:true}};
  const fx=DiscoveryFX.create({THREE:T,root,bookButton:()=>book,starTarget:()=>star,getSticker:()=>'/fake-thumbnail.png',project:()=>({x:400,y:300})});
  return {fx,site,mesh,real,holo,root,doc,book,star,launched,listeners};
}
let count=0;async function test(name,fn){await fn();count++;console.log('ok '+name);}
(async()=>{
await test('transformation uses temporary paints and restores shared real paints on reveal',()=>{const c=fixture();c.fx.begin(c.site);const temporary=c.mesh.material;assert.notEqual(temporary,c.holo);assert.notEqual(temporary,c.real);assert.equal(c.real.color.getHex(),0xcf9028);c.fx.step(1.5);assert.equal(temporary.color.getHex(),c.real.color.getHex());assert.equal(temporary.opacity,1);c.site.alive=true;c.fx.collect(c.site);assert.equal(c.mesh.material,c.real);assert.equal(c.root.children[0].children.length,1);c.fx.dispose();});
await test('only one expanding ring and one earned patch are created per discovery',()=>{const c=fixture();c.fx.begin(c.site);assert.equal(c.site.g.children.length,2);c.fx.step(1.5);c.site.alive=true;c.fx.collect(c.site);c.fx.collect(c.site);assert.equal(c.root.children[0].children.length,1);assert.equal(c.launched.length,1);c.fx.dispose();assert.equal(c.site.g.children.length,1);});
await test('cancellation restores hologram and disposes only temporary ring/paint resources',()=>{const c=fixture();let paintDisposed=0,realDisposed=0,holoDisposed=0,ringDisposed=0;c.real.addEventListener('dispose',()=>realDisposed++);c.holo.addEventListener('dispose',()=>holoDisposed++);c.fx.begin(c.site);c.mesh.material.addEventListener('dispose',()=>paintDisposed++);c.site.g.children[1].geometry.addEventListener('dispose',()=>ringDisposed++);c.fx.step(.5);c.fx.cancel();assert.equal(c.mesh.material,c.holo);assert.equal(c.mesh.userData.edges.visible,true);assert.equal(c.site.ring.visible,true);assert.equal(c.site.model.position.y,7);assert.equal(paintDisposed,1);assert.equal(ringDisposed,1);assert.equal(realDisposed,0);assert.equal(holoDisposed,0);c.fx.dispose();});
await test('discoveries always animate the ring, model and flying patch',()=>{const c=fixture();c.fx.begin(c.site);c.fx.step(.8);assert.equal(c.site.g.children.length,2);assert.notEqual(c.site.model.rotation.y,.4);assert.notEqual(c.site.model.position.y,7);c.site.alive=true;c.fx.collect(c.site);assert.ok(c.launched[0].frames.some(f=>f.transform));c.fx.dispose();});
await test('pause, world/title guard and graphics interruption cancel active effects',()=>{for(const [mode,blocked]of [['pause',false],['lobby',false],['revive',true]]){const c=fixture();c.fx.begin(c.site);c.site.alive=true;c.fx.collect(c.site);c.fx.guard(mode,blocked);assert.equal(c.root.children[0].children.length,0);assert.equal(c.site.g.children.length,1);assert.ok(c.launched.every(a=>a.cancelled));c.fx.dispose();}});
await test('visibility, blur and WebGL context loss cancel decorations independently',()=>{for(const key of ['documentvisibilitychange','windowblur','CANVASwebglcontextlost']){const c=fixture();c.fx.begin(c.site);c.doc.hidden=true;c.listeners.get(key)();assert.equal(c.site.g.children.length,1);assert.equal(c.mesh.material,c.holo);c.fx.dispose();}});
await test('cancelled flight cannot later highlight the wrong collection button',async()=>{const c=fixture();c.fx.begin(c.site);c.site.alive=true;c.fx.collect(c.site);const flight=c.launched[0];c.fx.cancel();flight.finish();await Promise.resolve();await Promise.resolve();assert.equal(c.launched.length,1);c.fx.dispose();});
await test('science reward animates the actual HUD target',()=>{const c=fixture();c.fx.reward('star');assert.ok(c.launched[0].frames.some(f=>f.transform));c.fx.dispose();});
await test('repeated discoveries never retain geometry, patches or animation handles after cancel',()=>{const c=fixture();for(let i=0;i<25;i++){c.site.alive=false;c.mesh.material=c.holo;c.fx.begin(c.site);c.fx.step(1);c.site.alive=true;c.fx.collect(c.site);c.fx.cancel();assert.equal(c.site.g.children.length,1);assert.equal(c.root.children[0].children.length,0);}c.fx.dispose();assert.equal(c.listeners.size,0);});
await test('host reveal timing and task transition remain unchanged without particles or flashes',()=>{const src=fs.readFileSync(require.resolve('../js/host.js'),'utf8');const code=src.slice(src.indexOf('  function startRevive('),src.indexOf('  // ------------------------------------------------------------------\n  // camera',src.indexOf('  function startRevive(')));const calls=[];const c={mode:'play',rover:{x:0,y:0,h:0,v:1},revive:null,found:new Set(),pendingSite:null,pendingPhase:null,saveProgress(){},wdx:x=>x,discoveryFx:{begin:()=>calls.push('begin'),step:t=>calls.push(['step',t]),collect:()=>calls.push('collect'),cancel:()=>calls.push('cancel')},Sfx:{wake(){},found:()=>calls.push('found')},Pad:{rumble(){}},updateHud(){},setSiteAlive:s=>s.alive=true,startTask:()=>calls.push('task')};vm.createContext(c);vm.runInContext(code,c);const st={id:'a11',x:1,y:1,model:{position:{y:5},scale:{setScalar(){}}}};c.startRevive(st);c.tickRevive(1.49);assert.equal(calls.includes('collect'),false);c.tickRevive(.02);assert.equal(calls.filter(x=>x==='collect').length,1);assert.equal(calls.includes('task'),false);c.tickRevive(1.5);assert.equal(calls.filter(x=>x==='task').length,1);assert.equal(c.revive,null);assert.equal(c.found.has('a11'),true);});
console.log(count+' discovery effect tests passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
