/* Ghost Rovers mission task. See js/minigames/core.js for how tasks work. */
// Opportunity: gusts of Martian wind sometimes blew dust off its solar panels.
Tasks.add("opp", {
  steerOnly: true,
  title: "Catch the wind!", hint: "Steer into a passing gust to blow the dust off.", world: "mars",
  action: () => "Catch a passing gust",
  status: s => s.hit ? "In the wind — panels clearing" : s.aimG ? "Steer toward the glowing gust" : "A gust is on its way",
  start(s) { Object.assign(s, { x: 120, pow: .2, gusts: [], next: .6, py: 440 }); },
  step(s, dt, inp, T) {
    s.x = T.clamp(s.x + T.clamp(inp.px - s.x, -130 * dt, 130 * dt), 70, 730);
    if ((s.next -= dt) <= 0) { s.next = 3.6 - T.assist * 1.6; let x; do x = T.rnd(90, 710); while (Math.abs(x - s.x) < 220); s.gusts.push({ x, v: T.rnd(-40, 40), life: 4 + T.assist * 3, age: 0 }); }
    for (const q of s.gusts) { q.x += q.v * dt; q.age += dt; } s.gusts = s.gusts.filter(q => q.age < q.life);
    s.hit = s.gusts.some(q => Math.abs(q.x - s.x) < 55 + T.assist * 40);
    s.pow = T.clamp(s.pow + (s.hit ? dt / 4.5 : -dt / 45), .05, 1); if (s.hit && Math.random() < .5) T.puff(s.x + T.rnd(-30, 30), 270, "rgba(205,130,80,.7)", 1);
    s.p = Math.max(s.p, (s.pow - .2) / .8); if (s.pow >= 1) s.done = true;
    const on = s.gusts.slice().sort((a, b) => Math.abs(a.x - s.x) - Math.abs(b.x - s.x))[0]; s.aimX = on ? on.x : 400; s.aimG = on; s.aimHold = false;
  },
  draw(s, g, T) {
    T.sky(g, "mars"); T.ground(g, 340, "mars");
    for (const q of s.gusts) for (let i = 0; i < 6; i++) { g.globalAlpha = .5 * Math.min(1, q.age * 2, (q.life - q.age) * 1.5); g.strokeStyle = "#f6dcc0"; g.lineWidth = 6; g.beginPath(); g.ellipse(q.x + Math.sin(T.time * 6 + i) * 10, 330 - i * 40, 24 + i * 7, 9, 0, 0, 7); g.stroke(); }
    g.globalAlpha = 1;
    for (const q of s.gusts) { g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 3; for (let i = 0; i < 3; i++) { const y = 150 + i * 40, x = q.x - Math.sign(q.v) * (50 + i * 15); g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.sign(q.v) * 40, y); g.stroke(); } }
    g.save(); g.translate(s.x, 300);
    [-36, 0, 36].forEach(x => T.circ(g, x, 30, 13, T.C.dark, 3)); T.box(g, -40, -12, 80, 30, 6, T.C.white);
    T.box(g, -66, -22, 132, 10, 4, T.C.navy, 3); g.globalAlpha = 1 - s.pow; g.fillStyle = "#b8653a"; g.fillRect(-64, -21, 128, 8); g.globalAlpha = 1;
    T.line(g, 26, -22, 26, -62, 4, T.C.silver); T.box(g, 14, -76, 28, 16, 4, T.C.white, 3); g.restore();
    if (s.aimG) T.target(g, s.aimG.x, 345, 34);
    T.bar(g, 24, 70, 28, 230, s.pow, s.pow < .4 ? T.C.orange : T.C.go, "POWER");
  }
});
