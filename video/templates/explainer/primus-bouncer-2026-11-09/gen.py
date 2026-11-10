"""Primus Labs, "The Bouncer" (9 Nov 2026): the choreography on the 3D stage, keyed to Lara's words.
  python3 -I gen.py <words_script.json> <page dir>
A club door: to prove one thing you hand over the whole ID. Crypto has the same problem. Primus: log in to the real
site in your own browser, a node witnesses the session, out comes a signed proof of one line, the app checks the proof.
Then the real pages (Unitas reserves, the extension, the fee) and three things to know. Writes plan.js and words.js."""
import json, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tactics-3d'))
from cues import Cues, captions
W = json.load(open(sys.argv[1])); OUT = sys.argv[2]
# the aligner squeezed "forty-seven and a half" (heard as "47.5"): spread the four words over the stretch it found
for i, (w, s, e) in {125: ('forty-seven', 45.12, 45.6), 126: ('and', 45.62, 45.76), 127: ('a', 45.8, 45.92), 128: ('half', 45.94, 46.16)}.items():
    assert W[i]['w'] == w, (i, W[i]); W[i]['s'], W[i]['e'] = s, e
W = [w for w in W if w['e'] - w['s'] > 0.005]
C = Cues(W); S, E = C.S, C.E; r3 = lambda x: round(x, 3)
NAVY, OR, CREAM, BLUE, GREEN, GREY = '#0B1F44', '#FD4C00', '#f3ead8', '#1F5FDB', '#12824a', '#9db4d6'
CUT = r3((E('yes or no.') + S('Crypto has')) / 2)

# ---------------------------------------------------------------- characters
PC = {}
def piece(pid, kind, c1, c2, scale, name, x, z, **kw): PC[pid] = dict(id=pid, kind=kind, c1=c1, c2=c2, scale=scale, name=name, keys=[[0, x, z]], lab=[], hi=[], face=[], **kw)
def face(pid, t, ry): PC[pid]['face'].append([r3(t), round(ry, 3)])      # where a figure looks while standing: 0 = at the camera, 1.571 = at the door
def mv(pid, t0, t1, x, z):
    k = PC[pid]['keys']; last = k[-1]; t0 = max(t0, last[0] + .01); t1 = max(t1, t0 + .05)
    if t0 > last[0] + 1e-3: k.append([r3(t0), last[1], last[2]])
    k.append([r3(t1), x, z])
def lab(pid, a, b): PC[pid]['lab'].append([r3(a), r3(b)])
def hi(pid, a, b): PC[pid]['hi'].append([r3(a), r3(b)])
# The cast are people, not chess pieces (the owner, 10 Nov: the pieces made it look weird): a broad bouncer in dark
# glasses, you in the house blue, a grey queue, and the Primus node as a small orange robot carrying Primus's own logo.
HP = 1.571
piece('bouncer', 'person', NAVY, CREAM, 1.7, 'Bouncer', 10.5, 0, c3='#081633', build=1.35, shades=True, ry=-HP, th=4.56, tagc='rgba(11,31,68,.92)', names=[], ringc='#35c275')
piece('you', 'person', BLUE, CREAM, 1.25, 'You', -6, 0, c3='#16346e', ry=HP, th=4.56, tagc=BLUE)
for q, x in (('q1', -13), ('q2', -20), ('q3', -27)): piece(q, 'person', GREY, '#e6ebf4', 1.2, '', x, 0, c3='#7f97bd', ry=HP, th=4.56)
piece('node', 'robot', OR, '#fbf7ee', 1.4, 'Primus node', -17.6, -3.4, logo='img/primus-icon.png', ry=.35, hop=0, th=5.1, tagc=OR, ringc=OR)

CARDS, PINS, UI, ARR, CAM = [], [], [], [], []
def card(cid, kind, w, h, keys, **kw): CARDS.append(dict(id=cid, kind=kind, w=w, h=h, keys=[[r3(k[0])] + list(k[1:]) for k in keys], **kw))
def pin(text, a, b, **kw): PINS.append(dict(text=text, **{'from': r3(a), 'to': r3(b)}, **kw))
def ui(**o):
    o['from'] = r3(o['from'])
    if o.get('to') is not None: o['to'] = r3(o['to'])
    UI.append(o)
