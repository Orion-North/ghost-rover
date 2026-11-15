const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const T = require('../lib/three.min.js');
const modelContext = vm.createContext({THREE:T});
vm.runInContext(fs.readFileSync(require.resolve('../js/models.js'),'utf8')+'\nthis.Models=Models;',modelContext);
const R = modelContext.Models.playerRover(0xff9933), wheel = R.wheels[0];
const blocks = wheel.children.filter(m=>m.geometry && m.geometry.type==='BoxGeometry');
assert.equal(blocks.length,6,'each tyre has six straight blocks');
const source = fs.readFileSync(require.resolve('../js/host.js'),'utf8');
const c = vm.createContext({T,R});
vm.runInContext(source.slice(source.indexOf('  const tread ='),source.indexOf('  const TRN ='))+'\nthis.trackGeo=trackGeo;this.tread=tread;',c);
c.trackGeo.computeBoundingBox();
const footprint = c.trackGeo.boundingBox.getSize(new T.Vector3());
assert.ok(Math.abs(footprint.x-blocks[0].geometry.parameters.depth)<1e-6,'impression spans the actual tyre block width');
assert.ok(Math.abs(footprint.z-blocks[0].geometry.parameters.height)<1e-6,'impression has the actual block contact length');
const radius = wheel.children[0].geometry.parameters.radiusTop;
assert.equal(c.tread.pitch,2*Math.PI*radius/blocks.length,'spacing follows the wheel circumference and lug count');
const matrices = [];
Object.assign(c,{rover:{x:100,y:100,h:0,v:100},trackI:0,trackLast:[1e9,1e9],TRN:900,trackLife:new Float32Array(900),trackFade:new Float32Array(900),trackDummy:new T.Object3D(),H:()=>0,
 tracks:{count:0,instanceMatrix:{},setMatrixAt(i,m){matrices.push(m.clone());}},trackGeo:c.trackGeo});
c.trackGeo.setAttribute('aFade',new T.InstancedBufferAttribute(c.trackFade,1));
vm.runInContext(source.slice(source.indexOf('  function layTrack()'),source.indexOf('\n\n  const devils =')),c);
function check(h,v){c.rover.h=h;c.rover.v=v;c.trackLast=[1e9,1e9];matrices.length=0;c.layTrack();assert.equal(matrices.length,2,'one trail per wheel lane');
 const axle=v<0?11.5:-11.5;
 const centres=matrices.map(m=>new T.Vector3().setFromMatrixPosition(m));
 for(const p of centres){const along=(p.x-100)*Math.cos(h)+(p.z-100)*Math.sin(h);assert.ok(Math.abs(along-axle)<1e-6,'marks leave the trailing axle');}
 assert.ok(Math.abs(centres[0].distanceTo(centres[1])-25)<1e-6,'wheel-lane separation matches the rover');
 const box=c.trackGeo.boundingBox.clone().applyMatrix4(matrices[0]),size=box.getSize(new T.Vector3());
 assert.ok(Math.abs((h===0?size.z:size.x)-blocks[0].geometry.parameters.depth)<1e-5,'bar remains crosswise after turning');
 c.layTrack();assert.equal(matrices.length,2,'stationary frames do not stack stamps');
}
check(0,100);check(Math.PI/2,100);check(0,-100);
c.rover.h=0;c.rover.v=100;c.rover.x=100;c.rover.y=100;c.trackLast=[1e9,1e9];matrices.length=0;c.layTrack();
c.rover.x+=c.tread.pitch*2.5;c.layTrack();
assert.equal(matrices.length,6,'two travelled pitches create two pairs, even in one frame');
for(let i=2;i<6;i+=2){const a=new T.Vector3().setFromMatrixPosition(matrices[i-2]),b=new T.Vector3().setFromMatrixPosition(matrices[i]);assert.ok(Math.abs(a.distanceTo(b)-c.tread.pitch)<1e-6,'stamp pitch is independent of frame distance');}
c.rover.x+=1000;matrices.length=0;c.layTrack();assert.equal(matrices.length,2,'teleports cannot draw a connecting trail');
console.log('Ground impressions match actual tyre block dimensions, pitch, wheel lanes and forward/reverse placement');
