"""The caption lines of an .ass file as an .srt, in sentence case as spoken.  python3 -I ass2srt.py <in.ass> <phrases.txt> <out.srt>"""
import sys
src, ph, out = sys.argv[1:4]
def t(s): h, m, ss = s.split(':'); return int(h) * 3600 + int(m) * 60 + float(ss)
def f(x): ms = round(x * 1000); return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'
lines = [l.strip() for l in open(ph, encoding='utf8') if l.strip()]
caps = [L.split(',') for L in open(src, encoding='utf8') if L.startswith('Dialogue: 0')]
assert len(caps) == len(lines), (len(caps), len(lines))
open(out, 'w', encoding='utf8').write(''.join(f'{i + 1}\n{f(t(c[1]))} --> {f(t(c[2]))}\n{l}\n\n' for i, (c, l) in enumerate(zip(caps, lines))))
print(out, len(lines))
