// Baloniki lecące od dołu do góry w tle gier. Dwie warstwy: dalsze (mniejsze, blade,
// wolniejsze) i bliższe. Liczbą baloników steruje gra przez setTarget().

const COLORS = ['#ec7fa4', '#efbb45', '#4fb6b0', '#9d72d0', '#8fc6ee', '#e85d6f', '#fff5ea'];
const SIZES = { far: [3, 4], near: [4, 5], big: [5, 6] }; // [rx, ry]

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${[n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * f))).join(',')})`;
}

const cache = new Map();
function balloonSprite(color, size) {
  const key = color + size;
  if (cache.has(key)) return cache.get(key);
  const [rx, ry] = SIZES[size];
  const w = rx * 2 + 1;
  const h = ry * 2 + 1;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h + 2;
  const g = cv.getContext('2d');
  const inside = (x, y) => ((x - rx) / (rx + 0.4)) ** 2 + ((y - ry) / (ry + 0.4)) ** 2 <= 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      const dark = x - rx + (y - ry) * 0.6 > rx * 0.45;
      g.fillStyle = edge ? shade(color, 0.62) : dark ? shade(color, 0.84) : color;
      g.fillRect(x, y, 1, 1);
    }
  // odblask i supełek
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillRect(rx - Math.ceil(rx / 2), Math.floor(ry / 2), 1, 2);
  g.fillRect(rx - Math.ceil(rx / 2) + 1, Math.floor(ry / 2) - 1, 1, 1);
  g.fillStyle = shade(color, 0.62);
  g.fillRect(rx - 1, h, 3, 1);
  g.fillRect(rx, h + 1, 1, 1);
  cache.set(key, cv);
  return cv;
}

export function createBalloons(W) {
  let H = 160;
  let target = 3;
  let cooldown = 0;
  let t = 0;
  const list = [];

  function spawn(opts = {}) {
    const layer = opts.layer ?? (Math.random() < 0.42 ? 'far' : 'near');
    const size = layer === 'far' ? 'far' : opts.big || Math.random() < 0.25 ? 'big' : 'near';
    const sprite = balloonSprite(COLORS[Math.floor(Math.random() * COLORS.length)], size);
    list.push({
      layer,
      sprite,
      x0: 2 + Math.random() * (W - sprite.width - 4),
      y: opts.y ?? H + 2 + Math.random() * 6,
      vy: (layer === 'far' ? 6 + Math.random() * 4 : 11 + Math.random() * 7) * (opts.fast ? 2.2 : 1),
      amp: 1.5 + Math.random() * 2.5,
      ph: Math.random() * 6.28,
      str: layer === 'far' ? 6 + Math.floor(Math.random() * 4) : 9 + Math.floor(Math.random() * 6),
      x: 0,
    });
  }

  return {
    setHeight(h) {
      H = h;
    },
    setTarget(n) {
      target = n;
    },
    spawn(n = 1, opts) {
      for (let i = 0; i < n; i++) spawn(opts);
    },
    // przebija kilka bliskich baloników (np. gdy trafi chmurka); zwraca miejsca wybuchów
    pop(n) {
      const near = list.filter((b) => b.layer === 'near' && b.y > 4 && b.y < H - 20);
      const out = [];
      for (let i = 0; i < n && near.length; i++) {
        const b = near.splice(Math.floor(Math.random() * near.length), 1)[0];
        list.splice(list.indexOf(b), 1);
        out.push({ x: b.x + b.sprite.width / 2, y: b.y + b.sprite.height / 2 });
      }
      return out;
    },
    update(dt) {
      t += dt;
      cooldown -= dt;
      if (list.length < target && cooldown <= 0) {
        spawn();
        cooldown = 0.12 + Math.random() * 0.25;
      }
      for (let i = list.length - 1; i >= 0; i--) {
        const b = list[i];
        b.y -= b.vy * dt;
        b.x = b.x0 + Math.sin(t * 0.9 + b.ph) * b.amp;
        if (b.y < -b.sprite.height - b.str) list.splice(i, 1);
      }
    },
    draw(g, layer) {
      g.globalAlpha = layer === 'far' ? 0.4 : 0.82;
      for (const b of list) {
        if (b.layer !== layer) continue;
        const x = Math.round(b.x);
        const y = Math.round(b.y);
        const cx = x + (b.sprite.width >> 1);
        g.fillStyle = '#b48a76';
        for (let i = 0; i < b.str; i++) {
          const wig = Math.round(Math.sin(t * 3 + b.ph + i * 0.45) * (i / b.str) * 1.5);
          g.fillRect(cx + wig, y + b.sprite.height + i, 1, 1);
        }
        g.drawImage(b.sprite, x, y);
      }
      g.globalAlpha = 1;
    },
    get count() {
      return list.length;
    },
  };
}