def cam(t, pos, tgt, fov=30): CAM.append([r3(t), pos, tgt, fov])
def cut(t, pos, tgt, fov=30):          # a clean cut: hold the previous shot to the frame before
    last = [c for c in sorted(CAM, key=lambda c: c[0]) if c[0] < t - .05][-1]
    CAM.append([r3(t - .034), last[1], last[2], last[3]]); CAM.append([r3(t), pos, tgt, fov])
def KS(keys): return [[r3(k[0])] + list(k[1:]) for k in keys]
BOX = [11.5, 0, 8.6]

# ================================================================ 1. COLD OPEN: the club door
cam(0, [-27, 15, 39], [2, 4.6, 0]); cam(3.3, [-21, 13, 35], [4.5, 4.6, 0])
mv('you', S('you prove') - .3, E('eighteen.') - .1, 4.2, 0)
lab('you', .5, S('hand a stranger') - .1); lab('bouncer', 1.1, S('hand a stranger') - .1)
# the ID: out of the pawn, up to the camera, read row by row, then into the files
t_id = S('hand a stranger'); t_all = S('All of it'); t_in = S('for one yes'); IDP = [1.4, 10.0, 3.6]
card('idc', 'id', 6.4, 4.0, [[0, 4.4, 3.0, .8, 0, -.5, 0, .18], [t_id, 4.4, 3.0, .8, 0, -.5, 0, .18], [t_id + 1.0, *IDP, 0, -.3, 0, 1.5], [t_in + .1, *IDP, 0, -.3, 0, 1.5], [t_in + .95, BOX[0], 4.0, BOX[2], -1.2, -.5, 0, .2]],
     states=KS([[0, 0], [S('Your name'), 1], [S('Your address'), 2], [S('Your date'), 3], [t_all, 4]]),
     op=KS([[0, 0], [t_id - .05, 0], [t_id + .2, 1], [t_in + .7, 1], [t_in + 1.0, 0]]), bill=KS([[0, 0], [t_id + .2, 0], [t_id + 1.0, 1], [t_in + .1, 1], [t_in + .8, 0]]))
cam(S('So you') + .1, [-21, 13, 35], [4.5, 4.6, 0]); cam(S('Your name') - .3, [-8.6, 10.4, 29], [5.2, 7.5, 1.6]); cam(t_all - .1, [-7, 10.4, 28.2], [5.5, 7.5, 1.8]); cam(t_in + .8, [-9, 11, 31], [8.6, 4.8, 3.4])
pin('He only needed: <b>over 18</b> ✔', S('for one yes') + .25, E('yes or no.') + .3, cls='ok', on='piece:bouncer', dy=1.1)

# ================================================================ 2. THE DROP: crypto has the same problem
t2 = r3(CUT - .002)        # the hit lands where the pause starts (with the beat); the line follows a second later
Tv = lambda s: s + .2 + (.6 if s >= CUT else 0)
ui(type='flash', **{'from': t2 - .03})
PC['bouncer']['names'] = [[r3(t2 + .3), 'The app']]
cut(t2, [-5, 6.2, 27], [12.6, 8.2, 0]); cam(S('A blockchain') - .5, [-7, 6.6, 28], [12.2, 8.0, 0])
lab('bouncer', t2 + .5, S('A blockchain') - .3)
# the pages a blockchain cannot open
t_b = S('A blockchain')
cut(t_b - .2, [-18.6, 6.2, 31], [-8.2, 7.0, -4]); cam(S("That's why") - .2, [-17, 6.2, 30], [-8.0, 7.0, -4])
PG = [('p_bank', 'BANK', NAVY, S('your bank') - .1, [-13.6, 7.9, -5.0], 3), ('p_exch', 'EXCHANGE', BLUE, S('your exchange') - .1, [-7.0, 8.3, -5.6], 7), ('p_pay', 'PAYSLIP', '#3b4a6b', S('your payslip') - .1, [-0.4, 7.9, -5.0], 12)]
t_up = S('And why apps'); fly = [S('ask you') - .1, S('upload') - .1, S('everything.') - .05]
for i, (cid, title, tone, t0, p, seed) in enumerate(PG):
    tf = fly[i]
    card(cid, 'page', 4.2, 5.6, [[0, p[0], p[1] - 1.6, p[2], 0, 0, 0, .3], [t0, p[0], p[1] - 1.6, p[2], 0, 0, 0, .3], [t0 + .4, p[0], p[1], p[2], 0, 0, 0, 1.3], [tf, p[0], p[1], p[2], 0, 0, 0, 1.3], [tf + .75, BOX[0], 4.0, BOX[2], -1.2, -.5, 0, .2]],
         px=840, title=title, tone=tone, seed=seed, op=KS([[0, 0], [t0 - .02, 0], [t0 + .2, 1], [tf + .55, 1], [tf + .8, 0]]), bill=KS([[0, 0], [t0, 1], [tf, 1], [tf + .6, 0]]))
