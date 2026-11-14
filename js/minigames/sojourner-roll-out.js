/* Ghost Rovers mission task. See js/minigames/core.js for how tasks work. */
// Sojourner: the Pathfinder lander bounced down on airbags, opened up, and the rover drove down a ramp.
Tasks.add("soj", {
  title: "Roll out!", hint: "Hold on each glowing spot: shrink the airbags, lower the ramp, drive down.", world: "mars",
  start(s) { s.xs = [400, 575, 690]; s.ys = [260, 320, 345]; s.py = 260; },
  step(s, dt, inp, T) { T.seq(s, s.xs, [2.4, 1.8, 3.2], dt, 50); s.py = s.ys[Math.min(s.k || 0, 2)]; },
  draw(s, g, T) {
    T.sky(g, "mars"); T.ground(g, 350, "mars");
    const k = s.k || 0, at = i => k > i ? 1 : k === i ? s.h : 0, e = v => v * v * (3 - 2 * v), bag = 1 - e(at(0)), ramp = e(at(1)), drive = e(at(2));
    const op = 1 - bag;
    [[-1], [1]].forEach(([d]) => { g.save(); g.translate(400 + d * 70, 330); g.rotate(d * (1 - op) * -1.1); T.poly(g, [[0, 0], [d * 110, 0], [d * 70, -14]], T.C.gold, 3); g.restore(); });
    T.poly(g, [[330, 330], [470, 330], [400, 300]], T.C.gold);
    if (bag > .02) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = 70 * bag + 20; T.circ(g, 400 + Math.cos(a) * r * 1.2, 300 + Math.sin(a) * r * .8, 28 * bag + 4, "rgba(240,240,230,.92)", 3); }
    const rx = 470, ry = 330; g.save(); g.translate(rx, ry); g.rotate(-1.4 * (1 - ramp) + .2 * ramp); T.box(g, 0, -5, 120, 9, 3, T.C.silver, 3); g.restore();
    let sx, sy; if (drive < .4) { sx = 420 + drive / .4 * 50; sy = 316; } else { const f = (drive - .4) / .6; sx = 470 + f * 220; sy = 316 + Math.min(1, f * 1.1) * 18; }
    if (bag < .3) { g.save(); g.translate(sx, sy); T.box(g, -20, -14, 40, 12, 3, T.C.gold, 3); T.box(g, -23, -18, 46, 5, 2, T.C.navy, 2.5); [-14, 0, 14].forEach(x => T.circ(g, x, 2, 6, T.C.mid, 2.5)); g.restore(); }
    if (k < 3) T.target(g, s.xs[k], s.ys[k], 26, s.h);
  }
});
