/* Exercise actual book jumps/counts, clock mode and preview resource restoration. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../js/host.js'),'utf8');
const between=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const ids=new Map(); let focused=null;
function element(tag='div') {
 const classes=new Set(); let markup='';
 const el={tagName:tag.toUpperCase(),children:[],dataset:{},attributes:{},textContent:'',style:{setProperty(){}},scrollTop:0,offsetHeight:150,
  classList:{toggle(k,on){if(on===undefined)on=!classes.has(k);on?classes.add(k):classes.delete(k);},add(k){classes.add(k)},remove(k){classes.delete(k)},contains:k=>classes.has(k)},
  appendChild(c){this.children.push(c);return c;},setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]},
  querySelectorAll(selector){return selector==='button'?this.children.filter(c=>c.tagName==='BUTTON'):[]},focus(){focused=this},
  getBoundingClientRect(){return {top:this.top||20}},top:20
 };
 Object.defineProperty(el,'id',{get(){return this._id},set(id){this._id=id;ids.set(id,this)}});
 Object.defineProperty(el,'innerHTML',{get(){return markup},set(v){markup=v;this.children=[]}});
 return el;
}
const node=id=>{if(!ids.has(id)){const el=element();el.id=id;}return ids.get(id)};
const pane=element();pane.top=40;node('book').querySelector=()=>pane;node('bookHeader').offsetHeight=160;
const ctx=vm.createContext({document:{createElement:element,querySelectorAll:()=>[]},$:node,bookOpen:false,rover:{v:2},Sfx:{click(){}},toastT:2,
 WORLDS:{moon:{sites:[{id:'m1',name:'One'},{id:'m2',name:'Two'}],stars:[[0,0,'First'],[1,1,'Second']]},mars:{sites:[{id:'r1',name:'Mars'}],stars:[[2,2,'Third']]}},
 DEEP:[{id:'d1',name:'Deep'}],found:new Set(['m1']),tasksDone:new Set(['m1']),deepSeen:new Set(['d1']),starsGot:new Set(['moon0']),
 Tasks:{has:id=>id!=='m2',title:id=>'Task '+id},getStickerImg:s=>'image:'+s.id,reviewSite:(s,task)=>{ctx.review=[s.id,task]}});
vm.runInContext(fs.readFileSync(require.resolve('../js/icons.js'),'utf8')+'\nthis.Icons=Icons;',ctx);
vm.runInContext(between('  function toggleBook(', '  function continueGame()'),ctx);ctx.toggleBook(220);
assert.equal(ctx.bookOpen,true);assert.equal(ctx.rover.v,0);assert.equal(pane.scrollTop,220);
const jumps=node('bookNav').children;
assert.equal(jumps.length,5);assert.deepEqual(jumps.map(b=>b.children.at(-1).textContent),['1/2','0/1','1/1','1/2','1/3']);
assert.match(jumps[0].attributes['aria-label'],/Moon: 1 of 2/);
node('book-section-stars').top=730; jumps[4].onclick();
assert.equal(pane.scrollTop,738,'section jump accounts for the persistent header');assert.equal(focused,node('book-section-stars'));
assert.equal(jumps[4].attributes['aria-current'],'location'); jumps[0].onclick(); assert.equal(jumps[4].attributes['aria-current'],undefined);
node('sticker-story-m1').onclick();assert.deepEqual(ctx.review,['m1',false]);node('sticker-task-m1').onclick();assert.deepEqual(ctx.review,['m1',true]);
ctx.toggleBook();ctx.found.add('r1');ctx.toggleBook(330);assert.equal(node('bookNav').children.length,5,'reopening replaces section controls');assert.equal(node('bookNav').children[1].children.at(-1).textContent,'1/1');assert.equal(pane.scrollTop,330);
ctx.clock={left:{moon:72},free:{moon:false},on:true};ctx.worldKey='moon';ctx.mode='play';ctx.timing=()=>true;ctx.fmt=n=>'1:12';
vm.runInContext(between('  function showClock()', '  function tickClock('),ctx);ctx.showClock();assert.equal(node('timeTxt').textContent,'1:12');assert.equal(node('hudTime').classList.contains('free-explore'),false);
ctx.clock.free.moon=true;ctx.showClock();assert.equal(node('timeTxt').textContent,'Free explore');assert.equal(node('hudTime').classList.contains('free-explore'),true);
ctx.clock.on=false;ctx.showClock();assert.equal(node('hudTime').classList.contains('hidden'),true);
// A second portrait must not accumulate models, mutate the live rover, or dispose shared paint/geometry.
const T=require('../lib/three.min.js'),live=new T.Group(),paint=new T.MeshLambertMaterial({color:0xff8020}),geo=new T.BoxGeometry(30,25,20);
live.add(new T.Mesh(geo,paint));live.position.set(120,30,70);live.rotation.y=.8;
const holder=new T.Group(),previous=new T.Group();previous.add(new T.Mesh(new T.BoxGeometry(2,3,4),paint));holder.add(previous);holder.rotation.y=.7;
const cam=new T.PerspectiveCamera(32,1,1,1000);cam.position.set(5,60,160);cam.lookAt(2,0,0);const camPosition=cam.position.clone(),camRotation=cam.quaternion.clone();
let disposed=0,renders=0;geo.addEventListener('dispose',()=>disposed++);paint.addEventListener('dispose',()=>disposed++);
const thumb={holder,model:previous,cam,scene:new T.Scene(),renderer:{domElement:{toDataURL:()=> 'data:image/png;test'},render(){renders++;assert.equal(holder.children.length,1);assert.notEqual(holder.children[0],previous);}}};thumb.scene.add(holder);
ctx.T=T;ctx.R={group:live};ctx.Models={thumbSetup:()=>thumb};
vm.runInContext(between('  function paintRoverPreview(', '  ROVER_COLORS.forEach('),ctx);
ctx.paintRoverPreview('Tangerine');ctx.paintRoverPreview('Sky');
assert.equal(renders,2);assert.equal(disposed,0);assert.equal(holder.children.length,1);assert.equal(holder.children[0],previous);assert.equal(thumb.model,previous);assert.equal(holder.rotation.y,.7);
assert.ok(cam.position.equals(camPosition)&&cam.quaternion.equals(camRotation));assert.equal(live.position.x,120);assert.equal(live.rotation.y,.8);assert.equal(node('paintName').textContent,'Sky');assert.match(node('paintPreview').alt,/Sky/);
thumb.renderer.domElement.toDataURL=()=>{throw Error('export failed')};assert.throws(()=>ctx.paintRoverPreview('Sky'));assert.equal(holder.children.length,1);assert.equal(holder.children[0],previous);assert.ok(cam.position.equals(camPosition)&&cam.quaternion.equals(camRotation));
console.log('Book section navigation, counts, replay callbacks, free-explore clock and portrait resource restoration passed');
