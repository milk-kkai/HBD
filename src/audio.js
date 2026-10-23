let ctx = null;
let muted = false;
try {
  muted = localStorage.getItem('hbd-muted') === '1';
} catch {}

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function blip(freq = 660, dur = 0.08, type = 'square', vol = 0.06, slide = 0) {
  if (muted) return;
  const a = ac();
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
  return muted;
}
