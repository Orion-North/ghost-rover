/* Actual Three geometry and instance placement; no browser/WebGL required. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const THREE = require('../lib/three.min.js');
const host = fs.readFileSync(path.join(__dirname, '../js/host.js'), 'utf8');
const extract=(a,b)=>host.slice(host.indexOf(a),host.indexOf(b,host.indexOf(a)));
const ctx=vm.createContext({ Math });
vm.runInContext(extract('  function hash(', '  const wrapI ='),ctx);
vm.runInContext(extract('  function prepareInstanceColors(', '  // rocks and (on Mars)'),ctx);
vm.runInContext(extract('  function mesaArchGeometry(', '  const mesaLandmarks ='),ctx);
vm.runInContext(extract('  function createHorizonLandmarks(', '  const loopNoise ='),ctx);
const set=ctx.createMesaLandmarks(THREE);
assert.equal(set.group.children.length,3, 'all mesa decoration uses three draw batches');
for(const mesh of set.group.children){assert.equal(mesh.count,0);assert.equal(mesh.geometry.isBufferGeometry,true);assert.equal(mesh.material.map,null);}
const mesa={x:100,z:200,R:140,r:133,hgt:110,m:3,iz:2};
const before=JSON.stringify(mesa);
ctx.positionMesaLandmark(set,mesa,0,25,.8,.9,1);
assert.equal(JSON.stringify(mesa),before,'decorating a mesa never changes collision data');
const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
set.caps.getMatrixAt(0,matrix);matrix.decompose(position,rotation,scale);
assert.equal(position.y,135);assert.equal(scale.y,5);
for(let i=0;i<3;i++){set.bands.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);assert.ok(position.y>5&&position.y<135);assert.ok(scale.x<mesa.R*1.01);}
let archMesa;
for(let i=0;i<20;i++)if(ctx.hash(i,2,143)<.45){archMesa={...mesa,m:i};break;}
const first=ctx.createMesaLandmarks(THREE),second=ctx.createMesaLandmarks(THREE);
for(const item of [first,second])ctx.positionMesaLandmark(item,archMesa,0,25,.8,.9,1);
assert.equal(first.arches.count,1);assert.deepEqual(first.arches.instanceMatrix.array,second.arches.instanceMatrix.array,'same cell recreates the same landmark');
first.arches.getMatrixAt(0,matrix);matrix.decompose(position,rotation,scale);
assert.ok(position.y>=25+mesa.hgt, 'arch rests on unreachable mesa top');
assert.ok(scale.x*1.22<mesa.R*.7, 'arch fits entirely inside existing mesa footprint');
for(const moon of [true,false]){
 const group=ctx.createHorizonLandmarks(THREE,moon);
 assert.equal(group.children.length,3);
 if(moon) {
  group.updateMatrixWorld(true);
  for(const rim of group.children){const bounds=new THREE.Box3().setFromObject(rim);assert.ok(bounds.min.y<0,'crater rim intersects the ground');assert.ok(bounds.max.y<50,'horizontal crater cannot become an upright hoop');}
 }
 const geometries=new Set(), materials=new Set();let disposedGeometry=0,disposedMaterial=0;
 group.traverse(o=>{if(o.geometry){assert.ok(Math.hypot(o.position.x,o.position.z)>1700);assert.equal(o.geometry.isBufferGeometry,true);geometries.add(o.geometry);}if(o.material)materials.add(o.material);});
 for(const g of geometries)g.addEventListener('dispose',()=>disposedGeometry++);
 for(const m of materials)m.addEventListener('dispose',()=>disposedMaterial++);
 const modelContext=vm.createContext({holoFace:{},holoLine:{},cache:{}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/models.js'),'utf8').split('  function dispose(root, keep)')[1].split('  // ---- small offscreen renderer')[0].replace(/^/, 'function dispose(root, keep)')+'\nthis.cleanup=dispose;',modelContext);
 modelContext.cleanup(group);
 assert.equal(disposedGeometry,3);assert.equal(disposedMaterial,1,'shared horizon paint disposes once');
}
// Exercise the actual host initialization, observing each batch at scene insertion.
// This is the point at which r149 may compile its first material program.
const firstRenderFlags = new Map();
const initContext = vm.createContext({ T:THREE, scene:{add(root){root.traverse(mesh=>{if(mesh.isInstancedMesh)firstRenderFlags.set(mesh,mesh.instanceColor!==null);});}} });
vm.runInContext(extract('  function prepareInstanceColors(', '  // Can every ghost and star')+'\nthis.coloredBatches=[rocks,mesas,boulders,mesaLandmarks.bands];',initContext);
for(const mesh of initContext.coloredBatches){
 assert.equal(firstRenderFlags.get(mesh),true,'USE_INSTANCING_COLOR is enabled before first render');
 assert.equal(mesh.instanceColor.count,mesh.instanceMatrix.count);
 assert.equal(mesh.instanceColor.usage,THREE.DynamicDrawUsage);
 assert.ok(mesh.instanceColor.array.every(v=>v===1),'unpainted slots start white rather than black');
 assert.ok(mesh.material.version>0,'first color allocation invalidates any material program');
}
console.log('Landmark geometry, safe placement, disposal and initial instanced-color shader flags passed');

const archGeo=ctx.mesaArchGeometry(THREE);archGeo.computeBoundingBox();
assert.ok(archGeo.boundingBox.max.z-archGeo.boundingBox.min.z>.8,'arch has a visible side profile');
const arch=new THREE.Mesh(archGeo,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));arch.updateMatrixWorld();
const holeRay=new THREE.Raycaster(new THREE.Vector3(0,.42,4),new THREE.Vector3(0,0,-1));
const pillarRay=new THREE.Raycaster(new THREE.Vector3(1,.3,4),new THREE.Vector3(0,0,-1));
assert.equal(holeRay.intersectObject(arch).length,0,'wide opening remains empty');
assert.ok(pillarRay.intersectObject(arch).length>0,'opening is supported by solid pillars');
archGeo.dispose();arch.material.dispose();
