"""The cut for the owner's 13 Nov recording explaining RNT Protocol ("the DeFi of rentals", with Mr A and Mr B):
what is removed, where every word lands, the captions and the cues for the page.
  python3 -I plan.py <work dir> [-v]   reads <work>/words_ctc.json, <work>/words_fixed.json and <work>/src16.wav;
                                       writes plan.json, plan.js, segs.json

The recording is an export from an editing app: between phrases the sound is digital silence, so every pause can be
found exactly. The cut is made from those silences, never from word times alone:
- every silence of 0.50 s or more is closed to 0.30 s (0.42 s after the end of a sentence);
- three stretches come out whole: a false start ("let's say for example, let's use Mr A... let me give you like
  this"), said again properly a few seconds later; the first "and here is the catch, like, if for example", said
  again after the interest line; and a slip, "Mr A can supply the token, like the liquidity, into the pool for Mr A to
  borrow from" (Mr B is the supplier, as the sentence before it says).
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
for i in range(1, len(W)):                    # keep them in order
    if W[i]['s'] < W[i - 1]['s'] + 0.03: W[i]['s'] = W[i - 1]['s'] + 0.03
    if W[i]['e'] < W[i]['s'] + 0.05: W[i]['e'] = W[i]['s'] + 0.05
S, E = (lambda i: W[i]['s']), (lambda i: W[i]['e'])
sil_at = lambda t: next((a, b) for a, b in SIL if a - 0.02 <= t <= b + 0.02)
DROPS = [[sil_at(12.6)[0] + 0.14, sil_at(26.6)[1] - 0.18, 'a false start, said again properly after it'],
         [sil_at(56.3)[0] + 0.14, sil_at(60.8)[1] - 0.18, 'the first "here is the catch, like, if for example", said again after the interest line'],
         [sil_at(110.0)[0] + 0.14, 119.30, 'a slip: "Mr A can supply the token... for Mr A to borrow from" (Mr B is the supplier)']]
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

# captions: [first word, last word, text]; *word* is drawn in blue. The owner's words, as said. Left out because they
# could not be made out: "to set to sell some things" (after "he needs money") and "I completely" (after "interest").
CAPS = [
    [0, 4, "Okay, so in today's video"], [5, 11, "I'm going to be describing or explaining"], [12, 19, 'to you what *RNT Protocol* is'], [20, 25, 'and what you need to know.'],
    [26, 31, "I'll use a practical use case"], [32, 41, "so that it's to give you a more defined look."],
    [75, 79, 'Um, *RNT Protocol* is'], [80, 85, 'like the *DeFi of rental properties*,'], [86, 89, 'like, of rentals,'], [90, 95, "like, it's just the *DeFi of rentals*."],
    [96, 104, "Let's say that *Mr A* owns like *$10,000*"], [105, 110, 'of this rental property, like, *token*'], [111, 119, 'and basically, like, of a *house* or whatever,'],
    [120, 126, 'he owns $10,000 worth of it,'], [127, 133, 'and he wants to take a *loan*,'], [134, 137, 'like, he needs money'],
    [144, 151, 'so basically, like, he can take a loan'], [152, 156, 'up to *7,500 dollars*,'], [157, 161, 'which is about *75%*.'],
    [171, 177, 'Like, because once it takes the loan,'], [181, 188, 'like, it starts paying *interest every single day*.'],
    [189, 192, 'Here is the *catch*:'], [193, 196, 'if by any chance'], [197, 205, 'the interests, or the loan, reaches about *80%*,'],
    [206, 210, 'like, the token gets *sold*'], [211, 214, 'in the open markets,'], [215, 219, 'and because of late payment,'], [220, 228, 'it pays a *10% fine* on its token,'],
    [229, 231, 'which means that'], [232, 240, 'you can take a loan up to *75%*,'], [241, 244, 'but if you *default*,'], [245, 250, 'you pay a fine, *10%*,'], [251, 255, 'and the token gets *sold*.'],
    [256, 263, "Now let's give another example: *Mr B*."], [264, 270, 'Mr B has cash, like, *$10,000*'], [271, 277, 'excess cash, or *$15,000* excess cash,'],
    [278, 284, 'and he does not know what to use it for,'], [285, 290, 'he can actually be the *supplier*'], [291, 298, 'for Mr A to take the loan for.'],
    [319, 323, "So on *Mr B's side*,"], [324, 329, 'he actually earns a *fixed APY*.'], [330, 340, 'I think, as of, like, the last time I checked it,'], [341, 350, 'it was like *10% or 10.5% APY*.'],
    [351, 356, "I'm not sure about the figure."], [357, 362, 'So he earns, Mr B,'], [363, 366, 'a *fixed* amount of APY'], [367, 371, 'for the loan it supplies.'],
    [372, 383, 'So, more or less, in simple terms,'], [384, 388, 'the *DeFi of rental properties*.'], [389, 395, 'So as I explore this,'],
    [396, 402, 'you begin to have a better understanding'], [403, 408, 'of what *RNT Protocol* simply means.'],
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
