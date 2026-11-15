/* =====================================================================
   GHOST ROVERS · 3D MODELS
   Everything is built from simple shapes in code (no downloaded models),
   so there is nothing to credit and nothing to load.
   Models are original, simplified cartoons of the real hardware. They
   deliberately carry no logos, flags or mission markings.
   ===================================================================== */
const Models = (() => {
  const T = THREE;
  const C = { gold: 0xe6ad3c, silver: 0xcbd3de, white: 0xf5f3ec, dark: 0x2a2e3a, mid: 0x6d7484,
              blue: 0x2f55b5, navy: 0x1b2a5e, orange: 0xf08a3c, tan: 0xcdb892, wheel: 0x30333d, mesh: 0x9aa2af };
  const cache = {};
  const mat = (color, extra) => {
    const k = color + JSON.stringify(extra || {});
    return cache[k] || (cache[k] = new T.MeshLambertMaterial(Object.assign({ color, flatShading: true }, extra)));
  };
  const add = (g, geo, m, x, y, z) => { const o = new T.Mesh(geo, typeof m === "number" ? mat(m) : m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; g.add(o); return o; };
  const box = (g, w, h, d, m, x, y, z) => add(g, new T.BoxGeometry(w, h, d), m, x, y, z);
  const cyl = (g, rt, rb, h, seg, m, x, y, z, open) => add(g, new T.CylinderGeometry(rt, rb, h, seg, 1, !!open), m, x, y, z);
  const sph = (g, r, m, x, y, z) => add(g, new T.SphereGeometry(r, 12, 9), m, x, y, z);
  const UP = new T.Vector3(0, 1, 0);
  function strut(g, a, b, r, m) { // a thin rod between two points
    const A = new T.Vector3(...a), B = new T.Vector3(...b), d = B.clone().sub(A), len = d.length();
    const o = add(g, new T.CylinderGeometry(r, r, len, 6), m, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    o.quaternion.setFromUnitVectors(UP, d.normalize()); return o;
  }
  function legs(g, n, a0, r0, y0, r1, m, pad) { // lander legs with footpads
    for (let i = 0; i < n; i++) {
      const a = a0 + i * 2 * Math.PI / n, c = Math.cos(a), s = Math.sin(a);
      strut(g, [c * r0, y0, s * r0], [c * r1, 1.5, s * r1], .9, m);
      strut(g, [c * r0 * .8, y0 - 4, s * r0 * .8], [c * (r0 + r1) / 2, (y0 + 1.5) / 2, s * (r0 + r1) / 2], .6, m);
      cyl(g, pad, pad, 1.2, 10, m, c * r1, .8, s * r1);
    }
  }
  function wheel(g, r, w, x, y, z, tire, hub) { // axis along z
    const h = new T.Group(); h.position.set(x, y, z); g.add(h);
    h.userData.tread = { width: w + .2, length: r * .28, pitch: 2 * Math.PI * r / 6 };
    const t = cyl(h, r, r, w, 12, tire); t.rotation.x = Math.PI / 2;
    const c = cyl(h, r * .5, r * .5, w + .6, 8, hub); c.rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; box(h, r * .5, h.userData.tread.length, h.userData.tread.width, tire, Math.cos(a) * r * .95, Math.sin(a) * r * .95, 0).rotation.z = a; }
    return h;
  }

  const builders = {
    // Apollo lunar module descent stage: gold-foil octagon on four legs
    descent(g) {
      cyl(g, 15, 15, 9, 8, C.gold, 0, 13.5, 0).rotation.y = Math.PI / 8;
      cyl(g, 13, 14, 1.6, 8, C.dark, 0, 18.6, 0).rotation.y = Math.PI / 8;
      cyl(g, 3, 6.5, 6, 10, C.dark, 0, 6, 0);
      legs(g, 4, Math.PI / 4, 13, 14, 27, C.silver, 4);
      for (let i = 0; i < 5; i++) box(g, .7, .7, 4, C.silver, 15.5 + i * 2.1, 11.5 - i * 2.2, 15.5 + i * 2.1).rotation.y = -Math.PI / 4; // ladder rungs
      const r = new T.Group(); r.position.set(34, 0, -16); g.add(r); // laser reflector left by the crew
      box(r, 5, .8, 5, C.white, 0, 3, 0).rotation.z = .5; strut(r, [0, 0, 0], [0, 3, 0], .5, C.silver);
    },
    // Surveyor: open triangle frame, tall mast with a solar panel and flat antenna
    surveyor(g) {
      cyl(g, 11, 11, 2, 3, C.silver, 0, 11, 0);
      legs(g, 3, Math.PI / 2, 10, 11, 23, C.silver, 3.5);
      box(g, 6, 7, 5, C.white, 5, 15, -3); box(g, 5, 6, 5, C.white, -5, 14.5, 3);
      strut(g, [0, 12, 0], [0, 36, 0], .8, C.silver);
      box(g, 13, .7, 9, C.blue, 5, 37, 0).rotation.z = -.45;
      box(g, 11, .7, 11, C.gold, -6, 36, 0).rotation.z = .5;
      strut(g, [8, 11, 4], [22, 3, 9], .6, C.silver); box(g, 3, 2.4, 3, C.mid, 22.5, 2, 9.2); // digging scoop
      sph(g, 2.6, C.white, -2, 9, -5);
    },
    // Viking: six-sided body, dish antenna, two round cameras, sampler arm
    viking(g) {
      cyl(g, 14, 14, 5, 6, C.white, 0, 11.5, 0);
      legs(g, 3, Math.PI / 6, 12, 10, 24, C.silver, 4);
      box(g, 6, 4.5, 9, C.tan, -8, 16, 5); box(g, 6, 4.5, 9, C.tan, -8, 16, -6);
      cyl(g, 1.3, 1.3, 6, 8, C.dark, 7, 17, 4); cyl(g, 1.3, 1.3, 6, 8, C.dark, 7, 17, -4);
      strut(g, [-2, 14, 0], [-2, 27, 0], .7, C.silver);
      const d = cyl(g, 8, 1.5, 3, 14, C.white, -2, 29, 0, true); d.material = mat(C.white, { side: T.DoubleSide }); d.rotation.z = -.5;
      strut(g, [10, 13, 0], [27, 4, 3], .6, C.silver); box(g, 3, 2.2, 3, C.mid, 27.5, 3, 3.2);
    },
    // Lunar Roving Vehicle: flat chassis, wire wheels, orange fenders, umbrella antenna
    buggy(g, o) {
      box(g, 31, 1.6, 13, C.silver, 0, 7.5, 0);
      const pos = [[11.5, 10], [11.5, -10], [-11.5, 10], [-11.5, -10]];
      pos.forEach(([x, z], i) => {
        wheel(g, 5.2, 3.6, x, 5.2, z, C.mesh, C.silver);
        const patched = o && o.patched && i === 2;
        box(g, patched ? 9 : 10, .8, 4.6, patched ? C.white : C.orange, x, 11.3, z); // the patched one is the map-and-duct-tape repair
      });
      [4, -4].forEach(z => { box(g, 5.5, 1, 5.5, C.tan, -3, 9, z); box(g, 1, 7, 5.5, C.tan, -6, 12.5, z); });
      box(g, 3, 4.5, 3, C.dark, 3.5, 10.5, 0);
      strut(g, [13, 8, 0], [13, 24, 0], .6, C.silver);
      const d = cyl(g, 9, .6, 3.5, 14, C.gold, 13, 25.5, 0, true); d.material = mat(C.gold, { side: T.DoubleSide });
      strut(g, [14, 8, 5], [14, 15, 5], .5, C.silver); box(g, 4, 3, 3, C.white, 14.5, 16.5, 5); // TV camera
      box(g, 5, 6, 11, C.mid, -14, 11, 0);
    },
    // Mars Exploration Rover (Spirit / Opportunity): solar-panel wings, camera mast, six wheels
    rover(g) {
      box(g, 15, 4.5, 10, C.white, 0, 10.5, 0);
      box(g, 19, .7, 12, C.navy, 0, 13.4, 0); box(g, 12, .7, 8, C.navy, -1, 13.4, 10); box(g, 12, .7, 8, C.navy, -1, 13.4, -10); box(g, 8, .7, 12, C.navy, -13, 13.4, 0);
      box(g, 19.6, .4, 12.6, C.gold, 0, 13.1, 0);
      [-11, 0, 11].forEach(x => [9.5, -9.5].forEach(z => { wheel(g, 3.6, 3, x, 3.6, z, C.wheel, C.silver); strut(g, [x * .4, 9, z * .7], [x, 4, z * .85], .6, C.silver); }));
      strut(g, [7, 13.5, 0], [7, 27, 0], .8, C.silver);
      box(g, 4.5, 3, 8, C.white, 7.5, 28, 0); cyl(g, 1, 1, 1, 8, C.dark, 10, 28, 2.2).rotation.z = Math.PI / 2; cyl(g, 1, 1, 1, 8, C.dark, 10, 28, -2.2).rotation.z = Math.PI / 2;
      strut(g, [8, 10, 3], [17, 12, 3], .6, C.silver); strut(g, [17, 12, 3], [21, 5, 3], .6, C.silver); box(g, 3, 3, 3, C.mid, 21.5, 4, 3); // arm and rock grinder
      const d = cyl(g, 3.6, 3.6, .5, 12, C.white, -8, 18, -3); d.rotation.z = .7; strut(g, [-8, 13.5, -3], [-8, 17, -3], .5, C.silver);
      strut(g, [-5, 13.5, 4], [-5, 22, 4], .3, C.silver);
    },
    // Sojourner: a microwave-sized box with a flat solar panel on top
    mini(g) {
      const s = new T.Group(); s.scale.setScalar(1.7); g.add(s);
      box(s, 12, 3.6, 8, C.gold, 0, 6, 0);
      box(s, 13.5, .5, 9.5, C.navy, 0, 8.2, 0);
      [-5.2, 0, 5.2].forEach(x => [5.6, -5.6].forEach(z => { wheel(s, 2.5, 2.2, x, 2.5, z, C.mid, C.silver); strut(s, [x * .6, 5, z * .7], [x, 2.6, z * .8], .4, C.silver); }));
      strut(s, [-5, 8.4, 3.5], [-5, 15, 3.5], .25, C.silver);
      box(s, 1, 1.6, 1.6, C.dark, 6.2, 6.4, 2); box(s, 1, 1.6, 1.6, C.dark, 6.2, 6.4, -2);
    },
    // Ingenuity: tiny box body, four springy legs, two rotors, solar panel on top
    heli(g) {
      const s = new T.Group(); s.scale.setScalar(1.5); g.add(s);
      box(s, 5, 5, 5, C.gold, 0, 8.5, 0);
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { strut(s, [a * 2, 7, b * 2], [a * 9, .6, b * 9], .3, C.dark); sph(s, .7, C.dark, a * 9, .6, b * 9); });
      strut(s, [0, 11, 0], [0, 20, 0], .5, C.silver);
      box(s, 27, .4, 2.2, C.dark, 0, 15.5, 0).rotation.y = .3;
      box(s, 27, .4, 2.2, C.dark, 0, 17.8, 0).rotation.y = .3 + Math.PI / 2;
      box(s, 6.5, .5, 4.5, C.navy, 0, 20.3, 0);
    },
    // InSight / Phoenix: a round deck on three legs with two big round solar panels
    insight(g) { builders.deckLander(g, true); },
    phoenix(g) { builders.deckLander(g, false); },
    deckLander(g, isInsight) {
      cyl(g, 10, 10, 2.6, 10, C.white, 0, 10, 0);
      legs(g, 3, Math.PI / 2, 8, 9, 15, C.silver, 2.6);
      [21, -21].forEach(z => { cyl(g, 11.5, 11.5, .6, 10, C.navy, 0, 11, z); cyl(g, 12.2, 12.2, .3, 10, C.gold, 0, 10.6, z); });
      strut(g, [5, 11, 2], [11, 20, 2], .6, C.silver); strut(g, [11, 20, 2], [19, 6, 4], .6, C.silver); box(g, 2.6, 2.6, 2.6, C.mid, 19.5, 5, 4.2);
      if (isInsight) {
        const dome = add(g, new T.SphereGeometry(4.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), C.white, 21, 0, -7); dome.scale.y = .8; // seismometer under its wind shield
        strut(g, [9, 10, -3], [21, 1, -7], .3, C.tan);
        cyl(g, .6, .6, 5, 6, C.dark, 17, 2.5, 12); // the stuck "mole" heat probe
        box(g, 5, 3, 5, C.tan, -3, 12.8, 0);
      } else {
        strut(g, [-4, 11, 0], [-4, 26, 0], .5, C.silver); box(g, 2, 2, 2, C.white, -4, 27, 0); // weather mast
        box(g, 4.5, 3.5, 4.5, C.tan, 3, 13, -3);
        box(g, 9, .5, 4, 0xeaf6ff, 24, .4, 5); // the trench with bright ice
      }
    },
    // Voyager: big dish, science boom, power boom, long magnetometer boom, golden record
    probe(g) {
      const s = new T.Group(); s.position.y = 18; s.rotation.z = .35; s.rotation.x = .2; g.add(s);
      const d = cyl(s, 13, 2, 5, 18, C.white, 0, 5, 0, true); d.material = mat(C.white, { side: T.DoubleSide });
      strut(s, [0, 3, 0], [0, 11, 0], .4, C.silver); sph(s, 1.2, C.silver, 0, 11, 0);
      cyl(s, 6, 6, 4, 10, C.dark, 0, .5, 0);
      const rec = cyl(s, 2.6, 2.6, .4, 18, C.gold, 6.2, .5, 0); rec.rotation.z = Math.PI / 2; // the golden record
      strut(s, [4, 0, 0], [20, -3, 4], .5, C.silver); box(s, 4, 4, 5, C.mid, 21, -3.5, 4.5);
      strut(s, [-4, 0, 0], [-12, -3, -3], .5, C.silver); [-14, -18, -22].forEach(x => { const c = cyl(s, 1.6, 1.6, 3.4, 8, C.dark, x, -3.6 - (x + 14) * -.25, -3.5 - (x + 14) * -.3); c.rotation.z = Math.PI / 2; });
      strut(s, [-3, -1, 3], [-22, -6, 32], .3, C.silver);
    },
    // ALSEP: a central station wired to a nuclear battery, a seismometer and a laser mirror
    alsep(g) {
      box(g, 9, 7, 9, C.gold, 0, 5.5, 0); box(g, 10.5, .7, 10.5, C.white, 0, 9.4, 0);
      strut(g, [0, 9.5, 0], [0, 19, 0], .5, C.silver); cyl(g, 1.3, 1.3, 6, 8, C.silver, 0, 21, 0).rotation.z = .3;
      cyl(g, 4, 4, 1, 10, C.silver, -19, .6, 7); cyl(g, 2.6, 2.6, 8, 8, C.dark, -19, 5, 7);                 // nuclear battery with cooling fins
      for (let i = 0; i < 4; i++) box(g, 9, 6.5, .5, C.mid, -19, 5.2, 7).rotation.y = i * Math.PI / 4;
      cyl(g, 8, 8, .4, 16, C.silver, 17, .4, 11); cyl(g, 2.4, 2.4, 4.5, 10, C.silver, 17, 2.6, 11);           // seismometer on its silver blanket
      box(g, 7, .8, 7, C.white, 15, 3.4, -15).rotation.z = .5; strut(g, [15, 0, -15], [15, 3, -15], .5, C.silver); // laser mirror
      strut(g, [-10, 0, -15], [-10, 6, -15], .4, C.silver); [0, 2.1, 4.2].forEach(a => strut(g, [-10, 6, -15], [-10 + Math.cos(a) * 6, 9, -15 + Math.sin(a) * 6], .3, C.silver));
      [[-19, 7], [17, 11], [15, -15], [-10, -15]].forEach(([x, z]) => strut(g, [0, .3, 0], [x, .3, z], .25, C.tan)); // cables
    },
    // Pioneer: dish, six-sided body, two power booms and a long sensor boom
    pioneer(g) {
      const s = new T.Group(); s.position.y = 18; s.rotation.z = -.3; s.rotation.x = .25; g.add(s);
      const d = cyl(s, 13, 2, 5, 18, C.white, 0, 5, 0, true); d.material = mat(C.white, { side: T.DoubleSide });
      [0, 2.1, 4.2].forEach(a => strut(s, [Math.cos(a) * 9, 5, Math.sin(a) * 9], [0, 12, 0], .3, C.silver)); sph(s, 1.2, C.silver, 0, 12, 0);
      cyl(s, 6, 6, 4, 6, C.gold, 0, .5, 0);
      [1, -1].forEach(k => { strut(s, [k * 4, 0, 3], [k * 20, -1, 12], .4, C.silver); const c = cyl(s, 1.7, 1.7, 5, 8, C.dark, k * 21, -1, 12.5); c.rotation.z = Math.PI / 2; c.rotation.y = -k * .5; });
      strut(s, [0, 0, -5], [0, -3, -34], .3, C.silver); box(s, 2.5, 2.5, 2.5, C.mid, 0, -3, -35);
      box(s, .3, 2.2, 3.6, 0xffd23f, 6.2, .5, 0); // the golden plaque
    },
    // NEAR Shoemaker: eight-sided body with a dish and four solar panels like a windmill
    near(g) {
      const s = new T.Group(); s.position.y = 17; s.rotation.z = .3; g.add(s);
      cyl(s, 7, 7, 10, 8, C.gold, 0, 0, 0);
      const d = cyl(s, 6.5, 1.5, 3, 14, C.white, 0, 6.6, 0, true); d.material = mat(C.white, { side: T.DoubleSide });
      [0, 1, 2, 3].forEach(i => { const a = i * Math.PI / 2, p = box(s, 15, .5, 7, C.navy, Math.cos(a) * 14.5, 5, Math.sin(a) * 14.5); p.rotation.y = -a; });
      box(s, 4, 4, 4, C.mid, 5, -6.5, 0); cyl(s, 1.5, 2.6, 2.5, 8, C.dark, -3, -6.2, 2);
    },
    // Dawn: a box with two huge solar wings, a dish, and ion engines underneath
    dawn(g) {
      const s = new T.Group(); s.position.y = 18; s.rotation.z = .2; s.rotation.y = .5; g.add(s);
      box(s, 8, 10, 8, C.gold, 0, 0, 0);
      [1, -1].forEach(k => { box(s, 20, .5, 9, C.navy, k * 15, 0, 0); box(s, 20.4, .3, .5, C.silver, k * 15, .3, 0); strut(s, [k * 4, 0, 0], [k * 6, 0, 0], .5, C.silver); });
      const d = cyl(s, 5.5, 1.2, 2.4, 14, C.white, 0, 0, 5.4, true); d.material = mat(C.white, { side: T.DoubleSide }); d.rotation.x = Math.PI / 2;
      [[-2.2, 0], [2.2, 0], [0, 2.2]].forEach(([x, z]) => cyl(s, 1.1, 1.7, 2, 8, C.dark, x, -6, z));
      const glow = sph(s, 1, mat(0x7fe3ff, { emissive: 0x3fb6ff }), 0, -7.4, 2.2); glow.castShadow = false;
    },
    // Kepler: a telescope tube with a sunshade and solar panels on one side
    kepler(g) {
      const s = new T.Group(); s.position.y = 19; s.rotation.z = -.35; g.add(s);
      cyl(s, 6, 6, 16, 12, C.silver, 0, 0, 0); cyl(s, 6.8, 7.6, 7, 12, C.gold, 0, -7, 0);
      const sh = cyl(s, 7, 6.2, 6, 12, C.white, 0, 10.5, 0, true); sh.material = mat(C.white, { side: T.DoubleSide });
      cyl(s, 5.2, 5.2, .5, 12, C.dark, 0, 7.6, 0);
      [-1, 0, 1].forEach(k => { const a = k * .62, p = box(s, .5, 15, 5.4, C.navy, Math.cos(a) * 7.4, .5, Math.sin(a) * 7.4); p.rotation.y = -a; });
      const d = cyl(s, 3, .8, 1.5, 12, C.white, -3, -11.6, 0, true); d.material = mat(C.white, { side: T.DoubleSide }); d.rotation.z = Math.PI;
    },
    trophy(g) {
      cyl(g, 9, 11, 4, 12, C.navy, 0, 2, 0); cyl(g, 2, 3, 12, 8, C.gold, 0, 10, 0);
      const st = add(g, starGeo(12, 5.5, 4), mat(0xffd23f, { emissive: 0x7a5200 }), 0, 27, 0); st.userData.spin = true;
    }
  };

  function starGeo(R, r, depth) {
    const sh = new T.Shape();
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + Math.PI / 2, q = i % 2 ? r : R; i ? sh.lineTo(Math.cos(a) * q, Math.sin(a) * q) : sh.moveTo(Math.cos(a) * q, Math.sin(a) * q); }
    const g = new T.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelSize: 1, bevelThickness: 1, bevelSegments: 1 });
    g.translate(0, 0, -depth / 2); return g;
  }

  const holoFace = new T.MeshBasicMaterial({ color: 0x59d8ff, transparent: true, opacity: .22, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
  const holoLine = new T.LineBasicMaterial({ color: 0xaef1ff, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false, fog: false });

  function hardware(type, opts) {
    const g = new T.Group();
    (builders[type] || builders.trophy)(g, opts || {});
    return g;
  }
  // Turn a model into a shimmering hologram (and back again when it "comes back to life")
  function setHolo(g, on) {
    g.traverse(o => {
      if (!o.isMesh) return;
      if (on) {
        if (!o.userData.real) o.userData.real = o.material;
        o.material = holoFace; o.castShadow = false;
        if (!o.userData.edges) { o.userData.edges = new T.LineSegments(new T.EdgesGeometry(o.geometry, 25), holoLine); o.add(o.userData.edges); }
        o.userData.edges.visible = true;
      } else if (o.userData.real) {
        o.material = o.userData.real; o.castShadow = true;
        if (o.userData.edges) o.userData.edges.visible = false;
      }
    });
  }

  // ---- the player's rover: chunky, colourful, with eyes on the camera mast ----
  function playerRover(color) {
    const g = new T.Group(), body = new T.Group(); g.add(body);
    const paint = new T.MeshLambertMaterial({ color, flatShading: true });
    const paintDark = new T.MeshLambertMaterial({ color, flatShading: true });
    // Broad bevels catch the light like a painted toy. Other mission models
    // keep their existing block geometry and the rover keeps its silhouette.
    function softBox(parent, w, h, d, material, x, y, z, bevel = .8) {
      const b = Math.min(bevel, w / 4, h / 4, d / 4), shape = new T.Shape();
      const a = w / 2 - b, c = h / 2 - b;
      shape.moveTo(-a, -c); shape.lineTo(a, -c); shape.lineTo(a, c); shape.lineTo(-a, c); shape.closePath();
      const geo = new T.ExtrudeGeometry(shape, { depth: d - b * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, steps: 1, curveSegments: 1 });
      geo.translate(0, 0, -(d - b * 2) / 2);
      return add(parent, geo, material, x, y, z);
    }
    softBox(body, 30, 9, 19, paint, 0, 15, 0, 1.2);
    softBox(body, 24, 5, 15, paint, -1, 21, 0);
    softBox(body, 4, 5, 21, C.white, 15, 13.5, 0);            // friendly chunky bumper
    softBox(body, 3, 6, 17, paintDark, -15.5, 15, 0);
    // A simple rear badge and cream bumper stay legible against either planet.
    const rear = new T.Group(); rear.name = "Rover rear trim"; body.add(rear);
    softBox(rear, .8, 4.1, 10.5, C.navy, -17.15, 15.8, 0, .15);
    softBox(rear, 2.3, 2.1, 20, C.white, -16, 11.2, 0, .3);
    const tailPaint = mat(0xff7867, { emissive: 0x6a1b18 });
    [-6.9, 6.9].forEach(z => {
      const bezel = cyl(rear, 1.55, 1.55, .6, 10, C.dark, -17.25, 15.6, z); bezel.rotation.z = Math.PI / 2;
      const lamp = cyl(rear, 1.13, 1.13, .7, 10, tailPaint, -17.65, 15.6, z); lamp.rotation.z = Math.PI / 2;
      lamp.name = "Rear lamp"; lamp.castShadow = false;
    });
    box(body, 25, 2.2, 13, C.dark, -1, 9.8, 0);             // toy undercarriage
    [-1, 1].forEach(side => {
      softBox(body, 17, 3.4, .9, paintDark, -3, 14.4, side * 9.4, .2);
      box(body, 20, 1.1, .5, C.white, -2, 17.7, side * 9.65);
      // Three big graphic vents read cleanly from the chase camera.
      [-7, -3, 1].forEach(x => box(body, 1.5, 1.8, .3, C.dark, x, 14.4, side * 9.95));
    });
    softBox(body, 16, 1.2, 14, C.white, -5, 24, 0, .3);      // clean solar-panel frame
    box(body, 15, .5, 13, C.navy, -5, 24.65, 0);
    const cellPaint = mat(0x426bc0, { emissive: 0x091731 });
    for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
      box(body, 6.8, .15, 3.5, cellPaint, -8.7 + col * 7.4, 24.96, -4.2 + row * 4.2);
    }
    [6.5, -6.5].forEach(z => { const l = sph(body, 1.9, mat(0xfff3b0, { emissive: 0xffd45e }), 17, 14.5, z); l.castShadow = false; });
    // mast + head with eyes
    cyl(body, 1.7, 2.1, 12, 8, C.silver, 8, 29, 0);
    cyl(body, 2.8, 2.8, 2, 8, paintDark, 8, 24.5, 0);
    const head = new T.Group(); head.position.set(8.5, 37, 0); body.add(head);
    softBox(head, 9, 8, 15, C.white, 0, 0, 0, .9);
    box(head, 1, 5.4, 12.4, C.dark, 4.3, 0, 0);
    softBox(head, 9.6, 2.4, 15.6, paint, 0, 4.6, 0, .6);     // a little cap in the rover's colour
    box(head, 1, 3, 9, paint, -4.3, -.5, 0);
    const eyes = [], pupils = [];
    [3.3, -3.3].forEach(z => {
      const e = sph(head, 2.5, mat(0xffffff, { emissive: 0x666666 }), 4.6, 0, z); e.castShadow = false; eyes.push(e);
      const p = sph(head, 1.25, C.dark, 6.5, 0, z); p.castShadow = false; pupils.push(p);
      const glint = sph(p, .36, mat(0xffffff, { emissive: 0xffffff }), .95, .45, .3); glint.castShadow = false;
    });
    // antenna with a bobble
    const ant = new T.Group(); ant.position.set(-11, 23.5, -6); body.add(ant);
    cyl(ant, .35, .35, 15, 5, C.silver, 0, 7.5, 0);
    const bob = sph(ant, 1.8, mat(0xffd23f, { emissive: 0x8a6500 }), 0, 15.5, 0);
    // six fat wheels
    const wheels = [];
    [11.5, 0, -11.5].forEach(x => [12.5, -12.5].forEach(z => {
      strut(g, [x * .75, 10.2, z * .57], [x, 6.8, z * .9], 1, C.dark);
      const w = wheel(g, 6.6, 6, x, 6.6, z, C.wheel, paint);
      const side = Math.sign(z);
      const rim = cyl(w, 3.5, 3.5, .7, 12, C.white, 0, 0, side * 3.3); rim.rotation.x = Math.PI / 2;
      const hub = cyl(w, 2.4, 2.4, .9, 10, paint, 0, 0, side * 3.7); hub.rotation.x = Math.PI / 2;
      const pin = cyl(w, .85, .85, 1, 8, C.dark, 0, 0, side * 4.1); pin.rotation.x = Math.PI / 2;
      w.userData.x = x; w.userData.z = z; wheels.push(w);
    }));
    // boost flame (hidden until boosting)
    const flame = add(body, new T.ConeGeometry(4, 16, 8), new T.MeshBasicMaterial({ color: 0xffb133, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false }), -25, 15, 0);
    flame.rotation.z = Math.PI / 2; flame.castShadow = false; flame.visible = false;
    function setColor(c) { paint.color.set(c); paintDark.color.set(c).multiplyScalar(.7); }
    setColor(color);
    return { group: g, body, head, eyes, pupils, ant, bob, wheels, flame, setColor };
  }

  // Geometry is owned by each model. Cached paints and hologram materials are
  // shared by all models; keep them (and explicitly preserved world assets) alive.
  function dispose(root, keep) {
    keep = keep || {};
    const geometries = new Set(keep.geometries || []), materials = new Set([holoFace, holoLine, ...Object.values(cache), ...(keep.materials || [])]);
    const textures = new Set(keep.textures || []);
    root.traverse(o => {
      if (o.geometry && !o.isSprite && !geometries.has(o.geometry)) { geometries.add(o.geometry); o.geometry.dispose(); }
      for (const material of [].concat(o.material || [], o.userData && o.userData.real || [])) {
        if (materials.has(material)) continue;
        materials.add(material);
        for (const value of Object.values(material)) if (value && value.isTexture && !textures.has(value)) { textures.add(value); value.dispose(); }
        material.dispose();
      }
    });
  }

  // ---- small offscreen renderer for card art and stickers ----
  let thumb = null, contextListener = null;
  function onContextChange(fn) { contextListener = fn; }
  function thumbSetup() {
    if (thumb) return thumb;
    let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); }
    catch (_) { throw new Error("The game couldn't create its story graphics. Try enabling hardware acceleration or opening it in another browser."); }
    renderer.domElement.addEventListener("webglcontextlost", e => { e.preventDefault(); if (contextListener) contextListener(renderer.domElement, true, e); });
    renderer.domElement.addEventListener("webglcontextrestored", e => { if (contextListener) contextListener(renderer.domElement, false, e); });
    renderer.setPixelRatio(1); renderer.setSize(360, 360, false);
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight(0xffffff, 0x556080, .95));
    const d = new T.DirectionalLight(0xffffff, .9); d.position.set(3, 6, 4); scene.add(d);
    const cam = new T.PerspectiveCamera(32, 1, 1, 1000);
    const holder = new T.Group(); scene.add(holder);
    return thumb = { renderer, scene, cam, holder, model: null };
  }
  function thumbShow(type, opts) {
    const t = thumbSetup();
    if (t.model) { t.holder.remove(t.model); dispose(t.model); }
    t.model = hardware(type, opts); t.holder.add(t.model);
    const bb = new T.Box3().setFromObject(t.model), c = bb.getCenter(new T.Vector3()), s = bb.getSize(new T.Vector3());
    t.model.position.sub(c);
    const r = Math.max(s.x, s.y, s.z) * .5 + 4, dist = r / Math.tan(16 * Math.PI / 180) * .8;
    t.cam.position.set(0, dist * .32, dist); t.cam.lookAt(0, 0, 0);
    return t;
  }
  function thumbRender(angle) { const t = thumbSetup(); t.holder.rotation.y = angle; if (t.model) t.model.traverse(o => { if (o.userData.spin) o.rotation.y = angle * 3; }); t.renderer.render(t.scene, t.cam); }
  function sticker(type, opts) { thumbShow(type, opts); thumbRender(-.7); return thumb.renderer.domElement.toDataURL("image/png"); }

  return { hardware, setHolo, playerRover, starGeo, thumbSetup, thumbShow, thumbRender, sticker, dispose, onContextChange, holoFace, holoLine, mat, C };
})();
