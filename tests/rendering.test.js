/* Run with node tests/rendering.test.js. No WebGL/browser required. */
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const host = fs.readFileSync(path.join(__dirname, '../js/host.js'), 'utf8');
const models = fs.readFileSync(path.join(__dirname, '../js/models.js'), 'utf8');
let n = 0;
function test(name, fn) { fn(); n++; console.log('ok  ' + name); }
const countable = extra => Object.assign({ count: 0, dispose() { this.count++; } }, extra);

test('model cleanup releases each owned resource once and preserves shared assets', () => {
  const sharedPaint = countable(), holoFace = countable(), holoLine = countable();
  const sharedGeo = countable(), spriteGeo = countable(), sharedTexture = countable({ isTexture: true });
  const ownedGeo = countable(), ownedTexture = countable({ isTexture: true });
  const material = countable({ map: ownedTexture }), spriteMaterial = countable({ map: sharedTexture });
  const objects = [
    { geometry: ownedGeo, material, userData: { real: sharedPaint } },
    { geometry: ownedGeo, material: [material, holoFace, holoLine], userData: {} },
    { geometry: sharedGeo, material: sharedPaint, userData: {} },
    { isSprite: true, geometry: spriteGeo, material: spriteMaterial, userData: {} }
  ];
  const code = models.slice(models.indexOf('  function dispose(root, keep)'), models.indexOf('  // ---- small offscreen renderer'));
  const dispose = vm.runInNewContext(code + '\ndispose', { holoFace, holoLine, cache: { paint: sharedPaint } });
  dispose({ traverse: fn => objects.forEach(fn) }, { geometries: [sharedGeo], textures: [sharedTexture] });
  for (const resource of [ownedGeo, ownedTexture, material, spriteMaterial]) assert.strictEqual(resource.count, 1);
  for (const resource of [sharedGeo, spriteGeo, sharedPaint, holoFace, holoLine, sharedTexture]) assert.strictEqual(resource.count, 0);
});

function terrainHarness() {
  let time = 0, commits = 0;
  const size = 121 * 121 * 3;
  const ctx = vm.createContext({
    Float32Array, performance: { now: () => time++ }, worldKey: 'moon',
    TN: 120, TC: 30, TV: 121, tPos: new Float32Array(size), tCol: new Float32Array(size),
    tGeo: { attributes: { position: {}, color: {} } }, terrain: { visible: false },
    terrainJob: null, tcx: 1e9, tcz: 1e9, solids: [], sands: [], ti: { shade: 0, tint: .5 },
    H: (x, z) => x + z, mapLum: () => -1,
    lerp: (a,b,k) => a+(b-a)*k, smooth: v => v,
    collectObstacles: (x,z) => ({ solids: [{x,z}], sands: [] }),
    updateProps: () => { commits++; }
  });
  const code = host.slice(host.indexOf('  function updateTerrain(cx, cz)'), host.indexOf('  // rocks and'));
  vm.runInContext(code, ctx);
  return { ctx, commits: () => commits };
}

test('terrain work is bounded and visible mesh/colliders commit atomically', () => {
  const { ctx, commits } = terrainHarness();
  ctx.updateTerrain(120,240);
  ctx.stepTerrain();
  assert.ok(ctx.terrainJob.row > 0 && ctx.terrainJob.row <= 16);
  assert.strictEqual(ctx.terrain.visible, false);
  assert.strictEqual(ctx.solids.length, 0);
  assert.ok(ctx.tPos.every(v => v === 0));
  let steps = 1;
  while (ctx.terrainJob && steps++ < 200) ctx.stepTerrain();
  assert.ok(steps > 1 && steps < 200);
  assert.strictEqual(commits(), 1);
  assert.strictEqual(ctx.terrain.visible, true);
  assert.strictEqual(ctx.solids[0].x, 120);
  assert.strictEqual(ctx.tcx, 120);
  assert.strictEqual(ctx.tcz, 240);
  assert.strictEqual(ctx.tPos[0], 120 - 60 * 30);
  assert.strictEqual(ctx.tPos[1], 120 + 240 - 120 * 30);
  assert.strictEqual(ctx.tGeo.attributes.position.needsUpdate, true);
});

