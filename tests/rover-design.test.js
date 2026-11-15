const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c=vm.createContext({THREE});vm.runInContext(fs.readFileSync(require.resolve('../js/models.js'),'utf8')+'\nthis.Models=Models;',c);
for(const color of [0xff9933,0x303060]){
 const rover=c.Models.playerRover(color),rear=rover.group.getObjectByName('Rover rear trim');assert.ok(rear);
 const lamps=[];rear.traverse(m=>{if(m.name==='Rear lamp')lamps.push(m);});assert.equal(lamps.length,2);assert.equal(lamps[0].position.z,-lamps[1].position.z);
 rear.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(rear);assert.ok(bounds.max.x< -14,'rear trim stays behind the body');assert.ok(bounds.min.y>8,'bumper clears wheels and ground');assert.ok(bounds.max.z-bounds.min.z<=21,'trim stays within existing bumper width');
 const colors=new Set();rear.traverse(m=>{if(m.material)colors.add(m.material.color.getHex());});assert.ok(colors.has(0x1b2a5e));assert.ok(colors.has(0xf5f3ec));assert.ok(colors.has(0xff7867));
 assert.equal(rover.wheels.length,6,'rear styling preserves wheel setup');
}
console.log('Rear contrast across paint colours, lamp symmetry and toy rover clearance passed');
