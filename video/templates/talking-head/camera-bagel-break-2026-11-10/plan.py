"""The cut for the owner's 10 Nov recording (international break, Bagel): what is removed, where every word lands,
the captions and the cues for the page.
  python3 -I plan.py <work dir>      reads <work>/words_ctc.json and <work>/src_df3.wav, writes <work>/plan.json

Nothing the owner says is dropped except filler and hesitation: the opening "So, basically, like,", an "And", a
"Like, basically, like, you could still" and an "um". Pauses over about 0.45 s are closed to about 0.25 s. Every cut
sits in a real silence of the cleaned voice and on the 30 fps frame grid."""
import json, subprocess, sys
import numpy as np
K = sys.argv[1]
W = json.load(open(f'{K}/words_ctc.json'))
FPS, END_SRC, ENDCARD = 30, 106.96, 3.6
# the aligner stretched "Nations" over a hesitation and a pause; its real place is read off the energy of the voice
for i, (a, b) in {121: (51.22, 51.72), 122: (51.96, 52.74)}.items(): W[i]['s'], W[i]['e'] = a, b
snap = lambda t: round(t * FPS) / FPS
# source ranges taken out: [from, to, why]
REMOVE = [
    [0.00, 1.15, 'filler: "So, basically, like,"'],
    [4.17, 4.63, 'pause'], [8.87, 9.23, 'pause'],
    [14.42, 16.33, '"And" and the pause round it'],
    [23.76, 26.18, 'filler: "Like, basically, like, you could still"'],
    [38.09, 38.39, 'pause'],
    [49.27, 51.10, 'hesitation before "Nations League"'],
    [75.86, 76.21, 'pause'], [96.81, 97.64, 'pause'], [101.40, 102.82, 'pause'],
]
REMOVE = [[snap(a), snap(b), w] for a, b, w in REMOVE]
pieces, t = [], 0.0
for a, b, _ in REMOVE:
    if a > t: pieces.append([t, a])
    t = b
pieces.append([t, snap(END_SRC)])
pieces = [p for p in pieces if p[1] - p[0] > 0.01]
# every edge must be quiet in the cleaned voice
x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{K}/src_df3.wav', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                                 capture_output=True, check=True).stdout, np.float32)
def level(t, d=0.03):
    s = x[max(0, int((t - d / 2) * 16000)):int((t + d / 2) * 16000)]
    return 20 * np.log10(np.sqrt((s ** 2).mean()) + 1e-9) if len(s) else -120
off, o = [], 0.0
for s, e in pieces:
    off.append([s, e, o]); o += e - s
END = round(o, 4)
def out(ts):
    for s, e, o in off:
        if s - 1e-6 <= ts <= e + 1e-6: return round(o + ts - s, 3)
    return None
for i, (s, e) in enumerate(pieces):
    ls, le = level(s), level(e)
    print(f'piece {i:2d}  src {s:7.3f}-{e:7.3f}  out {out(s):6.2f}-{out(e):6.2f}  edges {ls:5.0f} / {le:5.0f} dB' + ('   LOUD EDGE' if (i and ls > -42) or (i < len(pieces) - 1 and le > -42) else ''))
ws = [dict(i=i, w=w['w'], s=out(w['s']), e=out(w['e'])) for i, w in enumerate(W)]
lost = [w for w in ws if w['s'] is None or w['e'] is None]
print('words cut:', ' '.join(f"{w['i']}:{w['w']}" for w in lost))
T = lambda i: next(w['s'] for w in ws if w['i'] == i)        # output time a word starts
Te = lambda i: next(w['e'] for w in ws if w['i'] == i)

