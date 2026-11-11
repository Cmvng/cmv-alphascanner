"""Watch the picture move: consecutive frames at full size, where it moves most.
  python3 -I motion.py <video.mp4> <dir> [t,t,...]      (no times: it finds the fastest moments itself)

Half-second sheets hide what breaks between them. On 11 Nov they looked clean while every fast hand broke into blocks
and edges in motion. For each time this writes eight consecutive frames, each cropped 1:1 (no scaling) to the 480 px
square that moves most, four to a row. Look for blocks, a halo, a hard edge, a smear or a doubled outline.
With no times it measures the change between every pair of frames (inside the picture, away from the top sheet and
the captions) and takes the twelve fastest moments at least two seconds apart."""
import sys, os
import cv2, numpy as np
V, D = sys.argv[1:3]
os.makedirs(D, exist_ok=True)
cap = cv2.VideoCapture(V); fps = cap.get(cv2.CAP_PROP_FPS); n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
def small(f): return cv2.cvtColor(cv2.resize(f, (135, 240), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32)
if len(sys.argv) > 3:
    ts = [float(x) for x in sys.argv[3].split(',')]
else:
    prev, sc = None, []
    for i in range(n):
        ok, f = cap.read()
        if not ok: break
        g = small(f)[108:, :]                              # below the sheet
        sc.append(0 if prev is None else float(np.percentile(np.abs(g - prev), 97))); prev = g
    sc = np.array(sc); ts = []
    for i in np.argsort(-sc):
        t = i / fps
        if all(abs(t - u) >= 2 for u in ts): ts.append(t)
        if len(ts) == 12: break
    ts.sort(); print('fastest moments:', ', '.join(f'{t:.2f}' for t in ts))
for t in ts:
    i0 = max(0, int(round(t * fps)) - 3); cap.set(cv2.CAP_PROP_POS_FRAMES, i0)
    fr = [cap.read()[1] for _ in range(8)]
    if any(f is None for f in fr): continue
    d = sum(np.abs(small(fr[j + 1]) - small(fr[j])) for j in range(7))
    d = cv2.blur(d, (60, 60))                               # a 480 px square is 60 small pixels
    y, x = np.unravel_index(int(np.argmax(d)), d.shape)
    h, w = fr[0].shape[:2]
    x0 = int(np.clip(x * 8 - 240, 0, w - 480)); y0 = int(np.clip(y * 8 - 240, 0, h - 480))
    tiles = []
    for j, f in enumerate(fr):
        c = f[y0:y0 + 480, x0:x0 + 480].copy()
        cv2.putText(c, f'{(i0 + j) / fps:.3f}', (8, 26), cv2.FONT_HERSHEY_SIMPLEX, .7, (0, 255, 255), 2)
        tiles.append(c)
    cv2.imwrite(f'{D}/move_{t:07.2f}.png', np.vstack([np.hstack(tiles[:4]), np.hstack(tiles[4:])]))
print(f'{len(ts)} moments in {D}')
