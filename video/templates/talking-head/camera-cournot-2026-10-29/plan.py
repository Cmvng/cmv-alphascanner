"""Edit plan for the owner's recording about Primus Labs and Cournot (29 Oct 2026): a full-frame 1080x1920 selfie, 1:57.
python3 -I plan.py <work dir>  ->  <work dir>/plan.json and data.js here
Kept stretches are source spans in OUTPUT order (the hook, "a prediction market is only as good as the way it decides
who won", is moved to the front). Each edge is cut at the quietest point near it; pauses over 0.4 s inside are closed up.
Captions are the owner's words (light filler trims), chunked with |, timed by aligning to the medium.en word times.
Cut out: the two lines that name Kaito (24.0-29.0 and 103.0-107.5) and a repeated "number one" ramble (40.1-48.8)."""
import difflib, json, os, re, subprocess, sys
import numpy as np
K = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
words = json.load(open(f'{K}/words_med.json'))
P = [(p['s'], p['e']) for p in json.load(open(f'{K}/phrases.json'))]
x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{K}/src_df3.wav', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                                 capture_output=True, check=True).stdout, np.float32)
def db(t, w=0.02):
    a, b = int((t - w / 2) * 16000), int((t + w / 2) * 16000)
    seg = x[max(0, a):max(a + 1, b)]
    return 20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)
def quiet(t, r=0.04):
    c = np.arange(t - r, t + r + 1e-6, 0.005)
    return float(c[int(np.argmin([db(v) for v in c]))])

KEEP = [  # (id, source start, source end, caption chunks)
    ('hook', 32.63, 36.70, 'A prediction market is only as good|as the way it decides *who won*.'),
    ('intro', 0.10, 8.85, 'So today I\'m talking about *Primus Labs*|and its partnership with an AI oracle|called *Cournot*.'),
    ('zk', 9.20, 17.22, 'We all know Primus uses *zkTLS*|to prove data really came from a website|without actually showing you the login.'),
    ('why', 29.40, 32.30, 'So why is he having a partnership|with the prediction markets?'),
    ('part', 37.10, 39.75, 'Primus is actually important to this part.'),
    ('verdict', 49.74, 59.74, 'The AI gives the *verdict*|and every step is actually *recorded*.|Primus is actually there to use this tech|to verify the evidence is correct.'),
    ('count', 60.30, 66.07, 'And evidence without a valid *zkTLS*|does not count.'),
    ('why2', 66.52, 70.33, 'That\'s the fundamental part|why this partnership is very important.'),
    ('audit', 78.30, 99.60, 'After *Cournot* reads the market rules,|collects the evidence and the AI gives a verdict,|*zkTLS* is there to audit and say okay:|is this proof correct?|Is it correct? Is it valid?|If it\'s valid, then okay,|we can actually proceed.'),
    ('nb', 100.15, 102.745, 'So it\'s actually a very *no-brainer* partnership, like I said.'),
    ('end', 107.82, 117.40, 'You need this tech to verify|the information given,|and that\'s what\'s actually going on here.|So good work, and *GG*.'),
]
PRE, POST, MAXGAP = 0.12, 0.16, 0.4
pieces = []
for pid, a, b, _ in KEEP:
    a, b = quiet(a), quiet(b)
    ph = [(max(s, a), min(e, b)) for s, e in P if e > a and s < b]
    runs = [list(ph[0])]
    for s, e in ph[1:]:
        if s - runs[-1][1] <= MAXGAP: runs[-1][1] = e
        else: runs.append([s, e])
    for k, (s, e) in enumerate(runs):
        lo = a if k == 0 else (runs[k - 1][1] + s) / 2
        hi = b if k == len(runs) - 1 else (e + runs[k + 1][0]) / 2
        s2 = a if k == 0 else max(lo, s - PRE)
        e2 = b if k == len(runs) - 1 else min(hi, e + POST)
        pieces.append({'id': pid, 's': round(round(s2 * 30) / 30, 4), 'e': round(round(e2 * 30) / 30, 4)})
o = 0.0
for p in pieces:
    p['o'] = round(o, 3); o += p['e'] - p['s']
END = round(o, 3)

