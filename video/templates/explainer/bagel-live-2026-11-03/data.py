"""Timing data for the Bagel video, in TAKE seconds (the page adds the voice offset VO).
Every time comes from the large-v3 word times of the Lara take (words.json). python3 -I data.py <page dir>"""
import json, sys
P = sys.argv[1]
VO = 0.2
CUT, GAP = 12.43, 0.6          # a pause cut into the take before "If you're new", so the drop lands out of a breath
pieces = json.load(open(f'{P}/img/pieces.json'))
SC = {'s2': 12.41, 's3': 16.86, 's4': 25.68, 's5': 41.70, 's6': 66.66, 's7': 74.78, 's8': 82.52}
scenes = {   # the owner's pictures: when each piece enters (take s), and when the scene ends
    'step1-live': {'a': SC['s3'], 'b': SC['s4'] + .12, 'at': {'phone': 16.70, 'h1': 16.86, 'h2': 18.00, 's1': 18.92, 's2': 21.92, 's3': 23.44}},
    'step2-price': {'a': SC['s4'], 'b': SC['s5'] + .12, 'at': {'phone': 25.55, 'h1': 25.68, 'h2': 28.20, 's1': 30.00, 's2': 33.70, 'c1': 36.70, 'c2': 39.34}},
    'step3-sell': {'a': SC['s6'], 'b': SC['s7'] + .12, 'at': {'phone': 66.55, 'h1': 66.66, 's1': 68.98, 's2': 70.28, 's3': 71.50, 'h2': 72.76}},
    'step4-limit': {'a': SC['s7'], 'b': SC['s8'] + .12, 'at': {'phone': 74.68, 'h1': 74.78, 'h2': 75.72, 's1': 76.48, 's2': 77.06, 'c1': 77.74, 'c2': 79.96}},
}
glows = [  # extra outlines on the real screens, on the word (picture px); the pictures' own rings are left as they are
    {'id': 'g_nba', 'r': [1416, 328, 98, 100], 'a': 19.94, 'b': 20.85},
    {'id': 'g_pl', 'r': [1522, 328, 100, 100], 'a': 20.90, 'b': 21.85},
    {'id': 'g_ll', 'r': [1628, 328, 100, 100], 'a': 21.92, 'b': 22.90},
    {'id': 'g_card', 'r': [1310, 550, 460, 378], 'a': 23.44, 'b': 25.50, 'rad': 34},
    {'id': 'g_48', 'r': [1704, 514, 86, 70], 'a': 30.48, 'b': 33.60, 'rad': 16},
    {'id': 'g_val', 'r': [1598, 580, 150, 76], 'a': 70.70, 'b': 72.70, 'rad': 16},
    {'id': 'g_39', 'r': [1588, 484, 108, 62], 'a': 76.48, 'b': 77.70, 'rad': 16},
]
labels = [{'id': 'new', 'text': "if you're new", 'a': SC['s2'], 'b': SC['s3'] + .12},
          {'id': 'ex', 'text': 'my example', 'a': SC['s5'], 'b': SC['s6'] + .12},
          {'id': 'hu', 'text': 'heads up', 'a': SC['s8'], 'b': 99}]
caps = [  # [start, end, text]; *word* is a key word
    [0.00, 0.95, "you're watching a match,"], [0.98, 2.00, "your team *scores*,"], [2.04, 3.40, "and you're like… *ahh*,"],
    [3.43, 5.40, "I should have *made a call* before that."], [5.56, 7.55, "on *Bagel*, you can make the call"],
    [7.60, 9.05, "while the game is *still on*,"], [9.10, 11.25, "and you don't even have to wait till *full time*."],
    [11.36, 12.38, "let me show you."], [12.88, 14.75, "if you're new, *Bagel* is a mobile app"],
    [14.80, 16.75, "that runs on *Polymarket's* markets."], [16.86, 18.85, "open the app and tap *Live*."],
    [18.92, 22.45, "pick a league: *NBA*, *Premier League*, *La Liga*,"], [22.50, 25.55, "and you see the games that are on or starting soon."],
    [25.68, 28.85, "open any match, and every side has a *percent*."], [28.94, 29.95, "that's *the price*."],
    [30.00, 33.65, "so *48%* means the market thinks about 48%,"], [33.70, 36.60, "and one share costs about *48 cents*."],
    [36.70, 39.25, "if you're right, each share pays *$1*."], [39.34, 41.60, "if you're wrong, it pays *nothing*."],
    [41.70, 44.45, "let's say Chelsea to win is *45 cents*,"], [44.50, 46.05, "and you put *$9*."], [46.14, 47.50, "that's *20 shares*."],
    [47.58, 49.98, "now, the price *moves* with the game…"], [50.04, 53.15, "Chelsea score first, and it can jump to *70 cents*."],
    [53.26, 55.95, "your 20 shares are now about *$14*,"], [56.00, 57.85, "and the game isn't even over."],
    [57.92, 60.65, "Chelsea concede, and it can drop to *20 cents*."], [60.72, 62.20, "that's about *$4*."],
    [62.28, 66.50, "hold till full time, and it's *$20*… or *zero*."], [66.66, 68.92, "and yeah, you *don't have to wait*."],
    [68.98, 70.22, "open your position."], [70.28, 72.25, "it shows what it's worth *right now*,"],
    [72.30, 74.70, "and you can tap *Sell* before the game ends."], [74.78, 77.68, "or use a *Limit order* and pick your own price."],
    [77.74, 79.90, "market orders take a *1% fee*,"], [79.96, 82.40, "limit orders, *0.5%*."],
    [82.52, 85.22, "by the way, these numbers are just *my example*."], [85.30, 86.95, "real prices *move fast*,"],
    [87.02, 89.95, "sometimes before you even see it on your stream."], [90.00, 91.50, "so it *cuts both ways*."],
    [91.58, 93.75, "only put what you're *OK losing*."], [93.82, 95.40, "link is in *my post*."],
]
END = round(95.0 + VO + GAP + 3.6, 2)
data = {'vo': VO, 'cut': CUT, 'gap': GAP, 'end': END, 'sc': SC, 'pieces': pieces, 'scenes': scenes, 'glows': glows, 'labels': labels, 'caps': caps,
        'vr': 'file:///home/user/cmv-alphascanner/video/out/vreact/', 'rx': 'file:///home/user/cmv-alphascanner/video/out/reactions/'}
open(f'{P}/bagel_data.js', 'w').write('window.BG = ' + json.dumps(data) + ';\n')
json.dump({'vo': VO, 'cut': CUT, 'gap': GAP, 'end': END, 'sc': SC, 'caps': caps}, open(f'{P}/../work/plan.json', 'w'), indent=1)
print('end', END, 's;', len(caps), 'captions')
