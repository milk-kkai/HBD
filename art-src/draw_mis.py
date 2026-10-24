# Miś „Tomasz Wnęk” (wg zdjęcia) narysowany jako pixel art w stylu pokoju:
# brązowe futro, jasny pyszczek i poduszki łapek, czerwona kamizelka w kratę z muszką
# i dwoma białymi guzikami, czerwone spodenki. Światło z lewej góry, ciemny obrys.
import numpy as np
from PIL import Image

W, H = 30, 32
PAL = {
    'fur': ((206, 128, 58), (238, 170, 96), (156, 88, 36)),
    'inner': ((226, 170, 110), (240, 196, 140), (196, 140, 86)),
    'muzzle': ((245, 205, 150), (252, 224, 178), (222, 172, 112)),
    'pad': ((240, 198, 142), (250, 220, 170), (214, 162, 104)),
    'vest': ((198, 34, 46), (226, 70, 72), (142, 20, 32)),
    'pants': ((186, 28, 40), (216, 56, 62), (130, 16, 28)),
}
SOLID = {'black': (40, 24, 22), 'white': (250, 244, 232), 'bow': (150, 18, 34), 'bow_hi': (214, 62, 76), 'knot': (92, 8, 22),
         'plaid': (128, 18, 30), 'plaid_y': (226, 186, 92), 'line': (110, 60, 30), 'k': (58, 34, 32)}

label = np.full((H, W), '', dtype=object)
shade = np.zeros((H, W), int)  # 0 zwykły, 1 jasny, 2 ciemny

def ell(cx, cy, rx, ry, name):
    for y in range(H):
        for x in range(W):
            u, v = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            if u * u + v * v <= 1:
                label[y, x] = name
                t = u * 0.7 + v * 0.75  # światło z lewej góry
                shade[y, x] = 1 if t < -0.55 else 2 if t > 0.62 else 0

def px(x, y, name):
    if 0 <= x < W and 0 <= y < H:
        label[y, x] = name
        shade[y, x] = 0

# od tyłu do przodu
ell(6.8, 4.6, 3.4, 3.4, 'fur'); ell(23.2, 4.6, 3.4, 3.4, 'fur')          # uszy
ell(6.8, 4.9, 1.7, 1.7, 'inner'); ell(23.2, 4.9, 1.7, 1.7, 'inner')
ell(15, 20.5, 7.6, 6.6, 'vest')                                          # tułów w kamizelce
ell(6.3, 19.5, 2.8, 5.0, 'fur'); ell(23.7, 19.5, 2.8, 5.0, 'fur')        # łapki
ell(15, 25.6, 8.2, 3.6, 'pants')                                         # spodenki
ell(6.2, 28.2, 4.4, 3.4, 'fur'); ell(23.8, 28.2, 4.4, 3.4, 'fur')        # nogi
ell(5.6, 28.6, 2.8, 2.4, 'pad'); ell(24.4, 28.6, 2.8, 2.4, 'pad')        # poduszki łapek
ell(15, 8.6, 9.2, 7.0, 'fur')                                            # głowa
ell(15, 11.0, 4.2, 2.6, 'muzzle')                                        # pyszczek

# krata na kamizelce (tylko tam, gdzie widać kamizelkę)
for y in range(H):
    for x in range(W):
        if label[y, x] == 'vest':
            cross_h = y % 3 == 1
            cross_v = x % 3 == 0
            if cross_h and cross_v:
                label[y, x] = 'plaid_y'
            elif cross_h or cross_v:
                label[y, x] = 'plaid'

# twarz: oczy, nos, pyszczek z uśmiechem
for x, y in [(11, 7), (19, 7)]:
    px(x, y, 'black')
for x in (14, 15):
    px(x, 9, 'black')
px(14, 10, 'black'); px(15, 10, 'black')
px(14, 11, 'line'); px(13, 12, 'line'); px(16, 12, 'line')
# muszka: dwa skrzydełka z odblaskiem i ciemny węzeł, z obrysem, żeby odcinała się od futra
BOW = [
    'BB......BB',
    'BhB.KK.BhB',
    'BhBBKKBBhB',
    'BB......BB',
]
bow_px = []
for dy, row in enumerate(BOW):
    for dx, ch in enumerate(row):
        if ch != '.':
            name = {'B': 'bow', 'h': 'bow_hi', 'K': 'knot'}[ch]
            px(10 + dx, 13 + dy, name)
            bow_px.append((10 + dx, 13 + dy))
# guziki
px(14, 20, 'white'); px(15, 20, 'white')
px(14, 23, 'white'); px(15, 23, 'white')

img = np.zeros((H + 2, W + 2, 4), np.uint8)
for y in range(H):
    for x in range(W):
        n = label[y, x]
        if not n:
            continue
        c = PAL[n][shade[y, x]] if n in PAL else SOLID[n]
        img[y + 1, x + 1] = (*c, 255)
# obrys
m = img[..., 3] > 0
edge = np.zeros_like(m)
edge[1:, :] |= m[:-1, :]; edge[:-1, :] |= m[1:, :]; edge[:, 1:] |= m[:, :-1]; edge[:, :-1] |= m[:, 1:]
edge &= ~m
img[edge] = (*SOLID['k'], 255)
# obrys muszki od strony futra i kamizelki
bow_set = set(bow_px)
for x, y in bow_px:
    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
        if (nx, ny) not in bow_set and 0 <= nx < W and 0 <= ny < H and label[ny, nx] in ('fur', 'muzzle', 'vest', 'plaid', 'plaid_y'):
            img[ny + 1, nx + 1] = (*SOLID['k'], 255)
# delikatna ciemna linia między głową a resztą (cień pod brodą) i między łapkami a tułowiem
lab = np.pad(label, 1, constant_values='')
for y in range(1, H + 1):
    for x in range(1, W + 1):
        if lab[y, x] in ('vest', 'plaid', 'plaid_y') and lab[y, x - 1] == 'fur':
            img[y, x] = (*PAL['vest'][2], 255)
        if lab[y, x] in ('vest', 'plaid', 'plaid_y') and lab[y, x + 1] == 'fur':
            img[y, x] = (*PAL['vest'][2], 255)
Image.fromarray(img).save('public/art/items/mis-tomasz.png')
print('mis', W + 2, 'x', H + 2)
