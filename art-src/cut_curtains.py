# Wycina zasłony z tła pokoju (z przezroczystością), żeby w kodzie mogły falować od wiatru.
# Obrys jest ręczny, bo kolor zasłon jest zbyt podobny do ściany i świateł miasta.
import json
from PIL import Image, ImageDraw

room = Image.open('public/art/room.webp').convert('RGBA')
POLY = {
    'l': [(178, 197), (284, 197), (284, 330), (276, 380), (265, 440), (256, 480), (253, 540), (258, 597), (178, 597)],
    'r': [(699, 197), (802, 197), (802, 512), (797, 585), (727, 585), (722, 520), (714, 470), (707, 410), (700, 330)],
}
out = {}
for name, pts in POLY.items():
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    x0, y0, x1, y1 = min(xs), min(ys), max(xs) + 1, max(ys) + 1
    mask = Image.new('L', room.size, 0)
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    cut = Image.new('RGBA', room.size, (0, 0, 0, 0))
    cut.paste(room, (0, 0), mask)
    cut.crop((x0, y0, x1, y1)).save(f'public/art/curtain-{name}.png', optimize=True)
    out[name] = {'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0}
json.dump(out, open('src/curtains.json', 'w'))
print(out)
