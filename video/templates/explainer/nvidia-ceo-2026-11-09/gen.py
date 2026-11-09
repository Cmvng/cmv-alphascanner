"""Build page/plan.js + page/words.js for the Nvidia CEO story (9 Nov 2026) from the take's word times (take seconds).
  python3 -I gen.py <words_script.json> <page dir>
Every cue is a phrase Lara says, looked up in the aligned words, so a new take only needs a re-run."""
import json, re, sys
W = [w for w in json.load(open(sys.argv[1])) if w['e'] - w['s'] > 0.005]
OUT = sys.argv[2]
norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
C, own = '', []
for i, w in enumerate(W):
    n = norm(w['w']); C += n; own += [i] * len(n)
def at(phrase, nth=0, edge='start'):
    P = norm(phrase); pos = 0
    while True:
        k = C.find(P, pos)
        if k < 0: raise SystemExit(f'phrase not found: {phrase!r}')
        a, b = own[k], own[k + len(P) - 1]
        if (k == 0 or own[k - 1] != a) and (k + len(P) == len(C) or own[k + len(P)] != b):
            if nth == 0: return round(W[a]['s'] if edge == 'start' else W[b]['e'], 3)
            nth -= 1
        pos = k + 1
S = lambda p, n=0: at(p, n, 'start')
E = lambda p, n=0: at(p, n, 'end')
cut = round((E("and what's not.") + S("What's confirmed.")) / 2, 3)
r = lambda x: round(x, 3)
plan = {
    'vo': 0.2, 'cut': cut, 'gap': 0.6,
    'scenes': {
        'hook': [0, cut - .05],
        'ctitle': [cut - .002, S('On Sunday') + .15],
        'letter': [S('On Sunday') - .05, E('names no one.') + .3],
        'board': [S('The same day') - .1, E('committed to cooperating.') + .4],
        'atitle': [S("What's alleged.") - .05, S('The spy part') + .25],
        'claims': [S('The spy part') - .05, E('and a smear.') + .3],
        'fix': [S('So the fair way') - .1, E('Not: a Chinese spy.') + .45],
        'why1': [S('Why it matters') - .05, E('sell into China.') + .35],
        'why2': [S('Two: trust') - .05, E('gossip to Congress.') + .35],
        'why3': [S('Three: the supply') - .05, E('billions on compute.') + .35],
        'ctitle2': [S('How it hits crypto.') - .05, S('With US stocks') + .2],
        'open': [S('With US stocks') - .05, E('got priced.') + .25],
        'bn': [S('Binance Research says') - .1, E('down about 5 percent.') + .3],
        'live': [S("That's tokenized") - .05, E('even opens.') + .4],
        'ai': [S('AI tokens are red') - .05, E('not the only one.') + .35],
        'dates': [S('Nvidia earnings:') - .05, E('the 18th.') + .35],
        'end': [S('Nothing here is proven') - .05, 999]},
    # cold open: the feed, PROVEN?, then the split
    'hk': {'proven': S('proven.'), 'so': S("So here's"), 'conf': S('confirmed,'), 'not': S("what's not.")},
    # the letter: camera keys [t, cx, cy, z] in image px (2880 wide), rings [t0, t1, [x, y, w, h]]
    'letter': {'cam': [[S('On Sunday') - .05, 1440, 760, 1.0], [S('He said he'), 1000, 1830, 1.45], [S('The letter names'), 1000, 2200, 1.0]],
               'rings': [[S('wrote to Nvidia') - .1, S('He said he') - .05, [180, 600, 1630, 126]],
                         [S('unfaithful'), E('his wife,') + .5, [180, 1792, 395, 56]],
                         [S('that it hurt'), E('children,') + .5, [566, 1792, 534, 56]],
                         [S("and that he's deeply"), E('sorry.') + .5, [1612, 1792, 200, 56]],
                         [S('The letter names'), E('names no one.') + .3, [170, 1715, 1660, 1050]]],
               'none': S('names no one.')},
    'board': {'cam': [[S('The same day') - .1, 1440, 640, 1.0], [S("Nvidia's board said"), 980, 1800, 1.35], [S('Nvidia says Jensen') - .3, 980, 2120, 1.35]],
              'rings': [[S('independent directors'), E('outside counsel,') + .6, [180, 1658, 1560, 56]],
                        [S('investigate reporting'), E('effort."') + .5, [418, 1577, 594, 56]],
                        [S('The board says'), E('were compromised.') + .4, [180, 1866, 1580, 56]],
                        [S('Nvidia says Jensen'), S("and he's committed") - .05, [180, 2078, 1540, 56]],
                        [S("and he's committed"), E('cooperating.') + .4, [180, 1997, 1070, 56]]],
              'ceo': S('Nvidia says Jensen')},
    'cl': {'tl': S('The spy part'), 'oct29': S('October 29th.'), 'a': S('The New York Times reported'), 'b': S('Last Friday,'),
           'c': S('And the Financial Times'), 'anon': S('All of that comes'), 'r1': S('No public evidence.'), 'r2': S('No charges.'),
           'r3': S("Alice Huang hasn't"), 'r4': S('and China called')},
    # the live correction: each inserted word appears as Lara says it
    'fix': {'ins': [[S('a woman US'), 'a woman'], [S('US officials'), 'US officials'], [S('suspect is'), 'suspect is']],
            'fair': S('a woman US'), 'spy': S('a Chinese spy.', 0), 'not': S('Not: a Chinese'), 'strike': S('a Chinese spy.', 1)},
    'w1': {'one': S('One: chips'), 'mega': S('Megaspeed was buying'), 'div': S('reportedly under'), 'noev': S('Nvidia says it found'),
           'ec': S('Since 2022,'), 'o1': S('stricter rules,'), 'o2': S('more checks'), 'o3': S('and less room')},
    'w2': {'pcast': S('Jensen sits on'), 'npr': S("and he's been one"), 'house': S('Even before his letter,'),
           'cam': [[S('Even before his letter,'), 1440, 1100, 1.0], [S('asked him to brief'), 980, 1700, 1.25]],
           'rings': [[S('three House') , S('asked him to brief') - .05, [100, 880, 1720, 385]],
                     [S('asked him to brief'), S('on November 18th.') - .05, [100, 1560, 410, 50]],
                     [S('on November 18th.'), E('November 18th.') + .5, [1398, 1990, 333, 54]]],
           'ladder': S('This has moved'), 'congress': S('to Congress.')},
    'w3': {'labs': S('Almost every'), 'run': S("This won't stop"), 'unc': S('adds uncertainty,'), 'bil': S('right when big tech')},
    'op': {'cr': S('crypto was the first'), 'priced': S('Nvidia got priced.')},
    'bn': {'cam1': [[S('Binance Research says') - .1, 540, 675, 1.0], [S('4.2 percent'), 760, 760, 2.1]],
           'ring1': [S('4.2 percent') + .25, S('on about 360') - .05, [812, 800, 96, 46]],
           'swap': S('on about 360'),
           'cam2': [[S('on about 360'), 540, 675, 1.0], [S('million dollars of volume'), 530, 640, 1.15]],
           'ring2': [S('million dollars of volume') + .3, E('any exchange.') + .3, [70, 556, 920, 56]],
           'most': S('the most of any'), 'hl': S('On Hyperliquid,')},
    'lv': {'fri': S("That's tokenized"), 'sun': S('Sunday night,'), 'mon': S('before Wall Street')},
    'ai': {'tao': S('Tao,'), 'fet': S('FET and'), 'akt': S('Akash'), 'btc': S('and Bitcoin'), 'weak': S('But the market'), 'one': S('So this story')},
    'dt': {'d17': S('Nvidia earnings:'), 'd18': S('The House briefing:')},
    'en': {'yet': S('proven yet.'), 'board': S("The board's investigation"), 'cong': S('and Congress,'), 'card': E('really gets.') + .35},
    # giant words ("shout"), each with its own place; solid = on the record, hollow = reported
    'shout': [],
    'sroot': 'file:///home/user/cmv-alphascanner/video/out/reactions/',
    'flow': {'width': 330, 'idle': {'id': 'sideeye_full', 'a': 0, 'b': 50, 'speed': 0.6},
             'segments': [{'from': r(S('and a lot of people') - .3), 'to': r(E('everything is proven.') + .95), 'ANCHOR': 'hook', 'lean': 2,
                           'beats': [{'at': 'everything is proven', 'id': 'sideeye_full', 'kind': 'soft', 'away': -1, 'from': 58, 'to': 104, 'hold': 1.8}]}]},
    'flow2': {'width': 360, 'idle': {'id': 'stare', 'a': 40, 'b': 110, 'speed': 0.7},
              'segments': [{'from': r(S('CT can trade') - .4), 'to': r(E('even opens.') + 1.6), 'ANCHOR': 'live', 'lean': -2,
                            'beats': [{'at': 'even opens', 'id': 'shook', 'kind': 'hard', 'away': 1, 'from': 0, 'to': 27, 'tail': 10, 'hold': 1.7}]}]},
}
# whisper captions: one word at a time
plan['caps'] = [[round(w['s'], 2), round(w['e'], 2), w['w']] for w in W]
js = json.dumps(plan, indent=1, ensure_ascii=False)
js = js.replace('"ANCHOR": "hook"', '"anchor": t => ({ x: 60, y: 1060, rot: 0, hide: [-520, 0], z: 20 })')
js = js.replace('"ANCHOR": "live"', '"anchor": t => ({ x: 1530, y: 1060, rot: 0, hide: [560, 0], z: 20 })')
open(f'{OUT}/plan.js', 'w').write('// generated by gen.py (take seconds; the page maps to video time)\nwindow.PLAN = ' + js + '\n')
open(f'{OUT}/words.js', 'w').write('window.WORDS = ' + json.dumps([[round(w['s'], 3), round(w['e'], 3), w['w']] for w in W]) + '\n')
print('cut', cut, 'last', W[-1]['e'], 'scenes', {k: [round(a, 2), round(b, 2)] for k, (a, b) in plan['scenes'].items()})
