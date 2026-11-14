/* Ghost Rovers mission task. See js/minigames/core.js for how tasks work. */
// Surveyor 3: a robot that landed on its own. Its engines didn't shut off in time, so it bounced twice.
Tasks.add("s3", {
  title: "Soft landing!", hint: "Tap or hold to fire the engines. Touch down slowly.",
  start(s) { Object.assign(s, { y: 40, vy: 20, gy: 300, bounces: 0, noPointer: true }); },
  step(s, dt, inp, T) {
    s.burn = inp.hold; s.vy = T.clamp(s.vy + (42 - (inp.hold ? 115 : 0)) * dt, -80, 170); s.y = Math.max(30, s.y + s.vy * dt);
    s.limit = 45 + T.assist * 70; s.aimX = 400; s.aimHold = s.vy > s.limit * .55;
    if (s.y >= s.gy) {
      if (s.vy <= s.limit) { s.y = s.gy; s.done = true; return; }
      s.y = s.gy - 1; s.vy = -Math.max(60, s.vy * .45); s.bounces++; s.msgT = 1.4; T.sfx("bump"); T.spark(400, s.gy + 60, "rgba(200,200,210,.9)", 12);
    }
    s.msgT = (s.msgT || 0) - dt; s.p = Math.max(s.p, (s.y - 40) / (s.gy - 40) * .9);
  },
  draw(s, g, T) {
    const gy = s.gy + 62; T.sky(g, "moon"); T.earth(g, 110, 80, 26); T.ground(g, gy, "moon");
    T.target(g, 400, gy + 6, 40);
    g.save(); g.translate(400, s.y);
    if (s.burn) [-22, 0, 22].forEach(x => T.poly(g, [[x - 6, 34], [x + 6, 34], [x, 50 + Math.random() * 14]], "#ffb133", 2.5));
    [-1, 0, 1].forEach(k => { T.line(g, k * 18, 26, k * 46, 58, 4, T.C.silver); T.box(g, k * 46 - 10, 56, 20, 7, 3, T.C.silver, 2.5); });
    T.poly(g, [[-30, 26], [30, 26], [0, -2]], T.C.silver); T.box(g, -20, 6, 18, 18, 4, T.C.white, 2.5); T.box(g, 4, 8, 16, 16, 4, T.C.white, 2.5);
    T.line(g, 0, 0, 0, -48, 4, T.C.silver); g.save(); g.translate(8, -52); g.rotate(-.4); T.box(g, -4, -6, 40, 12, 3, T.C.navy, 3); g.restore();
    g.save(); g.translate(-8, -48); g.rotate(.5); T.box(g, -34, -5, 34, 10, 3, T.C.gold, 3); g.restore();
    g.restore();
    const lim = s.limit / 170;
    T.box(g, 740, 80, 30, 240, 15, "#0d1230", 3); g.fillStyle = "rgba(61,220,111,.5)"; g.fillRect(744, 316 - 232 * lim, 22, 232 * lim);
    const sp = T.clamp(s.vy, 0, 170) / 170; T.circ(g, 755, 316 - 232 * sp, 11, sp <= lim ? T.C.go : T.C.orange, 3); T.text(g, "SPEED", 755, 62, 16);
    if (s.msgT > 0) T.text(g, "Boing! Too fast, try again", 400, 140, 30, T.C.sun);
  }
});
