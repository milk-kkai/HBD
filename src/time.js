import { CONFIG } from './config.js';

const dateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: CONFIG.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
});
const hourFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: CONFIG.timeZone, hour: '2-digit', hourCycle: 'h23',
});

export function zoneDate(t = Date.now()) {
  return dateFmt.format(t);
}

// Północ danego dnia w polskiej strefie (uwzględnia zmianę czasu 25.10).
export function zoneMidnight(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  for (const offsetH of [1, 2, 0, 3]) {
    const t = Date.UTC(y, m - 1, d) - offsetH * 3600e3;
    if (zoneDate(t) === dateStr && hourFmt.format(t) === '00') return t;
  }
  return Date.UTC(y, m - 1, d);
}

// 0 = przed startem, 1–7 = dzień akcji, 8 = po urodzinach
export function realDayNumber(t = Date.now()) {
  const today = zoneDate(t);
  const days = CONFIG.days;
  if (today < days[0].date) return 0;
  const i = days.findIndex((d) => d.date === today);
  return i >= 0 ? i + 1 : days.length + 1;
}

export function splitMs(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
}

export function humanIn(ms) {
  const { d, h, m } = splitMs(ms);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(1, m)}m`;
}
