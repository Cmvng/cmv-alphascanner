"""The raw recording beside the finished video, at the moments the owner shows something.
  python3 -I versus_raw.py <work dir> <out.mp4> <dir> t,t,...     (t = seconds in the finished video)

For each time it writes one picture: left, the whole raw frame (from <work>/pp_src.mp4, flipped if build_av.py flips);
right, the finished frame. Look at each pair and answer one question: is everything the owner holds up or points at on
the left still in the picture on the right, whole and uncovered? If not, the video does not go out.
The owner, 11 Nov, on a version that passed every other check: "You cut what I'm actually trying to show."
Also writes vs_sheet_N.jpg, six pairs to a sheet, for a first look; open the single pictures for anything in doubt."""
import json, sys, os
import cv2, numpy as np
K, OUT, D, TS = sys.argv[1:5]
FLIP = True
os.makedirs(D, exist_ok=True)
segs = json.load(open(f'{K}/segs.json'))
tab, acc = [], 0.0
for s in segs:
    d = s['e'] - s['s']; tab.append((acc, acc + d, s['s'])); acc += d
def src(t):
    for a, b, s in tab:
        if a <= t < b: return s + (t - a)
    return None
raw, fin = cv2.VideoCapture(f'{K}/pp_src.mp4'), cv2.VideoCapture(OUT)
rf, ff = raw.get(cv2.CAP_PROP_FPS), fin.get(cv2.CAP_PROP_FPS)
pairs = []
for t in [float(x) for x in TS.split(',')]:
    st = src(t)
    if st is None: print(f'{t:.2f}: after the last cut piece, skipped'); continue
    raw.set(cv2.CAP_PROP_POS_FRAMES, int(round(st * rf))); ok1, a = raw.read()
    fin.set(cv2.CAP_PROP_POS_FRAMES, int(round(t * ff))); ok2, b = fin.read()
    if not (ok1 and ok2): print(f'{t:.2f}: could not read a frame'); continue
    if FLIP: a = cv2.flip(a, 1)
    a = cv2.resize(a, (1080, 1920), interpolation=cv2.INTER_AREA)
    for im, lab in ((a, f'RAW  {st:.2f} s'), (b, f'VIDEO  {t:.2f} s')):
        cv2.rectangle(im, (0, 0), (430, 64), (20, 20, 20), -1)
        cv2.putText(im, lab, (14, 46), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 3)
    p = np.hstack([a, np.full((1920, 16, 3), 255, np.uint8), b])
    cv2.imwrite(f'{D}/vs_{t:07.2f}.jpg', p, [cv2.IMWRITE_JPEG_QUALITY, 92])
    pairs.append(cv2.resize(p, (544, 480), interpolation=cv2.INTER_AREA))
for i in range(0, len(pairs), 6):
    r = pairs[i:i + 6]
    while len(r) < 6: r.append(np.zeros_like(pairs[0]))
    cv2.imwrite(f'{D}/vs_sheet_{i // 6}.jpg', np.vstack([np.hstack(r[:3]), np.hstack(r[3:])]), [cv2.IMWRITE_JPEG_QUALITY, 88])
print(f'{len(pairs)} pairs in {D}')
