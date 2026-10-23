import './style.css';
import { CONFIG, ITEMS } from './config.js';
import { zoneMidnight, splitMs, humanIn } from './time.js';
import { paletteFor, applyPalette } from './palette.js';
import { SPR, spriteCanvas, ITEM_SPRITES } from './sprites.js';
import { mountRoom } from './room.js';
import { blip, jingle, isMuted, toggleMute } from './audio.js';
import * as st from './state.js';
import { mountCatch } from './games/catch.js';

const GAMES = { catch: mountCatch };

const frame = document.getElementById('frame');
const BIRTHDAY = zoneMidnight(CONFIG.birthdayDate);
const TOTAL = CONFIG.days.length;

let today = 0;
let pal = null;
let unmountGame = null;
let tickTimer = 0;
let unmountRoom = null;

st.initDev();

function refreshDay() {
  today = st.currentDay();
  pal = paletteFor();
  applyPalette(pal);
}

function stopRoom() {
  if (unmountRoom) {
    unmountRoom();
    unmountRoom = null;
  }
}

const el = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const pad2 = (n) => String(n).padStart(2, '0');
const dayLabel = (d) => d.date.slice(8, 10) + '.' + d.date.slice(5, 7);

// ---------- ekran główny ----------

function home() {
  if (unmountGame) {
    unmountGame();
    unmountGame = null;
  }
  refreshDay();
  const isBirthday = today === TOTAL;
  const after = today > TOTAL;
  const focus = CONFIG.days[Math.min(Math.max(today, 1), TOTAL) - 1];
  const chests = st.unopenedChests().length;

  const screen = el(`
    <div class="screen home">
      <div class="room-host"></div>
      <div class="home-ui">
        <div class="hud">
          <button class="chip panel-sm" data-act="profile" aria-label="Skrzynki">
            <span class="ico chest-ico"></span><span>${chests}</span>
          </button>
          <div class="day-pill panel-sm">
            <div class="day-lbl">${after ? 'PO URODZINACH' : isBirthday ? 'URODZINY!' : `DZIEŃ ${Math.max(today, 1)}/${TOTAL}`}</div>
            <div class="dots">${CONFIG.days.map((d) => `<i class="${d.n < today || after ? 'past' : d.n === today ? 'now' : ''}"></i>`).join('')}</div>
          </div>
          <button class="sq-btn panel-sm" data-act="profile" aria-label="Profil"><span class="face-ico"></span></button>
        </div>
        <div class="bottom">
          <div class="today-card"></div>
          <div class="week">
            ${CONFIG.days.map((d) => tileHtml(d)).join('')}
          </div>
        </div>
      </div>
    </div>`);

  screen.querySelector('.chest-ico').append(spriteCanvas(SPR.chest, pal));
  if (chests) screen.querySelector('.chip').classList.add('pulse');
  fillTodayCard(screen.querySelector('.today-card'), focus);
  stopRoom();
  unmountRoom = mountRoom(screen.querySelector('.room-host'), { day: Math.max(today, 1) });
  screen.querySelectorAll('.tile').forEach((t) => {
    const d = CONFIG.days[Number(t.dataset.n) - 1];
    const a = st.access(d.n, today);
    const ico = t.querySelector('.tile-ico');
    if (a === 'locked') ico.append(spriteCanvas(SPR.lock, pal));
    else if (d.n === TOTAL) ico.append(spriteCanvas(SPR.star, pal));
    else if (st.dayState(d.n).won) ico.append(spriteCanvas(SPR.heart, pal));
    else ico.append(spriteCanvas(SPR.question, pal));
  });

  screen.addEventListener('click', onHomeClick);
  swap(screen);
  tick();
  devPanel();
}

function tileHtml(d) {
  const a = st.access(d.n, today);
  return `<button class="tile ${a} ${d.n === today ? 'is-today' : ''} ${d.n === TOTAL ? 'final' : ''}" data-n="${d.n}">
      <span class="tile-dow">${d.dow}</span><span class="tile-ico"></span><span class="tile-date">${dayLabel(d)}</span>
    </button>`;
}

