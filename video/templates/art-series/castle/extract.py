"""Frames for every clip segment of the castle plan, at the size its slot shows, one folder per segment.
python3 -I extract.py <plan.json> <page dir>   -> <page dir>/frames/sNN/0001.jpg …, plan_data.js

A segment's `rect` crops the source to where the real picture sits (the owner's compilation has letterboxed parts);
then the picture is cropped to the slot's shape round its centre and scaled once. The colour stays the footage's own:
read with its own matrix, written as full-range BT.601 JPEG, which the browser decodes to the same RGB."""
import json, os, subprocess, sys
plan = json.load(open(sys.argv[1])); PAGE = sys.argv[2]
FPS = plan['fps']
SLOT = {'L': (426, 756), 'R': (426, 756), 'screen': (1680, 946), 'box': (1040, 686), 'full': (1920, 1080)}

def probe(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,color_space,color_transfer',
                        '-of', 'json', p], capture_output=True, text=True, check=True)
    s = json.loads(r.stdout)['streams'][0]
    return s['width'], s['height'], s.get('color_space') or 'bt709', s.get('color_transfer') or ''

os.makedirs(f'{PAGE}/frames', exist_ok=True)
for i, s in enumerate(plan['segs']):
    if 'clip' not in s: continue
    path = plan['clips'][s['clip']]['path']
    w, h, mat, trc = probe(path)
    rx, ry, rw, rh = s.get('rect', [0, 0, w, h])
    ow, oh = SLOT[s['slot']]
    if rw / rh > ow / oh: cw, ch = rh * ow / oh, rh
    else: cw, ch = rw, rw * oh / ow
    fx = s.get('fx', .5)                                           # where across the picture the slot is centred
    cx, cy = rx + min(max(0, fx * rw - cw / 2), rw - cw), ry + (rh - ch) / 2
    n = max(1, int(round((s['t1'] - s['t0']) * FPS)))
    span = (s['t1'] - s['t0']) * s['speed']
    m = {'bt709': 'bt709', 'smpte170m': 'bt601', 'bt470bg': 'bt601'}.get(mat, 'bt709')
    if trc in ('arib-std-b67', 'smpte2084'): raise SystemExit(f'{path}: HDR, tone-map it first')
    vf = (f"setpts=(PTS-STARTPTS)/{s['speed']:.6f},fps={FPS},crop={int(cw) // 2 * 2}:{int(ch) // 2 * 2}:{int(cx)}:{int(cy)},"
          f"scale={ow}:{oh}:flags=lanczos+accurate_rnd+full_chroma_int:in_color_matrix={m}:out_color_matrix=bt601:out_range=pc,format=yuvj444p")
    d = f'{PAGE}/frames/s{i:02d}'
    os.makedirs(d, exist_ok=True)
    for f in os.listdir(d): os.remove(os.path.join(d, f))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f"{s['src']:.4f}", '-t', f'{span + 2 * s["speed"] / FPS:.4f}', '-i', path,
                    '-vf', vf, '-frames:v', str(n), '-q:v', '2', f'{d}/%04d.jpg'], check=True)
    got = len(os.listdir(d))
    s['dir'] = f'frames/s{i:02d}'; s['n'] = got
    flag = '' if got >= n - 1 else f'  SHORT by {n - got}'
    print(f"s{i:02d} {s['slot']:6s} {s['clip']:7s} {s['src']:6.2f}s ×{s['speed']:<6} {s['t0']:6.2f}–{s['t1']:6.2f}  {got}/{n} frames{flag}")
open(f'{PAGE}/plan_data.js', 'w').write('window.PLAN = ' + json.dumps(plan) + ';\n')
json.dump(plan, open(sys.argv[1], 'w'), indent=1)
