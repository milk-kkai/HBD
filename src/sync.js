// Synchronizacja postępu z chmurą (/api/save), chroniona hasłem.
// - serwer bez bazy/hasła (503) albo brak sieci: wszystko działa lokalnie, bez logowania,
// - zły albo brak hasła (401): pokazujemy ekran logowania,
// - tryb testowy (dev): synchronizacja w ogóle wyłączona.
import * as st from './state.js';
import { mergeProgress, sameProgress } from './merge.js';
import { normPassword } from './password.js';

const API = '/api/save';
const PW_KEY = 'hbd-haslo';
let timer = 0;
let enabled = false;
let inflight = null;
let onChange = () => {};
let onNeedLogin = () => {};

const storedPassword = () => {
  try {
    return localStorage.getItem(PW_KEY) || '';
  } catch {
    return '';
  }
};
function storePassword(pw) {
  try {
    if (pw) localStorage.setItem(PW_KEY, pw);
    else localStorage.removeItem(PW_KEY);
  } catch {}
}
const headers = () => ({ 'Content-Type': 'application/json', 'x-haslo': encodeURIComponent(normPassword(storedPassword())) });

// przyjmuje zapis z serwera: łączy z lokalnym i odświeża ekran, jeśli coś się zmieniło
function adopt(remote) {
  if (!remote) return;
  const local = st.getProgress();
  const merged = mergeProgress(local, remote);
  if (sameProgress(merged, local)) return;
  st.replaceProgress(merged);
  onChange();
}

function lostAuth() {
  enabled = false;
  storePassword('');
  onNeedLogin();
}

async function push() {
  clearTimeout(timer);
  timer = 0;
  if (!enabled) return;
  try {
    const r = await fetch(API, { method: 'POST', headers: headers(), body: JSON.stringify({ progress: st.getProgress() }), keepalive: true });
    if (r.status === 401) return lostAuth();
    if (r.ok) adopt((await r.json()).progress);
  } catch {}
}

// 'ok' | 'auth' (trzeba hasła) | 'off' (serwer bez bazy) | 'offline'
function pull() {
  inflight ||= fetchRemote().finally(() => (inflight = null));
  return inflight;
}

async function fetchRemote() {
  try {
    const r = await fetch(API, { headers: headers(), cache: 'no-store' });
    if (r.status === 401) return 'auth';
    if (!r.ok) return r.status === 503 ? 'off' : 'offline';
    const remote = (await r.json()).progress;
    enabled = true;
    adopt(remote);
    // jeśli tutaj jest coś, czego serwer jeszcze nie ma, wyślij
    if (!remote || !sameProgress(mergeProgress(remote, st.getProgress()), remote)) push();
    return 'ok';
  } catch {
    return 'offline';
  }
}

export function startSync({ refresh, needLogin }) {
  if (st.isDev()) return;
  onChange = refresh;
  onNeedLogin = needLogin;
  st.setSaveHook(() => {
    if (!enabled) return;
    clearTimeout(timer);
    timer = setTimeout(push, 1200);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (timer) push(); // zamykanie karty: wyślij od razu
    } else pull().then((s) => s === 'auth' && lostAuth());
  });
  pull().then((s) => s === 'auth' && lostAuth());
}

// logowanie z ekranu hasła: true = wpuszczona, false = złe hasło
export async function login(password) {
  await inflight; // poczekaj na zapytanie ze starym hasłem
  storePassword(normPassword(password));
  const s = await pull();
  if (s === 'auth') {
    storePassword('');
    return false;
  }
  return true;
}
