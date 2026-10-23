// Wygląd dekoracji do pokoju. To zastępcze sprite'y: jeśli w ITEMS[id].img jest
// ścieżka do grafiki (np. z GPT), używana jest ona zamiast nich.
import { ITEMS } from './config.js';
import { drawSprite } from './sprites.js';

const S = (rows) => ({ w: rows[0].length, h: rows.length, rows });

const SPRITES = {
  mis: S([
    '.kkk......kkk.',
    'kbbbk....kbbbk',
    'kbmbkkkkkkbmbk',
    '.kbbbbbbbbbbk.',
    'kbbbbbbbbbbbbk',
    'kbbkbbbbbbkbbk',
    'kbbbbwwwwbbbbk',
    'kbbbbwkkwbbbbk',
    '.kbbbwwwwbbbk.',
    '..kkbbbbbbkk..',
    '.kbbbppppbbbk.',
    'kbbbbbppbbbbbk',
    'kbbbmmmmmmbbbk',
    'kbbbmmmmmmbbbk',
    '.kbbbbbbbbbbk.',
    'kbbbk....kbbbk',
    '.kkk......kkk.',
  ]),
  zajaczek: S([
    '..kk....kk..',
    '.kwwk..kwwk.',
    '.kwpk..kpwk.',
    '.kwpk..kpwk.',
    '.kwwkkkkwwk.',
    'kwwwwwwwwwwk',
    'kwwkwwwwkwwk',
    'kwpwwkkwwpwk',
    '.kwwwwwwwwk.',
    '..kkwwwwkk..',
    '.kwwwwwwwwk.',
    'kwwwwppwwwwk',
    'kwwwwwwwwwwk',
    '.kwwwwwwwwk.',
    '..kkk..kkk..',
  ]),
  lampka: S([
    '...kkkkkk...',
    '..kppppppk..',
    '..kpWppppk..',
    '.kpWppppppk.',
    '.kppppppppk.',
    'kppppppppppk',
    'kkkkkkkkkkkk',
    '.....yy.....',
    '.....kk.....',
    '.....kk.....',
    '.....kk.....',
    '.....kk.....',
    '...kkkkkk...',
    '..kbbbbbbk..',
    '..kkkkkkkk..',
  ]),
  kwiatek: S([
    '....kk.kk...',
    '...kppkppk..',
    '..kpyppypk..',
    '...kppkppk..',
    '..kgk.kk.k..',
    '.kggk.kgggk.',
    '..kkgkggkk..',
    '....kgk.....',
    '.kkkkkkkkkk.',
    '.kttttttttk.',
    '..kttWtttk..',
    '..kttttttk..',
    '...kkkkkk...',
  ]),
};

