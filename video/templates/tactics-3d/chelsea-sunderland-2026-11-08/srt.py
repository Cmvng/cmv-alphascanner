"""Subtitles for Sunderland 1-0 Chelsea: the same lines as the on-screen captions (gen.py writes them into plan.js,
with the names spelled right), mapped to video time.
  python3 -I srt.py <page dir>/plan.js <out.srt>"""
import html, json, re, sys
src = open(sys.argv[1], encoding='utf-8').read()
vo, cut, gap = (float(re.search(rf'"{k}": ([\d.]+)', src).group(1)) for k in ('vo', 'cut', 'gap'))
caps = json.loads(re.search(r'"caps": (\[.*?\]\n ?\])', src, re.S).group(1))
T = lambda s: s + vo + (gap if s >= cut else 0)
ts = lambda x: f'{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round(x % 1 * 1000)) % 1000:03d}'
with open(sys.argv[2], 'w', encoding='utf-8') as f:
    for i, (a, b, txt) in enumerate(caps, 1):
        f.write(f"{i}\n{ts(T(a))} --> {ts(T(b))}\n{html.unescape(re.sub(r'<[^>]+>', '', txt))}\n\n")
print(len(caps), 'lines ->', sys.argv[2])
