"""Edit plan for the owner's Kane / Ballon d'Or recording (23 Oct 2026).
python3 -I plan.py <kane dir>  ->  <kane dir>/plan.json
Pieces are whole phrases (cut only at silences); visuals, cards and captions are timed to source word times."""
import json, sys, subprocess
import numpy as np
K = sys.argv[1]
P = json.load(open(f'{K}/phrases.json'))
P = [(p['s'], p['e']) for p in P] if isinstance(P[0], dict) else [(p[0], p[1]) for p in P]

# groups of phrases kept, in order; dropped: 7 "Like,", 12-15 ("weighing both seasons...", to fit 2:20), 17 "31 goals,"
# (self-correction), 20 (Super Cup, rambly; still in the ledger), 50 "away from France" (not strictly true),
# 54-55 (repeat of "no-brainer")
GROUPS = [[0], [1, 2, 3, 4, 5, 6], [8, 9, 10, 11], [16], [18, 19, 21, 22, 23, 24, 25, 26],
          [27], [28, 29, 30, 31], [32, 33, 34, 35], [36, 37, 38], [39, 40, 41, 42], [43, 44, 45], [46, 47, 48, 49],
          [51, 52, 53], [56, 57, 58, 59, 60, 61, 62, 63]]
PRE, POST, MAXGAP = 0.12, 0.16, 0.4

x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{K}/src_df3.wav', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                                 capture_output=True, check=True).stdout, np.float32)
def db(t, w=0.02):
    a, b = int((t - w / 2) * 16000), int((t + w / 2) * 16000)
    seg = x[max(0, a):max(a + 1, b)]
    return 20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)

allp = sorted(P)
def prev_end(i): return P[i - 1][1] if i > 0 else 0.0
def next_start(i): return P[i + 1][0] if i + 1 < len(P) else P[i][1] + 1

pieces = []
for gi, g in enumerate(GROUPS):
    start = g[0]
    for k, i in enumerate(g):
        last = k == len(g) - 1
        if not last and P[g[k + 1]][0] - P[i][1] <= MAXGAP and g[k + 1] == i + 1:
            continue
        a = max(P[start][0] - PRE, (prev_end(start) + P[start][0]) / 2)
        b = min(P[i][1] + POST, (P[i][1] + next_start(i)) / 2)
        pieces.append({'s': round(a, 3), 'e': round(b, 3), 'g': gi})
        if not last: start = g[k + 1]
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

# punch-in alternates on every camera cut
z = 0
for i, p in enumerate(pieces):
    p['zoom'] = 1.0 if z % 2 == 0 else 1.07; z += 1

# full-screen graphics (source-time spans); everything else is the camera
SPANS = [('market', 4.0, 26.70), ('ledger', 68.55, 75.97), ('pitch', 81.0, 90.80), ('ceremony', 128.55, 137.70)]
spans = [{'id': k, 'o0': T(a), 'o1': T(b)} for k, a, b in SPANS]

# timed events (source seconds), used by the page
E = {
 'title': 0.0,
 'mk_kane': 4.3, 'mk_77': 6.34, 'mk_yamal': 10.58, 'mk_mbappe': 12.14, 'mk_messi': 14.38,
 'ch_in': 17.84, 'ch_draw': 18.4, 'ch_level': 23.0, 'ch_today': 25.3,
 'c_bund': 40.12, 'c_bund_g': 43.42, 'c_bund_m': 44.58, 'c_bund_a': 45.72,
 'c_ucl': 47.06, 'c_ucl_g': 48.82, 'c_ucl_m': 49.68, 'c_ucl_a': 50.50,
 'c_pok': 57.82, 'c_pok_g': 59.08, 'c_pok_m': 61.62, 'c_pok_x': 61.9,
 'c_eng': 63.02, 'c_eng_g': 66.76, 'c_eng_m': 67.68, 'c_eng_x': 68.06,
 'lg_in': 68.62, 'lg_73': 70.76, 'lg_65': 72.24, 'lg_x': 73.30,
 'cmp_in': 76.17, 'cmp_yamal': 76.78, 'cmp_mbappe': 77.94, 'cmp_kane': 79.50, 'cmp_out': 81.14,
 'pt_pass': 82.00, 'pt_assist': 84.14, 'pt_score': 85.60, 'pt_def': 88.18, 'pt_mid': 89.02, 'pt_att': 90.00,
 'mb_in': 91.26, 'mb_team': 95.52, 'mb_country': 96.74, 'mb_out': 99.4,
 'ya_in': 100.06, 'ya_country': 101.34, 'ya_team': 102.40, 'ya_ball': 104.04, 'ya_liga': 110.16, 'ya_out': 110.9,
 'hk_in': 111.38, 'hk_bund': 117.36, 'hk_best': 119.64, 'hk_out': 121.1,
 'm2_in': 123.06, 'm2_out': 128.5,
 'cr_in': 128.79, 'cr_day': 130.28, 'cr_london': 136.66,
 'v_in': 154.36, 'end': 165.44,
}
ev = {k: T(v) for k, v in E.items()}