pin("A blockchain can't open these", S("can't see"), S("That's why") - .15, cls='x', at=[-7.0, 13.0, -5.6])
t_l = S("That's why")
cam(t_l + .05, [-17, 6.2, 30], [-8.0, 7.0, -4]); cam(S('on-chain loans') + .1, [-22, 13, 37], [1.5, 6.0, -1]); cam(t_up - .1, [-21, 12.8, 36.4], [1.8, 6.0, -1])
pin('Loan? <b>Collateral first.</b>', S('most on-chain') + .2, E('collateral.') + .55, on='piece:bouncer', dy=1.1)
cam(E('everything.') + .5, [-18, 12, 34], [3.2, 5.6, 0])
pile = [t_in + .9] + [f + .7 for f in fly]

# ================================================================ 3. PRIMUS FLIPS THAT
t3 = S('Primus Labs')
PC['node']['vis'] = [[r3(t3 - .1), 999]]
ui(type='giant', text='Primus Labs', sub='flips that', color=OR, shadow='0 6px 30px rgba(255,255,255,.7)', y=120, **{'from': t3, 'to': E('flips that.') + .2})
cut(t3, [-25, 9.5, 27], [-11, 5.0, -3]); cam(E('flips that.') + .3, [-24, 10, 28], [-10.5, 5.2, -3.5])
mv('you', t3 + .1, t3 + 1.3, -4.8, -1.2)
for q, (x, z) in zip(('q1', 'q2', 'q3'), ((3.5, -12.5), (8.5, -11.5), (-1.5, -15))): mv(q, t3 - .7, t3 + .5, x, z); face(q, t3 + .55, -1.15)      # they step back and watch
t_w = S('You log in')
WEB = [-10.2, 7.3, -7.4]; face('you', t3 + 1.32, -2.43)                     # you turn to your own screen
card('web', 'browser', 10, 6.4, [[0, WEB[0], 3.2, WEB[2], 0, 0, 0, .4], [t_w - .1, WEB[0], 3.2, WEB[2], 0, 0, 0, .4], [t_w + .5, *WEB, 0, 0, 0, 1.2]], px=1280,
     states=KS([[0, 0], [S('witnesses') + .35, 1]]), op=KS([[0, 0], [t_w - .12, 0], [t_w + .15, 1], [S("And it's live.") + .9, 1], [S("And it's live.") + 1.2, 0]]), bill=KS([[0, .35]]))
