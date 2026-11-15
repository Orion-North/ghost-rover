const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const source = fs.readFileSync(require.resolve("../js/host.js"), "utf8");
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const smooth = v => { v=clamp(v,0,1); return v*v*(3-2*v); };
const tracks = vm.createContext({ mode:"play",bookOpen:false,tracks:{count:2},trackI:2,trackLast:[10,20],trackLife:new Float32Array([14,7]),trackFade:new Float32Array([1,1]),trackGeo:{attributes:{aFade:{needsUpdate:false}}},smooth });
vm.runInContext(source.slice(source.indexOf("  function resetTracks()"),source.indexOf("  function layTrack()")),tracks);
tracks.updateTracks(1); assert.equal(tracks.trackFade[0],1); assert.ok(tracks.trackFade[1]<1);
const before=tracks.trackLife[0];tracks.mode="pause";tracks.updateTracks(5);assert.equal(tracks.trackLife[0],before);
tracks.mode="play";tracks.bookOpen=true;tracks.updateTracks(5);assert.equal(tracks.trackLife[0],before);
tracks.bookOpen=false;tracks.updateTracks(20);assert.equal(tracks.trackFade[0],0);assert.equal(tracks.trackFade[1],0);
tracks.resetTracks();assert.equal(tracks.trackI,0);assert.equal(tracks.tracks.count,0);assert.ok(tracks.trackLast[0]>1e8);

function vec(){return {x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z});}};}
function starFixture(){
  const st={id:"moon0",x:0,y:0,h0:5,g:{visible:true,position:vec()},mesh:{scale:vec(),rotation:{}}};
  const c={stars:[st],starsGot:new Set(),dt:1/60,time:0,rx:x=>x,wdx:x=>x,rover:{x:0,y:0},playing:true,clamp,smooth,rewards:0,saves:0,pulses:0,
    toast(){},Sfx:{star(){},boost(){}},Pad:{rumble(){}},addTime(){c.rewards++;},updateHud(){},saveProgress(){c.saves++;},discoveryFx:{reward(){c.pulses++;}},spark:{emit(){}}};
  vm.createContext(c);const start=source.indexOf("    // --- science stars ---");
  const code=source.slice(start,source.indexOf("    for (const l of labels)",start));
  return {c,st,step(){vm.runInContext(code,c);}};
}
const normal=starFixture();normal.step();assert.equal(normal.c.rewards,1);assert.equal(normal.c.saves,1);
assert.equal(normal.st.g.visible,true,"pickup remains visible for squash animation");
normal.step();assert.ok(normal.st.mesh.scale.x>normal.st.mesh.scale.y,"collectible squashes playfully");
for(let i=0;i<40;i++)normal.step();assert.equal(normal.st.g.visible,false);assert.equal(normal.c.rewards,1);assert.equal(normal.c.pulses,1);
console.log("Tread fading/reset/pause and collectible reward/animation checks passed");
