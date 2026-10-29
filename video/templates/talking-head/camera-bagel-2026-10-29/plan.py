"""The Bagel edit: the owner's 8:44 recording (camera intro, then Bagel on the left and their own app cmvng on the right)
cut to about 2:16, with the owner's video reactions.
  python3 -I plan.py <work dir>     (reads <work>/words_med.json and <work>/runs.json; writes <work>/plan.json and plan.js here)

Every piece is a span of the recording [v0, v1] in seconds. mode: cam (the owner on camera), bagel / cmvng (one phone,
in a card), both (the two phones, an establishing shot), title, end. A piece plays its voice when `a` is set (a span of
the cleaned voice); sync pieces play voice and picture together. sp is the picture speed (fast pieces have no voice
and keep every sp-th frame). tight compresses silences longer than 0.42 s inside a sync piece to 0.22 s, cutting
picture and voice together. hold freezes one frame. Captions are the owner's words, chunked with |, timed to the words.
The owner's own corner overlay (their grin clip, baked into the recording at x 40-265, y 835-1080) is kept out of
every Bagel window: windows end at y 833.
"""
import difflib, json, os, re, sys

K = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 30
words = json.load(open(f'{K}/words_med.json'))
runs = json.load(open(f'{K}/runs.json'))

# camera windows [source centre x, centre y, zoom]: Bagel x 62-530, cmvng x 540-1018
B = lambda sy, z=2.06: [296, sy, z]
C = lambda sy, z=2.2: [781, sy, z]

