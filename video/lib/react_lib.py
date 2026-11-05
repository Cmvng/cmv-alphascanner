"""Index the reaction-sticker library for the pages: writes <lib>/lib.js (window.RLIB = {id: {frames, w, h, full, name}}),
and with --full <id>=<clip.mp4> ... also the real full-frame clip (room and all) as <lib>/<id>/full/f_0001.jpg… for
interrupt cutaways, cut to the same in/out as the sticker.
  python3 -I video/lib/react_lib.py <library.json> <lib dir> [--full grin=/path/c1.mp4 ...]"""
import json, os, subprocess, sys
LIBJ, LIB = sys.argv[1:3]
full = dict(a.split('=', 1) for a in sys.argv[4:]) if '--full' in sys.argv else {}
lib = json.load(open(LIBJ))
out = {}
for r in lib['reactions']:
    d = os.path.join(LIB, r['id'])
    if not os.path.exists(os.path.join(d, 'meta.json')):
        print('missing', r['id']); continue
    m = json.load(open(os.path.join(d, 'meta.json')))
    if r['id'] in full:
        fd = os.path.join(d, 'full'); os.makedirs(fd, exist_ok=True)
        for f in os.listdir(fd): os.remove(os.path.join(fd, f))
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', str(r['in']), '-to', str(r['out']), '-i', full[r['id']],
                        '-vf', 'scale=1080:1920:flags=lanczos', '-r', '30', '-q:v', '3', os.path.join(fd, 'f_%04d.jpg')], check=True)
    fd = os.path.join(d, 'full')
    nfull = len([f for f in os.listdir(fd) if f.endswith('.jpg')]) if os.path.isdir(fd) else 0
    out[r['id']] = {'frames': m['frames'], 'w': m['w'], 'h': m['h'], 'full': nfull, 'name': r['name']}
open(os.path.join(LIB, 'lib.js'), 'w').write('window.RLIB = ' + json.dumps(out) + '\n')
print(json.dumps(out))
