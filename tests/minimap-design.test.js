/* Real marker layout and boundary calculations, independent of Canvas pixels. */
const assert=require('node:assert/strict'), fs=require('node:fs'),vm=require('node:vm');
const host=fs.readFileSync(require.resolve('../js/host.js'),'utf8'),c=vm.createContext({Math});
vm.runInContext(host.slice(host.indexOf('  function layoutMiniSignals('),host.indexOf('  function drawMiniBoundary(')),c);
function signal(id,a,d=200,out=true){return {s:{id},p:{a,d,out,X:150+Math.cos(a)*(out?110:d),Y:150+Math.sin(a)*(out?110:d)}};}
const input=[signal('near',Math.PI,150),signal('a',Math.PI+.01),signal('b',Math.PI+.035),signal('c',-.9),signal('d',-.91),signal('inside',0,30,false)],before=JSON.stringify(input);
const layout=c.layoutMiniSignals(input,150,110,25,'near');
assert.equal(JSON.stringify(input),before,'layout cannot mutate world marker projections');
assert.equal(layout.reduce((n,x)=>n+x.count,0),input.length,'bundles retain every signal');
assert.equal(layout.length,4,'near signal stays separate while nearby distant signals bundle');
const near=layout.find(x=>x.s.id==='near');assert.equal(near.count,1);assert.equal(near.p.X,input[0].p.X);assert.equal(near.p.Y,input[0].p.Y);
assert.equal(layout.at(-1).s.id,'near','nearest signal draws above the other markers');
for(const item of layout.filter(x=>x.p.out&&x!==near))assert.ok(Math.hypot(item.p.X-near.p.X,item.p.Y-near.p.Y)>=24.99,'bundles leave room around the nearest target');
assert.equal(JSON.stringify(layout),JSON.stringify(c.layoutMiniSignals(input,150,110,25,'near')),'layout does not jitter between frames');
const wrap=c.layoutMiniSignals([signal('a',Math.PI-.01),signal('b',-Math.PI+.01)],150,110,25,null);assert.equal(wrap.length,1,'bundling works across the angle seam');
assert.equal(c.layoutMiniSignals([],150,110,25,null).length,0);
assert.equal(c.miniBoundarySegments(150,300,.1,500,1500,1000,3000,true).length,0,'no hatching inside a wrapping world');
const south=c.miniBoundarySegments(150,300,.1,500,2800,1000,3000,true);assert.equal(south.length,1);assert.equal(south[0][1],170);assert.equal(south[0][5],170,'hatch lies beyond the southern boundary');
assert.equal(c.miniBoundarySegments(150,300,.1,40,1500,1000,3000,false).length,2,'bounded world shows left and right edges when visible');
console.log('Minimap bundles, nearest-target position, angle seam, deterministic layout and boundary placement passed');