P = [
    # ---- the hook: yesterday's 7-pick combo, one pick to win (Jaw Drop in a duet)
    dict(id='hook', mode='bagel', v=[74.35, 80.37], tight=True, cam=[[74.35, *B(512)]],
         cap='And yesterday I took a combo pick,|and currently it\'s now remaining one pick to win.'),
    dict(id='title', mode='title', dur=2.1, hold=88.0),
    # ---- what Bagel is (the owner on camera)
    dict(id='c1', mode='cam', v=[0.03, 3.35], cap='So basically, today I\'m going to be exploring *Bagel*,'),
    dict(id='c2', mode='cam', v=[6.51, 9.06], cap='an app available on *iOS* and'),
    dict(id='c2b', mode='cam', v=[9.92, 11.13], cap='*Android* app stores.'),
    dict(id='c3', mode='cam', v=[14.37, 19.69], cap='And it\'s the simplest way to actually explore|*Polymarket* prediction markets.'),
    dict(id='c4a', mode='cam', v=[34.26, 35.27], cap='Which means that'),
    dict(id='c4b', mode='cam', v=[36.25, 45.03], tight=True,
         cap='if potentially *Polymarket* does an airdrop,|the market linked to your Bagel|will be eligible for the airdrop,'),
    dict(id='c4c', mode='cam', v=[45.32, 48.13], cap='based on the mathematics and semantics and whatever.'),
    dict(id='c5', mode='cam', v=[48.53, 57.37], cap='So in this video, basically, I\'m going to be telling you,|like, showing you how I make a *combo pick*|using my own prediction app and using *Bagel*.'),
    # ---- the two apps
    dict(id='d1', mode='both', v=[61.95, 63.00], a=[61.95, 63.84], a_at=0.0, cap='I am currently on the Bagel app,'),
    dict(id='d1b', mode='bagel', v=[63.00, 63.84], cam=[[63.00, *B(400)]]),
    dict(id='d2', mode='cmvng', v=[90.54, 93.25], cam=[[90.54, *C(310, 2.15)]], cap='Now this is on the right side of my screen,|it\'s actually my football app.'),
    # ---- step 1: the slip, built by the owner's own app
    dict(id='e1', mode='cmvng', v=[95.53, 99.21], cam=[[95.53, *C(310, 2.15)]], chapter=('Step 1 · cmvng', 'Build the slip'),
         cap='So basically, like, I want to actually, like,|build *two odds* for today, so I\'ll…'),
    dict(id='e2', mode='cmvng', v=[99.40, 124.0], sp=10, cam=[[99.40, *C(300, 2.2)], [117.6, *C(300, 2.2)], [120.5, *C(400, 2.2), 1.0]]),
    dict(id='e3', mode='cmvng', v=[146.09, 152.13], cam=[[146.09, *C(760, 2.2)]],
         cap='So basically, like, these are the games,|but basically, like, I do not know this team.|The only team I know is only Everton versus Newcastle.'),
    # the owner says "push higher" four times as the slip grows; one take plays, over the press itself and on into the
    # montage (the line has no pause after "higher" to cut at)
    dict(id='e4', mode='cmvng', v=[152.50, 153.92], cam=[[152.50, *C(760, 2.2)]], vo=[158.35, 161.84], vo_at=0.35,
         cap='I\'ll press *push higher*.|I only want teams that I know of to be there.'),
    dict(id='e5', mode='cmvng', v=[153.92, 178.90], sp=5, follow=True),
    dict(id='e6', mode='cmvng', v=[181.90, 187.00], follow=True,
         cap='Now basically, I want to make this to be as safe as possible.|Like, I want to make this slip as safe as possible.'),
    dict(id='e7', mode='cmvng', v=[187.00, 196.90], sp=5, follow=True),
    # ---- step 2: find each game on Bagel
    dict(id='f1', mode='bagel', v=[200.63, 202.97], cam=[[200.63, *B(345)]], chapter=('Step 2 · Bagel', 'Find each game'),
         cap='on Bagel, I\'ll just click on search,'),
    dict(id='f2', mode='bagel', v=[202.97, 213.40], sp=7, cam=[[202.97, *B(345)]]),
    dict(id='f3', mode='bagel', v=[213.40, 216.63], cam=[[213.40, *B(345)]], cap='Okay, now that\'s the problem with this thing:|I can\'t find this game.'),
    dict(id='f4', mode='bagel', v=[216.63, 258.78], sp=20, cam=[[216.63, *B(345)]]),
    dict(id='f5', mode='bagel', v=[258.78, 261.72], cam=[[258.78, *B(345)]], cap='Everton versus Newcastle.|Okay, you can find Everton\'s match.'),
    dict(id='f6', mode='bagel', v=[262.11, 267.28], cam=[[262.11, *B(345)]], cap='So I will go to here, I\'ll go to *totals*,|I\'ll click on *4.5*, I\'ll click,|I will add it to my *combo pick*.'),
    dict(id='f7', mode='bagel', v=[267.28, 285.40], sp=12, cam=[[267.28, *B(345)]]),
    dict(id='f8', mode='bagel', v=[285.40, 287.48], sp=1, cam=[[285.40, *B(345)]]),
    dict(id='f9', mode='bagel', v=[287.48, 311.21], sp=18, cam=[[287.48, *B(345)]]),
    dict(id='f10', mode='bagel', v=[311.21, 313.01], cam=[[311.21, *B(345)]], cap='I can\'t find this match.'),
    dict(id='f11', mode='bagel', v=[313.01, 345.97], sp=20, cam=[[313.01, *B(345)]]),
    dict(id='f12', mode='bagel', v=[345.97, 348.12], cam=[[345.97, *B(345)]], cap='So under *4.5 goals*,'),
    dict(id='f13', mode='bagel', v=[348.12, 370.50], sp=18, cam=[[348.12, *B(345)]]),
    dict(id='f14', mode='bagel', v=[370.50, 372.40], cam=[[370.50, *B(345)]], cap='It\'s not there.'),
    # holds: Bagel's search briefly lists political markets (Israel, Iran, Ukraine) while "gijon" and "lecce" are typed;
    # those frames hold the frame before them
    dict(id='f15', mode='bagel', v=[372.40, 386.11], sp=12, cam=[[372.40, *B(345)]], holds=[[382.7, 384.38]]),
    dict(id='f16', mode='bagel', v=[386.11, 390.32], cam=[[386.11, *B(345)]], cap='Okay, I think I can find it.|Under 4.5 goals, good, good.|I can find this game.'),
    dict(id='f17', mode='cmvng', v=[437.84, 440.52], cam=[[437.84, *C(740)]], cap='What is this, for crying out loud.'),
    dict(id='f18', mode='cmvng', v=[443.70, 445.29], cam=[[443.70, *C(780)]], cap='It is what it is.'),
    dict(id='f19', mode='bagel', v=[445.29, 462.94], sp=12, cam=[[445.29, *B(345)]], holds=[[454.0, 457.68]]),
    dict(id='f20', mode='bagel', v=[462.94, 466.19], cam=[[462.94, *B(345)]], cap='It said totals to be over *1.5 goals*.'),
    # ---- step 3: place it
    dict(id='g1', mode='bagel', v=[476.90, 480.10], sp=1, cam=[[476.90, *B(512)]], chapter=('Step 3 · Bagel', 'Place the combo'),
         a=[478.77, 480.10], a_at=1.87, cap='It\'s now complete.'),
    dict(id='g2', mode='bagel', v=[482.09, 485.56], cam=[[482.09, 290, 349, 3.0]], cap='So I\'ll just click here,|I\'ll just click on *$5* to buy,'),
    dict(id='g3', mode='bagel', v=[490.40, 491.60], cam=[[490.40, *B(345)]], a=[492.15, 494.29], a_at=0.3, cap='My combo pick has been played.'),
    dict(id='g4', mode='bagel', v=[491.60, 492.84], hold=491.60, cam=[[491.60, *B(345)]]),
    # ---- the end
    dict(id='h1', mode='bagel', v=[506.0, 509.0], sp=1, cam=[[506.0, *B(512)]], a=[515.84, 522.12], a_at=0.0, vdur=6.28,
         cap='And I hope you actually enjoyed this video|and explore *Bagel* today. Peace.'),
    dict(id='end', mode='end', dur=3.0),
]

