"""Sunderland 1-0 Chelsea (Premier League, 8 Nov 2026), on the 3D board: page/plan.js + page/words.js from the take's
word times (take seconds; every cue is a phrase Lara says, so a new take only needs a re-run).
  python3 -I gen.py <words_script.json> <page dir>
Facts and sources: sources.md. Positions are illustrative (from match reports, not tracking data); the board says so.
Pitch: x along the pitch, Sunderland's goal at -52.5 (they attack +x), Chelsea's at +52.5; z across. For Sunderland
(facing +x) their right is +z; for Chelsea (facing -x) their right is -z."""
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
            if nth == 0:
                if len(re.findall(r'[.?!]', phrase.rstrip('.?!”" '))) < sum(bool(re.search(r'[.?!]["”]?$', W[j]['w'])) for j in range(a, b)):
                    print(f'WARNING cue crosses a sentence end: {phrase!r} -> ' + ' '.join(W[j]['w'] for j in range(a, b + 1)))
                return round(W[a]['s'] if edge == 'start' else W[b]['e'], 3)
            nth -= 1
        pos = k + 1
S = lambda p, n=0: at(p, n, 'start')
E = lambda p, n=0: at(p, n, 'end')
r3 = lambda x: round(x, 3)
CUT = r3((E('bottom of the table.') + S('Sunderland one,')) / 2)

# ---------------------------------------------------------------- pieces
PC = {}
def piece(pid, team, role, name, x, z, **kw):
    PC[pid] = dict(id=pid, team=team, role=role, name=name, keys=[[0, x, z]], lab=[], hi=[], **kw)
def mv(pid, t0, t1, x, z):
    k = PC[pid]['keys']; last = k[-1]; t0 = max(t0, last[0] + .01); t1 = max(t1, t0 + .05)
    if t0 > last[0] + 1e-3: k.append([r3(t0), last[1], last[2]])
    k.append([r3(t1), x, z])
def shape(t0, dur, pos):
    for pid, (x, z) in pos.items(): mv(pid, t0, t0 + dur, x, z)
def lab(pid, a, b): PC[pid]['lab'].append([r3(a), r3(b)])
def hi(pid, a, b): PC[pid]['hi'].append([r3(a), r3(b)])

H, A = 'home', 'away'   # home = Sunderland, away = Chelsea
# Sunderland 4-2-3-1 (Le Bris): Roefs; Meunier, Mukiele, O'Nien, Reinildo; Ahoka (Xhaka off on 4'), Sadiki; Hume, Le Fée, Talbi; Brobbey
piece('roefs', H, 'GK', 'Roefs', -49, 0); piece('meunier', H, 'RB', 'Meunier', -36, 21); piece('mukiele', H, 'CB', 'Mukiele', -37, 7)
piece('onien', H, 'CB', "O'Nien", -37, -7); piece('reinildo', H, 'LB', 'Reinildo', -36, -21); piece('ahoka', H, 'CM', 'Ahoka', -25, 6)
piece('sadiki', H, 'CM', 'Sadiki', -25, -6); piece('hume', H, 'RM', 'Hume', -13, 20); piece('lefee', H, 'AM', 'Le Fée', -12, 0)
piece('talbi', H, 'LM', 'Talbi', -13, -20); piece('brobbey', H, 'ST', 'Brobbey', -3, 0, names=[])
# Chelsea 4-3-3 (Alonso): Penders; Palestra, Fofana, Colwill, Chavarría; Lavia, Caicedo, Henderson; Palmer, Neto (central), Rogers
piece('penders', A, 'GK', 'Penders', 49, 0); piece('palestra', A, 'RB', 'Palestra', 36, -21); piece('fofana', A, 'CB', 'Fofana', 37, -7)
piece('colwill', A, 'CB', 'Colwill', 37, 7); piece('chavarria', A, 'LB', 'Chavarría', 36, 21); piece('caicedo', A, 'DM', 'Caicedo', 25, 0)
piece('lavia', A, 'CM', 'Lavia', 17, -9); piece('henderson', A, 'CM', 'Henderson', 17, 9); piece('palmer', A, 'RW', 'Palmer', 9, -21)
piece('neto', A, 'ST', 'Neto', 3, 0, names=[]); piece('rogers', A, 'LW', 'Rogers', 9, 21)
piece('estevao', A, 'RW', 'Estêvão', 9, -26)          # on at half-time for Colwill (only visible from then)

BALL, ARR, ZON, UI, GOALS = [], [], [], [], []
def ball(t, x, z, peak=0): BALL.append([r3(t), x, z, peak])
def arrow(**o): o['at'] = r3(o['at']); o['until'] = r3(o['until']); ARR.append(o)
def zone(x, z, w, h, a, b, color='#4FB3FF', op=.5): ZON.append(dict(at3=[x, z], size=[w, h], **{'from': r3(a), 'to': r3(b)}, color=color, op=op))
def ui(**o):
    o['from'] = r3(o['from'])
    if o.get('to') is not None: o['to'] = r3(o['to'])
    UI.append(o)
