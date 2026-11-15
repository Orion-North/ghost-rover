/* Exercise real task drawing and scripted controls. This checks Canvas API
   arguments and drawing state; visual layout still needs browser inspection. */
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm"), path = require("node:path");
const root = path.join(__dirname, "..");
let drawingCalls = 0, seed = 12345;
const seededMath = Object.create(Math);
seededMath.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
function context2d() {
  let depth = 0;
  const gradient = { addColorStop(at) { assert.ok(Number.isFinite(at) && at >= 0 && at <= 1); } };
  const methods = new Set(["setTransform", "clearRect", "save", "restore", "fillRect", "beginPath", "arc", "ellipse", "fill", "stroke", "moveTo", "lineTo", "closePath", "quadraticCurveTo", "roundRect", "rect", "translate", "rotate", "scale", "setLineDash", "strokeText", "fillText", "clip", "drawImage", "createLinearGradient", "createRadialGradient"]);
  return new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      assert.ok(methods.has(key), "unexpected Canvas API: " + key);
      return (...args) => {
        drawingCalls++;
        for (const arg of args) if (typeof arg === "number") assert.ok(Number.isFinite(arg), key + " has a nonfinite coordinate");
        if (key === "arc") assert.ok(args[2] >= 0, "negative arc radius");
        if (key === "ellipse") assert.ok(args[2] >= 0 && args[3] >= 0, "negative ellipse radius");
        if (key === "save") depth++;
        if (key === "restore") assert.ok(--depth >= 0, "unbalanced restore");
        if (key.startsWith("create")) return gradient;
      };
    },
    set(target, key, value) {
      if (key === "globalAlpha") assert.ok(Number.isFinite(value) && value >= 0 && value <= 1, "invalid alpha");
      target[key] = value; return true;
    }
  });
}
const nodes = new Map();
function node(selector) {
  if (!nodes.has(selector)) nodes.set(selector, { style: {}, classList: { add() {}, remove() {} }, setAttribute() {}, addEventListener() {},
    getContext: () => context2d(), querySelector: node });
  return nodes.get(selector);
}
const ctx = vm.createContext({ document: { createElement: () => node("task"), getElementById: () => ({ appendChild() {} }) }, Math: seededMath, Preferences: { reducedMotion: false } });
vm.runInContext(fs.readFileSync(path.join(root, "js/minigames/core.js"), "utf8") + "\nthis.tasks = Tasks;", ctx);
for (const file of fs.readdirSync(path.join(root, "js/minigames")).filter(f => f.endsWith(".js") && f !== "core.js")) vm.runInContext(fs.readFileSync(path.join(root, "js/minigames", file), "utf8"), ctx);
const completed = [], incomplete = [];
for (const id of ctx.tasks.ids()) {
  let result = null; ctx.tasks.start(id, { onEnd: ok => result = ok });
  for (let frame = 0; ctx.tasks.active() && frame < 1800; frame++) {
    const s = ctx.tasks.state(), aim = s.aimX === undefined ? 400 : s.aimX;
    const steer = Math.max(-1, Math.min(1, (aim - ctx.tasks.inp.px) / (520 / 60)));
    try { ctx.tasks.step(1 / 60, { x: steer, hold: !!s.aimHold }); }
    catch (error) { throw new Error(id + ": " + error.message, { cause: error }); }
  }
  if (result === true) completed.push(id); else { incomplete.push(id); ctx.tasks.skip(); }
}
assert.equal(incomplete.length, 0, "scripted controls must finish before assistance: " + incomplete.join(", "));
console.log(completed.length + " task drawings and natural control paths passed (" + drawingCalls + " Canvas calls)");
