/* Ghost Rovers mission task. See js/minigames/core.js for how tasks work. */
// Spirit: one wheel broke, so the team drove Spirit backward, dragging it. The wheel scraped up bright white soil.
Tasks.add("spi", {
  title: "Drive with a broken wheel!", hint: "Hold to drive. Steering is back-to-front and wobbly!", world: "mars",
  start(s) { Object.assign(s, { x: 130, y: 340, h: -.5, fx: 660, fy: 110, trail: [], py: 440 }); s.d0 = Math.hypot(s.fx - s.x, s.fy - s.y); },
  step(s, dt, inp, T) {
    const wob = Math.sin(T.time * 2.6) * .45 * (1 - T.assist * .8), st = T.clamp(-(inp.px - 400) / 300, -1, 1); // reversed!
    if (inp.hold) {
      s.h += (st + wob) * 1.5 * dt; s.x = T.clamp(s.x + Math.cos(s.h) * 75 * dt, 30, 770); s.y = T.clamp(s.y + Math.sin(s.h) * 75 * dt, 30, 420);
      const wx = s.x - Math.cos(s.h) * 22 - Math.sin(s.h) * 18, wy = s.y - Math.sin(s.h) * 22 + Math.cos(s.h) * 18, l = s.trail[s.trail.length - 1];
      if (!l || Math.hypot(wx - l[0], wy - l[1]) > 5) { s.trail.push([wx, wy]); if (s.trail.length > 500) s.trail.shift(); }
    }
    const d = Math.hypot(s.fx - s.x, s.fy - s.y); if (d < 40 + T.assist * 50) s.done = true; s.p = Math.max(s.p, 1 - d / s.d0);
    const want = Math.atan2(s.fy - s.y, s.fx - s.x), err = Math.atan2(Math.sin(want - s.h), Math.cos(want - s.h));
    s.aimX = 400 - T.clamp(err * 2 - wob, -1, 1) * 300; s.aimHold = true;
  },
  draw(s, g, T) {
    g.fillStyle = "#d26a35"; g.fillRect(0, 0, 800, 450);
    g.fillStyle = "rgba(140,55,25,.35)"; for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse((i * 157) % 800, (i * 89) % 450, 20 + (i * 13) % 26, 12 + (i * 7) % 12, 0, 0, 7); g.fill(); }
    if (s.trail.length > 1) { g.lineCap = g.lineJoin = "round"; g.strokeStyle = "#fffef8"; g.lineWidth = 8; g.beginPath(); s.trail.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
    T.target(g, s.fx, s.fy, 30); T.line(g, s.fx, s.fy, s.fx, s.fy - 50, 4, "#fff"); T.poly(g, [[s.fx, s.fy - 50], [s.fx + 30, s.fy - 41], [s.fx, s.fy - 32]], T.C.cyan, 3);
    g.save(); g.translate(s.x, s.y); g.rotate(s.h + Math.PI);
    [[-18, -20], [0, -22], [18, -20], [-18, 20], [0, 22], [18, 20]].forEach(([x, y], i) => T.box(g, x - 7, y - 5, 14, 10, 3, i === 5 ? "#c9c9c9" : T.C.dark, 2.5));
    T.box(g, -26, -16, 52, 32, 6, T.C.white); T.box(g, -30, -30, 34, 60, 5, T.C.navy, 3); T.circ(g, 18, 0, 6, T.C.gold, 2.5); g.restore();
    T.box(g, 100, 418, 600, 16, 8, "#0d1230", 3); T.text(g, "➡", 112, 400, 22, T.C.sun); T.text(g, "⬅", 688, 400, 22, T.C.sun); T.text(g, "STEER", 400, 400, 15);
  }
});
