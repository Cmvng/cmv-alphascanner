"""Measure the face box in every reaction sticker, so swaps between clips keep the head the same size and place.

The clips were filmed at different distances (the 5 Nov ones very close), so a raw swap from the listening face to a
reaction made the head jump up to ~30% bigger. react_flow.js uses this box to scale and place each clip so the FACE
stays put (7 Nov fix).

  python3 -I video/lib/react_face.py video/out/reactions [id ...] [id:EYE_ROW ...]

Writes "face": {"cx", "cy", "w"} into <id>/meta.json: the eye row (cy), the head centre on it (cx) and the head width
at eye level from the alpha (w), in sticker pixels, median over sampled frames. Uses OpenCV's
frontal-face Haar cascade on the sticker frames composited over grey; frames where no face is found are skipped. If no
frame finds a face, falls back to the silhouette (head width a little below the top of the alpha).
"""
import json, os, sys
import numpy as np
import cv2
from PIL import Image

LIB = sys.argv[1]
# id:EYE_ROW forces the eye row (sticker px) where the detector fails (hands on the head, an extreme grimace)
ARGS = sys.argv[2:]
FORCE = {a.split(':')[0]: int(a.split(':')[1]) for a in ARGS if ':' in a}
ids = [a.split(':')[0] for a in ARGS] or sorted(d for d in os.listdir(LIB) if os.path.isfile(os.path.join(LIB, d, 'meta.json')))
casc = cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml'))


def silhouette_face(a):
    rows = np.where((a > 128).sum(1) > 12)[0]
    top = int(rows.min())
    band = a[top + 60: top + 200]
    ws = [(r > 128).sum() for r in band]
    w = float(np.median(ws)) * 0.78               # silhouette incl. hair/ears -> roughly the face box width
    cols = np.where(a[top + 120] > 128)[0]
    cx = float((cols.min() + cols.max()) / 2) if len(cols) else a.shape[1] / 2
    return cx, top + 0.55 * w + 40, w


for i in ids:
    d = os.path.join(LIB, i)
    m = json.load(open(os.path.join(d, 'meta.json')))
    fs = sorted(f for f in os.listdir(d) if f.startswith('f_') and f.endswith('.png'))
    pick = fs[:: max(1, len(fs) // 24)]
    boxes, sil = [], []
    for f in pick:
        im = Image.open(os.path.join(d, f)).convert('RGBA')
        arr = np.asarray(im)
        a = arr[:, :, 3]
        rgb = arr[:, :, :3].astype(np.float32) * (a[:, :, None] / 255.0) + 128 * (1 - a[:, :, None] / 255.0)
        g = cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2GRAY)
        found = casc.detectMultiScale(g, scaleFactor=1.05, minNeighbors=5, minSize=(230, 230)) if i not in FORCE else []
        if len(found):
            x, y, w, h = max(found, key=lambda b: b[2] * b[3])
            # the Haar box only locates the face; its size is noisy (+-20%). The scale we use is the head's width at eye
            # level, read from the cut-out's alpha: the same head in every clip, so it is a stable size reference.
            ey = int(y + 0.40 * h); row = a[ey] > 128
            cx0 = int(x + w / 2); l = r = cx0
            while l > 0 and row[l - 1]: l -= 1
            while r < len(row) - 1 and row[r + 1]: r += 1
            if r - l > 0.6 * w:
                boxes.append(((l + r) / 2, ey, float(r - l)))
        if i in FORCE:                                   # measured at the given eye row, centred on the silhouette
            ey = FORCE[i]; cols = np.where(a[ey] > 128)[0]
            if len(cols): boxes.append(((cols.min() + cols.max()) / 2, ey, float(cols.max() - cols.min())))
            continue
        sil.append(silhouette_face(a))
    src = 'forced' if i in FORCE else 'haar'
    if len(boxes) >= max(2, len(pick) // 5):
        cx, cy, w = (float(np.median([b[k] for b in boxes])) for k in range(3))
    else:
        cx, cy, w = (float(np.median([b[k] for b in sil])) for k in range(3)); src = 'silhouette'
    m['face'] = {'cx': round(cx, 1), 'cy': round(cy, 1), 'w': round(w, 1), 'src': src, 'n': len(boxes)}
    json.dump(m, open(os.path.join(d, 'meta.json'), 'w'))
    print(f'{i:16s} face cx {cx:6.1f} cy {cy:6.1f} w {w:6.1f}  ({src}, {len(boxes)}/{len(pick)} frames)')