function fillTodayCard(card, d) {
  const a = st.access(d.n, today);
  const ds = st.dayState(d.n);
  const ready = !!GAMES[d.game];
  const catchups = CONFIG.days.filter((x) => st.access(x.n, today) === 'catchup' && GAMES[x.game]);
  card.innerHTML = `
    <div class="tc-icon"></div>
    <div class="tc-body">
      <div class="tc-tag">${today > TOTAL ? 'wybierz grę niżej' : `dzisiaj · ${d.dow} ${dayLabel(d)}`}</div>
      <div class="tc-title">${ready ? d.title : '???'}</div>
      <div class="tc-meta">${ready ? (d.goal ? `rekord: ${ds.best} · cel: ${d.goal}` : '') + (ds.won ? ' · ✓' : '') : 'gra jeszcze się ładuje… wróć za chwilę'}</div>
    </div>
    ${ready && (a === 'today' || a === 'open') ? `<button class="btn play" data-act="play" data-n="${d.n}">▶ GRAJ</button>` : ''}
    ${catchups.length && !(a === 'today' && !ds.won) ? `<button class="btn small catchup" data-act="play" data-n="${catchups[0].n}">nadrób: ${catchups[0].title}</button>` : ''}`;
  const icon = { catch: SPR.cake, finale: SPR.star }[d.game] || SPR.question;
  card.querySelector('.tc-icon').append(spriteCanvas(icon, pal));
}

function onHomeClick(e) {
  const t = e.target.closest('[data-act], .tile');
  if (!t) return;
  blip(600, 0.04);
  if (t.dataset.act === 'profile') return profile();
  if (t.dataset.act === 'play') return play(Number(t.dataset.n));
  if (t.classList.contains('tile')) {
    const d = CONFIG.days[Number(t.dataset.n) - 1];
    const a = st.access(d.n, today);
    if (a === 'locked') toast(`Odblokuje się za ${humanIn(zoneMidnight(d.date) - Date.now())}`);
    else if (a === 'done') toast('Wygrana ✓ Wróci po urodzinach ♥');
    else if (!GAMES[d.game]) toast('Ta gra jeszcze się szykuje…');
    else play(d.n);
  }
}

function tick() {
  clearTimeout(tickTimer);
  if (st.currentDay() !== today && !unmountGame) return home();
  const { d, h, m, s } = splitMs(BIRTHDAY - Date.now());
  const prevSec = frame.querySelector('[data-cd="sek"]')?.textContent;
  const vals = { dni: d, godz: h, min: m, sek: s };
  frame.querySelectorAll('[data-cd]').forEach((b) => (b.textContent = pad2(vals[b.dataset.cd])));
  const sec = frame.querySelector('[data-cd="sek"]');
  if (sec && prevSec !== sec.textContent) {
    sec.classList.remove('tick');
    void sec.offsetWidth;
    sec.classList.add('tick');
  }
  tickTimer = setTimeout(tick, 1000 - (Date.now() % 1000) + 10);
}

// ---------- gra ----------

function play(n) {
  const d = CONFIG.days[n - 1];
  const mount = GAMES[d.game];
  if (!mount) return;
  stopRoom();
  const screen = el('<div class="screen"></div>');
  swap(screen);
  unmountGame = mount(screen, {
    day: d,
    pal,
    onScore: (score) => st.recordScore(n, score),
    onWin: () => st.markWon(n),
    onExit: (why) => {
      home();
      if (why === 'chest') openChestModal(n);
    },
  });
}

// ---------- modale ----------

function modal(html, cls = '') {
  frame.querySelector('.modal')?.remove();
  const m = el(`<div class="modal ${cls}"><div class="modal-box">${html}</div></div>`);
  m.addEventListener('click', (e) => {
    if (e.target === m || e.target.closest('[data-act="close"]')) {
      m.remove();
      home();
    }
  });
  frame.append(m);
  return m;
}

