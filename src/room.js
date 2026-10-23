// Żywy pokój na ekranie menu: tło z grafiki + nakładki animowane w canvasie.
// Wszystkie współrzędne są w pikselach oryginalnej grafiki pokoju (941×1672).
import city from './city.json';
import { CONFIG } from './config.js';
import { blip } from './audio.js';

const RW = 941;
const RH = 1672;
const Q = 2; // rozdzielczość nakładki: 1 px canvasu = 2 px grafiki

const PATI = { w: 334, h: 920, split: 460, x: 522, feet: 968, height: 400 };
const CANDLE = { x: 389, y: 708 };
const SHEERS = [
  { x0: 287, x1: 392, dir: 1 },
  { x0: 590, x1: 693, dir: -1 },
];
const GLASS = { top: 229, bottom: 606 };
const BEACONS = [
  [393, 243],
  [633, 357],
];
const RUG = { x: 122, y: 1032, w: 700, digitsX: [95, 170, 247, 324], digitsY: 70, iw: 427, ih: 148 };

const LINES = [
  'hej! 👋',
  'ile jeszcze?',
  'czuję tort…',
  'nie klikaj tyle 😤',
  'jutro coś nowego?',
  'okno otwarte, ale ciepło',
  'kto tu był?',
  '29.10 🎂',
];

const pct = (v, total) => `${(v / total) * 100}%`;

function load(src) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

