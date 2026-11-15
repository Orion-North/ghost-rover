/* Ghost Rovers mission task. See js/minigames/core.js for how tasks work. */
// Phoenix: it scraped a trench and found bright white chunks that vanished a few days later: water ice.
Tasks.add("phx", {
  title: "Dig for ice!", hint: "Hold over the trench to scrape. Then grab the ice before it fades!", world: "mars",
  action: s => s.stage ? "Grab the ice before it fades" : "Scrape the trench · " + Math.min(s.layer + 1, 3) + " of 3",
  start(s) { Object.assign(s, { layer: 0, stage: 0, ice: 0, iceX: 400, py: 250 }); },
  step(s, dt, inp, T) {
    if (s.stage === 0) {
      s.aimX = 400; if (T.hot(s, "h", 400, 90, 2, dt) >= 1) { s.layer++; s.h = 0; T.sfx("snap"); T.spark(400, 250, "#a9502a", 12); if (s.layer >= 3) { s.stage = 1; s.ice = 1; s.iceX = T.rnd(340, 460); } }
    } else {
      s.ice -= dt / (7 + T.assist * 12); s.aimX = s.iceX;
      if (T.hot(s, "g", s.iceX, 32, .6, dt) >= 1) { s.done = true; T.spark(s.iceX, 300, "#ffffff", 20); return; }
      if (s.ice <= 0) { s.layer = 2; s.stage = 0; s.h = 0; s.g = 0; s.msgT = 2.2; }
    }
    s.aimHold = true; s.msgT = (s.msgT || 0) - dt; s.py = 230 + s.layer * 24;
    s.p = Math.max(s.p, Math.min(.95, (s.layer + (s.stage ? (s.g || 0) : s.h)) / 4));
  },
  draw(s, g, T, inp) {
    const gr = g.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, "#d6b08a"); gr.addColorStop(1, "#f2dcc2"); g.fillStyle = gr; g.fillRect(0, 0, 800, 450);
    ["#c46a3e", "#a9532e", "#8c4226", "#6e3420"].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, 200 + i * 40, 800, 40 + (i === 3 ? 120 : 0)); });
    g.fillStyle = "#e9d2b4"; g.fillRect(0, 196, 800, 6);
    const depth = s.layer * 34; if (depth) { g.fillStyle = "#3b1d12"; g.beginPath(); g.moveTo(300, 200); g.lineTo(320, 200 + depth); g.lineTo(480, 200 + depth); g.lineTo(500, 200); g.fill(); }
    if (s.stage === 1) { g.globalAlpha = T.clamp(s.ice, 0, 1); T.poly(g, [[s.iceX - 26, 200 + depth], [s.iceX - 16, 188 + depth], [s.iceX + 10, 186 + depth], [s.iceX + 26, 200 + depth]], "#ffffff", 3); T.glow(g, s.iceX, 195 + depth, 50, "rgba(220,240,255,1)", .6 * s.ice); g.globalAlpha = 1; T.target(g, s.iceX, 192 + depth, 22, s.g); }
    else T.target(g, 400, 200 + depth, 40, s.h);
    g.save(); g.translate(70, 150); T.box(g, -40, 0, 80, 22, 5, T.C.white, 3); T.circ(g, -54, 6, 26, T.C.navy, 3); T.circ(g, 54, 6, 26, T.C.navy, 3); [-1, 1].forEach(a => T.line(g, a * 26, 22, a * 36, 48, 4, T.C.silver)); g.restore();
    const tx = T.clamp(inp.px, 150, 760), ty = s.py - 6, ex = (130 + tx) / 2, ey = Math.min(150, ty) - 60;
    T.line(g, 110, 160, ex, ey, 6, T.C.silver); T.line(g, ex, ey, tx, ty, 5, T.C.silver); T.poly(g, [[tx - 14, ty], [tx + 14, ty], [tx + 8, ty + 14], [tx - 8, ty + 14]], T.C.mid, 3);
    if (s.msgT > 0) T.text(g, "Poof! It turned straight into gas. Scrape again!", 400, 80, 24, "#fff");
    T.text(g, s.stage ? "Ice! Grab it quick" : "Scrape: " + s.layer + " / 3", 680, 40, 22);
  }
});
