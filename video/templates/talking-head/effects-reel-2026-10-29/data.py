"""Captions and beats for the effects reel, in reel seconds -> reel_data.js next to the page.
python3 -I data.py <work dir> <page dir>"""
import json, sys
K, P = sys.argv[1:3]
S = '/tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad'
reel = json.load(open(f'{K}/plan.json'))
cp = json.load(open(f'{S}/cournot/work/plan.json'))
segs = reel['segs']; seg = {s['id']: s for s in segs}
R = lambda sid, t: round(t - seg[sid]['a'] + seg[sid]['o'], 3)          # source (or Cournot output) seconds -> reel seconds
caps = []
for s in segs:
    if s['src'] != 'c': continue
    for c in cp['caps']:
        a, b = max(c['o0'], s['a']), min(c['o1'], s['b'])
        if b - a > .25: caps.append({'o0': R(s['id'], a), 'o1': R(s['id'], b), 't': c['t']})
for a, b, t in [(48.533, 51.46, "So in this video, I'm going to be showing you"), (51.46, 54.14, 'how I make a *combo pick*'),
                (54.14, 56.04, 'using my own *prediction app*'), (56.04, 60.0, 'and using *Bagel*, like a combo pick on Bagel app.')]:
    caps.append({'o0': R('timeline', a), 'o1': R('timeline', b), 't': t})
caps.sort(key=lambda c: c['o0'])
E = cp['ev']
ev = {'won': R('behind', E['hook_won']),
      'g_primus': R('glass', E['i_primus']), 'g_part': R('glass', E['i_part']), 'g_cournot': R('glass', E['i_cournot']),
      'o_primus': R('orbit', E['v_primus']), 'o_verify': R('orbit', E['v_verify']),
      'd_in': R('doc', E['w2_in']), 'd_why': R('doc', 42.98),
      'c_rules': R('check', E['a_rules']), 'c_evid': R('check', E['a_evid']), 'c_verdict': R('check', E['a_verdict']), 'c_zk': R('check', E['a_zk']),
      's_in': R('split', E['nb_in']), 's_need': R('split', E['e_in']),
      't_combo': R('timeline', 53.62), 't_app': R('timeline', 55.22), 't_bagel': R('timeline', 56.76), 't_combo2': R('timeline', 57.92)}
open(f'{P}/reel_data.js', 'w').write('window.REEL = ' + json.dumps({'segs': segs, 'end': reel['end'], 'endcard': reel['endcard'], 'caps': caps, 'ev': ev}) + ';\n')
for c in caps: print(f"{c['o0']:6.2f}-{c['o1']:6.2f} {c['t']}")
for k, v in ev.items(): print(f'  {k:10s} {v:6.2f}')
