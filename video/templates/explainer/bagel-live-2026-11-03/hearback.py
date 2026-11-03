"""Hear-back on the final mix: every caption against what is heard in its window. python3 -P -E hearback.py <plan.json> <mix16.wav>"""
import json, re, sys
from faster_whisper import WhisperModel
p = json.load(open(sys.argv[1])); VO, CUT, GAP = p['vo'], p['cut'], p['gap']
T = lambda s: s + VO + (GAP if s >= CUT else 0)
m = WhisperModel('medium.en', device='cpu', compute_type='int8')
segs, _ = m.transcribe(sys.argv[2], word_timestamps=True, language='en')
heard = [(w.start, w.end, w.word) for s in segs for w in s.words]
norm = lambda s: re.sub(r"[^a-z0-9' ]", ' ', s.lower().replace('*', '').replace('%', ' percent').replace('$', ' ').replace('¢', ' cents')).split()
ALIAS = {'polymarket': ['polymarket', "polymarket's", 'poly', 'market'], "polymarket's": ['polymarket', "polymarket's", 'poly'], 'ahh': ['ah', 'ahh', 'oh', 'uh'],
         '48': ['48', 'forty'], '1': ['1', 'one'], '9': ['9', 'nine'], '45': ['45'], '20': ['20', 'twenty'], '70': ['70', 'seventy'], '14': ['14'], '4': ['4', 'four'],
         '0': ['0', 'zero'], '5': ['5', 'five'], 'ok': ['ok', 'okay'], 'zero': ['zero', '0']}
bad = 0
for a, b, txt in p['caps']:
    a2, b2 = T(a) - .25, T(b) + .25
    got = [norm(w)[0] if norm(w) else '' for s, e, w in heard if e > a2 and s < b2]
    want = [w for w in norm(txt) if w not in ('cents', 'percent')]
    hit = sum(1 for w in want if any(g == w or g in ALIAS.get(w, []) for g in got))
    r = hit / max(1, len(want))
    flag = r < .6; bad += flag
    print(('CHECK ' if flag else 'ok    ') + f'{T(a):6.2f} {int(r * 100):3d}%  {txt.replace("*", "")}' + (f'   heard: {" ".join(got)}' if flag else ''))
print(len(p['caps']), 'captions,', bad, 'to check')
