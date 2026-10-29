"""The owner's video reactions as frames for the pages (video/templates/reactions/vr.js).
For each reaction in library.json it writes:
- the whole clip, room included, at 30 fps and 1080x1920 with the owner's camera grade: <out>/<id>/full/f_0001.jpg…
- with --matte, the cut-out made by react_matte.py (Robust Video Matting), same frames and the same grade, as RGBA
  WebP for the formats where the owner stands in front of the content: <out>/<id>/cut/f_0001.webp…
- <out>/lib.js, which sets window.VLIB (each clip's frame count, face box and name) for the pages.
The full frames are decoded exactly as react_matte.py decodes them (scale, then -r 30), so frame k of full/ and cut/
is the same moment.
  python3 -I video/lib/vreact_prep.py <library.json> <out> --clip <id>=<raw.mp4> … [--matte <id>=<rgba.mkv> …]"""
import json, os, subprocess, sys

LIB, OUT = sys.argv[1:3]
GRADE = 'eq=contrast=1.05:brightness=0.015:saturation=1.05:gamma=1.04,unsharp=5:5:0.4'   # the Primus camera grade


def pairs(flag):
    out, on = {}, False
    for a in sys.argv[3:]:
        if a.startswith('--'):
            on = a == flag
        elif on:
            k, v = a.split('=', 1)
            out[k] = v
    return out


clips, mattes = pairs('--clip'), pairs('--matte')
lib = json.load(open(LIB))
vlib = {}
for r in lib['reactions']:
    i = r['id']
    if i not in clips:
        continue
    d = os.path.join(OUT, i)
    for sub in ('full', 'cut'):
        os.makedirs(os.path.join(d, sub), exist_ok=True)
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', clips[i], '-vf', f'scale=1080:1920:flags=lanczos,{GRADE}',
                    '-r', '30', '-q:v', '2', os.path.join(d, 'full', 'f_%04d.jpg')], check=True)
    n = len([f for f in os.listdir(os.path.join(d, 'full')) if f.endswith('.jpg')])
    if i in mattes:
        # the grade on the colour only; the matte's alpha is kept as it is
        fc = f'[0:v]split[c][a];[c]format=yuv444p,{GRADE},format=rgb24[g];[a]alphaextract[al];[g][al]alphamerge,format=yuva420p[o]'
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', mattes[i], '-filter_complex', fc, '-map', '[o]',
                        '-c:v', 'libwebp', '-lossless', '0', '-quality', '90', '-f', 'image2', os.path.join(d, 'cut', 'f_%04d.webp')],
                       check=True)
    vlib[i] = {'n': n, 'face': r['face'], 'name': r['name']}
    print(i, n, 'frames', '+ cut-out' if i in mattes else '')
with open(os.path.join(OUT, 'lib.js'), 'w') as f:
    f.write('// written by video/lib/vreact_prep.py\nwindow.VLIB = ' + json.dumps(vlib, indent=1) + '\n')