def T(t, pid=None):
    """source seconds -> output seconds (the kept piece that plays it; the nearest edge of one if it was closed up)"""
    best = None
    for p in pieces:
        if pid and p['id'] != pid: continue
        if p['s'] <= t <= p['e']: return round(p['o'] + t - p['s'], 3)
        d = min(abs(t - p['s']), abs(t - p['e']))
        if best is None or d < best[0]: best = (d, p['o'] + (0 if abs(t - p['s']) < abs(t - p['e']) else p['e'] - p['s']))
    return round(best[1], 3)
def W(text, pid, after=0.0):
    """source start of the first word matching text inside a kept stretch (after a source time)"""
    a, b = next((k[1], k[2]) for k in KEEP if k[0] == pid)
    q = re.sub(r'[^a-z0-9]', '', text.lower())
    for w in words:
        if a - .05 <= w['s'] <= b and w['s'] >= after and re.sub(r'[^a-z0-9]', '', w['w'].lower()).startswith(q):
            return w['s']
    raise ValueError(f'{text} not in {pid}')

# captions: each chunk starts at its first matched word
norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
caps = []
for pid, a, b, cap in KEEP:
    ws = [w for w in words if w['e'] > a + .02 and w['s'] < b - .02]
    chunks = cap.split('|'); toks, own = [], []
    for i, c in enumerate(chunks):
        for w in c.replace('*', '').split():
            if norm(w): toks.append(norm(w)); own.append(i)
    sm = difflib.SequenceMatcher(None, toks, [norm(w['w']) for w in ws], autojunk=False)
    first = {}
    for xx, yy, n in sm.get_matching_blocks():
        for k in range(n): first.setdefault(own[xx + k], ws[yy + k]['s'])
    starts = []
    for i in range(len(chunks)):
        s = first.get(i, (starts[-1] + .8) if starts else a)
        starts.append(max(a, min(s, b - .3)))
    starts[0] = a
    for i, c in enumerate(chunks):
        o0 = T(starts[i], pid); o1 = T(starts[i + 1], pid) if i + 1 < len(chunks) else T(b, pid)
        caps.append({'o0': round(o0, 3), 'o1': round(o1, 3), 't': c.strip()})
for i, c in enumerate(caps):
    if i + 1 < len(caps) and caps[i + 1]['o0'] - c['o1'] < .35: c['o1'] = caps[i + 1]['o0']

# beats (output seconds), from the words they land on
ev = {
    'hook_won': T(W('who', 'hook')),
    'i_primus': T(W('primus', 'intro')), 'i_part': T(W('partnership', 'intro')), 'i_cournot': T(W('cournot', 'intro')),
    'zk_in': T(9.20, 'zk'), 'zk_prove': T(W('prove', 'zk')), 'zk_login': T(W('showing', 'zk')),
    'why_in': T(29.40, 'why'), 'part_in': T(37.10, 'part'),
    'v_in': T(49.74, 'verdict'), 'v_rec': T(W('every', 'verdict')), 'v_primus': T(W('primus', 'verdict')), 'v_verify': T(W('verify', 'verdict')),
    'c_in': T(60.30, 'count'), 'c_without': T(W('without', 'count')),
    'w2_in': T(66.52, 'why2'),
    'a_in': T(78.30, 'audit'), 'a_rules': T(W('reads', 'audit')), 'a_evid': T(W('collect', 'audit')), 'a_verdict': T(W('gives', 'audit')),
    'a_zk': T(W('zktls', 'audit')), 'a_proof': T(W('is', 'audit', 90.2)), 'a_valid': T(W('if', 'audit', 95.9)), 'a_out': T(99.60, 'audit'),
    'nb_in': T(100.15, 'nb'), 'e_in': T(107.82, 'end'), 'e_here': T(W('that', 'end')), 'e_gg': T(W('so', 'end', 114.5)),
}
plan = {'pieces': pieces, 'ev': ev, 'caps': caps, 'end': END, 'endcard': 3.6}
json.dump(plan, open(f'{K}/plan.json', 'w'), indent=1)
open(os.path.join(HERE, 'data.js'), 'w').write('window.PLAN = ' + json.dumps(plan) + ';\n')
print(f'{len(pieces)} pieces, {END:.2f} s (+ {plan["endcard"]} s end card)')
loud = [(p['id'], p['s'], round(db(p['s']), 1), p['e'], round(db(p['e']), 1)) for p in pieces if db(p['s']) > -45 or db(p['e']) > -45]
print('edges over -45 dB:', loud if loud else 'none')
for k, v in ev.items(): print(f'  {k:10s} {v:7.2f}')
