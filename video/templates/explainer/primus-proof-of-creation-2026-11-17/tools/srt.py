# Subtitles from the page's own captions (timing.js) and word times (words.js), the same times the page shows them.
#   python3 -I srt.py <page dir> <out.srt>
import json, re, sys
d, out = sys.argv[1], sys.argv[2]
W = json.loads(open(d + '/words.js').read().split('=', 1)[1].strip().rstrip(';'))
TM = json.loads(open(d + '/timing.js').read().split('=', 1)[1].strip().rstrip(';'))
T = lambda s: s + TM['lead'] + (TM['gap'] if s >= TM['cut'] else 0)
ws, we = (lambda i: T(W[i][0])), (lambda i: T(W[i][1]))
C = TM['caps']; last = we(len(W) - 1)
fmt = lambda t: '%02d:%02d:%02d,%03d' % (t // 3600, t % 3600 // 60, t % 60, round(t % 1 * 1000) % 1000)
lines = []
for k, (a, b, h) in enumerate(C):
    t0 = ws(a) - .08; t1 = min(we(b) + .45, ws(C[k + 1][0]) - .08 if k + 1 < len(C) else last + .4)
    lines.append(f"{k + 1}\n{fmt(t0)} --> {fmt(t1)}\n{re.sub('<[^>]+>', '', h)}\n")
open(out, 'w').write('\n'.join(lines)); print(len(lines), 'captions ->', out)
