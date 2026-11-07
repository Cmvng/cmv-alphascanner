"""Build page/plan.js, page/words.js and the captions for the Bagel picks video from a take's word times.

  python3 -I gen_plan.py <words.json> <page dir> [--cut <take s>]

Every time comes from a phrase looked up in the words (so a new take re-times everything). The how-to plays the owner's
own 29 Oct Bagel recording (page/img/clips/A..H, cut by cut_clips.sh). Two reactions only (clean and simple, owner 7 Nov):
Nervous (shirtless set) on "all four have to win", and The Grin (grey set) on the end card.
"""
import json, re, sys

W = [w for w in json.load(open(sys.argv[1])) if w['e'] - w['s'] > 0.005]
OUT = sys.argv[2]
norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
C, own = '', []
for i, w in enumerate(W):
    n = norm(w['w']); C += n; own += [i] * len(n)


def at(phrase, nth=0, edge='start', after=0.0):
    P = norm(phrase); k = 0
    k0 = next((own.index(i) for i, w in enumerate(W) if w['s'] >= after), 0)
    pos = k0
    while True:
        k = C.find(P, pos)
        if k < 0: raise SystemExit(f'phrase not found: {phrase!r} (nth {nth})')
        a, b = own[k], own[k + len(P) - 1]
        okA = k == 0 or own[k - 1] != a; okB = k + len(P) == len(C) or own[k + len(P)] != b
        if okA and okB:
            if nth == 0: return round(W[a]['s'] if edge == 'start' else W[b]['e'], 3)
            nth -= 1
        pos = k + 1


S = lambda p, **k: at(p, edge='start', **k)
E = lambda p, **k: at(p, edge='end', **k)
cut = float(sys.argv[sys.argv.index('--cut') + 1]) if '--cut' in sys.argv else round((E('shot') + S("If you're new")) / 2, 3)

slip0 = S("Here's my real slip")
f2, t2, a2, m2 = S('Fulham', nth=1), S('Tottenham', nth=1), S('Arsenal', nth=1), S('Manchester City', nth=1)
chain, allw, allw_e, nothing = S('But a combo is a chain'), S('All four have to'), E('have to win'), E('pays nothing')
pay11, new = S('Paying 11'), S("If you're new")
how = {k: S(p) for k, p in [('A', 'Open Bagel'), ('B', 'Search for a team'), ('C', 'and open the match'), ('D', 'Tap the price'),
                            ('E', 'Add every game'), ('F', 'Then tap Buy'), ('G', 'Swipe to place'), ('H', 'and it shows up')]}
stake = S('type your stake')
warn, end0 = S('Only stake'), S('My link')
CLIPS = {'A': (96, 0, 1.0), 'B': (96, 20, 1.2), 'C': (84, 0, 1.2), 'D': (90, 15, 1.0), 'E': (186, 105, 1.0),
         'F': (252, 15, 1.3), 'G': (70, 0, 1.0), 'H': (102, 45, 1.0)}     # frames cut from raw.mp4, start frame, speed
order = list(how)
clips = []
for i, k in enumerate(order):
    n, fr, sp = CLIPS[k]
    clips.append({'id': k, 't0': round(how[k] - 0.15, 3), 'n': n, 'from': fr, 'speed': sp})
    if k == 'F': clips[-1].update(zoom=[235, 360, 1.75], zd=1.2)   # $5 · Max payout $10.1 · 2.02x
    if k == 'G': clips[-1].update(zoom=[235, 150, 1.7], zd=0.05)  # Combo Order Placed
