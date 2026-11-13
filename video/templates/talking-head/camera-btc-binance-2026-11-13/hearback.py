"""Hear-back of the finished edit (from the Cournot edit, with this video's names: Bybit, Binance, USDC, USDT, Nvidia): transcribe final16.wav (from review.py) and check every caption against what is
heard in its time window. Flags a caption when under 60% of its words are heard (a clipped word at a cut, a caption
on the wrong line). Names the model mishears are listed in ALIASES.
  python3 -P -E hearback.py <work dir>"""
import json, re, sys
from faster_whisper import WhisperModel
K = sys.argv[1]
plan = json.load(open(f'{K}/plan.json'))
ALIASES = {'bybit': ['bybit', 'buy', 'bit', 'beats', 'by', 'bits', 'buybit', 'biobits'], 'hacked': ['hacked', 'act', 'hack', 'hacks'], 'hack': ['hack', 'arc', 'act', 'hacked'],
           'binance': ['binance', 'finance'], 'usdc': ['usdc', 'uadc'], 'usdt': ['usdt', 'uadt'], 'nvidia': ['nvidia', 'invidia'], 'midterms': ['midterms', 'midterm'],
           'bitcoin': ['bitcoin', 'bitch', 'bitcoins'], 'tl': ['tl', 'tail', 'teal', 'table'], 'rate': ['rate', 'break'], 'hikes': ['hikes', 'heights', 'ice'],
           '25': ['25', 'twenty'], '49': ['49', 'forty', 'nine', 'tonight'], '45': ['45', 'forty'], '50': ['50', 'fifty'], '000': ['000', 'thousand'], '70': ['70', 'seventy'],
           'okay': ['okay', 'ok'], 'refilled': ['refilled', 'refill', 'filled'], 'dumped': ['dumped', 'dump', 'don\'t'], 'about': ['about', 'matter'], 'region': ['region', 'image'],
           'bearish': ['bearish', 'peerish', 'barish'], '2025': ['2025', '25', 'wins', 'win']}
norm = lambda s: re.sub(r"[^a-z0-9' ]", ' ', s.lower().replace('*', '')).split()
m = WhisperModel('small.en', device='cpu', compute_type='int8')
segs, _ = m.transcribe(f'{K}/final16.wav', word_timestamps=True, vad_filter=False)
heard = [(w.start, w.end, w.word) for s in segs for w in s.words]
bad = 0
for c in plan['caps']:
    got = set(w for a, b, x in heard if b > c['o0'] - .25 and a < c['o1'] + .25 for w in norm(x))
    want = [w for w in norm(c['t']) if len(w) > 2 or w.isdigit()]
    if not want:
        continue
    ok = sum(1 for w in want if w in got or any(a in got for a in ALIASES.get(w, [])))
    r = ok / len(want)
    flag = r < .6
    bad += flag
    print(f"{'CHECK' if flag else 'ok   '} {c['o0']:6.2f}-{c['o1']:6.2f} {r:4.0%}  {c['t'].replace('*', '')}" + (f"   heard: {' '.join(sorted(got))}" if flag else ''))
print(f'{len(plan["caps"])} captions, {bad} to check by ear')
