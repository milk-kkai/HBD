import './style.css';
import { CONFIG, ITEMS } from './config.js';
import { zoneMidnight, splitMs, humanIn } from './time.js';
import { paletteFor, applyPalette } from './palette.js';
import { SPR, spriteCanvas, ITEM_SPRITES } from './sprites.js';
import { mountRoom } from './room.js';
import { decorCanvas } from './decor.js';
import { blip, jingle, isMuted, toggleMute, playMusic } from './audio.js';
import * as st from './state.js';
import { mountCatch } from './games/catch.js';
import { startSync, login } from './sync.js';

const GAMES = { catch: mountCatch };

const frame = document.getElementById('frame');
const BIRTHDAY = zoneMidnight(CONFIG.birthdayDate);
const TOTAL = CONFIG.days.length;
const ALL_DECOR = Object.keys(ITEMS).filter((id) => ITEMS[id].kind === 'dekoracja');

let today = 0;
let pal = paletteFor();
let unmountGame = null;
let tickTimer = 0;
let decor = null; // tryb urządzania: { selected: itemId | null }

applyPalette(pal);

// Pokój jest montowany raz i przenoszony między ekranami, żeby nie migał.
const roomHost = document.createElement('div');
roomHost.className = 'room-host';
const room = mountRoom(roomHost, { pal, onPhoto: photoModal });
room.onSlotTap = onSlotTap;
room.onDecorTap = (slotId, itemId) => selectDecor(itemId);

const el = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const dayLabel = (d) => d.date.slice(8, 10) + '.' + d.date.slice(5, 7);
const isDecor = (id) => ITEMS[id]?.kind === 'dekoracja';

// ---------- ekran główny ----------

function home() {
  if (unmountGame) {
    unmountGame();
    unmountGame = null;
  }
  today = st.currentDay();
  const isBirthday = today === TOTAL;
  const chests = st.unopenedChests().length;
  const unseen = st.unseenDecor().length;

  const screen = el(`
    <div class="screen home ${decor ? 'decorating' : ''}">
      <div class="home-ui">
        <div class="hud">
          <div class="hud-col">
            <button class="chip panel-sm" data-act="profile" aria-label="Skrzynki">
              <span class="ico chest-ico"></span><span>${chests}</span>
            </button>
            <button class="sq-btn panel-sm decor-btn ${decor ? 'on' : ''}" data-act="decor" aria-label="Urządzaj pokój">
              <span class="ico mis-ico"></span>${unseen ? `<b class="badge">${unseen}</b>` : ''}
            </button>
          </div>
          <div class="hud-col right">
            <button class="sq-btn panel-sm" data-act="profile" aria-label="Profil"><span class="face-ico"></span></button>
            <button class="sq-btn panel-sm music-btn ${isMuted() ? 'off' : ''}" data-act="music" aria-label="Muzyka">♪</button>
          </div>
        </div>
        <div class="bottom"></div>
      </div>
    </div>`);

  screen.prepend(roomHost);
  screen.querySelector('.chest-ico').append(spriteCanvas(SPR.chest, pal));
  screen.querySelector('.mis-ico').append(decorCanvas('mis', pal));
  if (chests) screen.querySelector('.chip').classList.add('pulse');
  if (unseen) screen.querySelector('.decor-btn').classList.add('pulse');
  const bottom = screen.querySelector('.bottom');
  if (decor) fillTray(bottom);
  else fillMenu(bottom);

  screen.addEventListener('click', onHomeClick);
  swap(screen);
  room.refresh();
  room.setEditing(decor);
  playMusic(isBirthday ? 'hbd' : 'menu');
  tick();
  devPanel();
}

function fillMenu(bottom) {
  const focus = CONFIG.days[Math.min(Math.max(today, 1), TOTAL) - 1];
  bottom.innerHTML = `<div class="today-card"></div><div class="week">${CONFIG.days.map(tileHtml).join('')}</div>`;
  fillTodayCard(bottom.querySelector('.today-card'), focus);
  bottom.querySelectorAll('.tile').forEach((t) => {
    const d = CONFIG.days[Number(t.dataset.n) - 1];
    const a = st.access(d.n, today);
    const ico = t.querySelector('.tile-ico');
    if (a === 'locked') ico.append(spriteCanvas(SPR.lock, pal));
    else if (d.n === TOTAL) ico.append(spriteCanvas(SPR.star, pal));
    else if (st.dayState(d.n).won) ico.append(spriteCanvas(SPR.heart, pal));
    else ico.append(spriteCanvas(SPR.question, pal));
  });
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
  const t = e.target.closest('[data-act], .tile, .tray-item');
  if (!t) return;
  blip(600, 0.04);
  const act = t.dataset.act;
  if (act === 'profile') return profile();
  if (act === 'play') return play(Number(t.dataset.n));
  if (act === 'decor') return toggleDecor();
  if (act === 'music') {
    t.classList.toggle('off', toggleMute());
    return;
  }
  if (act === 'decor-done') return toggleDecor(false);
  if (act === 'decor-remove') {
    st.removeItem(decor.selected);
    room.say(`${ITEMS[decor.selected].name}: do szuflady`);
    decor.selected = null;
    return home();
  }
  if (t.classList.contains('tray-item')) {
    if (t.classList.contains('locked')) return toast('Wygrywaj gry, żeby to zdobyć ♥');
    return selectDecor(decor.selected === t.dataset.item ? null : t.dataset.item);
  }
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
  room.setCountdown({ dni: d, godz: h, min: m, sek: s });
  tickTimer = setTimeout(tick, 1000 - (Date.now() % 1000) + 10);
}

