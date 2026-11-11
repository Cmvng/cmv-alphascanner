"""The owner's outline on the finished timeline, so type and graphics can sit BEHIND them (depth.html).
  python3 -I matte_cut.py <work dir>     reads pp_alpha.mkv, pp_track.npz, segs.json, plan.json
                                         writes alpha_cut.mkv (gray, 1080x1920, flipped like build_av.py) and track.js

This is NOT a cut-out of the owner. The picture stays the owner's whole frame in their real room (the room look).
The outline is only used to hide the parts of a graphic that fall behind the head, which is what gives depth in the
samples the owner sent (words behind the head, cards that pass behind the shoulders). The outline is grown by a
pixel and softened, so a graphic never prints on the edge of the hair or the skin. After the last spoken frame it is
all white (nothing behind shows; the end card covers the frame).
track.js: the head's centre x and top y for every finished frame (window.TRACK), so a ring can follow the head."""
import json, subprocess, sys
import cv2, numpy as np
K = sys.argv[1]
FPS, WK, HK, OW, OH, FLIP = 30, 1224, 2176, 1080, 1920, True
segs = json.load(open(f'{K}/segs.json')); plan = json.load(open(f'{K}/plan.json'))
fr = [f for g in segs for f in range(round(g['s'] * FPS), round(g['e'] * FPS))]
runs, i = [], 0
while i < len(fr):
    j = i
    while j + 1 < len(fr) and fr[j + 1] == fr[j] + 1: j += 1
    runs.append((fr[i], j - i + 1)); i = j + 1
enc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', f'{OW}x{OH}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'ffv1', '-level', '3', '-g', '30', '-pix_fmt', 'gray', f'{K}/alpha_cut.mkv'], stdin=subprocess.PIPE)
ker = np.ones((3, 3), np.uint8); n = 0
for f0, cnt in runs:
    ss = [] if f0 <= 0 else ['-ss', f'{(f0 - 0.5) / FPS:.5f}']
    p = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-threads', '2'] + ss + ['-i', f'{K}/pp_alpha.mkv', '-frames:v', str(cnt), '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], stdout=subprocess.PIPE)
    for _ in range(cnt):
        b = p.stdout.read(WK * HK)
        if len(b) < WK * HK: break
        a = cv2.resize(np.frombuffer(b, np.uint8).reshape(HK, WK), (OW, OH), interpolation=cv2.INTER_AREA)
        if FLIP: a = cv2.flip(a, 1)
        a = cv2.GaussianBlur(cv2.dilate(a, ker), (0, 0), 1.3)
        enc.stdin.write(a.tobytes()); n += 1
    p.stdout.close(); p.wait()
white = np.full((OH, OW), 255, np.uint8).tobytes()
total = round((plan['end'] + plan['endcard']) * FPS) + 20
for _ in range(total - n): enc.stdin.write(white)
enc.stdin.close(); enc.wait()
z = np.load(f'{K}/pp_track.npz'); s = OW / WK
cx = [round(float((OW - z['cx'][f] * s) if FLIP else z['cx'][f] * s), 1) for f in fr]; top = [round(float(z['top'][f] * s), 1) for f in fr]
open(f'{K}/track.js', 'w').write('window.TRACK = ' + json.dumps(dict(fps=FPS, cx=cx, top=top)) + '\n')
print(f'alpha_cut.mkv: {n} frames of the outline + {total - n} white; head top {min(top):.0f}-{max(top):.0f}, centre x {min(cx):.0f}-{max(cx):.0f}')
