"""Hear-back of the finished edit (from the Cournot edit, with this video's names: the coins, launchpads, vamp, cabals): transcribe final16.wav (from review.py) and check every caption against what is
heard in its time window. Flags a caption when under 60% of its words are heard (a clipped word at a cut, a caption
on the wrong line). Names the model mishears are listed in ALIASES.
  python3 -P -E hearback.py <work dir>"""
import json, re, sys
from faster_whisper import WhisperModel
K = sys.argv[1]
plan = json.load(open(f'{K}/plan.json'))
ALIASES = {'peanut': ['peanut', 'peanuts', 'penut'], 'pepe': ['pepe', 'pepi', 'peppy', 'pepper', 'pay'], 'billy': ['billy', 'billie', 'bili'], 'retardio': ['retardio', 'retardo', 'ritardio', 'radio', 'tardio'],
           'bonk': ['bonk', 'bunk', 'bank', 'bong'], 'wif': ['wif', 'with', 'whiff', 'weave', 'wiff', 'if'], 'popcat': ['popcat', 'pop', 'cat', 'pocket'], 'nub': ['nub', 'knob', 'nob', 'numb', 'nab'],
           'launchpads': ['launchpads', 'launchpad', 'launch', 'pads', 'pad'], 'launchpad': ['launchpad', 'launchpads', 'launch', 'pad'], 'vamp': ['vamp', 'vamps', 'vam', 'van', 'bump', 'vampire'],
           'cabal': ['cabal', 'kabal', 'cabals', 'cable', 'couple'], 'cabals': ['cabals', 'cabal', 'cables', 'couples'], 'meme': ['meme', 'memes', 'mem', 'mean', 'memcoins', 'memcoin'], 'memes': ['memes', 'meme', 'means'], 'coins': ['coins', 'memcoins'], 'coin': ['coin', 'memcoin', 'memcoins'],
           'zero': ['zero', '0'], '100': ['100', '100m', 'hundred'], '200': ['200', '200m'], '300': ['300', '300m'], 'burn': ['burn', 'bond', 'born'], 'peace': ['peace', 'piece'],
           'altcoins': ['altcoins', 'altcoin', 'alt', 'coins', 'outcoins'], 'elon': ['elon', 'alone', 'elan', 'ilan'], 'musk': ['musk', 'mosque', 'mask', 'must'], 'solana': ['solana', 'salana', 'sol'],
           'oversaturated': ['oversaturated', 'saturated', 'over'], 'okay': ['okay', 'ok'], '2x': ['2x', 'two', '2', 'x'], '3x': ['3x', 'three', '3', 'x'], '50': ['50', 'fifty'],
           '2023': ['2023', '2020', '23', 'three'], '2024': ['2024', '2020', '24', 'four'], 'bundles': ['bundles', 'bundle', 'bundlers', 'bundler']}
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
