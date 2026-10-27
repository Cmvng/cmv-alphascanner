"""Edit plan for the owner's Primus Labs recording, "Proof of Nomad Life" (27 Oct 2026).
python3 -I plan.py <work dir>  ->  <work dir>/plan.json and data.js
The kept stretches are cut at the quietest point near each chosen edge; pauses over 0.4 s inside them are closed up.
Cards and captions are timed to source word times (distil-large-v3), then mapped to output time."""
import json, sys, subprocess
import numpy as np
K = sys.argv[1]
P = [(p['s'], p['e']) for p in json.load(open(f'{K}/phrases.json'))]

# kept stretches (source seconds). Dropped: "Yeah, so" (0.0), "So basically that's actually all for now" (68.6),
# "I didn't really verify TikTok… I've actually verified anyways" (79.0-85.5, said again more clearly at 85.8),
# "which is for the, for the agentic task" (95.8, a false start), "Basically, that is all for now. Basically, like" (104),
# "So, yeah." (120)
KEEP = [(0.60, 68.70), (70.80, 79.00), (85.74, 95.70), (99.21, 103.69), (106.79, 119.91)]
PRE, POST, MAXGAP = 0.12, 0.16, 0.4

x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{K}/src_df3.wav', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                                 capture_output=True, check=True).stdout, np.float32)
def db(t, w=0.02):
    a, b = int((t - w / 2) * 16000), int((t + w / 2) * 16000)
    seg = x[max(0, a):max(a + 1, b)]
    return 20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)
def quiet(t, r=0.12):
    """the quietest 20 ms point within r of t"""
    c = np.arange(t - r, t + r + 1e-6, 0.005)
    return float(c[int(np.argmin([db(v) for v in c]))])

pieces = []
for a, b in KEEP:
    a, b = quiet(a, 0.04), quiet(b, 0.04)
    ph = [(max(s, a), min(e, b)) for s, e in P if e > a and s < b]
    if not ph: continue
    runs = [list(ph[0])]
    for s, e in ph[1:]:
        if s - runs[-1][1] <= MAXGAP: runs[-1][1] = e
        else: runs.append([s, e])
    for k, (s, e) in enumerate(runs):
        lo = a if k == 0 else (runs[k - 1][1] + s) / 2
        hi = b if k == len(runs) - 1 else (e + runs[k + 1][0]) / 2
        s2 = a if k == 0 else max(lo, s - PRE)
        e2 = b if k == len(runs) - 1 else min(hi, e + POST)
        pieces.append({'s': round(round(s2 * 30) / 30, 4), 'e': round(round(e2 * 30) / 30, 4)})
o = 0.0
for p in pieces:
    p['o'] = round(o, 3); o += p['e'] - p['s']
END = o
def T(t):
    """source seconds -> output seconds (clamped into the nearest kept piece)"""
    best = None
    for p in pieces:
        if p['s'] <= t <= p['e']: return round(p['o'] + t - p['s'], 3)
        d = min(abs(t - p['s']), abs(t - p['e']))
        if best is None or d < best[0]: best = (d, p['o'] + (0 if abs(t - p['s']) < abs(t - p['e']) else p['e'] - p['s']))
    return round(best[1], 3)

# full-screen graphics (source-time spans); everything else is the camera with cards in the empty top third
SPANS = [('title', 9.12, 13.15), ('weeks', 106.79, 112.35)]
spans = [{'id': k, 'o0': T(a), 'o1': T(b)} for k, a, b in SPANS]

