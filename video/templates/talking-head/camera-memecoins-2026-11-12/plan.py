"""The cut for the owner's 12 Nov recording ("meme coins have served its purpose"): what is removed, where every word
lands, the captions and the cues for the page.
  python3 -I plan.py <work dir> [-v]   reads <work>/words_ctc.json, <work>/words_fixed.json (the recogniser's own times)
                                       and <work>/src16.wav (the recording's sound, 16 kHz mono); writes plan.json,
                                       plan.js, segs.json

The recording is an export from an editing app: between phrases the sound is digital silence, so every pause can be
found exactly. The cut is made from those silences, never from word times alone:
- every silence of 0.50 s or more is closed to 0.30 s (0.42 s after the end of a sentence): the owner pauses for up
  to a second in the middle of sentences;
- five stretches come out whole, each from one silence to another: the opening filler ("So basically, like, this is
  my thoughts. I'm going to say this in one minute, my one minute thoughts."), a slip that reversed the meaning
  ("except if there is no change in the current model"), the second "like, it never used to be like this", an "um"
  after "Retardio", and a click in the long pause before "if nothing changes".
Nothing is cut where there is no silence, so no word is clipped. Cuts sit on the recording's 30 fps grid."""
import json, subprocess, sys
import numpy as np
K = sys.argv[1]
W = json.load(open(f'{K}/words_ctc.json')); WI = json.load(open(f'{K}/words_fixed.json'))
FPS, ENDCARD = 30, 3.8
snap = lambda t: round(t * FPS) / FPS
x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{K}/src16.wav', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout, np.float32)
env = np.array([20 * np.log10(np.sqrt((x[i:i + 320] ** 2).mean()) + 1e-9) for i in range(0, len(x) - 320, 160)])     # 20 ms windows every 10 ms
QUIET = -52.0
def level(t, d=0.03):
    s = x[max(0, int((t - d / 2) * 16000)):int((t + d / 2) * 16000)]
    return 20 * np.log10(np.sqrt((s ** 2).mean()) + 1e-9) if len(s) else -120
SIL, st = [], None
for i, v in enumerate(list(env < QUIET) + [False]):
    if v and st is None: st = i
    if not v and st is not None:
        if i - st >= 30: SIL.append((st / 100 + .01, i / 100 + .01))
        st = None
# word times: the aligner sometimes puts a word on the wrong side of a silence (or inside one). Each stretch of speech
# between two silences is an island; a word belongs to the island the recogniser heard it in. A word the aligner put
# elsewhere gets the recogniser's time, kept inside its island.
ISL = [(0.0 if k == 0 else SIL[k - 1][1], SIL[k][0]) for k in range(len(SIL))] + [(SIL[-1][1], len(x) / 16000)]
ISL = [(a, b) for a, b in ISL if b - a > 0.05]
def island(t): return min(range(len(ISL)), key=lambda k: 0 if ISL[k][0] <= t <= ISL[k][1] else min(abs(t - ISL[k][0]), abs(t - ISL[k][1])))
home = [island((WI[i]['s'] + WI[i]['e']) / 2 + 0.04) for i in range(len(W))]
for i in range(1, len(W)): home[i] = max(home[i], home[i - 1])          # islands in order
redo = set()
for i, w in enumerate(W):
    a, b = ISL[home[i]]
    if island((w['s'] + w['e']) / 2) != home[i] or not (a - 0.03 <= (w['s'] + w['e']) / 2 <= b + 0.03): redo.add(home[i])
    else: w['s'], w['e'] = max(w['s'], a), min(w['e'], b)
for k in sorted(redo):                        # an island the aligner got wrong: its words are spread over it by their length
    ids = [i for i in range(len(W)) if home[i] == k]; a, b = ISL[k]; wt = [len(W[i]['w']) + 1.5 for i in ids]; tot = sum(wt); t0 = a + 0.02
    for i, v in zip(ids, wt):
        d = (b - a - 0.04) * v / tot; W[i]['s'], W[i]['e'] = t0, t0 + d * 0.92; t0 += d
