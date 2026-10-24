# Nintendo Switch narysowany ręcznie jako pixel art (28×14), w stylu przedmiotów w pokoju.
from PIL import Image

PAL = {
    'k': (58, 34, 32), 'b': (31, 181, 232), 'B': (20, 132, 180), 'i': (140, 224, 255),
    'r': (255, 90, 95), 'R': (200, 58, 68), 'q': (255, 160, 160),
    'g': (70, 70, 78), 's': (28, 30, 38), 'S': (60, 66, 84), 'x': (30, 30, 34),
}
L = ['.kkkk', 'kiibk', 'kbxbk', 'kbbbk', 'kbbbk', 'kbxbk', 'kxbxk', 'kbxbk', 'kbbbk', 'kbbbk', 'kbbxk', 'kbbbk', 'kBBBk', '.kkkk']
R = ['kkkk.', 'kqrrk', 'krxrk', 'kxrxk', 'krxrk', 'krrrk', 'krrrk', 'krxrk', 'krrrk', 'kxrrk', 'krrrk', 'krrrk', 'kRRRk', 'kkkk.']
M = []
for y in range(14):
    if y in (0, 13):
        M.append('k' * 18)
    elif y in (1, 12):
        M.append('k' + 'g' * 16 + 'k')
    else:
        row = list('kg' + 's' * 14 + 'gk')
        if y == 2:
            row[2:6] = 'SSSS'
        if y == 3:
            row[2:4] = 'SS'
        M.append(''.join(row))
rows = [l + m + r for l, m, r in zip(L, M, R)]
assert all(len(r) == 28 for r in rows)
im = Image.new('RGBA', (28, 14), (0, 0, 0, 0))
for y, row in enumerate(rows):
    for x, ch in enumerate(row):
        if ch != '.':
            im.putpixel((x, y), (*PAL[ch], 255))
im.save('public/art/items/switch.png')
print('switch 28x14')
