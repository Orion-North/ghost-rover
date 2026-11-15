/* Ghost Rovers mission task. See js/minigames/core.js for how tasks work. */
// Viking 1: its robot arm scooped soil into tiny labs inside the lander to test for life.
Tasks.add("v1", {
  title: "Feed the lab!", hint: "Hold over the soil to scoop, then hold over the lab to pour it in.", world: "mars",
  action: s => (s.carry ? "Pour soil into the lab" : "Scoop soil from the ground") + " · sample " + Math.min(s.n + 1, 2) + " of 2",
  start(s) { Object.assign(s, { n: 0, carry: false, tipY: 230, py: 360 }); },
  step(s, dt, inp, T) {
    if (!s.carry) { s.aimX = 580; if (T.hot(s, "h", 580, 140, 1.6, dt) >= 1) { s.carry = true; s.h = 0; T.sfx("snap"); T.buzz("star"); T.spark(inp.px, 330, "#c0522a", 12); } }
    else { s.aimX = 205; if (T.hot(s, "h", 205, 40, 1.2, dt) >= 1) { s.carry = false; s.h = 0; s.n++; T.sfx("snap"); T.buzz("star"); T.spark(205, 180, T.C.sun, 16); if (s.n >= 2) s.done = true; } }
    s.aimHold = true; s.tx = T.clamp(inp.px, 190, 740);
    const want = s.carry ? (Math.abs(s.tx - 205) < 50 ? 150 : 140) : (inp.hold && s.tx > 420 ? 330 : 240); s.tipY += (want - s.tipY) * Math.min(1, dt * 6);
    s.py = s.carry ? 175 : 362; s.p = Math.max(s.p, (s.n + (s.carry ? .5 : s.h * .5)) / 2);
  },
  draw(s, g, T) {
    T.sky(g, "mars"); T.ground(g, 340, "mars");
    g.fillStyle = "rgba(120,45,20,.35)"; g.beginPath(); g.ellipse(580, 352, 150, 16, 0, 0, 7); g.fill();
    if (!s.carry) T.target(g, 580, 345, 40, s.h); else T.target(g, 205, 180, 22, s.h);
    [[90, 1], [300, 1]].forEach(([x]) => { T.line(g, x, 250, x + (x < 200 ? -30 : 30), 336, 5, T.C.silver); T.box(g, x + (x < 200 ? -44 : 16), 334, 28, 8, 3, T.C.silver, 2.5); });
    T.poly(g, [[70, 210], [320, 210], [340, 232], [320, 254], [70, 254], [50, 232]], T.C.white);
    T.box(g, 180, 186, 50, 24, 5, T.C.gold); T.poly(g, [[184, 186], [226, 186], [215, 172], [195, 172]], T.C.dark, 3);
    T.line(g, 110, 210, 110, 140, 4, T.C.silver); g.save(); g.translate(110, 132); g.rotate(-.5); g.beginPath(); g.ellipse(0, 0, 34, 14, 0, Math.PI, 0); T.fin(g, T.C.white); g.restore();
    const sx = 320, sy = 220, ex = (sx + s.tx) / 2, ey = Math.min(sy, s.tipY) - 70;
    T.line(g, sx, sy, ex, ey, 7, T.C.silver); T.line(g, ex, ey, s.tx, s.tipY, 6, T.C.silver);
    T.box(g, s.tx - 14, s.tipY - 6, 28, 18, 4, T.C.mid, 3); if (s.carry) { g.beginPath(); g.ellipse(s.tx, s.tipY - 4, 14, 7, 0, Math.PI, 0); T.fin(g, "#b9532a", 2.5); }
    T.text(g, "Soil samples: " + s.n + " / 2", 680, 40, 22);
  }
});