# ---- silences inside a span (from runs.json, the cleaned voice), for tight pieces
def gaps(a, b, mn=.42):
    out = []
    for (r0, r1), (s0, s1) in zip(runs, runs[1:]):
        if a < r1 and s0 < b and s0 - r1 > mn and r1 > a and s0 < b:
            out.append((r1 + .11, s0 - .11))
    return out


# ---- build the output timeline
pieces, t, voice = [], 0.0, []
for p in P:
    mode = p['mode']
    if mode in ('title', 'end'):
        pieces.append(dict(id=p['id'], mode=mode, o0=t, o1=t + p['dur'], v0=p.get('hold', 0), hold=p.get('hold'), sp=1))
        t += p['dur']; continue
    v0, v1 = p['v']; sp = p.get('sp', 1)
    spans = [(v0, v1)]
    if p.get('tight'):
        spans, s = [], v0
        for g0, g1 in gaps(v0, v1):
            spans.append((s, g0)); s = g1
        spans.append((s, v1))
    for k, (a, b) in enumerate(spans):
        dur = p.get('vdur') or (b - a) / sp
        if p.get('vdur'):
            b = a + dur * sp                          # the picture runs on for the voice
        q = dict(id=p['id'] + (f'.{k}' if len(spans) > 1 else ''), mode=mode, o0=t, o1=t + dur, v0=a, v1=b, sp=sp,
                 step=int(sp) if sp >= 2 else 1, hold=p.get('hold'))
        if mode == 'cam':
            q['zoom'] = 1.0 if (len(pieces) % 2 == 0) else 1.06
        if p.get('cam'):
            q['camsrc'] = p['cam']
        if p.get('follow'):
            q['follow'] = True
        if p.get('holds'):
            q['holds'] = p['holds']
        if sp == 1 and not p.get('a') and not p.get('vo') and p.get('cap') is not None:
            voice.append(dict(a=[a, b], o0=t))
        pieces.append(q)
        t += dur
    if p.get('a'):                                   # voice from another span, placed a_at s into the piece
        base = next(x for x in pieces if x['id'] == p['id'])['o0']
        voice.append(dict(a=p['a'], o0=base + p.get('a_at', 0)))
    if p.get('vo'):
        base = next(x for x in pieces if x['id'].split('.')[0] == p['id'])['o0']
        voice.append(dict(a=p['vo'], o0=base + p.get('vo_at', 0)))
