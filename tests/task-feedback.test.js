/* Actual task state, current-action UI, focus knob drawing and assistance cues. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..'), nodes = new Map(), arcs = [], texts = [];
const gradient = { addColorStop() {} };
const drawing = new Proxy({}, { get(o, k) { if (k in o) return o[k]; return (...a) => { if (k === 'arc') arcs.push(a); if (k === 'fillText') texts.push(a[0]); if (k.startsWith('create')) return gradient; }; }, set(o,k,v) { o[k] = v; return true; } });
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { style: {}, textContent: '', attributes: {}, events: {}, classList: { add() {}, remove() {} },
    setAttribute(k,v) { this.attributes[k] = v; }, addEventListener(k,f) { this.events[k] = f; }, querySelector: node,
    getContext: () => drawing, getBoundingClientRect: () => ({left:0,width:800}) });
  return nodes.get(id);
}
const ctx = vm.createContext({ Math, document: { createElement: () => node('task'), getElementById: () => ({appendChild(){}}) } });
vm.runInContext(fs.readFileSync(path.join(root, 'js/minigames/core.js'), 'utf8') + '\nthis.tasks=Tasks;', ctx);
for (const f of fs.readdirSync(path.join(root, 'js/minigames')).filter(f => f.endsWith('.js') && f !== 'core.js')) vm.runInContext(fs.readFileSync(path.join(root, 'js/minigames', f), 'utf8'), ctx);
const tasks = ctx.tasks, text = id => node(id).textContent;
for (const id of tasks.ids()) { tasks.start(id); assert.ok(text('#taskAction').length > 10); assert.ok(!text('#taskAction').includes('Follow the glowing target'), id+' needs a specific action'); tasks.skip(); }

tasks.start('soj'); assert.match(text('#taskAction'), /Shrink the airbags · 1 of 3/);
tasks.inp.px=100; tasks.step(.02,{},true); assert.match(text('#taskAction'), /Move to the glowing spot/);
tasks.inp.px=400; tasks.step(.02,{},true); assert.match(text('#taskAction'), /Aligned — hold to work/);
tasks.step(.02,{hold:true},true); assert.match(text('#taskAction'), /Holding/);
for(let i=0;i<150;i++)tasks.step(.02,{hold:true},true);
assert.match(text('#taskAction'), /Lower the ramp · 2 of 3/); tasks.skip();

tasks.start('v2');
assert.equal(text('#taskAction'),'Adjust focus','initial focus action avoids repeating the steering hint');
node('#taskCv').events.pointermove({clientX:350}); tasks.step(.01,{},false);
assert.equal(tasks.inp.px,350); assert.ok(arcs.some(a=>a[0]===350 && a[1]===392 && a[2]===17), 'focus knob tracks the same canvas x coordinate as the pointer');
node('#taskCv').events.pointermove({clientX:900}); assert.equal(tasks.inp.px,700,'mouse cannot move focus beyond visible track');
tasks.step(1,{x:-1},true); tasks.step(1,{x:-1},true); assert.equal(tasks.inp.px,100,'keyboard cannot move focus beyond visible track');
const s=tasks.state(); tasks.inp.px=s.fx; tasks.step(.5,{},false); assert.match(text('#taskAction'),/Focus locked · Keep steady/); assert.ok(texts.includes('LOCK'));
const best=s.p, lock=s.lock; tasks.inp.px=100;tasks.step(.1,{},true);assert.ok(s.lock<lock);assert.equal(s.p,best);assert.match(text('#taskProgressText'),/^Mission progress/); tasks.skip();

// Brief alignment crossings do not generate repeated spoken status changes.
tasks.start('v2');const focus=tasks.state();tasks.inp.px=focus.fx;tasks.step(.2,{},true);assert.equal(text('#taskAnnounce'),'');
tasks.inp.px=100;tasks.step(.2,{},true);tasks.inp.px=focus.fx;tasks.step(.2,{},true);assert.equal(text('#taskAnnounce'),'');
tasks.step(.5,{},true);assert.match(text('#taskAnnounce'),/Focus locked/);tasks.skip();

tasks.start('s3');
for(let i=0;i<601;i++)tasks.step(.05,{hold:true},true);
assert.match(text('#taskAssist'),/Helping hands · targets are easier/);
for(let i=0;i<201;i++)tasks.step(.05,{hold:true},true);
assert.match(text('#taskAssist'),/finishing together/);tasks.skip();
tasks.start('a15');assert.equal(text('#taskAssist'),'','a new task clears an old assistance cue');
console.log('Specific task actions, aligned/holding feedback, staged labels, focus knob/input bounds, lock labeling and assistance cues passed');
