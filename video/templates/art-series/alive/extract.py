"""Cuts spans of the artist's footage into frame sequences for the page's panels. Each span is cropped to its picture
(CapCut letterboxes landscape clips inside the portrait frame), so no black bars or burned-in captions are kept.
  python3 -I extract.py <video> <out dir> name:t0:t1[:speed][:x0,y0,x1,y1 fractions] ...
Writes <out>/<name>/0001.jpg ... at 30 fps (speed 2 = every second source frame) and prints each crop and size."""
import subprocess, sys, os, json
import numpy as np, cv2
src, out = sys.argv[1:3]; meta = {}
for spec in sys.argv[3:]:
    p = spec.split(':'); name, t0, t1 = p[0], float(p[1]), float(p[2]); speed = float(p[3]) if len(p) > 3 and p[3] else 1
    cap = cv2.VideoCapture(src); fps = cap.get(cv2.CAP_PROP_FPS); W, H = int(cap.get(3)), int(cap.get(4))
    if len(p) > 4 and p[4]:
        x0, y0, x1, y1 = (float(v) for v in p[4].split(',')); box = [int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)]
    else:                                                    # the picture: rows and columns that are not black in most sampled frames
        acc = np.zeros((H, W), np.float32); k = 0
        for t in np.linspace(t0 + .1, t1 - .1, 9):
            cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000); ok, f = cap.read()
            if ok: acc += (f.max(axis=2) > 26); k += 1
        m = acc / max(k, 1) > .5; rows = np.where(m.mean(axis=1) > .5)[0]; cols = np.where(m[rows[0]:rows[-1] + 1].mean(axis=0) > .5)[0]
        box = [int(cols[0]), int(rows[0]), int(cols[-1]) + 1, int(rows[-1]) + 1]
        box = [box[0] + 2, box[1] + 3, box[2] - 2, box[3] - 3]
    d = f'{out}/{name}'; os.makedirs(d, exist_ok=True)
    for f in os.listdir(d): os.remove(f'{d}/{f}')
    x0, y0, x1, y1 = box; w, h = (x1 - x0) // 2 * 2, (y1 - y0) // 2 * 2
    vf = f'crop={w}:{h}:{x0}:{y0}' + (f',setpts=PTS/{speed}' if speed != 1 else '') + ',fps=30'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t0), '-t', str(t1 - t0), '-i', src, '-vf', vf, '-q:v', '2', '-start_number', '1', f'{d}/%04d.jpg'], check=True)
    n = len(os.listdir(d)); meta[name] = dict(n=n, w=w, h=h, box=box, t0=t0, t1=t1, speed=speed); print(name, n, 'frames', f'{w}x{h}', box)
mp = f'{out}/meta.json'; old = json.load(open(mp)) if os.path.exists(mp) else {}; old.update(meta); json.dump(old, open(mp, 'w'), indent=1)