cl = {c['id']: c for c in clips}
src_t = lambda k, f: round(cl[k]['t0'] + (f - cl[k]['from']) / 30 / cl[k]['speed'], 3)   # take time when clip k shows frame f
taps = [
    {'t': src_t('D', 57), 'x': 125, 'y': 648},          # Over 91%
    {'t': round(how['F'] - 0.3, 3), 'x': 394, 'y': 1062},  # Buy
]
plan = {
    'vo': 0.2, 'cut': cut, 'gap': 0.6,
    'cost': 2.84, 'pay': 31.23, 'x': '11.0x',
    'hookA': S('$2.84'), 'hookB': [S('$31.23'), E('$31.23')], 'revealT': S('All four to win'),
    'teams': [
        {'name': 'Fulham', 'color': '#111111', 'sub': 'v Newcastle United · 16:00 WAT', 'slam': S('Fulham'), 'lit': [[f2, t2 - .05], [allw, allw_e + .1]]},
        {'name': 'Tottenham Hotspur', 'color': '#132257', 'sub': 'at Leeds United · 13:30 WAT', 'slam': S('Tottenham Hotspur'), 'lit': [[t2, a2 - .05], [allw, allw_e + .1]]},
        {'name': 'Arsenal', 'color': '#EF0107', 'sub': 'v Hull City · 16:00 WAT', 'slam': S('Arsenal'), 'lit': [[a2, m2 - .05], [allw, allw_e + .1]]},
        {'name': 'Manchester City', 'color': '#6CABDD', 'sub': 'at Nottingham Forest · 18:30 WAT', 'slam': S('Manchester City'), 'lit': [[m2, chain - .1], [allw, allw_e + .1]]},
    ],
    'steps': [
        [how['A'], 'Open <b>Build a Combo</b>, search a team'],
        [how['D'], 'Tap a price: it joins<br>the <b>combo bar</b>'],
        [how['F'], 'Tap <b>Buy</b>, set your stake,<br>check <b>Max payout</b>'],
        [how['G'], '<b>Swipe</b> to place it'],
    ],
    'warnT': warn,
    'warnHtml': '<b>All four must win.</b> One loss and the combo pays $0. Only stake what you can afford to lose.<br><span style="font-size:26px;letter-spacing:.08em;color:rgba(11,31,68,.62)">18+ · ONLY WHERE BAGEL IS AVAILABLE · NOT FINANCIAL ADVICE</span>',
    'rings': [
        {'t': [S('one combo'), E('one combo') + .5], 'box': [39, 1276, 381, 56]},
        {'t': [f2 + .15, t2 - .1], 'box': [109, 1405, 812, 131]},
        {'t': [t2 + .15, a2 - .1], 'box': [109, 1558, 812, 167]},
        {'t': [a2 + .15, m2 - .1], 'box': [109, 1747, 812, 131]},
        {'t': [m2 + .15, chain - .1], 'box': [109, 1900, 812, 132]},
        {'t': [allw, nothing + .2], 'box': [100, 1395, 830, 645]},
        {'t': [pay11 + .2, new - .2], 'box': [40, 2076, 888, 88]},
    ],
    'cam': [[0, None], [S('Four picks'), [484, 1700, 1.963]], [f2, [515, 1470, 2.1]], [t2, [515, 1641, 2.1]], [a2, [515, 1812, 2.1]],
            [m2, [515, 1966, 2.1]], [chain, [484, 1700, 1.963]], [pay11, [484, 2174, 1.963]]],
    'scenes': {'hook': [0, E('today') + .1], 'intro': [S('These are my'), E('on Bagel') + .25], 'slip': [slip0 - .1, new - .2],
               'steps': [new, end0 - .1], 'end': [end0 - .1, 999]},
    'phone': {'box': [0, 0, 470, 1080], 'h': 1000, 'scene': [new - .1, end0 - .3]},
    'clips': clips, 'taps': taps,
    'sroot': 'file:///home/user/cmv-alphascanner/video/out/reactions/',
    'flow': {'width': 400, 'idle': {'id': 'stare', 'a': 40, 'b': 110, 'speed': 0.7},
             'segments': [{'from': round(allw - 0.9, 3), 'to': round(nothing + 0.45, 3), 'ANCHOR': 'slip', 'lean': 2,
                           'beats': [{'at': 'have to win', 'id': 'nervous', 'kind': 'hard', 'away': -1, 'from': 0, 'to': 60, 'tail': 30, 'hold': 3.0}]}]},
    'flowEnd': {'width': 400, 'idle': {'id': 'sideeye_full', 'a': 0, 'b': 50, 'speed': 0.6},
                'segments': [{'from': round(end0 + 0.1, 3), 'to': None, 'ANCHOR': 'end', 'lean': -2,
                              'beats': [{'at': 'chain holds', 'id': 'grin_full', 'kind': 'soft', 'away': 1, 'hold': 4.0}]}]},
}
# captions: chunks at punctuation, at most 7 words; key words blue
KEY = {'$2.84', '$31.23', 'Bagel', 'Bagel,', 'Bagel.', 'Fulham.', 'Fulham,', 'Hotspur.', 'Tottenham', 'Tottenham,', 'Arsenal.', 'Arsenal,', 'Manchester',
       'City.', 'City,', 'chain.', 'nothing.', '11', 'Combo.', 'Build', 'Combo', 'combo', 'bar', 'Buy,', 'payout.', 'Swipe', 'positions.', 'lose.', '18', 'post.', 'holds.', 'brave', 'every', 'single', 'Three', 'Unbeaten'}
caps, cur = [], []
def flush():
    global cur
    if cur: caps.append([round(cur[0]['s'], 2), round(cur[-1]['e'], 2), ' '.join(f"<b>{w['w']}</b>" if w['w'] in KEY else w['w'] for w in cur)])
    cur = []
for w in W:
    cur.append(w)
    if w['w'][-1] in '.?!' or (w['w'][-1] == ',' and len(cur) >= 3) or len(cur) >= 7: flush()
flush()
for i in range(len(caps) - 1):
    caps[i][1] = round(min(caps[i + 1][0] - 0.02, caps[i][1] + 0.6), 2)
plan['caps'] = caps
js = json.dumps(plan, indent=1, ensure_ascii=False)
js = js.replace('"ANCHOR": "slip"', '"anchor": t => ({ x: 44, y: 900, rot: 0, hide: [380, 12] })')
js = js.replace('"ANCHOR": "end"', '"anchor": t => ({ x: 1450, y: 1080, rot: 0, hide: [0, 470], z: 20 })')
open(f'{OUT}/plan.js', 'w').write('// generated by gen_plan.py from the take\'s word times (take seconds; the page maps to video time)\nwindow.PLAN = ' + js + '\n')
open(f'{OUT}/words.js', 'w').write('window.WORDS = ' + json.dumps([[round(w['s'], 3), round(w['e'], 3), w['w']] for w in W]) + '\n')
print('cut', cut, '| clips', [(c['id'], c['t0']) for c in clips], '| taps', [t['t'] for t in taps], '| end', end0, '| last word', W[-1]['e'])