print('islands re-timed by word length:', len(redo), '| words in them:', sum(1 for i in range(len(W)) if home[i] in redo))
W[454]['s'], W[454]['e'] = 168.72, 168.90     # "if nothing changes" starts after the long pause; the aligner put "if" on the click inside it
for i in range(1, len(W)):                    # keep them in order
    if W[i]['s'] < W[i - 1]['s'] + 0.03: W[i]['s'] = W[i - 1]['s'] + 0.03
    if W[i]['e'] < W[i]['s'] + 0.05: W[i]['e'] = W[i]['s'] + 0.05
S, E = (lambda i: W[i]['s']), (lambda i: W[i]['e'])
sil_at = lambda t: next((a, b) for a, b in SIL if a - 0.02 <= t <= b + 0.02)
DROPS = [[0.0, sil_at(8.0)[1] - 0.12, 'the opening filler'],
         [sil_at(27.9)[0] + 0.14, sil_at(31.4)[1] - 0.18, 'a slip: "except if there is no change in the current model"'],
         [sil_at(74.0)[0] + 0.16, sil_at(76.2)[1] - 0.22, 'repeat: "like, it never used to be like this"'],
         [sil_at(84.2)[0] + 0.13, sil_at(85.4)[1] - 0.17, 'an "um" after "Retardio"'],
         [sil_at(166.0)[0] + 0.16, sil_at(168.0)[1] - 0.22, 'a click in the pause before "if nothing changes"']]
REMOVE = [d[:] for d in DROPS]
for a, b in SIL:
    if any(d[0] - 0.3 < a < d[1] + 0.3 or d[0] - 0.3 < b < d[1] + 0.3 for d in DROPS) or a > E(len(W) - 1): continue
    prev = max([i for i, w in enumerate(W) if w['e'] <= a + 0.25], default=0)
    keep = 0.42 if W[prev]['w'][-1] in '.?!' else 0.30
    if b - a >= 0.50: REMOVE.append([a + keep * 0.45, b - keep * 0.55, f'pause after "{W[prev]["w"]}" ({b - a:.2f} s)'])
REMOVE = sorted([[snap(a), snap(b), w] for a, b, w in REMOVE if b - a > 0.12])
END_SRC = snap(E(len(W) - 1) + 0.40)
pieces, t = [], 0.0
for a, b, _ in REMOVE:
    if a > t + 1e-6: pieces.append([t, a])
    t = max(t, b)
pieces.append([t, END_SRC]); pieces = [p for p in pieces if p[1] - p[0] > 0.01]
off, o = [], 0.0
for s, e in pieces:
    off.append([s, e, o]); o += e - s
END = round(o, 4)
def out(ts):
    for s, e, o in off:
        if s - 1e-6 <= ts <= e + 1e-6: return round(o + ts - s, 3)
    return None
def out_near(ts):                             # a word edge that fell just inside a cut: the nearest kept instant
    v = out(ts)
    if v is not None: return v
    for s, e, o in off:
        if abs(ts - s) < 0.12: return round(o, 3)
        if abs(ts - e) < 0.12: return round(o + e - s, 3)
    return None
loud = 0
for i, (s, e) in enumerate(pieces):
    ls, le = level(s), level(e); bad = (i and ls > QUIET + 4) or (i < len(pieces) - 1 and le > QUIET + 4); loud += bool(bad)
    if bad or '-v' in sys.argv: print(f'piece {i:2d}  src {s:7.3f}-{e:7.3f}  out {out(s):6.2f}-{out(e):6.2f}  edges {ls:5.0f} / {le:5.0f} dB' + ('   LOUD EDGE' if bad else ''))
ws = [dict(i=i, w=w['w'], s=out_near(w['s']), e=out_near(w['e'])) for i, w in enumerate(W)]
for w in ws:
    if (w['s'] is None) != (w['e'] is None): w['s'] = w['e'] = None
lost = [w for w in ws if w['s'] is None]
print('%d silences; %d loud edges' % (len(SIL), loud))
print('words cut:', ' '.join(f"{w['i']}:{w['w']}" for w in lost))
T = lambda i: next(w['s'] for w in ws if w['i'] == i)
Te = lambda i: next(w['e'] for w in ws if w['i'] == i)

