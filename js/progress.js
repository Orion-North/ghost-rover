/* Versioned, local-only checkpoints. Invalid or unavailable storage never blocks play. */
const Progress = (() => {
  const KEY = "gr_progress_v1", VERSION = 1;
  function create(storage, worlds, deep) {
    const worldKeys = Object.keys(worlds), siteIds = new Set(worldKeys.flatMap(k => worlds[k].sites.map(s => s.id)));
    const deepIds = new Set(deep.map(s => s.id)), starIds = new Set(worldKeys.flatMap(k => worlds[k].stars.map((_, i) => k + i)));
    const finite = n => typeof n === "number" && Number.isFinite(n);
    const clean = (a, allowed) => Array.isArray(a) ? [...new Set(a.filter(id => typeof id === "string" && allowed.has(id)))] : [];
    function normalize(raw) {
      if (!raw || raw.version !== VERSION || !worldKeys.includes(raw.world)) return null;
      const w = worlds[raw.world], width = (w.lonMax - w.lonMin) * w.ppd, height = (w.latMax - w.latMin) * w.ppd;
      if (!raw.rover || !finite(raw.rover.x) || !finite(raw.rover.y) || !finite(raw.rover.h)) return null;
      const found = clean(raw.found, siteIds), have = new Set(found), clocks = {};
      for (const k of worldKeys) {
        const c = raw.clocks && raw.clocks[k];
        clocks[k] = { left: c && finite(c.left) ? Math.max(0, Math.min(86400, c.left)) : worlds[k].timeLimit, free: !!(c && c.free === true) };
      }
      const pendingSite = typeof raw.pendingSite === "string" && have.has(raw.pendingSite) && worlds[raw.world].sites.some(s => s.id === raw.pendingSite) ? raw.pendingSite : null;
      // Older v1 checkpoints did not identify the task/story phase. A seen story
      // or earned task means the task has already ended, including an explicit Skip.
      const pendingPhase = !pendingSite ? null : raw.pendingPhase === "task" || raw.pendingPhase === "story" ? raw.pendingPhase :
        (Array.isArray(raw.seen) && raw.seen.includes(pendingSite)) || (Array.isArray(raw.tasks) && raw.tasks.includes(pendingSite)) ? "story" : "task";
      return { version: VERSION, world: raw.world,
        rover: { x: w.wrap ? ((raw.rover.x % width) + width) % width : Math.max(40, Math.min(width - 40, raw.rover.x)), y: Math.max(40, Math.min(height - 40, raw.rover.y)), h: Math.atan2(Math.sin(raw.rover.h), Math.cos(raw.rover.h)) },
        found, stars: clean(raw.stars, starIds), tasks: clean(raw.tasks, siteIds).filter(id => have.has(id)),
        deep: clean(raw.deep, deepIds), seen: clean(raw.seen, new Set([...siteIds, ...deepIds])), clocks,
        pendingSite, pendingPhase,
        pendingDeep: typeof raw.pendingDeep === "string" && deepIds.has(raw.pendingDeep) && Array.isArray(raw.deep) && raw.deep.includes(raw.pendingDeep) ? raw.pendingDeep : null };
    }
    return { normalize,
      load() { try { const text = storage && storage.getItem(KEY); return text && text.length < 100000 ? normalize(JSON.parse(text)) : null; } catch (_) { return null; } },
      save(value) { try { const data = normalize(value); if (!storage || !data) return false; storage.setItem(KEY, JSON.stringify(data)); return true; } catch (_) { return false; } },
      clear() { try { if (!storage) return false; storage.removeItem(KEY); return true; } catch (_) { return false; } }
    };
  }
  return { create, VERSION, KEY };
})();
if (typeof module !== "undefined") module.exports = Progress;
