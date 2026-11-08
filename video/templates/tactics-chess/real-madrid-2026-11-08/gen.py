"""Real Madrid, eight wins in a row (8 Nov 2026), on the chessboard. Builds page/plan.js + page/words.js from the take's
script-word times (take seconds).   python3 -I gen.py <words_script.json> <page dir>"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from chesslib import Take, piece, write  # noqa: E402

tk = Take(sys.argv[1]); OUT = sys.argv[2]; S, E = tk.S, tk.E
END = tk.W[-1]['e'] + 2.6
cut = round((E('nobody can beat.') + S("It's five")) / 2, 3)
t_in = S('This is how')
# ---------------------------------------------------------------- Madrid: 4-2-3-1, attacking left to right (x 0 -> 105)
XI = [('cou', 'K', 'Courtois', 4, 34), ('val', 'R', 'Valverde', 24, 58), ('kon', 'R', 'Konaté', 18, 42), ('hui', 'R', 'Huijsen', 18, 26),
      ('cuc', 'R', 'Cucurella', 24, 10), ('tch', 'N', 'Tchouaméni', 36, 40), ('ber', 'N', 'Bernardo', 36, 28), ('gul', 'B', 'Güler', 56, 56),
      ('bel', 'N', 'Bellingham', 54, 34), ('dio', 'B', 'Diomande', 56, 12), ('mba', 'Q', 'Mbappé', 70, 34)]
# the Clásico block (mid-to-low; wingers tucked back to double up on the wide men)
BLOCK = {'cou': (4, 34), 'val': (18, 54), 'kon': (16, 41), 'hui': (16, 27), 'cuc': (18, 14), 'tch': (28, 40), 'ber': (28, 28),
         'gul': (30, 52), 'bel': (40, 36), 'dio': (30, 16), 'mba': (47, 29)}
TUCK = {'gul': (23, 58), 'dio': (23, 10)}
# with the ball
ATT = {'cou': (6, 34), 'val': (46, 58), 'kon': (30, 44), 'hui': (30, 26), 'cuc': (42, 10), 'tch': (46, 40), 'ber': (46, 28),
       'gul': (66, 54), 'bel': (64, 38), 'dio': (68, 14), 'mba': (82, 32)}
# Barcelona (a generic 4-3-3; only Yamal and Gordon are named), attacking right to left
BAR_IN = [('bk', 'K', '', 100, 34), ('b1', 'R', '', 50, 12), ('b2', 'R', '', 68, 27), ('b3', 'R', '', 68, 41), ('b4', 'R', '', 50, 56),
          ('b5', 'N', '', 55, 34), ('b6', 'N', '', 46, 19), ('b7', 'N', '', 47, 49), ('yam', 'B', 'Yamal', 31, 7), ('gor', 'B', 'Gordon', 31, 61), ('b9', 'Q', '', 34, 30)]
BAR_DEF = {'bk': (101, 34), 'b1': (84, 14), 'b2': (84, 28), 'b3': (84, 42), 'b4': (84, 56), 'b5': (74, 34), 'b6': (72, 22), 'b7': (72, 46),
           'yam': (64, 8), 'gor': (64, 60), 'b9': (60, 34)}

t_wb, t_cl, t_dr, t_wg, t_du, t_38 = S('Without the ball'), S('In the Clásico'), S('dropped into'), S('wingers tucked'), S('double up'), S('Madrid had just')
t_wb2, t_mid, t_mb, t_drag, t_jb, t_late, t_cu = S('With the ball'), S('starts in the middle'), S('Kylian Mbappé'), S('drags a centre-back'), S('Jude Bellingham'), S('arrives late'), S('Marc Cucurella')
end_ball = E('on the left.') + .1
pieces = []
for i, (pid, role, nm, x, y) in enumerate(XI):
    k = [[0, -8, y], [t_in + .05 + i * .07, x, y, 1.1], [t_wb + .2, *BLOCK[pid], 1.3]]
    if pid in TUCK: k.append([t_wg + .1, *TUCK[pid], 1.0])
    k.append([t_wb2 + .1, *ATT[pid], 1.3])
    if pid == 'mba': k.append([t_mb + .2, 68, 33, 1.0])
    if pid == 'bel': k.append([t_late, 86, 34, 1.3])
    if pid == 'cuc': k.append([t_cu + .1, 82, 7, 1.7])
    if pid == 'dio': k.append([t_cu + .3, 74, 20, 1.2])
    hi = {'tch': [(S('Aurélien'), E('side by side,'))], 'ber': [(S('Aurélien'), E('side by side,'))], 'mba': [(t_mb, E('with him.') + .3)],
          'bel': [(t_jb, E('into that space,'))], 'cuc': [(t_cu, end_ball)]}.get(pid, [])
    if pid in ('val', 'kon', 'hui', 'cuc'): hi = hi + [(S('back four'), E('never exposed.'))]
    # names: the latest XI (Valencia, 7 Nov). Hidden in the Clásico block: that XI differed (Lunin in goal for Courtois)
    pieces.append(piece(pid, 'A', role, nm, k, on=[t_in - .3, end_ball], hi=hi, lab=[(S('The base is'), t_wb), (t_wb2 + .3, end_ball)]))
for pid, role, nm, x, y in BAR_IN:                     # Barcelona in the Clásico block
    pieces.append(piece(pid, 'B', role, nm, [[0, x, y]], on=[t_cl - .4, t_wb2 - .1], hi=[(t_du, E('wide men.'))] if pid in ('yam', 'gor') else None))
for pid, role, nm, x, y in BAR_IN:                     # a generic opponent for the build-up pattern (F365: not one match)
    k = [[0, *BAR_DEF[pid]]]
    if pid == 'b2': k.append([t_drag + .1, 73, 31, 1.0])
    pieces.append(piece('o_' + pid, 'C', role, '', k, on=[t_wb2 + .1, end_ball]))

# ---------------------------------------------------------------- the Clásico winner (87')
t_nw, t_bl, t_bt, t_ag, t_ec, t_sq, t_en = S('Now watch'), S('Barcelona lose'), S('Bellingham turns'), S('Arda Güler'), S('Eduardo Camavinga'), S('squares it'), S('Empty net.')
t_9, t_7 = S("That's nine"), E('straight games.')
won = [t_nw - .1, t_7 + .35]
pieces += [
    piece('w_bel', 'A', 'N', 'Bellingham', [[0, 45, 36], [t_bl + .1, 49, 32, .6], [t_bt, 51, 35, .6]], on=won, hi=[(t_bl, t_ag)]),
    piece('w_gul', 'A', 'B', 'Güler', [[0, 57, 49], [t_ag - .3, 58, 46, .6]], on=won, hi=[(t_ag, t_ec)]),
    piece('w_cam', 'A', 'N', 'Camavinga', [[0, 54, 24], [t_ec, 88, 22, 1.9]], on=won, hi=[(t_ec, t_sq + .3)]),
    piece('w_mba', 'A', 'Q', 'Mbappé', [[0, 68, 40], [t_ec + .4, 97, 36, 1.6]], on=won, hi=[(t_sq, t_7)]),
    piece('w_bk', 'B', 'K', '', [[0, 101, 34], [t_sq - .5, 95, 27, .8]], on=won),
    piece('w_b1', 'B', 'R', '', [[0, 80, 20], [t_ec + .5, 90, 25, 1.6]], on=won),
    piece('w_b2', 'B', 'R', '', [[0, 78, 32], [t_ec + .5, 88, 33, 1.6]], on=won),
    piece('w_b3', 'B', 'R', '', [[0, 80, 44], [t_ec + .7, 90, 42, 1.6]], on=won),
    piece('w_b4', 'B', 'R', '', [[0, 76, 56], [t_ec + .7, 86, 52, 1.6]], on=won),
    piece('w_b5', 'B', 'N', '', [[0, 52, 28], [t_bl + .2, 50, 26, .6]], on=won),
    piece('w_b6', 'B', 'N', '', [[0, 62, 38], [t_ec, 70, 36, 1.6]], on=won)]

# ---------------------------------------------------------------- late goals, weak spot, end: the XI again
t_tight, t_80, t_rome, t_corn, t_turn, t_43 = S('When it gets tight'), S('Eight of the 24'), S('In Rome'), S('three corners'), S('turned it into'), E('4-3 win.')
t_wk, t_six, t_end, t_can = S('The weak spot?'), S('Six goals'), S('Eight in a row.'), S('Can anyone')
for i, (pid, role, nm, x, y) in enumerate(XI):
    pieces.append(piece('e_' + pid, 'A', role, nm, [[0, x, y]], on=[t_tight - .3, END + 1], hi=[(t_wk, t_end)] if pid in ('val', 'kon', 'hui', 'cuc') else None))

ball = [[0, 52, 34], [t_cl, 52, 34], [t_du - .1, 31, 8], [t_wb2 + .7, 46, 28], [t_mb + .9, 67, 33],
        [t_nw - .3, 51, 29], [t_bl + .5, 49, 32], [t_bt + .2, 51, 34], [t_ag + .25, 58, 46], [t_ec + .35, 64, 25], [t_ec + .8, 71, 24], [t_ec + 1.3, 79, 23],
        [t_ec + 1.8, 86, 22], [t_sq + .25, 96, 36], [t_en + .05, 104.3, 34], [t_tight - .2, 52.5, 34]]
ball_on = [t_cl - .2, t_7 + .3]

arrows = [
    {'t0': t_du - .5, 't1': t_38, 'from': [52, 34], 'to': [31, 9], 'kind': 'pass', 'bend': -3},
    {'t0': t_du, 't1': E('wide men.') + .6, 'from': [18, 15], 'to': [29, 9], 'kind': 'press'}, {'t0': t_du + .1, 't1': E('wide men.') + .6, 'from': [24, 11], 'to': [30, 7], 'kind': 'press'},
    {'t0': t_du + .2, 't1': E('wide men.') + .6, 'from': [18, 53], 'to': [29, 59], 'kind': 'press'}, {'t0': t_du + .3, 't1': E('wide men.') + .6, 'from': [24, 57], 'to': [30, 61], 'kind': 'press'},
    {'t0': t_mb, 't1': end_ball, 'from': [82, 32], 'to': [69.5, 33], 'kind': 'run'},
    {'t0': t_mb + .5, 't1': end_ball, 'from': [46, 28], 'to': [66, 33], 'kind': 'pass'},
    {'t0': t_drag + .1, 't1': end_ball, 'from': [84, 28], 'to': [74.5, 30.5], 'kind': 'press'},
    {'t0': t_jb, 't1': end_ball, 'from': [64, 38], 'to': [85, 34], 'kind': 'run', 'bend': -2},
    {'t0': t_cu, 't1': end_ball, 'from': [42, 10], 'to': [81, 7], 'kind': 'run', 'bend': -3},
    {'t0': t_ag, 't1': t_en + 1.0, 'from': [51, 34], 'to': [57.5, 45], 'kind': 'pass'},
    {'t0': t_ec, 't1': t_en + 1.0, 'from': [58, 45], 'to': [65, 26], 'kind': 'pass'},
    {'t0': t_ec + .1, 't1': t_en + 1.0, 'from': [56, 24], 'to': [87, 22], 'kind': 'run'},
    {'t0': t_ec + .5, 't1': t_en + 1.0, 'from': [69, 40], 'to': [96, 36], 'kind': 'run', 'bend': 2},
    {'t0': t_sq, 't1': t_en + 1.0, 'from': [88, 22.5], 'to': [96, 35], 'kind': 'pass'},
    {'t0': t_en - .05, 't1': t_9 + .8, 'from': [97, 36], 'to': [104.5, 34], 'kind': 'shot', 'draw': .3}]
marks = [
    {'t0': S('Aurélien'), 't1': E('never exposed.') + .2, 'kind': 'zone', 'x': 30, 'y': 22, 'w': 12, 'h': 24, 'fill': 'rgba(31,95,219,.16)', 'stroke': '#1F5FDB'},
    {'t0': t_du + .2, 't1': E('wide men.') + .6, 'kind': 'ring', 'x': 31, 'y': 7, 'r': 4.5}, {'t0': t_du + .3, 't1': E('wide men.') + .6, 'kind': 'ring', 'x': 31, 'y': 61, 'r': 4.5},
    {'t0': E('with him.'), 't1': end_ball, 'kind': 'zone', 'x': 76, 'y': 24, 'w': 13, 'h': 17, 'fill': 'rgba(31,95,219,.14)', 'stroke': '#1F5FDB'},
    {'t0': t_late + .6, 't1': end_ball, 'kind': 'dot', 'x': 86, 'y': 34},
    {'t0': t_wk, 't1': t_end - .1, 'kind': 'zone', 'x': 0.6, 'y': 13.8, 'w': 16.5, 'h': 40.3, 'fill': 'rgba(229,72,77,.16)', 'stroke': '#E5484D'}]

cam = [[0, 52.5, 34, .9, 38, 0], [t_in, 46, 34, 1.0, 40, -3, 3.0], [S("It's five"), 52.5, 34, .86, 52, 0, 1.2],
       [S('The base is'), 34, 34, 1.15, 36, 0, 1.4], [t_wb, 40, 34, .98, 40, 0, 1.4], [t_38, 58, 34, .98, 40, 0, 1.2],
       [t_wb2, 66, 34, 1.05, 38, 0, 1.4], [t_nw - .3, 58, 35, 1.12, 38, 0, 1.0], [t_ec, 74, 30, 1.2, 38, 0, 1.4], [t_sq - .2, 88, 32, 1.35, 38, 0, 1.2],
       [t_9, 90, 35, 1.65, 40, 0, 1.4], [t_tight - .2, 52.5, 34, .84, 54, 0, 1.4], [t_wk, 30, 34, 1.1, 40, 0, 1.3], [t_end, 52.5, 34, .86, 34, -5, 2.4]]

# ---------------------------------------------------------------- panels (flat cards over the board)
C = lambda left, top, extra='': {'left': f'{left}px', 'top': f'{top}px', **({'width': extra} if extra else {})}
full = {'left': '0px', 'width': '1920px', 'textAlign': 'center'}
panels = []
t_go = t_in - .08
for i, (txt, top, a) in enumerate([('8 GAMES', 130, S('Eight games.')), ('8 <b>WINS</b>', 350, S('Eight wins.')), ('<b>24</b> GOALS', 570, S('Twenty-four goals.'))]):
    panels.append({'t0': a - .05, 't1': t_go, 'html': f'<div class="ttl" style="font-size:200px">{txt}</div>', 'style': {**full, 'top': f'{top}px'}})
panels.append({'t0': t_in, 't1': E('nobody can beat.') + .35, 'html': '<div class="kick">José Mourinho\'s Real Madrid</div><div class="ttl" style="margin-top:18px;font-size:112px">THE TEAM <b>NOBODY CAN BEAT</b></div>', 'style': {**full, 'top': '58px'}})
RUN = [('Villarreal', '1-0', 'Home · LaLiga · 10 Oct'), ('Roma', '4-3', 'Away · UCL · 14 Oct'), ('Sevilla', '4-1', 'Home · LaLiga · 18 Oct'), ('RB Leipzig', '4-1', 'Home · UCL · 21 Oct'),
       ('Barcelona', '2-1', 'Away · LaLiga · 25 Oct'), ('Racing', '3-0', 'Away · LaLiga · 1 Nov'), ('AEK Athens', '3-2', 'Away · UCL · 4 Nov'), ('Valencia', '3-0', 'Away · LaLiga · 7 Nov')]
t_f, t_f1 = S("It's five"), E('still alive.') + .35
panels.append({'t0': t_f - .1, 't1': t_f1, 'html': '<div class="kick">The run · 5 in LaLiga · 3 in the Champions League</div>', 'style': {**full, 'top': '62px'}})
for i, (o, sc, d) in enumerate(RUN):
    panels.append({'t0': t_f + i * .17, 't1': t_f1, 'style': C(115 + (i % 4) * 430, 130 + (i // 4) * 330),
                   'html': f'<div class="form"><div class="m"><span class="r w">W&nbsp;&nbsp;{sc}</span><div class="o">{o}</div><div class="d">{d}</div></div></div>'})
panels.append({'t0': S('4-2-3-1'), 't1': E('never exposed.') + .2, 'style': C(90, 70),
               'html': '<div class="card" style="padding:24px 34px"><div class="kick" style="color:#1F5FDB">The base</div><div style="font:400 110px/1 Anton,sans-serif;margin-top:8px">4-2-3-1</div></div>'})
panels.append({'t0': S('Aurélien'), 't1': E('never exposed.') + .2, 'style': C(1290, 70),
               'html': '<div class="card" style="padding:24px 34px;width:500px"><div class="kick" style="color:#1F5FDB">The double pivot</div><div style="font:800 38px/1.25 Man,sans-serif;margin-top:12px">Tchouaméni + Bernardo, <b style="color:#1F5FDB">side by side</b> in front of the back four</div></div>'})
panels.append({'t0': t_cl, 't1': E('wide men.') + .5, 'style': C(90, 70),
               'html': '<div class="card" style="padding:24px 34px"><div class="kick" style="color:#1F5FDB">The Clásico · 25 Oct</div><div style="font:400 64px/1.05 Anton,sans-serif;margin-top:10px">MID-TO-LOW BLOCK</div><div style="font:800 30px/1.3 Man,sans-serif;margin-top:8px;color:rgba(11,31,68,.7)">Wingers tucked back to double up on Yamal and Gordon</div></div>'})

def stat(l, a, b, wa, wb):
    return (f'<div class="stat"><div class="v">{a}</div><div><div class="l">{l}</div><div class="tr"><i data-w="{wa}" style="left:0;background:#0B1F44"></i>'
            f'<i data-w="{wb}" style="right:0;background:#A50044"></i></div></div><div class="v" style="color:#A50044">{b}</div></div>')
panels.append({'t0': t_38, 't1': E('better chances.') + .4, 'bars': 1, 'style': C(1080, 80),
               'html': '<div class="card" style="width:700px;padding:30px 40px"><div class="kick" style="color:#1F5FDB">Barcelona 1-2 Real Madrid</div>'
                       '<div style="display:flex;justify-content:space-between;font:400 40px/1 Anton,sans-serif;margin:18px 0 4px"><span>MADRID</span><span style="color:#A50044">BARÇA</span></div>'
                       + stat('Possession', '38%', '62%', 38, 62) + stat('xG', '1.98', '1.26', 61, 39) + stat('Counters', '5', '2', 71, 29) + '</div>'})
panels.append({'t0': t_wb2, 't1': end_ball, 'style': C(90, 70),
               'html': '<div class="card" style="padding:24px 34px;max-width:620px"><div class="kick" style="color:#1F5FDB">With the ball</div><div style="font:400 64px/1.05 Anton,sans-serif;margin-top:10px">IT STARTS IN THE MIDDLE</div></div>'})
panels.append({'t0': t_nw - .1, 't1': t_en + 1.0, 'style': C(90, 56), 'html': '<div style="display:inline-block" class="card"><div style="padding:16px 34px;font:400 52px/1 Anton,sans-serif">THE CLÁSICO WINNER · <span style="color:#1F5FDB">87\'</span></div></div>'})
panels.append({'t0': S('goals for Mbappé') - .05, 't1': t_7 + .35, 'style': C(90, 110),
               'html': '<div class="card" style="padding:30px 40px;width:520px"><div class="kick" style="color:#1F5FDB">Kylian Mbappé · the run</div>'
                       '<div style="display:flex;align-items:baseline;gap:22px;margin-top:14px"><span style="font:400 170px/1 Anton,sans-serif;color:#1F5FDB">9</span><span style="font:800 34px/1.2 Man,sans-serif">goals</span></div>'
                       '<div style="display:flex;align-items:baseline;gap:22px"><span style="font:400 170px/1 Anton,sans-serif;color:#1F5FDB">7</span><span style="font:800 34px/1.2 Man,sans-serif">straight games<br>with a goal</span></div></div>'})
panels.append({'t0': t_tight - .05, 't1': t_80 - .1, 'style': {**full, 'top': '150px'},
               'html': '<div class="kick">When it gets tight</div><div class="ttl" style="margin-top:18px">THE BENCH <b>DECIDES IT</b></div>'})
dots = ''.join(f'<i style="display:inline-block;width:40px;height:40px;border-radius:50%;margin:6px;background:{"#1F5FDB" if k >= 16 else "#C5D3EC"}"></i>' for k in range(24))
panels.append({'t0': t_80, 't1': t_rome - .1, 'style': C(120, 150),
               'html': f'<div class="card" style="padding:34px 44px;width:760px"><div style="font:400 96px/1 Anton,sans-serif"><b style="color:#1F5FDB;font-weight:400">8</b> OF 24 GOALS</div>'
                       f'<div class="kick" style="color:#1F5FDB;margin:14px 0 18px">in the 80th minute or later</div><div style="width:624px">{dots}</div></div>'})
def score(m):
    return (f'<div class="card score" style="padding:26px 44px"><span class="bar" style="background:#8E1F2F"></span><span class="t">ROMA</span><span class="n">3</span>'
            f'<span class="n" style="color:rgba(11,31,68,.35)">–</span><span class="n" style="color:#1F5FDB">{m}</span><span class="t">REAL MADRID</span>'
            f'<span class="bar" style="background:#FFFFFF;box-shadow:0 0 0 4px #0B1F44"></span></div>')
panels.append({'t0': t_rome - .05, 't1': t_43 + .9, 'html': '<div class="kick">Champions League · Rome · 14 Oct</div>', 'style': C(124, 120)})
panels.append({'t0': t_rome, 't1': t_turn, 'html': score(1), 'style': C(120, 180)})
panels.append({'t0': t_turn, 't1': t_43 + .9, 'html': score(4), 'style': C(120, 180)})
for i, (mn, nm) in enumerate([("83'", 'ESPÍ'), ("85'", 'ENDRICK'), ("90'", 'RÜDIGER')]):
    panels.append({'t0': t_corn + i * .3, 't1': t_43 + .9, 'style': C(120 + i * 330, 420),
                   'html': f'<div class="card" style="padding:20px 28px;width:244px"><div style="font:400 64px/1 Anton,sans-serif;color:#1F5FDB">{mn}</div>'
                           f'<div style="font:400 44px/1.1 Anton,sans-serif;margin-top:6px">{nm}</div><div class="kick" style="color:rgba(11,31,68,.55);font-size:20px;margin-top:8px">from a corner</div></div>'})
panels.append({'t0': t_wk - .05, 't1': t_end - .1, 'style': C(1110, 90),
               'html': '<div class="card" style="padding:30px 40px;width:640px"><div class="kick" style="color:#E5484D">The weak spot</div>'
                       '<div style="display:flex;align-items:baseline;gap:22px;margin-top:10px"><span style="font:400 180px/1 Anton,sans-serif;color:#E5484D">6</span><span style="font:800 34px/1.25 Man,sans-serif">conceded in 3<br>Champions League games</span></div>'
                       '<div style="display:flex;gap:14px;margin-top:16px">' + ''.join(
                           f'<div style="flex:1;padding:14px 16px;border-radius:16px;background:#F1F4FA"><div style="font:400 40px/1 Anton,sans-serif">{o}</div><div style="font:800 24px/1.3 Man,sans-serif;color:#E5484D;margin-top:6px">{c} conceded</div></div>'
                           for o, c in [('Roma 4-3', 3), ('Leipzig 4-1', 1), ('AEK 3-2', 2)]) + '</div></div>'})
panels.append({'t0': t_end - .05, 't1': END + 1, 'html': '<div class="ttl" style="font-size:170px">8 IN A <b>ROW</b></div>', 'style': {**full, 'top': '200px'}})
for i in range(8):
    panels.append({'t0': t_end + .25 + i * .09, 't1': END + 1, 'style': C(318 + i * 166, 420),
                   'html': '<div style="width:140px;height:140px;border-radius:26px;background:#15803D;color:#fff;font:400 92px/140px Anton,sans-serif;text-align:center;box-shadow:0 18px 40px rgba(0,0,0,.35)">W</div>'})
panels.append({'t0': t_can - .05, 't1': END + 1, 'html': '<div class="ttl" style="font-size:100px">CAN ANYONE <b>STOP THEM?</b></div><div class="kick" style="margin-top:26px">Follow for more football, by the numbers</div>', 'style': {**full, 'top': '640px'}})

flags = [{'t': t_en, 'text': 'CHECKMATE', 'dur': round(min(1.7, t_9 - t_en - .15), 2)}]
KEY = {'mourinhos', 'mbappe', 'bellingham', 'tchouameni', 'bernardo', 'silva', 'cucurella', 'guler', 'camavinga', 'clasico', 'clasico,', 'rome,'}
plan = {'vo': 0.2, 'cut': cut, 'gap': 0.6, 'end': END, 'sroot': 'file:///home/user/cmv-alphascanner/video/out/reactions/',
        'teams': {'A': {'color': '#FFFFFF', 'ink': '#0B1F44'}, 'B': {'color': '#A50044', 'ink': '#004D98'}, 'C': {'color': '#2E3A57', 'ink': '#FFFFFF'}},
        'boardOn': [t_in + .3, t_end - .35], 'names': [S('The base is'), t_7], 'cam': cam, 'pieces': pieces, 'ball': ball, 'ballOn': ball_on,
        'arrows': arrows, 'marks': marks, 'flags': flags, 'panels': panels, 'caps': tk.caps(KEY),
        'flow': {'width': 340, 'idle': {'id': 'stare', 'a': 40, 'b': 110, 'speed': 0.7},
                 'segments': [{'from': round(t_wb2 - .1, 3), 'to': round(end_ball - .2, 3), 'ANCHOR': 'ball', 'lean': 2,
                               'beats': [{'at': 'with him', 'id': 'hmm', 'kind': 'soft', 'away': -1, 'hold': 2.8}]}]},
        'flow2': {'width': 340, 'idle': {'id': 'sideeye_full', 'a': 0, 'b': 50, 'speed': 0.6},
                  'segments': [{'from': round(t_rome - .2, 3), 'to': round(t_43 + 2.4, 3), 'ANCHOR': 'late', 'lean': -2,   # plays out under the weak-spot card
                                'beats': [{'at': '4-3 win', 'id': 'jawdrop_full', 'kind': 'hard', 'away': 1, 'hold': 2.6}]}]}}
write(plan, OUT, tk, {'ball': 't => ({ x: 46, y: 952, rot: 0, hide: [-520, 0], z: 20 })', 'late': 't => ({ x: 1530, y: 952, rot: 0, hide: [520, 0], z: 20 })'})
print('cut', cut, 'end', round(END, 2), 'video', round(END + .8, 2), 'caps', len(plan['caps']), 'pieces', len(pieces))