# captions: [first word, last word, text]; *word* is drawn in blue. The owner's words, as said. Two tidy-ups: the unclear
# "like, cash cats" is written "like, cats," and "the is liquidity" is written "the liquidity".
CAPS = [
    [19, 23, 'I personally believe *meme coins*'], [24, 27, 'have *served its purpose*'], [28, 31, 'with this current model.'],
    [32, 37, 'With *launchpads* benefiting off fees,'], [38, 45, 'with *vamp* meme coins trading against each other,'], [46, 49, 'with *fragmentation* of liquidity.'],
    [50, 58, 'I believe it has served its purpose for now.'],
    [69, 73, 'This is the same thing'], [74, 78, 'that happened with *altcoins* also,'], [79, 83, 'before meme coins came in'], [84, 87, 'and actually took over'], [88, 92, 'what altcoins used to be.'],
    [93, 97, 'So, I just generally believe'], [98, 101, 'that *retail is tired*.'], [102, 107, 'Like, they have seen it all.'],
    [108, 112, 'They are tired of actually'], [113, 117, 'buying this meme coin *today*,'], [118, 123, "and *tomorrow* there's a new one,"],
    [124, 130, 'and they have to *sell* that one'], [131, 135, 'to *buy* into this one,'], [136, 141, 'then this one goes up again,'], [142, 146, "and there's a new one,"],
    [147, 155, 'they have to sell to buy the new one,'], [156, 162, "and it's more or less like a"], [163, 164, '*rat race*.'],
    [165, 170, 'I feel like meme coins today'], [171, 176, 'is like a *rat race* chasing,'], [177, 183, 'except you have a very good *skill*.'],
    [184, 192, 'If you do not have a very good skill,'], [193, 196, 'believe me, you just'], [197, 198, '*burn liquidity*,'], [199, 202, 'burn and burn liquidity.'],
    [203, 209, 'It never used to be like this.'],
    [218, 222, '*Previously*, in the last cycle,'], [223, 228, 'we had meme coins like *Peanut*,'], [229, 229, '*Pepe*,'], [230, 230, '*Billy*,'], [231, 231, '*Retardio*,'],
    [232, 237, 'we had meme coins like *Bonk*,'], [238, 243, 'we had meme coins like *WIF*,'], [244, 250, 'that you could buy, and with confidence,'], [251, 255, 'like, you are sure that'],
    [256, 262, 'you could wake up the next morning'], [263, 265, 'with a *2x*,'], [266, 272, 'you could wake up the next day'], [273, 275, 'with a *3x*.'],
    [276, 284, 'At least, worst case scenario, a *50% return*.'], [285, 285, 'But'], [286, 290, "that's *not the case today*."],
    [291, 299, 'I just believe that if there is no change,'], [300, 307, 'if there is no adjustment in the model,'], [308, 312, 'if the current system remains'],
    [313, 320, 'whereby you can launch *thousands* of meme coins,'], [321, 324, 'make money off *fees*,'], [325, 331, 'like, the current model is just a *disaster*,'], [332, 335, "it's just a *mess*."],
    [336, 342, 'If it continues to remain like this,'], [343, 345, 'I believe that'], [346, 349, "it's going to be"], [350, 352, '*downhill from here*.'],
    [353, 362, 'I just feel like there needs to be a *change*,'], [363, 366, 'needs to be something'], [367, 374, 'that could make meme coins to be *better*,'],
    [375, 380, 'because what made meme coins better'], [381, 383, 'in *2023, 24*'], [384, 387, 'was the fact that'], [388, 395, 'there were *too little numbers* of meme coins'], [396, 399, 'available in the market.'],
    [400, 405, 'But now, it now became *saturated*.'], [406, 408, 'Like, we have'], [409, 412, '*millions* of meme coins.'],
    [413, 418, 'I can name meme coins that'], [419, 425, 'I thought was a good narrative before,'], [426, 428, "and now it's"], [429, 429, '*zero*.'],
    [430, 431, '*Nub Cat*,'], [432, 435, 'we have *Popcat*,'], [436, 438, 'like, cats,'], [439, 442, 'different kind of cats,'], [443, 449, 'we have different kind of *dog coins*,'], [450, 453, 'every single thing. Like,'],
    [454, 456, 'if nothing changes,'], [457, 461, 'meme coins should basically lose'], [462, 469, 'what it means to be a *meme coin*.'],
    [470, 472, '*Imagine*, right now,'], [473, 477, 'there is a meme coin,'], [478, 482, 'and *Elon Musk* tweets about'], [483, 489, 'a meme coin in a narrative way,'], [490, 494, 'or in a subtle way,'],
    [495, 503, 'and that meme coin can actually trade up to'], [504, 507, '*100 million* market cap,'], [508, 511, 'or 200, or 300.'],
    [512, 518, 'It means there is a *fundamental problem*.'], [519, 523, 'It means the sole purpose'], [524, 528, 'of memes have *lost value*.'],
    [529, 535, 'If the *richest man in the world*'], [536, 543, 'can make a tweet about a meme coin,'], [544, 547, 'and it cannot trade'], [548, 552, 'close to *100, 200 million*'], [553, 555, 'in market valuation,'],
    [556, 557, "then there's"], [558, 559, '*something wrong*.'],
    [560, 565, 'Or, this is just my thoughts.'], [566, 569, 'I do not know'], [570, 575, 'if I might be saying rubbish,'], [576, 581, 'or talking something that is valid,'],
    [582, 588, 'but I just believe meme coins today'], [589, 590, 'are *oversaturated*,'], [591, 596, 'and the liquidity cannot serve'], [597, 601, 'the current market for memes,'],
    [602, 607, 'except you have *insider information*,'], [608, 612, 'you basically run the scheme'], [613, 615, 'of *bundling* tokens'], [616, 620, 'and *dumping* on your followers,'],
    [621, 623, 'or, basically, like,'], [624, 631, 'you have access to a group of *cabals*.'],
    [632, 640, 'If you are just a regular trader with skill,'], [641, 645, 'or just a regular investor'], [646, 654, 'looking to buy into a meme that you like,'], [655, 656, 'you get'], [657, 658, '*burnt out*.'], [659, 659, '*Peace*.'],
]
covered = set()
for a, b, _ in CAPS: covered.update(range(a, b + 1))
kept = {w['i'] for w in ws if w['s'] is not None}
print('kept words with no caption:', sorted(kept - covered), '| captioned but cut:', sorted(covered - kept))
caps = []
for a, b, text in CAPS:
    caps.append(dict(o0=round(T(a) - 0.06, 3), o1=round(Te(b) + 0.25, 3), t=text, a=a, b=b))
