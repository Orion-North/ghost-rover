/* Ghost Rovers mission task. See js/minigames/core.js for how tasks work. */
// Apollo 11: Armstrong flew past a boulder field and landed with little fuel to spare.
Tasks.add("a11", {
  title: "Land the Eagle!", hint: "Steer to the clear spot. Hold to fire the engine and slow down.",
  action: () => "Land in the clear spot",
  status: s => s.burn ? "Engine firing" : s.slow ? "Descent safe — steer to the landing zone" : "Hold to slow your descent",
  start(s) { Object.assign(s, { x: 140, y: 50, vy: 0, fuel: 1, zone: 580, gy: 330, py: 440, rocks: [[120, 18], [230, 24], [320, 30], [410, 20], [460, 26], [700, 26], [770, 18]] }); },
  step(s, dt, inp, T) {
    s.x += T.clamp(inp.px - s.x, -170 * dt, 170 * dt);
    s.burn = inp.hold && s.fuel > 0;
    s.vy += (38 - (s.burn ? 100 : 0)) * dt; if (s.burn) s.fuel = Math.max(0, s.fuel - dt / 10);
    if (s.fuel <= 0) s.vy = Math.min(s.vy, 50);                 // out of fuel: it still drifts down gently, so nobody gets stuck
    s.vy = T.clamp(s.vy, -90, 160); s.y = Math.max(30, s.y + s.vy * dt);
    const limit = 60 + T.assist * 70, zw = 60 * (1 + T.assist);
    s.slow = s.vy <= limit; s.aimX = s.zone; s.aimHold = s.vy > 32;
    if (s.y >= s.gy) {
      const ok = Math.abs(s.x - s.zone) < zw;
      if (ok && s.slow) { s.y = s.gy; s.done = true; return; }
      s.y = s.gy - 1; s.vy = -Math.max(70, s.vy * .5); T.spark(s.x, s.gy + 40, "rgba(200,200,210,.9)", 10); T.sfx("bump");
      s.msg = ok ? "Too fast! Slow down." : "Boulders! Find the clear spot."; s.msgT = 1.6;
    }
    s.msgT = (s.msgT || 0) - dt; s.p = Math.max(s.p, (s.y - 50) / (s.gy - 50) * .9);
  },
  draw(s, g, T) {
    const gy = s.gy + 44; T.sky(g, "moon"); T.earth(g, 700, 70, 30); T.ground(g, gy, "moon");
    T.target(g, s.zone, gy + 8, 34);
    for (const [x, r] of s.rocks) T.poly(g, [[x - r, gy + 4], [x - r * .6, gy + 4 - r * .9], [x + r * .3, gy + 4 - r], [x + r, gy + 4]], "#6d7180", 3);
    g.save(); g.translate(s.x, s.y);
    if (s.burn) T.poly(g, [[-9, 30], [9, 30], [0, 54 + Math.random() * 14]], "#ffb133", 3);
    T.line(g, -24, 18, -38, 40, 4, T.C.silver); T.line(g, 24, 18, 38, 40, 4, T.C.silver);
    T.box(g, -46, 38, 16, 6, 3, T.C.silver, 2.5); T.box(g, 30, 38, 16, 6, 3, T.C.silver, 2.5);
    T.poly(g, [[-26, 0], [26, 0], [31, 13], [26, 26], [-26, 26], [-31, 13]], T.C.gold);
    T.box(g, -18, -24, 36, 25, 7, T.C.silver); T.box(g, -8, -18, 16, 10, 4, T.C.dark, 2.5);
    g.restore();
    T.bar(g, 24, 90, 28, 230, s.fuel, s.fuel < .25 ? T.C.orange : T.C.go, "FUEL");
    T.circ(g, 38, 368, 13, s.slow ? T.C.go : T.C.orange, 3); T.text(g, s.slow ? "slow ✓" : "too fast", 60, 368, 17, "#fff", "left");
    if (s.msgT > 0) T.text(g, s.msg, 400, 200, 28, T.C.sun);
  }
});
