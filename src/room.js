// Żywy pokój na ekranie menu: tło z grafiki + nakładki animowane w canvasie + dekoracje.
// Wszystkie współrzędne są w pikselach oryginalnej grafiki pokoju (941×1672).
import city from './city.json';
import curtains from './curtains.json';
import { CONFIG, ITEMS, LAMP_MODES } from './config.js';
import { blip, jingle } from './audio.js';
import { createRug } from './rug.js';
import { decorCanvas, decorAspect } from './decor.js';
import * as st from './state.js';

const RW = 941;
const RH = 1672;
const Q = 2; // rozdzielczość nakładki z efektami: 1 px canvasu = 2 px grafiki

const PATI = { w: 334, h: 920, split: 460, x: 522, feet: 972, height: 480 };
const BEACONS = [
  [393, 243],
  [633, 357],
];
const RUG = { x: 110, y: 1030, w: 722 };
const CURTAIN_BOX = { x: 160, y: 190, w: 660, h: 410 };

const LINES = [
  'hej! 👋',
  'ile jeszcze?',
  'czuję tort…',
  'nie klikaj tyle 😤',
  'jutro coś nowego?',
  'okno otwarte, ale ciepło',
  'urządzimy coś?',
  '29.10 🎂',
];

const pct = (v, total) => `${(v / total) * 100}%`;
const z = (y) => 10 + Math.round(y / 10);

function load(src) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

