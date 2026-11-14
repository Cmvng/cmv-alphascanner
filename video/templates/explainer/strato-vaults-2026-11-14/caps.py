"""The captions as the page shows them (CAP in strato.html: [first word, last word, text]), timed from the take's word
times (words.js) exactly as the page times them, written as caps.json (with the spoken words of each caption, for the
hear-back) and as an .srt.
  python3 -I caps.py <strato.html> <words.js> <script.txt> <out dir> <name>"""
import json, re, sys, html
PAGE, WORDS, SCRIPT, OUT, NAME = sys.argv[1:6]
src = open(PAGE, encoding='utf8').read()
cap_src = src[src.index('const CAP = ['):src.index('.map(([a, b, h]')]
CAP = [(int(a), int(b), t) for a, b, q, t in re.findall(r"\[(\d+), (\d+), (['\"])(.*?)\3\]", cap_src)]
W = json.loads(open(WORDS, encoding='utf8').read().split('=', 1)[1].strip().rstrip(';'))
script = open(SCRIPT, encoding='utf8').read().split()
assert len(script) == len(W), (len(script), len(W))
CUT, GAP, VO = 6.84, 0.6, 0.2
T = lambda s: s + VO + (GAP if s >= CUT else 0)
caps = []
for i, (a, b, h) in enumerate(CAP):
    t0 = T(W[a][0]) - .08
    t1 = min(T(W[b][1]) + .45, T(W[CAP[i + 1][0]][0]) - .08 if i + 1 < len(CAP) else 1e9)
    caps.append({'t0': round(t0, 3), 't1': round(t1, 3), 'text': html.unescape(re.sub(r'<[^>]+>', '', h)), 'a': a, 'b': b, 'spoken': ' '.join(script[a:b + 1])})
# every script word is in exactly one caption, in order
assert caps[0]['a'] == 0 and caps[-1]['b'] == len(script) - 1 and all(caps[i + 1]['a'] == caps[i]['b'] + 1 for i in range(len(caps) - 1))
json.dump(caps, open(f'{OUT}/caps.json', 'w'), indent=1, ensure_ascii=False)
def ts(x):
    ms = int(round(x * 1000)); return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'
with open(f'{OUT}/{NAME}.srt', 'w', encoding='utf8') as f:
    for i, c in enumerate(caps, 1): f.write(f"{i}\n{ts(c['t0'])} --> {ts(c['t1'])}\n{c['text']}\n\n")
for c in caps: print(f"{c['t0']:7.2f}-{c['t1']:7.2f}  {c['text']:58s} | {c['spoken']}")
print(len(caps), 'captions, every script word covered once')