DUR = t


def out_time(s, pid=None):
    """Output time of source second s (the first piece that plays it, or the named one)."""
    for q in pieces:
        if pid and q['id'].split('.')[0] != pid:
            continue
        if q.get('hold') is None and q['mode'] not in ('title', 'end') and q['v0'] <= s <= q['v1']:
            return q['o0'] + (s - q['v0']) / q['sp']
    raise ValueError(f'{s} not on screen' + (f' in {pid}' if pid else ''))


def voice_time(s):
    """Output time of voice second s."""
    for v in voice:
        if v['a'][0] <= s <= v['a'][1]:
            return v['o0'] + s - v['a'][0]
    raise ValueError(f'voice {s} not used')


# ---- captions: each piece's text chunks, timed by aligning their words to the transcript
norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
caps = []
for p in P:
    if not p.get('cap'):
        continue
    a0, a1 = p.get('a') or p.get('vo') or p['v']
    ws = [w for w in words if w['e'] > a0 + .02 and w['s'] < a1 - .02]
    chunks = p['cap'].split('|')
    toks, own = [], []
    for i, c in enumerate(chunks):
        for w in c.replace('*', '').split():
            if norm(w):
                toks.append(norm(w)); own.append(i)
    sm = difflib.SequenceMatcher(None, toks, [norm(w['w']) for w in ws], autojunk=False)
    first = {}
    for x, y, n in sm.get_matching_blocks():
        for k in range(n):
            first.setdefault(own[x + k], ws[y + k]['s'])
    starts = []
    for i in range(len(chunks)):
        s = first.get(i)
        if s is None:                                 # unmatched chunk: spread between its neighbours
            s = (starts[-1] + .8) if starts else a0
        starts.append(max(a0, min(s, a1 - .3)))
    starts[0] = a0
    for i, c in enumerate(chunks):
        s0, s1 = starts[i], (starts[i + 1] if i + 1 < len(chunks) else a1)
        try:
            o0 = voice_time(s0) if (p.get('a') or p.get('vo')) else out_time(s0, p['id'])
            o1 = voice_time(s1) if (p.get('a') or p.get('vo')) else out_time(min(s1, a1), p['id'])
        except ValueError:                            # a tight piece: the start fell in a removed silence
            o0 = out_time(next(q['v0'] for q in pieces if q['id'].split('.')[0] == p['id'] and q['v1'] > s0), p['id'])
            o1 = out_time(min(s1, a1), p['id']) if i + 1 == len(chunks) else None
        caps.append(dict(o0=round(o0, 3), o1=round(o1, 3) if o1 else None, t=c.strip()))
for i, c in enumerate(caps):                          # a chunk runs to the next one when they touch
    if c['o1'] is None:
        c['o1'] = caps[i + 1]['o0']
    if i + 1 < len(caps) and caps[i + 1]['o0'] - c['o1'] < .35:
        c['o1'] = caps[i + 1]['o0']
    c['o1'] = round(c['o1'], 3)

# ---- the follow camera on cmvng: the newest slip line (OCR'd y of "N legs", source px), rows above it
LEGS = [(145.0, 826, 4), (146.5, 735, 4), (148.0, 690, 4), (154.5, 1025, 5), (155.0, 902, 5), (156.5, 883, 5), (157.0, 818, 5),
        (159.5, 1025, 6), (160.0, 900, 6), (160.5, 887, 6), (163.0, 782, 6), (165.0, 1025, 7), (166.0, 890, 7), (169.5, 1032, 8),
        (170.0, 996, 8), (170.5, 889, 8), (179.0, 611, 8), (179.5, 1026, 8), (180.0, 973, 8), (180.5, 922, 8), (182.0, 827, 8),
        (188.0, 493, 8), (188.5, 1020, 8), (189.0, 851, 8), (191.0, 757, 8)]


