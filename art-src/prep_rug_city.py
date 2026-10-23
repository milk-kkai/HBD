# Dywan: usuwa podłogę z rogów i wypalone cyfry. Miasto: pozycje zapalonych okien i gwiazd.
import json, random
import numpy as np
from PIL import Image

# ---------- dywan ----------
rug = np.array(Image.open('art-src/rug.png').convert('RGB')).astype(int)
H, W, _ = rug.shape
r, g, b = rug[..., 0], rug[..., 1], rug[..., 2]
floorish = ((b < 105) & ((r - b > 55) | (g > r))) | (rug.max(axis=2) < 100)
bg = np.zeros((H, W), bool)
for edge in (bg[0, :], bg[-1, :], bg[:, 0], bg[:, -1]):
    pass
for _ in ():
    pass
bg[0, :] = floorish[0, :]; bg[-1, :] = floorish[-1, :]
bg[:, 0] = floorish[:, 0]; bg[:, -1] = floorish[:, -1]
while True:
    n = bg.copy()
    n[1:, :] |= bg[:-1, :]; n[:-1, :] |= bg[1:, :]
    n[:, 1:] |= bg[:, :-1]; n[:, :-1] |= bg[:, 1:]
    n &= floorish
    if (n == bg).all():
        break
    bg = n
alpha = np.where(bg, 0, 255)

# cyfry: zastąp prostokąty teksturą dzianiny z lewego marginesu pierwszego pola
orig = rug.copy()
light = (orig[..., 0] > 222) & (orig[..., 1] > 190) & (orig[..., 2] > 165) & (orig[..., 0] - orig[..., 1] < 40)
for x0, x1 in ((74, 115), (148, 193), (224, 271), (300, 345)):
    for y in range(55, 86):
        for x in range(x0, x1):
            if light[y, x]:
                continue
            for d in range(1, 30):
                if x0 - 3 <= x - d and light[y, x - d]:
                    rug[y, x] = orig[y, x - d]; break
                if x + d < x1 + 3 and light[y, x + d]:
                    rug[y, x] = orig[y, x + d]; break
Image.fromarray(np.dstack([rug, alpha]).astype(np.uint8)).save('art-src/rug-clean.png', optimize=True)

# ---------- miasto za oknem ----------
room = np.array(Image.open('public/art/room.webp').convert('RGB')).astype(int)
GX0, GY0, GX1, GY1 = 286, 230, 694, 610
sub = room[GY0:GY1, GX0:GX1]
R, G, B = sub[..., 0], sub[..., 1], sub[..., 2]
lit = (R > 195) & (G > 145) & (B < 160) & (R - B > 60)
lit[:, 182:204] = False  # środkowy słupek okna
seen = np.zeros_like(lit)
lights = []
for y in range(lit.shape[0]):
    for x in range(lit.shape[1]):
        if lit[y, x] and not seen[y, x]:
            st, comp = [(y, x)], []
            seen[y, x] = True
            while st:
                cy, cx = st.pop()
                comp.append((cy, cx))
                for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                    if 0 <= ny < lit.shape[0] and 0 <= nx < lit.shape[1] and lit[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        st.append((ny, nx))
            if 6 <= len(comp) <= 90:
                ys = [p[0] for p in comp]; xs = [p[1] for p in comp]
                lights.append([GX0 + min(xs), GY0 + min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1])
sky = (B > 120) & (B > R + 15) & (np.arange(sub.shape[0])[:, None] < 150)
sy, sx = np.nonzero(sky)
random.seed(7)
stars = []
for i in random.sample(range(len(sy)), min(400, len(sy))):
    p = [int(GX0 + sx[i]), int(GY0 + sy[i])]
    if all(abs(p[0] - q[0]) + abs(p[1] - q[1]) > 28 for q in stars):
        stars.append(p)
    if len(stars) >= 26:
        break
json.dump({'lights': lights, 'stars': stars}, open('src/city.json', 'w'))
print('lights', len(lights), 'stars', len(stars))
