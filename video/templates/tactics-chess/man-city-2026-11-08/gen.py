"""Nottingham Forest 3-1 Man City (7 Nov 2026) and City's three defeats in a row, on the chessboard. Builds page/plan.js +
page/words.js from the take's script-word times (take seconds).   python3 -I gen.py <words_script.json> <page dir>"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from chesslib import Take, piece, write  # noqa: E402

tk = Take(sys.argv[1]); OUT = sys.argv[2]; S, E = tk.S, tk.E
END = tk.W[-1]['e'] + 2.6
cut = round((E('So what went wrong?') + S('Forest sat')) / 2, 3)
SKY, RED = '#6CABDD', '#DD0000'
t_7w, t_3d, t_122, t_af, t_ww = S('Seven wins'), S('Then three'), S('No top-flight'), S('At Forest'), S('So what went wrong?')
t_fs, t_cm, t_fm, t_ran = S('Forest sat'), S('City made'), S('Forest made'), S('ran about')
t_pick, t_g1, t_pb, t_cu, t_tr, t_win, t_sc = S('Then Forest picked'), S('Six minutes in'), S('play out'), S('Jair Cunha'), S('tracks'), S('wins it'), S('and scores.')
t_g2, t_lb, t_nd, t_leave, t_sch, t_del, t_btw, t_20 = S('On 18 minutes'), S('a loose ball'), S('Iliman'), S('leave it'), S('Xaver'), S('Liam Delap'), S('between the'), S('Two-nil.')
t_ch, t_21, t_but, t_mgw, t_len, t_fin, t_31 = S('Rayan'), S('two-one.'), S('But City lost'), S('Morgan'), S('the length'), S('and Delap finished'), S('Three-one.', 1)
t_mq, t_q, t_pat, t_11, t_48, t_two, t_six = S('Enzo Maresca'), S('We lost all'), S("That's the pattern"), S('City conceded'), S('They out-shot'), S('but scored two'), E('conceded six.')
t_haa, t_sem, t_inj, t_ns, t_tra, t_fix = S('Erling'), S('Antoine'), E('is injured.'), S("City aren't"), S("They're losing"), S('Can Maresca')

# ---------------------------------------------------------------- the line-ups: City 4-2-3-1 (attacking left to right), Forest 3-4-2-1
CITY = [('don', 'K', 'Donnarumma', 5, 34), ('khu', 'R', 'Khusanov', 30, 58), ('dia', 'R', 'Dias', 22, 42), ('gue', 'R', 'Guéhi', 22, 26), ('gva', 'R', 'Gvardiol', 30, 10),
        ('enz', 'N', 'Enzo', 42, 40), ('and', 'N', 'Anderson', 42, 28), ('ndi', 'B', 'Ndiaye', 62, 56), ('che', 'N', 'Cherki', 62, 34), ('dok', 'B', 'Doku', 62, 12), ('haa', 'Q', 'Haaland', 78, 34)]
FOR = [('sel', 'K', 'Sels', 101, 34), ('cun', 'R', 'Cunha', 88, 24), ('mil', 'R', 'Milenković', 89, 34), ('mur', 'R', 'Murillo', 88, 44), ('mun', 'B', 'Muñoz', 84, 9),
       ('wil', 'B', 'Williams', 84, 59), ('sch', 'N', 'Schlager', 78, 28), ('yat', 'N', 'Yates', 78, 41), ('mca', 'N', 'McAtee', 69, 21), ('gib', 'N', 'Gibbs-White', 69, 47), ('del', 'Q', 'Delap', 61, 34)]
POSS = {'don': (8, 34), 'khu': (48, 60), 'dia': (38, 43), 'gue': (38, 25), 'gva': (48, 8), 'enz': (55, 41), 'and': (53, 27), 'ndi': (72, 59), 'che': (73, 33), 'dok': (72, 9), 'haa': (83, 30)}
# goal 1 (6'): City play out from the back, Forest press high, Cunha steps out and tracks Gvardiol
G1C = {'don': (5, 34), 'khu': (26, 58), 'dia': (15, 44), 'gue': (15, 25), 'gva': (25, 12), 'enz': (32, 45), 'and': (33, 32), 'ndi': (48, 58), 'che': (48, 29), 'dok': (48, 8), 'haa': (62, 40)}
G1F = {'sel': (101, 34), 'cun': (54, 22), 'mil': (57, 35), 'mur': (55, 48), 'mun': (42, 6), 'wil': (42, 62), 'sch': (42, 26), 'yat': (43, 46), 'mca': (29, 21), 'gib': (28, 50), 'del': (21, 35)}
# goal 2 (18'): a loose ball in Forest's half
G2C = {'don': (8, 34), 'khu': (52, 58), 'dia': (40, 42), 'gue': (40, 26), 'gva': (54, 10), 'enz': (50, 47), 'and': (58, 30), 'ndi': (61, 42), 'che': (70, 34), 'dok': (72, 12), 'haa': (82, 34)}
G2F = {'sel': (101, 34), 'cun': (86, 24), 'mil': (88, 34), 'mur': (86, 44), 'mun': (80, 10), 'wil': (80, 58), 'sch': (66, 31), 'yat': (70, 42), 'mca': (68, 21), 'gib': (71, 50), 'del': (56, 35)}

pieces = []
on_main = [t_af - .3, t_btw + 2.2]                      # first set: the opening board to goal 2
for pid, role, nm, x, y in CITY:
    k = [[0, x, y], [t_fs + .1, *POSS[pid], 1.3], [t_g1 - .2, *G1C[pid], 1.2]]
    if pid == 'gva': k.append([t_pb + .5, 30, 10, .8])
    if pid == 'gue': k.append([t_win + .9, 19, 21, 1.0])
    k.append([t_g2 - .1, *G2C[pid], 1.2])
    if pid == 'dia': k.append([t_del + .4, 27, 39, 1.9])
    if pid == 'gue': k.append([t_del + .4, 27, 29, 1.9])
    hi = {'gva': [(t_tr, t_win + .6)], 'ndi': [(t_nd, t_sch)], 'and': [(t_nd, t_sch)], 'dia': [(t_btw, t_20)], 'gue': [(t_btw, t_20)]}.get(pid)
    lab = [(t_fs, t_g1 - .3)] + ([(t_g1 - .3, t_g2 - .2)] if pid in ('don', 'gue', 'gva', 'dia') else []) + ([(t_g2 - .2, on_main[1])] if pid in ('and', 'ndi', 'dia', 'gue') else [])
    pieces.append(piece('c_' + pid, 'A', role, nm, k, on=on_main, hi=hi, lab=lab))
for pid, role, nm, x, y in FOR:
    k = [[0, x, y], [t_g1 - .2, *G1F[pid], 1.2]]
    if pid == 'cun': k += [[t_cu + .1, 34, 14, 1.3], [t_tr + .1, 30.5, 13.5, .8], [t_win + .5, 14, 28, 1.5]]
    if pid == 'del': k.append([t_win + .4, 16, 38, 1.2])
    k.append([t_g2 - .1, *G2F[pid], 1.2])
    if pid == 'sch': k.append([t_sch + .1, 62, 35, .6])
    if pid == 'del': k.append([t_del, 17, 34, 2.4])
    hi = {'cun': [(t_cu, t_sc + .8)], 'sch': [(t_sch, t_del + .6)], 'del': [(t_del, t_20 + .6)]}.get(pid)
    lab = [(t_fs, t_g1 - .3)] + ([(t_g1 - .3, t_g2 - .2)] if pid in ('cun', 'del') else []) + ([(t_g2 - .2, on_main[1])] if pid in ('sch', 'del') else [])
    pieces.append(piece('f_' + pid, 'B', role, nm, k, on=on_main, hi=hi, lab=lab))

# second set: Cherki's goal and the third goal (73'): City lose a duel at the edge of Forest's box (no source names the City
# player, so that piece has no label), Gibbs-White and Delap run the length
on3 = [t_ch - .35, t_31 + .9]
G3 = [('A', 'K', 'Donnarumma', 'don', [[0, 5, 34]]), ('A', 'B', 'Doku', 'dok', [[0, 95, 8]]), ('A', 'N', 'Cherki', 'che', [[0, 86, 30], [t_but - .1, 82, 24, .8]]),
      ('A', 'N', '', 'enz', [[0, 84, 38], [t_but + .1, 86.5, 36.5, .5]]), ('A', 'Q', 'Haaland', 'haa', [[0, 94, 42], [t_mgw, 72, 32, 2.6]]),
      ('A', 'R', 'Dias', 'dia', [[0, 58, 40], [t_mgw + .2, 27, 35, 2.6]]), ('A', 'R', 'Khusanov', 'khu', [[0, 60, 28], [t_mgw + .3, 29, 29, 2.6]]),
      ('A', 'R', 'Nunes', 'nun', [[0, 66, 58], [t_mgw + .4, 34, 52, 2.6]]), ('A', 'R', "O'Reilly", 'ore', [[0, 70, 10], [t_mgw + .4, 40, 18, 2.6]]),
      ('B', 'K', 'Sels', 'sel', [[0, 101, 34]]), ('B', 'R', 'Cunha', 'cun', [[0, 93, 24]]), ('B', 'R', 'Milenković', 'mil', [[0, 94, 34]]), ('B', 'R', 'Murillo', 'mur', [[0, 93, 44]]),
      ('B', 'N', 'Yates', 'yat', [[0, 89, 38], [t_but + .1, 87.5, 36, .5]]), ('B', 'N', 'Schlager', 'sch', [[0, 84, 26]]),
      ('B', 'N', 'Gibbs-White', 'gib', [[0, 70, 45], [t_mgw + .2, 24, 37, 2.4]]), ('B', 'Q', 'Delap', 'del', [[0, 75, 33], [t_mgw + .1, 17, 46, 2.6]])]
for team, role, nm, pid, keys in G3:
    hi = {'che': [(t_ch, t_21 + .4)], 'dok': [(t_ch, t_21)], 'enz': [(t_but, t_mgw)], 'yat': [(t_but, t_mgw)], 'gib': [(t_mgw, t_31 + .6)], 'del': [(t_mgw, t_31 + .9)]}.get(pid)
    pieces.append(piece('g_' + pid, team, role, nm, keys, on=on3, hi=hi, lab=[on3] if pid in ('dok', 'che', 'yat', 'gib', 'del', 'dia') else []))

# third set: the XI again for the pattern, Haaland and Semenyo
on4 = [t_mq - .3, t_ns - .2]
for pid, role, nm, x, y in CITY:
    pieces.append(piece('e_' + pid, 'A', role, nm, [[0, x, y]], on=on4, hi=[(t_haa, t_sem)] if pid == 'haa' else None))

b_end1 = min(t_win + 1.9, t_sc - .05)
ball = [[0, 8, 34], [t_cm - .05, 38, 25], [t_cm + .45, 38, 43], [t_cm + .95, 48, 60], [t_cm + 1.45, 55, 41], [t_cm + 1.95, 53, 27], [t_cm + 2.45, 48, 8], [t_cm + 2.95, 38, 25],
        [t_g1 - .2, 5.5, 34], [t_pb, 15, 25.5], [t_pb + .7, 25, 12.5], [t_pb + 1.2, 29.5, 10.5], [t_win + .1, 31, 12.5], [t_win + .9, 22, 20], [b_end1, 15, 27.5], [t_sc + .15, 0.3, 32.5],
        [t_g2 - .1, 62, 37], [t_sch + .5, 62.5, 35.5], [t_del + .4, 42, 34], [t_del + .9, 32, 34], [t_del + 1.6, 24, 34], [t_del + 2.2, 18.5, 34], [min(t_20 + .1, t_ch - .4), 0.3, 34],
        [t_ch - .35, 95, 8.5], [t_ch + .5, 86.5, 29], [t_ch + 1.0, 104.6, 29], [t_but - .2, 86.5, 36], [t_but + .5, 87.5, 36.5], [t_but + 1.0, 75, 33], [t_mgw - .1, 70, 44.5],
        [t_mgw + .8, 55, 42], [t_mgw + 1.6, 40, 39.5], [t_mgw + 2.4, 25, 37.5], [t_fin - .1, 18, 45.5], [t_fin + .6, 0.4, 29], [t_mq, 52.5, 34]]
ball_on = [t_fs - .2, t_31 + .9]
pas = lambda t0, t1, a, b, k='pass', bend=0, draw=.45: {'t0': round(t0, 3), 't1': round(t1, 3), 'from': a, 'to': b, 'kind': k, 'bend': bend, 'draw': draw}
U = [(38, 25), (38, 43), (48, 60), (55, 41), (53, 27), (48, 8), (38, 25)]
arrows = [pas(t_cm - .05 + i * .5, t_cm + .9 + i * .5, list(U[i]), list(U[i + 1]), draw=.35) for i in range(6)]
arrows += [pas(t_pb - .1, t_win + .4, [6, 34], [14.5, 26]), pas(t_pb + .5, t_win + .4, [16, 24.5], [24.5, 12]),
           pas(t_cu, t_sc + .8, [54, 22], [35, 14], 'press'), pas(t_win + .4, t_sc + .8, [30, 14], [15, 27], 'run', 2),
           pas(t_sc - .05, t_sc + 1.0, [14, 28.5], [0.6, 32.5], 'shot', 0, .3),
           pas(t_sch, t_20 + .8, [66, 31], [62.8, 34.6], 'press'), pas(t_del, t_20 + .8, [62, 35.5], [33, 34]),
           pas(t_del + .1, t_20 + .8, [56, 35], [19, 34], 'run'), pas(min(t_20 - .05, t_ch - .6), t_20 + .9, [18, 34], [0.6, 34], 'shot', 0, .3),
           pas(t_ch - .2, t_21 + .4, [95, 9], [86.5, 28.5], 'pass', 3), pas(t_ch + .55, t_21 + .4, [87, 29.5], [104.5, 29.5], 'shot', 0, .3),
           pas(t_but + .5, t_31 + .7, [87, 36], [76, 33]), pas(t_mgw - .3, t_31 + .7, [75, 33.5], [70.5, 44]),
           pas(t_mgw + .2, t_31 + .7, [70, 45], [25, 37.5], 'run'), pas(t_mgw + .3, t_31 + .7, [75, 33], [18, 45.5], 'run', -3),
           pas(t_fin - .35, t_31 + .7, [24.5, 37.5], [18.5, 45]), pas(t_fin + .25, t_31 + 1.0, [17.5, 45.5], [0.6, 30], 'shot', 0, .3)]
# the blueprint: Forest's three goals on one board
BP = [pas(t_tra, END + 1, [54, 22], [31, 13], 'press', 0, .5), pas(t_tra + .1, END + 1, [31, 13], [14, 28], 'run', 2), pas(t_tra + .2, END + 1, [14, 28], [0.6, 32.5], 'shot', 0, .3),
      pas(t_tra + .5, END + 1, [62, 35], [33, 34], 'pass', 0, .5), pas(t_tra + .6, END + 1, [56, 36], [18, 35], 'run'), pas(t_tra + .7, END + 1, [18, 35], [0.6, 34], 'shot', 0, .3),
      pas(t_tra + 1.0, END + 1, [87, 37], [70, 45], 'pass', 0, .5), pas(t_tra + 1.1, END + 1, [70, 45], [24, 39], 'run'), pas(t_tra + 1.2, END + 1, [24, 39], [17, 47], 'pass', 0, .3),
      pas(t_tra + 1.3, END + 1, [17, 47], [0.6, 30], 'shot', 0, .3)]
arrows += BP
marks = [{'t0': t_win, 't1': t_win + 1.0, 'kind': 'ring', 'x': 30.5, 'y': 12, 'r': 4, 'stroke': RED},
         {'t0': t_lb, 't1': t_sch + .3, 'kind': 'ring', 'x': 62, 'y': 37, 'r': 4.5, 'stroke': RED},
         {'t0': t_btw, 't1': t_20 + .4, 'kind': 'zone', 'x': 22, 'y': 30, 'w': 12, 'h': 8, 'fill': 'rgba(31,95,219,.14)', 'stroke': '#1F5FDB'},
         {'t0': t_but, 't1': t_mgw + .4, 'kind': 'ring', 'x': 87, 'y': 36.5, 'r': 4, 'stroke': RED}]
cam = [[0, 52.5, 34, .9, 38, 0], [t_af, 60, 34, .95, 40, -3, 2.4], [t_fs, 62, 34, .98, 40, 0, 1.4], [t_g1 - .3, 32, 30, 1.12, 38, 0, 1.4], [t_win, 24, 28, 1.25, 38, 0, 1.6],
       [t_g2 - .2, 56, 34, 1.08, 38, 0, 1.3], [t_del + .3, 34, 34, 1.15, 38, 0, 2.0], [t_ch - .4, 86, 26, 1.25, 38, 0, 1.0], [t_but - .2, 78, 36, 1.05, 38, 0, 1.0],
       [t_mgw + .3, 44, 38, .98, 38, 0, 2.6], [t_fin - .5, 22, 38, 1.2, 38, 0, 1.4], [t_mq - .3, 52.5, 34, .84, 54, 0, 1.6], [t_haa - .2, 58, 34, 1.0, 40, 0, 1.4],
       [t_ns - .2, 40, 34, .92, 40, 0, 1.6]]

# ---------------------------------------------------------------- panels
C = lambda left, top: {'left': f'{left}px', 'top': f'{top}px'}
full = {'left': '0px', 'width': '1920px', 'textAlign': 'center'}
chip = lambda txt, bg, sub='': (f'<div style="width:140px;height:140px;border-radius:26px;background:{bg};color:#fff;font:400 92px/140px Anton,sans-serif;text-align:center;box-shadow:0 18px 40px rgba(0,0,0,.35)">{txt}</div>'
                                + (f'<div style="margin-top:14px;font:800 24px/1.2 Man,sans-serif;color:#fff;text-align:center;width:140px">{sub}</div>' if sub else ''))
panels = [{'t0': t_7w - .05, 't1': t_3d - .05, 'html': '<div class="ttl" style="font-size:130px">7 WINS TO <b>START</b></div>', 'style': {**full, 'top': '190px'}},
          {'t0': t_3d, 't1': t_af - .1, 'html': '<div class="ttl" style="font-size:130px">THEN 3 <span style="color:#FF8A8F">DEFEATS</span></div>', 'style': {**full, 'top': '190px'}}]
for i in range(7): panels.append({'t0': t_7w + .1 + i * .08, 't1': t_af - .1, 'html': chip('W', '#15803D'), 'style': C(161 + i * 162, 400)})
for i, sub in enumerate(['Villa', 'Brighton', 'Forest']):
    panels.append({'t0': t_3d + .25 + i * .3, 't1': t_af - .1, 'html': chip('L', '#B91C1C', sub), 'style': C(161 + (7 + i) * 162, 400)})
panels.append({'t0': t_122, 't1': t_af - .1, 'style': {**full, 'top': '660px'},
               'html': '<div class="ttl" style="font-size:84px">NO TOP-FLIGHT TEAM IN <b>122 YEARS</b></div><div class="kick" style="margin-top:20px">had won their first seven, then lost the next three · Sky Sports</div>'})
score = lambda h, a: (f'<div class="card score" style="padding:22px 40px"><span class="bar" style="background:{RED}"></span><span class="t">FOREST</span><span class="n">{h}</span>'
                      f'<span class="n" style="color:rgba(11,31,68,.35)">–</span><span class="n">{a}</span><span class="t">MAN CITY</span><span class="bar" style="background:{SKY}"></span></div>')
panels.append({'t0': t_af, 't1': t_ww - .05, 'html': score(3, 1), 'style': C(90, 60)})
panels.append({'t0': S('78%') - .1, 't1': t_ww - .05, 'style': C(1330, 60),
               'html': f'<div class="card" style="padding:24px 34px"><div class="kick" style="color:#1F5FDB">City had</div><div style="font:400 110px/1 Anton,sans-serif;color:{SKY};-webkit-text-stroke:2px #0B1F44">78%</div><div class="kick" style="color:rgba(11,31,68,.6);margin-top:6px">of the ball</div></div>'})
panels.append({'t0': t_ww, 't1': E('So what went wrong?') + .35, 'html': '<div class="ttl" style="font-size:120px">SO WHAT <b>WENT WRONG?</b></div>', 'style': {**full, 'top': '70px'}})

def stat(l, a, b, wa, wb, ca=SKY, cb=RED):
    return (f'<div class="stat"><div class="v" style="color:#0B1F44">{a}</div><div><div class="l">{l}</div><div class="tr"><i data-w="{wa}" style="left:0;background:{ca}"></i>'
            f'<i data-w="{wb}" style="right:0;background:{cb}"></i></div></div><div class="v" style="color:{cb}">{b}</div></div>')
panels.append({'t0': t_fs, 't1': t_cm - .1, 'style': C(90, 60),
               'html': '<div class="card" style="padding:24px 34px"><div class="kick" style="color:#1F5FDB">Forest · 3-4-2-1</div><div style="font:400 64px/1.05 Anton,sans-serif;margin-top:10px">GIVE CITY THE BALL</div></div>'})
panels.append({'t0': t_cm, 't1': t_pick - .1, 'bars': 1, 'style': C(90, 50),
               'html': '<div class="card" style="width:720px;padding:26px 36px"><div style="display:flex;justify-content:space-between;font:400 40px/1 Anton,sans-serif;margin-bottom:4px">'
                       f'<span>CITY</span><span style="color:{RED}">FOREST</span></div>' + stat('Passes', '753', '206', 78, 22) + stat('Possession', '78%', '22%', 78, 22)
                       + '<div style="font:800 28px/1.3 Man,sans-serif;margin-top:14px;color:rgba(11,31,68,.7)">Forest ran <b style="color:#DD0000">about 6 km more</b></div></div>'})
goal = lambda n, m, t0, t1, txt: {'t0': t0, 't1': t1, 'chip': 1, 'style': C(90, 56),
                                  'html': f'<div style="display:inline-block" class="card"><div style="padding:16px 34px;font:400 52px/1 Anton,sans-serif">GOAL {n} · {m}\' · <span style="color:{RED}">{txt}</span></div></div>'}
panels.append({'t0': t_pick, 't1': t_g1 - .1, 'html': '<div class="ttl" style="font-size:100px">FOREST PICK <b>THEIR MOMENTS</b></div>', 'style': {**full, 'top': '70px'}})
panels.append(goal(1, 6, t_g1, t_g2 - .1, 'CUNHA'))
panels.append(goal(2, 18, t_g2, t_ch - .4, 'DELAP'))
panels.append({'t0': t_ch - .35, 't1': t_but - .1, 'chip': 1, 'style': C(90, 56),
               'html': f'<div style="display:inline-block" class="card"><div style="padding:16px 34px;font:400 52px/1 Anton,sans-serif">52\' · <span style="color:#2F7FC1">CHERKI</span> · 2-1</div></div>'})
panels.append(goal(3, 73, t_but, t_31 + .9, 'DELAP'))
panels.append({'t0': S('on the duels') - .1, 't1': t_pat - .1, 'style': C(260, 150),
               'html': '<div class="card" style="padding:40px 56px;width:1300px"><div class="kick" style="color:#1F5FDB">Enzo Maresca · on the duels and second balls</div>'
                       '<div style="font:400 124px/1 Anton,sans-serif;margin-top:16px;white-space:nowrap">“WE LOST <span style="color:#DD0000">ALL OF THEM.</span>”</div>'
                       f'<div style="display:flex;gap:16px;margin-top:26px"><div style="padding:14px 22px;border-radius:16px;background:#F1F4FA;font:800 30px/1 Man,sans-serif">Interceptions: <b style="color:{RED}">Forest 11</b> · City 1</div></div></div>'})
panels.append({'t0': t_pat - .05, 't1': t_haa - .15, 'html': '<div class="kick" style="font-size:34px">The pattern · three defeats</div>', 'style': C(96, 52)})
for i, (o, sc, d) in enumerate([('Aston Villa', '1-2', 'Away · 24 Oct'), ('Brighton', '0-1', 'Home · 31 Oct'), ('Forest', '1-3', 'Away · 7 Nov')]):
    panels.append({'t0': t_11 + i * .25, 't1': t_haa - .15, 'style': C(90 + i * 352, 110),
                   'html': f'<div class="card" style="padding:22px 26px;width:270px"><span style="display:inline-block;font:400 40px/1 Anton,sans-serif;color:#fff;background:#B91C1C;border-radius:12px;padding:8px 14px">L {sc}</span>'
                           f'<div style="font:400 44px/1.05 Anton,sans-serif;margin-top:14px">{o}</div><div style="font:800 22px/1.3 Man,sans-serif;color:rgba(11,31,68,.6);margin-top:6px">{d}</div>'
                           f'<div style="font:800 24px/1.25 Man,sans-serif;color:#B91C1C;margin-top:12px">Conceded inside 11\'</div></div>'})
panels.append({'t0': t_48, 't1': t_haa - .15, 'bars': 1, 'style': C(90, 470),
               'html': '<div class="card" style="width:820px;padding:24px 36px"><div style="display:flex;justify-content:space-between;font:400 36px/1 Anton,sans-serif;margin-bottom:2px">'
                       '<span>CITY</span><span style="color:#B91C1C">OPPONENTS</span></div>' + stat('Shots', '48', '26', 65, 35, SKY, '#B91C1C') + stat('xG', '4.96', '2.67', 65, 35, SKY, '#B91C1C')
                       + stat('Goals', '2', '6', 25, 75, SKY, '#B91C1C') + '</div>'})
panels.append({'t0': t_haa, 't1': t_ns - .2, 'style': C(90, 60),
               'html': '<div class="card" style="padding:24px 34px;width:470px"><div class="kick" style="color:#1F5FDB">Erling Haaland</div><div style="display:flex;align-items:baseline;gap:18px;margin-top:8px">'
                       '<span style="font:400 130px/1 Anton,sans-serif;color:#B91C1C">0</span><span style="font:800 32px/1.25 Man,sans-serif">goals in his<br>last 2 games</span></div>'
                       '<div style="font:800 24px/1.3 Man,sans-serif;color:rgba(11,31,68,.6);margin-top:6px">9 Premier League goals this season</div></div>'})
panels.append({'t0': t_sem, 't1': t_ns - .2, 'style': C(1290, 60),
               'html': '<div class="card" style="padding:24px 34px;width:500px"><div class="kick" style="color:#B91C1C">Out injured</div><div style="font:400 64px/1.05 Anton,sans-serif;margin-top:8px">ANTOINE SEMENYO</div>'
                       '<div style="font:800 28px/1.3 Man,sans-serif;margin-top:10px">Played in <b style="color:#15803D">all 7 wins</b>,<br>none of the 3 defeats</div></div>'})
panels.append({'t0': t_ns, 't1': t_tra - .4, 'html': '<div class="ttl" style="font-size:110px">NOT SHORT OF <b>CHANCES</b></div>', 'style': {**full, 'top': '64px'}})
panels.append({'t0': t_tra, 't1': t_fix - .15, 'html': '<div class="kick">Forest\'s three goals on one board</div><div class="ttl" style="font-size:110px;margin-top:14px">LOSING THE <b>TRANSITIONS</b></div>', 'style': {**full, 'top': '40px'}})
panels.append({'t0': t_fix, 't1': END + 1, 'style': {**full, 'top': '330px'},
               'html': '<div class="ttl" style="font-size:150px">CAN MARESCA <b>FIX IT?</b></div><div class="kick" style="margin-top:30px">Follow for more football, by the numbers</div>'})

flags = [{'t': t_sc + .25, 'text': 'CHECK', 'dur': 1.2}, {'t': t_20 - .1, 'text': 'CHECK', 'dur': 1.0}, {'t': t_31, 'text': 'CHECKMATE', 'dur': 1.6}]
KEY = {'cunha', 'gvardiol', 'josko', 'ndiaye', 'iliman', 'anderson', 'elliot', 'schlager', 'xaver', 'delap', 'liam', 'rayan', 'cherkis', 'gibbswhite', 'morgan', 'maresca', 'enzo',
       'haaland', 'erling', 'semenyo', 'antoine', 'transitions', 'twonil', 'twoone', 'threeone'}
plan = {'vo': 0.2, 'cut': cut, 'gap': 0.6, 'end': END, 'sroot': 'file:///home/user/cmv-alphascanner/video/out/reactions/',
        'teams': {'A': {'color': SKY, 'ink': '#0B1F44'}, 'B': {'color': RED, 'ink': '#FFFFFF'}},
        'boardOn': [t_af + .2, t_fix - .6], 'names': [t_fs, t_inj], 'cam': cam, 'pieces': pieces, 'ball': ball, 'ballOn': ball_on,
        'arrows': arrows, 'marks': marks, 'flags': flags, 'panels': panels, 'caps': tk.caps(KEY),
        'flow': {'width': 340, 'idle': {'id': 'stare', 'a': 40, 'b': 110, 'speed': 0.7},
                 'segments': [{'from': round(t_g1 - .1, 3), 'to': round(t_g2 - .25, 3), 'ANCHOR': 'g1', 'lean': -2,
                               'beats': [{'at': 'and scores', 'id': 'noway', 'kind': 'hard', 'away': 1, 'hold': 2.2}]}]},
        'flow2': {'width': 340, 'idle': {'id': 'sideeye_full', 'a': 0, 'b': 50, 'speed': 0.6},
                  'segments': [{'from': round(t_48 - .3, 3), 'to': round(min(t_six + 1.0, t_haa - .2), 3), 'ANCHOR': 'pat', 'lean': -2,
                                'beats': [{'at': 'conceded six', 'id': 'yikes_full', 'kind': 'hard', 'away': 1, 'hold': 2.0}]}]}}
write(plan, OUT, tk, {'g1': 't => ({ x: 1530, y: 952, rot: 0, hide: [520, 0], z: 20 })', 'pat': 't => ({ x: 1530, y: 952, rot: 0, hide: [520, 0], z: 20 })'})
print('cut', cut, 'end', round(END, 2), 'video', round(END + .8, 2), 'caps', len(plan['caps']), 'pieces', len(pieces))
