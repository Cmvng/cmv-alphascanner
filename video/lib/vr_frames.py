"""Extract the frames of a finished edit that a video-reaction page draws itself (vr.js): every frame of a duet, a
behind or a cut with lifted captions, and the held frame of a freeze. Frames are named by their number in the edit
(b_000123.jpg at 30 fps), which is the page's frame number.
  python3 -I video/lib/vr_frames.py <events.js> <edit.mp4> <out dir>"""
import json, os, re, subprocess, sys

EV, SRC, OUT = sys.argv[1:4]
FPS = 30
txt = open(EV).read()
events = json.loads(re.search(r'VR_EVENTS\s*=\s*(\[.*?\n\])', txt, re.S).group(1))   # the events array ends on a line of its own
need = set()
for e in events:
    a, b = round(e['t0'] * FPS), round(e['t1'] * FPS)
    if e['k'] in ('duet', 'behind') or (e['k'] == 'cut' and isinstance(e.get('caps'), dict)):
        need.update(range(a, b + 1))
    if e['k'] == 'freeze':
        need.add(round(e['at'] * FPS))
os.makedirs(OUT, exist_ok=True)
runs, s = [], None
for n in sorted(need):
    if s is None or n != runs[-1][1] + 1:
        runs.append([n, n])
    else:
        runs[-1][1] = n
    s = n
for a, b in runs:
    # accurate input seek: the first frame out is the first one at or after the seek point, so seek a hair before it
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', f'{max(0, a / FPS - .004):.4f}', '-i', SRC, '-frames:v', str(b - a + 1),
                    '-q:v', '1', '-start_number', str(a), os.path.join(OUT, 'b_%06d.jpg')], check=True)
print(f'{len(need)} frames in {len(runs)} runs -> {OUT}')