RED, WHITE, SKY, BLUEP = '#ff6b7f', '#ffffff', '#9FD3FF', '#7fb6ff'
CAM = []
def cam(t, pos, tgt, fov=26): CAM.append([r3(t), pos, tgt, fov])
def cut(t, pos, tgt, fov=26):          # a clean cut: hold the previous shot until just before t
    prev = sorted(CAM, key=lambda c: c[0]); last = [c for c in prev if c[0] < t - .05][-1]
    CAM.append([r3(t - .034), last[1], last[2], last[3]]); CAM.append([r3(t), pos, tgt, fov])

# ================================================================ 1. COLD OPEN: Chelsea keep the ball, and lose
t_end_cold = CUT
cam(0, [-60, 16, 58], [-10, 0, 0], 28); cam(4.2, [-20, 13, 52], [12, 0, 0], 28); cam(CUT - .05, [18, 15, 52], [24, 0, 0], 28)
seq = [('colwill', 0.3), ('caicedo', 1.3), ('fofana', 2.3), ('palestra', 3.2), ('lavia', 4.1), ('henderson', 5.0), ('chavarria', 6.0), ('colwill', 7.0), ('caicedo', 8.0), ('lavia', 9.0)]
pos0 = {k: (v['keys'][0][1], v['keys'][0][2]) for k, v in PC.items()}
ball(0, 37, 7)
for pid, t in seq: x, z = pos0[pid]; ball(t, x - 1.2, z + .4)
for i in range(1, len(seq)): a, b = seq[i - 1], seq[i]; arrow(from_=None, **{'from': [pos0[a[0]][0] - 1.2, pos0[a[0]][1] + .4], 'to': [pos0[b[0]][0] - 1.2, pos0[b[0]][1] + .4]}, h=1.2, at=a[1] + .05, until=b[1] + .5, color=SKY, r=.16)
for a in ARR: a.pop('from_', None)
ui(type='giant', text='68.7%', sub='possession', **{'from': S('Sixty-nine'), 'to': E('ball.') + .2}, y=330)
ui(type='giant', text='648', sub='passes', **{'from': S('Six hundred'), 'to': E('passes.') + .25}, y=330)
ui(type='giant', text='Lost', sub='to the side at the bottom of the table', **{'from': S('lost,'), 'to': CUT - .1}, y=330)

# ================================================================ 2. TITLE on the drop
t_title = CUT - .002
cam(t_title + .01, [18, 15, 52], [24, 0, 0], 28); cam(S('Sunderland one,') + 1.4, [0, 92, 74], [0, -3, 0], 30)
ui(type='title', kick='Premier League · Stadium of Light · Sun 8 Nov 2026', score='1–0', why='Why Chelsea lost', **{'from': t_title + .05, 'to': E("Here's why.") + .3})
ui(type='bug', score=[[0, '0–0'], [E('wrong way.') + .1, '1–0']], **{'from': S('Régis') - .1})
ui(type='note', text='Positions illustrative · from match reports', **{'from': S('Régis'), 'to': S('Chelsea had the ball.') - .2})

# ================================================================ 3. LINE-UPS
t3 = S('Régis')
cam(t3, [0, 92, 74], [0, -3, 0], 30); cam(S('Xabi Alonso went') - .2, [-10, 70, 70], [-4, -3, 0], 30); cam(S('with João'), [30, 60, 66], [18, -2, 0], 30)
ui(type='coach', text='Le Bris · 4-2-3-1', sub='Sunderland', team=H, x=150, y=150, **{'from': S('Régis') + .3, 'to': S('Reason one:') - .3})
ui(type='coach', text='Alonso · 4-3-3', sub='Chelsea', team=A, x=1230, y=150, **{'from': S('Xabi Alonso went'), 'to': S('Reason one:') - .3})
ui(type='chip', text='João Pedro: <b>out</b>', x=1300, y=290, **{'from': S('with João'), 'to': S('Reason one:') - .3})
for pid in PC:
    if pid == 'estevao': continue
    if PC[pid]['team'] == H: lab(pid, S('Régis') + .6, S('Xabi Alonso went') + .2)
    else: lab(pid, S('Xabi Alonso went') + .3, S('Pedro Neto through') - .2)
lab('neto', S('Pedro Neto through'), S('Reason one:') - .2); hi('neto', S('Pedro Neto through'), S('Reason one:') - .2)

# ================================================================ 4. REASON 1: THE PRESS
t4 = S('Reason one:')
ui(type='giant', text='Reason 1', sub='the press', **{'from': t4, 'to': E('the press.') + .3}, y=360)
build = {'penders': (49, 0), 'fofana': (43, -12), 'colwill': (43, 12), 'palestra': (34, -26), 'chavarria': (34, 26), 'caicedo': (36, 0),
         'lavia': (28, -10), 'henderson': (28, 10), 'palmer': (16, -24), 'neto': (12, 0), 'rogers': (16, 24),
         'roefs': (-44, 0), 'meunier': (-16, 18), 'mukiele': (-20, 6), 'onien': (-20, -6), 'reinildo': (-16, -18),
         'ahoka': (6, 8), 'sadiki': (6, -8), 'hume': (14, 20), 'lefee': (16, 0), 'talbi': (14, -20), 'brobbey': (24, 0)}
