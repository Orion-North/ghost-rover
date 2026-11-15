/* Local reading preference. Animation is always enabled. */
const Preferences = (() => {
  const listeners = new Set();
  let readingDelay = true;
  try { readingDelay = localStorage.getItem("gr_readingDelay") !== "0"; } catch (_) { }
  function paint() {
    document.querySelectorAll('[data-preference="readingDelay"]').forEach(b => {
      b.textContent = "Reading pause: " + (readingDelay ? "On" : "Off");
      b.setAttribute("aria-pressed", String(readingDelay));
    });
  }
  function set(key, value) {
    if (key !== "readingDelay") return;
    readingDelay = !!value;
    try { localStorage.setItem("gr_readingDelay", readingDelay ? "1" : "0"); } catch (_) { }
    paint(); listeners.forEach(fn => fn(key));
  }
  ["lobbySettings", "pauseSettings"].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    el.classList.add("comfort-settings"); el.setAttribute("aria-label", "Reading settings");
    const b = document.createElement("button"); b.className = "btn alt"; b.dataset.preference = "readingDelay";
    b.title = "Wait five seconds on new story cards";
    b.onclick = () => set("readingDelay", !readingDelay); el.appendChild(b);
  });
  paint();
  return { get readingDelay() { return readingDelay; }, set,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
})();