// ---------- urządzanie pokoju ----------

function toggleDecor(on = !decor, selected = null) {
  decor = on ? { selected } : null;
  home();
  if (on) st.markSeen(st.ownedDecor());
}

function selectDecor(id) {
  decor.selected = id;
  if (id) blip(660, 0.05);
  home();
}

function onSlotTap(slotId) {
  if (!decor) return;
  const slot = CONFIG.room.slots.find((s) => s.id === slotId);
  const there = st.placed()[slotId];
  const sel = decor.selected;
  if (!sel) {
    if (there) return selectDecor(there);
    return toast('Najpierw wybierz rzecz z dołu');
  }
  if (!ITEMS[sel].fits.includes(slot.kind)) return toast('To tu nie pasuje');
  if (there === sel) {
    decor.selected = null;
    return home();
  }
  const displaced = st.placeItem(slotId, sel);
  jingle([660, 880], 0.06);
  room.say(displaced ? `zamiana! ${ITEMS[displaced].name} wraca do szuflady` : `${ITEMS[sel].name} ✓`);
  decor.selected = null;
  home();
}

function fillTray(bottom) {
  const owned = st.ownedDecor();
  const map = st.placed();
  const placedIds = Object.values(map);
  const unseen = st.unseenDecor();
  const sel = decor.selected;
  const hint = !owned.length
    ? 'wygrywaj gry, żeby zdobywać rzeczy do pokoju'
    : sel
      ? `${ITEMS[sel].name}: stuknij świecące miejsce`
      : 'wybierz rzecz, potem miejsce w pokoju';
  bottom.innerHTML = `
    <div class="tray">
      <div class="tray-head">
        <div>
          <div class="tray-title">URZĄDZAJ POKÓJ</div>
          <div class="tray-hint">${hint}</div>
        </div>
        ${sel && placedIds.includes(sel) ? '<button class="btn ghost small" data-act="decor-remove">ZDEJMIJ</button>' : ''}
        <button class="btn small" data-act="decor-done">GOTOWE</button>
      </div>
      <div class="tray-items">
        ${ALL_DECOR.map((id) => {
          const has = owned.includes(id);
          const cls = ['tray-item', has ? '' : 'locked', id === sel ? 'sel' : '', placedIds.includes(id) ? 'placed' : '', unseen.includes(id) ? 'new' : ''].join(' ');
          return `<button class="${cls}" data-item="${id}"><span class="ti-img"></span><span class="ti-name">${has ? ITEMS[id].name : '???'}</span></button>`;
        }).join('')}
      </div>
    </div>`;
  bottom.querySelectorAll('.tray-item').forEach((b) => {
    const id = b.dataset.item;
    b.querySelector('.ti-img').append(owned.includes(id) ? decorCanvas(id, pal) : spriteCanvas(SPR.question, pal));
  });
}

// ---------- gra ----------

