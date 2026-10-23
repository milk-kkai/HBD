// Łączy dwa zapisy postępu (np. z telefonu i z serwera). Używane w przeglądarce i w /api/save.
// Postęp dni tylko przybywa (wygrana, otwarta skrzynka, najlepszy wynik), a ułożenie pokoju
// bierzemy z zapisu, który był zmieniany później. Zwracane są tylko znane pola.

const str = (v, max = 40) => typeof v === 'string' && v.length <= max;
const num = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);
const list = (v) => (Array.isArray(v) ? v.filter((x) => str(x)).slice(0, 100) : []);

function cleanRoom(r = {}) {
  const placed = {};
  if (r.placed && typeof r.placed === 'object')
    for (const [slot, item] of Object.entries(r.placed).slice(0, 50)) if (str(slot) && str(item)) placed[slot] = item;
  return {
    placed,
    lamp: num(r.lamp, 0),
    lampSeen: num(r.lampSeen, 1),
    garland: num(r.garland, 0),
    seen: list(r.seen),
    updatedAt: num(r.updatedAt, 0),
  };
}

export function cleanProgress(p = {}) {
  const days = {};
  if (p.days && typeof p.days === 'object')
    for (const [n, d] of Object.entries(p.days)) {
      if (!/^\d{1,2}$/.test(n) || !d) continue;
      days[n] = { won: !!d.won, best: Math.max(0, num(d.best)), chestOpened: !!d.chestOpened };
    }
  return { days, items: list(p.items), room: cleanRoom(p.room), updatedAt: num(p.updatedAt, 0) };
}

export function mergeProgress(a, b) {
  a = cleanProgress(a);
  b = cleanProgress(b);
  const days = {};
  for (const n of new Set([...Object.keys(a.days), ...Object.keys(b.days)])) {
    const x = a.days[n] || {};
    const y = b.days[n] || {};
    days[n] = {
      won: !!(x.won || y.won),
      best: Math.max(x.best || 0, y.best || 0),
      chestOpened: !!(x.chestOpened || y.chestOpened),
    };
  }
  const newer = b.room.updatedAt > a.room.updatedAt ? b.room : a.room;
  return {
    days,
    items: [...new Set([...a.items, ...b.items])],
    room: {
      ...newer,
      seen: [...new Set([...a.room.seen, ...b.room.seen])],
      lampSeen: Math.max(a.room.lampSeen, b.room.lampSeen),
    },
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}

export const sameProgress = (a, b) => JSON.stringify(cleanProgress(a)) === JSON.stringify(cleanProgress(b));
