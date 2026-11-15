const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm"), path = require("node:path");
const root = path.join(__dirname, "..");
const host = fs.readFileSync(path.join(root, "js/host.js"), "utf8");
const events = {}, calls = [], input = { mouseHold: true, hold: true, press: true, x: 1 };
const context = vm.createContext({ keys: { w: true, arrowleft: true }, kbSteer: -1, rover: { steer: -1 }, taskPulse: .3,
  pad: {}, Tasks: { inp: input }, mode: "task", stopReading: () => calls.push("speech stopped"),
  openPause: () => calls.push("paused"), addEventListener: (n, f) => events[n] = f,
  document: { hidden: false, addEventListener: (n, f) => events[n] = f } });
vm.runInContext(host.slice(host.indexOf("  function clearHeldInput()"), host.indexOf('  addEventListener("pointerdown"')), context);
events.blur();
assert.equal(Object.keys(context.keys).length, 0); assert.equal(context.kbSteer, 0);
assert.equal(context.rover.steer, 0); assert.equal(context.taskPulse, 0); assert.equal(context.pad, null);
assert.equal(input.mouseHold, false); assert.equal(input.hold, false);
assert.deepEqual(calls, ["speech stopped", "paused"]);
calls.length = 0; context.mode = "count"; context.document.hidden = true; events.visibilitychange();
assert.ok(calls.includes("paused"), "hiding the page during countdown pauses");
calls.length = 0; context.mode = "card"; events.blur();
assert.equal(calls.includes("paused"), false, "reading a card must not switch to a driving pause");

// Exercise every real task through its assistance path, including its completion callback.
const nodes = new Map();
const canvasContext = { createLinearGradient: () => ({ addColorStop() {} }), fillRect() {}, beginPath() {}, ellipse() {}, fill() {}, stroke() {} };
function node(selector) {
  if (!nodes.has(selector)) nodes.set(selector, { style: {}, classList: { add() {}, remove() {} }, setAttribute() {},
    addEventListener() {}, getContext: () => canvasContext, querySelector: node });
  return nodes.get(selector);
}
const taskContext = vm.createContext({ document: { createElement: () => node("task"), getElementById: () => ({ appendChild() {} }) }, Math, Preferences: { reducedMotion: true } });
vm.runInContext(fs.readFileSync(path.join(root, "js/minigames/core.js"), "utf8") + "\nthis.tasks = Tasks;", taskContext);
for (const file of fs.readdirSync(path.join(root, "js/minigames")).filter(f => f.endsWith(".js") && f !== "core.js")) vm.runInContext(fs.readFileSync(path.join(root, "js/minigames", file), "utf8"), taskContext);
for (const id of taskContext.tasks.ids()) {
  let result = null; taskContext.tasks.start(id, { onEnd: ok => result = ok });
  for (let frame = 0; taskContext.tasks.active() && frame < 3600; frame++) taskContext.tasks.step(1 / 60, {}, true);
  assert.equal(result, true, id + " must finish with assistance instead of trapping the player");
}
let skipped = null; taskContext.tasks.start("a11", { onEnd: ok => skipped = ok }); taskContext.tasks.skip();
assert.equal(skipped, false); assert.equal(taskContext.tasks.active(), false);
taskContext.tasks.add("completed-test", { title: "Complete", start() {}, step(s) { s.done = true; }, draw() {} });
let earned = null; taskContext.tasks.start("completed-test", { onEnd: ok => earned = ok });
taskContext.tasks.step(1 / 60, {}, true);
assert.equal(taskContext.tasks.state().done, true);
taskContext.tasks.skip();
assert.equal(earned, true, "Skip/Escape during the success celebration preserves the completed task reward");
assert.equal(taskContext.tasks.active(), false);
console.log("Input-loss safety, all 14 task assistance paths, and task skip checks passed");
