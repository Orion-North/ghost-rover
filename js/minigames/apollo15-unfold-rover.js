/* Ghost Rovers mission task. See js/minigames/core.js for how tasks work. */
// Apollo 15: the Moon car travelled folded up on the lander's side, and the crew unfolded it.
Tasks.add("a15", {
  title: "Unfold the rover!", hint: "Hold on each glowing spot: lower it, flip out the wheels, click in the seats.",
  start(s) { s.xs = [250, 387, 561, 470]; s.ys = [150, 335, 335, 280]; s.py = 150; },
  step(s, dt, inp, T) { T.seq(s, s.xs, [2.2, 1.6, 1.6, 1.6], dt, 48); s.py = s.ys[Math.min(s.k || 0, 3)]; },
  draw(s, g, T) {
    T.sky(g, "moon"); T.earth(g, 690, 70, 28); T.ground(g, 345, "moon");
    const k = s.k || 0, at = i => k > i ? 1 : k === i ? s.h : 0, e = v => v * v * (3 - 2 * v);
    T.line(g, 140, 300, 110, 345, 5, T.C.silver); T.line(g, 300, 300, 330, 345, 5, T.C.silver);
    T.box(g, 120, 140, 200, 160, 10, T.C.gold); T.box(g, 160, 80, 120, 62, 10, T.C.silver); T.box(g, 195, 96, 50, 22, 6, T.C.dark, 3);
    const a = -Math.PI / 2 * (1 - e(at(0)));
    if (k === 0) T.line(g, 250, 150, 340 + Math.cos(a) * 200, 330 + Math.sin(a) * 200, 2, "#fff");
    g.save(); g.translate(340, 330); g.rotate(a);
    T.box(g, 0, -10, 260, 14, 5, T.C.silver, 3.5);
    [[.18, 1], [.85, 2]].forEach(([f, i]) => { const w = e(at(i)); g.save(); g.translate(260 * f, 4); g.rotate((1 - w) * -1.4); T.circ(g, 0, 0, 10 + 14 * w, "#9aa2af", 3.5); T.circ(g, 0, 0, 6, T.C.silver, 2.5); g.restore(); T.box(g, 260 * f - 26, -22, 52, 8, 3, T.C.orange, 2.5); });
    const se = e(at(3)); [118, 152].forEach(x => { g.save(); g.translate(x, -10); g.rotate(-(1 - se) * 1.5); T.box(g, -4, -34, 8, 34, 3, T.C.gold, 2.5); T.box(g, -16, -6, 30, 8, 3, T.C.gold, 2.5); g.restore(); });
    T.line(g, 230, -10, 230, -50, 3, T.C.silver); T.circ(g, 230, -56, 12, T.C.gold, 3);
    g.restore();
    if (k < 4) T.target(g, s.xs[k], s.ys[k], 26, s.h);
  }
});