def legs_cam(s):
    y, n = next(((y, n) for t0, y, n in reversed(LEGS) if s >= t0), (690, 4))
    rows = 52 * n
    top, bot = y - rows - 30, y + 120
    return [779, min(1080 - 300, max(300, (top + bot) / 2)), 2.2]


for q in pieces:
    if q['mode'] in ('bagel', 'cmvng'):
        if q.get('follow'):
            ks, last = [], None
            s = q['v0']
            while s <= q['v1'] + 1e-6:
                c = legs_cam(min(s, 191.0) if s < 200 else 191.0) if s < 200 else [779, 470, 2.2]
                if c != last:
                    ks.append([round(q['o0'] + (s - q['v0']) / q['sp'], 3), *c, .35 / max(1, q['sp'] / 2)])
                    last = c
                s += .5
            q['cam'] = ks
        elif q.get('camsrc'):
            q['cam'] = [[round(q['o0'] + max(0, k[0] - q['v0']) / q['sp'], 3), *k[1:4], *(k[4:5] or [.5])] for k in q['camsrc']]
        q.pop('camsrc', None)

# ---- the owner's video reactions (output times from the words they answer)
EV = [                                               # three reactions, as stickers (the owner's pick, 29 Oct)
    dict(k='sticker', id='sob', t0=round(out_time(215.05, 'f3'), 3), dur=3.0, from_=0.3, x=300, y=1075, w=470, rot=-4,
         note="I can't find this game"),
    dict(k='sticker', id='itsover', t0=round(out_time(439.25, 'f17'), 3), dur=2.8, from_=0.0, x=480, y=860, w=520, rot=4,
         note='for crying out loud'),
    dict(k='sticker', id='grin', t0=round(voice_time(492.15) - .05, 3), dur=3.2, from_=0.3, x=280, y=940, w=520, rot=-3,
         note='My combo pick has been played'),
]
for e in EV:
    if 'dur' in e:
        e['t1'] = round(e['t0'] + e.pop('dur'), 3)
    e['from'] = e.pop('from_')

# ---- marks on the real screens [x, y, w, h] in recording pixels, and the stamps and the tracker
MARKS = [
    dict(t0=out_time(74.9, 'hook'), t1=out_time(76.2, 'hook'), r=[80, 652, 424, 40]),             # yesterday's 7 Pick Combo
    dict(t0=out_time(77.50, 'hook'), t1=out_time(80.30, 'hook') + .1, r=[62, 676, 400, 60]),      # Kalmar v GAIS: the one to win
    dict(t0=out_time(97.0, 'e1'), t1=out_time(99.2, 'e1'), r=[566, 263, 432, 49]),                 # the ask box
    dict(t0=out_time(150.6, 'e3'), t1=out_time(152.1, 'e3'), r=[572, 572, 400, 48]),               # Everton v Newcastle
    dict(t0=out_time(152.6, 'e4'), t1=out_time(153.9, 'e4'), r=[575, 768, 84, 26]),                # Push higher
    dict(t0=out_time(185.6, 'e6'), t1=out_time(186.95, 'e6'), r=[660, 907, 46, 23]),               # Safer ("as safe as possible")
    dict(t0=out_time(262.9, 'f6'), t1=out_time(263.8, 'f6'), r=[68, 425, 445, 46]),                # Totals
    dict(t0=out_time(264.2, 'f6'), t1=out_time(265.3, 'f6'), r=[311, 525, 50, 36]),                # 4.5
    dict(t0=out_time(265.4, 'f6'), t1=out_time(266.3, 'f6'), r=[296, 615, 196, 50]),               # Under 84% (the panel closes at 266.35)
    dict(t0=out_time(482.6, 'g2'), t1=out_time(485.5, 'g2'), r=[212, 288, 156, 130]),              # $5, max payout, 2.02x
    dict(t0=out_time(490.6, 'g3'), t1=out_time(491.6, 'g3') + 1.2, r=[196, 60, 218, 38]),              # Combo Order Placed
]
for m in MARKS:
    m['t0'], m['t1'] = round(m['t0'], 3), round(m['t1'], 3)
