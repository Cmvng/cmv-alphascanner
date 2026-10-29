"""Text lines on a capture (tesseract, line level), and the bands of non-background rows.
python3 -I lines.py <img> [y0 y1]  ->  each line: y0-y1 x0-x1 text"""
import subprocess, sys, tempfile, os
from PIL import Image
import numpy as np
Image.MAX_IMAGE_PIXELS = None
img = sys.argv[1]
im = Image.open(img).convert('L')
y0, y1 = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (0, im.height)
y1 = min(y1, im.height)
crop = im.crop((0, y0, im.width, y1))
with tempfile.TemporaryDirectory() as d:
    p = os.path.join(d, 'c.png'); crop.save(p)
    out = subprocess.run(['tesseract', p, '-', '--psm', '4', 'tsv'], capture_output=True, text=True).stdout
L = {}
for row in out.splitlines()[1:]:
    f = row.split('\t')
    if len(f) < 12 or f[0] != '5' or not f[11].strip(): continue
    k = (f[2], f[3], f[4]); x, y, w, h = map(int, f[6:10])
    a = L.setdefault(k, [1e9, 1e9, 0, 0, []])
    a[0] = min(a[0], x); a[1] = min(a[1], y + y0); a[2] = max(a[2], x + w); a[3] = max(a[3], y + y0 + h); a[4].append(f[11])
for a in sorted(L.values(), key=lambda a: a[1]):
    print(f'{a[1]:5d}-{a[3]:5d}  x {a[0]:4d}-{a[2]:4d}  {" ".join(a[4])[:90]}')
# bands: rows that differ from the row's background colour
arr = np.asarray(crop).astype(int)
bg = np.median(arr[:, :8], axis=1)
dev = (np.abs(arr - bg[:, None]) > 18).sum(1)
bands, on = [], False
for y, v in enumerate(dev):
    if v > 2 and not on: s, on = y, True
    if v <= 2 and on: bands.append((s + y0, y + y0)); on = False
if on: bands.append((s + y0, len(dev) + y0))
print('bands:', bands)
