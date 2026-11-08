"""Subtitles from a chessboard plan: the on-screen captions at video time.   python3 -I srt.py <plan.js> <out.srt>"""
import json, re, sys
src = open(sys.argv[1]).read()
# plan.js holds JS functions (sticker anchors), so read only the fields we need
vo = float(re.search(r'"vo": ([\d.]+)', src).group(1)); cut = float(re.search(r'"cut": ([\d.]+)', src).group(1)); gap = float(re.search(r'"gap": ([\d.]+)', src).group(1))
caps = json.loads(re.search(r'"caps": (\[.*?\]\n \])', src, re.S).group(1))
T = lambda s: s + vo + (gap if s >= cut else 0)
ts = lambda x: f'{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round(x % 1 * 1000)) % 1000:03d}'
with open(sys.argv[2], 'w') as f:
    for i, (a, b, html) in enumerate(caps, 1):
        f.write(f'{i}\n{ts(T(a))} --> {ts(T(b))}\n{re.sub(r"<[^>]+>", "", html)}\n\n')
print(len(caps), 'captions ->', sys.argv[2])