export function mountRoom(host, { pal, onPhoto }) {
  host.innerHTML = `
    <div class="room loading">
      <img class="room-bg" src="${CONFIG.room.background}" alt="" draggable="false">
      <div class="glow glow-ceiling"></div>
      <div class="glow glow-desk"></div>
      <canvas class="room-fx"></canvas>
      <canvas class="curtains"></canvas>
      <canvas class="rug"></canvas>
      <div class="pati-shadow"></div>
      <canvas class="pati" aria-label="${CONFIG.name}"></canvas>
      <div class="bubble"></div>
      <div class="tint tint-lamp"></div>
      <div class="tint tint-warm"></div>
    </div>`;

  const room = host.querySelector('.room');
  const place = (el, x, y, w, h) =>
    Object.assign(el.style, { left: pct(x, RW), top: pct(y, RH), width: pct(w, RW), ...(h != null ? { height: pct(h, RH) } : {}) });

  const fx = room.querySelector('.room-fx');
  const g = fx.getContext('2d');
  fx.width = Math.ceil(RW / Q);
  fx.height = Math.ceil(RH / Q);

  // zasłony z grafiki, rozciągane od strony ściany (bez dziur w tle)
  const cc = room.querySelector('.curtains');
  const cg = cc.getContext('2d');
  cc.width = CURTAIN_BOX.w;
  cc.height = CURTAIN_BOX.h;
  place(cc, CURTAIN_BOX.x, CURTAIN_BOX.y, CURTAIN_BOX.w, CURTAIN_BOX.h);
  const curtainImg = {};

  const rugCv = room.querySelector('.rug');
  const rug = createRug(rugCv);
  place(rugCv, RUG.x, RUG.y, RUG.w);
  rugCv.style.zIndex = 5;

  const pc = room.querySelector('.pati');
  const pg = pc.getContext('2d');
  const PAD = 12;
  pc.width = PATI.w;
  pc.height = PATI.h + PAD;
  const scale = PATI.height / PATI.h;
  Object.assign(pc.style, {
    left: pct(PATI.x - (PATI.w * scale) / 2, RW),
    top: pct(PATI.feet - (PATI.h + PAD) * scale, RH),
    height: pct((PATI.h + PAD) * scale, RH),
    zIndex: z(PATI.feet),
  });
  const shadow = room.querySelector('.pati-shadow');
  place(shadow, PATI.x - 80, PATI.feet - 16, 160, 30);
  shadow.style.zIndex = z(PATI.feet) - 1;
  place(room.querySelector('.glow-ceiling'), 470 - 300, 52 - 170, 600, 420);
  place(room.querySelector('.glow-desk'), 845 - 150, 585 - 110, 300, 220);

  let sprite = null;
  let blinkSprite = null;
  Promise.all([
    load('/art/pati.webp'),
    load('/art/pati-blink.webp'),
    load('/art/curtain-l.png'),
    load('/art/curtain-r.png'),
    load(CONFIG.room.background),
  ]).then(([a, b, cl, cr]) => {
    sprite = a;
    blinkSprite = b;
    curtainImg.l = cl;
    curtainImg.r = cr;
    room.classList.remove('loading');
  });

  // --- dekoracje ---
  const decorEls = new Map(); // slotId -> element
  let editing = null; // { selected: itemId | null }
  const api = { onSlotTap: null, onDecorTap: null };

  function slotRect(slot, itemId) {
    const k = ITEMS[itemId]?.size?.[slot.kind] ?? 1;
    const w = slot.w * k;
    const h = itemId ? w * decorAspect(itemId) : slot.kind === 'garland' ? 40 : slot.w * (slot.kind === 'wall' ? 1.1 : 0.9);
    const top = slot.kind === 'wall' || slot.kind === 'garland' ? slot.y - h / 2 : slot.y - h;
    return { x: slot.x - w / 2, y: top, w, h };
  }

  function garlandSvg(slot) {
    const x0 = slot.x - slot.w / 2;
    const x1 = slot.x + slot.w / 2;
    const sag = slot.sag ?? 34;
    const n = 18;
    const colors = [pal.pink, pal.gold, pal.teal, pal.purple];
    let bulbs = '';
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = x0 + (x1 - x0) * t;
      // punkt na krzywej Béziera z kontrolą w (slot.x, slot.y + 2·sag)
      const y = slot.y + 2 * t * (1 - t) * sag * 2;
      bulbs += `<g class="bulb" style="--d:${(i % 6) * 0.22}s;--i:${i}"><circle cx="${x}" cy="${y + 9}" r="10" fill="${colors[i % 4]}" class="bulb-glow"/><rect x="${x - 4}" y="${y + 3}" width="8" height="10" rx="2" fill="${colors[i % 4]}" stroke="${pal.ink}" stroke-width="2"/></g>`;
    }
    return `<svg class="garland" viewBox="0 0 ${RW} ${RH}" preserveAspectRatio="none">
      <path d="M${x0} ${slot.y} Q ${slot.x} ${slot.y + sag * 2} ${x1} ${slot.y}" fill="none" stroke="${pal.ink}" stroke-width="3"/>${bulbs}</svg>`;
  }

  function renderDecor() {
    for (const el of decorEls.values()) el.remove();
    decorEls.clear();
    const map = st.placed();
    for (const slot of CONFIG.room.slots) {
      const id = map[slot.id];
      if (!id || !ITEMS[id]) continue;
      let el;
      if (slot.kind === 'garland') {
        el = document.createElement('div');
        el.className = 'decor decor-garland';
        el.innerHTML = garlandSvg(slot);
        el.dataset.mode = st.garlandMode();
        el.style.inset = 0;
        // klikalny pas wzdłuż karnisza (reszta warstwy przepuszcza kliknięcia)
        const hit = document.createElement('button');
        hit.className = 'garland-hit';
        place(hit, slot.x - slot.w / 2, slot.y - 10, slot.w, 80);
        el.append(hit);
      } else {
        const r = slotRect(slot, id);
        el = document.createElement('button');
        el.className = `decor decor-${ITEMS[id].action || 'static'}`;
        el.append(decorCanvas(id, pal));
        place(el, r.x, r.y, r.w, r.h);
        if (ITEMS[id].action === 'lamp') el.insertAdjacentHTML('afterbegin', '<span class="lamp-glow"></span>');
      }
      el.style.zIndex = slot.kind === 'garland' ? 8 : z(slot.y);
      el.dataset.slot = slot.id;
      el.dataset.item = id;
      room.append(el);
      decorEls.set(slot.id, el);
    }
    applyLamp();
    renderSlots();
  }

  // --- tryb urządzania: podświetlone miejsca ---
  const slotEls = [];
  function renderSlots() {
    slotEls.forEach((e) => e.remove());
    slotEls.length = 0;
    if (!editing) return;
    const sel = editing.selected;
    const fits = sel ? ITEMS[sel].fits : null;
    const map = st.placed();
    for (const slot of CONFIG.room.slots) {
      const ok = !sel || fits.includes(slot.kind);
      const taken = map[slot.id];
      const r = slotRect(slot, sel && ok ? sel : taken || null);
      const el = document.createElement('button');
      el.className = ['slot', sel ? (ok ? 'fit' : 'nofit') : 'idle', taken ? 'taken' : '', sel && taken === sel ? 'mine' : ''].join(' ');
      el.dataset.slot = slot.id;
      el.innerHTML = taken && taken !== sel ? '<i>⇄</i>' : taken ? '<i>✓</i>' : '<i>+</i>';
      place(el, r.x - 6, r.y - 6, r.w + 12, r.h + 12);
      el.style.zIndex = 600;
      room.append(el);
      slotEls.push(el);
    }
  }

  // --- lampka i jej upgrade'y ---
  const lampModes = () => LAMP_MODES.slice(0, st.lampUnlocked(LAMP_MODES.length));
  function applyLamp() {
    const hasLamp = Object.values(st.placed()).includes('lampka');
    const modes = lampModes();
    const i = st.lampMode();
    room.dataset.lamp = hasLamp && i >= 0 ? modes[Math.min(i, modes.length - 1)].id : 'none';
  }
  function tapLamp() {
    const modes = lampModes();
    const isUpgrade = st.lampUpgradeSeen(modes.length);
    let i = st.lampMode() + 1;
    if (i >= modes.length) i = -1; // po ostatnim kolorze: wyłączona
    st.setLampMode(i);
    applyLamp();
    blip(i < 0 ? 300 : 500 + i * 120, 0.06);
    if (isUpgrade) {
      jingle([523, 784, 1047], 0.08);
      say(`UPGRADE! nowy kolor: ${modes[modes.length - 1].name}`);
    } else say(i < 0 ? 'lampka: wyłączona' : `światło: ${modes[i].name}`);
  }

  // --- kliknięcia w pokoju ---
  room.addEventListener('click', (e) => {
    const slotEl = e.target.closest('.slot');
    if (slotEl) {
      api.onSlotTap?.(slotEl.dataset.slot);
      return;
    }
    const d = e.target.closest('.decor');
    if (!d) return;
    const id = d.dataset.item;
    if (editing) {
      api.onDecorTap?.(d.dataset.slot, id);
      return;
    }
    const action = ITEMS[id].action;
    if (action === 'lamp') tapLamp();
    else if (action === 'plush') {
      d.classList.remove('squish');
      void d.offsetWidth;
      d.classList.add('squish');
      blip(880, 0.05, 'triangle', 0.06, -300);
      say(ITEMS[id].desc);
    } else if (action === 'garland') {
      const m = (st.garlandMode() + 1) % 3;
      st.setGarlandMode(m);
      d.dataset.mode = m;
      blip(700 + m * 150, 0.05);
      say(['lampki: spokojne', 'lampki: wąż', 'lampki: impreza'][m]);
    } else if (action === 'photo') onPhoto?.(id);
    else say(ITEMS[id].desc);
  });

  // --- animacja ---
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

  // Zasłona rozciąga się tylko w stronę okna (od ściany), więc tło nigdy nie prześwituje.
  function drawCurtains(t, w) {
    cg.clearRect(0, 0, cc.width, cc.height);
    for (const side of ['l', 'r']) {
      const img = curtainImg[side];
      if (!img) continue;
      const c = curtains[side];
      const ox = c.x - CURTAIN_BOX.x;
      const oy = c.y - CURTAIN_BOX.y;
      for (let y = 0; y < c.h; y += 2) {
        const k = y / c.h;
        const top = Math.min(1, y / 70);
        const wave = 0.5 + 0.5 * Math.sin(y * 0.022 - t * 1.9 + (side === 'l' ? 0 : 1.7));
        const dx = (w * 11 * (0.35 + 0.65 * k) + wave * (2 + w * 6) * k) * top;
        if (side === 'l') cg.drawImage(img, 0, y, c.w, 2, ox, oy + y, c.w + dx, 2);
        else cg.drawImage(img, 0, y, c.w, 2, ox - dx, oy + y, c.w + dx, 2);
      }
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
    if (Math.sin(t * 3.2) > 0.4) {
      for (const [x, y] of BEACONS) {
        g.fillStyle = '#ff4a5a';
        g.fillRect(Math.round(x / Q), Math.round(y / Q), 2, 2);
        g.fillStyle = 'rgba(255,80,90,0.3)';
        g.fillRect(Math.round(x / Q) - 1, Math.round(y / Q) - 1, 4, 4);
      }
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
      g.globalAlpha = Math.min(1, p.age * 2, (p.life - p.age) / 1.5);
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
    const b = (0.5 - 0.5 * Math.cos((t / 3.8) * Math.PI * 2)) * 6;
    pg.clearRect(0, 0, pc.width, pc.height);
    // górna część (głowa, ramiona) unosi się przy wdechu, nogi stoją
    pg.drawImage(src, 0, 0, PATI.w, PATI.split, 0, PAD - b, PATI.w, PATI.split + b);
    pg.drawImage(src, 0, PATI.split, PATI.w, PATI.h - PATI.split, 0, PAD + PATI.split, PATI.w, PATI.h - PATI.split);
    const hop = Math.max(0, 1 - (t - hopAt) / 0.35);
    const lift = hop > 0 ? Math.sin((1 - hop) * Math.PI) * 4 : 0;
    pc.style.transform = `translateY(${-lift}%) rotate(${Math.sin(t * 0.7) * 0.35}deg)`;
    shadow.style.transform = `scale(${1 - lift * 0.04})`;
  }

  let last = t0;
  let frameNo = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!room.isConnected) return; // pokój schowany na czas gry
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const w = wind(t);
    g.clearRect(0, 0, fx.width, fx.height);
    drawCity(t);
    drawParticles(t, dt, w);
    drawCurtains(t, w);
    if (frameNo++ % 3 === 0) rug.draw(t, w);
    drawPati(t);
  }
  raf = requestAnimationFrame(frame);

  // kliknięcie w Pati: podskok + dymek
  const bubble = room.querySelector('.bubble');
  Object.assign(bubble.style, { left: pct(PATI.x, RW), top: pct(PATI.feet - PATI.height - 14, RH) });
  let bubbleTimer = 0;
  function say(text) {
    bubble.textContent = text;
    bubble.classList.remove('show');
    void bubble.offsetWidth;
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 2400);
  }
  pc.addEventListener('click', () => {
    if (editing) return;
    hopAt = (performance.now() - t0) / 1000;
    blip(780, 0.06, 'square', 0.05, 240);
    say(LINES[Math.floor(Math.random() * LINES.length)]);
  });

  renderDecor();

  return Object.assign(api, {
    setCountdown(vals) {
      rug.set(vals, (performance.now() - t0) / 1000);
    },
    setEditing(state) {
      editing = state;
      room.classList.toggle('editing', !!state);
      renderSlots();
    },
    refresh: renderDecor,
    say,
    destroy() {
      cancelAnimationFrame(raf);
      clearTimeout(bubbleTimer);
    },
  });
}
