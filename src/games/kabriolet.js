// Dzień 2: różowy kabriolet Barbie. Widok z góry, trzy pasy, mini Pati za kierownicą.
// Zbiera serduszka (+1) i diamenty (+3), omija pachołki i wolniejsze auta.
import { SPR, drawSprite, drawNumber, spriteCanvas } from '../sprites.js';
import { blip, jingle, playMusic, isMuted, toggleMute } from '../audio.js';
import { hasItem, dayState, isDev } from '../state.js';

const W = 96;
const MAX_LIVES = 3;
const ROAD_X0 = 18;
const ROAD_X1 = 78;
const LANES = [28, 48, 68]; // środki pasów

const S = (rows) => ({ w: rows[0].length, h: rows.length, rows });

// kabriolet z góry: różowa karoseria, szyba, kremowe fotele, Pati za kierownicą (lewy fotel)
const CAR_ROWS = [
  '...kkkkkkkk...',
  '..kppppppppk..',
  '.kpWppppppWpk.',
  '.kppppppppppk.',
  'kkppppppppppkk',
  'kkppppppppppkk',
  'kkpccccccccpkk',
  '.kpkkkkkkkkpk.',
  '.kpwnnnwwwwpk.',
  '.kpnnHnnwwwpk.',
  '.kpnnnnnwwwpk.',
  '.kpwnnnwwwwpk.',
  '.kpwwwwwwwwpk.',
  '.kpRRRRRRRRpk.',
  'kkppppppppppkk',
  'kkppppppppppkk',
  '.kpRppppppRpk.',
  '..kppppppppk..',
  '...kkkkkkkk...',
];
export const CAR = S(CAR_ROWS);
// inne auta: ten sam kształt, inny kolor, puste fotele
const recolor = (body, shade) =>
  S(CAR_ROWS.map((r) => r.replace(/p/g, body).replace(/R/g, shade).replace(/[nH]/g, 'w')));
const OTHER_CARS = [recolor('t', 'g'), recolor('v', 'd'), recolor('y', 'b')];

const CONE = S(['...kk...', '..kyyk..', '..kwwk..', '.kyyyyk.', '.kwwwwk.', 'kyyyyyyk', 'kkkkkkkk']);
const DIAMOND = S(['.kkkkk.', 'kcWWcck', 'kccccck', '.kccck.', '..kck..', '...k...']);
const PALM = S([
  '..gg...gg..',
  '.gggg.gggg.',
  'gg.ggggg.gg',
  'g..ggggg..g',
  '....kbk....',
  '....kbk....',
  '.....kbk...',
  '.....kbk...',
  '....kbk....',
  '....kbk....',
  '...kbbk....',
  '...kkkk....',
]);
const BUSH = S(['.kkkkk.', 'kgpgpgk', 'kpgggpk', 'kgggggk', '.kkkkk.']);
const BOW = S(['kk.kk', 'kpkpk', '.kpk.']);