E = {  # source seconds
 'hook': 0.45, 'h_primus': 2.2, 'h_new': 8.0,
 't_in': 9.16, 't_proof': 10.52, 't_ara': 11.9,
 'n_in': 13.2, 'n_discord': 14.66, 'n_tz': 17.2, 'n_github': 19.36, 'n_linkedin': 23.86, 'n_loc': 24.3, 'n_out': 26.9,
 'p_in': 27.1, 'p_90': 28.96, 'p_rec': 32.44, 'p_out': 33.4,
 'l_in': 33.7, 'l_fomo': 36.9, 'l_hl': 38.0, 'l_pm': 41.56, 'l_out': 43.2,
 'a_in': 43.48, 'a_openai': 47.22, 'a_claude': 51.4, 'a_grok': 54.0, 'a_out': 54.3,
 'r_in': 54.6, 'r_none': 57.86, 'r_okx': 63.18, 'r_rabby': 64.84, 'r_out': 68.45,
 'f_in': 70.8, 'f_x': 73.68, 'f_gh': 74.64, 'f_out': 75.3,
 'i_in': 76.34, 'i_x': 78.16, 'i_tt': 86.38, 'i_sp': 87.04, 'i_nv': 88.46, 'i_g': 90.64, 'i_lu': 91.78, 'i_out': 94.2,
 'g_in': 94.58, 'g_bn': 99.92, 'g_okx': 100.62, 'g_by': 101.14, 'g_bg': 101.66, 'g_none': 102.3, 'g_out': 103.69,
 'w_in': 106.79, 'w_check': 110.88,
 'gas_in': 112.5, 'gas_1': 115.64, 'gas_2': 117.1, 'gas_meh': 119.14,
}
ev = {k: T(v) for k, v in E.items()}

CAP = [  # (source start, text); *word* is drawn in the brand colour; each runs to the next start or its piece's end
 (0.60, "Today, I'm checking out *Primus Labs*"), (3.12, "and checking out what's currently going on."),
 (6.66, 'And I see they added something *new*.'), (9.16, 'They added a category called'),
 (10.50, '*Proof of Nomad Life*.'), (13.30, 'You can connect your *Discord*'), (15.08, 'to verify your active time zone.'),
 (18.76, 'You can connect your *GitHub*'), (20.30, 'on Proof of Nomad Life.'),
 (22.80, 'You can connect your *LinkedIn*'), (24.90, 'also on Proof of Nomad Life.'),
 (27.10, 'So currently, I have *90 points*,'), (30.00, 'verified *nine records*.'),
 (33.70, 'On Proof of PnL, I only verified *fomo*.'), (37.58, "I don't use Hyperliquid,"),
 (38.60, "and I don't want to verify my Polymarket account on this."),
 (43.48, 'On Proof of AI Affinity,'), (46.30, 'I verified my *OpenAI*, the one I use.'),
 (50.64, "If Claude was available, I'd verify it,"), (53.72, 'or Grok.'),
 (54.58, 'On Proof of Trade,'), (57.48, "I don't have any exchange on my laptop."),
 (59.34, "I don't use a regular exchange."), (62.02, 'I use *OKX Wallet* or *Rabby*.'),
 (67.50, "I don't really use this. So,"),
 (70.80, "I've done my Platform Activities:"), (72.82, 'verified my *X* account and my *GitHub*.'),
 (76.34, 'For the identity,'), (77.62, "I've verified my *X* account."),
 (85.74, "I've not verified my TikTok or Spotify."), (88.12, "I don't use Naver."),
 (90.00, "I've verified my *Google*."), (91.42, "I don't use Luma."),
 (94.44, 'And for the agentic task,'), (99.21, 'which involves Binance, OKX, Bybit and Bitget,'),
 (102.08, "I've not verified any of them."),
 (107.00, "It's a *new task* that just showed up on Primus,"), (110.60, 'so you need to check it out and verify.'),
 (112.78, 'And gas is very cheap:'), (114.80, 'about *$0.10* or *$0.20* per task.'), (118.86, "So it's not really much."),
]
caps = []
for i, (t, txt) in enumerate(CAP):
    t1 = CAP[i + 1][0] if i + 1 < len(CAP) else 120.0
    o0, o1 = T(t), T(t1)          # a cut maps both sides of a dropped stretch to the same output time
    if o1 - o0 < 0.25: o1 = o0 + 0.6
    caps.append({'o0': o0, 'o1': round(min(o1, END), 3), 't': txt})

edges = []
for p in pieces:
    edges += [(p['s'], round(db(p['s']), 1)), (p['e'], round(db(p['e']), 1))]
loud = [e for e in edges if e[1] > -45]
plan = {'pieces': pieces, 'spans': spans, 'ev': ev, 'caps': caps, 'end': round(END, 3), 'endcard': 3.2}
json.dump(plan, open(f'{K}/plan.json', 'w'), indent=1)
open(f'{K}/data.js', 'w').write('window.PLAN = ' + json.dumps(plan) + ';\n')
print(f'{len(pieces)} pieces, {END:.2f} s (+ {plan["endcard"]} s end card)')
print('edges over -45 dB:', loud if loud else 'none')
