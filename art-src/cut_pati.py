# Wycina Pati (widok z przodu) z arkusza, usuwa białe tło i robi klatkę mrugnięcia.
import sys
import numpy as np
from PIL import Image, ImageDraw

sheet = Image.open(sys.argv[1]).convert('RGB')
out_dir = sys.argv[2]
X0, Y0, X1, Y1 = 68, 60, 402, 980
im = np.array(sheet.crop((X0, Y0, X1, Y1))).astype(int)
H, W, _ = im.shape

mn, mx = im.min(axis=2), im.max(axis=2)
whiteish = (mn > 212) & (mx - mn < 34)

# tło = białe piksele połączone z krawędzią obrazka
bg = np.zeros((H, W), bool)
bg[0, :] = whiteish[0, :]; bg[-1, :] = whiteish[-1, :]
bg[:, 0] = whiteish[:, 0]; bg[:, -1] = whiteish[:, -1]
while True:
    n = bg.copy()
    n[1:, :] |= bg[:-1, :]; n[:-1, :] |= bg[1:, :]
    n[:, 1:] |= bg[:, :-1]; n[:, :-1] |= bg[:, 1:]
    n &= whiteish
    if (n == bg).all():
        break
    bg = n

# zamknięte białe dziury w ciele (np. między ręką a tułowiem), ale nie w twarzy
seen = np.zeros_like(bg)
for sy in range(300, H):
    for sx in range(W):
        if whiteish[sy, sx] and not bg[sy, sx] and not seen[sy, sx]:
            stack, comp = [(sy, sx)], []
            seen[sy, sx] = True
            while stack:
                y, x = stack.pop()
                comp.append((y, x))
                for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= ny < H and 0 <= nx < W and whiteish[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            if len(comp) > 120:
                for y, x in comp:
                    bg[y, x] = True

# jasna obwódka po białym tle
near = np.zeros_like(bg)
near[1:, :] |= bg[:-1, :]; near[:-1, :] |= bg[1:, :]
near[:, 1:] |= bg[:, :-1]; near[:, :-1] |= bg[:, 1:]
halo = near & ~bg & (mn > 175)
alpha = np.where(bg | halo, 0, 255)

rgba = np.dstack([im, alpha]).astype(np.uint8)
Image.fromarray(rgba).save(f'{out_dir}/pati.webp', quality=92, method=6)

# --- mrugnięcie: oczy zamalowane skórą + linia zamkniętych rzęs ---
blink = rgba.copy()
def eye(cx, cy, rx, ry, skin_at, lash):
    sx, sy = skin_at
    skin = im[sy - 2:sy + 2, sx - 2:sx + 2].reshape(-1, 3).mean(axis=0)
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1:
                continue
            r, g, b = im[y, x]
            frame = r > 85 and g < 120 and r - b > 80 and r > g + 48
            if not frame:
                blink[y, x, :3] = skin
    img = Image.fromarray(blink)
    d = ImageDraw.Draw(img)
    d.line(lash, fill=(58, 34, 26, 255), width=4, joint='curve')
    return np.array(img)

# współrzędne w wyciętym obrazku (arkusz minus X0/Y0)
blink = eye(189 - X0, 224 - Y0, 23, 19, (186 - X0, 249 - Y0),
            [(166 - X0, 222 - Y0), (176 - X0, 229 - Y0), (190 - X0, 232 - Y0), (203 - X0, 230 - Y0), (211 - X0, 225 - Y0)])
blink = eye(275 - X0, 247 - Y0, 25, 20, (272 - X0, 268 - Y0),
            [(250 - X0, 241 - Y0), (261 - X0, 249 - Y0), (276 - X0, 252 - Y0), (290 - X0, 250 - Y0), (300 - X0, 244 - Y0)])
Image.fromarray(blink).save(f'{out_dir}/pati-blink.webp', quality=92, method=6)
print('size', W, H)