STAMPS = [                                            # each stays 1.5 s from the moment it marks
    dict(t0=out_time(216.0, 'f3'), ok=False, text='Al-Khaleej v Al-Hazm', y=270),
    dict(t0=out_time(266.7, 'f6'), ok=True, text='Everton v Newcastle · Under 4.5', y=1080),
    dict(t0=out_time(285.6, 'f8'), ok=True, text='Leverkusen v Stuttgart · Over 1.5', y=1080),
    dict(t0=out_time(311.4, 'f10'), ok=False, text='Benfica v Gil Vicente', y=1080),
    dict(t0=out_time(346.2, 'f12'), ok=True, text='Brentford v Forest · Under 4.5', y=1080),
    dict(t0=out_time(370.6, 'f14'), ok=False, text='Shabana v Migori Youth', y=270),
    dict(t0=out_time(389.0, 'f16'), ok=True, text='Guijuelo v Sporting Gijón · Under 4.5', y=1080),
    dict(t0=out_time(464.8, 'f20'), ok=True, text='Frosinone v Lecce · Over 1.5', y=1080),
]
def mode_end(t):
    """Start of the first piece after time t that shows another app (a stamp ends with its screen)."""
    i = next(i for i, q in enumerate(pieces) if q['o0'] <= t < q['o1'])
    return next((q['o0'] for q in pieces[i + 1:] if q['mode'] != pieces[i]['mode']), DUR)


for i, x in enumerate(STAMPS):
    x['t1'] = min(x['t0'] + 1.5, STAMPS[i + 1]['t0'] - .05) if i + 1 < len(STAMPS) else x['t0'] + 1.5
    x['t1'] = min(x['t1'], mode_end(x['t0']))
for s in STAMPS:
    s['t0'], s['t1'] = round(s['t0'], 3), round(s['t1'], 3)
# the slip (cmvng, legs and odds) and the combo (Bagel, picks and the multiplier), as each screen shows them
TRACK = [dict(t=out_time(146.1, 'e3'), kind='SLIP', text='4 legs · 2.01'), dict(t=out_time(154.5, 'e5'), kind='SLIP', text='5 legs · 2.19'),
         dict(t=out_time(159.5, 'e5'), kind='SLIP', text='6 legs · 2.39'), dict(t=out_time(165.0, 'e5'), kind='SLIP', text='7 legs · 2.61'),
         dict(t=out_time(169.5, 'e5'), kind='SLIP', text='8 legs · 2.84'), dict(t=out_time(188.5, 'e7'), kind='SLIP', text='8 legs · 2.49'),
         dict(t=out_time(200.63, 'f1'), kind='COMBO', text='0 picks'), dict(t=out_time(266.7, 'f6'), kind='COMBO', text='1 pick'),
         dict(t=out_time(285.6, 'f8'), kind='COMBO', text='2 picks'), dict(t=out_time(346.2, 'f12'), kind='COMBO', text='3 picks · 1.33x'),
         dict(t=out_time(389.0, 'f16'), kind='COMBO', text='4 picks · 1.57x'), dict(t=out_time(462.0, 'f19'), kind='COMBO', text='5 picks · 1.79x'),
         dict(t=out_time(476.9, 'g1'), kind='COMBO', text='5 picks · 2.06x'), dict(t=out_time(482.09, 'g2'), kind='COMBO', text='5 picks · 2.02x')]