shape(t4 - .2, 1.3, build)
press = {'brobbey': (38.5, -8.5), 'lefee': (32, 2), 'hume': (37, 18), 'talbi': (31, -20), 'ahoka': (26, 7), 'sadiki': (25, -8),
         'meunier': (-4, 18), 'mukiele': (-8, 6), 'onien': (-8, -6), 'reinildo': (-4, -18), 'roefs': (-38, 0)}
th = S('harried')
shape(th - .3, 1.4, press)
cut(t4, [84, 56, 40], [30, 0, 0], 28); cam(th, [82, 52, 34], [32, 0, 0], 28); cam(S('In the first twenty'), [76, 60, 44], [28, 0, 0], 28)
ball(t4, 48.2, .5); ball(th - .1, 48.2, .5); ball(th + .45, 41.8, -11.5); ball(S('Chelsea lost') - .2, 41.8, -11.5); ball(S('Chelsea lost') + .35, 34.8, .4)
ball(S('sixty-three') + .3, 33.4, 1.6); ball(S('sixty-three') + .7, 31.5, 2.6)
arrow(**{'from': [48.2, .5], 'to': [41.8, -11.5]}, h=1, at=th - .1, until=S('Chelsea lost'), color=SKY, r=.16)
arrow(**{'from': [41.8, -11.5], 'to': [34.8, .4]}, h=1, at=S('Chelsea lost') - .2, until=S('sixty-three') + .4, color=SKY, r=.16)
for pid, (x, z) in [('brobbey', (38.5, -8.5)), ('lefee', (32, 2)), ('talbi', (31, -20)), ('hume', (37, 18))]:
    arrow(kind='run', **{'from': [build[pid][0], build[pid][1]], 'to': [x - 1.2 if pid != 'talbi' else x, z]}, bend=.15, at=th - .25, until=S('Chelsea lost') + .5, color=RED)
zone(42, -11, 9, 9, th + .3, S('Chelsea lost'), RED, .45); zone(36, 0, 9, 9, S('Chelsea lost'), S('In the first twenty') + .2, RED, .45)
ui(type='stat', big='63%', label='of their first-half duels: lost', src='Chelsea · Sky Sports', x=100, y=140, **{'from': S('sixty-three'), 'to': S('In the first twenty') - .1}, color='#b30c25')
t_twenty = S('In the first twenty')
for pid in ['caicedo', 'lavia', 'henderson', 'palmer', 'neto', 'rogers']:
    zone(build[pid][0], build[pid][1], 7, 7, S('not one of') - .1, E('a tackle.'), RED, .4); lab(pid, S('not one of'), E('a tackle.'))
ui(type='stat', big='0', label='duels or tackles won by Chelsea’s midfielders and attackers, first 20 minutes', src='Sky Sports', x=100, y=140, **{'from': t_twenty, 'to': E('a tackle.') + .2}, color='#b30c25')

# ================================================================ 5. REASON 2: THE DIRECT ROUTE
t5 = S('Reason two:')
ui(type='giant', text='Reason 2', sub='the direct route', **{'from': t5, 'to': E('direct route.') + .3}, y=360)
mid = {'penders': (49, 0), 'fofana': (30, -6), 'colwill': (30, 6), 'palestra': (24, -24), 'chavarria': (24, 24), 'caicedo': (14, 0),
       'lavia': (6, -10), 'henderson': (6, 10), 'palmer': (-8, -22), 'neto': (-10, 0), 'rogers': (-8, 22),
       'roefs': (-48, 0), 'meunier': (-30, 18), 'mukiele': (-32, 6), 'onien': (-32, -6), 'reinildo': (-30, -18),
       'ahoka': (-14, 7), 'sadiki': (-4, -4), 'hume': (2, 22), 'lefee': (6, 0), 'talbi': (2, -22), 'brobbey': (22, 3)}
shape(t5 - .2, 1.4, mid)
cut(t5, [-6, 34, 60], [14, 0, 0], 27); cam(S('they went long'), [-4, 34, 60], [15, 0, 0], 27); cam(S('they went long') + 1.5, [12, 27, 54], [28, 0, 3], 27)
tw = S('When Sunderland won'); tl = S('they went long')
ball(tw, -4.5, -3.2); ball(tl, -4.5, -3.2); ball(tl + 1.3, 39, 8.5, 11)
arrow(**{'from': [-4.5, -3.2], 'to': [39, 8.5]}, h=11, at=tl, until=S('On the left,') - .1, color=WHITE, r=.2)
mv('brobbey', tl - .1, tl + 1.35, 38.5, 8.8); mv('colwill', tl + .3, tl + 1.5, 35.5, 7.5); mv('fofana', tl + .2, tl + 1.4, 34, -2)
arrow(kind='run', **{'from': [22, 3], 'to': [37.5, 8.6]}, bend=-.2, at=tl - .1, until=S('On the left,') - .1, color=RED)
for pid in ['brobbey', 'colwill', 'fofana']: lab(pid, S('Brian Brobbey'), E('Fofana.') + .3)
hi('brobbey', S('Brian Brobbey'), E('Fofana.') + .3)
# Talbi v Palestra, then the 14th-minute chance
tL = S('On the left,')
wing = {'talbi': (26, -24), 'palestra': (31, -21), 'brobbey': (34, -1), 'fofana': (40, -5), 'colwill': (40, 6), 'penders': (51, 0), 'lefee': (24, 4), 'hume': (28, 18),
        'caicedo': (34, 3), 'chavarria': (38, 16), 'lavia': (26, -8), 'henderson': (24, 10)}
