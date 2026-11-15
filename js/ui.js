/* Shared menu focus and keyboard behavior. Driving and mission tasks keep their
   existing controls; native buttons remain usable with Tab, Enter and Space. */
const GameUI = (() => {
  const visible = el => !!el && !el.disabled && !el.closest(".hidden,[inert]") && el.offsetParent !== null;
  const buttons = overlay => overlay ? [...overlay.querySelectorAll("button, input, select, textarea, a[href], [tabindex='0']")].filter(visible) : [];
  function activateFocused(overlay, fallback, doc = document) {
    const focused = doc.activeElement;
    if (focused && (!overlay || overlay.contains(focused)) && focused.tagName === "BUTTON") {
      if (visible(focused)) focused.click();
      return;
    }
    fallback();
  }
  function nextFocus(overlay, dir, doc = document) {
    const list = buttons(overlay); if (!list.length) return null;
    const old = list.indexOf(doc.activeElement);
    return list[old < 0 ? (dir > 0 ? 0 : list.length - 1) : (old + dir + list.length) % list.length];
  }
  function setup(root, currentOverlay) {
    let active = null; const returns = new Map(), trail = [];
    const defaults = { lobby: "kbStart", pause: "pauseResume", howto: "howClose", book: "bookClose", card: "cardNext", report: "reportKeep", newGameConfirm: "newGameCancel" };
    function sync() {
      const next = currentOverlay();
      for (const child of root.children) child.inert = !!next && child !== next;
      if (next === active) return;
      const previous = active, focused = document.activeElement;
      if (next) {
        const earlier = trail.indexOf(next);
        if (earlier < 0) { returns.set(next, focused); trail.push(next); }
        else trail.splice(earlier + 1);
      } else trail.length = 0;
      active = next;
      if (next) {
        next.setAttribute("role", "dialog"); next.setAttribute("aria-modal", "true"); next.tabIndex = -1;
        const heading = next.querySelector("h1,h2");
        if (heading) { if (!heading.id) heading.id = next.id + "Heading"; next.setAttribute("aria-labelledby", heading.id); }
      }
      const oldOpener = previous && returns.get(previous);
      // The sticker grid can be rebuilt after earning a task; restore its matching button.
      const restore = oldOpener && (oldOpener.isConnected ? oldOpener : document.getElementById(oldOpener.id));
      if (restore && restore.isConnected && visible(restore) && (!next || next.contains(restore))) {
        restore.focus({ preventScroll: true });
        if (restore.scrollIntoView) restore.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
      else if (next) {
        const preferred = next.id === "lobby" && visible(document.getElementById("continueBtn")) ? document.getElementById("continueBtn") : document.getElementById(defaults[next.id]);
        // Long story cards begin at their heading; don't focus an offscreen action.
        const target = next.id === "task" || next.id === "card" || next.id === "book" ? next : visible(preferred) ? preferred : buttons(next)[0] || next;
        target.focus({ preventScroll: true });
      } else {
        // Start the next Tab cycle before the HUD, not after the now-hidden lobby.
        const game = document.getElementById("game");
        if (game && game.focus) game.focus({ preventScroll: true });
      }
    }
    document.addEventListener("keydown", e => {
      const overlay = currentOverlay(); if (!overlay || e.key !== "Tab") return;
      const list = buttons(overlay), first = list[0], last = list[list.length - 1], focused = document.activeElement;
      if (!list.length) { e.preventDefault(); overlay.focus(); }
      else if (e.shiftKey && (focused === first || !list.includes(focused))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (focused === last || !list.includes(focused))) { e.preventDefault(); first.focus(); }
    });
    document.addEventListener("focusin", e => {
      const overlay = currentOverlay();
      if (overlay && !overlay.contains(e.target)) (buttons(overlay)[0] || overlay).focus({ preventScroll: true });
    });
    new MutationObserver(sync).observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "disabled"] });
    sync();
    return { sync };
  }
  return { visible, buttons, activateFocused, nextFocus, setup };
})();
if (typeof module !== "undefined") module.exports = GameUI;