for c, n in zip(caps, caps[1:]): c['o1'] = round(min(c['o1'], n['o0'] - 0.02), 3)
caps[0]['o0'] = 0.0
segs = [dict(s=s, e=e) for s, e in pieces]
json.dump(segs, open(f'{K}/segs.json', 'w'), indent=0)
plan = dict(fps=FPS, flip=False, end=END, endcard=ENDCARD, total=round(END + ENDCARD, 4), pieces=[dict(s=s, e=e, o=o) for s, e, o in off], removed=REMOVE, words=ws, caps=caps, ev={}, segs=segs)
json.dump(plan, open(f'{K}/plan.json', 'w'), indent=0)
# the page gets the captions, every word's source time and the kept pieces, and wt/we: each word's start and end in the finished video (null if cut)
open(f'{K}/plan.js', 'w').write('window.PLAN = ' + json.dumps(dict(fps=FPS, end=END, endcard=ENDCARD, caps=caps, ev={}, pieces=plan['pieces'],
    words=[dict(s=W[w['i']]['s'] if w['s'] is not None else None) for w in ws], wt=[w['s'] for w in ws], we=[w['e'] for w in ws])) + '\n')
print(f'{len(pieces)} pieces ({len(REMOVE)} cuts, {sum(b - a for a, b, _ in REMOVE):.1f} s out of {END_SRC:.1f}), speech {END:.2f} s, with the end card {END + ENDCARD:.2f} s; {len(caps)} captions')
badc = [(c['a'], c['t'], c['o0'], c['o1']) for c in caps if c['o1'] - c['o0'] < 0.28]
print('captions shorter than 0.28 s:', badc)