shape(tL - .3, 1.2, wing)
ball(tL - .3, 39, 8.5); ball(tL + .9, 26.8, -23.5)
cut(tL, [18, 26, -68], [36, 0, -12], 27); cam(S('Talbi crossed,') - .4, [84, 30, -34], [42, 0, -10], 28)
tb = S('beat Palestra'); mv('talbi', tb, tb + 1.6, 45.5, -26.5); mv('palestra', tb + .2, tb + 1.7, 42, -23.5)
ball(tb, 26.8, -23.5); ball(tb + 1.6, 45, -26)
arrow(kind='run', **{'from': [26, -24], 'to': [44.5, -26.5]}, bend=.1, at=tb, until=S('Talbi crossed,') + .2, color=RED)
for pid in ['talbi', 'palestra']: lab(pid, tL + .2, E('one on one.') + .2); hi('talbi', tb, E('one on one.'))
ui(type='chip', text="<b>14'</b>", x=960, y=120, anchor='c', **{'from': S('On fourteen'), 'to': E('close range.') + .2})
tc = S('Talbi crossed,'); mv('brobbey', tc - .3, tc + .7, 46.5, -3.5); mv('fofana', tc, tc + .9, 45, -6.5)
ball(tc, 45, -26); ball(tc + .7, 46.4, -3.6, 4); tv = S('volleyed wide'); ball(tv, 46.4, -3.6); ball(tv + .45, 55, 6.5, 1.6)
arrow(**{'from': [45, -26], 'to': [46.4, -3.6]}, h=4, at=tc, until=E('close range.') + .2, color=WHITE, r=.18)
arrow(**{'from': [46.4, -3.6], 'to': [55, 6.5]}, h=1.6, at=tv, until=E('close range.') + .3, color=SKY, r=.18)
lab('brobbey', tc, E('close range.') + .2); hi('brobbey', tv, E('close range.') + .2); lab('talbi', S('On fourteen'), E('close range.') + .2)

# ================================================================ 6. THE GOAL: 36', the drag, the penalty
t6 = S('Then, thirty-six')
ui(type='chip', text="<b>36'</b>", x=960, y=120, anchor='c', **{'from': S('thirty-six'), 'to': E('One-nil.') + .3})
g = {'penders': (49, 0), 'fofana': (30, -5), 'colwill': (30, 9), 'palestra': (27, -22), 'chavarria': (26, 24), 'caicedo': (18, 2),
     'lavia': (12, -8), 'henderson': (12, 10), 'palmer': (-4, -20), 'neto': (-6, 0), 'rogers': (-4, 20),
     'roefs': (-48, 0), 'meunier': (-28, 18), 'mukiele': (-30, 6), 'onien': (-30, -6), 'reinildo': (-28, -18),
     'ahoka': (-6, 8), 'sadiki': (-10, -6), 'hume': (4, 20), 'lefee': (6, 0), 'talbi': (4, -20), 'brobbey': (24, 12)}
