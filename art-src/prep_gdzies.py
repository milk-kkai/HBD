# "Gdzieś to widziałam? 100/10": prostuje zdjęcie rysunku (perspektywa), usuwa przycisk
# z ekranu i zapisuje obrazek do ramki w pokoju.
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

src = Image.open('art-src/gdzies-to-widzialam.webp').convert('RGB')
a = np.array(src).astype(float)

# okrągły przycisk z ekranu (nie jest częścią rysunku) → zamalowany kolorem kartki wokół
cx, cy, rad = 935, 287, 24
yy, xx = np.mgrid[:a.shape[0], :a.shape[1]]
d = np.hypot(xx - cx, yy - cy)
ring = (d > rad + 3) & (d < rad + 9)
a[d <= rad + 2] = a[ring].mean(axis=0)
src = Image.fromarray(a.astype(np.uint8))

# narożniki kartki z prostych krawędzi; prawy dolny róg wypada poza kadr zdjęcia
TL, TR, BR, BL = (135, -19), (985, 98), (934, 1342), (2, 1214)
OW, OH = 900, 1245

def coeffs(dst, srcq):
    # współczynniki PIL: punkt wyjściowy -> punkt w źródle
    A, B = [], []
    for (x, y), (u, v) in zip(dst, srcq):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); B.append(v)
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()

paper = tuple(int(v) for v in np.array(src)[1100:1200, 60:200].reshape(-1, 3).mean(axis=0))
c = coeffs([(0, 0), (OW, 0), (OW, OH), (0, OH)], [TL, TR, BR, BL])
out = src.transform((OW, OH), Image.PERSPECTIVE, c, Image.BICUBIC, fillcolor=paper)

# miękkie wypełnienie skrawka, który był poza kadrem (bez ostrej krawędzi)
mask = Image.new('L', src.size, 255).transform((OW, OH), Image.PERSPECTIVE, c, Image.NEAREST, fillcolor=0)
soft = mask.filter(ImageFilter.GaussianBlur(6))
fill = Image.new('RGB', (OW, OH), paper)
out = Image.composite(out, fill, soft)

# lekka korekta: trochę kontrastu i ostrości, kolory zostają jak na zdjęciu
out = ImageEnhance.Contrast(out).enhance(1.08)
out = out.filter(ImageFilter.UnsharpMask(radius=1.4, percent=60, threshold=2))
out = out.crop((6, 6, OW - 6, OH - 6))
out.save('public/photos/gdzies-to-widzialam.webp', quality=90, method=6)
print(out.size)
