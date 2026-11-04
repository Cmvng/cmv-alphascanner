"""Frames for every clip segment of the plan, at exactly the size its slot shows, one folder per segment.
python3 -I extract.py <plan.json> <config.json> <page dir>     -> <page dir>/frames/sNN/0001.jpg …, and plan_data.js

The colour stays the footage's own: the source is read with its own matrix (bt709 for HD phone video) and written as
JFIF JPEG, which is BT.601 full range by definition, so the browser decodes the same RGB the footage has. Nothing else
is done to the pixels except the crop and the resize."""
import json, os, subprocess, sys
plan = json.load(open(sys.argv[1])); cfg = json.load(open(sys.argv[2])); PAGE = sys.argv[3]
FPS = plan['fps']
SLOT = {'L': (cfg.get('panel_w', 394), cfg.get('panel_h', 700), 1.08), 'R': (cfg.get('panel_w', 394), cfg.get('panel_h', 700), 1.08),
        'full': (1920, 1080, 1.0)}

def probe(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,color_space,color_transfer:stream_side_data=rotation',
                        '-of', 'json', p], capture_output=True, text=True, check=True)
    s = json.loads(r.stdout)['streams'][0]; rot = 0
    for sd in s.get('side_data_list', []) or []:
        if 'rotation' in sd: rot = int(sd['rotation'])
    w, h = s['width'], s['height']
    if abs(rot) % 180 == 90: w, h = h, w
    return w, h, s.get('color_space') or 'bt709', s.get('color_transfer') or ''

os.makedirs(f'{PAGE}/frames', exist_ok=True)
for i, s in enumerate(plan['segs']):
    if 'clip' not in s: continue
    path = cfg['clips'][s['clip']]['path']
    w, h, mat, trc = probe(path)
    tw, th, over = SLOT['full' if s['slot'] == 'full' else s['slot']]
    ow, oh = int(round(tw * over / 2)) * 2, int(round(th * over / 2)) * 2
    # crop the source to the slot's shape round the focus point
    if w / h > ow / oh: cw, ch = h * ow / oh, h
    else: cw, ch = w, w * oh / ow
    fx, fy = s.get('focus', [.5, .5])
    cx = min(max(0, fx * w - cw / 2), w - cw); cy = min(max(0, fy * h - ch / 2), h - ch)
    n = max(1, int(round((s['t1'] - s['t0']) * FPS)))
    span = (s['t1'] - s['t0']) * s['speed']
    m = {'bt709': 'bt709', 'smpte170m': 'bt601', 'bt470bg': 'bt601', 'bt2020nc': 'bt2020'}.get(mat, 'bt709')
    hdr = trc in ('arib-std-b67', 'smpte2084')
    tone = 'zscale=t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,' if hdr else ''
    vf = (f"setpts=(PTS-STARTPTS)/{s['speed']:.6f},fps={FPS},{tone}crop={int(cw)}:{int(ch)}:{int(cx)}:{int(cy)},"
          f"scale={ow}:{oh}:flags=lanczos+accurate_rnd+full_chroma_int:in_color_matrix={m}:out_color_matrix=bt601:out_range=pc,format=yuvj444p")
    d = f'{PAGE}/frames/s{i:02d}'
    os.makedirs(d, exist_ok=True)
    for f in os.listdir(d): os.remove(os.path.join(d, f))
    fast = s['speed'] > 12
    cmd = ['ffmpeg', '-v', 'error', '-y'] + (['-skip_frame', 'nokey'] if fast else []) + ['-ss', f"{s['src']:.4f}", '-t', f'{span + 2 / FPS * s["speed"]:.4f}', '-i', path,
           '-vf', vf, '-frames:v', str(n), '-q:v', '2', f'{d}/%04d.jpg']
    subprocess.run(cmd, check=True)
    got = len(os.listdir(d))
    s['dir'] = f'frames/s{i:02d}'; s['n'] = got; s['wh'] = [ow, oh]
    print(f"s{i:02d} {s['kind']:5s} {s['slot']:7s} {s['clip']:6s} {s['src']:7.2f}s ×{s['speed']:.2f}  {n} frames wanted, {got} written" + ('  HDR tone-mapped' if hdr else ''))
open(f'{PAGE}/plan_data.js', 'w').write('window.PLAN = ' + json.dumps(plan) + ';\n')
json.dump(plan, open(sys.argv[1], 'w'), indent=1)
