/* =====================================================================
   GHOST ROVERS · GAME CONTROLLER (PlayStation DualSense and similar)
   All controller code lives here. The game calls Pad.poll() once a frame.

   Uses the browser Gamepad API with the "standard" button layout:
     left stick  steer            R2  drive (analog)       L2  brake / reverse (analog)
     Cross  next                  Circle  back / close     Triangle  read aloud
     Square  sticker book         Options  Moon <-> Mars   D-pad  move between buttons

   Nothing here touches the phone or keyboard code.
   ===================================================================== */
const Pad = (() => {
  const DEADZONE = .15;
  const BTN = { cross: 0, circle: 1, square: 2, triangle: 3, l2: 6, r2: 7, options: 9, up: 12, down: 13, left: 14, right: 15 };
  let prevDown = {}, current = null;

  // stick: ignore tiny movements so the rover doesn't drift, then stretch the rest back to -1..1
  function stick(v) { const a = Math.abs(v || 0); return a < DEADZONE ? 0 : Math.sign(v) * Math.min(1, (a - DEADZONE) / (1 - DEADZONE)); }
  const trigger = v => v < .04 ? 0 : Math.min(1, v);
  function value(gp, i) { const b = gp.buttons && gp.buttons[i]; if (b == null) return 0; if (typeof b === "number") return b; return b.value || (b.pressed ? 1 : 0); }

  // Turn one gamepad snapshot into what the game needs. "was" is which buttons were down last frame,
  // so a held button only counts as pressed once. This function has no side effects, so tests can call it directly.
  function read(gp, was) {
    const down = {}, pressed = [];
    for (const k in BTN) { down[k] = value(gp, BTN[k]) > .5; if (down[k] && !(was && was[k]) && k !== "l2" && k !== "r2") pressed.push(k); }
    const steer = stick(gp.axes && gp.axes[0]), gas = trigger(value(gp, BTN.r2)), brake = trigger(value(gp, BTN.l2));
    return { steer, gas, brake, down, pressed, active: steer !== 0 || gas > 0 || brake > 0 || pressed.length > 0 };
  }
  // choose the controller to listen to: one with the standard layout if there is one
  function pick(list) { let other = null; for (const g of list || []) { if (!g || g.connected === false) continue; if (g.mapping === "standard") return g; other = other || g; } return other; }

  function poll() {
    let list = []; try { list = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { }
    const gp = pick(list); current = gp;
    if (!gp) { prevDown = {}; return null; }
    const s = read(gp, prevDown); prevDown = s.down; return s;
  }

  // ---- rumble: quietly does nothing where the browser or controller can't do it ----
  const EFFECTS = {
    signal: [{ at: 0, ms: 110, weak: .35, strong: .12 }],                                   // soft short pulse
    found: [{ at: 0, ms: 170, weak: .8, strong: 1 }, { at: 280, ms: 220, weak: .8, strong: 1 }], // stronger double pulse
    star: [{ at: 0, ms: 55, weak: .45, strong: 0 }]                                          // tiny bump
  };
  function pulse(p) {
    try {
      const gp = current, act = gp && gp.vibrationActuator; if (!act || !act.playEffect) return;
      const r = act.playEffect("dual-rumble", { startDelay: 0, duration: p.ms, weakMagnitude: p.weak, strongMagnitude: p.strong });
      if (r && r.catch) r.catch(() => { });
    } catch (e) { }
  }
  function rumble(kind) { (EFFECTS[kind] || []).forEach(p => p.at ? setTimeout(() => pulse(p), p.at) : pulse(p)); }

  // ---- optional extra: DualSense lightbar colour through WebHID (Chrome / Edge, USB cable only) ----
  // The game never needs this. Every step is wrapped so a failure changes nothing else.
  const lights = {
    device: null,
    get supported() { return typeof navigator !== "undefined" && !!navigator.hid; },
    async connect() {
      try {
        const got = await navigator.hid.requestDevice({ filters: [{ vendorId: 0x054c, productId: 0x0ce6 }, { vendorId: 0x054c, productId: 0x0df2 }] });
        if (!got || !got[0]) return false;
        if (!got[0].opened) await got[0].open();
        lights.device = got[0]; return true;
      } catch (e) { return false; }
    },
    async color(r, g, b) {
      const d = lights.device; if (!d || !d.opened) return false;
      try {
        const data = new Uint8Array(47); data[1] = 0x04;           // "change the lightbar colour" and nothing else
        data[44] = r; data[45] = g; data[46] = b;
        await d.sendReport(0x02, data); return true;
      } catch (e) { return false; }
    }
  };

  return { poll, read, pick, stick, rumble, lights, BTN, DEADZONE, EFFECTS, get connected() { return !!current; } };
})();
if (typeof module !== "undefined") module.exports = Pad;