shape(t6 - .3, 1.3, g)
ball(t6 - .3, 45, -26); ball(t6 + 1.0, -6.6, 8.4)
cut(t6, [6, 30, 62], [20, 0, 6], 27); tA = S('A long ball'); cam(tA, [14, 22, 56], [30, 0, 8], 27)
ball(tA, -6.6, 8.4); ball(tA + 1.25, 37.8, 13.8, 12)
arrow(**{'from': [-6.6, 8.4], 'to': [37.8, 13.8]}, h=12, at=tA, until=S('He spins') + .2, color=WHITE, r=.2)
mv('brobbey', tA - .1, tA + 1.3, 37, 13.6); mv('colwill', tA + .3, tA + 1.4, 34.5, 11.5); mv('fofana', tA + .3, tA + 1.4, 33, -1)
arrow(kind='run', **{'from': [24, 12], 'to': [36.5, 13.5]}, bend=-.1, at=tA - .1, until=S('He spins') + .2, color=RED)
tsp = S('He spins'); cam(tsp, [28, 14, 38], [38, 3, 10], 30)
mv('brobbey', tsp, tsp + .55, 39.5, 15.2); mv('brobbey', tsp + .55, tsp + 1.1, 41, 10.5); mv('colwill', tsp + .1, tsp + 1.0, 38.4, 12.6)
ball(tsp, 37.8, 13.8); ball(tsp + 1.1, 42.2, 10.2)
arrow(kind='run', **{'from': [37.2, 13.8], 'to': [41, 10.2]}, bend=.9, at=tsp, until=S('drags him back') + .3, color=RED)
for pid in ['brobbey', 'colwill']: lab(pid, tA + .3, S('Penalty.') + .4)
td = S('drags him back'); mv('colwill', td - .2, td + .35, 40.3, 11.0); mv('brobbey', td, td + .5, 40.7, 10.8)
PC['brobbey']['tilt'] = [[0, 0, 0], [r3(td), 0, 0], [r3(td + .35), 0, .16], [r3(S('Penalty.') + .8), 0, .16], [r3(S('Le Fay') - .1), 0, 0]]
PC['colwill']['tilt'] = [[0, 0, 0], [r3(td - .1), 0, 0], [r3(td + .3), 0, -.12], [r3(S('Penalty.') + .8), 0, -.12], [r3(S('Le Fay') - .1), 0, 0]]
hi('colwill', td, S('Le Fay') - .2)
zone(40.5, 10.9, 8, 8, td, S('Le Fay') - .2, RED, .55)
ui(type='giant', text='Penalty', **{'from': S('Penalty.'), 'to': S('Le Fay') - .25}, y=360)
ui(type='flash', **{'from': S('Penalty.') - .05})
# the kick
tk = S('Le Fay')
# everyone else waits outside the box and out of the shot (the camera looks over the taker's left shoulder)
pen = {'lefee': (40.2, 0), 'penders': (52.2, 0), 'brobbey': (36, 12), 'colwill': (36.5, -14), 'fofana': (35.5, 16), 'caicedo': (33.5, 9),
       'henderson': (33, 14), 'ahoka': (33, -16), 'talbi': (34, -19), 'hume': (34, 20), 'palestra': (35.5, -17.5), 'chavarria': (35, 23), 'lavia': (31, -22)}
shape(tk - .45, .4, pen)
ball(tk - .45, 41.5, 0); ball(tk + .4, 41.5, 0)
cut(tk - .45, [23, 13, -11], [47, 1.5, .5], 30); cam(S('sends Penders') + .6, [27, 11.5, -9], [48, 1.5, 0], 30)
cut(S('One-nil.') - .08, [22, 52, 50], [22, 0, 0], 32); cam(E('One-nil.') + .5, [24, 51, 49], [23, 0, 0], 32)
ts = S('sends Penders'); mv('penders', ts + .1, ts + .55, 52.0, 3.0); PC['penders']['tilt'] = [[0, 0, 0], [r3(ts + .1), 0, 0], [r3(ts + .55), .6, 0], [r3(E('One-nil.') + .6), .6, 0]]
mv('lefee', ts - .25, ts + .15, 41.2, 0)
tgoal = ts + .55
ball(ts + .1, 41.5, 0); ball(tgoal, 53.6, -2.5, .7)
arrow(**{'from': [41.5, 0], 'to': [53.4, -2.5]}, h=.7, at=ts + .1, until=E('One-nil.') + .3, color=SKY, r=.16)
GOALS.append(dict(t=r3(tgoal), side=1))
lab('lefee', tk, E('One-nil.') + .3); lab('penders', tk, E('One-nil.') + .3); hi('lefee', tgoal, E('One-nil.') + .3)
ui(type='giant', text='1–0', sub="Le Fée 36' (pen)", **{'from': S('One-nil.'), 'to': E('One-nil.') + .45}, y=330)

# ================================================================ 7. REASON 3: NO CUTTING EDGE
t7 = S('Reason three:')
ui(type='giant', text='Reason 3', sub='no cutting edge', **{'from': t7, 'to': E('cutting edge.') + .3}, y=360)
blk = {'roefs': (-50, 0), 'meunier': (-37, 18), 'mukiele': (-39, 6), 'onien': (-39, -6), 'reinildo': (-37, -18),
       'hume': (-29, 20), 'ahoka': (-30, 7), 'sadiki': (-30, -7), 'talbi': (-29, -20), 'lefee': (-20, 0), 'brobbey': (-12, 0),
       'penders': (28, 0), 'colwill': (-2, 10), 'fofana': (-2, -10), 'caicedo': (-12, 2), 'lavia': (-20, -12), 'henderson': (-20, 12),
       'chavarria': (-24, 26), 'palestra': (-24, -26), 'palmer': (-31, -22), 'rogers': (-31, 22), 'neto': (-34, 0)}
shape(t7 - .5, 1.6, blk)
PC['penders']['tilt'].append([r3(t7 - .5), .6, 0]); PC['penders']['tilt'].append([r3(t7 + .2), 0, 0])
cut(t7, [14, 46, 46], [-24, 0, 0], 28); cam(S('As NBC'), [6, 40, 40], [-28, 0, 0], 28); cam(S("Chelsea's first shot"), [10, 50, 50], [-24, 0, 0], 28)
circ = [('fofana', 0), ('caicedo', .9), ('colwill', 1.8), ('chavarria', 2.8), ('henderson', 3.8), ('caicedo', 4.8), ('lavia', 5.8), ('palestra', 6.8), ('lavia', 7.8)]
t0c = S('As NBC') - 1.4
ball(t7 - .5, 53.6, -2.5); ball(t7 + .6, blk['fofana'][0] - 1, blk['fofana'][1])
for pid, dt in circ: x, z = blk[pid]; ball(t0c + dt, x - 1, z)
for i in range(1, len(circ)):
    a, b = circ[i - 1], circ[i]; arrow(**{'from': [blk[a[0]][0] - 1, blk[a[0]][1]], 'to': [blk[b[0]][0] - 1, blk[b[0]][1]]}, h=1, at=t0c + a[1] + .05, until=t0c + b[1] + .6, color=SKY, r=.15)
