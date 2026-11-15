/* Ghost Rovers mission task. See js/minigames/core.js for how tasks work. */
// Apollo 17: a fender broke, and the crew fixed it with duct tape, folded paper maps and clamps.
Tasks.add("a17", {
  title: "Fix the fender!", hint: "Hold on each glowing crack to patch it.",
  actions: ["Tape the first crack · 1 of 4", "Tape the second crack · 2 of 4", "Fit the folded map · 3 of 4", "Secure the clamp · 4 of 4"],
  start(s) { s.spots = [{ x: 335, y: 235, kind: "tape" }, { x: 465, y: 235, kind: "tape" }, { x: 400, y: 206, kind: "map" }, { x: 316, y: 268, kind: "clamp" }]; s.py = 235; },
  step(s, dt, inp, T) {
    T.seq(s, s.spots.map(o => o.x), 2.2, dt, 40); const i = Math.min(s.k, 3); s.py = s.spots[i].y;
    s.spray = 1 - (s.k + s.h) / 4; s.spin = (s.spin || 0) + dt * 5;
    if (Math.random() < s.spray * 1.4) T.spark(480 + T.rnd(-8, 8), 250, "rgba(205,205,215,.95)", 2);
  },
  draw(s, g, T) {
    T.sky(g, "moon"); T.ground(g, 368, "moon");
    T.box(g, 120, 118, 560, 18, 7, T.C.silver); T.line(g, 400, 136, 400, 300, 6, T.C.silver);
    g.save(); g.translate(400, 300); g.rotate(s.spin);
    T.circ(g, 0, 0, 66, "#9aa2af", 4); for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); T.line(g, 0, 0, 62, 0, 2, "#c7ccd6"); } T.circ(g, 0, 0, 16, T.C.silver, 3); g.restore();
    g.beginPath(); g.arc(400, 300, 92, Math.PI * 1.12, Math.PI * 1.88); g.lineCap = "butt"; g.strokeStyle = T.INK; g.lineWidth = 26; g.stroke(); g.strokeStyle = T.C.orange; g.lineWidth = 19; g.stroke();
    s.spots.forEach((o, i) => {
      if ((s.k || 0) <= i) { if (o.kind !== "map" && o.kind !== "clamp") { g.strokeStyle = T.INK; g.lineWidth = 3; g.beginPath(); g.moveTo(o.x - 4, o.y - 12); g.lineTo(o.x + 4, o.y - 3); g.lineTo(o.x - 3, o.y + 4); g.lineTo(o.x + 4, o.y + 12); g.stroke(); } return; }
      g.save(); g.translate(o.x, o.y); g.rotate(Math.atan2(o.y - 300, o.x - 400) + Math.PI / 2);
      if (o.kind === "tape") T.box(g, -20, -9, 40, 18, 3, "#b9bcc6", 3);
      else if (o.kind === "map") { T.box(g, -44, -20, 88, 34, 3, "#f4e6c0", 3); g.strokeStyle = "#5b8fd6"; g.lineWidth = 2; [-10, 2].forEach(y => { g.beginPath(); g.moveTo(-36, y); g.lineTo(36, y + 4); g.stroke(); }); g.strokeStyle = T.INK; g.beginPath(); g.moveTo(0, -20); g.lineTo(0, 14); g.stroke(); }
      else { T.box(g, -8, -16, 16, 32, 4, T.C.dark, 3); T.box(g, -14, -6, 28, 12, 4, T.C.mid, 3); }
      g.restore();
    });
    if (s.k < 4) T.target(g, s.spots[s.k].x, s.spots[s.k].y, 22, s.h);
    T.text(g, s.spray > .05 ? "Dust spraying everywhere!" : "Fixed! No more dust", 400, 60, 24, s.spray > .05 ? T.C.sun : "#bfffcf");
  }
});
