/* =====================================================================
   GHOST ROVERS · THE GAME (laptop screen)
   A chase-camera 3D view built with three.js. The driving still happens on
   a flat map of real coordinates (x = longitude, y = latitude), exactly as
   before; the 3D world is drawn on top of that map.
   ===================================================================== */
function startHost() {
  const T = THREE, $ = id => document.getElementById(id);
  $("hostView").classList.remove("hidden");
  const store = { get(k, d) { try { return localStorage.getItem("gr_" + k) || d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem("gr_" + k, v); } catch (e) { } } };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
  const smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  const angLerp = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

  // ------------------------------------------------------------------
  // renderer, scene, camera
  // ------------------------------------------------------------------
  const renderer = new T.WebGLRenderer({ canvas: $("game"), antialias: true, powerPreference: "high-performance" });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(62, 1, 2, 30000);
  let vw = 1, vh = 1, quality = Math.min(1.5, window.devicePixelRatio || 1);
  function resize() {
    vw = innerWidth; vh = innerHeight; renderer.setPixelRatio(quality); renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh; camera.updateProjectionMatrix();
    const fx = $("fx"); fx.width = vw; fx.height = vh;
    if (mini && mini.S) setupMini();
  }
  addEventListener("resize", resize); resize();

  const hemi = new T.HemisphereLight(0xffffff, 0x333333, .5); scene.add(hemi);
  const sun = new T.DirectionalLight(0xffffff, 1); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0015; sun.shadow.normalBias = 1.5;
  Object.assign(sun.shadow.camera, { left: -170, right: 170, top: 170, bottom: -170, near: 10, far: 1200 }); sun.shadow.camera.updateProjectionMatrix();
  const sunDir = new T.Vector3();

  // ------------------------------------------------------------------
  // game state
  // ------------------------------------------------------------------
  let worldKey = "moon", WD = WORLDS.moon, W = { w: 1, h: 1 }, sites = [], stars = [], labels = [];
  const found = new Set(), starsGot = new Set();
  const deepSeen = new Set(); let deepI = 0;
  const rover = { x: 0, y: 0, h: -Math.PI / 2, v: 0, alt: 0, vy: 0, air: false, pitch: 0, roll: 0, steer: 0, boost: 0, gPrev: 0, gVy: 0 };
  let mode = "lobby", bookOpen = false, card = null, cardKind = null, lastPing = -1, countT = 0, countN = -1;
  let revive = null, shake = 0, camH = rover.h, beepT = 0, sig = 0, sigDist = "", time = 0;
  const keys = {}, phone = { s: 0, g: 0, r: 0, t: 0 };

  const toXY = (lat, lon) => [(lon - WD.lonMin) * WD.ppd, (WD.latMax - lat) * WD.ppd];
  const wdx = dx => WD.wrap ? dx - Math.round(dx / W.w) * W.w : dx;   // shortest east-west distance on a wrapped planet
  const rx = x => rover.x + wdx(x - rover.x);                          // where to draw something so it's on the near side

  // ------------------------------------------------------------------
  // terrain: hills, dunes and craters from repeatable "noise"
  // ------------------------------------------------------------------
  function hash(ix, iy, seed) {
    let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
  }
  const wrapI = (i, cell) => { if (!WD.wrap) return i; const p = Math.round(W.w / cell); return ((i % p) + p) % p; };
  function vn(x, y, cell, seed) {
    let fx = x / cell, fy = y / cell; const ix = Math.floor(fx), iy = Math.floor(fy); fx -= ix; fy -= iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), a = wrapI(ix, cell), b = wrapI(ix + 1, cell);
    return lerp(lerp(hash(a, iy, seed), hash(b, iy, seed), sx), lerp(hash(a, iy + 1, seed), hash(b, iy + 1, seed), sx), sy);
  }
  const ti = { shade: 0, tint: 0, c: 0 }; // extra info from the last height lookup, used for colouring
  // Places obstacles must keep away from: every ghost, every science star and the start. (Filled in by buildWorld.)
  let clearPts = [], craterMemo = new Map();
  const isClear = (px, pz, rad) => !clearPts.some(c => Math.hypot(wdx(c.x - px), c.y - pz) < rad + c.r);
  function craterCell(ix, iz, cell, prob, rmin, rmax) { // the crater (if any) that lives in one square of the map
    const m = wrapI(ix, cell), key = m * 8191 + iz; let c = craterMemo.get(key);
    if (c === undefined) {
      c = null;
      if (hash(m, iz, 21) <= prob) {
        const q = hash(m, iz, 22), r = rmin + q * q * (rmax - rmin), fx = .2 + .6 * hash(m, iz, 23), fz = .2 + .6 * hash(m, iz, 24);
        // On Mars craters are obstacles, so none may sit on a ghost, a star or the start
        if (worldKey === "moon" || isClear((m + fx) * cell, (iz + fz) * cell, r * 1.2)) c = { r, fx, fz };
      }
      craterMemo.set(key, c);
    }
    return c;
  }
  function craters(x, z, cell, prob, rmin, rmax) {
    let out = 0, c = 0; const cx = Math.floor(x / cell), cz = Math.floor(z / cell), steep = worldKey !== "moon"; // Mars craters have tall, steep rims
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const ix = cx + dx, iz = cz + dz, cr = craterCell(ix, iz, cell, prob, rmin, rmax); if (!cr) continue;
      const r = cr.r, d = Math.hypot(x - (ix + cr.fx) * cell, z - (iz + cr.fz) * cell) / r; if (d > 1.6) continue;
      if (d < 1) { out += r * (steep ? .3 : .2) * (d * d - 1); c -= .13 * (1 - d); }
      const e = (d - 1) / .22, rim = Math.exp(-e * e); out += r * (steep ? .17 : .07) * rim; c += .1 * rim;
    }
    ti.c = c; return out;
  }
  function rawH(x, z) {
    const big = vn(x, z, 1200, 11), mid = vn(x, z, 300, 12), sm = vn(x, z, 75, 13);
    let h, shade = (mid - .5) * .16 + (sm - .5) * .1;
    if (worldKey === "moon") {
      h = (big - .5) * 60 + (mid - .5) * 16 + (sm - .5) * 3 + craters(x, z, 400, .62, 30, 140);
      shade += ti.c;
    } else {
      const d = vn(x, z * 2.6, 400, 14), ridge = 1 - Math.abs(2 * d - 1);
      h = (big - .5) * 90 + ridge * ridge * 28 + (mid - .5) * 10 + (sm - .5) * 2 + craters(x, z, 900, .25, 40, 110);
      shade += (ridge * ridge - .3) * .2 + ti.c;
    }
    ti.shade = shade; ti.tint = big; return h;
  }
  function H(x, z) { // ground height, flattened a little around each landing site
    let h = rawH(x, z);
    for (const s of sites) {
      const dx = wdx(s.x - x), dz = s.y - z, d2 = dx * dx + dz * dz;
      if (d2 < 40000) { const w = 1 - smooth((Math.sqrt(d2) - 80) / 120); h += (s.h0 - h) * w; ti.shade *= 1 - w; }
    }
    return h;
  }

  const TN = 120, TC = 30, TV = TN + 1;
  const tGeo = new T.BufferGeometry(), tPos = new Float32Array(TV * TV * 3), tCol = new Float32Array(TV * TV * 3);
  { const idx = []; for (let j = 0; j < TN; j++) for (let i = 0; i < TN; i++) { const a = j * TV + i; idx.push(a, a + TV, a + 1, a + 1, a + TV, a + TV + 1); }
    tGeo.setIndex(idx); tGeo.setAttribute("position", new T.BufferAttribute(tPos, 3)); tGeo.setAttribute("color", new T.BufferAttribute(tCol, 3)); }
  const terrain = new T.Mesh(tGeo, new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  terrain.frustumCulled = false; terrain.receiveShadow = true; scene.add(terrain);
  let tcx = 1e9, tcz = 1e9;

  // optional real maps: moon.jpg / mars.jpg (full-globe, equirectangular) next to index.html
  const maps = {};
  for (const k in WORLDS) {
    const img = new Image();
    img.onload = () => {
      maps[k] = { img };
      try { const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0, 1024, 512); maps[k].px = g.getImageData(0, 0, 1024, 512).data; } catch (e) { }
      if (k === worldKey) tcx = 1e9;
    };
    img.src = k + ".jpg";
  }
  function mapLum(x, z) { // brightness of the real map at this spot, or -1 if there's no map
    const m = maps[worldKey]; if (!m || !m.px) return -1;
    const lon = WD.lonMin + (((x % W.w) + W.w) % W.w) / WD.ppd, lat = clamp(WD.latMax - z / WD.ppd, -89.9, 89.9);
    const u = Math.floor((lon + 180) / 360 * 1024) & 1023, v = Math.floor((90 - lat) / 180 * 512), i = (v * 1024 + u) * 4;
    return (m.px[i] + m.px[i + 1] + m.px[i + 2]) / 765;
  }

  function updateTerrain(cx, cz) {
    tcx = cx; tcz = cz; const moon = worldKey === "moon"; let p = 0;
    listObstacles(cx, cz);
    for (let j = 0; j < TV; j++) for (let i = 0; i < TV; i++) {
      const x = cx + (i - TN / 2) * TC, z = cz + (j - TN / 2) * TC, h = H(x, z);
      tPos[p] = x; tPos[p + 1] = h; tPos[p + 2] = z;
      const lum = mapLum(x, z); let r, g, b;
      if (moon) {
        let v = .58 + ti.shade - Math.max(0, .5 - ti.tint) * .45; if (lum >= 0) v = v * .45 + lum * .75;
        r = v * .97; g = v * .98; b = v * 1.05;
      } else {
        const k = ti.tint, s = ti.shade, m = lum >= 0 ? .55 + lum * .9 : 1;
        r = (lerp(.66, .86, k) + s) * m; g = (lerp(.29, .43, k) + s * .75) * m; b = (lerp(.17, .24, k) + s * .5) * m;
      }
      for (const sd of sands) { const d = Math.hypot(x - sd.x, z - sd.z) / sd.r; if (d < 1.15) { const k = 1 - smooth((d - .8) / .35); r *= 1 - .2 * k; g *= 1 - .26 * k; b *= 1 - .3 * k; } } // soft sand is a little darker
      tCol[p] = r; tCol[p + 1] = g; tCol[p + 2] = b; p += 3;
    }
    tGeo.attributes.position.needsUpdate = true; tGeo.attributes.color.needsUpdate = true;
    updateProps(cx, cz);
  }

  // rocks and (on Mars) flat-topped mesas, scattered the same way every time
  const dummy = new T.Object3D(), tmpC = new T.Color();
  const rocks = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), new T.MeshLambertMaterial({ flatShading: true }), 520);
  rocks.castShadow = true; rocks.receiveShadow = true; rocks.frustumCulled = false; scene.add(rocks);
  const mesaGeo = new T.CylinderGeometry(.7, 1, 1, 7); mesaGeo.translate(0, .5, 0);
  const mesas = new T.InstancedMesh(mesaGeo, new T.MeshLambertMaterial({ flatShading: true }), 60);
  mesas.frustumCulled = false; scene.add(mesas);
  // ---- Mars obstacles (Level 2). Each kind lives on its own grid of squares, so they are the same every game. ----
  // All of them keep clear of ghosts, stars and the start, so every ghost can always be reached.
  function mesaAt(ix, iz) {
    const m = wrapI(ix, 900); if (hash(m, iz, 41) > .34) return null;
    const x = (ix + .15 + .7 * hash(m, iz, 42)) * 900, z = (iz + .15 + .7 * hash(m, iz, 43)) * 900, r = 70 + hash(m, iz, 44) * 110;
    return isClear(x, z, r + 30) ? { x, z, r: r * .95, R: r, hgt: 60 + hash(m, iz, 45) * 100, m, iz, kind: "mesa" } : null;
  }
  function boulderAt(ix, iz) { // solid rocks to steer around
    const m = wrapI(ix, 300); if (hash(m, iz, 51) > .3) return null;
    const x = (ix + .2 + .6 * hash(m, iz, 52)) * 300, z = (iz + .2 + .6 * hash(m, iz, 53)) * 300, r = 13 + hash(m, iz, 54) * 12;
    return isClear(x, z, r) ? { x, z, r, m, iz, kind: "boulder" } : null;
  }
  function sandAt(ix, iz) { // soft sand that slows the rover down
    const m = wrapI(ix, 600); if (hash(m, iz, 61) > .36) return null;
    const x = (ix + .2 + .6 * hash(m, iz, 62)) * 600, z = (iz + .2 + .6 * hash(m, iz, 63)) * 600, r = 70 + hash(m, iz, 64) * 50;
    return isClear(x, z, r) ? { x, z, r, m, iz, kind: "sand" } : null;
  }
  function craterAt(ix, iz) { const c = craterCell(ix, iz, 900, .25, 40, 110); return c ? { x: (ix + c.fx) * 900, z: (iz + c.fz) * 900, r: c.r, kind: "crater" } : null; }
  function gather(fn, cell, cx, cz, reach, out) { const a = Math.round(cx / cell), b = Math.round(cz / cell), n = Math.ceil(reach / cell); for (let ix = a - n; ix <= a + n; ix++) for (let iz = b - n; iz <= b + n; iz++) { const o = fn(ix, iz); if (o) out.push(o); } return out; }
  let solids = [], sands = [];
  function listObstacles(cx, cz) {
    solids = []; sands = []; if (worldKey === "moon") return; // the Moon is the easy level: nothing blocks the rover there
    gather(mesaAt, 900, cx, cz, 2700, solids); gather(boulderAt, 300, cx, cz, 1500, solids); gather(craterAt, 900, cx, cz, 1800, solids);
    gather(sandAt, 600, cx, cz, 1800, sands);
  }
  const boulders = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0), new T.MeshLambertMaterial({ flatShading: true }), 160);
  boulders.castShadow = true; boulders.frustumCulled = false; scene.add(boulders);
  const rimGeo = new T.TorusGeometry(1, .16, 5, 28); rimGeo.rotateX(Math.PI / 2);
  const rims = new T.InstancedMesh(rimGeo, new T.MeshLambertMaterial({ color: 0x9c4426, flatShading: true }), 40); // raised crater rims you can see coming
  rims.castShadow = true; rims.frustumCulled = false; rims.count = 0; scene.add(rims);
  const ripples = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial({ color: 0x7c3520, flatShading: true }), 700);
  ripples.frustumCulled = false; scene.add(ripples);

  function updateProps(cx, cz) {
    const moon = worldKey === "moon"; let n = 0;
    const c0 = Math.round(cx / 90), z0 = Math.round(cz / 90), dens = moon ? .16 : .42, big = moon ? 3 : 4; // just a few small rocks on the Moon
    for (let ix = c0 - 11; ix <= c0 + 11; ix++) for (let iz = z0 - 11; iz <= z0 + 11; iz++) {
      const m = wrapI(ix, 90); if (hash(m, iz, 31) > dens || n >= 520) continue;
      const px = (ix + hash(m, iz, 32)) * 90, pz = (iz + hash(m, iz, 33)) * 90, q = hash(m, iz, 34), s = 1.4 + q * q * big;
      if (sites.some(t => Math.hypot(wdx(t.x - px), t.y - pz) < 70)) continue;
      dummy.position.set(px, H(px, pz) + s * .25, pz); dummy.rotation.set(q * 6, q * 40, q * 17); dummy.scale.set(s, s * .75, s * (.8 + q * .5)); dummy.updateMatrix();
      rocks.setMatrixAt(n, dummy.matrix);
      const v = .8 + hash(m, iz, 35) * .35; rocks.setColorAt(n, moon ? tmpC.setRGB(.5 * v, .5 * v, .54 * v) : tmpC.setRGB(.62 * v, .3 * v, .2 * v)); n++;
    }
    rocks.count = n; rocks.instanceMatrix.needsUpdate = true; if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;

    let nm = 0, nb = 0, nr = 0, nc = 0;
    for (const o of solids) {
      if (o.kind === "mesa" && nm < 60) {
        dummy.position.set(o.x, H(o.x, o.z) - 20, o.z); dummy.rotation.set(0, hash(o.m, o.iz, 46) * 6, 0); dummy.scale.set(o.R, o.hgt + 20, o.R * (.7 + hash(o.m, o.iz, 47) * .5)); dummy.updateMatrix();
        mesas.setMatrixAt(nm, dummy.matrix); const v = .85 + hash(o.m, o.iz, 48) * .3; mesas.setColorAt(nm++, tmpC.setRGB(.7 * v, .33 * v, .2 * v));
      } else if (o.kind === "crater" && nc < 40) {
        let lo = 1e9; for (let a = 0; a < 6.3; a += .8) lo = Math.min(lo, H(o.x + Math.cos(a) * o.r, o.z + Math.sin(a) * o.r));
        dummy.position.set(o.x, lo + o.r * .04, o.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(o.r * 1.02, o.r * .9, o.r * 1.02); dummy.updateMatrix(); rims.setMatrixAt(nc++, dummy.matrix);
      } else if (o.kind === "boulder" && nb < 160) {
        const q = hash(o.m, o.iz, 55); dummy.position.set(o.x, H(o.x, o.z) + o.r * .3, o.z); dummy.rotation.set(q * 5, q * 30, q * 11); dummy.scale.set(o.r * 1.05, o.r * (.8 + q * .3), o.r * 1.05); dummy.updateMatrix();
        boulders.setMatrixAt(nb, dummy.matrix); const v = .8 + q * .3; boulders.setColorAt(nb++, tmpC.setRGB(.47 * v, .2 * v, .15 * v));
      }
    }
    for (const sd of sands) for (let k = -3; k <= 3; k++) { // wavy ripple lines across each sand patch
      const off = k * sd.r * .26, half = Math.sqrt(Math.max(0, sd.r * sd.r * .85 - off * off));
      for (let seg = -1; seg <= 1 && nr < 700; seg++) {
        const lx = seg * half * .66, x = sd.x + lx, z = sd.z + off + Math.sin(lx * .05 + k) * 5;
        dummy.position.set(x, H(x, z) + .5, z); dummy.rotation.set(0, Math.cos(lx * .05 + k) * .2, 0); dummy.scale.set(half * .68, 1, 3.2); dummy.updateMatrix(); ripples.setMatrixAt(nr++, dummy.matrix);
      }
    }
    mesas.count = nm; mesas.instanceMatrix.needsUpdate = true; if (mesas.instanceColor) mesas.instanceColor.needsUpdate = true;
    rims.count = nc; rims.instanceMatrix.needsUpdate = true;
    boulders.count = nb; boulders.instanceMatrix.needsUpdate = true; if (boulders.instanceColor) boulders.instanceColor.needsUpdate = true;
    ripples.count = nr; ripples.instanceMatrix.needsUpdate = true;
  }
  // Can every ghost and star be reached from the start? Flood-fills a grid of the whole map around the solid obstacles. (Used by tests.)
  function reachable() {
    const g = 30, gw = Math.ceil(W.w / g), gh = Math.ceil(W.h / g), blocked = new Uint8Array(gw * gh), all = [];
    gather(mesaAt, 900, W.w / 2, W.h / 2, Math.max(W.w, W.h) / 2 + 900, all); gather(boulderAt, 300, W.w / 2, W.h / 2, Math.max(W.w, W.h) / 2 + 300, all); gather(craterAt, 900, W.w / 2, W.h / 2, Math.max(W.w, W.h) / 2 + 900, all);
    if (worldKey === "moon") all.length = 0;
    for (const o of all) { const R = o.r + 20, n = Math.ceil(R / g); for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) { if (Math.hypot(a, b) * g > R) continue; let gx = Math.floor(o.x / g) + a; const gy = Math.floor(o.z / g) + b; if (WD.wrap) gx = ((gx % gw) + gw) % gw; if (gx >= 0 && gx < gw && gy >= 0 && gy < gh) blocked[gy * gw + gx] = 1; } }
    const seen = new Uint8Array(gw * gh), [sx, sy] = toXY(WD.start[0], WD.start[1]), cell = (x, y) => Math.floor(y / g) * gw + ((Math.floor(x / g) % gw) + gw) % gw, q = [cell(sx, sy)]; seen[q[0]] = 1;
    while (q.length) { const c = q.pop(), x = c % gw, y = (c - x) / gw; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let nx = x + dx; const ny = y + dy; if (WD.wrap) nx = (nx + gw) % gw; if (nx < 0 || nx >= gw || ny < 0 || ny >= gh) continue; const k = ny * gw + nx; if (!seen[k] && !blocked[k]) { seen[k] = 1; q.push(k); } } }
    return { obstacles: all.length, ghosts: sites.map(s => [s.id, !!seen[cell(s.x, s.y)]]), stars: stars.map(s => [s.id, !!seen[cell(s.x, s.y)]]) };
  }

  // ------------------------------------------------------------------
  // sky: dome, stars, Earth, Sun, far-away hills
  // ------------------------------------------------------------------
  const skyGeo = new T.SphereGeometry(20000, 24, 16);
  skyGeo.setAttribute("color", new T.BufferAttribute(new Float32Array(skyGeo.attributes.position.count * 3), 3));
  const sky = new T.Mesh(skyGeo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -10; scene.add(sky);
  function paintSky(zenith, horizon, ground) {
    const p = skyGeo.attributes.position, c = skyGeo.attributes.color, a = new T.Color(zenith), b = new T.Color(horizon), g = new T.Color(ground);
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 20000; if (y < -.005) tmpC.copy(g); else tmpC.copy(b).lerp(a, Math.pow(clamp(y, 0, 1), .55)); c.setXYZ(i, tmpC.r, tmpC.g, tmpC.b); }
    c.needsUpdate = true;
  }
  const starPts = (() => {
    const n = 1400, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 * Math.PI, y = Math.random() * .98 + .02, r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(u) * r * 15000, y * 15000, Math.sin(u) * r * 15000], i * 3);
      const v = .5 + Math.random() * .5; col.set([v, v, v * (1 + Math.random() * .15)], i * 3);
    }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("color", new T.BufferAttribute(col, 3));
    const pts = new T.Points(g, new T.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false }));
    pts.renderOrder = -9; scene.add(pts); return pts;
  })();
  function canvasTex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); return t; }
  const glowTex = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.25, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  const sunTex = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "#fff"); r.addColorStop(.16, "#fff"); r.addColorStop(.2, "rgba(255,255,255,.4)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  // A cartoon Earth, drawn here in code (not a photo)
  const earthTex = canvasTex(256, 256, (g) => {
    g.beginPath(); g.arc(128, 128, 120, 0, 7); g.clip();
    g.fillStyle = "#2f7fe0"; g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#4fc26a"; [[90, 90, 46, 34], [150, 150, 40, 52], [60, 170, 26, 20], [185, 80, 30, 22], [120, 215, 34, 14]].forEach(([x, y, a, b], i) => { g.beginPath(); g.ellipse(x, y, a, b, i * .9, 0, 7); g.fill(); });
    g.fillStyle = "rgba(255,255,255,.85)"; [[70, 60, 50, 9], [160, 110, 60, 10], [100, 150, 44, 8], [170, 195, 50, 9], [128, 18, 70, 12], [128, 240, 70, 12]].forEach(([x, y, a, b], i) => { g.beginPath(); g.ellipse(x, y, a, b, -.2 + i * .13, 0, 7); g.fill(); });
    const s = g.createRadialGradient(80, 90, 40, 128, 128, 150); s.addColorStop(0, "rgba(0,0,30,0)"); s.addColorStop(.7, "rgba(0,0,30,.15)"); s.addColorStop(1, "rgba(0,0,30,.75)"); g.fillStyle = s; g.fillRect(0, 0, 256, 256);
  });
  const sprite = (map, o) => { const s = new T.Sprite(new T.SpriteMaterial(Object.assign({ map, fog: false, depthWrite: false, transparent: true }, o))); scene.add(s); return s; };
  const earth = sprite(earthTex, {}); earth.scale.set(1500, 1500, 1); earth.renderOrder = -8;
  const earthGlow = sprite(glowTex, { color: 0x6fb4ff, opacity: .35, blending: T.AdditiveBlending }); earthGlow.scale.set(3200, 3200, 1); earthGlow.renderOrder = -8.5;
  const sunSp = sprite(sunTex, { blending: T.AdditiveBlending }); sunSp.renderOrder = -8;
  const earthDir = new T.Vector3(0, .25, 1).normalize();

  function ridge(radius, seg, fn, top, bottom) { // a ring of far-away hills that follows the camera
    const pos = [], col = [], idx = [], a = new T.Color(top), b = new T.Color(bottom);
    for (let i = 0; i <= seg; i++) {
      const u = i / seg * Math.PI * 2, x = Math.cos(u) * radius, z = Math.sin(u) * radius, h = fn(i % seg, seg);
      pos.push(x, -260, z, x, h, z); col.push(b.r, b.g, b.b, lerp(b.r, a.r, h / 260), lerp(b.g, a.g, h / 260), lerp(b.b, a.b, h / 260));
      if (i < seg) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new T.BufferGeometry(); g.setIndex(idx); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide, fog: false })); m.frustumCulled = false; m.renderOrder = -5; return m;
  }
  const loopNoise = (i, n, cell, seed) => { const f = i / cell, a = Math.floor(f), k = smooth(f - a), p = Math.round(n / cell); return lerp(hash(a % p, 0, seed), hash((a + 1) % p, 0, seed), k); };
  let ridges = [];

  // ------------------------------------------------------------------
  // particles (dust and sparkles)
  // ------------------------------------------------------------------
  function Particles(n, additive) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 4), size = new Float32Array(n);
    const vel = new Float32Array(n * 3), life = new Float32Array(n), max = new Float32Array(n), par = new Float32Array(n * 5); // gravity, drag, grow, alpha, floor
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("aCol", new T.BufferAttribute(col, 4)); g.setAttribute("aSize", new T.BufferAttribute(size, 1));
    const mat = new T.ShaderMaterial({
      uniforms: { uScale: { value: 500 } }, transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending,
      vertexShader: "attribute float aSize; attribute vec4 aCol; varying vec4 vCol; uniform float uScale; void main(){ vCol=aCol; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=aSize*uScale/max(1.0,-mv.z); gl_Position=projectionMatrix*mv; }",
      fragmentShader: "varying vec4 vCol; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5," + (additive ? "0.05" : "0.3") + ",d); if(a<0.01) discard; gl_FragColor=vec4(vCol.rgb,vCol.a*a); }"
    });
    const pts = new T.Points(g, mat); pts.frustumCulled = false; scene.add(pts);
    let next = 0;
    return {
      mat,
      emit(x, y, z, vx, vy, vz, lf, sz, r, gg, b, a, grav, drag, grow, floor) {
        const i = next; next = (next + 1) % n;
        pos.set([x, y, z], i * 3); vel.set([vx, vy, vz], i * 3); col.set([r, gg, b, a], i * 4); size[i] = sz; life[i] = max[i] = lf;
        par.set([grav || 0, drag || 0, grow || 0, a, floor == null ? -1e9 : floor], i * 5);
      },
      update(dt) {
        for (let i = 0; i < n; i++) {
          if (life[i] <= 0) continue;
          life[i] -= dt; const p = i * 3, q = i * 5;
          vel[p + 1] -= par[q] * dt; const dr = Math.max(0, 1 - par[q + 1] * dt); vel[p] *= dr; vel[p + 1] *= dr; vel[p + 2] *= dr;
          pos[p] += vel[p] * dt; pos[p + 1] += vel[p + 1] * dt; pos[p + 2] += vel[p + 2] * dt; size[i] += par[q + 2] * dt;
          if (life[i] <= 0 || pos[p + 1] < par[q + 4]) { life[i] = 0; size[i] = 0; col[i * 4 + 3] = 0; }
          else col[i * 4 + 3] = par[q + 3] * Math.min(1, life[i] / max[i] * 2.5);
        }
        g.attributes.position.needsUpdate = g.attributes.aCol.needsUpdate = g.attributes.aSize.needsUpdate = true;
      },
      clear() { life.fill(0); size.fill(0); }
    };
  }
  const dust = Particles(700, false), spark = Particles(700, true);
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ------------------------------------------------------------------
  // the player's rover, its tracks, dust devils
  // ------------------------------------------------------------------
  const R = Models.playerRover(store.get("color", ROVER_COLORS[1][1]));
  R.group.rotation.order = "YZX"; scene.add(R.group);
  let bodyOff = 0, bodyVel = 0, wheelSpin = 0, blink = 2;

  const trackGeo = new T.PlaneGeometry(7, 5.5); trackGeo.rotateX(-Math.PI / 2);
  const TRN = 900, tracks = new T.InstancedMesh(trackGeo, new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .28, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), TRN);
  tracks.frustumCulled = false; tracks.count = 0; scene.add(tracks);
  let trackI = 0, trackLast = [1e9, 1e9];
  function layTrack() {
    if (Math.hypot(rover.x - trackLast[0], rover.y - trackLast[1]) < 7) return; trackLast = [rover.x, rover.y];
    const c = Math.cos(rover.h), s = Math.sin(rover.h);
    for (const side of [-12.5, 12.5]) {
      const x = rover.x - s * side - c * 10, z = rover.y + c * side - s * 10;
      dummy.position.set(x, H(x, z) + .6, z); dummy.rotation.set(0, -rover.h, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      tracks.setMatrixAt(trackI % TRN, dummy.matrix); trackI++;
    }
    tracks.count = Math.min(TRN, trackI); tracks.instanceMatrix.needsUpdate = true;
  }

  const devils = [];
  { const m = new T.MeshBasicMaterial({ color: 0xe9b98a, transparent: true, opacity: .2, side: T.DoubleSide, depthWrite: false });
    for (let k = 0; k < 4; k++) {
      const g = new T.Group(); g.userData = { x: 0, z: 0, seed: k * 7.3, far: true };
      for (let i = 0; i < 7; i++) { const r = 5 + i * 3.4, c = new T.Mesh(new T.CylinderGeometry(r + 3.6, r, 24, 9, 1, true), m); c.position.y = 12 + i * 23; g.add(c); }
      scene.add(g); devils.push(g);
    } }

  // ------------------------------------------------------------------
  // things that belong to one world: ghosts, science stars, place names
  // ------------------------------------------------------------------
  let worldGroup = new T.Group(); scene.add(worldGroup);
  function textSprite(text, o) {
    const c = document.createElement("canvas"), g = c.getContext("2d"), fs = 64, font = "700 " + fs + "px Fredoka, ui-rounded, system-ui, sans-serif";
    g.font = font; const w = Math.ceil(g.measureText(text).width) + 50; c.width = w; c.height = 100;
    g.font = font; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.lineWidth = 16; g.strokeStyle = o.stroke || "#141a3c"; g.strokeText(text, w / 2, 52);
    g.fillStyle = o.color || "#fff"; g.fillText(text, w / 2, 52);
    const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, fog: o.fog !== false, opacity: o.opacity || 1 }));
    s.scale.set(o.h * w / 100, o.h, 1); return s;
  }
  const beamTex = canvasTex(4, 256, (g) => { const r = g.createLinearGradient(0, 256, 0, 0); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.25, "rgba(255,255,255,.5)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 4, 256); });
  const beamGeo = new T.CylinderGeometry(1, 1, 1, 14, 1, true); beamGeo.translate(0, .5, 0);
  const ringGeo = new T.RingGeometry(.86, 1, 40); ringGeo.rotateX(-Math.PI / 2);
  const starGeo = Models.starGeo(10, 4.6, 4), starMat = new T.MeshLambertMaterial({ color: 0xffd23f, emissive: 0xb07a00, flatShading: true });

  function buildWorld() {
    scene.remove(worldGroup);
    worldGroup.traverse(o => { if (o.isSprite && o.material.map) { o.material.map.dispose(); o.material.dispose(); } });
    worldGroup = new T.Group(); scene.add(worldGroup);
    sites = WD.sites.map(s => { const [x, y] = toXY(s.lat, s.lon); return Object.assign({}, s, { x, y }); });
    stars = WD.stars.map(([lat, lon, fact], i) => { const [x, y] = toXY(lat, lon); return { id: worldKey + i, x, y, fact }; });
    { const [sx, sy] = toXY(WD.start[0], WD.start[1]); clearPts = sites.map(s => ({ x: s.x, y: s.y, r: 230 })).concat(stars.map(s => ({ x: s.x, y: s.y, r: 90 })), [{ x: sx, y: sy, r: 260 }]); craterMemo = new Map(); }
    for (const s of sites) s.h0 = rawH(s.x, s.y);
    for (const s of sites) {
      const g = new T.Group(); g.position.set(s.x, s.h0, s.y); worldGroup.add(g); s.g = g;
      s.model = Models.hardware(s.type, s); s.model.scale.setScalar(1.3); s.model.rotation.y = hash(s.lat * 100 | 0, 3, 5) * 6; g.add(s.model);
      const bm = () => new T.MeshBasicMaterial({ map: beamTex, color: 0x59d8ff, transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
      s.beam = new T.Mesh(beamGeo, bm()); s.beam.scale.set(9, 1700, 9); g.add(s.beam);
      s.core = new T.Mesh(beamGeo, bm()); s.core.material.color.set(0xffffff); s.core.scale.set(2.2, 1700, 2.2); g.add(s.core);
      s.ring = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color: 0x59d8ff, transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); s.ring.position.y = 1.5; g.add(s.ring);
      s.q = textSprite("?", { h: 34, color: "#59d8ff", fog: false }); s.q.position.y = 78; g.add(s.q);
      s.tag = textSprite(s.name, { h: 11, color: "#ffd23f" }); s.tag.position.y = 66; g.add(s.tag);
      s.light = new T.PointLight(0x59d8ff, 1.2, 260, 1.5); s.light.position.y = 30; g.add(s.light);
      setSiteAlive(s, found.has(s.id));
    }
    for (const s of stars) {
      const g = new T.Group(); worldGroup.add(g); s.g = g; s.h0 = H(s.x, s.y);
      s.mesh = new T.Mesh(starGeo, starMat); g.add(s.mesh);
      const gl = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xffd23f, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false })); gl.scale.set(60, 60, 1); g.add(gl);
      g.visible = !starsGot.has(s.id);
    }
    labels = WD.labels.map(([name, lat, lon]) => {
      const [x, y] = toXY(lat, lon), sp = textSprite(name, { h: 44, opacity: .85 }); sp.position.set(x, H(x, y) + 150, y); worldGroup.add(sp); return { x, sp };
    });
  }
  function setSiteAlive(s, alive) {
    s.alive = alive; Models.setHolo(s.model, !alive);
    s.beam.visible = s.core.visible = s.ring.visible = s.q.visible = !alive; s.light.visible = !alive;
  }

  function setWorld(k) {
    worldKey = k; WD = WORLDS[k]; W = { w: (WD.lonMax - WD.lonMin) * WD.ppd, h: (WD.latMax - WD.latMin) * WD.ppd };
    sites = []; buildWorld();
    [rover.x, rover.y] = toXY(WD.start[0], WD.start[1]);
    Object.assign(rover, { v: 0, h: -Math.PI / 2, vy: 0, air: false, boost: 0, alt: H(rover.x, rover.y) }); rover.gPrev = rover.alt; camH = rover.h;
    trackI = 0; tracks.count = 0; dust.clear(); spark.clear(); tcx = 1e9; lastPing = -1;
    const moon = k === "moon";
    // the look of each world
    if (moon) {
      scene.fog = new T.Fog(0x55565c, 800, 1780); paintSky(0x000000, 0x000000, 0x55565c);
      hemi.color.set(0x8c93b0); hemi.groundColor.set(0x2a2b33); hemi.intensity = .5; sun.color.set(0xffffff); sun.intensity = 1.25; sunDir.set(-.72, .36, .6).normalize();
      sunSp.material.color.set(0xffffff); sunSp.scale.set(2600, 2600, 1);
    } else {
      scene.fog = new T.Fog(0xe9b990, 500, 1780); paintSky(0xb9825a, 0xf2c79c, 0xe9b990);
      hemi.color.set(0xffe0c0); hemi.groundColor.set(0x8a5234); hemi.intensity = .78; sun.color.set(0xfff0dc); sun.intensity = .8; sunDir.set(-.5, .62, .6).normalize();
      sunSp.material.color.set(0xfff3d6); sunSp.scale.set(1700, 1700, 1);
    }
    // holograms glow (additive) against the black lunar sky, but need solid colour to show up against the bright Mars sky
    const blend = moon ? T.AdditiveBlending : T.NormalBlending;
    Models.holoFace.blending = Models.holoLine.blending = blend; Models.holoFace.color.set(moon ? 0x59d8ff : 0x19b6ff); Models.holoLine.color.set(moon ? 0xaef1ff : 0xe8fbff);
    Models.holoFace.needsUpdate = Models.holoLine.needsUpdate = true;
    for (const st of sites) { [st.beam, st.core, st.ring].forEach(m => { m.material.blending = blend; m.material.needsUpdate = true; }); st.beam.material.color.set(moon ? 0x59d8ff : 0x12a8ff); }
    starPts.visible = earth.visible = earthGlow.visible = moon;
    devils.forEach(d => { d.visible = !moon; d.userData.far = true; });
    ridges.forEach(r => { scene.remove(r); r.geometry.dispose(); });
    ridges = moon
      ? [ridge(1790, 180, (i, n) => 40 + loopNoise(i, n, 15, 3) * 130 + loopNoise(i, n, 4, 4) * 30, 0xa9abb4, 0x55565c),
         ridge(1770, 180, (i, n) => 15 + loopNoise(i, n, 9, 5) * 70 + loopNoise(i, n, 3, 6) * 14, 0x7c7e87, 0x55565c)]
      : [ridge(1790, 180, (i, n) => 60 + loopNoise(i, n, 12, 7) * 190 + loopNoise(i, n, 3, 8) * 40, 0xd29a78, 0xe9b990),
         ridge(1770, 180, (i, n) => 20 + (loopNoise(i, n, 10, 9) > .55 ? 85 + loopNoise(i, n, 30, 10) * 50 : loopNoise(i, n, 5, 11) * 40), 0xb8663f, 0xe9b990)];
    ridges.forEach(r => scene.add(r));
    $("hudWorld").textContent = (moon ? "🌕 " : "🔴 ") + WD.label;
    setupMini();
    document.querySelectorAll(".pick").forEach(b => b.classList.toggle("on", b.dataset.world === k));
    if (mode !== "lobby") Sfx.music(k);
    padLight(); showClock();
    updateHud(); sendState();
  }
  function nearestUnfound() {
    let best = null, bd = Infinity;
    for (const s of sites) if (!found.has(s.id)) { const d = Math.hypot(wdx(s.x - rover.x), s.y - rover.y); if (d < bd) { bd = d; best = s; } }
    return best ? { s: best, d: bd } : null;
  }

  // ------------------------------------------------------------------
  // input and actions (keyboard, on-screen buttons and the phone all end up here)
  // ------------------------------------------------------------------
  // Keyboard. On menus and cards the arrow keys move between buttons and Enter presses the chosen one.
  const GAME_KEYS = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "enter", "escape", "m", "r", "b", "n", "p"]);
  const MENU_DIR = { arrowleft: -1, arrowup: -1, arrowright: 1, arrowdown: 1 };
  addEventListener("keydown", e => {
    const k = e.key.toLowerCase(); keys[k] = true; Sfx.init();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "enter"].includes(k)) e.preventDefault();
    if (e.repeat) return;
    if (GAME_KEYS.has(k)) setCtrl("kb");
    const menu = !!overlayNow() && mode !== "task";
    if (menu && k in MENU_DIR) { moveFocus(MENU_DIR[k]); return; }
    if (k === "enter" || k === " ") { if (menu && padFocus) padFocus.click(); else action("next"); }
    if (k === "m") action("world");
    if (k === "r") action("read");
    if (k === "b") action("book");
    if (k === "n") action("mute");
    if (k === "p") action("pause");
    if (k === "escape") action("back");
  });
  addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);
  addEventListener("pointerdown", () => Sfx.init());
  // Keyboard, phone and game controller are all read every frame. Whichever one is being used wins:
  // the strongest steering and the hardest pedal press count, so nobody has to switch anything.
  let pad = null, ctrlNow = "kb", kbSteer = 0;
  function updateKb(dt) { // keyboard steering eases in over about a third of a second, so it isn't twitchy, and lets go quickly
    const t = (keys.arrowleft || keys.a ? -1 : 0) + (keys.arrowright || keys.d ? 1 : 0);
    const rate = t !== 0 && (kbSteer === 0 || Math.sign(t) === Math.sign(kbSteer)) && Math.abs(t) > Math.abs(kbSteer) ? 3.2 : 8;
    kbSteer += clamp(t - kbSteer, -rate * dt, rate * dt);
  }

  // ---- mission tasks: a short hands-on job when a ghost wakes up, before its story card ----
  let taskSite = null, taskPulse = 0; const tasksDone = new Set();
  const taskSfx = { done: () => Sfx.found(), snap: () => Sfx.star(), bump: () => Sfx.bump(.3) };
  function startTask(st) {
    if (!Tasks.has(st.id)) { openCard(st, "site"); return; }
    mode = "task"; taskSite = st; rover.v = 0; $("toast").classList.remove("show"); toastT = 0; Tasks.has(st.id) && setTimeout(refreshPrompts, 0);
    Tasks.start(st.id, { world: worldKey, sfx: n => (taskSfx[n] || (() => { }))(), buzz: k => { Pad.rumble(k); vibe(k === "found" ? [80, 50, 120] : [25]); },
      onEnd: ok => {
        taskSite = null;
        if (ok) { tasksDone.add(st.id); addTime(10); toast("Bonus science star for finishing the task! +10s", "Mission task done ✓", "🛠"); }
        openCard(st, "site");
      } });
    sendState();
  }
  function stepTask(dt) { // the task uses the same controls as driving: steer moves the pointer, drive (or Enter, or Cross) grabs
    const i = input(); taskPulse -= dt;
    const phoneHold = phone.h && performance.now() - phone.t < 1200; if (phoneHold) setCtrl("phone");
    Tasks.step(dt, { x: i.s, hold: i.g > 0 || keys.enter || keys[" "] || (pad && pad.down.cross) || phoneHold || taskPulse > 0 });
  }

  // ---- which input is being used: the HUD pill and every on-screen button prompt follow it ----
  function setCtrl(kind) { if (kind !== ctrlNow) { ctrlNow = kind; refreshPrompts(); } }
  function refreshPrompts() {
    const k = ctrlNow, P = Prompts, key = P.key, set = (id, act) => { const el = $(id); if (el) el.dataset.key = act ? P.label(k, act) : ""; };
    $("hudCtrl").textContent = "Driving with: " + P.K[k].name;
    document.querySelectorAll(".way").forEach(w => w.classList.toggle("on", w.dataset.way === k));
    set("cardNext", "next"); set("cardRead", "read"); set("reportKeep", "next"); set("kbStart", "next"); set("howClose", "next"); set("pauseResume", "next");
    set("bookClose", k === "phone" ? "next" : "back"); set("taskSkip", k === "phone" ? "" : "skip");
    const html = {
      card: { pad: P.line(k, [["next", "Keep exploring"], ["read", "Read aloud"], ["back", "Close"]]), kb: P.line(k, [["next", "Keep exploring"], ["read", "Read aloud"], ["back", "Close"]]),
        phone: "On your phone: " + key("NEXT") + " keep exploring · " + key("🔊") + " read aloud" },
      task: { pad: key("Left stick") + " move the hand · hold " + key("✕") + " to grab · " + key("○") + " skip", kb: key("←") + " " + key("→") + " move the hand · hold " + key("Enter") + " to grab · " + key("Esc") + " skip",
        phone: "Tilt to move the hand · hold " + key("NEXT") + " to grab · " + key("Skip") + " on your phone" },
      report: { pad: P.line(k, [["next", "Keep exploring"]]) + " · " + key("D-pad") + " choose a button", kb: P.line(k, [["next", "Keep exploring"]]) + " · " + key("←") + " " + key("→") + " choose a button",
        phone: "On your phone: " + key("NEXT") + " keep exploring" },
      book: { pad: key("○") + " or " + key("□") + " close", kb: key("Esc") + " or " + key("B") + " close", phone: "On your phone: " + key("NEXT") + " close" },
      pause: { pad: key("✕") + " or " + key("○") + " resume · " + key("D-pad") + " choose", kb: key("Enter") + " or " + key("Esc") + " resume · " + key("←") + " " + key("→") + " choose", phone: "On your phone: " + key("RESUME") }
    };
    $("cardKeys").innerHTML = html.card[k]; $("reportKeys").innerHTML = html.report[k]; $("bookKeys").innerHTML = html.book[k]; $("pauseKeys").innerHTML = html.pause[k];
    const tk = document.getElementById("taskKeys"); if (tk) tk.innerHTML = html.task[k];
  }
  function input() {
    const live = performance.now() - phone.t < 1200;
    let s = kbSteer, g = keys.arrowup || keys.w ? 1 : 0, r = keys.arrowdown || keys.s ? 1 : 0;
    if (s || g || r) setCtrl("kb");
    if (live) {
      if (phone.s || phone.g || phone.r) setCtrl("phone");
      if (Math.abs(phone.s) > Math.abs(s)) s = phone.s; if (phone.g) g = 1; if (phone.r) r = 1;
    }
    if (pad) {
      if (pad.steer || pad.gas || pad.brake) setCtrl("pad");
      if (Math.abs(pad.steer) > Math.abs(s)) s = pad.steer; g = Math.max(g, pad.gas); r = Math.max(r, pad.brake);
    }
    return { s, g, r };
  }

  // ---- game controller: buttons, menu focus, connect / disconnect messages ----
  const overlayNow = () => howOpen ? $("howto") : mode === "pause" ? $("pause") : bookOpen ? $("book") : mode === "card" ? $("card") : mode === "lobby" ? $("lobby") : mode === "report" ? $("report") : mode === "task" ? $("task") : null;
  let padFocus = null;
  function moveFocus(dir) {
    const ov = overlayNow(); if (!ov) return;
    const list = [...ov.querySelectorAll("button")].filter(b => b.offsetParent !== null); if (!list.length) return;
    let i = list.indexOf(padFocus); i = i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length;
    clearFocus(); padFocus = list[i]; padFocus.classList.add("padfocus"); padFocus.scrollIntoView({ block: "nearest" }); Sfx.click();
  }
  function clearFocus() { if (padFocus) padFocus.classList.remove("padfocus"); padFocus = null; }
  function pollPad() {
    pad = Pad.poll(); $("padChip").classList.toggle("hidden", !pad);
    if (!pad) return;
    if (padFocus && (!overlayNow() || !overlayNow().contains(padFocus) || padFocus.offsetParent === null)) clearFocus();
    for (const b of pad.pressed) {
      Sfx.init(); setCtrl("pad");
      if (b === "cross") { if (padFocus) padFocus.click(); else action("next"); }
      else if (b === "circle") { action("back"); clearFocus(); }
      else if (b === "triangle") action("read");
      else if (b === "square") action("book");
      else if (b === "options") action("pause");
      else if (b === "left" || b === "up") moveFocus(-1);
      else if (b === "right" || b === "down") moveFocus(1);
    }
  }
  addEventListener("gamepadconnected", () => {
    toast("Controller connected!", "Ready to drive", "🎮"); setCtrl("pad"); setTimeout(() => Pad.rumble("hello"), 120);
    $("padStatus").textContent = "🎮 Connected! Press ✕ to start."; if (Pad.lights.supported) $("lightsBtn").classList.remove("hidden");
  });
  addEventListener("gamepaddisconnected", () => {
    $("padStatus").textContent = "Plug in by USB or pair by Bluetooth, then press any button.";
    if (ctrlNow === "pad") lostInput("🎮 The controller disconnected. Plug it back in, or keep going with the keyboard or a phone.");
    else toast("Controller disconnected", "", "🎮");
  });
  // An input dropped out mid-game: pause so nobody loses time, and let them carry on with another one.
  function lostInput(msg) { if (mode === "play" || mode === "task" || mode === "count") openPause(msg); else toast(msg, "Input disconnected", "⚠️"); }

  // ---- pause menu (P, Options) ----
  let pausePrev = "play";
  function openPause(msg) {
    if (mode === "count") { mode = "play"; $("count").innerHTML = ""; $("intro").classList.remove("show"); countN = -1; }
    if (mode !== "play" && mode !== "task") return;
    pausePrev = mode; mode = "pause"; rover.v = 0; clearFocus();
    $("pauseMsg").textContent = msg || ""; $("pauseMsg").classList.toggle("hidden", !msg);
    $("pauseWorld").classList.toggle("hidden", pausePrev !== "play"); $("pauseTitle").classList.toggle("hidden", pausePrev !== "play");
    $("pauseWorld").textContent = worldKey === "moon" ? "Go to Mars 🚀" : "Go to the Moon 🚀"; paintSound();
    $("pause").classList.remove("hidden"); showClock(); sendState();
  }
  function resume() { $("pause").classList.add("hidden"); clearFocus(); mode = pausePrev; showClock(); sendState(); }
  function paintSound() { $("pauseSound").textContent = Sfx.muted ? "🔇 Sound: Off" : "🔊 Sound: On"; }
  function toTitle() { resume(); mode = "lobby"; Sfx.music(null); $("lobby").classList.remove("hidden"); hudEls.forEach(id => $(id).classList.add("hidden")); showClock(); sendState(); }
  $("pauseResume").onclick = () => action("next"); $("pauseWorld").onclick = () => action("world"); $("pauseSound").onclick = () => { action("mute"); paintSound(); }; $("pauseTitle").onclick = toTitle;

  // ---- How to play (title screen) ----
  let howOpen = false;
  function openHow() { howOpen = true; clearFocus(); $("howto").classList.remove("hidden"); }
  function closeHow() { howOpen = false; clearFocus(); $("howto").classList.add("hidden"); }
  $("howBtn").onclick = openHow; $("howClose").onclick = closeHow;
  // optional extra: match the DualSense lightbar to the planet (Chrome / Edge, USB). The game is the same without it.
  const padLight = () => Pad.lights.color(...(worldKey === "moon" ? [90, 120, 255] : [255, 90, 10]));
  $("lightsBtn").onclick = async () => { const ok = await Pad.lights.connect(); if (ok) await padLight(); $("lightsBtn").textContent = ok ? "💡 Lights on" : "💡 Lights not available"; };

  function action(a) {
    if (a === "mute") { Sfx.setMuted(!Sfx.muted); store.set("mute", Sfx.muted ? "1" : ""); $("muteBtn").textContent = Sfx.muted ? "🔇" : "🔊"; return; }
    if (howOpen) { if (a === "next" || a === "back") closeHow(); return; }
    if (mode === "pause") {
      if (a === "next" || a === "back" || a === "pause") resume();
      else if (a === "world" && pausePrev === "play") { resume(); setWorld(worldKey === "moon" ? "mars" : "moon"); beginCount(); }
      return;
    }
    if (mode === "task") { // a quick tap (phone NEXT, Enter) counts as a short grab
      if (a === "next") taskPulse = .3; else if (a === "back" || a === "skip") Tasks.skip(); else if (a === "pause") openPause();
      return;
    }
    if (a === "book") { if (mode === "play" || bookOpen) toggleBook(); return; }
    if (bookOpen) { if (a === "next" || a === "back") toggleBook(); return; }
    if (a === "pause") { if (mode === "play" || mode === "count") openPause(); return; }
    if (a === "back") { // close a card (after the reading pause), or pause the game while driving
      if (mode === "card") { if (!cardUnlockAt) closeCard(); }
      else if (mode === "play") openPause();
      return;
    }
    if (a === "next") {
      if (mode === "report") keepExploring();
      else if (mode === "lobby") startPlay();
      else if (mode === "card") { if (cardUnlockAt) return; closeCard(); } // still in the 5-second reading pause
    } else if (a === "world") {
      if (mode === "lobby") setWorld(worldKey === "moon" ? "mars" : "moon");
      else if (mode === "play") { setWorld(worldKey === "moon" ? "mars" : "moon"); beginCount(); }
    } else if (a === "read" && mode === "card") readAloud();
  }

  // ------------------------------------------------------------------
  // title screen, countdown
  // ------------------------------------------------------------------
  ROVER_COLORS.forEach(([name, hex]) => {
    const b = document.createElement("button"); b.className = "sw"; b.style.background = hex; b.title = name; b.setAttribute("aria-label", name + " rover");
    b.onclick = () => { R.setColor(hex); store.set("color", hex); mark(); Sfx.init(); Sfx.click(); };
    $("swatches").appendChild(b);
    function mark() { [...$("swatches").children].forEach(c => c.classList.toggle("on", c === b)); }
    if (store.get("color", ROVER_COLORS[1][1]) === hex) mark();
  });
  document.querySelectorAll(".pick").forEach(b => b.onclick = () => { Sfx.init(); Sfx.click(); if (worldKey !== b.dataset.world) setWorld(b.dataset.world); });
  document.querySelectorAll(".pick").forEach(b => { const w = WORLDS[b.dataset.world]; b.querySelector("small").innerHTML = "<b></b> · " + w.sites.length + " ghosts"; b.querySelector("b").textContent = w.level; });

  // ---- mission timer. It only runs while you are actually driving: never during cards, the sticker book, the countdown or a wake-up. ----
  const clock = { left: {}, free: {}, on: store.get("timer", "1") !== "0", sec: -1 };
  const resetClock = k => { clock.left[k] = WORLDS[k].timeLimit; clock.free[k] = false; };
  resetClock("moon"); resetClock("mars");
  const fmt = t => { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); };
  const timing = () => clock.on && !clock.free[worldKey] && !sites.every(s => found.has(s.id));
  function showClock() {
    const el = $("hudTime"), t = clock.left[worldKey];
    el.classList.toggle("hidden", !clock.on || mode === "lobby");
    el.classList.toggle("low", timing() && t <= 30);
    $("timeTxt").textContent = clock.free[worldKey] ? "Free explore" : fmt(t);
  }
  function tickClock(dt) {
    if (!timing()) return;
    clock.left[worldKey] -= dt; const t = clock.left[worldKey], sec = Math.ceil(t);
    if (sec !== clock.sec) { clock.sec = sec; showClock(); if (sec <= 30 && sec > 0) Sfx.tick(); }
    if (t <= 0) openReport();
  }
  function addTime(n) { if (!timing()) return; clock.left[worldKey] += n; showClock(); const b = $("timeBonus"); b.textContent = "+" + n + "s"; b.classList.remove("go"); void b.offsetWidth; b.classList.add("go"); }
  const timerBtn = $("timerBtn"), paintTimerBtn = () => { timerBtn.textContent = "⏱ Timer: " + (clock.on ? "On" : "Off"); timerBtn.classList.toggle("off", !clock.on); };
  timerBtn.onclick = () => { clock.on = !clock.on; store.set("timer", clock.on ? "1" : "0"); paintTimerBtn(); Sfx.init(); Sfx.click(); }; paintTimerBtn();
  // time's up: a friendly report, never "game over". You can always carry on.
  function openReport() {
    mode = "report"; rover.v = 0;
    $("repWorld").textContent = WD.label; $("repGhosts").textContent = sites.filter(s => found.has(s.id)).length + " / " + sites.length; $("repStars").textContent = stars.filter(s => starsGot.has(s.id)).length + " / " + stars.length; const bonus = sites.filter(s => tasksDone.has(s.id)).length; $("repBonus").textContent = bonus ? "+ " + bonus + " task bonus " + (bonus > 1 ? "stars" : "star") : "";
    $("report").classList.remove("hidden"); showClock(); sendState();
  }
  function keepExploring() { clock.free[worldKey] = true; $("report").classList.add("hidden"); mode = "play"; showClock(); sendState(); }
  function tryAgain() { for (const s of sites) { found.delete(s.id); tasksDone.delete(s.id); } for (const s of stars) starsGot.delete(s.id); resetClock(worldKey); $("report").classList.add("hidden"); setWorld(worldKey); beginCount(); }
  $("reportKeep").onclick = keepExploring; $("reportRetry").onclick = tryAgain;
  const tips = new Set(); let bumpT = 0, sandBuzzT = 0;
  function tip(id, text) { if (tips.has(id)) return; tips.add(id); toast(text, "Mars tip", "💡"); }
  $("kbStart").onclick = () => action("next");
  $("bookBtn").onclick = () => action("book");
  $("bookClose").onclick = () => action("book");
  $("muteBtn").onclick = () => action("mute");
  if (store.get("mute", "")) { Sfx.setMuted(true); $("muteBtn").textContent = "🔇"; }
  const hudEls = ["hud", "hudR", "compass", "coords", "mini"];
  function startPlay() {
    Sfx.init(); $("lobby").classList.add("hidden"); hudEls.forEach(id => $(id).classList.remove("hidden"));
    Sfx.music(worldKey); beginCount();
  }
  function beginCount() { mode = "count"; countT = 0; countN = -1; rover.v = 0; $("intro").innerHTML = "<b></b><span></span>"; $("intro").firstChild.textContent = (worldKey === "moon" ? "🌕 " : "🔴 ") + WD.label; $("intro").lastChild.textContent = WD.level; $("intro").classList.add("show"); showClock(); sendState(); }
  function tickCount(dt) {
    countT += dt; const n = Math.floor(countT / .8);
    if (n !== countN) {
      countN = n;
      if (n < 3) { $("count").innerHTML = "<span>" + (3 - n) + "</span>"; Sfx.count(); vibe([30]); }
      else if (n === 3) { $("count").innerHTML = "<span style='color:#3ddc6f'>GO!</span>"; Sfx.go(); vibe([120]); mode = "play"; $("intro").classList.remove("show"); sendState(); }
    }
  }
  function clearCount(dt) { if (countN >= 3) { countT += dt; if (countT > 3.3) { $("count").innerHTML = ""; countN = -1; } } }

  // ------------------------------------------------------------------
  // story cards, sticker book, read aloud
  // ------------------------------------------------------------------
  const stickerImg = {};
  [].concat(WORLDS.moon.sites, WORLDS.mars.sites, DEEP).forEach(s => stickerImg[s.id] = Models.sticker(s.type, s));
  $("cardArt").appendChild(Models.thumbSetup().renderer.domElement);

  function openCard(site, kind) {
    card = site; cardKind = kind; mode = "card"; rover.v = 0;
    window.speechSynthesis && speechSynthesis.cancel();
    $("cardKicker").textContent = site.kicker; $("cardName").textContent = site.name; $("cardWhere").textContent = site.where;
    $("cardWow").textContent = site.wow || ""; $("cardWow").classList.toggle("hidden", !site.wow);
    $("cardStory").textContent = site.story;
    $("cardFacts").innerHTML = "";
    [["f1", "🔍 What I discovered", site.found], ["f2", "📍 Where I am now", site.now], ["f3", "🔧 Engineering secret", site.eng]].forEach(([c, t, txt]) => {
      if (!txt) return; const d = document.createElement("div"); d.className = "fact " + c; d.innerHTML = "<b></b><span></span>"; d.firstChild.textContent = t; d.lastChild.textContent = txt; $("cardFacts").appendChild(d);
    });
    $("cardTag").textContent = site.lat !== undefined ? `Real landing site: ${Math.abs(site.lat).toFixed(2)}°${site.lat >= 0 ? "N" : "S"}, ${Math.abs(site.lon).toFixed(2)}°${site.lon >= 0 ? "E" : "W"}` : "";
    $("cardRibbon").classList.toggle("hidden", kind === "world");
    const other = worldKey === "moon" ? "mars" : "moon", otherDone = WORLDS[other].sites.every(s => found.has(s.id));
    $("cardNext").textContent = kind === "world" ? (otherDone ? "Deep space signals… 📡" : other === "mars" ? "Launch to Mars 🚀" : "Fly to the Moon 🚀") : kind === "end" ? "Play again ↺" : kind === "deep" ? "Next signal 📡" : "Keep exploring ▶";
    startCardWait(site, kind);
    $("card").classList.toggle("deep", kind === "deep" || kind === "end");
    $("cardTag").classList.toggle("hidden", !$("cardTag").textContent);
    Models.thumbShow(site.type, site);
    $("card").classList.remove("hidden"); $("card").querySelector(".box").scrollTop = 0; sendState();
  }
  // ---- reading pause: the first time a ghost's or deep-space card opens, its main button waits 5 seconds ----
  let cardUnlockAt = 0; const cardSeen = new Set(), CARD_WAIT = 5;
  function startCardWait(site, kind) {
    const b = $("cardNext"), waits = (kind === "site" || kind === "deep" || kind === "end") && !!site.id && !cardSeen.has(site.id);
    if (site.id && kind !== "world") cardSeen.add(site.id);
    cardUnlockAt = waits ? performance.now() + CARD_WAIT * 1000 : 0;
    b.classList.remove("pop"); b.classList.toggle("locked", waits); b.disabled = waits; b.style.setProperty("--p", 0);
    if (waits) { const lk = document.createElement("span"); lk.className = "lk"; lk.innerHTML = "<b>" + CARD_WAIT + "</b>"; b.prepend(lk); }
  }
  function tickCardWait() {
    if (!cardUnlockAt) return;
    const b = $("cardNext"), left = (cardUnlockAt - performance.now()) / 1000;
    if (mode !== "card") { cardUnlockAt = 0; return; }
    if (left > 0) { b.style.setProperty("--p", 1 - left / CARD_WAIT); const n = b.querySelector(".lk b"); if (n) n.textContent = Math.ceil(left); return; }
    cardUnlockAt = 0; b.disabled = false; const lk = b.querySelector(".lk"); if (lk) lk.remove();
    b.classList.remove("locked"); void b.offsetWidth; b.classList.add("pop"); Sfx.chime(); sendState(true);
  }
  function closeCard() {
    window.speechSynthesis && speechSynthesis.cancel();
    $("card").classList.add("hidden");
    const k = cardKind; card = null; mode = "play";
    if (k === "site") {
      updateHud();
      if (sites.every(s => found.has(s.id))) {
        confetti(); Sfx.cheer(); vibe([80, 60, 80, 60, 200]);
        const scored = clock.on && !clock.free[worldKey]; // the time left is the score
        openCard(Object.assign({}, WORLD_DONE[worldKey], scored ? { wow: "Mission complete with " + fmt(clock.left[worldKey]) + " to spare! ⭐" } : {}), "world"); showClock();
      }
    } else if (k === "world") {
      const other = worldKey === "moon" ? "mars" : "moon";
      if (!WORLDS[other].sites.every(s => found.has(s.id))) { setWorld(other); beginCount(); }
      else { deepI = 0; confetti(); openDeep(); }
    } else if (k === "deep") {
      deepI++; openDeep();
    } else if (k === "end") {
      found.clear(); starsGot.clear(); deepSeen.clear(); tasksDone.clear(); resetClock("moon"); resetClock("mars"); mode = "lobby"; Sfx.music(null);
      setWorld("moon"); $("lobby").classList.remove("hidden"); hudEls.forEach(id => $(id).classList.add("hidden")); showClock();
    }
    sendState();
  }
  function openDeep() { const d = DEEP[deepI]; deepSeen.add(d.id); Sfx.found(); vibe([60, 40, 120]); openCard(d, deepI === DEEP.length - 1 ? "end" : "deep"); }
  function readAloud() {
    if (!card || !window.speechSynthesis) return;
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
    const txt = [card.name + ".", card.wow, card.story, card.found && "What I discovered. " + card.found, card.now && "Where I am now. " + card.now, card.eng && "Engineering secret. " + card.eng].filter(Boolean).join(" ");
    const u = new SpeechSynthesisUtterance(txt); u.rate = .95; speechSynthesis.speak(u);
  }
  $("cardNext").onclick = () => action("next");
  $("cardRead").onclick = () => action("read");

  function toggleBook() {
    bookOpen = !bookOpen; $("book").classList.toggle("hidden", !bookOpen); Sfx.click();
    if (bookOpen) {
      const body = $("bookBody"); body.innerHTML = "";
      const section = (title, list, have) => {
        const h = document.createElement("h3"); h.textContent = title; body.appendChild(h);
        const grid = document.createElement("div"); grid.className = "stickers"; body.appendChild(grid);
        list.forEach((s, i) => {
          const ok = have(s), d = document.createElement("div"); d.className = "stk" + (ok ? "" : " no"); d.style.setProperty("--r", ok ? ((i % 3) - 1) * 2.5 + "deg" : "0deg");
          const im = document.createElement("img"); im.src = stickerImg[s.id]; im.alt = ok ? s.name : "Not found yet"; d.appendChild(im);
          d.appendChild(document.createTextNode(ok ? (s.short || s.name) : "???")); grid.appendChild(d);
        });
      };
      section("🌕 The Moon", WORLDS.moon.sites, s => found.has(s.id));
      section("🔴 Mars", WORLDS.mars.sites, s => found.has(s.id));
      section("✨ Deep space", DEEP, s => deepSeen.has(s.id));
      section("🛠 Mission tasks", [].concat(WORLDS.moon.sites, WORLDS.mars.sites).filter(s => Tasks.has(s.id)).map(s => ({ id: s.id, name: Tasks.title(s.id), short: Tasks.title(s.id) })), s => tasksDone.has(s.id));
      const ul = $("bookFacts"); ul.innerHTML = "";
      for (const k in WORLDS) WORLDS[k].stars.forEach((s, i) => {
        const li = document.createElement("li"), ok = starsGot.has(k + i); li.className = ok ? "" : "no";
        li.textContent = ok ? s[2] : "A star is still waiting on " + (k === "moon" ? "the Moon" : "Mars") + "…"; ul.appendChild(li);
      });
      $("book").querySelector(".box").scrollTop = 0;
    }
    sendState();
  }

  let toastT = 0;
  function toast(txt, title, ico) { $("toast").classList.toggle("top", mode !== "play" && mode !== "count"); $("toastTxt").textContent = txt; $("toastTitle").textContent = title || "Science star!"; $("toastIco").textContent = ico || "⭐"; $("toast").classList.add("show"); toastT = title ? 4 : 8; }

  // confetti (drawn on a 2D canvas above the game)
  let conf = [];
  function confetti() {
    const cols = ["#ffd23f", "#59d8ff", "#ff7ac8", "#3ddc6f", "#ff9a2e", "#a970ff", "#fff"];
    for (let i = 0; i < 220; i++) conf.push({ x: vw * Math.random(), y: -20 - Math.random() * vh * .5, vx: rnd(-80, 80), vy: rnd(120, 380), r: rnd(0, 6), vr: rnd(-8, 8), w: rnd(8, 16), h: rnd(5, 10), c: cols[i % cols.length], t: rnd(4, 6.5) });
  }
  function drawConfetti(dt) {
    const g = $("fx").getContext("2d"); if (!conf.length && !drawConfetti.dirty) return;
    g.clearRect(0, 0, vw, vh); drawConfetti.dirty = conf.length > 0;
    conf = conf.filter(p => (p.t -= dt) > 0 && p.y < vh + 30);
    for (const p of conf) { p.x += p.vx * dt + Math.sin(p.t * 4 + p.w) * 40 * dt; p.y += p.vy * dt; p.r += p.vr * dt; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, Math.cos(p.r * 1.7)); g.fillStyle = p.c; g.globalAlpha = Math.min(1, p.t); g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore(); }
  }

  // ------------------------------------------------------------------
  // HUD
  // ------------------------------------------------------------------
  function updateHud() {
    $("hudFound").textContent = `${sites.filter(s => found.has(s.id)).length}/${sites.length}`;
    $("hudStars").textContent = `${stars.filter(s => starsGot.has(s.id)).length}/${stars.length}`;
  }
  function setSignal(n, label) {
    if (n !== sig) document.querySelectorAll("#signal .bars i").forEach((b, i) => b.classList.toggle("on", i < n));
    sig = n; sigDist = label;
  }
  // ---- minimap: a round "radar" centred on the rover, north always up ----
  // The picture-book terrain for the whole world is painted once to an offscreen canvas.
  // Each frame we only slide that picture under the rover and redraw the markers.
  var mini = { S: 0, dpr: 1, R: 0, Rin: 0, k: 1, range: 1, terrain: null, over: null, ready: false, job: 0, key: "" };
  const RIM = 21;
  const BANDS = { // low -> middle -> high ground, kept soft and low-contrast so the markers stand out
    moon: { cols: [[134, 148, 186], [186, 193, 212], [233, 236, 244]], cuts: [.4, .63], crater: "rgba(70,80,120,.22)", ring: "rgba(255,255,255,.4)" },
    mars: { cols: [[176, 78, 48], [226, 130, 70], [240, 196, 142]], cuts: [.4, .63], crater: "rgba(120,40,20,.24)", ring: "rgba(255,225,190,.4)" }
  };
  function setupMini() {
    const c = $("mini"), S = Math.round(Math.min(340, innerHeight * .44, innerWidth * .29)), dpr = Math.min(2, window.devicePixelRatio || 1), moon = worldKey === "moon";
    const range = moon ? 1800 : 1000; // how far the radar sees, in map units: about 450 km on the Moon, about 1,000 km on Mars
    Object.assign(mini, { S, dpr, R: S / 2, Rin: S / 2 - RIM, range, k: (S / 2 - RIM) / range });
    c.style.width = c.style.height = S + "px"; c.width = c.height = Math.round(S * dpr);
    c.style.setProperty("--glow", moon ? "#9db8ff" : "#ff9a3c");
    buildMiniOverlay();
    const key = worldKey + S; if (key !== mini.key) { mini.key = key; mini.ready = false; clearTimeout(mini.job); mini.job = setTimeout(buildMiniTerrain, 30); }
  }
  function buildMiniTerrain() {
    const { k, range } = mini, B = BANDS[worldKey], step = 40, mX = WD.wrap ? 0 : range, mY = range; // margins so the radar can look past the map edge
    const lw = Math.ceil((W.w + 2 * mX) / step), lh = Math.ceil((W.h + 2 * mY) / step) + 1;
    // 1) a small, smooth height picture (one sample every 40 map units), using the same big hills as the 3D ground
    const low = document.createElement("canvas"); low.width = lw + 2; low.height = lh;
    const lg = low.getContext("2d"), li = lg.createImageData(lw + 2, lh);
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw + 2; x++) {
      const wx = (x - 1) * step - mX, wz = y * step - mY, v = vn(wx, wz, 1200, 11) * .8 + vn(wx, wz, 600, 15) * .2, i = (y * (lw + 2) + x) * 4;
      li.data[i] = li.data[i + 1] = li.data[i + 2] = clamp(v, 0, 1) * 255; li.data[i + 3] = 255;
    }
    lg.putImageData(li, 0, 0);
    // 2) blow it up smoothly, then turn the heights into three flat colour bands with soft edges
    const tw = Math.ceil(W.w * k + 2 * mX * k), th = Math.ceil((W.h + 2 * mY) * k), c = document.createElement("canvas"); c.width = tw; c.height = th;
    const g = c.getContext("2d", { willReadFrequently: true }); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.drawImage(low, -step * k, 0, (lw + 2) * step * k, lh * step * k);
    const lut = [], lutOut = [], sm = (a, b, v) => smooth((v - a) / (b - a)), w = .02;
    for (let n = 0; n < 256; n++) {
      const v = n / 255, a = sm(B.cuts[0] - w, B.cuts[0] + w, v), b = sm(B.cuts[1] - w, B.cuts[1] + w, v);
      const col = [0, 1, 2].map(q => lerp(lerp(B.cols[0][q], B.cols[1][q], a), B.cols[2][q], b)), grey = (col[0] + col[1] + col[2]) / 3;
      lut.push(col); lutOut.push(col.map(q => lerp(q, grey, .45) * .8)); // ground beyond the edge of the map: greyer and darker
    }
    const im = g.getImageData(0, 0, tw, th), d = im.data, y0 = mY * k, y1 = (mY + W.h) * k, x0 = mX * k, x1 = (mX + W.w) * k;
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
      const i = (y * tw + x) * 4, col = (y < y0 || y > y1 || (!WD.wrap && (x < x0 || x > x1)) ? lutOut : lut)[d[i]];
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
    }
    g.putImageData(im, 0, 0);
    // 3) a few soft round craters: the biggest of the real craters you can drive into
    // 3) soft round craters (the biggest on the Moon; every one on Mars, because there they block the way) and soft sand patches
    const moon = worldKey === "moon", [cell, prob, rmin, rmax, keep] = moon ? [400, .62, 30, 140, 78] : [900, .25, 40, 110, 0];
    const blob = (x, z, r, fill, ring) => { for (const o of WD.wrap ? [-W.w, 0, W.w] : [0]) { const X = (x + o + mX) * k, Y = (z + mY) * k, rr = Math.max(3, r * k); g.fillStyle = fill; g.beginPath(); g.arc(X, Y, rr, 0, 7); g.fill(); if (ring) { g.strokeStyle = ring; g.lineWidth = 1.2; g.beginPath(); g.arc(X, Y, rr, .2, 2.6); g.stroke(); } } };
    if (!moon) for (let ix = 0; ix < W.w / 600; ix++) for (let iz = -2; iz <= Math.ceil((W.h + mY) / 600); iz++) { const sd = sandAt(ix, iz); if (sd) blob(sd.x, sd.z, sd.r, "rgba(110,44,26,.3)"); }
    for (let ix = Math.floor(-mX / cell) - 1; ix <= Math.ceil((W.w + mX) / cell); ix++) for (let iz = Math.floor(-mY / cell) - 1; iz <= Math.ceil((W.h + mY) / cell); iz++) {
      const cr = craterCell(ix, iz, cell, prob, rmin, rmax); if (!cr || cr.r < keep) continue;
      blob((ix + cr.fx) * cell, (iz + cr.fz) * cell, cr.r, B.crater, B.ring);
    }
    Object.assign(mini, { terrain: c, mX, mY, ready: true });
  }
  function buildMiniOverlay() { // very soft globe shading, glowing rim, curved planet name and the N for north
    const { S, dpr, R, Rin } = mini, moon = worldKey === "moon", c = document.createElement("canvas"); c.width = c.height = Math.round(S * dpr);
    const g = c.getContext("2d"); g.scale(dpr, dpr);
    const sh = g.createRadialGradient(R, R, Rin * .72, R, R, Rin); sh.addColorStop(0, "rgba(10,14,50,0)"); sh.addColorStop(.75, "rgba(10,14,50,.1)"); sh.addColorStop(1, "rgba(10,14,50,.38)");
    g.fillStyle = sh; g.beginPath(); g.arc(R, R, Rin, 0, 7); g.fill();
    const hi = g.createRadialGradient(R - Rin * .4, R - Rin * .45, 0, R - Rin * .4, R - Rin * .45, Rin * .8); hi.addColorStop(0, "rgba(255,255,255,.14)"); hi.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hi; g.beginPath(); g.arc(R, R, Rin, 0, 7); g.fill();
    const rim = g.createLinearGradient(0, 0, S, S); (moon ? ["#e3ebff", "#a9c0ff", "#7d94d6"] : ["#ffd898", "#ffa347", "#e8702a"]).forEach((col, i) => rim.addColorStop(i / 2, col));
    g.fillStyle = rim; g.beginPath(); g.arc(R, R, R - 1, 0, 7); g.arc(R, R, Rin, 0, 7, true); g.fill();
    g.lineWidth = 2.5; g.strokeStyle = "#141a3c"; g.beginPath(); g.arc(R, R, Rin, 0, 7); g.stroke();
    g.lineWidth = 2; g.strokeStyle = "rgba(255,255,255,.8)"; g.beginPath(); g.arc(R, R, R - 2, 0, 7); g.stroke();
    const name = moon ? "MOON" : "MARS", rr = Rin + RIM / 2, stepA = 17 / rr, mid = -.58;
    g.font = "700 17px Fredoka, ui-rounded, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#141a3c";
    [...name].forEach((ch, i) => { const a = mid + (i - (name.length - 1) / 2) * stepA; g.save(); g.translate(R + Math.sin(a) * rr, R - Math.cos(a) * rr); g.rotate(a); g.fillText(ch, 0, 1); g.restore(); });
    g.fillStyle = "#141a3c"; g.beginPath(); g.arc(R, RIM / 2 + 3, 12.5, 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke();
    g.fillStyle = "#fff"; g.font = "700 15px Fredoka, ui-rounded, system-ui, sans-serif"; g.fillText("N", R, RIM / 2 + 4);
    mini.over = c;
  }
  function miniGhost(g, X, Y, s, p) { // a little cyan ghost with a white outline
    g.fillStyle = "rgba(89,216,255," + (.2 + .18 * p) + ")"; g.beginPath(); g.arc(X, Y, s * (1.45 + p * .35), 0, 7); g.fill();
    g.beginPath(); g.arc(X, Y - s * .12, s * .82, Math.PI, 0); g.lineTo(X + s * .82, Y + s * .85);
    for (let i = 1; i <= 3; i++) g.quadraticCurveTo(X + s * .82 - (i - .5) * s * .547, Y + s * .5, X + s * .82 - i * s * .547, Y + s * .85);
    g.closePath(); g.lineJoin = "round";
    g.strokeStyle = "#0c2c4a"; g.lineWidth = 5; g.stroke(); g.strokeStyle = "#fff"; g.lineWidth = 2.6; g.stroke(); g.fillStyle = "#3fcfff"; g.fill();
    g.fillStyle = "#0c2c4a"; g.beginPath(); g.arc(X - s * .3, Y - s * .12, s * .16, 0, 7); g.arc(X + s * .3, Y - s * .12, s * .16, 0, 7); g.fill();
  }
  function miniStar(g, X, Y, s) { // a gold star with a dark outline
    g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? s * .48 : s * 1.08; g.lineTo(X + Math.cos(a) * r, Y + Math.sin(a) * r); } g.closePath();
    g.lineJoin = "round"; g.strokeStyle = "#3a2600"; g.lineWidth = 4; g.stroke(); g.fillStyle = "#ffd23f"; g.fill();
  }
  function drawMini() {
    const c = $("mini"), g = c.getContext("2d"), { S, dpr, R, Rin, k } = mini, moon = worldKey === "moon";
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, S, S);
    g.save(); g.beginPath(); g.arc(R, R, Rin, 0, 7); g.clip();
    if (mini.ready) { // slide the pre-painted world so the rover sits in the middle; on Mars it repeats east-west
      const t = mini.terrain, lonX = WD.wrap ? ((rover.x % W.w) + W.w) % W.w : rover.x, ox = R - (lonX + mini.mX) * k, oy = R - (rover.y + mini.mY) * k;
      if (WD.wrap) { const tw = W.w * k; for (let n = -1; n <= 1; n++) if (ox + n * tw < S && ox + (n + 1) * tw > 0) g.drawImage(t, 0, 0, t.width, t.height, ox + n * tw, oy, tw + .6, t.height); }
      else g.drawImage(t, ox, oy);
    } else { g.fillStyle = moon ? "#bac1d4" : "#e28246"; g.fillRect(0, 0, S, S); }
    const GS = 9.5, edge = Rin - 29; // marker size, and how far out a marker may sit so it is never cut off
    const place = s => { const dx = wdx(s.x - rover.x) * k, dy = (s.y - rover.y) * k, d = Math.hypot(dx, dy) || 1, f = Math.min(1, edge / d); return { X: R + dx * f, Y: R + dy * f, d, out: d > edge, a: Math.atan2(dy, dx) }; };
    // science stars: tiny soft sparkles, only when they are well inside the circle
    for (const s of stars) if (!starsGot.has(s.id)) { const p = place(s); if (p.d > Rin - 8) continue; g.fillStyle = "rgba(255,244,170,.95)"; g.strokeStyle = "rgba(120,80,0,.55)"; g.lineWidth = 1;
      g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 1.3 : 4; g.lineTo(p.X + Math.cos(a) * r, p.Y + Math.sin(a) * r); } g.closePath(); g.stroke(); g.fill(); }
    // dashed cyan line to the nearest ghost still waiting (or to its icon on the rim)
    const near = nearestUnfound();
    if (near) { const p = place(near.s); g.setLineDash([7, 5]); g.lineDashOffset = -time * 16; g.lineCap = "round";
      g.strokeStyle = "rgba(12,44,74,.7)"; g.lineWidth = 4.5; g.beginPath(); g.moveTo(R, R); g.lineTo(p.X, p.Y); g.stroke();
      g.strokeStyle = "#7fe6ff"; g.lineWidth = 2.4; g.stroke(); g.setLineDash([]); }
    // found ghosts are gold stars; they shrink away at the edge instead of being cut off
    for (const s of sites) if (found.has(s.id)) { const p = place(s), f = clamp((edge + 10 - p.d) / 10, 0, 1); if (f > 0) miniStar(g, p.X, p.Y, GS * f); }
    // unfound ghosts: inside the circle when in range, otherwise pinned to the rim in their real direction
    const todo = sites.filter(s => !found.has(s.id)).map(s => [s, place(s)]).sort((a, b) => b[1].d - a[1].d);
    for (const [s, p] of todo) {
      const pulse = .5 + .5 * Math.sin(time * 3 + s.x * .01);
      if (p.out) { // small arrowhead on the rim side shows it is farther that way
        const ax = Math.cos(p.a), ay = Math.sin(p.a), tx = p.X + ax * (GS * .8 + 7), ty = p.Y + ay * (GS * .8 + 7);
        g.beginPath(); g.moveTo(tx + ax * 5, ty + ay * 5); g.lineTo(tx - ay * 5 - ax * 2, ty + ax * 5 - ay * 2); g.lineTo(tx + ay * 5 - ax * 2, ty - ax * 5 - ay * 2); g.closePath();
        g.lineJoin = "round"; g.strokeStyle = "#0c2c4a"; g.lineWidth = 3; g.stroke(); g.fillStyle = "#7fe6ff"; g.fill();
        miniGhost(g, p.X, p.Y, GS * .8, pulse);
      } else miniGhost(g, p.X, p.Y, GS, pulse);
    }
    // the rover: a chunky white arrow pointing the way it faces, with a soft pulse ring
    const pr = (time * .9) % 1;
    g.strokeStyle = "rgba(255,255,255," + (1 - pr) * .85 + ")"; g.lineWidth = 2.5; g.beginPath(); g.arc(R, R, 10 + pr * 16, 0, 7); g.stroke();
    g.save(); g.translate(R, R); g.rotate(rover.h); g.lineJoin = "round";
    g.beginPath(); g.moveTo(15, 0); g.lineTo(-10, -10.5); g.lineTo(-4.5, 0); g.lineTo(-10, 10.5); g.closePath();
    g.strokeStyle = "#141a3c"; g.lineWidth = 5; g.stroke(); g.fillStyle = "#fff"; g.fill(); g.restore();
    g.restore();
    if (mini.over) g.drawImage(mini.over, 0, 0, S, S);
  }

  // ------------------------------------------------------------------
  // networking: the laptop is the "host", phones connect to it
  // ------------------------------------------------------------------
  const conns = new Set();
  function send(msg) { conns.forEach(c => { try { c.open && c.send(msg); } catch (e) { } }); }
  function vibe(p) { send({ t: "vibe", p }); }
  let lastSent = "";
  function sendState(force) {
    const st = { t: "state", mode: bookOpen ? "book" : mode, world: WD.short, sig, dist: sigDist, found: sites.filter(s => found.has(s.id)).length, total: sites.length,
      stars: stars.filter(s => starsGot.has(s.id)).length, card: card ? card.name : "", wait: cardUnlockAt ? Math.max(1, Math.ceil((cardUnlockAt - performance.now()) / 1000)) : 0 };
    const key = JSON.stringify(st); if (!force && key === lastSent) return; lastSent = key; send(st);
  }
  setInterval(() => sendState(true), 1000);

  if (location.protocol === "file:") $("fileWarn").classList.remove("hidden");
  if (window.Peer) {
    const peer = new Peer("ghostrovers-" + Math.random().toString(36).slice(2, 8));
    peer.on("open", id => {
      const url = location.origin + location.pathname + "?join=" + id;
      const q = qrcode(0, "M"); q.addData(url); q.make();
      $("qr").innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
      $("joinUrl").textContent = url; $("peerStatus").textContent = "Waiting for a phone…";
    });
    peer.on("connection", conn => {
      conn.on("open", () => {
        conns.add(conn); $("peerStatus").textContent = "📱 Phone connected! Tap START on the phone."; setCtrl("phone");
        sendState(true);
      });
      conn.on("data", d => {
        if (!d || typeof d !== "object") return;
        if (d.t === "i") { phone.s = clamp(+d.s || 0, -1, 1); phone.g = !!d.g; phone.r = !!d.r; phone.t = performance.now(); }
        else if (d.t === "h") { phone.h = !!d.h; phone.t = performance.now(); if (phone.h) setCtrl("phone"); } // NEXT held down (grabbing in a task)
        else if (d.t === "a" && ["next", "world", "read", "book", "skip"].includes(d.a)) { setCtrl("phone"); action(d.a); }
      });
      const gone = () => {
        if (!conns.has(conn)) return; conns.delete(conn); phone.g = phone.r = phone.h = false; phone.s = 0;
        if (!conns.size) { $("peerStatus").textContent = "Phone disconnected. Scan again to rejoin."; if (ctrlNow === "phone") lostInput("📱 The phone disconnected. Scan the code again, or keep going with the keyboard or a controller."); }
      };
      conn.on("close", gone); conn.on("error", gone);
    });
    peer.on("disconnected", () => { try { peer.reconnect(); } catch (e) { } });
    peer.on("error", e => { $("peerStatus").textContent = "Phone link isn't available right now (" + (e.type || e.message) + "). The controller and keyboard work."; });
  } else {
    $("qr").textContent = "Couldn't load the phone link. The controller and keyboard work.";
    $("peerStatus").textContent = "";
  }

  // ------------------------------------------------------------------
  // game update
  // ------------------------------------------------------------------
  function update(dt) {
    time += dt;
    if (toastT > 0 && (toastT -= dt) <= 0) $("toast").classList.remove("show");
    if (bookOpen) return;
    if (mode === "play") tickClock(dt);
    if (mode === "count") tickCount(dt); else clearCount(dt);
    if (mode === "revive") tickRevive(dt);
    const playing = mode === "play", inp = playing ? input() : { s: 0, g: 0, r: 0 };
    const moon = worldKey === "moon";

    // --- driving (on the flat map, same as before) ---
    rover.boost = Math.max(0, rover.boost - dt);
    const top = WD.maxV * (rover.boost > 0 ? 1.55 : 1) * (rover.sand ? .3 : 1);
    if (playing) {
      // pedals are analog: a light squeeze of a trigger drives slowly, a full press drives at full speed
      const target = inp.g > 0 ? top * inp.g : inp.r > 0 ? -WD.maxV * .45 * inp.r : 0, acc = rover.sand && Math.abs(rover.v) > top ? 700 : target === 0 ? 420 : rover.boost > 0 ? 900 : inp.r > 0 && rover.v > 0 ? 360 + 340 * inp.r : 360;
      rover.v += clamp(target - rover.v, -acc * dt, acc * dt);
    } else rover.v *= Math.pow(.02, dt);
    rover.steer = lerp(rover.steer, inp.s, 1 - Math.exp(-10 * dt));
    const grip = Math.min(1, Math.abs(rover.v) / 90) * (rover.air ? .35 : 1);
    rover.h += rover.steer * 2.1 * dt * grip * (rover.v < 0 ? -1 : 1);
    rover.x += Math.cos(rover.h) * rover.v * dt; rover.y += Math.sin(rover.h) * rover.v * dt;
    if (!WD.wrap) rover.x = clamp(rover.x, 40, W.w - 40);
    rover.y = clamp(rover.y, 40, W.h - 40);
    // Mars obstacles: bump off mesas, boulders and crater rims; soft sand slows the rover right down
    rover.sand = false; bumpT -= dt;
    for (const o of solids) {
      const dx = rover.x - o.x, dz = rover.y - o.z, d = Math.hypot(dx, dz), min = o.r + 16; if (d >= min || d === 0) continue;
      const nx = dx / d, nz = dz / d, headOn = -(Math.cos(rover.h) * nx + Math.sin(rover.h) * nz) * Math.sign(rover.v || 1);
      rover.x = o.x + nx * min; rover.y = o.z + nz * min;
      if (Math.abs(rover.v) > 70 && headOn > .2) {
        rover.v = o.kind !== "mesa" && headOn > .6 ? -rover.v * .35 : rover.v * .75; // a small bounce straight back, or a glancing slide. No damage.
        if (bumpT <= 0) { bumpT = .35; shake = Math.max(shake, .4); Sfx.bump(.35); vibe([20]); Pad.rumble("bump"); bodyVel += 12; }
        if (o.kind === "crater") tip("crater", "This crater's rim is too steep to climb. Find the gentle way around!");
      }
    }
    for (const sd of sands) if (Math.hypot(rover.x - sd.x, rover.y - sd.z) < sd.r) { rover.sand = true; tip("sand", "Careful! Spirit the rover got stuck in soft sand like this in 2009."); }
    sandBuzzT -= dt; if (rover.sand && Math.abs(rover.v) > 20 && sandBuzzT <= 0) { sandBuzzT = .7; Pad.rumble("sand"); vibe([450]); } // long low rumble in soft sand

    const c = Math.cos(rover.h), s = Math.sin(rover.h), sp = Math.abs(rover.v);
    // --- up and down: follow the ground, and float after bumps (low gravity!) ---
    const ground = H(rover.x, rover.y), gVy = (ground - rover.gPrev) / dt; rover.gPrev = ground;
    if (!rover.air) {
      if (gVy < rover.gVy - WD.gravity * dt * 1.5 && rover.gVy > 22 && Math.abs(rover.v) > 100) { rover.air = true; rover.vy = rover.gVy; }
      else { rover.alt = ground; rover.vy = gVy; }
    }
    if (rover.air) {
      rover.vy -= WD.gravity * dt; rover.alt += rover.vy * dt;
      if (rover.alt <= ground) {
        const hit = Math.max(0, gVy - rover.vy); rover.alt = ground; rover.air = false; bodyVel -= hit * .35;
        if (hit > 30) { shake = Math.max(shake, Math.min(1, hit / 130)); Sfx.bump(hit / 150); vibe([25]); for (let i = 0; i < 24; i++) puff(rnd(-14, 14), rnd(-12, 12), 1.6); }
      }
    }
    rover.gVy = gVy;
    const hf = H(rover.x + c * 15, rover.y + s * 15), hb = H(rover.x - c * 15, rover.y - s * 15);
    const hr = H(rover.x - s * 12, rover.y + c * 12), hl = H(rover.x + s * 12, rover.y - c * 12);
    const k = 1 - Math.exp(-(rover.air ? 2 : 12) * dt);
    rover.pitch = lerp(rover.pitch, rover.air ? clamp(rover.vy / 300, -.3, .3) : Math.atan2(hf - hb, 30), k);
    rover.roll = lerp(rover.roll, rover.air ? 0 : Math.atan2(hl - hr, 24), k);

    // --- the rover model: bounce, wheels, eyes ---
    bodyVel += (-150 * bodyOff - 9 * bodyVel) * dt; bodyOff = clamp(bodyOff + bodyVel * dt, -5, 5);
    R.group.position.set(rover.x, rover.alt, rover.y);
    R.group.rotation.set(rover.roll + rover.steer * Math.min(1, Math.abs(rover.v) / 200) * -.08, -rover.h, rover.pitch);
    R.body.position.y = bodyOff + Math.sin(time * 30) * Math.min(.5, Math.abs(rover.v) / 500);
    wheelSpin -= rover.v * dt / 6.6;
    for (const w of R.wheels) {
      const wx = rover.x + c * w.userData.x - s * w.userData.z, wz = rover.y + s * w.userData.x + c * w.userData.z;
      const want = rover.air ? -2.5 : clamp(H(wx, wz) - (rover.alt + w.userData.x * Math.sin(rover.pitch) - w.userData.z * Math.sin(rover.roll)), -4, 4.5);
      w.position.y = lerp(w.position.y, 6.6 + want, 1 - Math.exp(-18 * dt)); w.rotation.z = wheelSpin;
    }
    R.pupils.forEach((p, i) => p.position.z = (i ? -3.3 : 3.3) + rover.steer * 1);
    R.head.rotation.y = -rover.steer * .35;
    blink -= dt; if (blink < 0) blink = rnd(2, 5); R.eyes.forEach(e => e.scale.y = blink < .12 ? .15 : 1); R.pupils.forEach(e => e.visible = blink >= .12);
    R.ant.rotation.z = lerp(R.ant.rotation.z, rover.v / WD.maxV * .45 + bodyVel * .01, 1 - Math.exp(-8 * dt));
    R.flame.visible = rover.boost > 0; if (R.flame.visible) R.flame.scale.set(rnd(.8, 1.2), rnd(.8, 1.4), rnd(.8, 1.2));

    // --- dust and tracks ---
    if (!rover.air && sp > 40) { layTrack(); const n = Math.random() < sp / 140 ? 2 : 1; for (let i = 0; i < n; i++) puff(-13, Math.random() < .5 ? 12.5 : -12.5, 1); }
    if (rover.boost > 0) for (let i = 0; i < 3; i++) spark.emit(rover.x - c * 26 + rnd(-3, 3), rover.alt + 15 + rnd(-3, 3), rover.y - s * 26 + rnd(-3, 3), -c * rnd(40, 120), rnd(-10, 20), -s * rnd(40, 120), rnd(.25, .5), rnd(6, 11), 1, rnd(.5, .8), .15, .9, 0, 2, -10);
    function puff(lx, lz, power) {
      const x = rover.x + c * lx - s * lz, z = rover.y + s * lx + c * lz, y = rover.alt + 1.5, dir = Math.sign(rover.v) || 1;
      if (moon) dust.emit(x, y, z, -c * dir * sp * rnd(.1, .3) * power + rnd(-14, 14), rnd(22, 55) * power, -s * dir * sp * rnd(.1, .3) * power + rnd(-14, 14), 3, rnd(2.5, 5), .78, .78, .82, .85, WD.gravity, 0, 0, y - 3);
      else dust.emit(x, y, z, -c * dir * rnd(8, 28) + rnd(-10, 10) + 14, rnd(6, 20) * power, -s * dir * rnd(8, 28) + rnd(-10, 10), rnd(1.4, 2.6), rnd(6, 10), .9, .62, .42, .4, -3, 1.2, 13);
    }

    // --- ghosts: glow, sparkle, and wake up when the rover arrives ---
    for (const st of sites) {
      st.g.position.x = rx(st.x);
      if (st.alive) continue;
      const d = Math.hypot(wdx(st.x - rover.x), st.y - rover.y), rv = revive && revive.s === st;
      if (!rv) { st.model.position.y = 5 + Math.sin(time * 1.6 + st.x) * 3; st.model.rotation.y += dt * .35; }
      const pulse = (time * .7 + st.x * .01) % 1; st.ring.scale.setScalar(40 + pulse * 70); st.ring.material.opacity = .8 * (1 - pulse);
      st.beam.material.opacity = (.55 + .2 * Math.sin(time * 3 + st.x)) * (moon ? 1 : .75); st.core.material.opacity = moon ? .8 : .55; st.q.position.y = 80 + Math.sin(time * 2.4) * 5;
      if (d < 1100 && Math.random() < .5) { const a = rnd(0, 6.3), r = rnd(4, 38); spark.emit(st.g.position.x + Math.cos(a) * r, st.h0 + rnd(0, 20), st.y + Math.sin(a) * r, 0, rnd(18, 55), 0, rnd(.8, 1.8), rnd(2.5, 5), .6, .92, 1, 1, 0, 0, -1.5); }
      if (playing && d < 100 && !rover.air) startRevive(st);
    }
    Models.holoFace.opacity = (moon ? .3 : .5) + .1 * Math.sin(time * 9) + (Math.random() < .04 ? .2 : 0);

    // --- science stars ---
    for (const st of stars) {
      if (starsGot.has(st.id)) continue;
      st.g.position.set(rx(st.x), st.h0 + 20 + Math.sin(time * 2.5 + st.x) * 3, st.y); st.mesh.rotation.y = time * 2.2;
      if (playing && Math.hypot(wdx(st.x - rover.x), st.y - rover.y) < 36) {
        starsGot.add(st.id); st.g.visible = false; rover.boost = 2.4; toast(st.fact); Sfx.star(); Sfx.boost(); vibe([15]); Pad.rumble("star"); addTime(10); updateHud();
        for (let i = 0; i < 50; i++) { const a = rnd(0, 6.3), b = rnd(-1, 1.4), v = rnd(40, 140); spark.emit(st.g.position.x, st.g.position.y, st.y, Math.cos(a) * v, b * v, Math.sin(a) * v, rnd(.5, 1.1), rnd(4, 8), 1, .85, .3, 1, 120, 1, -4); }
      }
    }
    for (const l of labels) l.sp.position.x = rx(l.x);

    // --- dust devils (Mars) ---
    if (!moon) for (const d of devils) {
      const u = d.userData;
      if (u.far || Math.hypot(u.x - rover.x, u.z - rover.y) > 1500) { const a = rover.h + rnd(-1.1, 1.1), r = rnd(500, 1100); u.x = rover.x + Math.cos(a) * r; u.z = rover.y + Math.sin(a) * r; u.far = false; u.vx = rnd(25, 60); u.vz = rnd(-30, 30); }
      u.x += u.vx * dt; u.z += u.vz * dt; d.position.set(u.x, H(u.x, u.z), u.z);
      if (playing && Math.hypot(rover.x - u.x, rover.y - u.z) < 38) { // driving through one gives the rover a gentle sideways shove
        const px = -Math.sin(rover.h), pz = Math.cos(rover.h), side = (rover.x - u.x) * px + (rover.y - u.z) * pz >= 0 ? 1 : -1;
        rover.x += px * side * 90 * dt; rover.y += pz * side * 90 * dt; rover.h += side * .5 * dt; shake = Math.max(shake, .18);
        tip("devil", "Dust devils on Mars are real, and their wind sometimes cleaned dust off rovers' solar panels!");
      }
      d.children.forEach((ch, i) => { ch.rotation.y = time * (3 + i * .4) + u.seed; ch.position.x = Math.sin(time * 1.7 + i * .7 + u.seed) * (2 + i * 2.2); ch.position.z = Math.cos(time * 1.3 + i * .9 + u.seed) * (2 + i * 2.2); });
      if (Math.random() < .5) { const a = rnd(0, 6.3); dust.emit(u.x + Math.cos(a) * 8, d.position.y + 2, u.z + Math.sin(a) * 8, Math.cos(a + 1.6) * 30, rnd(15, 40), Math.sin(a + 1.6) * 30, 1.6, 8, .9, .64, .44, .3, -4, .8, 10); }
    }

    // --- signal: bars, distance, beeps that speed up as you get close ---
    if (playing) {
      const n = nearestUnfound();
      if (n) {
        const bars = n.d < 500 ? 4 : n.d < 1000 ? 3 : n.d < 1800 ? 2 : n.d < 3200 ? 1 : 0;
        const km = Math.round(n.d / WD.ppd * WD.kmPerDeg);
        setSignal(bars, km.toLocaleString() + " km");
        $("compassLbl").textContent = "Ghost signal · " + sigDist;
        $("needle").style.transform = "rotate(" + (Math.atan2(n.s.y - rover.y, wdx(n.s.x - rover.x)) - camH) + "rad)";
        if (bars >= 2 && lastPing !== n.s.id + bars) { lastPing = n.s.id + bars; vibe(bars >= 4 ? [40, 40, 40] : [40]); if (bars === 2) Pad.rumble("signal"); }
        beepT -= dt; if (bars > 0 && beepT <= 0) { beepT = clamp(n.d / 1100, .16, 2.4); Sfx.beep(bars / 4); }
      } else { setSignal(0, ""); $("compassLbl").textContent = "All found!"; }
      Sfx.engine(sp / WD.maxV, true);
      const lat = WD.latMax - rover.y / WD.ppd, lon = WD.lonMin + (((rover.x % W.w) + W.w) % W.w) / WD.ppd;
      $("coordTxt").textContent = `📍 ${Math.abs(lat).toFixed(1)}°${lat >= 0 ? "N" : "S"}  ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? "E" : "W"}`;
    } else Sfx.engine(0, false);
    sendState();
  }

  // waking a ghost: shake, flash, pop into full colour, then show its story
  function startRevive(st) {
    mode = "revive"; rover.v = 0; revive = { s: st, t: 0, popped: false, a0: Math.atan2(rover.y - st.y, wdx(rover.x - st.x)) }; found.add(st.id);
    Sfx.wake(); vibe([60, 40, 120]); sendState();
  }
  function tickRevive(dt) {
    const r = revive, st = r.s; r.t += dt;
    if (!r.popped) {
      const k = r.t / 1.5; st.model.rotation.y += dt * (2 + k * 22); st.model.position.y = 5 + k * 14; st.model.scale.setScalar(1.3 * (1 + Math.sin(r.t * 40) * .04 * k));
      st.beam.scale.x = st.beam.scale.z = 9 + k * 40; st.core.scale.x = st.core.scale.z = 2.2 + k * 16;
      for (let i = 0; i < 4; i++) { const a = rnd(0, 6.3), d = rnd(40, 90); spark.emit(st.g.position.x + Math.cos(a) * d, st.h0 + rnd(0, 50), st.y + Math.sin(a) * d, -Math.cos(a) * d * 1.4, rnd(0, 20), -Math.sin(a) * d * 1.4, .7, rnd(3, 6), .6, .92, 1, 1, 0, 0, 0); }
      if (r.t >= 1.5) {
        r.popped = true; setSiteAlive(st, true); st.model.position.y = 0; shake = 1; Sfx.found(); vibe([120, 80, 120]); Pad.rumble("found");
        const f = $("flash"); f.style.transition = "none"; f.style.opacity = .85; requestAnimationFrame(() => { f.style.transition = "opacity .6s"; f.style.opacity = 0; });
        for (let i = 0; i < 160; i++) { const a = rnd(0, 6.3), b = rnd(-.2, 1.6), v = rnd(50, 220); spark.emit(st.g.position.x, st.h0 + 22, st.y, Math.cos(a) * v, b * v, Math.sin(a) * v, rnd(.8, 1.9), rnd(4, 9), 1, rnd(.7, 1), rnd(.2, .6), 1, 110, .8, -3); }
        updateHud();
      }
    } else {
      const k = clamp((r.t - 1.5) / .7, 0, 1), el = 1 + Math.pow(2, -9 * k) * Math.sin((k * 8 - .75) * 2.1) * -1; // springy pop
      st.model.scale.setScalar(1.3 * (.35 + .65 * el)); st.model.rotation.y += dt * .6;
      if (r.t > 3) { st.model.scale.setScalar(1.3); revive = null; startTask(st); }
    }
  }

  // ------------------------------------------------------------------
  // camera
  // ------------------------------------------------------------------
  const camPos = new T.Vector3(), camLook = new T.Vector3(), want = new T.Vector3(), look = new T.Vector3(); let camInit = false;
  function updateCamera(dt) {
    const y0 = rover.alt; let kPos = 7, fov = 62;
    const focus = revive ? revive.s : mode === "task" && taskSite ? taskSite : (mode === "card" && cardKind === "site" && card && card.g ? card : null);
    for (const st of sites) st.tag.visible = st.alive && st !== focus;
    if (focus) { // circle the ghost
      const a = (revive ? revive.a0 : 0) + time * .45, fx = focus.g.position.x;
      want.set(fx + Math.cos(a) * 135, focus.h0 + 52, focus.y + Math.sin(a) * 135); look.set(fx, focus.h0 + 20, focus.y); kPos = 2.2; fov = 50;
    } else if (mode === "lobby") { // slow orbit around the rover on the title screen
      const a = time * .22 + 1; want.set(rover.x + Math.cos(a) * 92, y0 + 34, rover.y + Math.sin(a) * 92); look.set(rover.x, y0 + 22, rover.y); kPos = 3; fov = 50;
      camH = rover.h;
    } else if (mode === "count") { // swing round from the front during 3, 2, 1
      const a = rover.h + Math.PI * (1 - smooth(countT / 2.3)) + Math.PI, r = 95;
      want.set(rover.x + Math.cos(a) * r, y0 + 40, rover.y + Math.sin(a) * r); look.set(rover.x, y0 + 16, rover.y); kPos = 6;
    } else { // chase camera
      camH = angLerp(camH, rover.h, 1 - Math.exp(-4.5 * dt));
      const cx = Math.cos(camH), cz = Math.sin(camH), sp = Math.abs(rover.v) / WD.maxV;
      want.set(rover.x - cx * (86 + sp * 10), y0 + 40, rover.y - cz * (86 + sp * 10));
      look.set(rover.x + Math.cos(rover.h) * 55, y0 + 14, rover.y + Math.sin(rover.h) * 55);
      fov = 62 + sp * 6 + (rover.boost > 0 ? 10 : 0); kPos = 9;
    }
    if (!camInit || camPos.distanceTo(want) > 4000) { camPos.copy(want); camLook.copy(look); camInit = true; }
    camPos.lerp(want, 1 - Math.exp(-kPos * dt)); camLook.lerp(look, 1 - Math.exp(-(kPos + 3) * dt));
    camPos.y = Math.max(camPos.y, H(camPos.x, camPos.z) + 10);
    shake = Math.max(0, shake - dt * 2.2);
    camera.position.copy(camPos); if (shake > 0) { camera.position.x += rnd(-1, 1) * shake * 5; camera.position.y += rnd(-1, 1) * shake * 5; }
    camera.lookAt(camLook);
    if (Math.abs(camera.fov - fov) > .05) { camera.fov = lerp(camera.fov, fov, 1 - Math.exp(-5 * dt)); camera.updateProjectionMatrix(); }

    // things that travel with the camera
    const p = camera.position;
    sky.position.copy(p); starPts.position.copy(p); ridges.forEach(r => r.position.set(p.x, 0, p.z));
    sunSp.position.copy(sunDir).multiplyScalar(14000).add(p);
    if (worldKey === "moon") {
      // Earth sits in the real compass direction for where you are on the Moon.
      // (It's drawn lower in the sky than it really is, so you can see it while driving.)
      const la = (WD.latMax - rover.y / WD.ppd) * Math.PI / 180, lo = (WD.lonMin + rover.x / WD.ppd) * Math.PI / 180;
      let ex = -Math.sin(lo), ez = Math.sin(la) * Math.cos(lo); const hl = Math.hypot(ex, ez), up = Math.cos(la) * Math.cos(lo);
      if (hl > .02) { ex /= hl; ez /= hl; const el = (9 + Math.asin(clamp(up, 0, 1)) * 180 / Math.PI * .1) * Math.PI / 180; want.set(ex * Math.cos(el), Math.sin(el), ez * Math.cos(el)); earthDir.lerp(want, 1 - Math.exp(-2 * dt)).normalize(); }
      earth.position.copy(earthDir).multiplyScalar(13000).add(p); earthGlow.position.copy(earth.position);
    }
    sun.target.position.set(rover.x, rover.alt, rover.y); sun.position.copy(sunDir).multiplyScalar(500).add(sun.target.position);
    dust.mat.uniforms.uScale.value = spark.mat.uniforms.uScale.value = vh * quality / (2 * Math.tan(camera.fov * Math.PI / 360));
  }

  // ------------------------------------------------------------------
  // main loop
  // ------------------------------------------------------------------
  setWorld("moon"); refreshPrompts();
  if (document.fonts && document.fonts.load) document.fonts.load("700 64px Fredoka").then(() => { if (mode === "lobby") buildWorld(); buildMiniOverlay(); }).catch(() => { });
  window.ghostDebug = { // handy for testing in the browser console
    rover, found, starsGot, deepSeen, tasksDone, cardSeen, ctrl: () => ctrlNow, kbSteer: () => kbSteer, openPause, cardLocked: () => !!cardUnlockAt, Tasks, setWorld, input, pad: () => pad, clock, reachable, solids: () => solids, sands: () => sands, world: () => worldKey, openReport, devils: () => devils, toXY: (a, b) => toXY(a, b), mode: () => mode, sites: () => sites, stars: () => stars,
    warp(lat, lon) { [rover.x, rover.y] = toXY(lat, lon); rover.alt = rover.gPrev = H(rover.x, rover.y); rover.air = false; camInit = false; }, renderer
  };
  let last = performance.now(), slow = 0, frames = 0;
  function frame(now) {
    const raw = (now - last) / 1000, dt = Math.min(.05, raw); last = now;
    updateKb(Math.min(.05, raw)); pollPad(); tickCardWait();
    if (Tasks.active() && mode === "task") stepTask(Math.min(.05, raw));
    update(dt);
    if (Math.abs(rover.x - tcx) > 120 || Math.abs(rover.y - tcz) > 120) updateTerrain(Math.round(rover.x / 120) * 120, Math.round(rover.y / 120) * 120);
    dust.update(dt); spark.update(dt);
    updateCamera(dt);
    renderer.render(scene, camera);
    if (mode === "card") Models.thumbRender(time * .8);
    if (mode !== "lobby") drawMini();
    drawConfetti(dt);
    // if the laptop is struggling, quietly lower the detail
    if (++frames > 90) { slow = raw > .03 ? slow + 1 : Math.max(0, slow - 1); if (slow > 70) { slow = 0; if (quality > 1) { quality = Math.max(1, quality - .25); resize(); } else if (renderer.shadowMap.enabled) { renderer.shadowMap.enabled = false; sun.castShadow = false; } else if (quality > .7) { quality = .7; resize(); } } }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
