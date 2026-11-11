"""Each caption word's time in the finished video, for word-by-word captions (talk.html).
  python3 -I tokens.py <work dir>     reads plan.json, writes tok.js (window.TOK = one list of times per caption)

A caption's text is tidied ("groundnuts" for "ground nuts", "Primus Labs" for "the Primus Tech Lab"), so its words do
not always match the spoken words one to one. This lines the caption's words up with the spoken ones (difflib), gives
each caption word the time of the spoken word it stands for, and prints every caption where the two differ, so the
mapping can be read by eye. A caption word must light up on its own sound: a guess here is what "not aligned" means."""
import json, re, sys, difflib
K = sys.argv[1]
plan = json.load(open(f'{K}/plan.json'))
norm = lambda s: re.sub(r"[^a-z0-9]", '', s.lower().replace('à', 'a'))
out = []
for c in plan['caps']:
    toks = c['t'].replace('*', '').split(' ')
    ws = [w for w in plan['words'][c['a']:c['b'] + 1] if w.get('s') is not None and c['o0'] - .3 <= w['s'] <= c['o1'] + .3]
    A, B = [norm(x) for x in toks], [norm(w['w']) for w in ws]
    tt = [None] * len(toks)
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, A, B, autojunk=False).get_opcodes():
        if tag == 'equal':
            for k in range(i2 - i1): tt[i1 + k] = ws[j1 + k]['s']
        elif tag == 'replace':
            for k in range(i2 - i1): tt[i1 + k] = ws[j1 + (k * (j2 - j1)) // (i2 - i1)]['s']
    # a caption word with no spoken word of its own sits between its neighbours
    known = [(i, t) for i, t in enumerate(tt) if t is not None]
    for i in range(len(tt)):
        if tt[i] is None:
            before = [x for x in known if x[0] < i]; after = [x for x in known if x[0] > i]
            a = before[-1] if before else (-1, c['o0']); b = after[0] if after else (len(tt), c['o1'] - .1)
            tt[i] = a[1] + (b[1] - a[1]) * (i - a[0]) / (b[0] - a[0])
    for i in range(1, len(tt)): tt[i] = max(tt[i], tt[i - 1] + .02)
    out.append([round(t, 3) for t in tt])
    if A != B:
        print(f"{c['o0']:6.2f}  " + '  '.join(f'{w}@{t:.2f}' for w, t in zip(toks, tt)) + '\n        spoken: ' + ' '.join(f"{w['w']}@{w['s']:.2f}" for w in ws))
open(f'{K}/tok.js', 'w').write('window.TOK = ' + json.dumps(out) + '\n')
print(f'{len(out)} captions; tok.js written')
