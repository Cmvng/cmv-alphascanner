"""The reaction-styles reel: seven of the owner's reaction clips, one weekend style each, cut on the bar lines of
"The Farewell" (Mixkit 546, 129.2 bpm), the drop on the cut into the Jaw Drop.
python3 -I plan.py <work dir> <page dir>  ->  <work>/plan.json, <work>/frames.txt, <page>/reel_data.js"""
import json, os, sys
K, P = sys.argv[1:3]
V = '/home/user/cmv-alphascanner/video/out/vreact'
FPS, BAR = 30, 60 / 129.2 * 4
SEGS = [  # (id, reaction, bars, label)
    ('brand', 'waitwhat', 2, 'Brand open'), ('icons', 'jawdrop', 3, 'Icons over the head'), ('flash', 'sob', 2, 'Flashback'),
    ('today', 'grin', 3, 'Data card'), ('rewind', 'sideeye', 3, 'Rewind'), ('bundle', 'yikes', 2, 'Split bar'),
    ('follow', 'lol', 3, 'Orbit + Follow'), ('grid', None, 2, '')]
START = {'waitwhat': 0.4, 'jawdrop': 0.3, 'sob': 0.4, 'grin': 0.3, 'yikes': 0.4, 'lol': 0.2}
segs, frames, b = [], [], 0
for sid, rid, bars, lab in SEGS:
    f0, f1 = round(b * BAR * FPS), round((b + bars) * BAR * FPS); n = f1 - f0; b += bars
    if rid is None: src = [None] * n
    elif rid == 'sideeye':      # forward 1.5-3.3 s, rewind 3.3 -> 1.9 s at 3x, replay from 1.9 s
        fw = list(range(46, 100)); rw = list(range(99, 56, -3)); src = fw + rw + list(range(57, 57 + n - len(fw) - len(rw)))
    else:
        s0 = round(START[rid] * FPS) + 1; src = list(range(s0, s0 + n))
    if rid: assert max(src) <= len(os.listdir(f'{V}/{rid}/full')), (sid, max(src))
    segs.append({'id': sid, 'rx': rid, 'o': round(f0 / FPS, 4), 'n': n, 'label': lab, 'rewind': [len(fw) / FPS, (len(fw) + len(rw)) / FPS] if rid == 'sideeye' else None})
    frames += [(rid, k) for k in src]
END = len(frames) / FPS
json.dump({'segs': segs, 'end': END, 'endcard': 0, 'bar': BAR}, open(f'{K}/plan.json', 'w'), indent=1)
open(f'{K}/frames.txt', 'w').write('\n'.join(f'{r or "-"} {k}' for r, k in frames))
open(f'{P}/reel_data.js', 'w').write('window.REEL = ' + json.dumps({'segs': segs, 'end': END, 'frames': frames, 'V': 'file://' + V + '/'}) + ';\n')
for s in segs: print(f"{s['id']:7s} {s['rx'] or '-':9s} at {s['o']:6.2f}  {s['n']:4d} frames")
print('total', round(END, 3), 's,', len(frames), 'frames')
