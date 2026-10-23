// Dźwięki i muzyka chiptune generowane w Web Audio (bez plików audio).
let ctx = null;
let muted = false;
try {
  muted = localStorage.getItem('hbd-muted') === '1';
} catch {}

export function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
  return ctx;
}

// przeglądarki pozwalają grać dopiero po pierwszym dotknięciu
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => audioCtx(), { once: true, capture: true });
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else ctx.resume();
});

export function blip(freq = 660, dur = 0.08, type = 'square', vol = 0.06, slide = 0) {
  if (muted) return;
  const a = audioCtx();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, a.currentTime + dur);
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur + 0.02);
}

export function jingle(notes, step = 0.09) {
  notes.forEach((f, i) => setTimeout(() => blip(f, step * 1.4, 'square', 0.05), i * step * 1000));
}

export const isMuted = () => muted;
export function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem('hbd-muted', muted ? '1' : '0');
  } catch {}
  if (muted) stopMusic();
  else if (wanted) playMusic(wanted);
  return muted;
}

// ---------------- muzyka ----------------

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const midi = (n) => {
  const m = n.match(/^([A-G]#?)(\d)$/);
  return 12 * (Number(m[2]) + 1) + NOTE[m[1]];
};
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

// "E5:2 -:2 G5:2" → zdarzenia [krok, nuta, długość]; długość w szesnastkach
function seq(str) {
  let t = 0;
  const events = [];
  for (const tok of str.trim().split(/\s+/)) {
    if (tok === '|') continue;
    const [n, d] = tok.split(':');
    const dur = Number(d || 1);
    if (n !== '-') events.push([t, midi(n), dur]);
    t += dur;
  }
  return { events, length: t };
}

const bar16 = (root, hi) => `${root}:2 ${hi}:2 `.repeat(4);

const TRACKS = {
  // skoczny kawałek do gier
  game: {
    bpm: 132,
    vol: 0.5,
    voices: [
      {
        wave: 'pulse25',
        vol: 0.07,
        notes: seq(`
          E5:2 G5:2 C6:2 G5:2 E5:2 G5:2 A5:1 G5:1 E5:2
          C5:2 E5:2 A5:2 E5:2 C5:2 E5:2 G5:1 E5:1 C5:2
          F5:2 A5:2 C6:2 A5:2 F5:2 A5:2 C6:1 D6:1 C6:2
          D6:2 B5:2 G5:2 B5:2 D6:4 G5:4
          G5:1 G5:1 -:1 E5:1 -:1 C5:1 -:1 E5:1 G5:2 A5:2 G5:2 E5:2
          A5:1 A5:1 -:1 E5:1 -:1 C5:1 -:1 E5:1 A5:2 B5:2 A5:2 E5:2
          A5:2 F5:2 A5:2 C6:2 D6:2 C6:2 A5:2 F5:2
          G5:2 B5:2 D6:2 B5:2 G5:2 D5:2 G5:4`),
      },
      {
        wave: 'triangle',
        vol: 0.16,
        notes: seq((bar16('C3', 'C4') + bar16('A2', 'A3') + bar16('F2', 'F3') + bar16('G2', 'G3')).repeat(2)),
      },
    ],
    drums: { kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.' },
  },
  // przytulne lo-fi do pokoju
  menu: {
    bpm: 84,
    vol: 0.42,
    lowpass: 2600,
    voices: [
      {
        wave: 'triangle',
        vol: 0.07,
        notes: seq(`
          F4:2 A4:2 C5:2 E5:2 C5:2 A4:2 F4:2 A4:2
          E4:2 G4:2 B4:2 D5:2 B4:2 G4:2 E4:2 G4:2
          D4:2 F4:2 A4:2 C5:2 A4:2 F4:2 D4:2 F4:2
          C4:2 E4:2 G4:2 B4:2 G4:2 E4:2 C4:2 E4:2`),
      },
      { wave: 'sine', vol: 0.09, notes: seq('A5:6 G5:2 E5:8 G5:6 E5:2 D5:8 F5:4 E5:4 D5:4 C5:4 E5:12 -:4') },
      { wave: 'triangle', vol: 0.14, notes: seq('F2:16 E2:16 D2:16 C2:16') },
    ],
    drums: { kick: 'x...............', hat: '..x...x...x...x.' },
    drumVol: 0.5,
  },
  // urodziny: Happy Birthday w wersji 8-bit (3/4, z przedtaktem)
  hbd: {
    bpm: 112,
    vol: 0.5,
    voices: [
      {
        wave: 'pulse25',
        vol: 0.08,
        notes: seq(`G4:3 G4:1 | A4:4 G4:4 C5:4 | B4:8 G4:3 G4:1 | A4:4 G4:4 D5:4 | C5:8 G4:3 G4:1
          | G5:4 E5:4 C5:4 | B4:4 A4:4 F5:3 F5:1 | E5:4 C5:4 D5:4 | C5:8`),
      },
      {
        wave: 'triangle',
        vol: 0.15,
        notes: seq(`-:4 | C3:4 G3:4 G3:4 | G2:4 D3:4 D3:4 | G2:4 D3:4 D3:4 | C3:4 G3:4 G3:4
          | C3:4 G3:4 G3:4 | F2:4 C3:4 C3:4 | G2:4 D3:4 D3:4 | C3:4 G3:4`),
      },
    ],
    drums: { hat: 'x...' },
    drumVol: 0.6,
  },
};

for (const tr of Object.values(TRACKS)) {
  tr.length = Math.max(...tr.voices.map((v) => v.notes.length));
  for (const v of tr.voices) {
    v.byStep = {};
    for (const ev of v.notes.events) (v.byStep[ev[0]] ||= []).push(ev);
  }
}

let wanted = null;
let cur = null;
let noise = null;
const waves = {};

function pulseWave(a, duty) {
  const n = 32;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let i = 1; i < n; i++) real[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
  return a.createPeriodicWave(real, imag);
}

function note(a, out, wave, f, vol, time, len) {
  const o = a.createOscillator();
  if (wave === 'pulse25') o.setPeriodicWave((waves.p25 ||= pulseWave(a, 0.25)));
  else o.type = wave;
  o.frequency.setValueAtTime(f, time);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(vol, time + 0.006);
  g.gain.exponentialRampToValueAtTime(vol * 0.6, time + 0.09);
  g.gain.setValueAtTime(vol * 0.6, time + Math.max(0.1, len - 0.04));
  g.gain.exponentialRampToValueAtTime(0.0001, time + len);
  o.connect(g).connect(out);
  o.start(time);
  o.stop(time + len + 0.02);
}

function drum(a, out, kind, time, vol) {
  if (kind === 'kick') {
    const o = a.createOscillator();
    const g = a.createGain();
    o.frequency.setValueAtTime(140, time);
    o.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    g.gain.setValueAtTime(0.35 * vol, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    o.connect(g).connect(out);
    o.start(time);
    o.stop(time + 0.18);
    return;
  }
  if (!noise) {
    noise = a.createBuffer(1, a.sampleRate * 0.3, a.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = a.createBufferSource();
  src.buffer = noise;
  const f = a.createBiquadFilter();
  f.type = kind === 'hat' ? 'highpass' : 'bandpass';
  f.frequency.value = kind === 'hat' ? 7000 : 1800;
  const g = a.createGain();
  const len = kind === 'hat' ? 0.04 : 0.12;
  g.gain.setValueAtTime((kind === 'hat' ? 0.06 : 0.16) * vol, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + len);
  src.connect(f).connect(g).connect(out);
  src.start(time);
  src.stop(time + len + 0.02);
}

function pump() {
  const a = ctx;
  if (!cur || !a) return;
  const step = 60 / cur.tr.bpm / 4;
  if (cur.next < a.currentTime - 0.05) cur.next = a.currentTime + 0.05; // po przerwie nie nadrabiaj
  while (cur.next < a.currentTime + 0.15) {
    const i = cur.step % cur.tr.length;
    for (const v of cur.tr.voices)
      for (const [, m, dur] of v.byStep[i] || []) note(a, cur.out, v.wave, hz(m), v.vol, cur.next, dur * step * 0.92);
    for (const [kind, pat] of Object.entries(cur.tr.drums || {}))
      if (pat[cur.step % pat.length] === 'x') drum(a, cur.out, kind, cur.next, cur.tr.drumVol ?? 1);
    cur.next += step;
    cur.step++;
  }
}

export function playMusic(name) {
  wanted = name;
  if (muted) return;
  if (cur?.name === name) return;
  stopMusic();
  const a = audioCtx();
  if (!a) return;
  const tr = TRACKS[name];
  const out = a.createGain();
  out.gain.setValueAtTime(0.0001, a.currentTime);
  out.gain.exponentialRampToValueAtTime(tr.vol, a.currentTime + 0.8);
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = tr.lowpass ?? 6000;
  out.connect(lp).connect(a.destination);
  cur = { name, tr, out, step: 0, next: a.currentTime + 0.08, timer: setInterval(pump, 25) };
  pump();
}

export function stopMusic() {
  if (!cur) return;
  const { out, timer } = cur;
  clearInterval(timer);
  const a = ctx;
  out.gain.cancelScheduledValues(a.currentTime);
  out.gain.setValueAtTime(out.gain.value || 0.0001, a.currentTime);
  out.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.35);
  setTimeout(() => out.disconnect(), 500);
  cur = null;
}
