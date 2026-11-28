"""Hear-back: transcribe the finished file's sound and check each caption's words are heard in its window."""
import json, re, sys
from faster_whisper import WhisperModel
K, WAV = sys.argv[1:3]
plan = json.load(open(f'{K}/plan.json'))
m = WhisperModel('medium.en', device='cpu', compute_type='int8')
segs, _ = m.transcribe(WAV, language='en', word_timestamps=True, beam_size=5)
H = [(w.start, w.end, re.sub(r'[^a-z0-9]', '', w.word.lower())) for s in segs for w in s.words]
norm = lambda x: re.sub(r'[^a-z0-9]', '', x.lower())
bad = 0
for i, c in enumerate(plan['caps']):
    want = [norm(t) for t in c['t'].replace('*', '').split() if norm(t) and not re.search(r'\d', t)]
    heard = {h for a, b, h in H if a >= c['o0'] - .4 and b <= c['o1'] + .4}
    if not want: continue
    got = sum(1 for w in want if w in heard) / len(want)
    if got < .6: bad += 1; print(f'CHECK {i} {c["o0"]:.2f} {got:.0%} | {c["t"]} | heard: {" ".join(h for a, b, h in H if a >= c["o0"] - .4 and b <= c["o1"] + .4)}')
print(len(plan['caps']), 'captions,', bad, 'to check by ear')