test('changing worlds cancels an incomplete terrain build', () => {
  const { ctx, commits } = terrainHarness();
  ctx.updateTerrain(0,0); ctx.stepTerrain();
  ctx.worldKey = 'mars'; ctx.stepTerrain();
  assert.strictEqual(ctx.terrainJob, null);
  assert.strictEqual(commits(), 0);
  assert.ok(ctx.tPos.every(v => v === 0));
  ctx.updateTerrain(480,600);
  for (let i=0; ctx.terrainJob && i<200; i++) ctx.stepTerrain();
  assert.strictEqual(commits(), 1);
  assert.strictEqual(ctx.solids[0].x, 480);
});


test('particle emission rate is stable at 30, 60 and 144 FPS', () => {
  const code = host.slice(host.indexOf('  const emissionCarry ='), host.indexOf('\n  // ------------------------------------------------------------------', host.indexOf('  const emissionCarry =')));
  function total(fps) {
    const c = vm.createContext({}); vm.runInContext(code, c);
    let count = 0; for (let i=0;i<fps;i++) count += c.emissionCount('boost',180,1/fps);
    c.emissionCount('boost',0,1/fps);
    assert.strictEqual(c.emissionCount('boost',180,1/180),1);
    return count;
  }
  for (const fps of [30,60,144]) assert.strictEqual(total(fps),180);
});

test('chase camera shortens before tall solids and leaves an overhead view clear', () => {
  const code = host.slice(host.indexOf('  function keepCameraOutsideSolids('), host.indexOf('  function updateCamera('));
  const c = vm.createContext({ rover:{x:0,y:0,alt:0}, solids:[{kind:'mesa',x:80,z:0,r:19,R:20,hgt:100}], H:()=>0 });
  vm.runInContext(code,c);
  const blocked={x:100,y:40,z:0}; c.keepCameraOutsideSolids(blocked);
  assert.ok(blocked.x < 54 && blocked.x > 0);
  const overhead={x:100,y:300,z:0}; c.keepCameraOutsideSolids(overhead);
  assert.strictEqual(overhead.x,100);
  const clear={x:-100,y:40,z:0}; c.keepCameraOutsideSolids(clear);
  assert.strictEqual(clear.x,-100);
});

