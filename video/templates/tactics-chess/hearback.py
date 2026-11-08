"""Hear-back on the final mix: every caption against what is heard in its window (accents stripped, numbers in digits
or words, names matched loosely, since whisper spells "Delap" as "de Lappe").
  python3 -P -E hearback.py <plan.js> <mix16.wav>"""
import difflib, json, re, sys, unicodedata
from faster_whisper import WhisperModel
src = open(sys.argv[1]).read()
vo, cut, gap = (float(re.search(rf'"{k}": ([\d.]+)', src).group(1)) for k in ('vo', 'cut', 'gap'))
caps = json.loads(re.search(r'"caps": (\[.*?\]\n \])', src, re.S).group(1))
T = lambda s: s + vo + (gap if s >= cut else 0)
NUM = {'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10', 'nil': '0'}
def toks(s):
    s = unicodedata.normalize('NFKD', re.sub(r'<[^>]+>', '', s)).encode('ascii', 'ignore').decode().lower().replace('%', ' percent')
    out = []
    for w in re.sub(r"[^a-z0-9' ]", ' ', s.replace('-', ' ')).split():
        out.append(NUM.get(w, w))
    return out
m = WhisperModel('medium.en', device='cpu', compute_type='int8')
segs, _ = m.transcribe(sys.argv[2], word_timestamps=True, language='en')
heard = [(w.start, w.end, w.word) for s in segs for w in s.words]
bad = 0
for a, b, html in caps:
    a2, b2 = T(a) - .3, T(b) + .3
    got = sum((toks(w) for s, e, w in heard if e > a2 and s < b2), [])
    want = [w for w in toks(html) if w != 'percent']
    ok = sum(1 for w in want if w in got or any(difflib.SequenceMatcher(None, w, g).ratio() >= .6 for g in got))
    r = ok / max(1, len(want)); flag = r < .7; bad += flag
    print(('CHECK ' if flag else 'ok    ') + f'{T(a):6.2f} {int(r * 100):3d}%  ' + re.sub(r'<[^>]+>', '', html) + (f'   heard: {" ".join(got)}' if flag else ''))
print(len(caps), 'captions,', bad, 'to check')