function play(n) {
  const d = CONFIG.days[n - 1];
  const mount = GAMES[d.game];
  if (!mount) return;
  decor = null;
  room.setEditing(null);
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

function itemIcon(id) {
  if (isDecor(id)) return decorCanvas(id, pal);
  return spriteCanvas(ITEM_SPRITES[id] || SPR.star, pal);
}

function profile() {
  const slots = st.codeSlots();
  const owned = st.ownedItems().filter((id) => !isDecor(id));
  const won = CONFIG.days.filter((d) => d.n < TOTAL && st.dayState(d.n).won).length;
  const chests = st.unopenedChests();
  const itemIds = CONFIG.days.flatMap(st.rewardItems).filter((id) => !isDecor(id));
  const m = modal(`
    <div class="modal-title">KARTA POSTACI</div>
    <div class="prof-top">
      <div class="prof-avatar"><img src="/art/pati.webp" alt=""></div>
      <div class="prof-stats">
        <div class="prof-name">${CONFIG.name.toUpperCase()}</div>
        <div>wygrane dni: <b>${won}/${TOTAL - 1}</b></div>
        <div>przedmioty: <b>${owned.length}/${itemIds.length}</b></div>
        <div>do pokoju: <b>${st.ownedDecor().length}/${ALL_DECOR.length}</b></div>
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

  m.querySelectorAll('.inv-slot').forEach((b) => {
    const id = b.dataset.item;
    b.append(owned.includes(id) ? itemIcon(id) : spriteCanvas(SPR.question, pal));
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
    const ids = st.openChest(n);
    big.replaceChildren(spriteCanvas(SPR.chestOpen, pal));
    m.querySelector('.rays').classList.add('on');
    const loot = m.querySelector('.loot');
    ids.forEach((id) => loot.append(itemIcon(id)));
    loot.classList.add('on');
    jingle([523, 659, 784, 1047, 1319], 0.08);
    m.querySelector('.chest-hint').innerHTML = ids
      .map((id) => `<b>${ITEMS[id].name}</b> <span class="small">· ${isDecor(id) ? 'do pokoju' : ITEMS[id].kind}</span>`)
      .join('<br>');
    const firstDecor = ids.find(isDecor);
    m.querySelector('.chest-after').innerHTML = `
      ${d.reward.digit ? `<div class="small">+ cyfra do tajnego kodu: <b>${d.reward.digit}</b></div>` : ''}
      ${ids.some((id) => ITEMS[id].kind === 'ubranie') ? '<div class="small">ubranie przyda się w finale…</div>' : ''}
      ${firstDecor ? `<button class="btn gold" data-to-decor="${firstDecor}">WSTAW DO POKOJU</button>` : ''}
      <button class="btn ${firstDecor ? 'ghost' : ''}" data-act="close">SUPER!</button>`;
  });
  m.addEventListener('click', (e) => {
    const b = e.target.closest('[data-to-decor]');
    if (!b) return;
    m.remove();
    toggleDecor(true, b.dataset.toDecor);
  });
}

function photoModal(id) {
  const it = ITEMS[id];
  const m = modal(`
    <div class="modal-title photo-title">${it.name}</div>
    <div class="photo-big">${it.photo ? `<img src="${it.photo}" alt="${it.name}">` : ''}</div>
    ${it.photo ? '<div class="small">stuknij, żeby przybliżyć</div>' : ''}
    ${it.desc ? `<div class="small">${it.desc}</div>` : ''}
    <button class="btn small" data-act="close">ZAMKNIJ</button>`, 'photo-modal');
  const box = m.querySelector('.photo-big');
  if (!it.photo) box.append(decorCanvas(id, pal));
  // przybliżenie: stuknięcie przełącza 2,5×, przybliżony obraz można przesuwać palcem
  box.addEventListener('click', (e) => {
    if (!it.photo) return;
    const zoomed = box.classList.toggle('zoom');
    if (zoomed) {
      const r = box.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width;
      const fy = (e.clientY - r.top) / r.height;
      requestAnimationFrame(() => {
        box.scrollLeft = fx * box.scrollWidth - r.width / 2;
        box.scrollTop = fy * box.scrollHeight - r.height / 2;
      });
    }
  });
}

// ---------- logowanie ----------

function showLogin() {
  if (frame.querySelector('.login')) return;
  const box = el(`
    <div class="login">
      <form class="login-box" autocomplete="on">
        <div class="login-face"></div>
        <div class="login-title">HEJ ${CONFIG.name.toUpperCase()}!</div>
        <div class="login-sub">Wpisz hasło, żeby wejść do swojego pokoju</div>
        <input type="text" name="username" value="${CONFIG.name}" autocomplete="username" hidden>
        <input class="login-input" name="password" type="password" autocomplete="current-password"
          autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="40" placeholder="hasło">
        ${CONFIG.passwordHint ? `<div class="login-hint">podpowiedź: ${CONFIG.passwordHint}</div>` : ''}
        <button class="btn play" type="submit">WEJDŹ</button>
        <div class="login-err"></div>
      </form>
    </div>`);
  const form = box.querySelector('form');
  const input = box.querySelector('.login-input');
  const err = box.querySelector('.login-err');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!input.value.trim()) return input.focus();
    const btn = form.querySelector('button');
    btn.disabled = true;
    err.textContent = '';
    const ok = await login(input.value);
    btn.disabled = false;
    if (ok) {
      jingle([523, 659, 784, 1047], 0.08);
      box.classList.add('out');
      setTimeout(() => {
        box.remove();
        home();
      }, 350);
    } else {
      err.textContent = 'To nie to hasło 🙈';
      blip(200, 0.15, 'square', 0.05, -60);
      form.classList.remove('shake');
      void form.offsetWidth;
      form.classList.add('shake');
      input.select();
    }
  });
  frame.append(box);
  setTimeout(() => input.focus(), 60);
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
      <button data-win>wygraj</button><button data-reset>reset</button><button data-off>off</button></div>`);
  p.addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target.dataset.d) st.setDevDay(Math.min(TOTAL + 1, Math.max(0, today + Number(e.target.dataset.d))));
    if ('win' in e.target.dataset) st.markWon(Math.min(Math.max(today, 1), TOTAL));
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
// postęp z chmury: po zmianie odśwież ekran, chyba że Pati jest w grze albo ma otwarte okienko
startSync({
  refresh: () => !unmountGame && !frame.querySelector('.modal, .login') && home(),
  needLogin: showLogin,
});
