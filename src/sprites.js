// Pixelowe sprite'y jako mapy znaków. Każdy znak to kolor z palety.
const CHARS = {
  k: 'ink', d: 'dark', m: 'mid', l: 'light', w: 'paper', W: 'white',
  p: 'pink', y: 'gold', b: 'wood', s: 'skin', h: 'hair', t: 'teal',
  g: 'green', v: 'purple', c: 'sky',
};

const sprite = (rows) => ({ w: rows[0].length, h: rows.length, rows });

export const SPR = {
  cake: sprite([
    '....kk....',
    '...kppk...',
    '....kk....',
    '.kkkkkkkk.',
    'kppppppppk',
    'kpWppWpppk',
    'kwwpwwwpwk',
    'kllllllllk',
    'kwwwwwwwwk',
    'kllllllllk',
    '.kkkkkkkk.',
  ]),
  gift: sprite([
    '..kk..kk..',
    '.kppkkppk.',
    '..kkppkk..',
    'kkkkppkkkk',
    'ktttppttWk',
    'kttpppptWk',
    'kkkkppkkkk',
    'kttttppttk',
    'kttttppttk',
    'kkkkkkkkkk',
  ]),
  heart: sprite([
    '.kk.kk.',
    'kppkppk',
    'kpWpppk',
    'kpppppk',
    '.kpppk.',
    '..kpk..',
    '...k...',
  ]),
  heartEmpty: sprite([
    '.kk.kk.',
    'kllkllk',
    'klllllk',
    'klllllk',
    '.klllk.',
    '..klk..',
    '...k...',
  ]),
  cloud: sprite([
    '....kkkk....',
    '..kkddddkk..',
    '.kddmdddddk.',
    'kddddddddddk',
    'kddddddddddk',
    '.kkkkkkkkkk.',
    '..c...c...c.',
    '.c...c...c..',
    'c...c...c...',
  ]),
  bigCake: sprite([
    '....y...y...y....',
    '....p...t...v....',
    '....p...t...v....',
    '.kkkkkkkkkkkkkkk.',
    'kpppppppppppppppk',
    'kpWpppppppppWpppk',
    'kwwpwwwwpwwwwwpwk',
    'kwwwwwwwwwwwwwwwk',
    'klllllllllllllllk',
    'kwwwwwwwwwwwwwwwk',
    'kpppppppppppppppk',
    'kwwwwwwwwwwwwwwwk',
    'klllllllllllllllk',
    '.kkkkkkkkkkkkkkk.',
    'mmmmmmmmmmmmmmmmm',
  ]),
  star: sprite([
    '...k...',
    '..kyk..',
    'kkyyykk',
    '.kyyyk.',
    '.kykyk.',
    'kk...kk',
  ]),
  pati: sprite([
    '...kkkkkk...',
    '..khhhhhhk..',
    '.khhhhhhhhk.',
    '.khhsssshhk.',
    '.khsssssshk.',
    '.khsksskshk.',
    '.khpsddsphk.',
    '..hksssskh..',
    '..kkppppkk..',
    '.ksppppppsk.',
    'kbbbbbbbbbbk',
    '.kbybbybybk.',
    '..kbbbbbbk..',
    '..kppppppk..',
    '...ks..sk...',
    '...kk..kk...',
  ]),
  // nakładka na głowę postaci, gdy ma kokardkę
  patiBow: sprite([
    '.......kk.kk',
    '......kppkpk',
    '.......kpkk.',
    '......kpkpk.',
    '.......k.k..',
  ]),
  bow: sprite([
    '.kk.....kk.',
    'kppk...kppk',
    'kpppk.kpppk',
    'kppppkppppk',
    'kpppk.kpppk',
    'kppk.k.kppk',
    '.kk.kpk.kk.',
    '.....k.....',
  ]),
  chest: sprite([
    '..kkkkkkkkkk..',
    '.kbbbbbbbbbbk.',
    'kbbbbbbbbbbbbk',
    'kyyyyyyyyyyyyk',
    'kbbbbbkkbbbbbk',
    'kkkkkkyykkkkkk',
    'kbbbbbyybbbbbk',
    'kbbbbbkkbbbbbk',
    'kyyyyyyyyyyyyk',
    'kbbbbbbbbbbbbk',
    'kbbbbbbbbbbbbk',
    'kkkkkkkkkkkkkk',
  ]),
  chestOpen: sprite([
    '.kkkkkkkkkkkk.',
    'kbbbbbbbbbbbbk',
    'kyyyyyyyyyyyyk',
    'kbbbbbbbbbbbbk',
    'kkkkkkkkkkkkkk',
    'kWWWWWWWWWWWWk',
    'kyWWyWWWWyWWyk',
    'kkkkkkyykkkkkk',
    'kbbbbbyybbbbbk',
    'kyyyyyyyyyyyyk',
    'kbbbbbbbbbbbbk',
    'kkkkkkkkkkkkkk',
  ]),
  lock: sprite([
    '..kkk..',
    '.k...k.',
    '.k...k.',
    'kkkkkkk',
    'kmmmmmk',
    'kmmkmmk',
    'kmmkmmk',
    'kkkkkkk',
  ]),
  question: sprite([
    '.kkkk.',
    'k....k',
    '....k.',
    '...k..',
    '......',
    '...k..',
  ]),
};

export function drawSprite(ctx, spr, x, y, pal, scale = 1, flip = false) {
  for (let r = 0; r < spr.h; r++) {
    const row = spr.rows[r];
    for (let c = 0; c < spr.w; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      ctx.fillStyle = pal[CHARS[ch]];
      const cx = flip ? spr.w - 1 - c : c;
      ctx.fillRect(Math.round(x) + cx * scale, Math.round(y) + r * scale, scale, scale);
    }
  }
}

// Płótno ze sprite'em do wstawienia w DOM (CSS skaluje je pixelowo).
export function spriteCanvas(spr, pal, extra = []) {
  const cv = document.createElement('canvas');
  cv.width = spr.w;
  cv.height = spr.h;
  cv.className = 'spr';
  const ctx = cv.getContext('2d');
  drawSprite(ctx, spr, 0, 0, pal);
  for (const e of extra) drawSprite(ctx, e, 0, 0, pal);
  return cv;
}

export const ITEM_SPRITES = { kokardka: SPR.bow };

// 3x5 bitmapowa czcionka do liczb na płótnie
const FONT = {
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '011', '001', '111'],
  4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111'],
  '+': ['000', '010', '111', '010', '000'], '-': ['000', '000', '111', '000', '000'],
};

export function drawNumber(ctx, text, x, y, color, scale = 1) {
  ctx.fillStyle = color;
  let cx = Math.round(x);
  for (const ch of String(text)) {
    const g = FONT[ch];
    if (g) {
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 3; c++)
          if (g[r][c] === '1') ctx.fillRect(cx + c * scale, Math.round(y) + r * scale, scale, scale);
    }
    cx += 4 * scale;
  }
}
