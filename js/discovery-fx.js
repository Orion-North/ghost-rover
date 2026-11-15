/* A single, bounded discovery sequence: material colour, one ring, one earned patch.
   Decorations never own gameplay state, rewards, timers or persistence. */
const DiscoveryFX = (() => {
  const clamp = n => Math.max(0, Math.min(1, n)), ease = n => n * n * (3 - 2 * n);
  function create(options) {
    const { THREE: T, root } = options, doc = root.ownerDocument, win = doc.defaultView;
    let active = null, generation = 0;
    const animations = new Set(), timers = new Set();
    if (!doc.getElementById("discoveryFxStyles")) {
      const style = doc.createElement("style"); style.id = "discoveryFxStyles";
      style.textContent = '.discovery-fx{position:fixed;inset:0;pointer-events:none;z-index:9;overflow:hidden}.discovery-patch{position:absolute;left:0;top:0;width:112px;height:112px;display:grid;place-items:center;border:4px solid #fff;border-radius:28%;background:radial-gradient(circle at 35% 25%,#4777a2,#1c2846 75%);box-shadow:0 0 0 4px #7fe6ed,0 8px 22px #060e2c88;will-change:transform,opacity}.discovery-patch img{display:block;width:100%;height:100%;object-fit:contain}';
      doc.head.appendChild(style);
    }
    const layer = doc.createElement("div"); layer.className = "discovery-fx"; layer.setAttribute("aria-hidden", "true"); root.appendChild(layer);
    const after = (ms, fn) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
    function animate(el, frames, timing, done) {
      if (!el || !el.animate) { if (done) after(timing.duration || 0, done); return null; }
      const animation = el.animate(frames, timing); animations.add(animation);
      Promise.resolve(animation.finished).then(() => { animations.delete(animation); if (done) done(); }).catch(() => animations.delete(animation));
      return animation;
    }
    function restoreMaterials(state) {
      for (const paint of state.meshes) {
        paint.mesh.material = state.site.alive ? paint.real : paint.original;
        if (paint.mesh.userData.edges) paint.mesh.userData.edges.visible = state.site.alive ? false : paint.edges;
      }
      for (const paint of state.paints.values()) paint.material.dispose();
      state.meshes = []; state.paints.clear();
    }
    function cancel() {
      generation++;
      for (const animation of animations) animation.cancel(); animations.clear();
      for (const id of timers) clearTimeout(id); timers.clear();
      while (layer.firstChild) layer.firstChild.remove();
      if (!active) return;
      const state = active; active = null; restoreMaterials(state);
      const site = state.site;
      site.model.position.y = site.alive ? 0 : state.y;
      site.model.rotation.y = state.yaw; site.model.scale.setScalar(1.3);
      if (site.ring) site.ring.visible = !site.alive;
      if (state.ring) { site.g.remove(state.ring); state.ring.geometry.dispose(); state.ring.material.dispose(); }
    }
    function begin(site) {
      cancel();
      const state = { site, meshes: [], paints: new Map(), ring: null, y: site.model.position.y, yaw: site.model.rotation.y, collected: false };
      active = state;
      site.model.traverse(mesh => {
        if (!mesh.isMesh || !mesh.userData.real) return;
        const original = mesh.material, real = mesh.userData.real;
        const temporary = [].concat(real).map(material => {
          let paint = state.paints.get(material);
          if (!paint) {
            const temp = material.clone(); temp.transparent = true; temp.depthWrite = false;
            paint = { material: temp, original: material, color: material.color && material.color.clone(), emissive: material.emissive && material.emissive.clone() };
            state.paints.set(material, paint);
          }
          return paint.material;
        });
        state.meshes.push({ mesh, original, real, edges: !!(mesh.userData.edges && mesh.userData.edges.visible) });
        mesh.material = Array.isArray(real) ? temporary : temporary[0];
        if (mesh.userData.edges) mesh.userData.edges.visible = false;
      });
      if (site.ring) site.ring.visible = false;
      {
        const geometry = new T.RingGeometry(.91, 1, 64); geometry.rotateX(-Math.PI / 2);
        const material = new T.MeshBasicMaterial({ color: 0x89e6e9, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide });
        state.ring = new T.Mesh(geometry, material); state.ring.position.y = 1.8; site.g.add(state.ring);
      }
      step(0);
    }
    function step(time) {
      const state = active; if (!state) return;
      const k = ease(clamp((time - .15) / 1.35)), cyan = new T.Color(0x67dae4);
      for (const paint of state.paints.values()) {
        if (paint.color) paint.material.color.copy(cyan).lerp(paint.color, k);
        if (paint.emissive) paint.material.emissive.copy(cyan).multiplyScalar(.2 * (1 - k)).lerp(paint.emissive, k);
        paint.material.opacity = (.32 + .68 * k) * paint.original.opacity;
      }
      state.site.model.position.y = state.y * (1 - k);
      state.site.model.rotation.y = state.yaw + Math.sin(k * Math.PI) * .12;
      state.site.model.scale.setScalar(1.3 + Math.sin(k * Math.PI) * .045);
      if (state.ring) {
        const p = clamp((time - .95) / 1.65);
        state.ring.scale.setScalar(35 + ease(p) * 130);
        state.ring.material.opacity = time < .95 ? 0 : .55 * Math.sin(Math.PI * p);
      }
    }
    function highlight(target) {
      if (!target) return;
      const frames = [{ transform: 'scale(1)', boxShadow: '0 0 0 0 #ffd76c00' }, { transform: 'scale(1.08)', boxShadow: '0 0 0 5px #ffd76ccc', offset: .35 }, { transform: 'scale(1)', boxShadow: '0 0 0 0 #ffd76c00' }];
      animate(target, frames, { duration: 440, easing: 'ease-out' });
    }
    function reward(kind) { highlight(kind === 'star' ? options.starTarget() : options.bookButton()); }
    function collect(site) {
      const state = active; if (!state || state.site !== site || state.collected) return;
      state.collected = true; restoreMaterials(state);
      const target = options.bookButton(); if (!target) return;
      const box = target.getBoundingClientRect(); if (!box.width || !box.height) return;
      const token = generation, patch = doc.createElement("div"), image = doc.createElement("img");
      patch.className = "discovery-patch";
      image.alt = "";
      try { image.src = options.getSticker(site); } catch (_) { image.style.display = "none"; }
      patch.appendChild(image); layer.appendChild(patch);
      const to = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      {
        const from = options.project(site), x = from.x - 56, y = from.y - 56, tx = to.x - 56, ty = to.y - 56;
        animate(patch, [
          { transform: `translate(${x}px,${y}px) scale(.8) rotate(-5deg)`, opacity: 0 },
          { transform: `translate(${x}px,${y}px) scale(1) rotate(-5deg)`, opacity: 1, offset: .18 },
          { transform: `translate(${x + (tx - x) * .45}px,${Math.min(y, ty) - 38}px) scale(.72) rotate(2deg)`, opacity: 1, offset: .58 },
          { transform: `translate(${tx}px,${ty}px) scale(.25) rotate(8deg)`, opacity: 0 }
        ], { duration: 1080, easing: 'cubic-bezier(.3,0,.3,1)' }, () => { patch.remove(); if (token === generation) highlight(target); });
      }
    }
    function guard(mode, blocked) { if (blocked || mode === "pause" || mode === "lobby") cancel(); }
    const hidden = () => { if (doc.hidden) cancel(); };
    const blur = () => cancel();
    doc.addEventListener("visibilitychange", hidden); win.addEventListener("blur", blur);
    for (const canvas of root.querySelectorAll("canvas")) canvas.addEventListener("webglcontextlost", blur);
    return { begin, step, collect, cancel, reward, guard,
      dispose() { cancel(); doc.removeEventListener("visibilitychange", hidden); win.removeEventListener("blur", blur); for (const canvas of root.querySelectorAll("canvas")) canvas.removeEventListener("webglcontextlost", blur); layer.remove(); } };
  }
  return { create };
})();
if (typeof module !== "undefined") module.exports = DiscoveryFX;
