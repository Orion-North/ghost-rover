/* Focus regression checks without a browser or a controller. */
const assert = require("assert");
const UI = require("../js/ui.js");
const events = {}, elements = new Map();
global.document = { activeElement: null, getElementById: id => elements.get(id), addEventListener: (name, fn) => events[name] = fn };
let sync;
global.MutationObserver = class { constructor(fn) { sync = fn; } observe() {} };
function button(id, disabled = false) {
  const b = { id, tagName: "BUTTON", disabled, offsetParent: {}, isConnected: true, clicks: 0,
    closest: () => null, scrollIntoView(options) { this.revealed = options.block; }, click() { this.clicks++; }, focus() { document.activeElement = this; } };
  elements.set(id, b); return b;
}
function overlay(id, controls) {
  const el = { id, controls, offsetParent: {}, isConnected: true, inert: false,
    contains: target => target === el || controls.includes(target),
    querySelectorAll: () => controls, querySelector: () => null,
    setAttribute(name, value) { this[name] = value; },
    focus() { document.activeElement = this; } };
  elements.set(id, el); return el;
}
const resume = button("pauseResume"), mars = button("pauseWorld"), disabled = button("locked", true);
const pause = overlay("pause", [resume, disabled, mars]);
document.activeElement = mars;
let fallback = 0;
UI.activateFocused(pause, () => fallback++);
assert.equal(mars.clicks, 1, "Enter activates the Tab-focused world button");
assert.equal(fallback, 0, "Enter must not accidentally resume instead");
document.activeElement = disabled;
UI.activateFocused(pause, () => fallback++);
assert.equal(disabled.clicks, 0); assert.equal(fallback, 0, "a disabled focused button must not trigger the fallback");
document.activeElement = resume;
assert.equal(UI.nextFocus(pause, 1), mars, "arrows skip disabled buttons");
document.activeElement = mars;
assert.equal(UI.nextFocus(pause, 1), resume, "arrows wrap");
assert.equal(UI.nextFocus(pause, -1), resume);
const outside = button("pauseBtn"), close = button("bookClose"), sticker = button("sticker"), read = button("cardRead");
document.activeElement = outside;
UI.activateFocused(null, () => fallback++);
assert.equal(outside.clicks, 1, "Tab-focused HUD buttons activate with no dialog open");
assert.equal(fallback, 0);
const concealed = button("hiddenHUD"); concealed.closest = () => ({});
document.activeElement = concealed; UI.activateFocused(null, () => fallback++);
assert.equal(concealed.clicks, 0, "hidden or inert HUD controls cannot activate");
const book = overlay("book", [close, sticker]), card = overlay("card", [disabled, read]);
const canvas = { inert: false }, root = { children: [canvas, outside, pause, book, card] };
let current = null; document.activeElement = outside;
UI.setup(root, () => current);
current = pause; sync();
assert.equal(document.activeElement, resume, "pause moves focus to Resume");
assert.equal(pause.role, "dialog"); assert.equal(pause["aria-modal"], "true");
assert.equal(canvas.inert, true, "background controls are inert while a dialog is open");
assert.equal(pause.inert, false);
document.activeElement = mars;
let prevented = false;
events.keydown({ key: "Tab", shiftKey: false, preventDefault() { prevented = true; } });
assert.equal(prevented, true); assert.equal(document.activeElement, resume, "Tab stays inside the active dialog");
current = null; sync();
assert.equal(document.activeElement, outside, "closing a dialog restores its opener");
assert.equal(canvas.inert, false);
current = book; sync(); document.activeElement = sticker;
current = card; sync(); assert.equal(document.activeElement, card, "long stories start at the dialog instead of an offscreen action");
current = book; sync(); assert.equal(document.activeElement, sticker, "returning from a story restores its sticker");
document.activeElement = sticker; current = card; sync();
sticker.isConnected = false;
const rebuiltSticker = button("sticker"); book.controls[1] = rebuiltSticker;
current = book; sync(); assert.equal(document.activeElement, rebuiltSticker, "rebuilt sticker grids restore the matching opener");
assert.equal(rebuiltSticker.revealed, "nearest", "restored stickers remain in view after rebuilding a scrolled book");
const skip = button("taskSkip"), task = overlay("task", [skip]); root.children.push(task);
current = task; sync(); assert.equal(document.activeElement, task, "opening a task must not focus Skip and turn a grab into a skip");
UI.activateFocused(task, () => fallback++);
assert.equal(fallback, 1, "Enter on the task canvas remains a grab");
console.log("UI focus and keyboard regression checks passed");