hi('neto', S('As NBC'), E('forty-fifth minute.')); lab('neto', S('As NBC'), E('forty-fifth minute.'))
zone(-38, 0, 14, 16, S('As NBC'), E('forty-fifth minute.'), RED, .4)
for pid in ['mukiele', 'onien']: lab(pid, S('experiment'), E('forty-fifth minute.'))
ui(type='quote', who='NBC Sports', text='The Pedro Neto experiment just isn’t working.', src='8 Nov 2026', team=A, x=990, y=120, **{'from': S('As NBC'), 'to': E('working.') + .3})
ui(type='stat', big="45'", label='Chelsea’s first shot on target', src='beIN Sports', x=1240, y=140, **{'from': S("Chelsea's first shot"), 'to': E('forty-fifth minute.') + .3})

# ================================================================ 8. THE SECOND HALF
t8 = S('At half-time,')
ui(type='chip', text='<b>Half-time</b> · Colwill off, Estêvão on, Caicedo to centre-back', x=960, y=110, anchor='c', **{'from': t8, 'to': E('centre-back.') + .4})
toff = S('took Colwill'); PC['colwill']['vis'] = [[-1, r3(toff + .3)]]; PC['estevao']['vis'] = [[r3(toff + .4), 999]]
mv('estevao', toff + .3, toff + .4, -30, -27)
mv('caicedo', S('moved Caicedo'), S('moved Caicedo') + 1.1, -2, 10)
cam(t8, [12, 44, 48], [-22, 0, 0], 28)
lab('colwill', t8, toff + .3); lab('estevao', toff + .5, E('quiet.') + .3); lab('caicedo', S('moved Caicedo'), E('centre-back.') + .3); hi('caicedo', S('moved Caicedo') + .4, E('centre-back.') + .3)
tdeep = S('Sunderland sat deep')
shape(tdeep, 1.2, {'meunier': (-41, 17), 'mukiele': (-43, 6), 'onien': (-43, -6), 'reinildo': (-40, -22), 'hume': (-33, 19), 'ahoka': (-34, 7), 'sadiki': (-34, -7), 'talbi': (-33, -16), 'lefee': (-25, 0), 'brobbey': (-18, 0), 'roefs': (-51, 0)})
tq = S('Reinildo kept'); mv('estevao', tq, tq + 1.3, -36, -25); mv('reinildo', tq + .1, tq + 1.4, -39, -23.5)
lab('reinildo', tq, E('quiet.') + .3); hi('reinildo', tq, E('quiet.') + .3); hi('estevao', tq, E('quiet.') + .3)
cut(tq, [-14, 24, -62], [-34, 0, -16], 28)
# 77': the mix-up and Isidor's chance
t77 = S('On seventy-seven')
PC['brobbey']['names'] = [[r3(t77 - .3), 'Isidor']]
ui(type='chip', text="<b>77'</b> · Isidor on for Brobbey (67')", x=960, y=110, anchor='c', **{'from': t77, 'to': E('Penders saved.') + .3})
m77 = {'fofana': (6, -6), 'caicedo': (6, 6), 'brobbey': (-4, 1), 'penders': (49, 0), 'lavia': (-10, -10), 'henderson': (-10, 12), 'estevao': (-22, -24)}
shape(t77 - .3, 1.0, m77)
cut(t77, [-8, 24, 42], [7, 0, 0], 27); cam(S('let Isidor') - .1, [-6, 24, 42], [9, 0, 0], 27); cam(S('let Isidor') + 1.5, [22, 18, 44], [38, 0, 2], 28)
ball(t77 - .3, -36, -25); ball(t77 + .7, 7, -1); tmx = S('a mix-up'); ball(tmx, 7, -1)
mv('fofana', tmx, tmx + .8, 7.2, -2.2); mv('caicedo', tmx, tmx + .8, 7.4, 1.6); zone(7, 0, 9, 9, tmx, S('let Isidor') + .3, RED, .5)
for pid in ['fofana', 'caicedo', 'brobbey']: lab(pid, tmx, E('Penders saved.') + .3)
tI = S('let Isidor'); mv('brobbey', tI - .2, tI + 1.4, 41, 2.5); ball(tI, 7, -1); ball(tI + 1.4, 41.5, 2.4)
arrow(kind='run', **{'from': [-4, 1], 'to': [40.5, 2.5]}, bend=.05, at=tI - .2, until=E('Penders saved.') + .3, color=RED)
tsv = S('Penders saved'); mv('penders', tsv - .4, tsv + .1, 45.5, 2); ball(tsv - .05, 44.8, 2.1, .5); ball(tsv + .5, 40, 12, 1.2)
arrow(**{'from': [41.5, 2.4], 'to': [44.8, 2.1]}, h=.5, at=tsv - .4, until=E('Penders saved.') + .3, color=SKY, r=.16)
lab('penders', tsv - .4, E('Penders saved.') + .3); hi('penders', tsv, E('Penders saved.') + .3)
# 90+2': Welbeck's header
tlast = S("Chelsea's last chance")
PC['neto']['names'] = [[r3(tlast - .3), 'Welbeck']]
ui(type='chip', text="<b>90+2'</b> · Welbeck on for Neto (62')", x=960, y=110, anchor='c', **{'from': tlast, 'to': E('went over.') + .3})
fk = {'estevao': (-24, -18), 'neto': (-43.5, -1), 'roefs': (-51.5, 0), 'mukiele': (-44.5, 1.6), 'onien': (-44, -3.5), 'meunier': (-43, 5), 'reinildo': (-42, -8),
      'fofana': (-40, 4), 'caicedo': (-41, -6), 'sadiki': (-38, 0), 'ahoka': (-39, 9), 'brobbey': (-20, 4), 'penders': (30, 0)}
