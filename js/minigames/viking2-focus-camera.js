/* Ghost Rovers mission task. See js/minigames/core.js for how tasks work. */
// Viking 2: in winter it photographed a thin layer of white frost on the rocks and soil.
Tasks.add("v2", {
  steerOnly: true, pointerRange: [100, 700],
  title: "Focus the camera!", hint: "Steer the focus slider until the photo is sharp.", world: "mars",
  action: s => s.on ? "Focus locked" : "Adjust focus",
  status: s => s.on ? "Keep steady" : "",
  start(s, T) {
    Object.assign(s, { fx: 170 + Math.random() * 120 + (Math.random() < .5 ? 0 : 340), lock: 0, py: 438, noPointer: true });
    const mk = () => { const c = document.createElement("canvas"); c.width = 600; c.height = 320; return c; };
    s.scene = mk(); s.frost = mk(); s.tmp = document.createElement("canvas");
    const a = s.scene.getContext("2d"), b = s.frost.getContext("2d"), gr = a.createLinearGradient(0, 0, 0, 320);
    gr.addColorStop(0, "#c9946a"); gr.addColorStop(.38, "#efc9a0"); gr.addColorStop(.4, "#b8643a"); gr.addColorStop(1, "#8e4426"); a.fillStyle = gr; a.fillRect(0, 0, 600, 320);
    for (let i = 0; i < 46; i++) {
      const x = (i * 131) % 600, y = 140 + (i * 53) % 170, r = 6 + (i * 7) % 18 + (y - 130) / 12;
      a.fillStyle = "#4a2416"; a.beginPath(); a.ellipse(x, y, r, r * .62, 0, 0, 7); a.fill(); a.fillStyle = "#6b3420"; a.beginPath(); a.ellipse(x - r * .25, y - r * .2, r * .55, r * .3, 0, 0, 7); a.fill();
      b.fillStyle = "rgba(248,250,255,.95)"; b.beginPath(); b.ellipse(x + r * .9, y + r * .55, r * .9, r * .28, 0, 0, 7); b.fill(); b.beginPath(); b.ellipse(x - r * .2, y - r * .45, r * .55, r * .18, 0, 0, 7); b.fill();
    }
    a.fillStyle = "#d9d9d9"; a.beginPath(); a.ellipse(70, 318, 80, 26, 0, Math.PI, 0); a.fill(); a.strokeStyle = "#333"; a.lineWidth = 3; a.stroke();
  },
  step(s, dt, inp, T) {
    s.d = Math.abs(inp.px - s.fx); s.on = s.d < 26 + T.assist * 70;
    s.lock = T.clamp(s.lock + (s.on ? dt / 6 : -dt * .4), 0, 1); s.p = Math.max(s.p, s.lock); if (s.lock >= 1) s.done = true;
    s.aimX = s.fx; s.aimHold = false;
  },
  draw(s, g, T, inp) {
    g.fillStyle = "#141a3c"; g.fillRect(0, 0, 800, 450);
    const b = 1 + (s.d || 0) / 10, w = Math.max(6, Math.round(600 / b)), h = Math.max(4, Math.round(320 / b)), t = s.tmp; t.width = w; t.height = h;
    const tg = t.getContext("2d"); tg.imageSmoothingEnabled = true; tg.drawImage(s.scene, 0, 0, w, h); tg.globalAlpha = T.clamp(1 - (s.d || 0) / 140, 0, 1); tg.drawImage(s.frost, 0, 0, w, h);
    g.imageSmoothingEnabled = true; g.drawImage(t, 100, 30, 600, 320);
    g.strokeStyle = "#fff"; g.lineWidth = 6; [[100, 30, 1, 1], [700, 30, -1, 1], [100, 350, 1, -1], [700, 350, -1, -1]].forEach(([x, y, a, c]) => { g.beginPath(); g.moveTo(x + a * 40, y); g.lineTo(x, y); g.lineTo(x, y + c * 40); g.stroke(); });
    if (s.on) T.text(g, "Sharp! Look at the white frost", 400, 60, 24, "#ffffff");
    T.box(g, 100, 380, 600, 24, 12, "#0d1230", 3); for (let i = 1; i < 12; i++) { g.fillStyle = "rgba(255,255,255,.4)"; g.fillRect(100 + i * 50, 386, 3, 12); }
    const knobX = T.clamp(inp.px, 100, 700);
    T.circ(g, knobX, 392, 17, s.on ? T.C.go : T.C.sun, 4);
    T.line(g, knobX, 383, knobX, 401, 3, "#fff");
    T.text(g, "FOCUS", 60, 392, 17); T.bar(g, 720, 120, 26, 220, s.lock, T.C.go, "LOCK");
  }
});