function loadImg(src) {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

function heart(g, cx, cy, pal) {
  const rows = ['.kk.kk.', 'kppkppk', 'kpWpppk', 'kpppppk', '.kpppk.', '..kpk..', '...k...'];
  drawSprite(g, S(rows), cx - 3, cy - 3, pal);
}

// zdjęcie zmniejszone do kilku pikseli, żeby pasowało do pixel artu
function drawPhoto(g, img, x, y, w, h) {
  const r = Math.max(w / img.width, h / img.height);
  const sw = w / r;
  const sh = h / r;
  g.imageSmoothingEnabled = true;
  g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  g.imageSmoothingEnabled = false;
}

const FRAMES = {
  ramka: { w: 18, h: 15, inner: [3, 3, 12, 9] },
  polaroid: { w: 14, h: 17, inner: [1, 1, 12, 11] },
  plakat: { w: 15, h: 20, inner: [1, 1, 13, 18] },
};

function drawFrame(g, id, pal, photo) {
  const f = FRAMES[id];
  const [ix, iy, iw, ih] = f.inner;
  g.fillStyle = pal.ink;
  g.fillRect(0, 0, f.w, f.h);
  if (id === 'ramka') {
    g.fillStyle = pal.wood;
    g.fillRect(1, 1, f.w - 2, f.h - 2);
    g.fillStyle = pal.gold;
    g.fillRect(2, 2, f.w - 4, f.h - 4);
  } else if (id === 'polaroid') {
    g.fillStyle = pal.white;
    g.fillRect(1, 1, f.w - 2, f.h - 2);
  }
  if (photo) drawPhoto(g, photo, ix, iy, iw, ih);
  else if (id === 'plakat') {
    const bands = [pal.purple, pal.pink, pal.gold];
    for (let y = 0; y < ih; y++) {
      g.fillStyle = bands[Math.floor((y / ih) * 3)];
      g.fillRect(ix, iy + y, iw, 1);
    }
    g.fillStyle = pal.white;
    g.fillRect(ix + 2, iy + ih - 4, iw - 4, 1);
    g.fillRect(ix + 3, iy + ih - 2, iw - 6, 1);
    heart(g, ix + iw / 2, iy + 6, pal);
  } else {
    g.fillStyle = pal.paper;
    g.fillRect(ix, iy, iw, ih);
    heart(g, ix + Math.floor(iw / 2), iy + Math.floor(ih / 2), pal);
  }
  if (id === 'polaroid') {
    // taśma klejąca
    g.fillStyle = 'rgba(255,244,220,0.8)';
    g.fillRect(4, -1 + 1, 6, 2);
  }
  if (id === 'plakat') {
    g.fillStyle = pal.pink;
    g.fillRect(1, 1, 1, 1);
    g.fillRect(f.w - 2, 1, 1, 1);
  }
}

// Ramka w wysokiej rozdzielczości dla ważnych obrazków: rysunek pokazany dokładnie, bez pixelizacji.
const HI = { w: 320, border: 18, mat: 14 };
function hiresSize(item) {
  const inner = HI.w - 2 * (HI.border + HI.mat);
  return { w: HI.w, h: Math.round(inner * item.photoAspect) + 2 * (HI.border + HI.mat), inner };
}

function drawHires(cv, item, img) {
  const { w, h, inner } = hiresSize(item);
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d');
  const b = HI.border;
  // drewniana rama: ciemny obrys, słoje w paskach, złota listwa od środka
  g.fillStyle = '#4a2416';
  g.fillRect(0, 0, w, h);
  const woods = ['#a8683c', '#b5764a', '#9c5e36', '#b06f42'];
  for (let i = 3; i < b; i += 3) {
    g.fillStyle = woods[(i / 3) % woods.length];
    g.fillRect(i, i, w - 2 * i, h - 2 * i);
  }
  g.fillStyle = '#e8b54a';
  g.fillRect(b - 4, b - 4, w - 2 * (b - 4), h - 2 * (b - 4));
  g.fillStyle = '#fff1c9';
  g.fillRect(b - 4, b - 4, w - 2 * (b - 4), 1);
  // passe-partout z delikatnym cieniem do środka
  g.fillStyle = '#fbf3e6';
  g.fillRect(b, b, w - 2 * b, h - 2 * b);
  g.fillStyle = 'rgba(120,80,50,0.18)';
  g.fillRect(b, b, w - 2 * b, 3);
  g.fillRect(b, b, 3, h - 2 * b);
  const px = b + HI.mat;
  if (img) {
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, px, px, inner, h - 2 * px);
  }
  g.strokeStyle = 'rgba(80,50,30,0.35)';
  g.lineWidth = 1;
  g.strokeRect(px - 0.5, px - 0.5, inner + 1, h - 2 * px + 1);
}

// Zwraca canvas z dekoracją (wyświetlany w CSS z image-rendering: pixelated).
export function decorCanvas(id, pal) {
  const item = ITEMS[id];
  const cv = document.createElement('canvas');
  cv.className = 'decor-img';
  const g = cv.getContext('2d');
  if (item.hires) {
    cv.classList.add('smooth');
    drawHires(cv, item, null);
    loadImg(item.photo).then((im) => im && drawHires(cv, item, im));
    return cv;
  }
  if (item.img) {
    loadImg(item.img).then((im) => {
      if (!im) return;
      cv.width = im.width;
      cv.height = im.height;
      cv.classList.add('smooth');
      g.drawImage(im, 0, 0);
    });
    cv.width = 1;
    cv.height = 1;
    return cv;
  }
  if (FRAMES[id]) {
    cv.width = FRAMES[id].w;
    cv.height = FRAMES[id].h;
    drawFrame(g, id, pal, null);
    if (item.photo) loadImg(item.photo).then((im) => im && drawFrame(g, id, pal, im));
    return cv;
  }
  if (id === 'girlanda') {
    cv.width = 16;
    cv.height = 6;
    g.fillStyle = pal.ink;
    for (let x = 0; x < 16; x++) g.fillRect(x, 1 + Math.round(Math.sin((x / 15) * Math.PI) * 2), 1, 1);
    [pal.pink, pal.gold, pal.teal, pal.purple].forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(2 + i * 4, 3 + (i % 2), 2, 2);
    });
    return cv;
  }
  const spr = SPRITES[id];
  cv.width = spr.w;
  cv.height = spr.h;
  drawSprite(g, spr, 0, 0, pal);
  return cv;
}

// proporcje (wysokość / szerokość) do rozplanowania w pokoju
export function decorAspect(id) {
  if (ITEMS[id].hires) {
    const { w, h } = hiresSize(ITEMS[id]);
    return h / w;
  }
  if (FRAMES[id]) return FRAMES[id].h / FRAMES[id].w;
  if (SPRITES[id]) return SPRITES[id].h / SPRITES[id].w;
  return ITEMS[id].aspect ?? 1;
}