test('small radar keeps positive marker radius and directions', () => {
  const setup = host.slice(host.indexOf('  function setupMini('),host.indexOf('  // Show a quick coarse map'));
  const canvas={style:{setProperty(){}},width:0,height:0};
  const c=vm.createContext({ $:()=>canvas, innerHeight:800,innerWidth:320,window:{devicePixelRatio:1},worldKey:'moon',mini:{},RIM:21,buildMiniOverlay(){},clearTimeout(){},setTimeout(){},buildMiniTerrain(){} });
  vm.runInContext(setup,c); c.setupMini();
  assert.ok(c.mini.Rin>0);
  const line=host.match(/const GS = Math.min\(9\.5[^\n]+/)[0];
  vm.runInContext('const Rin=mini.Rin; '+line+'\n this.markerEdge=edge;',c);
  assert.ok(c.markerEdge>0);
  assert.ok(Math.min(1,c.markerEdge/100)>0);
});

function minimapHarness() {
  let tick=0, writes=0;
  const g={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){writes++;},beginPath(){},arc(){},fill(){},stroke(){}};
  const c=vm.createContext({Map,Uint8ClampedArray,document:{createElement:()=>({width:0,height:0,getContext:()=>g})},mini:{},worldKey:'mars',W:{w:21600,h:6780},WD:{wrap:true},BANDS:{mars:{cols:[[0,0,0],[100,100,100],[255,255,255]],cuts:[.4,.63],crater:'#000',ring:'#fff'}},performance:{now:()=>tick++},vn:()=>.5,smooth:v=>v,lerp:(a,b,k)=>a+(b-a)*k,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),sandAt:()=>null,craterCell:()=>null});
  const code=host.slice(host.indexOf('  const miniCache ='),host.indexOf('  function buildMiniOverlay('));
  vm.runInContext(code+'\nthis.job=()=>miniBuild;',c);
  return {c,writes:()=>writes};
}
test('minimap progressively sharpens in bounded batches, caches by world and cancels stale work', () => {
  const {c,writes}=minimapHarness(); c.buildMiniTerrain();
  assert.ok(c.job().c.width*c.job().c.height<150000);
  c.stepMiniTerrain(); assert.ok(c.job().row<=12); assert.strictEqual(writes(),0);
  while (writes() === 0) c.stepMiniTerrain();
  assert.strictEqual(c.mini.ready,true, 'a coarse map displays before refinement finishes');
  assert.strictEqual(c.mini.rasterK,1/40);
  assert.ok(c.job().c.width*c.job().c.height<2000000, 'refinement memory is bounded');
  assert.strictEqual(c.job().rasterK,1/10);
  c.stepMiniTerrain(); assert.ok(c.job().row<=12);
  for(let i=0;c.job()&&i<1000;i++)c.stepMiniTerrain();
  assert.strictEqual(writes(),2); assert.strictEqual(c.mini.ready,true);
  assert.strictEqual(c.mini.rasterK,1/10, 'final map has four times the linear resolution');
  const cached=c.mini.terrain; c.buildMiniTerrain(); assert.strictEqual(c.mini.terrain,cached); assert.strictEqual(c.job(),null);
  const next=minimapHarness().c;next.buildMiniTerrain();next.worldKey='moon';next.stepMiniTerrain();assert.strictEqual(next.job(),null);
  const interrupted=minimapHarness();interrupted.c.buildMiniTerrain();
  while (interrupted.writes()===0) interrupted.c.stepMiniTerrain();
  interrupted.c.worldKey='moon';interrupted.c.stepMiniTerrain();
  interrupted.c.worldKey='mars';interrupted.c.buildMiniTerrain();
  assert.strictEqual(interrupted.c.mini.ready,true);
  assert.strictEqual(interrupted.c.job().rasterK,1/10,'returning to a coarse cached map resumes refinement');
});

test('graphics loss freezes gameplay until all contexts recover and player resumes', () => {
  const els=new Map();const element=()=>({classList:{add(){},remove(){}},style:{},disabled:false,textContent:'',appendChild(){}});
  const get=id=>{if(!els.has(id))els.set(id,element());return els.get(id);};
  const events={}; const main={addEventListener:(name,fn)=>events[name]=fn};let thumbChanged,saves=0,clears=0;
  const c=vm.createContext({ document:{createElement:element},$:get,renderer:{domElement:main},graphicsBlocked:false,lostContexts:new Set(),Models:{onContextChange:fn=>thumbChanged=fn},clearHeldInput:()=>clears++,clearFocus(){},stopReading(){},Sfx:{engine(){}},saveProgress:()=>saves++,location:{reload(){}} });
  const code=host.slice(host.indexOf('  function setupGraphicsRecovery('),host.indexOf('  // ------------------------------------------------------------------\n  // main loop'));
  vm.runInContext(code,c);c.setupGraphicsRecovery();
  events.webglcontextlost({preventDefault(){}}); assert.strictEqual(c.graphicsBlocked,true);assert.strictEqual(saves,1);
  const thumb={};thumbChanged(thumb,true,{preventDefault(){}});
  events.webglcontextrestored({});assert.strictEqual(get('graphicsResume').disabled,true);
  get('graphicsResume').onclick();assert.strictEqual(c.graphicsBlocked,true);
  thumbChanged(thumb,false,{});assert.strictEqual(get('graphicsResume').disabled,false);assert.strictEqual(c.graphicsBlocked,true);
  get('graphicsResume').onclick();assert.strictEqual(c.graphicsBlocked,false);assert.ok(clears>=3);
});
console.log('All '+n+' rendering checks passed');