export function mountKabriolet(root, { day, pal, onExit, onWin, onScore }) {
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

  const $ = (q) => root.querySelector(q);
  $('.ico').append(spriteCanvas(SPR.heart, pal));
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
  let s;
  let raf = 0;
  let last = 0;
  let mode = 'intro'; // intro | play | pause | over
  let scroll = 0; // przesunięcie drogi (do pasów i dekoracji)
  const deco = []; // palmy i krzaki po bokach

  function reset() {
    s = {
      lane: 1, x: LANES[1] - CAR.w / 2, score: 0, lives: MAX_LIVES, things: [], parts: [], pops: [],
      next: 40, t: 0, shake: 0, won: false, hurt: 0, speed: 46,
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
    if (!deco.length) for (let y = -20; y < H + 20; y += 26) addDeco(y);
    draw();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  function addDeco(y) {
    for (const left of [true, false]) {
      const spr = Math.random() < 0.6 ? PALM : BUSH;
      const x = left ? 1 + Math.random() * (ROAD_X0 - spr.w - 3) : ROAD_X1 + 3 + Math.random() * (W - ROAD_X1 - spr.w - 4);
      deco.push({ spr, x, y: y + Math.random() * 10 });
    }
  }

  const showOverlay = (html) => {
    overlay.innerHTML = html;
    overlay.classList.toggle('show', !!html);
  };

  function intro() {
    mode = 'intro';
    showOverlay(`
      <div class="panel">
        <div class="panel-title">${day.title.toUpperCase()}</div>
        <p>Jedziemy na beforek! Zbieraj serduszka i diamenty.<br>Omijaj pachołki i inne auta.</p>
        <p class="small">◀ ▶, strzałki albo przesuń palcem w bok</p>
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
        <div class="panel-title">KONIEC TRASY</div>
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
      s.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, life: 0.5 + Math.random() * 0.3, c: colors[i % colors.length] });
    }
  }

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    stage.append(el);
    setTimeout(() => el.remove(), 2200);
  }

  function steer(d) {
    if (mode !== 'play') return;
    const lane = Math.max(0, Math.min(2, s.lane + d));
    if (lane === s.lane) return;
    s.lane = lane;
    blip(420 + lane * 80, 0.03, 'triangle', 0.04);
  }

  // nowy rząd na drodze: co najmniej jeden pas zawsze jest wolny od przeszkód
  function spawnRow() {
    const lvl = Math.min(1, s.score / day.goal);
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
    const obstacles = Math.random() < 0.35 + lvl * 0.35 ? (Math.random() < 0.15 + lvl * 0.35 ? 2 : 1) : 0;
    for (let i = 0; i < obstacles; i++) {
      const lane = lanes[i];
      const isCar = Math.random() < 0.4;
      const spr = isCar ? OTHER_CARS[Math.floor(Math.random() * OTHER_CARS.length)] : CONE;
      s.things.push({ kind: isCar ? 'car' : 'cone', spr, x: LANES[lane] - spr.w / 2, y: -spr.h, vy: isCar ? 0.45 : 1 });
    }
    const free = lanes.slice(obstacles);
    if (free.length && Math.random() < 0.85) {
      const lane = free[Math.floor(Math.random() * free.length)];
      const diamond = Math.random() < 0.12;
      const spr = diamond ? DIAMOND : SPR.heart;
      s.things.push({ kind: diamond ? 'diamond' : 'heart', spr, x: LANES[lane] - spr.w / 2, y: -spr.h - 4, vy: 1 });
    }
  }

  function update(dt) {
    s.t += dt;
    s.speed = 46 + Math.min(64, s.score * 1.9) + s.t * 0.25;
    const move = s.speed * dt;
    scroll = (scroll + move) % 1000;
    // samochód płynnie przesuwa się na wybrany pas
    const tx = LANES[s.lane] - CAR.w / 2;
    s.x += (tx - s.x) * Math.min(1, dt * 14);

    s.next -= move;
    if (s.next <= 0) {
      spawnRow();
      s.next = Math.max(26, 46 - s.score * 0.5) + Math.random() * 14;
    }

    const cy = H - CAR.h - 8;
    const car = { x: s.x + 2, y: cy + 2, w: CAR.w - 4, h: CAR.h - 4 };
    for (const it of s.things) {
      it.y += move * it.vy;
      if (it.done) continue;
      const hit = it.x < car.x + car.w && it.x + it.spr.w > car.x && it.y < car.y + car.h && it.y + it.spr.h > car.y;
      if (hit) collide(it);
    }
    s.things = s.things.filter((it) => !it.done && it.y < H + 30);

    for (const d of deco) d.y += move;
    for (let i = deco.length - 1; i >= 0; i--) if (deco[i].y > H + 20) deco.splice(i, 1);
    if (!deco.some((d) => d.y < 6)) addDeco(-24);

    for (const p of s.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt + move * 0.5;
      p.vy += 80 * dt;
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

  function collide(it) {
    const cx = it.x + it.spr.w / 2;
    const cy = it.y + it.spr.h / 2;
    if (it.kind === 'cone' || it.kind === 'car') {
      if (s.hurt > 0) return; // chwila nietykalności po stłuczce
      it.done = true;
      s.lives -= 1;
      s.shake = 0.3;
      s.hurt = 1;
      blip(130, 0.25, 'sawtooth', 0.05, -50);
      burst(cx, cy, [pal.gold, pal.white, pal.mid], 10);
      if (navigator.vibrate) navigator.vibrate(60);
      renderHud();
      if (s.lives <= 0) gameOver();
      return;
    }
    it.done = true;
    const pts = it.kind === 'diamond' ? 3 : 1;
    s.score += pts;
    s.pops.push({ x: cx - 4, y: it.y - 4, txt: `+${pts}`, life: 0.7 });
    blip(it.kind === 'diamond' ? 990 : 660 + Math.min(400, s.score * 8), 0.07, 'square', 0.05);
    burst(cx, cy, it.kind === 'diamond' ? [pal.sky, pal.white, pal.teal] : [pal.pink, pal.white, pal.gold]);
    if (!s.won && s.score >= day.goal) {
      s.won = true;
      jingle([523, 659, 784, 1047], 0.1);
      burst(W / 2, H / 2, [pal.pink, pal.gold, pal.teal, pal.purple], 40);
      if (!alreadyWon) onWin();
      toast(alreadyWon ? 'Cel osiągnięty!' : 'WYGRANA! +1 skrzynka');
    }
    renderHud();
  }

  // --- rysowanie ---
  function drawRoad() {
    // chodnik po bokach: różowe płytki
    g.fillStyle = '#f3c9d4';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#e8b1c1';
    const off = Math.floor(scroll) % 10;
    for (let y = -10 + off; y < H; y += 10) {
      g.fillRect(0, y, ROAD_X0, 1);
      g.fillRect(ROAD_X1, y, W - ROAD_X1, 1);
    }
    // asfalt
    g.fillStyle = '#6b5a72';
    g.fillRect(ROAD_X0, 0, ROAD_X1 - ROAD_X0, H);
    g.fillStyle = '#75647c';
    for (let y = (Math.floor(scroll * 0.9) % 6) - 6; y < H; y += 6) g.fillRect(ROAD_X0 + ((y * 7) % 50) + 3, y, 1, 1);
    // krawężniki w różowo-białe pasy
    const coff = Math.floor(scroll) % 8;
    for (let y = -8 + coff; y < H; y += 8) {
      g.fillStyle = pal.pink;
      g.fillRect(ROAD_X0 - 2, y, 2, 4);
      g.fillRect(ROAD_X1, y, 2, 4);
      g.fillStyle = pal.white;
      g.fillRect(ROAD_X0 - 2, y + 4, 2, 4);
      g.fillRect(ROAD_X1, y + 4, 2, 4);
    }
    // przerywane linie między pasami
    g.fillStyle = 'rgba(255,245,250,0.85)';
    const loff = Math.floor(scroll) % 16;
    for (const x of [38, 58]) for (let y = -16 + loff; y < H; y += 16) g.fillRect(x - 0.5, y, 1, 8);
  }

  function draw() {
    if (!s) reset();
    g.save();
    if (s.shake > 0) g.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 3));
    drawRoad();
    for (const d of deco) drawSprite(g, d.spr, d.x, d.y, pal);
    for (const it of s.things) drawSprite(g, it.spr, it.x, it.y, pal);
    const cy = H - CAR.h - 8;
    if (!(s.hurt > 0 && Math.floor(s.hurt * 12) % 2)) {
      const wob = mode === 'play' ? Math.round(Math.sin(s.t * 20) * 0.4) : 0;
      drawSprite(g, CAR, s.x, cy + wob, pal);
      if (wearsBow) drawSprite(g, BOW, s.x + 5, cy + 7 + wob, pal);
    }
    for (const p of s.parts) {
      g.fillStyle = p.c;
      g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    for (const p of s.pops) drawNumber(g, p.txt, p.x, p.y, pal.white);
    g.restore();
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
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.classList.add('down');
      steer(d);
    });
    const up = () => b.classList.remove('down');
    b.addEventListener('pointerup', up);
    b.addEventListener('pointerleave', up);
    b.addEventListener('pointercancel', up);
  });

  // palec: przesunięcie w bok zmienia pas; krótkie stuknięcie w lewą/prawą połowę też
  let touch = null;
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    touch = { x: e.clientX, moved: false };
  });
  cv.addEventListener('pointermove', (e) => {
    if (!touch) return;
    const dx = e.clientX - touch.x;
    if (Math.abs(dx) > 24) {
      steer(Math.sign(dx));
      touch.x = e.clientX;
      touch.moved = true;
    }
  });
  cv.addEventListener('pointerup', (e) => {
    if (touch && !touch.moved) {
      const r = cv.getBoundingClientRect();
      steer(e.clientX - r.left < r.width / 2 ? -1 : 1);
    }
    touch = null;
  });
  cv.addEventListener('pointercancel', () => (touch = null));

  const keys = (e) => {
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) steer(-1);
    else if (['ArrowRight', 'd', 'D'].includes(e.key)) steer(1);
    else if ((e.key === ' ' || e.key === 'Enter') && mode !== 'play') {
      if (mode === 'pause') {
        mode = 'play';
        showOverlay('');
      } else start();
    } else if (e.key === 'Escape') pause();
    else if (isDev() && (e.key === 'p' || e.key === 'P') && mode === 'play') {
      // tryb testowy: +5 punktów
      for (let i = 0; i < 5; i++) collide({ kind: 'heart', spr: SPR.heart, x: s.x, y: H - 40 });
    } else return;
    e.preventDefault();
  };
  window.addEventListener('keydown', keys);
  const onHide = () => document.hidden && pause();
  document.addEventListener('visibilitychange', onHide);

  reset();
  intro();
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener('keydown', keys);
    document.removeEventListener('visibilitychange', onHide);
  };
}
