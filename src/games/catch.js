import { SPR, drawSprite, drawNumber, spriteCanvas } from '../sprites.js';
import { blip, jingle, playMusic, isMuted, toggleMute } from '../audio.js';
import { hasItem, dayState } from '../state.js';

const W = 96;
const FLOOR = 14;
const MAX_LIVES = 3;
const PW = SPR.miniPati.w;
const PH = SPR.miniPati.h + SPR.miniSlipper.h;

const TYPES = [
  { id: 'cake', spr: SPR.cake, w: 0.5, pts: 1 },
  { id: 'gift', spr: SPR.gift, w: 0.14, pts: 2 },
  { id: 'heart', spr: SPR.heart, w: 0.06, pts: 1 },
  { id: 'cloud', spr: SPR.cloud, w: 0.3, pts: 0 },
];

function pickType(score) {
  const cloudBoost = Math.min(0.12, score * 0.003);
  let r = Math.random() * (1 + cloudBoost);
  for (const t of TYPES) {
    r -= t.w + (t.id === 'cloud' ? cloudBoost : 0);
    if (r <= 0) return t;
  }
  return TYPES[0];
}

export function mountCatch(root, { day, pal, onExit, onWin, onScore }) {
  root.innerHTML = `
    <div class="game">
      <div class="hud">
        <div class="hud-l"><span class="ico"></span><span class="score">0</span></div>
        <div class="hud-c hearts"></div>
        <div class="hud-r">
          <button class="sq-btn music-btn ${isMuted() ? 'off' : ''}" data-act="music" aria-label="Muzyka">♪</button>
          <button class="sq-btn" data-act="pause" aria-label="Pauza">II</button>
        </div>
      </div>
      <div class="goal"><div class="goal-fill"></div><span class="goal-txt">cel: ${day.goal}</span></div>
      <div class="stage"><canvas class="world"></canvas><div class="overlay"></div></div>
      <div class="pad">
        <button class="pad-btn" data-dir="-1" aria-label="W lewo">◀</button>
        <button class="pad-btn" data-dir="1" aria-label="W prawo">▶</button>
      </div>
    </div>`;

  const $ = (s) => root.querySelector(s);
  $('.ico').append(spriteCanvas(SPR.cake, pal));
  const scoreEl = $('.score');
  const heartsEl = $('.hearts');
  const goalFill = $('.goal-fill');
  const goalTxt = $('.goal-txt');
  const stage = $('.stage');
  const cv = $('.world');
  const overlay = $('.overlay');
  const g = cv.getContext('2d');

  const alreadyWon = dayState(day.n).won;
  const wearsBow = hasItem('kokardka');
  let H = 160;
  let s; // stan rozgrywki
  let raf = 0;
  let last = 0;
  let mode = 'intro'; // intro | play | pause | over
  let dir = 0;
  let pointerX = null;

  function reset() {
    s = {
      x: W / 2 - PW / 2, score: 0, lives: MAX_LIVES, items: [], parts: [], pops: [],
      spawn: 0.6, t: 0, shake: 0, won: false, hurt: 0, moving: false, blink: 2,
    };
    renderHud();
  }

  function renderHud() {
    scoreEl.textContent = s.score;
    heartsEl.replaceChildren(
      ...Array.from({ length: MAX_LIVES }, (_, i) => spriteCanvas(i < s.lives ? SPR.heart : SPR.heartEmpty, pal)),
    );
    goalFill.style.width = `${Math.min(100, (s.score / day.goal) * 100)}%`;
    goalTxt.textContent = s.score >= day.goal ? 'cel osiągnięty ✓' : `cel: ${s.score}/${day.goal}`;
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    if (!r.width) return;
    H = Math.max(120, Math.round((W * r.height) / r.width));
    cv.width = W;
    cv.height = H;
    draw();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  function showOverlay(html) {
    overlay.innerHTML = html;
    overlay.classList.toggle('show', !!html);
  }

  function intro() {
    mode = 'intro';
    showOverlay(`
      <div class="panel">
        <div class="panel-title">${day.title.toUpperCase()}</div>
        <p>Łap torty i prezenty do koszyka.<br>Chmurki z deszczem psują humor.</p>
        <p class="small">◀ ▶, strzałki albo przeciągnij palcem</p>
        <button class="btn" data-act="start">START</button>
      </div>`);
  }

  function start() {
    reset();
    playMusic('game');
    mode = 'play';
    showOverlay('');
    blip(520, 0.06);
  }

  function pause() {
    if (mode !== 'play') return;
    mode = 'pause';
    showOverlay(`
      <div class="panel">
        <div class="panel-title">PAUZA</div>
        <button class="btn" data-act="resume">WZNÓW</button>
        <button class="btn ghost" data-act="exit">MENU</button>
      </div>`);
  }

  function gameOver() {
    mode = 'over';
    onScore(s.score);
    const best = dayState(day.n).best;
    const chestReady = dayState(day.n).won && !dayState(day.n).chestOpened;
    jingle([392, 330, 262]);
    showOverlay(`
      <div class="panel">
        <div class="panel-title">KONIEC</div>
        <div class="big-num">${s.score}</div>
        <p class="small">rekord: ${best}</p>
        ${chestReady ? '<button class="btn gold" data-act="chest">OTWÓRZ SKRZYNKĘ</button>' : ''}
        <button class="btn" data-act="start">JESZCZE RAZ</button>
        <button class="btn ghost" data-act="exit">MENU</button>
      </div>`);
  }

  function burst(x, y, colors, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 20 + Math.random() * 40;
      s.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: 0.5 + Math.random() * 0.3, c: colors[i % colors.length] });
    }
  }

  function update(dt) {
    s.t += dt;
    const speed = 70;
    let move = dir;
    if (pointerX != null) {
      const target = pointerX - PW / 2;
      move = Math.abs(target - s.x) < 1.5 ? 0 : Math.sign(target - s.x);
    }
    s.moving = !!move;
    s.x = Math.max(0, Math.min(W - PW, s.x + move * speed * dt));
    s.blink -= dt;
    if (s.blink < -0.12) s.blink = 2 + Math.random() * 3;

    s.spawn -= dt;
    if (s.spawn <= 0) {
      const t = pickType(s.score);
      s.items.push({ t, x: 2 + Math.random() * (W - t.spr.w - 4), y: -t.spr.h, vy: 34 + Math.min(70, s.score * 1.6) + Math.random() * 14, wob: Math.random() * 6 });
      s.spawn = Math.max(0.38, 1.05 - s.score * 0.022) * (0.75 + Math.random() * 0.5);
    }

    const py = H - FLOOR - PH;
    const basket = { x: s.x + 2, y: py + 14, w: PW - 4, h: 4 };
    for (const it of s.items) {
      it.y += it.vy * dt;
      const cx = it.x + Math.sin(s.t * 3 + it.wob) * (it.t.id === 'cloud' ? 6 : 0) * dt;
      it.x = Math.max(0, Math.min(W - it.t.spr.w, cx));
      const bottom = it.y + it.t.spr.h;
      if (!it.done && bottom >= basket.y && bottom <= basket.y + basket.h + 6 && it.x + it.t.spr.w > basket.x + 2 && it.x < basket.x + basket.w - 2) {
        it.done = true;
        catchItem(it);
      }
      if (it.y > H) it.done = true;
    }
    s.items = s.items.filter((it) => !it.done);

    for (const p of s.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 90 * dt;
      p.life -= dt;
    }
    s.parts = s.parts.filter((p) => p.life > 0);
    for (const p of s.pops) {
      p.y -= 16 * dt;
      p.life -= dt;
    }
    s.pops = s.pops.filter((p) => p.life > 0);
    s.shake = Math.max(0, s.shake - dt);
    s.hurt = Math.max(0, s.hurt - dt);
  }

  function catchItem(it) {
    const cx = it.x + it.t.spr.w / 2;
    const cy = it.y + it.t.spr.h / 2;
    if (it.t.id === 'cloud') {
      s.lives -= 1;
      s.shake = 0.3;
      s.hurt = 0.5;
      blip(140, 0.25, 'sawtooth', 0.05, -60);
      burst(cx, cy, [pal.sky, pal.mid], 10);
      renderHud();
      if (navigator.vibrate) navigator.vibrate(60);
      if (s.lives <= 0) gameOver();
      return;
    }
    let pts = it.t.pts;
    if (it.t.id === 'heart' && s.lives < MAX_LIVES) {
      s.lives += 1;
      pts = 0;
    }
    s.score += pts;
    if (pts) s.pops.push({ x: cx - 4, y: it.y - 4, txt: `+${pts}`, life: 0.7 });
    blip(it.t.id === 'gift' ? 880 : 660 + Math.min(400, s.score * 8), 0.07, 'square', 0.05);
    burst(cx, cy, [pal.pink, pal.gold, pal.teal]);
    if (!s.won && s.score >= day.goal) {
      s.won = true;
      jingle([523, 659, 784, 1047], 0.1);
      burst(W / 2, H / 2, [pal.pink, pal.gold, pal.teal, pal.purple], 40);
      if (!alreadyWon) onWin();
      toast(alreadyWon ? 'Cel osiągnięty!' : 'WYGRANA! +1 skrzynka');
    }
    renderHud();
  }

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    stage.append(el);
    setTimeout(() => el.remove(), 2200);
  }

  function drawBackground() {
    g.fillStyle = pal.paper;
    g.fillRect(0, 0, W, H);
    // girlanda z chorągiewkami
    const flagColors = [pal.pink, pal.gold, pal.teal, pal.purple];
    g.fillStyle = pal.dark;
    for (let x = 0; x < W; x++) g.fillRect(x, 6 + Math.round(Math.sin((x / W) * Math.PI * 2) * 2), 1, 1);
    for (let i = 0; i < 10; i++) {
      const fx = 4 + i * 12;
      const fy = 7 + Math.round(Math.sin(((fx + 3) / W) * Math.PI * 2) * 2);
      g.fillStyle = flagColors[i % 4];
      for (let r = 0; r < 6; r++) g.fillRect(fx + Math.floor(r / 2), fy + r, 7 - Math.floor(r / 2) * 2, 1);
    }
    // podłoga z płytek jak w lochu ze screena
    const fy = H - FLOOR;
    g.fillStyle = pal.light;
    g.fillRect(0, fy, W, FLOOR);
    g.fillStyle = pal.mid;
    g.fillRect(0, fy, W, 1);
    for (let row = 0; row < 2; row++) {
      const y = fy + 1 + row * 7;
      g.fillRect(0, y + 6, W, 1);
      for (let x = (row % 2) * 6; x < W; x += 12) g.fillRect(x, y, 1, 7);
    }
  }

  function draw() {
    if (!s) reset();
    g.save();
    if (s.shake > 0) g.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 3));
    drawBackground();
    for (const it of s.items) drawSprite(g, it.t.spr, it.x, it.y, pal);
    const py = H - FLOOR - PH;
    if (!(s.hurt > 0 && Math.floor(s.hurt * 20) % 2)) drawMiniPati(py);
    for (const p of s.parts) {
      g.fillStyle = p.c;
      g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    for (const p of s.pops) drawNumber(g, p.txt, p.x, p.y, pal.ink);
    g.restore();
  }

  // mini Pati: przy chodzeniu przebiera kapciami i lekko podskakuje, co jakiś czas mruga
  function drawMiniPati(py) {
    const walking = mode === 'play' && s.moving;
    const step = walking ? Math.floor(s.t * 9) % 2 : -1;
    const bob = walking && step === 0 ? -1 : 0;
    const x = Math.round(s.x);
    const sy = py + SPR.miniPati.h;
    drawSprite(g, SPR.miniSlipper, x + 1, sy - (step === 0 ? 1 : 0), pal);
    drawSprite(g, SPR.miniSlipper, x + 9, sy - (step === 1 ? 1 : 0), pal);
    drawSprite(g, SPR.miniPati, x, py + bob, pal);
    if (s.blink < 0) drawSprite(g, SPR.miniBlink, x + 6, py + bob + 6, pal);
    if (wearsBow) drawSprite(g, SPR.miniBow, x + 11, py + bob - 2, pal);
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (mode === 'play') update(dt);
    draw();
  }

  // --- sterowanie ---
  const onClick = (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    if (act === 'start') start();
    else if (act === 'pause') pause();
    else if (act === 'resume') {
      mode = 'play';
      showOverlay('');
    } else if (act === 'exit') onExit('menu');
    else if (act === 'chest') onExit('chest');
    else if (act === 'music') {
      const off = toggleMute();
      root.querySelector('.music-btn').classList.toggle('off', off);
      if (!off) playMusic('game');
    }
  };
  root.addEventListener('click', onClick);

  root.querySelectorAll('.pad-btn').forEach((b) => {
    const d = Number(b.dataset.dir);
    const down = (e) => {
      e.preventDefault();
      dir = d;
      b.classList.add('down');
    };
    const up = () => {
      if (dir === d) dir = 0;
      b.classList.remove('down');
    };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointerleave', up);
    b.addEventListener('pointercancel', up);
  });

  const toWorldX = (e) => {
    const r = cv.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * W;
  };
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    pointerX = toWorldX(e);
  });
  cv.addEventListener('pointermove', (e) => {
    if (pointerX != null) pointerX = toWorldX(e);
  });
  const release = () => (pointerX = null);
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', release);

  const keys = (e) => {
    const isDown = e.type === 'keydown';
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) dir = isDown ? -1 : dir === -1 ? 0 : dir;
    else if (['ArrowRight', 'd', 'D'].includes(e.key)) dir = isDown ? 1 : dir === 1 ? 0 : dir;
    else if (isDown && (e.key === ' ' || e.key === 'Enter') && mode !== 'play') {
      if (mode === 'pause') {
        mode = 'play';
        showOverlay('');
      } else start();
    } else if (isDown && e.key === 'Escape') pause();
    else return;
    e.preventDefault();
  };
  window.addEventListener('keydown', keys);
  window.addEventListener('keyup', keys);
  const onHide = () => document.hidden && pause();
  document.addEventListener('visibilitychange', onHide);

  reset();
  intro();
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener('keydown', keys);
    window.removeEventListener('keyup', keys);
    document.removeEventListener('visibilitychange', onHide);
  };
}
