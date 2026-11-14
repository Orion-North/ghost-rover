/* Ghost Rovers mission task. See js/minigames/core.js for how tasks work. */
// Apollo 16: John Young test-drove the Moon car, speeding and swerving, while Duke filmed the "Grand Prix".
Tasks.add("a16", {
  title: "Grand Prix!", hint: "Hold to drive. Weave around the cones!",
  start(s) { Object.assign(s, { x: 400, d: 0, v: 0, total: 2400, cones: [], lap: 0, py: 440 }); for (let i = 0; i < 12; i++) s.cones.push({ d: 240 + i * 170, x: i % 2 ? 470 : 330, hit: false }); },
  step(s, dt, inp, T) {
    s.v += ((inp.hold ? 250 : 15) - s.v) * 2 * dt; s.d += s.v * dt; s.lap += dt;
    s.x = T.clamp(s.x + T.clamp(inp.px - s.x, -300 * dt, 300 * dt), 190, 610);
    for (const c of s.cones) if (!c.hit && Math.abs(c.d - s.d) < 20 && Math.abs(c.x - s.x) < 34 - T.assist * 18) { c.hit = true; s.v *= .5; T.spark(c.x, 360, T.C.orange, 10); T.sfx("bump"); }
    const n = s.cones.find(c => c.d > s.d - 5); s.aimX = n ? n.x + (n.x > 400 ? -130 : 130) : 400; s.aimHold = true;
    if (Math.random() < s.v / 400) T.spark(s.x + T.rnd(-20, 20), 400, "rgba(200,200,210,.8)", 1);
    s.p = Math.max(s.p, s.d / s.total); if (s.d >= s.total) s.done = true;
  },
  draw(s, g, T) {
    g.fillStyle = "#7d808c"; g.fillRect(0, 0, 800, 450); g.fillStyle = "#a3a6b2"; g.fillRect(170, 0, 460, 450);
    g.fillStyle = "rgba(60,62,75,.25)"; for (let i = 0; i < 9; i++) { const y = ((i * 97 + s.d) % 560) - 60; g.beginPath(); g.ellipse(80 + (i * 61) % 60, y, 30, 12, 0, 0, 7); g.ellipse(720 - (i * 41) % 50, y + 40, 24, 10, 0, 0, 7); g.fill(); }
    g.strokeStyle = "#fff"; g.lineWidth = 5; g.setLineDash([26, 22]); g.lineDashOffset = -s.d; [170, 630].forEach(x => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 450); g.stroke(); }); g.setLineDash([]);
    const fy = 360 - (s.total - s.d); if (fy > -20) for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? "#fff" : T.INK; g.fillRect(170 + i * 38.3, fy + j * 14, 38.3, 14); }
    for (const c of s.cones) { const y = 360 - (c.d - s.d); if (y < -30 || y > 480) continue; if (c.hit) { T.poly(g, [[c.x - 20, y + 6], [c.x + 22, y - 4], [c.x + 20, y + 10]], "#9a9aa0", 3); continue; } T.circ(g, c.x, y, 16, T.C.orange, 3.5); T.circ(g, c.x, y, 7, "#fff", 2.5); }
    g.save(); g.translate(s.x, 370); 
    [[-30, -30], [30, -30], [-30, 30], [30, 30]].forEach(([x, y]) => T.box(g, x - 9, y - 14, 18, 28, 6, "#9aa2af", 3));
    T.box(g, -24, -42, 48, 84, 10, T.C.silver); T.circ(g, -10, 6, 9, "#fff", 2.5); T.circ(g, 10, 6, 9, "#fff", 2.5); T.circ(g, 0, -30, 10, T.C.gold, 2.5); g.restore();
    T.text(g, "⏱ " + s.lap.toFixed(1) + "s", 720, 34, 24);
  }
});
