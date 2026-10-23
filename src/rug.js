// Dywan z licznikiem, rysowany oczko po oczku jak dzianina.
// Tło (ramki, napis, kwiatki) rysuje się raz, cyfry i frędzle co klatkę.
// Cyfry zmieniają się jak w liczniku z bębenkami: stara zjeżdża w dół, nowa wjeżdża z góry.

const C = 4; // jedno oczko = 4×4 px canvasu
const GW = 128;
const GH = 50;
const BODY0 = 5;
const BODY1 = 122;

const COL = {
  cream: ['#f7e7d4', '#f3dfca', '#fbeee0'],
  maroon: '#6e1f40',
  pink: '#e0708f',
  heart: '#d84a63',
  heartHi: '#f59aab',
  petal: '#ea7fa2',
  center: '#f2bd4e',
  leaf: '#7fae62',
  fringe: '#f1dcc0',
  fringeDark: '#cdb08f',
};

const F5 = {
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
};
const F3 = {
  D: ['110', '101', '101', '101', '110'], N: ['101', '111', '111', '111', '101'],
  I: ['111', '010', '010', '010', '111'], G: ['011', '100', '101', '101', '011'],
  O: ['010', '101', '101', '101', '010'], Z: ['111', '001', '010', '100', '111'],
  M: ['101', '111', '111', '101', '101'], S: ['011', '100', '010', '001', '110'],
  E: ['111', '100', '110', '100', '111'], K: ['101', '101', '110', '101', '101'],
};
const HEART = ['0110110', '1222111', '1211111', '1111111', '0111110', '0011100', '0001000'];
const FLOWER = ['01010', '11211', '02320', '11211', '01010'];

const BOXES = [11, 38, 65, 92];
const BOX_W = 25;
const LABELS = ['DNI', 'GODZ', 'MIN', 'SEK'];
const KEYS = ['dni', 'godz', 'min', 'sek'];

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `rgb(${ch.join(',')})`;
}

// oczko dzianiny: jasne „V” na górze, ciemniejszy dół
const stitch = (g, x, y, color) => stitchPx(g, x * C, y * C, color);
function stitchPx(g, px, py, color) {
  g.fillStyle = color;
  g.fillRect(px, py, C, C);
  g.fillStyle = shade(color, 1.08);
  g.fillRect(px, py, 1, 1);
  g.fillRect(px + 3, py, 1, 1);
  g.fillRect(px + 1, py + 1, 2, 1);
  g.fillStyle = shade(color, 0.86);
  g.fillRect(px, py + 3, C, 1);
}

function glyph(g, rows, x, y, color, scale = 1) {
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== '1') continue;
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) stitch(g, x + c * scale + sx, y + r * scale + sy, color);
    }
  });
}

function drawStatic() {
  const cv = document.createElement('canvas');
  cv.width = GW * C;
  cv.height = GH * C;
  const g = cv.getContext('2d');
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < GH; y++)
    for (let x = BODY0; x <= BODY1; x++) {
      const r = rnd();
      stitch(g, x, y, r < 0.12 ? COL.cream[1] : r > 0.9 ? COL.cream[2] : COL.cream[0]);
    }
  // obwódka: bordo, kremowy pas, różowe kropki
  for (let x = BODY0; x <= BODY1; x++) {
    for (const y of [0, 1, GH - 2, GH - 1]) stitch(g, x, y, COL.maroon);
    if ((x - BODY0) % 2 === 0) {
      stitch(g, x, 3, COL.pink);
      stitch(g, x, GH - 4, COL.pink);
    }
  }
  for (let y = 0; y < GH; y++) {
    for (const x of [BODY0, BODY0 + 1, BODY1 - 1, BODY1]) stitch(g, x, y, COL.maroon);
    if (y > 2 && y < GH - 3 && y % 2 === 1) {
      stitch(g, BODY0 + 3, y, COL.pink);
      stitch(g, BODY1 - 3, y, COL.pink);
    }
  }
  // napis
  const title = 'DO URODZIN PATI';
  const width = [...title].reduce((w, ch) => w + (ch === ' ' ? 3 : 6), -1);
  let tx = Math.round((GW - width) / 2);
  for (const ch of title) {
    if (ch === ' ') {
      tx += 3;
      continue;
    }
    glyph(g, F5[ch], tx, 5, COL.maroon);
    tx += 6;
  }
  // serca przy napisie
  for (const hx of [11, GW - 18]) {
    HEART.forEach((row, r) =>
      [...row].forEach((v, c) => v !== '0' && stitch(g, hx + c, 5 + r, v === '2' ? COL.heartHi : COL.heart)),
    );
  }
  // pola licznika z kropkowaną ramką i małym serduszkiem
  BOXES.forEach((bx, i) => {
    for (let x = bx; x < bx + BOX_W; x++) {
      if ((x - bx) % 2 === 0) {
        stitch(g, x, 14, COL.pink);
        stitch(g, x, 37, COL.pink);
      }
    }
    for (let y = 14; y <= 37; y++) {
      if ((y - 14) % 2 === 0) {
        stitch(g, bx, y, COL.pink);
        stitch(g, bx + BOX_W - 1, y, COL.pink);
      }
    }
    const mid = bx + BOX_W / 2;
    stitch(g, mid - 1, 13, COL.heart);
    stitch(g, mid, 13, COL.heart);
    stitch(g, mid - 1, 14, COL.heart);
    stitch(g, mid, 14, COL.heart);
    const label = LABELS[i];
    const lw = label.length * 4 - 1;
    let lx = Math.round(bx + (BOX_W - lw) / 2);
    for (const ch of label) {
      glyph(g, F3[ch], lx, 31, COL.maroon);
      lx += 4;
    }
  });
  // pas kwiatków i serduszek na dole
  for (let i = 0, x = 12; x < GW - 16; i++, x += 9) {
    if (i % 3 === 1) {
      HEART.slice(0, 6).forEach((row, r) =>
        [...row].slice(0, 7).forEach((v, c) => v !== '0' && r < 6 && stitch(g, x + c - 1, 40 + r, v === '2' ? COL.heartHi : COL.heart)),
      );
    } else {
      FLOWER.forEach((row, r) =>
        [...row].forEach((v, c) => {
          if (v === '0') return;
          stitch(g, x + c, 40 + r, v === '1' ? COL.petal : v === '3' ? COL.center : shade(COL.petal, 1.15));
        }),
      );
      stitch(g, x + 5, 44, COL.leaf);
      stitch(g, x - 1, 44, COL.leaf);
    }
  }
  return cv;
}

