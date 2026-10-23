import { CONFIG } from './config.js';
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

let progress = read(KEY, { days: {}, items: [] });

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

export function openChest(n) {
  const day = CONFIG.days[n - 1];
  patchDay(n, { chestOpened: true });
  const item = day.reward.item;
  if (item && !progress.items.includes(item)) {
    progress.items.push(item);
    write(KEY, progress);
  }
  return item;
}

export const hasItem = (id) => progress.items.includes(id);
export const ownedItems = () => [...progress.items];

export function unopenedChests() {
  return CONFIG.days.filter((d) => dayState(d.n).won && !dayState(d.n).chestOpened).map((d) => d.n);
}

export function codeSlots() {
  return CONFIG.days
    .filter((d) => d.reward.digit)
    .map((d) => (dayState(d.n).won ? d.reward.digit : null));
}

export function resetProgress() {
  progress = { days: {}, items: [] };
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
