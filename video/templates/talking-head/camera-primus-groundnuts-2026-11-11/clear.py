"""Where the thing the owner holds up sits in the caption band, ten times a second, so a caption never lands on it.
  python3 -I clear.py <work dir>     reads base.mp4, writes clear.js (window.CLEAR = {rate, small: [...], big: [...]})

Here the thing is a bottle of groundnuts. It is found by colour AND texture: light tan, and busy (many small nuts).
Colour alone also finds the palm of a bare hand, and a caption does not need to dodge a hand. A blob must be large
(a real bottle, not a speck). For every tenth of a second it gives the columns the bottle covers in the small caption
band and in the big-phrase band, as [x0, x1], or null when the band is clear. talk.html then moves each caption
chunk sideways, off the bottle. A different object needs a different finder; the rule is the same: find what the
owner shows before placing type on the picture. The picture is read once, in order."""
import json, subprocess, sys
import cv2, numpy as np
K = sys.argv[1]
Y0, Y1 = 1000, 1920                 # the part of the frame read (the bottle is never above the chin)
SMALL = (1386, 1494)                # the small caption line with its outline (talk.html: #cap top 1404, 72 px line)
BIG = (1470, 1616)                  # the big key phrase under it
RATE = 10
ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)); kcl = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41))
def bottle(f):
    hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)
    col = cv2.inRange(hsv, (9, 70, 150), (30, 255, 255))
    g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32)
    tex = cv2.blur(np.abs(cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3)) + np.abs(cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)), (25, 25))
    m = ((col > 0) & (tex > 38)).astype(np.uint8) * 255
    m = cv2.morphologyEx(cv2.morphologyEx(m, cv2.MORPH_OPEN, ker), cv2.MORPH_CLOSE, kcl)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    out = np.zeros(m.shape, bool)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] > 9000: out |= lab == i
    return out
def span(m, band):
    xs = np.where(m[band[0] - Y0:band[1] - Y0].any(0))[0]
    return [int(xs.min()), int(xs.max())] if len(xs) else None
p = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-i', f'{K}/base.mp4', '-vf', f'fps={RATE},crop=1080:{Y1 - Y0}:0:{Y0}',
                      '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], stdout=subprocess.PIPE)
n = 1080 * (Y1 - Y0) * 3; small, big = [], []
while True:
    buf = p.stdout.read(n)
    if len(buf) < n: break
    m = bottle(np.frombuffer(buf, np.uint8).reshape(Y1 - Y0, 1080, 3))
    small.append(span(m, SMALL)); big.append(span(m, BIG))
open(f'{K}/clear.js', 'w').write('window.CLEAR = ' + json.dumps(dict(rate=RATE, small=small, big=big)) + '\n')
on = [i / RATE for i, s in enumerate(small) if s]; runs = []
for t in on:
    if runs and t - runs[-1][1] < .35: runs[-1][1] = t
    else: runs.append([t, t])
print('the bottle is in the caption band at:', ', '.join(f'{a:.1f}-{b:.1f}' for a, b in runs))
