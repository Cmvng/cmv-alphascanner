"""Build page/plan.js + page/words.js for the Starknet post-quantum video from the take's word times (take seconds).
  python3 -I gen.py <words.json> <page dir>"""
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
cut = round((E('for Starknet?') + S('In July 2022')) / 2, 3)
sw, nw = S('switch to a different'), S('without a network-wide')
plan = {
    'vo': 0.2, 'cut': cut, 'gap': 0.6,
    'scenes': {
        'hook': [0, E('for Starknet?') + .35], 'nist': [S('In July 2022') - .1, E('called Sike.') + .3],
        'brk': [S('Less than a month') - .1, E('involved.') + .45], 'half': [S('So even maths') - .1, E('when one breaks.') + .3],
        'acct': [S('On Starknet, every') - .1, E('network-wide upgrade.') + .35], 'arch': [S('And the proofs') - .1, E('threatens.') + .3],
        'reg': [S("As of the hub's") - .1, E('July 2022 announcement.') + .3], 'cav': [S('But it is a demo') - .1, E('quantum safe today.') + .35],
        'hub': [S('The quantum hub') - .1, E('depends on Ethereum.') + .3], 'end': [S('If the maths') - .1, 999]},
    'hk': {'cpu': S('normal computer chip'), 'clock': [S('broken by'), E('within an hour?')], 'crack': E('within an hour?') - .15,
           'q1': S('within an hour?'), 'q2': S('And what does')},
    'nist': {'cam': [[S('In July 2022') - .1, 1440, 600, 1.0], [S('But four more'), 1440, 3420, 1.0]],
             'rings': [[S('In July 2022') + .2, S('picked the first') - .05, [262, 771, 340, 78]],
                       [S('picked the first'), S('But four more') - .1, [262, 373, 2356, 207]],
                       [S('But four more') + .3, E('called Sike.') + .3, [262, 3361, 1553, 166]]],
             'panel': [S('including one called'), E('called Sike.') + .3], 'sike': S('Sike.')},
    'brk': {'d2': S('Less than a month') + .2, 'hour': S('within an hour', 1), 'noq': S('No quantum computer')},
    'half': {'a': S('Picking a good'), 'b': S('The other half')},
    'acct': {'swap': sw + .1, 'ok': nw},
    'arch': {'cam': [[S('And the proofs') - .1, 1440, 900, 1.0], [S('hash functions'), 800, 860, 1.55]],
             'rings': [[S('hash functions') + .5, E('threatens.') + .3, [190, 705, 1180, 280]]]},
    'reg': {'shots': [
        {'t': S("As of the hub's") - .1, 'img': 'rm_upd.jpg', 'h': 782, 'cam': [[0, 700, 250, 1.6]], 'rings': [[S("As of the hub's") + .3, S('a Falcon-512') - .05, [100, 220, 420, 60]]]},
        {'t': S('a Falcon-512'), 'img': 'rm_reg.jpg', 'h': 1800, 'cam': [[0, 1440, 1146, 1.0]], 'rings': [[S('a Falcon-512') + .3, S('demonstrated on Starknet') - .05, [100, 1060, 2680, 170]]]},
        {'t': S('demonstrated on Starknet'), 'img': 'rm_acc.jpg', 'h': 1400, 'cam': [[0, 1160, 820, 1.6]], 'rings': [[S('demonstrated on Starknet') + .3, E('July 2022 announcement.') + .3, [668, 820, 1000, 140]]]}],
        'panel': [S('And Falcon is'), E('July 2022 announcement.') + .3]},
    'cav': [S('But it is a demo'), S('Existing accounts'), S('and each owner'), S('Starknet is preparing')],
    'hub': {'shots': [
        {'t': S('The quantum hub') - .1, 'img': 'hub.jpg', 'h': 2456, 'cam': [[0, 1440, 700, 1.0]], 'rings': []},
        {'t': S('what is live'), 'img': 'rm_reg.jpg', 'h': 1800, 'cam': [[0, 1440, 1000, 1.0]], 'rings': [[S('what is live') + .25, S('what still depends') - .05, [100, 630, 2680, 280]]]},
        {'t': S('what still depends'), 'img': 'rm_reg.jpg', 'h': 1800, 'cam': [[0, 1440, 1000, 1.0]], 'rings': [[S('what still depends') + .25, E('depends on Ethereum.') + .3, [100, 1380, 2680, 170], 'or']]}]},
    'sroot': 'file:///home/user/cmv-alphascanner/video/out/reactions/',
    'flow': {'width': 360, 'idle': {'id': 'stare', 'a': 40, 'b': 110, 'speed': 0.7},
             'segments': [{'from': round(S('two researchers') - .2, 3), 'to': round(E('involved.') + .4, 3), 'ANCHOR': 'brk', 'lean': -2,
                           'beats': [{'at': {'phrase': 'within an hour', 'nth': 1}, 'id': 'shook', 'kind': 'hard', 'away': 1, 'from': 0, 'to': 27, 'tail': 10, 'hold': 2.6}]}]},
    'flow2': {'width': 360, 'idle': {'id': 'sideeye_full', 'a': 0, 'b': 50, 'speed': 0.6},
              'segments': [{'from': round(sw - .5, 3), 'to': round(E('network-wide upgrade.') + .45, 3), 'ANCHOR': 'acct', 'lean': -2,
                            'beats': [{'at': 'network-wide upgrade', 'id': 'grin_full', 'kind': 'soft', 'away': 1, 'hold': 1.6}]}]},
}
KEY = {'hour?', 'Starknet?', 'Starknet,', 'NIST,', 'Sike.', 'Sike', 'hour,', 'core', 'quantum', 'half', 'switch', 'contract', 'signature', 'network-wide', 'hash',
       'Shor\'s', 'Falcon-512', 'Falcon', 'mainnet.', 'demo.', 'preparing.', 'today.', 'live,', 'Ethereum.', 'switch', 'wallet'}
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
js = js.replace('"ANCHOR": "brk"', '"anchor": t => ({ x: 1590, y: 945, rot: 0, hide: [0, 560], z: 20 })')
js = js.replace('"ANCHOR": "acct"', '"anchor": t => ({ x: 1330, y: 800, rot: 0, hide: [640, 0], z: 20 })')
open(f'{OUT}/plan.js', 'w').write('// generated by gen.py (take seconds; the page maps to video time)\nwindow.PLAN = ' + js + '\n')
open(f'{OUT}/words.js', 'w').write('window.WORDS = ' + json.dumps([[round(w['s'], 3), round(w['e'], 3), w['w']] for w in W]) + '\n')
print('cut', cut, 'last', W[-1]['e'], 'caps', len(caps))
