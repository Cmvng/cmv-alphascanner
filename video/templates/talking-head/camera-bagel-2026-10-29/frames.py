"""Extract the source frames the Bagel page draws: every frame of each real-time piece, every k-th frame of a fast
piece, the held frame of a hold, and the frames the floats use. Named by source frame number at 30 fps
(f_012345.jpg), the number the page asks for.
  python3 -I frames.py <work dir> <recording.mp4>    (reads <work>/plan.json, writes <work>/src/)"""
import json, os, subprocess, sys

K, SRC = sys.argv[1:3]
FPS = 30
plan = json.load(open(f'{K}/plan.json'))
out = f'{K}/src'
os.makedirs(out, exist_ok=True)
have = set(int(f[2:8]) for f in os.listdir(out) if f.startswith('f_'))
need = set()
for p in plan['pieces']:
    if p['mode'] == 'end':
        continue
    if p.get('hold') is not None:
        need.add(round(p['hold'] * FPS)); continue
    n0, n1, k = round(p['v0'] * FPS), round(p['v1'] * FPS), p.get('step', 1)
    need.update(range(n0, n1 + 1, k))
for f in plan['floats']:
    need.add(round(f['at'] * FPS))
todo = sorted(need - have)
# group into runs of a constant stride, then one ffmpeg per run
runs = []
for n in todo:
    if runs and n - runs[-1][-1] <= 12 and (len(runs[-1]) < 2 or n - runs[-1][-1] == runs[-1][-1] - runs[-1][-2]):
        runs[-1].append(n)
    else:
        runs.append([n])
for r in runs:
    a, k = r[0], (r[1] - r[0] if len(r) > 1 else 1)
    tmp = f'{out}/tmp_%06d.jpg'
    sel = f"select='not(mod(n\\,{k}))'," if k > 1 else ''
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', f'{max(0, a / FPS - .004):.4f}', '-i', SRC, '-vf', f'{sel}null',
                    '-fps_mode', 'passthrough', '-frames:v', str(len(r)), '-q:v', '2', '-start_number', '0', tmp], check=True)
    for i, n in enumerate(r):
        os.replace(f'{out}/tmp_{i:06d}.jpg', f'{out}/f_{n:06d}.jpg')
print(f'{len(need)} frames needed, {len(todo)} extracted in {len(runs)} runs')