const DIGIT_Y = 16; // górny rząd cyfr (w oczkach)
const DIGIT_H = 14 * C; // wysokość cyfry w px canvasu
const ROLL = 0.5; // czas przewinięcia cyfry w sekundach
const TRAVEL = DIGIT_H + 3 * C;

// lekkie przestrzelenie i powrót, jak sprężynujący bębenek
function easeOutBack(x) {
  const c1 = 1.3;
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}

function digit(g, ch, xCell, yPx, alpha) {
  if (alpha <= 0) return;
  g.globalAlpha = alpha;
  F5[ch].forEach((row, r) => {
    for (let c = 0; c < 5; c++) {
      if (row[c] !== '1') continue;
      for (let sy = 0; sy < 2; sy++)
        for (let sx = 0; sx < 2; sx++) stitchPx(g, (xCell + c * 2 + sx) * C, Math.round(yPx + (r * 2 + sy) * C), COL.maroon);
    }
  });
  g.globalAlpha = 1;
}

export function createRug(canvas) {
  canvas.width = GW * C;
  canvas.height = GH * C;
  const g = canvas.getContext('2d');
  const base = drawStatic();
  // każda cyfra osobno: aktualna, poprzednia i kiedy zaczęła się zmieniać
  const digits = Object.fromEntries(KEYS.map((k) => [k, [{}, {}]]));
  let first = true;

  function set(next, now) {
    KEYS.forEach((k, i) => {
      const v = String(next[k]).padStart(2, '0');
      for (let d = 0; d < 2; d++) {
        const st = digits[k][d];
        if (st.cur === v[d]) continue;
        // przy wejściu na stronę cyfry wtaczają się po kolei, od dni do sekund
        st.at = first ? now + 0.25 + i * 0.12 + d * 0.06 : now;
        st.prev = first ? null : st.cur;
        st.cur = v[d];
      }
    });
    first = false;
  }

  function draw(t, wind) {
    g.clearRect(0, 0, canvas.width, canvas.height);
    // frędzle po bokach, poruszane wiatrem
    for (let y = 1; y < GH - 1; y++) {
      const sway = Math.sin(t * 2.2 + y * 0.7) * wind;
      const len = 15 + ((y * 7) % 4) + Math.round(sway * 2);
      const yy = y * C + 1 + Math.round(sway);
      g.fillStyle = COL.fringe;
      g.fillRect(BODY0 * C - len, yy, len, 2);
      g.fillRect((BODY1 + 1) * C, yy, len, 2);
      g.fillStyle = COL.fringeDark;
      g.fillRect(BODY0 * C - len, yy + 1, 3, 1);
      g.fillRect((BODY1 + 1) * C + len - 3, yy + 1, 3, 1);
    }
    g.drawImage(base, 0, 0);
    const top = DIGIT_Y * C;
    KEYS.forEach((k, i) => {
      const bx = BOXES[i];
      for (let d = 0; d < 2; d++) {
        const st = digits[k][d];
        if (!st.cur) continue;
        const x0 = bx + 2 + d * 11;
        const since = t - st.at;
        if (since >= ROLL) {
          digit(g, st.cur, x0, top, 1);
          continue;
        }
        // okienko cyfry: to, co wyjeżdża poza nie, jest ucięte
        g.save();
        g.beginPath();
        g.rect(x0 * C - 2, top - 2 * C, 10 * C + 4, DIGIT_H + 4 * C);
        g.clip();
        const p = since < 0 ? 0 : easeOutBack(since / ROLL);
        const fade = since < 0 ? 0 : Math.min(1, since / (ROLL * 0.7));
        if (st.prev) digit(g, st.prev, x0, top + TRAVEL * p, 1 - fade);
        if (since >= 0) digit(g, st.cur, x0, top - TRAVEL + TRAVEL * p, Math.min(1, 0.3 + fade));
        // miękkie brzegi okienka, jakby cyfry obracały się na bębenku
        for (const [y0, y1] of [
          [top - 2 * C, top + C],
          [top + DIGIT_H + 2 * C, top + DIGIT_H - C],
        ]) {
          const gr = g.createLinearGradient(0, y0, 0, y1);
          gr.addColorStop(0, 'rgba(247,231,212,0.95)');
          gr.addColorStop(1, 'rgba(247,231,212,0)');
          g.fillStyle = gr;
          g.fillRect(x0 * C - 2, Math.min(y0, y1), 10 * C + 4, Math.abs(y1 - y0));
        }
        g.restore();
      }
    });
  }

  return { set, draw };
}