for x in TRACK:
    x['t'] = round(x['t'], 3)
CHAPTERS = []
for p in P:
    if p.get('chapter'):
        q = next(x for x in pieces if x['id'].split('.')[0] == p['id'])
        CHAPTERS.append(dict(t0=round(q['o0'], 3), kicker=p['chapter'][0], title=p['chapter'][1]))
for i, c in enumerate(CHAPTERS):
    c['t1'] = round(min(c['t0'] + 3.2, CHAPTERS[i + 1]['t0'] if i + 1 < len(CHAPTERS) else 1e9), 3)
# floats over the owner's head (real screens: [x, y, w, h] out, crop [sx, sy, sw, sh] of frame `at`) and name chips
FLOATS = [dict(t0=out_time(15.6, 'c3'), t1=out_time(19.6, 'c3'), at=62.6, crop=[70, 413, 446, 207], out=[150, 214, 780, 362], rot=-2),
          dict(t0=out_time(50.78, 'c5'), t1=out_time(54.05, 'c5'), at=484.5, crop=[170, 270, 240, 160], out=[230, 236, 620, 413], rot=2)]
for f in FLOATS:
    f['t0'], f['t1'] = round(f['t0'], 3), round(f['t1'], 3)
CHIPS = [dict(t0=out_time(2.50, 'c1'), t1=out_time(3.3, 'c1') + 1.2, text='Bagel', icon='bagel', x=540, y=420),
         dict(t0=out_time(37.30, 'c4b'), t1=out_time(38.95, 'c4b'), text='Polymarket', x=540, y=430),
         dict(t0=out_time(8.05, 'c2'), t1=out_time(11.1, 'c2b'), text='iOS', x=380, y=430),
         dict(t0=out_time(10.05, 'c2b'), t1=out_time(11.1, 'c2b') + .3, text='Android', x=700, y=430),
         dict(t0=out_time(55.1, 'c5'), t1=out_time(57.3, 'c5') + .2, text='cmvng', icon='cmvng', x=360, y=430),
         dict(t0=out_time(56.6, 'c5'), t1=out_time(57.3, 'c5') + .2, text='Bagel', icon='bagel', x=720, y=430)]
for c in CHIPS:
    c['t0'], c['t1'] = round(c['t0'], 3), round(c['t1'], 3)

trackFrom = next(x['o0'] for x in pieces if x['id'] == 'e1')
trackTo = next(x['o0'] for x in pieces if x['id'] == 'h1')
plan = dict(dur=round(DUR, 3), pieces=pieces, voice=voice, caps=caps, events=EV, marks=MARKS, stamps=STAMPS, tracker=TRACK,
            trackFrom=trackFrom, trackTo=trackTo, chapters=CHAPTERS, floats=FLOATS, chips=CHIPS,
            title=dict(lines=[dict(text='How to build', size=150, y=980), dict(text='a combo', size=190, y=1160, color='#1F5FDB')],
                       sub='with my own app, cmvng'),
            end=dict(line='Follow to see if they land', fine='18+ · Not financial advice · Only where Bagel is available'),
            music_level=0.12)
json.dump(plan, open(f'{K}/plan.json', 'w'), indent=1)
open(os.path.join(HERE, 'plan.js'), 'w').write('// written by plan.py\nwindow.PLAN = ' + json.dumps(plan) + '\n')
print(f'{len(pieces)} pieces, {len(caps)} captions, {len(voice)} voice pieces; {DUR:.2f} s')
for q in pieces:
    print(f"  {q['id']:7s} {q['mode']:6s} {q['o0']:7.2f}-{q['o1']:7.2f}  src {q.get('v0', 0):7.2f}-{q.get('v1', 0):7.2f}  x{q['sp']}")
for e in EV:
    print(f"  {e['k']:5s} {e['id']:9s} {e['t0']:7.2f}-{e['t1']:7.2f}  ({e['t1'] - e['t0']:.1f} s)  {e['note']}")
