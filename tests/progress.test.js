const assert = require('node:assert/strict');
const Progress = require('../js/progress.js');
const worlds = {
  moon: {lonMin: -45, lonMax: 45, latMin: -35, latMax: 40, ppd: 120, timeLimit:180, wrap:false, sites:[{id:'a11'},{id:'a14'}], stars:[[],[]]},
  mars: {lonMin: -180, lonMax:180, latMin:-70, latMax:70, ppd:60, timeLimit:300, wrap:true, sites:[{id:'spirit'}], stars:[[]]}
};
const memory = new Map(), storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
const progress=Progress.create(storage,worlds,[{id:'voyager'}]);
const checkpoint=()=>({version:1,world:'moon',rover:{x:100,y:200,h:1},found:['a11'],stars:['moon0'],tasks:['a11'],deep:['voyager'],seen:['a11'],pendingSite:'a11',pendingPhase:'story',pendingDeep:null,clocks:{moon:{left:140,free:false},mars:{left:270,free:true}}});
let count=0;const test=(name,f)=>{f();count++;console.log('ok '+name);};
test('checkpoint round trips without losing collections, clocks or pending story',()=>{assert.equal(progress.save(checkpoint()),true);assert.deepEqual(progress.load(),checkpoint());});
test('unknown ids and duplicate collections are discarded',()=>{const c=checkpoint();c.found.push('a11','fake');c.tasks.push('a14','fake');c.stars.push('mars999');const clean=progress.normalize(c);assert.deepEqual(clean.found,['a11']);assert.deepEqual(clean.tasks,['a11']);assert.deepEqual(clean.stars,['moon0']);});
test('corrupt JSON and unsupported save versions are ignored',()=>{memory.set(Progress.KEY,'{broken');assert.equal(progress.load(),null);memory.set(Progress.KEY,JSON.stringify({...checkpoint(),version:2}));assert.equal(progress.load(),null);});
test('invalid world and non-finite position are rejected',()=>{assert.equal(progress.normalize({...checkpoint(),world:'venus'}),null);assert.equal(progress.normalize({...checkpoint(),rover:{x:Infinity,y:2,h:1}}),null);});
test('coordinates and timers are bounded; Mars wraps east-west',()=>{const c=checkpoint();c.rover={x:-100,y:1e9,h:100};c.clocks.moon.left=-10;let n=progress.normalize(c);assert.equal(n.rover.x,40);assert.equal(n.rover.y,8960);assert.equal(n.clocks.moon.left,0);c.world='mars';n=progress.normalize(c);assert.equal(n.rover.x,21500);assert.equal(n.pendingSite,null);});
test('pending task must belong to discovered site on active world',()=>{const c=checkpoint();c.pendingSite='a14';assert.equal(progress.normalize(c).pendingSite,null);c.pendingSite='spirit';assert.equal(progress.normalize(c).pendingSite,null);});
test('missing clocks safely get default mission times',()=>{const c=checkpoint();delete c.clocks;assert.deepEqual(progress.normalize(c).clocks,{moon:{left:180,free:false},mars:{left:300,free:false}});});
test('unavailable and failing storage never throws or blocks play',()=>{for(const st of [null,{getItem(){throw Error()},setItem(){throw Error()},removeItem(){throw Error()}}]){const p=Progress.create(st,worlds,[]);assert.equal(p.load(),null);assert.equal(p.save(checkpoint()),false);assert.equal(p.clear(),false);}});
test('clearing a new game removes only game progress',()=>{memory.set('gr_color','red');progress.save(checkpoint());assert.equal(progress.clear(),true);assert.equal(progress.load(),null);assert.equal(memory.get('gr_color'),'red');});
test('legacy v1 story checkpoints infer story phase after skip or task completion',()=>{const c=checkpoint();delete c.pendingPhase;c.tasks=[];assert.equal(progress.normalize(c).pendingPhase,'story');c.seen=[];c.tasks=['a11'];assert.equal(progress.normalize(c).pendingPhase,'story');});
test('legacy interrupted tasks remain tasks; invalid pending phases safely infer phase',()=>{const c=checkpoint();delete c.pendingPhase;c.tasks=[];c.seen=[];assert.equal(progress.normalize(c).pendingPhase,'task');c.pendingPhase='invalid';assert.equal(progress.normalize(c).pendingPhase,'task');});
test('explicit pending phase survives round trip and invalid pending site clears both fields',()=>{const c=checkpoint();c.tasks=[];c.pendingPhase='task';assert.equal(progress.save(c),true);assert.equal(progress.load().pendingPhase,'task');c.pendingSite='fake';const n=progress.normalize(c);assert.equal(n.pendingSite,null);assert.equal(n.pendingPhase,null);});
test('current deep-space card persists; unknown or unseen pending deep ids are ignored',()=>{const c=checkpoint();c.pendingDeep='voyager';assert.equal(progress.save(c),true);assert.equal(progress.load().pendingDeep,'voyager');c.deep=[];assert.equal(progress.normalize(c).pendingDeep,null);c.pendingDeep='fake';assert.equal(progress.normalize(c).pendingDeep,null);});
console.log(count+' progress tests passed');
