"""Subtitles for the Gambit video from the page's own caption list (gb.html CAPS) and the word times (timing.js).
   python3 -I srt_gb.py <gb.html> <timing.js> <out.srt>"""
import json, re, sys
page, timing, out = sys.argv[1:4]
W = json.loads(open(timing).read().split('=', 1)[1].rstrip().rstrip(';'))
src = open(page).read()
block = src[src.index('const CAPS = ['):src.index('const CAP = ')]
caps = [(int(a), int(b), re.sub(r'<[^>]+>', '', h).replace('’', "'")) for a, b, h in re.findall(r"\[(\d+), (\d+), '((?:[^'\\]|\\.)*)'\]", block)]
ts = lambda x: f'{int(x // 3600):02d}:{int(x // 60 % 60):02d}:{int(x % 60):02d},{int(round(x % 1 * 1000)) % 1000:03d}'
with open(out, 'w') as f:
    for i, (a, b, h) in enumerate(caps):
        t0, t1 = W[a]['s'] - .08, W[b]['e'] + .3
        if i + 1 < len(caps): t1 = min(t1, W[caps[i + 1][0]]['s'] - .1)
        f.write(f'{i + 1}\n{ts(t0)} --> {ts(t1)}\n{h}\n\n')
print(len(caps), 'cues')
