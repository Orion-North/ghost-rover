/* =====================================================================
   GHOST ROVERS · SOUND
   All sound effects and music are made by code with the Web Audio API.
   There are no audio files, so there is nothing to download or credit.
   ===================================================================== */
const Sfx = (() => {
  let ac = null, master, musicBus, sfxBus, eng = null, muted = false, song = null, timer = null, step = 0, nextT = 0;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ac) { if (ac.state === "suspended") ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = .5; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = .9; sfxBus.connect(master);
    // engine hum: two oscillators through a low-pass filter
    const o1 = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o1.type = "sawtooth"; o2.type = "square"; f.type = "lowpass"; f.frequency.value = 320; g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(sfxBus); o1.start(); o2.start();
    eng = { o1, o2, f, g };
    if (song) startMusic();
  }
  function tone(freq, dur, o) {
    if (!ac) return; o = o || {};
    const t = (o.at || ac.currentTime) + (o.delay || 0), osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || "triangle"; osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const v = o.vol == null ? .2 : o.vol;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + (o.attack || .01)); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    osc.connect(g); g.connect(o.bus || sfxBus); osc.start(t); osc.stop(t + dur + .05);
  }
  function noise(dur, vol, freq) {
    if (!ac) return;
    const n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = b; f.type = "lowpass"; f.frequency.value = freq || 500; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(sfxBus); s.start();
  }

  // ---- music: a tiny step sequencer. Each song is a loop of 32 steps. ----
  const SONGS = {
    // Moon: slow, dreamy arpeggios (C, A minor, F, G)
    moon: { bpm: 100, div: 2,
      chords: [[48, 60, 64, 67, 72], [45, 57, 60, 64, 69], [41, 57, 60, 65, 69], [43, 59, 62, 67, 71]],
      arp: [1, 3, 2, 3, 4, 3, 2, 3],
      lead: [76, 0, 0, 79, 0, 76, 0, 0, 72, 0, 0, 76, 0, 0, 74, 0, 72, 0, 0, 69, 0, 72, 0, 0, 74, 0, 0, 79, 0, 0, 74, 0],
      arpType: "triangle", leadType: "sine", arpVol: .11, leadVol: .12, bassVol: .16 },
    // Mars: quicker and bouncier, an adventure tune (D minor, D minor, B flat, C)
    mars: { bpm: 128, div: 2,
      chords: [[38, 62, 65, 69, 74], [38, 62, 65, 69, 74], [34, 58, 62, 65, 70], [36, 60, 64, 67, 72]],
      arp: [1, 0, 2, 1, 3, 0, 2, 3],
      lead: [74, 0, 77, 0, 81, 0, 79, 77, 74, 0, 72, 0, 74, 0, 0, 0, 77, 0, 74, 0, 70, 0, 74, 77, 79, 0, 76, 0, 72, 0, 76, 79],
      arpType: "square", leadType: "triangle", arpVol: .05, leadVol: .13, bassVol: .17, kick: true }
  };
  function schedule() {
    if (!ac || !song) return;
    const s = SONGS[song], stepDur = 60 / s.bpm / s.div;
    while (nextT < ac.currentTime + .25) {
      const i = step % 32, ch = s.chords[Math.floor(i / 8)], k = i % 8, o = { at: nextT, bus: musicBus };
      if (k === 0 || k === 4 || (s.kick && k === 6)) tone(hz(ch[0]), stepDur * 1.8, Object.assign({ type: "triangle", vol: s.bassVol }, o));
      const a = s.arp[k]; if (a) tone(hz(ch[a]), stepDur * .9, Object.assign({ type: s.arpType, vol: s.arpVol }, o));
      if (s.lead[i]) tone(hz(s.lead[i]), stepDur * 2.2, Object.assign({ type: s.leadType, vol: s.leadVol, attack: .02 }, o));
      if (s.kick && k % 2 === 0) tone(110, .09, Object.assign({ type: "sine", to: 45, vol: k % 4 === 0 ? .22 : .08 }, o));
      nextT += stepDur; step++;
    }
  }
  function startMusic() { clearInterval(timer); if (!ac || !song) return; step = 0; nextT = ac.currentTime + .1; timer = setInterval(schedule, 80); }

  return {
    init,
    get muted() { return muted; },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 1; },
    music(name) { if (song === name) return; song = name; if (!name) clearInterval(timer); else startMusic(); },
    engine(speed, on) { // speed 0..1.5
      if (!eng) return; const t = ac.currentTime;
      eng.o1.frequency.setTargetAtTime(42 + speed * 75, t, .08); eng.o2.frequency.setTargetAtTime(63 + speed * 112, t, .08);
      eng.f.frequency.setTargetAtTime(240 + speed * 500, t, .1); eng.g.gain.setTargetAtTime(on ? .028 + speed * .04 : 0, t, .12);
    },
    beep(strength) { tone(880 + strength * 220, .09, { type: "sine", vol: .1 + strength * .03 }); },
    star() { [84, 88, 91, 96].forEach((m, i) => tone(hz(m), .25, { delay: i * .06, vol: .16 })); },
    boost() { tone(180, .5, { type: "sawtooth", to: 700, vol: .08 }); },
    bump(v) { noise(.18, Math.min(.5, .12 + v * .25), 300); tone(70, .15, { type: "sine", to: 40, vol: Math.min(.4, .15 + v * .2) }); },
    count() { tone(523, .22, { type: "square", vol: .13 }); },
    go() { tone(1047, .6, { type: "square", vol: .15 }); tone(1319, .6, { type: "triangle", vol: .12 }); },
    wake() { tone(220, 1.6, { type: "sawtooth", to: 1320, vol: .07 }); for (let i = 0; i < 10; i++) tone(hz(72 + i * 2), .12, { delay: .3 + i * .12, type: "sine", vol: .08 }); },
    found() { [72, 76, 79, 84, 88].forEach((m, i) => tone(hz(m), i === 4 ? .9 : .22, { delay: i * .11, type: "triangle", vol: .2 })); tone(hz(60), 1.2, { delay: .44, vol: .16 }); },
    cheer() { [72, 72, 72, 76, 79, 76, 79, 84].forEach((m, i) => tone(hz(m), .3, { delay: i * .13, type: "square", vol: .1 })); [60, 64, 67, 72].forEach(m => tone(hz(m), 1.6, { delay: 1.05, vol: .12 })); },
    tick() { tone(1500, .035, { type: "sine", vol: .045 }); },
    click() { tone(660, .06, { type: "square", vol: .07 }); }
  };
})();