CAP = [  # (source start, text); each runs to the next start or its piece's end
 (0.00, 'Harry Kane is currently leading'), (1.48, "the forefront to win the Ballon d'Or."), (4.0, None),
 (37.20, 'And here is why:'), (37.84, 'he had a very remarkable season.'), (39.82, 'In the Bundesliga, he actually had'),
 (43.42, '36 goals in 31 games, and 5 assists.'), (46.84, 'In the Champions League,'),
 (48.24, '14 goals in 13 games, and 2 assists.'), (51.30, None),
 (57.28, 'In the German Cup, he has 10 goals'), (60.50, 'from six games.'),
 (63.02, 'For England, at national team level,'), (65.74, 'he has 12 goals in 14 matches.'), (68.55, None),
 (76.17, 'the likes of Lamine Yamal,'), (77.62, 'the likes of Kylian Mbappé,'), (78.60, "he's a more rounded player this season."),
 (81.0, None),
 (91.05, 'Compared to Kylian,'), (92.56, 'he had a good season,'), (94.54, 'but his team and country'),
 (96.74, 'did not win anything this past year.'),
 (99.86, 'Lamine Yamal was actually good.'), (101.14, 'His country actually won,'), (102.10, 'and his team actually won,'),
 (103.10, 'but he was not the best player for his country.'), (105.88, None),
 (107.08, 'You can say he was the best player for his team,'), (109.44, 'but he won LaLiga.'),
 (111.15, 'Then we also evaluate Harry Kane,'), (113.28, 'that also won the Bundesliga,'),
 (117.86, 'and is one of the best players in his team.'),
 (121.27, 'So I actually believe that at 77%,'), (124.48, "it's a very big steal."), (125.96, "It's the obvious winner."),
 (128.38, None),
 (140.84, 'I just feel like this is'), (143.66, 'a no-brainer market.'),
 (149.07, "But let's see how it goes."), (149.88, "There's a couple of days"), (151.94, 'to see who actually wins this,'),
 (154.24, "but I'm leaning on Harry Kane."), (155.34, 'Previously, I was leaning on Kylian Mbappé,'),
 (157.84, 'but looking at the stats,'), (159.10, 'looking at the way Harry Kane'), (161.46, 'has played this season,'),
 (162.50, 'he deserves to win this time around.'),
]
caps = []
for i, (t, txt) in enumerate(CAP):
    t1 = CAP[i + 1][0] if i + 1 < len(CAP) else 166
    if not txt: continue
    o0, o1 = T(t), T(t1)          # a cut maps both sides of a dropped stretch to the same output time
    if o1 - o0 < 0.25: o1 = o0 + 0.6
    caps.append({'o0': o0, 'o1': round(o1, 3), 't': txt})

edges = []
for p in pieces:
    edges += [(p['s'], round(db(p['s']), 1)), (p['e'], round(db(p['e']), 1))]
loud = [e for e in edges if e[1] > -45]
json.dump({'pieces': pieces, 'spans': spans, 'ev': ev, 'caps': caps, 'end': round(END, 3), 'endcard': 3.0}, open(f'{K}/plan.json', 'w'), indent=1)
print(f'{len(pieces)} pieces, {END:.2f} s + 3.0 s end card = {END + 3:.2f} s')
print('loud edges:', loud)
for p in pieces: print(f"  {p['s']:7.2f}-{p['e']:7.2f} -> {p['o']:7.2f}  g{p['g']} z{p['zoom']}")
