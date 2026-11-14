/* Tests for js/gamepad.js using a fake controller (no real hardware needed).
   Run with:  node tests/gamepad.test.js                                      */
const assert = require("assert");
const calls = [];
function fakePad(o = {}) { // a pretend DualSense in the browser's "standard" layout
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
  for (const [i, v] of Object.entries(o.buttons || {})) buttons[i] = { pressed: v > .5, value: v };
  return { connected: true, mapping: o.mapping === undefined ? "standard" : o.mapping, axes: o.axes || [0, 0, 0, 0], buttons,
    vibrationActuator: o.noRumble ? undefined : { playEffect: (type, p) => { calls.push([type, p]); return Promise.resolve(); } } };
}
let pads = [];
Object.defineProperty(globalThis, "navigator", { value: { getGamepads: () => pads }, configurable: true });
const Pad = require("../js/gamepad.js");
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, a + " should be " + b);
let n = 0; const test = (name, fn) => { fn(); n++; console.log("ok  " + name); };

test("no controller gives null", () => { pads = [null, null]; assert.strictEqual(Pad.poll(), null); assert.strictEqual(Pad.connected, false); });
test("stick inside the deadzone does not steer", () => { for (const v of [0, .05, -.1, .149]) assert.strictEqual(Pad.read(fakePad({ axes: [v] }), {}).steer, 0); });
test("stick outside the deadzone steers smoothly up to full", () => {
  near(Pad.read(fakePad({ axes: [1] }), {}).steer, 1); near(Pad.read(fakePad({ axes: [-1] }), {}).steer, -1);
  near(Pad.read(fakePad({ axes: [.575] }), {}).steer, .5); assert.ok(Pad.read(fakePad({ axes: [.16] }), {}).steer < .02);
});
test("R2 and L2 are analog", () => {
  const s = Pad.read(fakePad({ buttons: { 7: .3, 6: .8 } }), {}); near(s.gas, .3); near(s.brake, .8);
  near(Pad.read(fakePad({ buttons: { 7: 1 } }), {}).gas, 1); assert.strictEqual(Pad.read(fakePad({ buttons: { 7: .02 } }), {}).gas, 0);
});
test("triggers never count as button presses", () => assert.deepStrictEqual(Pad.read(fakePad({ buttons: { 7: 1, 6: 1 } }), {}).pressed, []));
test("each face button maps to the right name", () => {
  const map = { 0: "cross", 1: "circle", 2: "square", 3: "triangle", 9: "options", 14: "left", 15: "right" };
  for (const [i, name] of Object.entries(map)) assert.deepStrictEqual(Pad.read(fakePad({ buttons: { [i]: 1 } }), {}).pressed, [name]);
});
test("a held button only fires once, and fires again after release", () => {
  pads = [fakePad({ buttons: { 0: 1 } })]; assert.deepStrictEqual(Pad.poll().pressed, ["cross"]);
  assert.deepStrictEqual(Pad.poll().pressed, []); assert.deepStrictEqual(Pad.poll().pressed, []);
  pads = [fakePad()]; Pad.poll(); pads = [fakePad({ buttons: { 0: 1 } })]; assert.deepStrictEqual(Pad.poll().pressed, ["cross"]);
});
test("idle controller is not 'active', a used one is", () => { assert.strictEqual(Pad.read(fakePad(), {}).active, false); assert.strictEqual(Pad.read(fakePad({ buttons: { 7: .5 } }), {}).active, true); });
test("a standard-layout controller is preferred over another one", () => { const a = fakePad({ mapping: "" }), b = fakePad(); assert.strictEqual(Pad.pick([null, a, b]), b); assert.strictEqual(Pad.pick([a]), a); });
test("rumble plays the right effects", () => {
  pads = [fakePad()]; Pad.poll(); calls.length = 0;
  Pad.rumble("signal"); Pad.rumble("star"); assert.strictEqual(calls.length, 2); assert.strictEqual(calls[0][0], "dual-rumble");
  assert.ok(calls[0][1].weakMagnitude < Pad.EFFECTS.found[0].weak, "signal pulse is softer than the found pulse");
  assert.ok(calls[1][1].duration < calls[0][1].duration, "star bump is shorter than the signal pulse");
  assert.strictEqual(Pad.EFFECTS.found.length, 2, "found is a double pulse");
});
test("rumble is silently skipped when unsupported or disconnected", () => {
  pads = [fakePad({ noRumble: true })]; Pad.poll(); calls.length = 0; Pad.rumble("found"); Pad.rumble("nonsense"); assert.strictEqual(calls.length, 0);
  pads = [{ connected: true, mapping: "standard", axes: [0], buttons: [], vibrationActuator: { playEffect() { throw new Error("nope"); } } }]; Pad.poll(); Pad.rumble("signal");
  pads = []; Pad.poll(); Pad.rumble("star");
});
test("lights do nothing without WebHID", async () => { assert.strictEqual(Pad.lights.supported, false); });
Pad.lights.color(1, 2, 3).then(ok => { assert.strictEqual(ok, false); console.log("ok  lightbar colour without a device returns false\n" + (n + 1) + " tests passed"); });
