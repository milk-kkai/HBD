# Usuwa czerwone zamazanie z szafki nocnej (i serwetkę pod nim) z tła pokoju.
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
im = np.array(Image.open(src).convert('RGB')).astype(int)
H, W, _ = im.shape
r, g, b = im[..., 0], im[..., 1], im[..., 2]

x0, x1, y0, y1 = 305, 452, 598, 768
box = np.zeros((H, W), bool)
box[y0:y1, x0:x1] = True
red = (r > 170) & (g < 110) & (b < 110) & (r - g > 90)
rows = np.arange(H)[:, None]
cols = np.arange(W)[None, :]
doily = (r > 185) & (b > 120) & (r - g > 15) & (rows > 686) & (cols >= 330) & (cols <= 448)
from PIL import ImageDraw
tri = Image.new('L', (W, H), 0)
ImageDraw.Draw(tri).polygon([(346, 711), (436, 711), (385, 762)], fill=255)
mask = box & (red | doily | (np.array(tri) > 0))
# poszerzenie maski o 2 px, żeby zjeść obwódki
for _ in range(2):
    m = mask.copy()
    m[1:, :] |= mask[:-1, :]; m[:-1, :] |= mask[1:, :]
    m[:, 1:] |= mask[:, :-1]; m[:, :-1] |= mask[:, 1:]
    mask = m & box

out_im = im.copy()
ys, xs = np.nonzero(mask)
for y, x in zip(ys, xs):
    if x < 337 and y < 705:
        yy = y
        while yy > 0 and mask[yy, x]:
            yy -= 1
        out_im[y, x] = im[yy, x]
    elif y < 692:
        for shift in (120, 150, 180):
            if not mask[y, x + shift]:
                out_im[y, x] = im[y, x + shift]
                break
    else:
        # blat i front szafki: najbliższy czysty piksel drewna w tym samym wierszu
        best = None
        for d in range(1, 120):
            for sx in (x + d, x - d):
                if 338 <= sx <= 441 and not mask[y, sx]:
                    best = sx
                    break
            if best is not None:
                break
        if best is not None:
            out_im[y, x] = im[y, best]

# przednia krawędź blatu: pas jednolity w poziomie, więc kopiuję go z lewej
for y in range(709, 720):
    out_im[y, 388:438] = out_im[y, 384]

# lewa ściana: zdjęta półka z książkami i zwisająca roślinka, żeby było miejsce na obrazki.
# Wypełnienie kolumnami (płynnie od koloru nad półką do koloru pod nią) zachowuje pionowe
# krawędzie: narożnik pokoju i plamę słońca.
SY0, SY1, SX1 = 326, 552, 183
rng = np.random.default_rng(3)
for x in range(0, SX1):
    top = out_im[SY0 - 6:SY0, x].mean(axis=0)
    bot = out_im[SY1:SY1 + 6, x].mean(axis=0)
    for y in range(SY0, SY1):
        k = (y - SY0) / (SY1 - SY0)
        out_im[y, x] = top * (1 - k) + bot * k + rng.normal(0, 1.2, 3)

Image.fromarray(np.clip(out_im, 0, 255).astype(np.uint8)).save(out, quality=92)
print('masked px:', mask.sum())