cam(t_w - .2, [-24, 10, 28], [-10.5, 5.2, -3.5]); cam(t_w + .9, [-20, 11, 30.5], [-10.2, 6.1, -4]); cam(S('A Primus node') - .2, [-19, 11, 30], [-10.4, 6.1, -4])
lab('you', t_w + .3, S('A Primus node') - .2)
pin('The real site · your own browser', S('real site'), S('A Primus node') - .15, cls='n', on='card:web', dy=4.7)
t_n = S('A Primus node')
mv('node', t_n - .2, t_n + .7, -17.4, -4.6); face('node', t_n + .72, 1.94)       # it turns to the screen
lab('node', t_n, E('session.') + .4); hi('node', t_n + .2, E('session.') + .4)
pin('Encrypted session', S('encrypted'), E('session.') + .45, cls='o', on='card:web', dy=4.7)
cam(E('session.') + .2, [-17.5, 10.6, 29], [-10.2, 6.1, -4])
# the proof comes out
t_p = S('And out comes'); t_bal = S('balance over'); t_true = S('true.'); t_chk = S('The app checks'); t_not = S('Not your statement.')
TX0 = [-9.8, 6.2, -7.0]; TX1 = [-6.2, 8.3, 5.2]; TX2 = [0.4, 11.7, 2.0]; TX3 = [-1.6, 4.9, 6.2]; TX4 = [3.6, 7.5, 2.6]; ASIDE = (12.9, 4.8)
t_one = S('One: it proves'); t_two = S('Two: by default'); t_end = S('Prove the fact.')
card('tix', 'ticket', 5.6, 2.9, [[0, *TX0, 0, 0, 0, .22], [t_p + .1, *TX0, 0, 0, 0, .22], [t_p + 1.35, *TX1, 0, 0, 0, 1.15], [t_chk, *TX1, 0, 0, 0, 1.15], [t_chk + .8, *TX2, 0, 0, 0, 1.7],
                                    [t_one - .4, *TX2, 0, 0, 0, 1.7], [t_one - .38, *TX3, 0, 0, 0, 1.2], [t_end - .5, *TX3, 0, 0, 0, 1.2], [t_end - .48, *TX4, 0, 0, 0, .95], [t_end + .35, *TX4, 0, 0, 0, .95], [t_end + 1.7, 15.5, 6.6, 0, 0, 0, 0, .55]],   # at the end it goes in with the next pawn
     states=KS([[0, 0], [t_bal, 1], [t_true, 2]]),
     op=KS([[0, 0], [t_p + .05, 0], [t_p + .3, 1], [S("And it's live.") + .9, 1], [S("And it's live.") + 1.2, 0], [t_one - .3, 0], [t_one, 1], [t_two - .35, 1], [t_two - .1, 0], [t_end - .4, 0], [t_end - .1, 1], [t_end + 1.3, 1], [t_end + 1.65, 0]]), bill=KS([[0, 1]]))
cam(t_p, [-17.5, 10.6, 29], [-10.2, 6.1, -4]); cam(t_p + 1.5, [-13, 9.6, 26], [-7.0, 6.9, 1.5]); cam(t_chk - .2, [-12.4, 9.6, 25.5], [-6.8, 6.9, 1.8])
# the app checks the proof: the ticket goes to the bouncer, the door opens, you walk in; the statement stays
cut(t_chk, [-24.8, 14.4, 38], [-.4, 6, -1]); cam(S("And it's live.") + .9, [-24, 14.1, 37.4], [0, 6, -1])
hi('bouncer', t_chk + .7, t_not + .3)
mv('bouncer', t_not - .5, t_not + .2, *ASIDE); face('bouncer', t_not + .22, -1.2)
DOOR = [[0, 0], [t_not - .55, 0], [t_not + .25, 1]]
mv('you', t_chk + .2, t_not - .1, 5.6, 0); mv('you', t_not + .05, t_not + 1.1, 19.5, 0)
PC['you']['vis'] = [[-1, r3(t_not + 1.25)]]
pin('Your statement stays with you', t_not, E('statement.') + .55, cls='n', on='card:web', dy=4.7)
lab('bouncer', t_chk + .6, t_not + .3)