shape(tlast - .4, 1.0, fk)
cut(tlast, [-12, 22, 48], [-38, 0, -4], 28)
tfk = S('free kick'); ball(tlast - .4, 40, 12); ball(tlast + .6, -24.6, -17.4); ball(tfk - .2, -24.6, -17.4); ball(tfk + .9, -43.8, -1.2, 7); ball(S('went over.') + .05, -56, 1.5, 4.2)
arrow(**{'from': [-24.6, -17.4], 'to': [-43.8, -1.2]}, h=7, at=tfk - .2, until=E('went over.') + .3, color=WHITE, r=.18)
arrow(**{'from': [-43.8, -1.2], 'to': [-55.5, 1.2]}, h=4.2, at=S('went over.') - .4, until=E('went over.') + .4, color=SKY, r=.16)
lab('estevao', tfk - .4, E('went over.') + .3); lab('neto', S("Welbeck's"), E('went over.') + .3); hi('neto', S('went over.') - .4, E('went over.') + .3)

# ================================================================ 9. THE NUMBERS
t9 = S('Chelsea had the ball.')
neutral = {k: (v['keys'][0][1], v['keys'][0][2]) for k, v in PC.items() if k not in ('estevao',)}
neutral['caicedo'] = (37, 7); neutral['estevao'] = (9, -21); neutral['palmer'] = (12, -10)
shape(t9 - .3, 1.6, neutral)
cut(t9, [-50, 70, 70], [0, -6, 0], 30); cam(S('It\'s Sunderland\'s first'), [50, 70, 70], [0, -6, 0], 30)
ui(type='bars', rows=[['Possession', 31.3, 68.7, '%'], ['Passes', 292, 648, ''], ['Shots (on target)', 9, 10, '', '9 (2)', '10 (4)'], ['Expected goals', 2.38, .66, '', '2.38', '0.66']],
   src='Sky Sports match stats · 8 Nov 2026', hi=[[S('Chelsea had the ball.'), 0, S('Sunderland had the chances.')], [S('Sunderland had the chances.'), 3, E('0.66.') + .4]], **{'from': t9, 'to': E('0.66.') + .4})

# ================================================================ 10. CONTEXT, QUOTES, END
t10 = S("It's Sunderland's first")
ui(type='chip', text='Sunderland’s <b>first league win since 30 August</b>', x=120, y=150, **{'from': t10, 'to': E('in a row over Chelsea.') + .3})
ui(type='chip', text='Their <b>third league win in a row</b> over Chelsea', x=120, y=240, **{'from': S('and their third'), 'to': E('in a row over Chelsea.') + .3})
ui(type='table', kick='Premier League table after the match', rows=[['5', 'Chelsea', 16, '#062f80'], ['19', 'Sunderland', 8, '#b30c25']], x=1060, y=150, **{'from': S('and their third') + .2, 'to': E('in a row over Chelsea.') + .3})
ui(type='quote', who='Xabi Alonso', text='To give a penalty from that action, it’s not good from us.', src='Sky Sports', team=A, x=980, y=140, **{'from': S('Xabi Alonso To'), 'to': E('Bris', 1) - .1})
ui(type='quote', who='Régis Le Bris', text='Today, the connection was perfect.', src='Sky Sports', team=H, x=120, y=140, **{'from': S('Bris:', 0) if False else E('Bris', 1) - .1, 'to': E('perfect."') + .4})
cut(S('Xabi Alonso To'), [44, 34, 50], [26, 0, 0], 28); cut(E('Bris', 1) - .1, [-44, 34, 50], [-26, 0, 0], 28); cut(S('Follow for more'), [0, 96, 60], [0, -4, 0], 30)
ui(type='cta', text='Follow for more football,<br>by the numbers', handle='@Cmv_ng', foot='Sources in the post', **{'from': S('Follow for more')})
for pid in ['penders', 'caicedo', 'palmer', 'neto']: lab(pid, S('Xabi Alonso To'), E('Bris', 1) - .2)
for pid in ['lefee', 'brobbey', 'talbi', 'roefs']: lab(pid, E('Bris', 1), E('perfect."') + .3)
ball(t9 - .3, -56, 1.5); ball(t9 + 1.3, 0, 0)

