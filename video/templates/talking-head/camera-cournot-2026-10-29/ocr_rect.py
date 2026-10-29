"""Find a phrase on a capture by OCR and print its box: python3 -I ocr_rect.py <img> <y0> <y1> "<phrase>" ["<phrase>" ...]
Searches rows y0..y1 (image px); the box is the union of the phrase's words, in image px."""
import re, subprocess, sys, tempfile, os
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
img, y0, y1 = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
im = Image.open(img).convert('L'); y1 = min(y1, im.height)
crop = im.crop((0, y0, im.width, y1))
tmp = tempfile.mkdtemp(); p = os.path.join(tmp, 'c.png'); crop.save(p)
tsv = subprocess.run(['tesseract', p, '-', '--psm', '3', 'tsv'], capture_output=True, text=True).stdout.splitlines()[1:]
W = []
for ln in tsv:
    f = ln.split('\t')
    if len(f) == 12 and f[11].strip():
        W.append((re.sub(r'[^a-z0-9%.$<]', '', f[11].lower()), int(f[6]), int(f[7]) + y0, int(f[8]), int(f[9])))
norm = lambda s: [re.sub(r'[^a-z0-9%.$<]', '', w) for w in s.lower().split()]
for ph in sys.argv[4:]:
    q = [w for w in norm(ph) if w]; best = None
    for i in range(len(W)):
        k = 0; j = i; hit = []
        while j < len(W) and k < len(q):
            if W[j][0] == q[k] or (len(q[k]) > 3 and (q[k] in W[j][0] or W[j][0] in q[k]) and W[j][0]): hit.append(W[j]); k += 1; j += 1
            elif not W[j][0]: j += 1
            else: break
        if k == len(q): best = hit; break
    if not best: print('MISS', ph); continue
    x0 = min(w[1] for w in best); y_0 = min(w[2] for w in best); x1 = max(w[1] + w[3] for w in best); y_1 = max(w[2] + w[4] for w in best)
    print(f'{ph[:40]!r}: [{x0}, {y_0}, {x1 - x0}, {y_1 - y_0}]')