# ================================================================ 4. IT'S LIVE: the real reserves page
t4 = S("And it's live.")
ui(type='giant', text="It's live", color=GREEN, shadow='0 6px 30px rgba(255,255,255,.8)', y=390, **{'from': t4, 'to': E("it's live.") + .35})
t_u = S('Unitas runs') - .3; t_3 = S('Three things')
SCR = dict(x=260, y=96, w=1400, h=843, iw=3200, ih=1800)
ui(type='screen', img='shots/unitas.png', url='por.primuslabs.xyz/unitas', **SCR, **{'from': t_u, 'to': t_3 - .3},
   view=KS([[t_u, .5, .30, 1.0], [S('nearly') - .5, .5, .30, 1.0], [S('nearly') + .1, .39, .30, 1.72], [S('against') - .2, .39, .30, 1.72], [S('against') + .35, .22, .30, 1.72], [E('supply.') + .2, .22, .30, 1.72], [S('Anyone') + .5, .5, .30, 1.0]]),
   rings=KS([[S('nearly'), S('against') - .1, .283, .297, .213, .185], [S('against') + .1, E('supply.') + .15, .064, .297, .213, .185], [S('Anyone') + .4, E('that page.') + .2, .722, .297, .213, .185]]))
ui(type='chip', text='The real page · captured <b>9 Nov 2026, 20:10 UTC</b>', x=960, y=16, anchor='c', **{'from': t_u + .3, 'to': t_3 - .35})
mv('node', t4 + .4, t4 + 1.4, -34, -14)                 # its part is done: it rolls off behind the wash, out of the later shots
WASH = [[t4 - .12, 0], [t4 + .2, .86], [t_3 - .35, .86], [t_3 - .05, 0]]

# ================================================================ 5. THREE THINGS TO KNOW
DOOR += [[t_3 - .2, 1], [t_3 + .4, 0]]
mv('bouncer', t_3 - .3, t_3 + .4, 10.5, 0); face('bouncer', t_3 + .42, -HP)
mv('q1', t_3 - .2, t_3 + 1.2, 4.2, 0); mv('q2', t_3, t_3 + 1.3, -6, 0); mv('q3', t_3 + .1, t_3 + 1.4, -13, 0)
for q, dt in (('q1', 1.22), ('q2', 1.32), ('q3', 1.42)): face(q, t_3 + dt, HP)                # back in line, facing the door
cut(t_3 - .05, [-25, 14.5, 37], [2, 5, 0]); cam(t_one - .5, [-23, 14, 36], [2.5, 5, 0])
ui(type='giant', text='3 things', sub='to know before you use it', color=NAVY, shadow='0 6px 30px rgba(255,255,255,.75)', y=150, x=110, **{'from': t_3, 'to': E('use it.', 0) + .2})
STAT = dict(x=90, y=110, color=OR)
t_three = S("Three: it's early"); t_x = S('You use it through')
# one: it proves the source, not the truth
cut(t_one - .36, [-13, 10, 28.5], [1.5, 6.2, 3]); cam(t_two - .5, [-12, 10, 28], [1.6, 6.2, 3])
ui(type='stat', big='1', label='It proves where the data came from.<br>Not that the data is right.', **STAT, **{'from': t_one, 'to': t_two - .2})
pin('Where it came from: <b>proved</b> ✔', S('it proves') + .25, t_two - .3, cls='ok', on='card:tix', dy=2.45)
pin('Is the data right? <b>Not checked</b>', S('Not that the data'), t_two - .3, cls='x', on='card:tix', dy=-2.5)
ui(type='quote', who='Primus', text='Primus does not independently audit the accuracy of baseline data…', src='its reserves page, 9 Nov 2026', team='away', x=1040, y=110, **{'from': S('Not that the data') + .2, 'to': t_two - .2})
# two: the app still sees the one thing it asked for
REQ = [0.6, 8.3, 4.6]
card('req', 'request', 5.4, 3.3, [[0, REQ[0], REQ[1] - 1.4, REQ[2], 0, 0, 0, .3], [S('by default') - .1, REQ[0], REQ[1] - 1.4, REQ[2], 0, 0, 0, .3], [S('by default') + .4, *REQ, 0, 0, 0, 1.6]],
     states=KS([[0, 0], [S('So read'), 1]]), op=KS([[0, 0], [S('by default') - .12, 0], [S('by default') + .15, 1], [t_three - .4, 1], [t_three - .15, 0]]), bill=KS([[0, 1]]))
