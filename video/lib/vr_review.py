"""Checks for an edit with video reactions (vr.js), against the edit it was drawn on.
- diff.txt: outside the reaction windows the new video must match the old one, so every 15th frame there is compared,
  frame number for frame number (mean absolute difference per pixel; encode noise is under 1). Anything over 3 is listed.
- win-NN.jpg: every reaction window at 10 frames a second, from 0.2 s before it to 0.25 s after, at 270x480 per frame.
- full-NN.jpg: the whole video every 0.5 s, 20 frames a sheet at 324x576, with gaps so frames can't be misread.
- ov-NN.jpg (a plan.json only): every other overlay window (marks, stamps, chips, floats, chapters) at 10 fps, windows
  closer than 0.3 s merged into one sheet.
  python3 -I video/lib/vr_review.py <new.mp4> <old.mp4 | -> <events.js | plan.json> <out dir>
With - for the old video (a new edit, not drawn on a finished one) there is no diff. A plan.json gives its "events"."""
import json, os, re, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

NEW, OLD, EV, OUT = sys.argv[1:5]
os.makedirs(OUT, exist_ok=True)
PLAN = json.load(open(EV)) if EV.endswith('.json') else {}
events = PLAN['events'] if PLAN else json.loads(re.search(r'VR_EVENTS\s*=\s*(\[.*?\n\])', open(EV).read(), re.S).group(1))
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', NEW],
                           capture_output=True, text=True).stdout)
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
except OSError:
    FONT = ImageFont.load_default()


def frames(src, t0, t1, fps, w, h):
    """Decoded frames of src from t0 to t1 at fps, each w x h (RGB arrays)."""
    p = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', f'{max(0, t0):.3f}', '-i', src, '-t', f'{t1 - max(0, t0):.3f}',
                        '-vf', f'fps={fps},scale={w}:{h}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True)
    a = np.frombuffer(p.stdout, np.uint8)
    return a.reshape(-1, h, w, 3)


def sheet(imgs, labels, cols, w, h, path, gap=10):
    rows = (len(imgs) + cols - 1) // cols
    S = Image.new('RGB', (cols * (w + gap) + gap, rows * (h + gap) + gap), 'white')
    d = ImageDraw.Draw(S)
    for i, (im, lb) in enumerate(zip(imgs, labels)):
        x, y = gap + (i % cols) * (w + gap), gap + (i // cols) * (h + gap)
        S.paste(Image.fromarray(im), (x, y))
        d.rectangle([x, y, x + 9 + 13 * len(lb), y + 28], fill='black')
        d.text((x + 5, y + 3), lb, fill='white', font=FONT)
    S.save(path, quality=88)


# 1. outside the windows: the same frames as before. Frames are picked by number (every 15th), not by time, so the two
# videos are compared frame for frame
def every15(src):
    p = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', src, '-vf', r"select='not(mod(n\,15))',scale=270:480",
                        '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.uint8).reshape(-1, 480, 270, 3)


win = [(e['t0'], e['t1']) for e in events]
inside = lambda t: any(a - 2 / 30 <= t <= b + 2 / 30 for a, b in win)
bad, vals = [], []
if OLD != '-':
    A, B = every15(NEW), every15(OLD)
    for i in range(min(len(A), len(B))):
        tt = i * 15 / 30
        if inside(tt):
            continue
        m = float(np.abs(A[i].astype(int) - B[i].astype(int)).mean())
        vals.append(m)
        if m > 3:
            bad.append((round(tt, 2), round(m, 2)))
    del A, B
with open(os.path.join(OUT, 'diff.txt'), 'w') as f:
    if vals:
        f.write(f'{len(vals)} frames compared outside the windows: mean {np.mean(vals):.2f}, max {np.max(vals):.2f}\n')
        f.write('over 3: ' + (', '.join(f'{a} s ({b})' for a, b in bad) if bad else 'none') + '\n')
    else:
        f.write('no base video to compare\n')
print(open(os.path.join(OUT, 'diff.txt')).read().strip())

# 2. each window at 10 fps
for k, e in enumerate(events):
    a, b = e['t0'] - .2, e['t1'] + .25
    fr = frames(NEW, a, b, 10, 270, 480)
    sheet(list(fr), [f'{max(0, a) + i / 10:.1f}' for i in range(len(fr))], 9, 270, 480, os.path.join(OUT, f'win-{k:02d}.jpg'))
print(len(events), 'window sheets')

# 2b. the other overlays of a plan at 10 fps (windows closer than 0.3 s share a sheet)
ov = sorted((x['t0'], x['t1'], k) for k in ('marks', 'stamps', 'chips', 'floats', 'chapters') for x in PLAN.get(k, []))
merged = []
for a, b, k in ov:
    if merged and a - merged[-1][1] < .3:
        merged[-1][1] = max(merged[-1][1], b); merged[-1][2].add(k)
    else:
        merged.append([a, b, {k}])
with open(os.path.join(OUT, 'ov.txt'), 'w') as f:
    for n, (a, b, ks) in enumerate(merged):
        fr = frames(NEW, a - .2, b + .25, 10, 270, 480)
        sheet(list(fr), [f'{max(0, a - .2) + i / 10:.1f}' for i in range(len(fr))], 9, 270, 480, os.path.join(OUT, f'ov-{n:02d}.jpg'))
        f.write(f'ov-{n:02d}  {a:7.2f}-{b:7.2f}  {", ".join(sorted(ks))}\n')
print(len(merged), 'overlay sheets')

# 3. the whole video every 0.5 s
fr = frames(NEW, 0, dur, 2, 324, 576)
n = 0
for s in range(0, len(fr), 20):
    sheet(list(fr[s:s + 20]), [f'{(s + i) / 2:.1f}' for i in range(len(fr[s:s + 20]))], 10, 324, 576, os.path.join(OUT, f'full-{n:02d}.jpg'))
    n += 1
print(n, 'full sheets')
