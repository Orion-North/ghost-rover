/* Ghost Rovers mission task. See js/minigames/core.js for how tasks work. */
// Ingenuity: the first powered, controlled flight on another planet, in air about 1% as thick as Earth's.
Tasks.add("ing", {
  title: "First flight!", hint: "Hold to lift off in the thin air. Fly through the glowing rings.", world: "mars",
  action: s => "Fly through ring " + Math.min(s.k + 1, 3) + " of 3",
  status: (s, inp) => inp.hold ? "Lifting — steer toward the ring" : "Coasting — hold to lift",
  start(s) { Object.assign(s, { x: 150, y: 370, vy: 0, gy: 370, rings: [[300, 240], [480, 140], [650, 250]], k: 0, py: 440, tilt: 0, spin: 0 }); },
  step(s, dt, inp, T) {
    const drift = Math.sin(T.time * 1.3) * 30 * (1 - T.assist), vx = T.clamp(inp.px - s.x, -150, 150);
    s.x = T.clamp(s.x + (vx + drift) * dt * .9, 30, 770);
    s.vy = T.clamp(s.vy + (inp.hold ? -150 : 95) * dt, -110, 130); s.y += s.vy * dt;
    if (s.y >= s.gy) { s.y = s.gy; s.vy = Math.min(0, s.vy); } if (s.y < 40) { s.y = 40; s.vy = 0; }
    s.tilt = T.lerp(s.tilt, (vx + drift) / 400, .1); s.spin += (inp.hold ? 40 : 10) * dt;
    const r = s.rings[s.k];
    if (r && Math.hypot(s.x - r[0], s.y - r[1]) < 34 + T.assist * 30) { s.k++; T.spark(r[0], r[1], T.C.cyan, 20); T.sfx("snap"); T.buzz("star"); }
    if (s.k >= s.rings.length) { s.done = true; return; }
    const n = s.rings[s.k], prev = s.k ? s.rings[s.k - 1] : [150, 370];
    s.aimX = n[0]; s.aimHold = s.y > n[1];
    s.p = Math.max(s.p, (s.k + 1 - Math.min(1, Math.hypot(s.x - n[0], s.y - n[1]) / Math.hypot(n[0] - prev[0], n[1] - prev[1]))) / s.rings.length * .98);
  },
  draw(s, g, T) {
    T.sky(g, "mars"); T.ground(g, s.gy + 22, "mars");
    g.save(); g.translate(70, s.gy + 4); T.box(g, -30, -26, 60, 24, 5, T.C.white, 3); [-20, 0, 20].forEach(x => T.circ(g, x, 2, 8, T.C.dark, 2.5)); T.line(g, 18, -26, 18, -48, 3, T.C.silver); T.box(g, 8, -58, 20, 10, 3, T.C.white, 2.5); g.restore();
    s.rings.forEach((r, i) => { if (i === s.k) T.target(g, r[0], r[1], 30); g.lineWidth = 9; g.strokeStyle = T.INK; g.beginPath(); g.ellipse(r[0], r[1], 18, 42, 0, 0, 7); g.stroke(); g.lineWidth = 5; g.strokeStyle = i < s.k ? T.C.go : T.C.cyan; g.stroke(); });
    g.save(); g.translate(s.x, s.y); g.rotate(s.tilt);
    [[-1, 1], [1, 1]].forEach(([a]) => { T.line(g, a * 6, -4, a * 22, 18, 2.5, T.C.dark); T.circ(g, a * 22, 19, 3, T.C.dark, 2); });
    T.box(g, -11, -22, 22, 20, 5, T.C.gold, 3); T.line(g, 0, -22, 0, -54, 3, T.C.silver);
    [-36, -46].forEach((y, i) => { const w = Math.abs(Math.cos(s.spin + i * 1.3)) * 56 + 6; T.box(g, -w, y - 3, w * 2, 6, 3, T.C.dark, 2.5); });
    T.box(g, -14, -60, 28, 7, 2, T.C.navy, 2.5); g.restore();
  }
});