cut(t_two - .1, [-8, 10, 28.5], [5.6, 6.6, 2]); cam(t_three - .5, [-7, 10, 28], [5.8, 6.6, 2])
ui(type='stat', big='2', label='By default, the app sees the one thing it asked for.<br>So read the request.', **{**STAT, 'x': 1270}, **{'from': t_two, 'to': t_three - .2})
pin('The app sees this', S('still sees'), t_three - .3, cls='n', on='card:req', dy=-3.25)
lab('bouncer', t_two + .4, t_three - .3)
# three: early, no official token
cut(t_three - .1, [-25, 14.5, 37], [2, 5, 0]); cam(t_x - .4, [-23, 14, 36], [2.5, 5, 0])
ui(type='stat', big='3', label='It’s early. No official token.<br>Points are a reputation score.', **STAT, **{'from': t_three, 'to': t_x - .25})
for i, (txt, t0) in enumerate([('AlphaNet: <b>early stage</b>', S("it's early.")), ('Official token: <b>none</b>', S("There's no")), ('Points = <b>a reputation score</b>', S('Points are'))]):
    ui(type='chip', text=txt, cls='light', x=700, y=150 + i * 96, **{'from': t0, 'to': t_x - .25})

# ================================================================ 6. HOW: the extension and the fee (real pages)
t_f = S('and a proof')
ui(type='screen', img='shots/store.png', url='chromewebstore.google.com · Primus', **SCR, **{'from': t_x - .1, 'to': t_f - .05},
   view=KS([[t_x - .1, .5, .22, 1.0], [S('browser extension') - .2, .5, .22, 1.0], [S('browser extension') + .5, .42, .2, 1.55]]),
   rings=KS([[S('browser extension') + .4, t_f - .1, .322, .283, .074, .048]]))
ui(type='screen', img='shots/faq.png', url='docs.primuslabs.xyz · FAQ for AlphaNet', **SCR, **{'from': t_f, 'to': t_end - .25},
   view=KS([[t_f, .5, .7, 1.0], [S('costs') - .1, .5, .7, 1.0], [S('costs') + .5, .5, .9, 1.7]]),
   rings=KS([[S('tiny fee') - .2, t_end - .3, .655, .905, .085, .05]]))
ui(type='chip', text='Real pages · captured <b>9 Nov 2026</b>', x=960, y=16, anchor='c', **{'from': t_x + .2, 'to': t_end - .3})
WASH += [[t_x - .3, 0], [t_x, .82], [t_end - .3, .82], [t_end, 0]]

# ================================================================ 7. CLOSE
DOOR += [[t_end - .5, 0], [t_end + .35, 1]]
mv('bouncer', t_end - .6, t_end - .1, *ASIDE); face('bouncer', t_end - .08, -1.2)
mv('q1', t_end + .35, t_end + 1.7, 19.5, 0); PC['q1']['vis'] = [[-1, r3(t_end + 1.85)]]; mv('q2', t_end + .9, t_end + 2.3, 4.2, 0); mv('q3', t_end + 1.1, t_end + 2.5, -6, 0)
cut(t_end - .2, [-15, 8.6, 29], [0.5, 6.6, 0]); cam(E('for more.') + 2.5, [-12.5, 8.4, 27.6], [1.2, 6.6, 0])
ui(type='giant', text='Prove the fact.', color=NAVY, shadow='0 6px 30px rgba(255,255,255,.8)', y=150, x=110, size=158, **{'from': t_end, 'to': S('Follow for') - .12})
ui(type='giant', text='Keep the file.', color=OR, shadow='0 6px 30px rgba(255,255,255,.8)', y=306, x=110, size=158, **{'from': S('Keep the'), 'to': S('Follow for') - .12})
ui(type='cta', text='Follow for more', handle='@Cmv_ng', foot='Sources in the post', **{'from': S('Follow for')})
ui(type='note', dark=1, text='Illustration · real pages captured 9 Nov 2026', **{'from': .4, 'to': S('Follow for') - .2})

# ---------------------------------------------------------------- captions, reactions, plan
KEY = {'Primus', 'Labs', 'ID.', 'Unitas', 'One:', 'Two:', 'Three:', 'true.', 'collateral.', 'token.', 'Base.', 'proof.', 'statement.', 'fact.', 'file.', 'live.'}
caps = captions(W, KEY, {'<b>Primus</b> <b>Labs</b>': '<b>Primus Labs</b>'})
for c in caps:                      # a line that ends by the pause must not hang through it (times after the cut sit 0.6 s later)
    if c[0] < CUT <= c[1]: c[1] = r3(CUT - .02)
