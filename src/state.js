import { CONFIG, ITEMS } from './config.js';
import { realDayNumber } from './time.js';

const KEY = 'hbd-pati-v1';
const DEV_KEY = 'hbd-dev';
const DEV_DAY_KEY = 'hbd-dev-day';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const fresh = () => ({ days: {}, items: [], room: { placed: {}, lamp: 0, lampSeen: 1, seen: [], garland: 0 } });
let progress = read(KEY, fresh());
progress.room = { ...fresh().room, ...(progress.room || {}) };

export function dayState(n) {
  return progress.days[n] || { won: false, best: 0, chestOpened: false };
}

function patchDay(n, patch) {
  progress.days[n] = { ...dayState(n), ...patch };
  write(KEY, progress);
}

export function recordScore(n, score) {
  if (score > dayState(n).best) patchDay(n, { best: score });
}

export function markWon(n) {
  if (!dayState(n).won) patchDay(n, { won: true });
}

export const rewardItems = (day) => day.reward.items ?? (day.reward.item ? [day.reward.item] : []);

export function openChest(n) {
  patchDay(n, { chestOpened: true });
  return rewardItems(CONFIG.days[n - 1]);
}

// Posiadane rzeczy wynikają z otwartych skrzynek, więc zmiana nagród w configu
// działa też dla skrzynek otwartych wcześniej.
export function ownedItems() {
  const out = [...(CONFIG.starterItems || [])].filter((id) => ITEMS[id]);
  for (const d of CONFIG.days)
    if (dayState(d.n).chestOpened) for (const id of rewardItems(d)) if (ITEMS[id] && !out.includes(id)) out.push(id);
  for (const id of progress.items) if (ITEMS[id] && !out.includes(id)) out.push(id);
  return out;
}
export const hasItem = (id) => ownedItems().includes(id);
export const ownedDecor = () => ownedItems().filter((id) => ITEMS[id].kind === 'dekoracja');
export const winsCount = () => CONFIG.days.filter((d) => dayState(d.n).won).length;

// --- pokój ---
const saveRoom = () => write(KEY, progress);
// tylko miejsca, które nadal istnieją w configu (stare zapisy z usuniętych miejsc są pomijane)
const slotIds = () => new Set(CONFIG.room.slots.map((s) => s.id));
export function placed() {
  const ids = slotIds();
  return Object.fromEntries(Object.entries(progress.room.placed).filter(([slot, item]) => ids.has(slot) && ITEMS[item]));
}
export const slotOf = (itemId) => Object.keys(placed()).find((s) => progress.room.placed[s] === itemId);

// Wstawia rzecz w miejsce. Jeśli stała gdzie indziej, przenosi ją; jeśli miejsce było zajęte,
// poprzednia rzecz wraca do ekwipunku.
export function placeItem(slotId, itemId) {
  for (const [s, id] of Object.entries(progress.room.placed)) if (id === itemId) delete progress.room.placed[s];
  const displaced = progress.room.placed[slotId];
  progress.room.placed[slotId] = itemId;
  saveRoom();
  return displaced && displaced !== itemId ? displaced : null;
}
export function removeItem(itemId) {
  for (const [s, id] of Object.entries(progress.room.placed)) if (id === itemId) delete progress.room.placed[s];
  saveRoom();
}
export const unseenDecor = () => ownedDecor().filter((id) => !progress.room.seen.includes(id));
export function markSeen(ids) {
  for (const id of ids) if (!progress.room.seen.includes(id)) progress.room.seen.push(id);
  saveRoom();
}

// Lampka: liczba dostępnych kolorów rośnie z każdą wygraną (upgrade).
export const lampUnlocked = (total) => Math.min(total, Math.max(1, winsCount()));
export const lampMode = () => progress.room.lamp;
export function setLampMode(i) {
  progress.room.lamp = i;
  saveRoom();
}
export function lampUpgradeSeen(n) {
  const isNew = n > progress.room.lampSeen;
  progress.room.lampSeen = Math.max(progress.room.lampSeen, n);
  saveRoom();
  return isNew;
}
export const garlandMode = () => progress.room.garland;
export function setGarlandMode(i) {
  progress.room.garland = i;
  saveRoom();
}

export function unopenedChests() {
  return CONFIG.days.filter((d) => dayState(d.n).won && !dayState(d.n).chestOpened).map((d) => d.n);
}

export function codeSlots() {
  return CONFIG.days
    .filter((d) => d.reward.digit)
    .map((d) => (dayState(d.n).won ? d.reward.digit : null));
}

export function resetProgress() {
  progress = fresh();
  write(KEY, progress);
}

// --- tryb testowy ---
export function initDev() {
  const params = new URLSearchParams(location.search);
  if (params.get('dev') === CONFIG.devKey) write(DEV_KEY, true);
  if (params.get('dev') === 'off') {
    write(DEV_KEY, false);
    write(DEV_DAY_KEY, null);
  }
}
export const isDev = () => read(DEV_KEY, false) === true;
export const setDevDay = (n) => write(DEV_DAY_KEY, n);

export function currentDay() {
  const override = isDev() ? read(DEV_DAY_KEY, null) : null;
  return override ?? realDayNumber();
}

// Dziś: grywalna. Wcześniejsza niewygrana: można nadrobić.
// Wcześniejsza wygrana: wraca po finale. Przyszła: kłódka.
export function access(n, today = currentDay()) {
  const finaleDone = dayState(CONFIG.days.length).won;
  if (today > CONFIG.days.length || finaleDone) return 'open';
  if (n === today) return 'today';
  if (n > today) return 'locked';
  return dayState(n).won ? 'done' : 'catchup';
}
