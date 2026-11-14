/* Ghost Rovers mission task. See js/minigames/core.js for how tasks work. */
// Apollo 14 science station: a laser mirror that scientists on Earth still bounce lasers off.
Tasks.add("a14s", {
  title: "Aim the laser mirror!", hint: "Steer to tilt the mirror toward Earth.",
  start(s) { Object.assign(s, { mx: 540, my: 300, ex: 230, ey: 70, py: 440, lock: 0 }); s.need = Math.atan2(s.ey - s.my, s.ex - s.mx) + Math.PI / 2; },
  step(s, dt, inp, T) {
    s.a = (inp.px - 400) / 400 * 1.3; s.on = Math.abs(s.a - s.need) < .12 + T.assist * .3;
    s.lock = T.clamp(s.lock + (s.on ? dt / 7 : -dt * .5), 0, 1); s.p = Math.max(s.p, s.lock); if (s.lock >= 1) s.done = true;
    s.aimX = 400 + s.need / 1.3 * 400; s.aimHold = false;
  },
  draw(s, g, T) {
    T.sky(g, "moon"); T.ground(g, 340, "moon"); T.earth(g, s.ex, s.ey, 34);
    const dx = s.mx - s.ex, dy = s.my - s.ey, L = Math.hypot(dx, dy), ix = dx / L, iy = dy / L;
    g.setLineDash([14, 10]); g.lineDashOffset = -T.time * 120; g.strokeStyle = "rgba(90,255,120,.9)"; g.lineWidth = 4; g.beginPath(); g.moveTo(s.ex + ix * 36, s.ey + iy * 36); g.lineTo(s.mx, s.my); g.stroke();
    if (s.on) { g.lineDashOffset = T.time * 120; g.strokeStyle = "rgba(170,255,180,1)"; g.lineWidth = 6; g.beginPath(); g.moveTo(s.mx - 6, s.my - 6); g.lineTo(s.ex + 30, s.ey + 30); g.stroke(); }
    else { const nx = Math.sin(s.a), ny = -Math.cos(s.a), d = ix * nx + iy * ny, rx = ix - 2 * d * nx, ry = iy - 2 * d * ny; g.strokeStyle = "rgba(90,255,120,.4)"; g.beginPath(); g.moveTo(s.mx, s.my); g.lineTo(s.mx + rx * 600, s.my + ry * 600); g.stroke(); }
    g.setLineDash([]);
    T.line(g, s.mx, s.my + 10, s.mx - 18, 344, 4, T.C.silver); T.line(g, s.mx, s.my + 10, s.mx + 18, 344, 4, T.C.silver);
    g.save(); g.translate(s.mx, s.my); g.rotate(s.a); T.box(g, -50, -8, 100, 16, 4, T.C.silver, 3.5);
    for (let i = 0; i < 6; i++) T.circ(g, -40 + i * 16, 0, 5, s.on ? "#bfffcf" : "#e8f0ff", 1.5); g.restore();
    T.bar(g, 300, 400, 200, 20, s.lock, T.C.go); if (s.on) T.text(g, "Bounced home! A round trip takes about 2.5 seconds", 400, 380, 18, "#bfffcf");
  }
});