flow = {'width': 320, 'idle': {'id': 'waitwhat_full', 'a': 0, 'b': 30, 'speed': 0.6},
        'segments': [{'from': r3(S('Your date') - .2), 'to': r3(E('yes or no.') + .3), 'ANCHOR': 'a', 'lean': -2,
                      'beats': [{'at': 'All of it', 'id': 'yikes_full', 'kind': 'hard', 'away': 1, 'hold': 2.0}]}]}
flow2 = {'width': 330, 'idle': {'id': 'stare', 'a': 40, 'b': 110, 'speed': 0.7},
         'segments': [{'from': r3(S('by default') + .4), 'to': r3(t_three - .2), 'ANCHOR': 'b', 'lean': -2,     # gone before the cut to "Three:"
                       'beats': [{'at': 'it asked for', 'id': 'hmm', 'kind': 'soft', 'away': -1, 'hold': 2.6}]}]}   # keyed a line early: the clip's chin-rub peaks about 1.6 s in, on "So read the request"
for v in PC.values(): v['keys'].sort(key=lambda k: k[0])
plan = {'vo': 0.2, 'cut': CUT, 'gap': 0.6, 'pr': 1.25, 'teams': {'home': {'name': '', 'short': '', 'c1': NAVY}, 'away': {'name': '', 'short': '', 'c1': OR}},
        'stage': {'r': 40, 'c1': '#cfd7e6', 'c2': '#cfd7e6'}, 'door': {'at': [15, 0, 0], 'open': KS(sorted(DOOR))}, 'sign': {'at': [14.2, 11.3, 0], 'w': 9, 'h': 2.3, 'a': 'CLUB · 18+', 'b': 'CRYPTO APP', 'flipv': KS([[0, 0], [Tv(t2), 0], [Tv(t2) + .5, 1]])},
        'box': {'at': BOX, 'ry': -.5, 'label': 'FILES', 'pile': [r3(x) for x in pile]},
        'pieces': list(PC.values()), 'cards': CARDS, 'pins': PINS, 'arrows': ARR, 'cam': sorted(CAM, key=lambda c: c[0]), 'hits': [[r3(t2), .28, .5]],
        'wash': KS(sorted(WASH)), 'ui': UI, 'caps': caps, 'sroot': 'file:///home/user/cmv-alphascanner/video/out/reactions/', 'flow': flow, 'flow2': flow2}
js = json.dumps(plan, indent=0, ensure_ascii=False)
js = js.replace('"ANCHOR": "a"', '"anchor": t => ({ x: 1590, y: 1065, rot: 0, hide: [480, 0], z: 20 })').replace('"ANCHOR": "b"', '"anchor": t => ({ x: 1590, y: 1065, rot: 0, hide: [480, 0], z: 20 })')
open(f'{OUT}/plan.js', 'w').write('// generated by gen.py (take seconds; the page maps to video time)\nwindow.PLAN = ' + js + '\n')
open(f'{OUT}/words.js', 'w').write('window.WORDS = ' + json.dumps([[round(w['s'], 3), round(w['e'], 3), w['w']] for w in W]) + '\n')
cks = [c[0] for c in plan['cam']]; bad = [u for u in UI if u.get('to') is not None and u['to'] <= u['from']] + [p for p in PINS if p['to'] <= p['from']]
print('cut', CUT, 'last', W[-1]['e'], 'pieces', len(PC), 'cards', len(CARDS), 'pins', len(PINS), 'ui', len(UI), 'caps', len(caps), 'cam keys', len(cks), 'cam dup', len(cks) - len(set(cks)), 'cam unsorted', sum(1 for a, b in zip(cks, cks[1:]) if b <= a), 'bad windows', len(bad))
for c in caps: print('  ', c[0], c[2].replace('<b>', '').replace('</b>', ''))
