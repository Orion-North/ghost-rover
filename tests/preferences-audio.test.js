const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const load = file => fs.readFileSync(path.join(__dirname, "../js", file), "utf8");

// Reading preferences persist; old motion saves and OS settings cannot disable animation.
const saved = new Map([["gr_reducedMotion", "1"]]), buttons = [], roots = new Map();
const document = { querySelectorAll() { return buttons; },
  createElement() { return { dataset: {}, setAttribute(k,v) { this[k]=v; } }; },
  getElementById(id) { if (!roots.has(id)) roots.set(id, { classList: {add(){}}, setAttribute(){}, appendChild(b){ buttons.push(b); } }); return roots.get(id); } };
let mediaReads = 0;
const context = vm.createContext({ document, matchMedia() { mediaReads++; return {matches:true}; },
  localStorage: { getItem: k => saved.has(k) ? saved.get(k) : null, setItem: (k,v) => saved.set(k,v) } });
vm.runInContext(load("preferences.js") + "\nthis.prefs = Preferences;", context);
assert.equal(mediaReads,0);
assert.equal('reducedMotion' in context.prefs,false);
assert.equal(buttons.length,2);
assert.ok(buttons.every(b=>b.dataset.preference==='readingDelay'));
assert.equal(context.prefs.readingDelay,true);
let notifications=0; context.prefs.subscribe(()=>notifications++);
buttons[0].onclick();
assert.equal(context.prefs.readingDelay,false);
assert.equal(saved.get('gr_readingDelay'),'0');
assert.ok(buttons.every(b=>b['aria-pressed']==='false'));
context.prefs.set('reducedMotion',true); assert.equal(notifications,1);
const unavailable = vm.createContext({ document: {querySelectorAll(){return[];},getElementById(){return null;}}, localStorage: {getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}} });
vm.runInContext(load('preferences.js') + "\nPreferences.set('readingDelay', false);",unavailable);

// Narration ducks only music, restores its level, and works before audio init.
const gains = []; let scheduled; let oscillators = 0;
class AudioContext {
  constructor() { this.currentTime = 1; this.destination = {}; this.state = "running"; }
  createGain() { const gain = { value: 0, setTargetAtTime(value) { this.value = value; }, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }; gains.push(gain); return { gain, connect() {} }; }
  createOscillator() { oscillators++; return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
  createBiquadFilter() { return { frequency: {}, connect() {} }; }
}
const audio = vm.createContext({ window: { AudioContext }, setInterval(fn) { scheduled = fn; return 1; }, clearInterval() {} });
vm.runInContext(load("audio.js") + "\nthis.sfx = Sfx;", audio);
audio.sfx.narration(true); audio.sfx.init(); assert.equal(gains[1].value, .1);
audio.sfx.narration(false); assert.equal(gains[1].value, .5);
assert.equal(gains[0].value, 1);
audio.sfx.music("moon"); scheduled();
// A long audio-clock gap must not produce a burst of missed notes.
nodeAudioClockCheck();
function nodeAudioClockCheck() {
  // The stub captures the current context to simulate browser background throttling.
  const text = load("audio.js").replace("ac = new AC();", "ac = new AC(); window.testContext = ac;");
  const second = vm.createContext({ window: { AudioContext }, setInterval(fn) { scheduled = fn; return 1; }, clearInterval() {} });
  vm.runInContext(text + "\nSfx.init(); Sfx.music('moon');", second);
  second.window.testContext.currentTime = 1000; oscillators = 0; scheduled();
  assert.ok(oscillators < 10, "background resume should schedule only current notes");
}
console.log("Preferences persistence, unavailable storage, narration ducking and background audio checks passed");