function profile() {
  const slots = st.codeSlots();
  const owned = st.ownedItems();
  const won = CONFIG.days.filter((d) => d.n < TOTAL && st.dayState(d.n).won).length;
  const chests = st.unopenedChests();
  const itemIds = CONFIG.days.map((d) => d.reward.item).filter(Boolean);
  const m = modal(`
    <div class="modal-title">KARTA POSTACI</div>
    <div class="prof-top">
      <div class="prof-avatar"></div>
      <div class="prof-stats">
        <div class="prof-name">${CONFIG.name.toUpperCase()}</div>
        <div>wygrane dni: <b>${won}/${TOTAL - 1}</b></div>
        <div>przedmioty: <b>${owned.length}/${itemIds.length}</b></div>
      </div>
    </div>
    <div class="sec-lbl">TAJNY KOD</div>
    <div class="code">${slots.map((c, i) => `${i === 2 ? '<span class="code-dot">.</span>' : ''}<span class="code-slot ${c ? 'got' : ''}">${c ?? ''}</span>`).join('')}</div>
    <div class="sec-lbl">EKWIPUNEK</div>
    <div class="inv">${itemIds.map((id) => `<button class="inv-slot ${owned.includes(id) ? 'got' : ''}" data-item="${id}"></button>`).join('')}</div>
    <div class="inv-desc">kliknij przedmiot</div>
    ${chests.length ? `<button class="btn gold" data-chest="${chests[0]}">OTWÓRZ SKRZYNKĘ (${chests.length})</button>` : ''}
    <div class="row">
      <button class="btn ghost small" data-act="mute">${isMuted() ? '♪ dźwięk: off' : '♪ dźwięk: on'}</button>
      <button class="btn small" data-act="close">ZAMKNIJ</button>
    </div>`);

  m.querySelector('.prof-avatar').innerHTML = '<img src="/art/pati.webp" alt="">';
  m.querySelectorAll('.inv-slot').forEach((b) => {
    const id = b.dataset.item;
    b.append(spriteCanvas(owned.includes(id) && ITEM_SPRITES[id] ? ITEM_SPRITES[id] : SPR.question, pal));
  });
  m.addEventListener('click', (e) => {
    const slot = e.target.closest('.inv-slot');
    if (slot) {
      const it = ITEMS[slot.dataset.item];
      m.querySelector('.inv-desc').textContent = slot.classList.contains('got') ? `${it.name} (${it.kind}) · ${it.desc}` : 'jeszcze nie zdobyte';
    }
    const ch = e.target.closest('[data-chest]');
    if (ch) openChestModal(Number(ch.dataset.chest));
    if (e.target.closest('[data-act="mute"]')) {
      toggleMute();
      profile();
    }
  });
}

function openChestModal(n) {
  const d = CONFIG.days[n - 1];
  let taps = 0;
  const m = modal(`
    <div class="modal-title">SKRZYNKA · DZIEŃ ${n}</div>
    <div class="chest-stage"><div class="rays"></div><div class="chest-big"></div><div class="loot"></div></div>
    <div class="chest-hint">stuknij 3 razy</div>
    <div class="chest-after"></div>`, 'chest-modal');
  const big = m.querySelector('.chest-big');
  big.append(spriteCanvas(SPR.chest, pal));
  big.addEventListener('click', () => {
    if (taps >= 3) return;
    taps++;
    big.classList.remove('shake');
    void big.offsetWidth;
    big.classList.add('shake');
    blip(300 + taps * 120, 0.08);
    if (navigator.vibrate) navigator.vibrate(30);
    if (taps < 3) {
      m.querySelector('.chest-hint').textContent = taps === 1 ? 'jeszcze 2…' : 'jeszcze raz!';
      return;
    }
    const itemId = st.openChest(n);
    const it = ITEMS[itemId];
    big.replaceChildren(spriteCanvas(SPR.chestOpen, pal));
    m.querySelector('.rays').classList.add('on');
    const loot = m.querySelector('.loot');
    loot.append(spriteCanvas(ITEM_SPRITES[itemId] || SPR.star, pal));
    loot.classList.add('on');
    jingle([523, 659, 784, 1047, 1319], 0.08);
    m.querySelector('.chest-hint').innerHTML = `<b>${it.name}</b><br><span class="small">${it.kind} · ${it.desc}</span>`;
    m.querySelector('.chest-after').innerHTML = `
      ${d.reward.digit ? `<div class="small">+ cyfra do tajnego kodu: <b>${d.reward.digit}</b></div>` : ''}
      ${it.kind === 'ubranie' ? '<div class="small">to ubranie przyda się w finale…</div>' : ''}
      <button class="btn" data-act="close">SUPER!</button>`;
  });
}

function toast(msg) {
  frame.querySelector('.toast.global')?.remove();
  const t = el(`<div class="toast global">${msg}</div>`);
  frame.append(t);
  setTimeout(() => t.remove(), 2200);
}

function swap(screen) {
  frame.querySelector('.screen')?.remove();
  frame.querySelector('.modal')?.remove();
  frame.prepend(screen);
}

function devPanel() {
  if (!st.isDev()) return;
  frame.querySelector('.dev')?.remove();
  const p = el(`<div class="dev">DEV
      <button data-d="-1">−</button><b>${today}</b><button data-d="1">+</button>
      <button data-reset>reset</button><button data-off>off</button></div>`);
  p.addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target.dataset.d) st.setDevDay(Math.min(TOTAL + 1, Math.max(0, today + Number(e.target.dataset.d))));
    if ('reset' in e.target.dataset) st.resetProgress();
    if ('off' in e.target.dataset) {
      st.setDevDay(null);
      location.search = '?dev=off';
      return;
    }
    home();
  });
  frame.append(p);
}

document.addEventListener('visibilitychange', () => !document.hidden && !unmountGame && home());
home();
