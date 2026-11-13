"""words_in.json -> words_fixed.json: the recogniser's misheard words fixed by ear-checks (CTC scoring of each choice),
kept close to the SOUND so the aligner can place them. Captions are written separately in plan.py."""
import json, sys
K = sys.argv[1]
W = json.load(open(f'{K}/words_in.json'))
def put(i, old, new):
    assert W[i]['w'].lower().strip('.,?!') == old.lower(), (i, W[i]['w'], old)
    W[i]['w'] = new
def merge(i, j, old, new):            # words i..j become one word
    got = ' '.join(w['w'] for w in W[i:j + 1]).lower()
    assert got == old.lower(), (i, j, got, old)
    W[i] = {'s': W[i]['s'], 'e': W[j]['e'], 'w': new}
    for k in range(i + 1, j + 1): W[k] = None
def split(i, old, a, b):              # one word becomes two
    assert W[i]['w'].lower().strip('.,?!') == old.lower(), (i, W[i]['w'], old)
    s, e = W[i]['s'], W[i]['e']; m = (s + e) / 2
    W[i] = [{'s': s, 'e': m, 'w': a}, {'s': m, 'e': e, 'w': b}]

put(35, 'zoom', 'XO'); put(36, 'markets', 'Market,'); put(37, 'opened', 'open'); put(38, 'ads', 'that,')
put(42, 'kaito', 'Kaito')
put(78, 'save', 'say'); put(205, 'save', 'say')                       # "SER MY MIND" / "SAY MY MIVE"
put(146, 'engine', 'NG')                                              # "CMV engine" is "Cmvng", said C-M-V-N-G
put(237, 'zoom', 'XO'); put(238, 'markets', 'Market,')
for i in (242, 254, 283): put(i, 'limitless', 'Limitless')
merge(263, 264, 'he would', 'he')                                     # "what did he say again"
put(372, 'baccidorial', 'ambassadorial')
merge(423, 424, '$0 .05', '0.05')                                     # said "zero point zero five" ("ZEROPONZEROFIRE")
put(430, 'he', 'in'); put(431, 'thought', 'total')                    # "I think in total I was paid $50" (both re-listens)
merge(454, 457, 'actually got the alert', 'I learnt')                 # "that I learnt the hard way": scores level with the
                                                                      # recogniser's reading, and is the one that makes sense
split(498, 'does', 'is', 'just')                                      # "So this is just me talking"
merge(516, 517, 'odd down', 'down')                                   # "let down or down" (-142 v -180)
out = []
for w in W:
    if w is None: continue
    for x in (w if isinstance(w, list) else [w]):
        if x['e'] - x['s'] > 0.005: out.append(x)                     # zero-length words are dropped (the aligner drops them)
json.dump(out, open(f'{K}/words_fixed.json', 'w'), indent=0)
print(len(out), 'words ->', f'{K}/words_fixed.json')
