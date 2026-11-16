"""Hear-back on the final mix: what is heard under each caption against the words Lara was given for it (caps.json
from caps.py). Digits, %, $ and spelled letters are put in words on both sides, so only a real difference shows.
  python3 -I hearback.py <caps.json> <mix16.wav>"""
import json, re, sys, difflib
from faster_whisper import WhisperModel
caps = json.load(open(sys.argv[1]))
m = WhisperModel('small.en', device='cpu', compute_type='int8')
segs, _ = m.transcribe(sys.argv[2], word_timestamps=True, language='en', beam_size=5, condition_on_previous_text=False)
heard = [(w.start, w.end, w.word.strip()) for s in segs for w in s.words]
ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = 'x x twenty thirty forty fifty sixty seventy eighty ninety'.split()
def say_int(n):
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + ('' if n % 10 == 0 else ONES[n % 10])
    if n < 1000: return ONES[n // 100] + 'hundred' + ('' if n % 100 == 0 else say_int(n % 100))
    if n < 10 ** 6: return say_int(n // 1000) + 'thousand' + ('' if n % 1000 == 0 else say_int(n % 1000))
    return str(n)
def say_num(tok):
    tok = tok.replace(',', '')
    if '.' in tok:
        a, b = tok.split('.', 1); return say_int(int(a or 0)) + 'point' + ''.join(ONES[int(d)] for d in b)
    return say_int(int(tok))
def flat(s):
    s = s.lower().replace('-', ' ')
    s = re.sub(r'\$(\d[\d,]*(?:\.\d+)?)(k?)', lambda m: m.group(1) + (' thousand' if m.group(2) else '') + ' dollars', s)
    s = s.replace('%', ' percent ')
    s = re.sub(r'\d[\d,]*(?:\.\d+)?', lambda m: ' ' + say_num(m.group(0)) + ' ', s)
    return re.sub(r'[^a-z]', '', s.replace('by the way', 'btw'))
bad = 0
for c in caps:
    got = ' '.join(w for s, e, w in heard if e > c['t0'] - .15 and s < c['t1'] + .15)
    got = re.sub(r' ([.,]\d)', r'\1', got)                                        # '1 .0046', '$89 ,000' as one number
    r = difflib.SequenceMatcher(None, flat(c['spoken']), flat(got), autojunk=False).ratio()
    flag = r < .8; bad += flag
    print(('CHECK ' if flag else 'ok    ') + f"{c['t0']:6.2f} {int(r * 100):3d}%  {c['spoken']}" + (f"\n{'':18s}heard: {got}" if flag else ''))
print(len(caps), 'captions,', bad, 'to check')