export function mountRoom(host, { day }) {
  const has = (layer) => day >= (CONFIG.room.layers[layer] ?? Infinity);
  host.innerHTML = `
    <div class="room loading">
      <img class="room-bg" src="${CONFIG.room.background}" alt="" draggable="false">
      <div class="glow glow-ceiling"></div>
      <div class="glow glow-desk"></div>
      <canvas class="room-fx"></canvas>
      <div class="pati-shadow"></div>
      <canvas class="pati" aria-label="${CONFIG.name}"></canvas>
      <div class="bubble"></div>
      <div class="rug">
        <img src="/art/rug.png" alt="" draggable="false">
        ${['dni', 'godz', 'min', 'sek']
          .map((l, i) => `<b class="rug-num" data-cd="${l}" style="left:${pct(RUG.digitsX[i], RUG.iw)};top:${pct(RUG.digitsY, RUG.ih)}">00</b>`)
          .join('')}
      </div>
      ${has('pinkLight') ? '<div class="tint tint-pink"></div>' : '<div class="tint tint-warm"></div>'}
    </div>`;

  const room = host.querySelector('.room');
  const fx = room.querySelector('.room-fx');
  const g = fx.getContext('2d');
  fx.width = Math.ceil(RW / Q);
  fx.height = Math.ceil(RH / Q);

  const pc = room.querySelector('.pati');
  const pg = pc.getContext('2d');
  const PAD = 10;
  pc.width = PATI.w;
  pc.height = PATI.h + PAD;
  const scale = PATI.height / PATI.h;
  Object.assign(pc.style, {
    left: pct(PATI.x - (PATI.w * scale) / 2, RW),
    top: pct(PATI.feet - (PATI.h + PAD) * scale, RH),
    height: pct((PATI.h + PAD) * scale, RH),
  });
  const shadow = room.querySelector('.pati-shadow');
  Object.assign(shadow.style, {
    left: pct(PATI.x - 70, RW),
    top: pct(PATI.feet - 14, RH),
    width: pct(140, RW),
    height: pct(26, RH),
  });
  const rug = room.querySelector('.rug');
  Object.assign(rug.style, { left: pct(RUG.x, RW), top: pct(RUG.y, RH), width: pct(RUG.w, RW) });
  const glowC = room.querySelector('.glow-ceiling');
  Object.assign(glowC.style, { left: pct(470 - 300, RW), top: pct(52 - 170, RH), width: pct(600, RW), height: pct(420, RH) });
  const glowD = room.querySelector('.glow-desk');
  Object.assign(glowD.style, { left: pct(845 - 150, RW), top: pct(585 - 110, RH), width: pct(300, RW), height: pct(220, RH) });

  let sprite = null;
  let blinkSprite = null;
  Promise.all([load('/art/pati.webp'), load('/art/pati-blink.webp'), load(CONFIG.room.background)]).then(([a, b]) => {
    sprite = a;
    blinkSprite = b;
    room.classList.remove('loading');
  });

  // --- stan animacji ---
  const t0 = performance.now();
  let raf = 0;
  let nextBlink = 1.5;
  let blinkUntil = 0;
  let hopAt = -10;
  const offLights = new Map();
  let nextLightToggle = 0;
  const parts = [];
  const motes = Array.from({ length: 26 }, () => ({
    x: 150 + Math.random() * 650,
    y: 120 + Math.random() * 800,
    vx: (Math.random() - 0.5) * 4,
    vy: (Math.random() - 0.5) * 3,
    ph: Math.random() * 6.28,
  }));

  const wind = (t) => {
    const n = (Math.sin(t * 0.55) + Math.sin(t * 1.27 + 1.3) * 0.6 + Math.sin(t * 0.21 + 4) * 0.8) / 2.4;
    return Math.max(0, 0.35 + n * 0.65);
  };

  // Firanki rysowane piksel po pikselu do osobnego bufora, potem nakładane na scenę.
  const sheerW = Math.ceil((SHEERS[1].x1 - SHEERS[0].x0) / Q);
  const sheerH = Math.ceil((GLASS.bottom - GLASS.top) / Q);
  const sheerCv = document.createElement('canvas');
  sheerCv.width = sheerW;
  sheerCv.height = sheerH;
  const sg = sheerCv.getContext('2d');
  const sheerImg = sg.createImageData(sheerW, sheerH);

  function drawSheers(t, w) {
    const d = sheerImg.data;
    d.fill(0);
    const ox = Math.floor(SHEERS[0].x0 / Q);
    for (const s of SHEERS) {
      const baseW = (s.x1 - s.x0) / Q;
      const wall = s.dir > 0 ? s.x0 / Q : s.x1 / Q; // krawędź przy zasłonie
      for (let y = 0; y < sheerH; y++) {
        const k = (y / sheerH) ** 1.35;
        const ripple = Math.sin(y * 0.07 - t * 2.3) * (1.5 + w * 5) * k;
        const billow = (w * 22 + Math.sin(t * 0.8) * 3) * k + ripple;
        const lift = w * 14 * k * k;
        if (y > sheerH - 1 - lift) continue; // dół unosi się przy podmuchu
        const outer = wall + s.dir * billow * 0.35;
        const inner = wall + s.dir * (baseW + billow);
        const lo = Math.round(Math.min(outer, inner));
        const hi = Math.round(Math.max(outer, inner));
        const phase = Math.sin(y * 0.025 - t * 1.4) * 1.6 + billow * 0.15;
        const hem = y > sheerH - 3 - lift;
        for (let x = lo; x <= hi; x++) {
          const fromWall = Math.abs(x - outer);
          const fold = 0.5 + 0.5 * Math.sin(fromWall * 0.42 + phase);
          let a = 0.15 + fold * fold * 0.34;
          if (y < 6) a += 0.18; // marszczenie przy karniszu
          if (hem || Math.abs(x - inner) < 1) a = 0.6;
          a *= 1 - (fromWall / (baseW + 10)) * 0.35;
          const px = x - ox;
          if (px < 0 || px >= sheerW) continue;
          const i = (y * sheerW + px) * 4;
          d[i] = 255;
          d[i + 1] = 248;
          d[i + 2] = 240;
          d[i + 3] = Math.min(255, a * 255);
        }
      }
    }
    sg.putImageData(sheerImg, 0, 0);
    g.drawImage(sheerCv, ox, GLASS.top / Q);
  }

  function drawCandle(t) {
    const cx = Math.round(CANDLE.x / Q);
    const by = Math.round(CANDLE.y / Q);
    const jw = 20;
    const jh = 22;
    const x0 = cx - jw / 2;
    const y0 = by - jh;
    // poświata na ścianie i blacie
    const flick = 0.78 + Math.sin(t * 11) * 0.06 + Math.sin(t * 23.7) * 0.05 + Math.random() * 0.07;
    const gr = g.createRadialGradient(cx, y0 - 4, 2, cx, y0 - 4, 75);
    gr.addColorStop(0, `rgba(255,190,110,${0.42 * flick})`);
    gr.addColorStop(0.5, `rgba(255,160,90,${0.14 * flick})`);
    gr.addColorStop(1, 'rgba(255,150,80,0)');
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = gr;
    g.fillRect(cx - 75, y0 - 80, 150, 150);
    g.restore();
    // słoik
    g.fillStyle = '#5a2e2a';
    g.fillRect(x0, y0, jw, jh);
    g.fillStyle = '#fbe3ea';
    g.fillRect(x0 + 1, y0 + 1, jw - 2, jh - 2);
    g.fillStyle = '#f08fb0';
    g.fillRect(x0 + 1, y0 + 7, jw - 2, jh - 8);
    g.fillStyle = '#d9729a';
    g.fillRect(x0 + 1, y0 + 7, jw - 2, 1);
    g.fillStyle = '#fff4e6';
    g.fillRect(x0 + 1, y0 + 12, jw - 2, 5);
    g.fillStyle = '#e06a95';
    g.fillRect(cx - 2, y0 + 13, 2, 1);
    g.fillRect(cx + 1, y0 + 13, 2, 1);
    g.fillRect(cx - 2, y0 + 14, 5, 1);
    g.fillRect(cx - 1, y0 + 15, 3, 1);
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.fillRect(x0 + 2, y0 + 2, 1, 9);
    g.fillRect(x0 + 3, y0 + 2, 1, 3);
    g.fillStyle = 'rgba(255,200,140,0.5)';
    g.fillRect(x0 + 1, y0 + 1, jw - 2, 1);
    g.fillStyle = '#3a2220';
    g.fillRect(cx, y0 + 3, 1, 4);
    // płomień: rząd po rzędzie, szerokość i przechył zmieniają się co klatkę
    const fh = 12 + Math.round(Math.sin(t * 9) * 1.2 + Math.random() * 1.6);
    const lean = Math.sin(t * 3.1) * 0.9 + (Math.random() - 0.5) * 1.1;
    const base = y0 + 4;
    for (let r = 0; r < fh; r++) {
      const p = r / (fh - 1); // 0 = czubek, 1 = podstawa
      const wdt = p < 0.12 ? 1 : p < 0.3 ? 2 : p < 0.55 ? 3 : p < 0.88 ? 5 : 3;
      const off = Math.round(lean * (1 - p) * 1.6);
      const y = base - fh + r;
      const left = cx - Math.floor(wdt / 2) + off;
      g.fillStyle = p < 0.4 ? '#ff7a35' : '#ff9a3c';
      g.fillRect(left, y, wdt, 1);
      if (wdt >= 3) {
        g.fillStyle = '#ffd34d';
        g.fillRect(left + 1, y, wdt - 2, 1);
      }
      if (wdt >= 5 && p > 0.65) {
        g.fillStyle = '#fff6cf';
        g.fillRect(left + 2, y, 1, 1);
      }
    }
    g.fillStyle = '#8fd0ff';
    g.fillRect(cx, base - 1, 1, 1);
    // iskierka unosząca się co jakiś czas
    const spark = (t * 0.8) % 1;
    if (Math.sin(t * 0.9) > 0.6) {
      g.fillStyle = `rgba(255,220,140,${1 - spark})`;
      g.fillRect(cx + Math.round(Math.sin(t * 5) * 2), base - fh - Math.round(spark * 10), 1, 1);
    }
  }

  function drawCity(t) {
    for (const [x, y] of city.stars) {
      const a = 0.15 + 0.85 * Math.max(0, Math.sin(t * (0.8 + (x % 7) * 0.15) + y));
      g.fillStyle = `rgba(255,248,220,${a.toFixed(2)})`;
      g.fillRect(Math.round(x / Q), Math.round(y / Q), 1, 1);
    }
    if (t > nextLightToggle) {
      nextLightToggle = t + 0.25 + Math.random() * 0.6;
      const i = Math.floor(Math.random() * city.lights.length);
      if (offLights.has(i)) offLights.delete(i);
      else offLights.set(i, Math.random() < 0.3 ? 'bright' : 'off');
      if (offLights.size > 22) offLights.delete(offLights.keys().next().value);
    }
    for (const [i, mode] of offLights) {
      const [x, y, w, h] = city.lights[i];
      g.fillStyle = mode === 'off' ? 'rgba(24,26,48,0.92)' : 'rgba(255,246,190,0.65)';
      g.fillRect(Math.floor(x / Q), Math.floor(y / Q), Math.max(1, Math.round(w / Q)), Math.max(1, Math.round(h / Q)));
    }
    const on = Math.sin(t * 3.2) > 0.4;
    for (const [x, y] of BEACONS) {
      if (!on) continue;
      g.fillStyle = '#ff4a5a';
      g.fillRect(Math.round(x / Q), Math.round(y / Q), 2, 2);
      g.fillStyle = 'rgba(255,80,90,0.3)';
      g.fillRect(Math.round(x / Q) - 1, Math.round(y / Q) - 1, 4, 4);
    }
  }

  function drawParticles(t, dt, w) {
    // płatki i listki wpadające przez otwarte okno przy podmuchu
    if (w > 0.55 && Math.random() < dt * (w - 0.45) * 2.2) {
      const fromLeft = Math.random() < 0.5;
      parts.push({
        x: fromLeft ? 300 + Math.random() * 90 : 590 + Math.random() * 90,
        y: 300 + Math.random() * 260,
        vx: (fromLeft ? -1 : 1) * (14 + Math.random() * 30) * (Math.random() < 0.3 ? -1 : 1),
        vy: 12 + Math.random() * 16,
        life: 7 + Math.random() * 3,
        age: 0,
        c: Math.random() < 0.65 ? '#f6a6c1' : '#73b35a',
        ph: Math.random() * 6.28,
      });
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      p.x += (p.vx + Math.sin(t * 2 + p.ph) * 18) * dt;
      p.y += (p.vy + Math.cos(t * 2.4 + p.ph) * 10) * dt;
      if (p.age > p.life) {
        parts.splice(i, 1);
        continue;
      }
      const a = Math.min(1, p.age * 2, (p.life - p.age) / 1.5);
      g.globalAlpha = a;
      g.fillStyle = p.c;
      const flip = Math.sin(t * 6 + p.ph) > 0;
      g.fillRect(Math.round(p.x / Q), Math.round(p.y / Q), flip ? 2 : 1, flip ? 1 : 2);
    }
    g.globalAlpha = 1;
    for (const m of motes) {
      m.x += (m.vx + Math.sin(t * 0.4 + m.ph) * 2) * dt;
      m.y += (m.vy + Math.cos(t * 0.3 + m.ph) * 2) * dt;
      if (m.x < 120) m.x = 800;
      if (m.x > 820) m.x = 120;
      if (m.y < 100) m.y = 900;
      if (m.y > 920) m.y = 100;
      const a = 0.12 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.3 + m.ph));
      g.fillStyle = `rgba(255,236,190,${a.toFixed(2)})`;
      g.fillRect(Math.round(m.x / Q), Math.round(m.y / Q), 1, 1);
    }
  }

  function drawPati(t) {
    if (!sprite) return;
    if (t > nextBlink) {
      blinkUntil = t + 0.13;
      nextBlink = t + 2.2 + Math.random() * 3.8;
      if (Math.random() < 0.2) nextBlink = t + 0.3; // podwójne mrugnięcie
    }
    const src = t < blinkUntil && blinkSprite ? blinkSprite : sprite;
    const breath = 0.5 - 0.5 * Math.cos((t / 3.8) * Math.PI * 2);
    const b = breath * 6;
    const hop = Math.max(0, 1 - (t - hopAt) / 0.35);
    pg.clearRect(0, 0, pc.width, pc.height);
    // górna część (głowa, ramiona) unosi się przy wdechu, nogi stoją
    pg.drawImage(src, 0, 0, PATI.w, PATI.split, 0, PAD - b, PATI.w, PATI.split + b);
    pg.drawImage(src, 0, PATI.split, PATI.w, PATI.h - PATI.split, 0, PAD + PATI.split, PATI.w, PATI.h - PATI.split);
    const sway = Math.sin(t * 0.7) * 0.35;
    const lift = hop > 0 ? Math.sin((1 - hop) * Math.PI) * 4 : 0;
    pc.style.transform = `translateY(${-lift}%) rotate(${sway}deg)`;
    shadow.style.transform = `scale(${1 - lift * 0.04})`;
  }

  let last = t0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    g.clearRect(0, 0, fx.width, fx.height);
    const w = wind(t);
    drawCity(t);
    drawSheers(t, w);
    if (has('candle')) drawCandle(t);
    drawParticles(t, dt, w);
    drawPati(t);
  }
  raf = requestAnimationFrame(frame);

  // kliknięcie w Pati: podskok + dymek
  const bubble = room.querySelector('.bubble');
  Object.assign(bubble.style, { left: pct(PATI.x, RW), top: pct(PATI.feet - PATI.height - 18, RH) });
  let bubbleTimer = 0;
  pc.addEventListener('click', () => {
    hopAt = (performance.now() - t0) / 1000;
    blip(780, 0.06, 'square', 0.05, 240);
    bubble.textContent = LINES[Math.floor(Math.random() * LINES.length)];
    bubble.classList.remove('show');
    void bubble.offsetWidth;
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 2200);
  });

  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(bubbleTimer);
  };
}