# captions: [first word, last word, text]; *word* is drawn in blue. Fillers ("like", "basically") are left out.
CAPS = [
    [3, 10, 'The *international break* is actually happening right now,'], [11, 17, 'and there are going to be'],
    [18, 22, 'little to no *sports markets*'], [23, 29, 'that one would commonly associate themselves with,'],
    [30, 33, 'except for *international teams*.'],
    [35, 42, "It's going to be a very long"], [43, 50, '*two and a half weeks* without club football,'],
    [51, 58, "but that doesn't mean you can't still"], [59, 62, 'make predictions on *Bagel*.'],
    [69, 74, 'Get yourself familiar with *other sports*:'], [75, 77, '*basketball*, *esports*, *MMA*,'], [78, 81, 'every other sporting event.'],
    [82, 88, 'You could get yourself acclimatized with it'], [89, 94, 'and make some money off it.'],
    [95, 100, 'Or you could simply wait'], [101, 106, 'for when the *international teams* come in'], [107, 111, 'and play your favourite teams,'],
    [112, 117, 'like *England*, *Spain*, *Germany*, *Brazil*.'],
    [118, 120, 'Friendly matches,'], [121, 122, '*Nations League*,'], [123, 128, 'qualifiers continue, and stuff like that.'],
    [129, 136, 'So it depends on your approach to it.'],
    [137, 138, 'And remember:'], [139, 145, '*Bagel* is basically an offshoot of *Polymarket*.'],
    [146, 153, 'The plays you could play on Polymarket,'], [154, 159, 'you could play them on *Bagel*,'], [160, 165, 'making them to be more unique.'],
    [166, 173, 'For me, personally, I prefer playing *sports markets*.'], [174, 178, 'That is my specialty.'],
    [179, 185, 'I would actually love to'], [186, 191, 'take predictions on *crypto* on Bagel,'],
    [192, 197, "but I'd rather take *leverage*,"], [198, 205, 'longs or short positions on other platforms.'],
    [206, 211, 'But on *Bagel*, particularly, I am'], [212, 216, '*all in* on the *combo*.'],
    [217, 222, 'That combo is *sleek*.'], [223, 227, 'It does remind me'], [228, 231, 'of the traditional *bookmakers*,'],
    [232, 240, "and that's what makes me actually like"], [241, 243, 'predictions on *Bagel*.'],
    [244, 249, "So today, I'm imploring you to"], [250, 253, 'make predictions on *Bagel*'], [254, 257, 'and have some *fun*.'],
]
caps = []
for a, b, text in CAPS:
    caps.append(dict(o0=round(T(a) - 0.06, 3), o1=round(Te(b) + 0.22, 3), t=text, a=a, b=b))
for c, n in zip(caps, caps[1:]):
    c['o1'] = round(min(c['o1'], n['o0'] - 0.02), 3)
caps[0]['o0'] = 0.0
# cues for the page (output seconds): a word index, plus a lead where the picture should arrive just before the word
ev = dict(
    hook=0.0, leagues=T(18), intl=T(32), paused=T(48), card1_out=T(52),
    bagel=T(62), ph1_up=T(69) - 0.15, other=T(73), basket=T(75), esports=T(76), mma=T(77), every=T(78), ph1_down=T(82) - 0.1,
    fix_in=T(101) - 0.1, eng=T(113), esp=T(115), ger=T(116), bra=T(117), friendly=T(119), nations=T(121), quals=T(123), fix_out=T(129) + 0.2,
    pm_in=T(139) - 0.1, pm_poly=T(145), pm_plays=T(148), pm_bagel=T(159), pm_out=T(166) - 0.15,
    ph2_up=T(169) - 0.2, sports=T(172), crypto=T(189), ph2_down=T(192) - 0.05, lev=T(197), longs=T(199), shorts=T(201), lev_out=T(206) - 0.1,
    ph3_up=T(210) - 0.1, allin=T(212), combo=T(216), sleek=T(222), book=T(231), likeit=T(240), ph3_down=T(244) - 0.15,
    today=T(245), end_bagel=T(253), fun=T(257), end=END,
)
ev = {k: round(v, 3) for k, v in ev.items()}
# a punch-in with no sound cut at these sentence starts, so a long piece does not sit on one framing
PUNCH = [snap(W[i]['s'] - 0.10) for i in (82, 129, 137, 166, 206)]
# where the camera goes soft behind a phone or the Bagel logo: [in, out] in output seconds
soft = [[ev['ph1_up'] - 0.1, ev['ph1_down'] + 0.1], [ev['ph2_up'], ev['ph2_down'] + 0.1], [ev['ph3_up'], ev['ph3_down'] + 0.1]]
# picture segments: every cut, and every extra punch point, switches between the base framing and a 5% punch-in
segs, z = [], 0
for s_, e_ in pieces:
    cuts = [s_] + [t for t in PUNCH if s_ + 1.5 < t < e_ - 1.5] + [e_]
    for a, b in zip(cuts, cuts[1:]):
        segs.append(dict(s=a, e=b, zoom=1.0 if z % 2 == 0 else 1.05)); z += 1
json.dump(segs, open(f'{K}/segs.json', 'w'), indent=0)
plan = dict(fps=FPS, end=END, endcard=ENDCARD, total=round(END + ENDCARD, 4), pieces=[dict(s=s, e=e, o=o) for s, e, o in off], removed=REMOVE, words=ws, caps=caps, ev=ev, punch=PUNCH, segs=segs, soft=[[round(a, 3), round(b, 3)] for a, b in soft])
json.dump(plan, open(f'{K}/plan.json', 'w'), indent=0)
open(f'{K}/plan.js', 'w').write('window.PLAN = ' + json.dumps(dict(end=END, endcard=ENDCARD, caps=caps, ev=ev)) + '\n')
print(f'{len(pieces)} pieces, speech {END:.2f} s, with the end card {END + ENDCARD:.2f} s; {len(caps)} captions')
for k, v in ev.items(): print(f'  {k:10s} {v:6.2f}', end='')
print()
