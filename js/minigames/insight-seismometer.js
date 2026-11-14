/* Ghost Rovers mission task. See js/minigames/core.js for how tasks work. */
// InSight: its robot arm set a seismometer on the ground, then covered it with a dome-shaped shield.
Tasks.add("ins", {
  title: "Place the seismometer!", hint: "Hold to grab, carry it to the glowing spot, and hold to set it down.", world: "mars",
  start(s) { s.xs = [210, 560, 110, 560]; s.ys = [200, 335, 195, 330]; s.py = 200; s.tipY = 200; },
  step(s, dt, inp, T) {
    T.seq(s, s.xs, [1.2, 2.2, 1.2, 2.2], dt, 40); const k = Math.min(s.k || 0, 3); s.py = s.ys[k];
    const lowering = (k === 1 || k === 3) && Math.abs(inp.px - 560) < 60, want = lowering ? 200 + 120 * s.h : 200; s.tipY += (want - s.tipY) * Math.min(1, dt * 8); s.tx = T.clamp(inp.px, 80, 740);
  },
  draw(s, g, T) {
    T.sky(g, "mars"); T.ground(g, 345, "mars");
    const k = s.k || 0;
    [70, 290].forEach(x => { g.beginPath(); g.ellipse(x, 222, 64, 18, 0, 0, 7); T.fin(g, T.C.navy, 3); });
    T.box(g, 80, 210, 200, 26, 8, T.C.white); [110, 250].forEach(x => T.line(g, x, 236, x + (x < 180 ? -14 : 14), 340, 5, T.C.silver));
    const seis = (x, y) => { T.poly(g, [[x - 18, y], [x - 12, y - 18], [x + 12, y - 18], [x + 18, y]], "#d08a3c", 3); T.circ(g, x, y - 18, 6, T.C.gold, 2); };
    const shield = (x, y) => { g.beginPath(); g.ellipse(x, y, 36, 34, 0, Math.PI, 0); g.closePath(); T.fin(g, "#f4f2ea", 3.5); };
    if (k === 0) seis(210, 210); if (k <= 2) shield(110, 210);
    if (k >= 2) seis(560, 342); if (k >= 4) shield(560, 344);
    if (k < 4) T.target(g, s.xs[k], s.ys[k], 24, s.h);
    const sx = 270, sy = 205, tx = s.tx == null ? 400 : s.tx, ey = Math.min(sy, s.tipY) - 80, ex = (sx + tx) / 2;
    T.line(g, sx, sy, ex, ey, 7, T.C.silver); T.line(g, ex, ey, tx, s.tipY, 6, T.C.silver); T.box(g, tx - 8, s.tipY - 4, 16, 10, 3, T.C.mid, 2.5);
    if (k === 1) seis(tx, s.tipY + 26); if (k === 3) shield(tx, s.tipY + 40);
  }
});
