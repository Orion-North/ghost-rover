const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const host = fs.readFileSync(require.resolve("../js/host.js"), "utf8");
const start = host.indexOf("      const target = inp.r");
const code = host.slice(start, host.indexOf("    } else rover.v *=", start));
function step(speed, gas, brake, boosted = false) {
 const c={inp:{g:gas,r:brake},rover:{v:speed,sand:false,boost:boosted?2:0},WD:{maxV:300},top:boosted?465:300,dt:1/60,clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};
 vm.createContext(c); vm.runInContext(code,c); return c.rover.v;
}
assert.ok(step(300,1,1)<300,"brake must override held accelerator");
assert.ok(step(300,1,.2)<300,"light brake must still override accelerator");
assert.ok(step(300,1,1,true)<290,"boost must not weaken braking");
assert.ok(step(0,0,1)<0,"brake reverses from rest");
assert.ok(step(0,.5,0)>0,"analog accelerator still moves forward");
assert.ok(step(0,0,0)===0,"released pedals remain stationary");
assert.ok(step(100,0,0)<100,"coasting slows the rover");
console.log("Driving pedal priority, boost braking, reverse and coast checks passed");
