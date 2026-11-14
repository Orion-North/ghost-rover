/* =====================================================================
   GHOST ROVERS · PHONE CONTROLLER
   Opens when the page address has ?join=<id> (that's what the QR code holds).
   ===================================================================== */
function startController(hostId) {
  document.getElementById("pad").classList.remove("hidden");
  const $ = id => document.getElementById(id);
  let conn = null, connected = false, started = false;
  let gas = false, rev = false, steer = 0, tiltOn = true, flip = 1, neutral = null, rawAngle = null, gotMotion = false;
  const btnSteer = { l: false, r: false };
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } };

  // connect
  if (!window.Peer) { $("padConn").textContent = "Couldn't load the connection library. Check the internet connection and reload."; return; }
  const peer = new Peer();
  peer.on("open", () => {
    conn = peer.connect(hostId);
    conn.on("open", () => { connected = true; $("padConn").textContent = "✅ Connected to the game"; $("padMsg").textContent = ""; });
    conn.on("data", onData);
    conn.on("close", () => { connected = false; $("padMsg").textContent = "Disconnected. Reload this page to reconnect."; $("pStatus").innerHTML = "<b>Disconnected</b>"; });
  });
  peer.on("error", e => { $("padConn").textContent = "Couldn't reach the game (" + (e.type || "error") + "). Scan the code again."; });
  const send = m => { if (connected) try { conn.send(m); } catch (e) { } };

  function onData(d) {
    if (!d) return;
    if (d.t === "vibe") buzz(d.p);
    if (d.t === "state") {
      const isCard = d.mode === "card", lobby = d.mode === "lobby";
      $("bNext").classList.toggle("hidden", !(isCard || lobby || ["book", "report", "task", "pause"].includes(d.mode)));
      $("bNext").textContent = lobby ? "START ▶" : d.mode === "book" ? "CLOSE ✕" : d.mode === "task" ? "GRAB ✋" : d.mode === "pause" ? "RESUME ▶" : isCard && d.wait ? "NEXT in " + d.wait + "…" : "NEXT ▶";
      $("bSkip").classList.toggle("hidden", d.mode !== "task");
      $("bNext").className = "btn go" + ($("bNext").classList.contains("hidden") ? " hidden" : "") + (isCard && d.wait ? " wait" : "");
      $("bRead").classList.toggle("hidden", !isCard);
      $("bWorld").textContent = lobby ? "World: " + d.world : "Moon ⇄ Mars";
      $("wheel").classList.toggle("near", d.mode === "play" && d.sig >= 3);
      if (isCard) $("pStatus").innerHTML = `Found <b>${escapeHtml(d.card)}</b>!<br>Read its story on the big screen.`;
      else if (lobby) $("pStatus").innerHTML = `World: <b>${escapeHtml(d.world)}</b><br>Tap START when everyone's ready`;
      else if (d.mode === "book") $("pStatus").innerHTML = "Sticker book is open on the big screen";
      else if (d.mode === "task") $("pStatus").innerHTML = "<b>Mission task!</b><br>Tilt to move the hand · hold GRAB to grab";
      else if (d.mode === "pause") $("pStatus").innerHTML = "<b>Paused</b><br>Tap RESUME to keep going";
      else if (d.mode === "report") $("pStatus").innerHTML = "<b>Mission report</b><br>Tap NEXT to keep exploring";
      else if (d.mode === "count") $("pStatus").innerHTML = "<b>Get ready…</b>";
      else if (d.mode === "revive") $("pStatus").innerHTML = "<b>Waking up a ghost…</b>";
      else $("pStatus").innerHTML = `<b>${escapeHtml(d.world)}</b> · 👻 ${d.found}/${d.total} · ⭐ ${d.stars}<br><span class="sig">${"▮".repeat(d.sig)}${"▯".repeat(4 - d.sig)}</span> ${escapeHtml(d.dist || "")}`;
    }
  }
  const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // start (iOS needs a tap before it will share motion data)
  $("padGo").onclick = async () => {
    try { if (typeof DeviceMotionEvent !== "undefined" && DeviceMotionEvent.requestPermission) await DeviceMotionEvent.requestPermission(); } catch (e) { }
    try { await document.documentElement.requestFullscreen?.(); } catch (e) { }
    try { await screen.orientation?.lock?.("landscape"); } catch (e) { }
    addEventListener("devicemotion", onMotion);
    started = true; $("padStart").classList.add("hidden"); $("padMain").classList.remove("hidden");
    setTimeout(() => { neutral = rawAngle; if (!gotMotion) setTilt(false); }, 600);
  };

  // tilt steering: angle of gravity within the screen plane, relative to how you held it at the start
  function onMotion(e) {
    const g = e.accelerationIncludingGravity; if (!g || g.x == null) return;
    if (Math.hypot(g.x, g.y) < 3) return; // phone is lying flat; ignore
    gotMotion = true;
    rawAngle = Math.atan2(g.x, g.y) * 180 / Math.PI;
  }
  function tiltSteer() {
    if (!tiltOn || rawAngle == null || neutral == null) return 0;
    let d = rawAngle - neutral; d = ((d + 540) % 360) - 180;
    d = -d * flip;
    if (Math.abs(d) < 4) return 0;
    return Math.max(-1, Math.min(1, (d - Math.sign(d) * 4) / 32));
  }
  function setTilt(on) {
    tiltOn = on; $("bTilt").textContent = "Tilt: " + (on ? "on" : "off");
    $("tapSteer").classList.toggle("hidden", on); $("wheel").classList.toggle("hidden", !on);
  }

  // buttons (multi-touch friendly)
  function hold(el, set) {
    const on = e => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); set(true); el.classList.add("down"); };
    const off = () => { set(false); el.classList.remove("down"); };
    el.addEventListener("pointerdown", on); el.addEventListener("pointerup", off); el.addEventListener("pointercancel", off); el.addEventListener("lostpointercapture", off);
    el.addEventListener("contextmenu", e => e.preventDefault());
  }
  hold($("bGo"), v => { gas = v; if (v) buzz(15); });
  hold($("bRev"), v => { rev = v; if (v) buzz(15); });
  hold($("bL"), v => btnSteer.l = v);
  hold($("bR"), v => btnSteer.r = v);
  const note = t => { $("padMsg").textContent = t; setTimeout(() => $("padMsg").textContent = "", 1500); };
  $("bNext").onclick = () => send({ t: "a", a: "next" });
  // holding NEXT (it says GRAB during a mission task) grabs things; letting go drops them
  const nextHold = v => () => send({ t: "h", h: v ? 1 : 0 });
  $("bNext").addEventListener("pointerdown", nextHold(true)); ["pointerup", "pointercancel", "pointerleave"].forEach(n => $("bNext").addEventListener(n, nextHold(false)));
  $("bSkip").onclick = () => send({ t: "a", a: "skip" });
  $("bRead").onclick = () => send({ t: "a", a: "read" });
  $("bWorld").onclick = () => send({ t: "a", a: "world" });
  $("bBook").onclick = () => send({ t: "a", a: "book" });
  $("bCal").onclick = () => { neutral = rawAngle; note("Steering re-centered"); };
  $("bFlip").onclick = () => { flip *= -1; note("Steering flipped"); };
  $("bTilt").onclick = () => setTilt(!tiltOn);

  // send inputs ~30 times a second
  setInterval(() => {
    if (!started) return;
    const target = tiltOn ? tiltSteer() : (btnSteer.r ? 1 : 0) - (btnSteer.l ? 1 : 0);
    steer += (target - steer) * .5;
    $("wheel").style.transform = `rotate(${steer * 90}deg)`;
    send({ t: "i", s: +steer.toFixed(3), g: gas ? 1 : 0, r: rev ? 1 : 0 });
  }, 33);
}