# ---------------------------------------------------------------- captions (full lines, names spelled right)
FIX = {'Le Fay': 'Le Fée', '4-2-3-1.': '4-2-3-1.', 'Sixty-nine percent': '69%', 'sixty-three percent': '63%'}
KEY = {'Brobbey', 'Colwill', 'Fofana', 'Talbi', 'Palestra', 'Penders', 'Neto', 'Caicedo', 'Reinildo', 'Estêvão', 'Isidor', 'Welbeck', 'Le', 'Fay', 'press.', 'route.', 'edge.', 'Penalty.', 'One-nil.', 'chances.', 'ball.'}
caps, cur = [], []
def flush():
    global cur
    if cur:
        txt = ' '.join(f"<b>{w['w']}</b>" if w['w'] in KEY else w['w'] for w in cur)
        for a, b in FIX.items(): txt = txt.replace(a, b).replace(f'<b>{a.split()[0]}</b> <b>{a.split()[-1]}</b>', b)
        txt = txt.replace('<b>Le</b> <b>Fay</b>', '<b>Le Fée</b>').replace('Sixty-nine percent', '69%').replace('sixty-three percent', '63%')
        caps.append([round(cur[0]['s'], 2), round(cur[-1]['e'], 2), txt])
    cur = []
for w in W:
    cur.append(w)
    end = w['w'].rstrip('"”’\'')[-1:]
    if end in ('.', '?', '!', ':') or (end == ',' and len(cur) >= 4) or len(cur) >= 7: flush()
flush()
for i in range(len(caps) - 1): caps[i][1] = round(min(caps[i + 1][0] - .02, caps[i][1] + .5), 2)

# ---------------------------------------------------------------- reactions (two, one from each set)
flow = {'width': 300, 'idle': {'id': 'waitwhat_full', 'a': 0, 'b': 30, 'speed': 0.6},
        'segments': [{'from': r3(S('to the team') - .4), 'to': r3(E('bottom of the table.') + 1.9), 'ANCHOR': 'cold', 'lean': -2,
                      'beats': [{'at': 'bottom of the table', 'id': 'waitwhat_full', 'kind': 'hard', 'away': 1, 'from': 30, 'to': 110, 'hold': 2.0}]}]}
flow2 = {'width': 320, 'idle': {'id': 'stare', 'a': 40, 'b': 110, 'speed': 0.7},
         'segments': [{'from': r3(S("And as he's") - .5), 'to': r3(E('Penalty.') + 1.3), 'ANCHOR': 'pen', 'lean': -2,
                       'beats': [{'at': 'drags him back', 'id': 'ugh', 'kind': 'hard', 'away': 1, 'from': 0, 'to': 60, 'hold': 1.6}]}]}

for v in PC.values():
    v['keys'].sort(key=lambda k: k[0])
plan = {'vo': 0.2, 'cut': CUT, 'gap': 0.6, 'pr': 1.25,
        'teams': {'home': {'name': 'Sunderland', 'short': 'SUN', 'c1': '#b30c25', 'c2': '#ffffff', 'tag': 'rgba(179,12,37,.92)'},
                  'away': {'name': 'Chelsea', 'short': 'CHE', 'c1': '#062f80', 'tag': 'rgba(6,47,128,.92)'}},
        'pieces': list(PC.values()), 'ball': sorted(BALL, key=lambda b: b[0]), 'arrows': ARR, 'zones': ZON, 'cam': sorted(CAM, key=lambda c: c[0]),
        'goals': GOALS, 'ui': UI, 'caps': caps, 'sroot': 'file:///home/user/cmv-alphascanner/video/out/reactions/', 'flow': flow, 'flow2': flow2}
js = json.dumps(plan, indent=0, ensure_ascii=False)
js = js.replace('"ANCHOR": "cold"', '"anchor": t => ({ x: 1580, y: 1065, rot: 0, hide: [480, 0], z: 20 })')
js = js.replace('"ANCHOR": "pen"', '"anchor": t => ({ x: 1560, y: 1065, rot: 0, hide: [480, 0], z: 20 })')
open(f'{OUT}/plan.js', 'w').write('// generated by gen.py (take seconds; the page maps to video time)\nwindow.PLAN = ' + js + '\n')
open(f'{OUT}/words.js', 'w').write('window.WORDS = ' + json.dumps([[round(w['s'], 3), round(w['e'], 3), w['w']] for w in W]) + '\n')
# sanity: camera and ball keys strictly increasing
cks = [c[0] for c in plan['cam']]; bks = [b[0] for b in plan['ball']]
print('cut', CUT, 'last', W[-1]['e'], 'pieces', len(PC), 'arrows', len(ARR), 'zones', len(ZON), 'ui', len(UI), 'caps', len(caps),
      'cam dup', len(cks) - len(set(cks)), 'ball dup', len(bks) - len(set(bks)))
