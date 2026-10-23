// Dzień 1 jest monochromatyczny (sepia jak Game Boy), a z każdym dniem kolory
// akcentów przechodzą z szarości do pełnej barwy. W finale paleta jest pełna.

const BASE = {
  bg: '#d7ceb6',
  paper: '#ece6d6',
  light: '#bfb7a2',
  mid: '#8d877a',
  dark: '#57534b',
  ink: '#2d2b27',
  outside: '#a39b86',
};

const ACCENTS = {
  pink: '#ec7fa4',
  gold: '#efbb45',
  wood: '#b06d3c',
  skin: '#f5c9a6',
  hair: '#7a4128',
  teal: '#4fb6b0',
  green: '#63a65a',
  purple: '#9d72d0',
  sky: '#8fc6ee',
};

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function sepiaOf(color) {
  const [r, g, b] = hex(color);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return mix(hex(BASE.ink), hex(BASE.paper), Math.min(1, lum * 1.05));
}

export function paletteFor(day) {
  const t = Math.min(1, Math.max(0, (day - 1) / 6)) ** 0.85;
  const pal = { ...BASE, white: '#fbf8ef' };
  for (const [k, c] of Object.entries(ACCENTS)) pal[k] = toHex(mix(sepiaOf(c), hex(c), t));
  return pal;
}

export function applyPalette(pal) {
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(pal)) root.setProperty(`--${k}`, v);
}
