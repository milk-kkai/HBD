# Zamienia zdjęcie przedmiotu w pixel art w stylu pokoju: wycięte tło, ograniczona paleta,
# ciepłe światło i ciemnobrązowy obrys. Użycie: pixelize_item.py src out szerokość [crop x0,y0,x1,y1]
import sys
import numpy as np
from PIL import Image, ImageEnhance

src, out, width = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert('RGBA')
if len(sys.argv) > 4:
    im = im.crop(tuple(int(v) for v in sys.argv[4].split(',')))
a = np.array(im).astype(int)
H, W = a.shape[:2]

# tło: jasne, mało nasycone piksele połączone z krawędzią (albo już przezroczyste)
rgb = a[..., :3]
mn, mx = rgb.min(axis=2), rgb.max(axis=2)
bgish = ((mn > 225) & (mx - mn < 30)) | (a[..., 3] < 20)
bg = np.zeros((H, W), bool)
bg[0, :] = bgish[0, :]; bg[-1, :] = bgish[-1, :]; bg[:, 0] = bgish[:, 0]; bg[:, -1] = bgish[:, -1]
while True:
    n = bg.copy()
    n[1:, :] |= bg[:-1, :]; n[:-1, :] |= bg[1:, :]; n[:, 1:] |= bg[:, :-1]; n[:, :-1] |= bg[:, 1:]
    n &= bgish
    if (n == bg).all():
        break
    bg = n
a[..., 3] = np.where(bg, 0, 255)
ys, xs = np.nonzero(~bg)
a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
cut = Image.fromarray(a.astype(np.uint8))

# zmniejszenie do docelowej siatki pikseli
h = round(cut.height * width / cut.width)
small = cut.resize((width, h), Image.LANCZOS)
s = np.array(small).astype(int)
alpha = s[..., 3] > 120

# ciepłe światło pokoju i trochę więcej koloru
rgb = Image.fromarray(s[..., :3].astype(np.uint8))
rgb = ImageEnhance.Color(rgb).enhance(1.15)
rgb = ImageEnhance.Contrast(rgb).enhance(1.08)
warm = np.array(rgb).astype(float) * np.array([1.0, 0.95, 0.86]) + np.array([6, 2, 0])
rgb = Image.fromarray(np.clip(warm, 0, 255).astype(np.uint8))

# ograniczona paleta jak w pixel arcie
q = rgb.quantize(colors=int(sys.argv[5]) if len(sys.argv) > 5 else 14, method=Image.Quantize.MEDIANCUT).convert('RGB')
q = np.array(q)

# obrys: ciemnobrązowy jak przy meblach w pokoju, z 1 px marginesem
OUT = (58, 34, 32)
ph, pw = alpha.shape[0] + 2, alpha.shape[1] + 2
res = np.zeros((ph, pw, 4), np.uint8)
res[1:-1, 1:-1, :3] = q
res[1:-1, 1:-1, 3] = np.where(alpha, 255, 0)
m = res[..., 3] > 0
edge = np.zeros_like(m)
edge[1:, :] |= m[:-1, :]; edge[:-1, :] |= m[1:, :]; edge[:, 1:] |= m[:, :-1]; edge[:, :-1] |= m[:, 1:]
edge &= ~m
res[edge] = (*OUT, 255)
Image.fromarray(res).save(out, optimize=True)
print(out, res.shape[1], 'x', res.shape[0])
