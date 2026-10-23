// Ciepła paleta dopasowana do pokoju i dywanu (bordowy tusz jak haft na dywanie).
const BASE = {
  bg: '#f6e3d3',
  paper: '#fff5ea',
  light: '#efcfba',
  mid: '#c99682',
  dark: '#8a4f4f',
  ink: '#4a1f33',
  outside: '#1f1527',
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

export function paletteFor() {
  return { ...BASE, ...ACCENTS, white: '#fffdf8' };
}

export function applyPalette(pal) {
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(pal)) root.setProperty(`--${k}`, v);
}
