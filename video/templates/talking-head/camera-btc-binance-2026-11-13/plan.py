"""The cut for the owner's 13 Nov recording (Bitcoin after the Binance hack, compared with the Bybit hack): what is
removed, where every word lands, the captions and the cues for the page.
  python3 -I plan.py <work dir> [-v]   reads <work>/words_ctc.json, <work>/words_fixed.json (the recogniser's own times)
                                       and <work>/src16.wav (the recording's sound, 16 kHz mono); writes plan.json,
                                       plan.js, segs.json

The recording is an export from an editing app: between phrases the sound is digital silence, so every pause can be
found exactly. The cut is made from those silences, never from word times alone:
- every silence of 0.50 s or more is closed to 0.30 s (0.42 s after the end of a sentence);
- three stretches come out whole, each from one silence to another: an "um" and the first of two "Bybit was hacked",
  the first of two "it took about 49 days" (the second, "it took 49 days of intense selling pressure", stays), and the
  second of two "the problem here is that".
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
DROPS = [[sil_at(11.8)[0] + 0.14, sil_at(15.0)[1] - 0.18, 'an "um" and the first of two "Bybit was hacked"'],
         [sil_at(18.5)[0] + 0.14, sil_at(24.2)[1] - 0.18, 'the first of two "it took about 49 days"'],
         [sil_at(142.6)[0] + 0.14, sil_at(144.6)[1] - 0.18, 'the second of two "the problem here is that"']]
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

# captions: [first word, last word, text]; *word* is drawn in blue. The owner's words, as said ("hacked" where the
# recogniser heard "act"). Words that could not be made out are left out of the caption, never guessed: "in which pipe
# it was" (after "1.5 billion dollars"), "the gold about", "but not" (before "25% also"), and the fillers "each" and "um".
CAPS = [
    [0, 6, 'Let me just give a *critical breakdown*'], [7, 10, 'of the current situation'], [11, 14, 'with the *Bitcoin charts*'], [15, 18, 'or cryptocurrency in general,'],
    [19, 22, "and what we're expecting"], [23, 26, 'in the coming days'], [27, 31, 'or in the coming weeks.'],
    [32, 35, 'Now, back in *2025*,'], [36, 46, 'when *Bybit was hacked*'], [47, 54, 'of about *1.5 billion dollars* or so,'],
    [61, 64, 'it took *49 days*'], [65, 68, 'of intense *selling pressure*,'], [69, 72, 'like, selling *red candle*'], [73, 75, 'after *red candle*'], [76, 78, 'after *red candle*'], [79, 81, 'after *red candle*'],
    [82, 85, 'before price eventually *bottom*.'], [86, 89, "I think it's actually"], [90, 93, 'from *91 thousand dollars*'], [94, 100, 'and it dumped to *76 thousand dollars*.'],
    [101, 106, "It's dumped to that region,"], [107, 111, 'and basically, like, it dumped'], [112, 117, 'in total of *minus 25%*'], [118, 124, 'during that period, during that *49 days*.'],
    [125, 131, 'That was for *1.5 billion dollars*.'],
    [137, 143, 'Then they had to take *loans* from'], [144, 148, 'other... like, they took loans'], [149, 155, 'and they were able to, like, *recover*.'],
    [156, 160, "Now let's come to *Binance*."], [161, 169, 'Binance was hacked of *6.5 billion dollars*.'], [170, 175, 'Who did they take *loans* from?'],
    [176, 183, "Okay, let's say, for example, like,"], [184, 192, 'they use part of their *reserve* to replenish that.'],
    [193, 197, 'Which fund goes to replenish'], [198, 204, 'the money they took from their *reserve*?'], [205, 207, 'Like, basically, like,'],
    [208, 216, 'the money cannot be taken without it being *refilled*.'], [217, 222, 'It has to come from *somewhere*.'],
    [223, 229, 'And again, if you have to consider,'], [230, 236, "let's say that they said that,"], [239, 245, 'I think it was not 2 billion,'],
    [246, 255, 'it would be 1.5 billion or 2 billion dollars'], [256, 263, '*frozen* by *USDC* and *USDT*, another industry partner.'],
    [264, 270, "Let's assume *3 billion dollars* was frozen"], [271, 275, 'which they could recover back,'], [276, 286, 'so 6.5 minus 2 billion is like *4.5 billion*,'],
    [287, 292, 'which is still about 2.5,'], [293, 297, 'or *2.5x* more'], [298, 302, 'than the *Bybit hack*.'], [303, 307, 'Now, Bybit hack took'], [308, 310, '*49 days*'],
    [311, 315, 'for price to stop selling,'], [316, 321, 'and it dumped about *25%*.'], [322, 330, 'So technically, if you do the plus and minus,'],
    [331, 335, "which means, let's say, fairly,"], [336, 344, "let's say it will give you a fair take."], [345, 353, 'We expect Bitcoin to *dump the same amount*,'],
    [356, 358, '*25%* also,'], [359, 365, 'in the region of, like, *45 days*.'], [366, 371, 'But the problem here is that,'], [377, 381, 'the *Binance hack is larger*.'],
    [382, 388, "And technically, it's going to take more"], [389, 391, 'to recover it.'], [392, 399, 'And again, there is now a lot of'], [400, 404, '*bearish sentiment* on the TL,'],
    [405, 406, 'with *Nvidia*,'], [407, 412, 'with the Republicans losing the *midterms*,'], [413, 417, 'with risk of more *inflation*,'], [418, 423, '*rate hikes* and every single thing.'],
    [424, 432, 'Like, it could go to as low as, like,'], [433, 434, '*minus 50%*.'], [435, 442, 'Like, that means, like, Bitcoin was *currently*, like,'], [443, 447, "it's something that, that means"],
    [448, 453, 'Bitcoin could trade as low as'], [454, 458, 'for the *$70,000-ish*.'], [459, 467, 'Well, you can actually, like, check the charts anyways,'],
    [468, 475, "like, I'm just like, I'm saying, I'm saying,"], [476, 483, 'on the charts, look, I check the charts,'], [484, 492, 'you can check what happened during the *Bybit hack*'],
    [493, 496, 'and what price did,'], [497, 502, 'I can *compare* that with this'], [503, 509, "and see if I'm actually making sense."],
    [510, 516, 'So basically, I expect *more selling pressure*,'], [517, 519, "like, I'm currently"], [520, 520, '*bearish*,'], [521, 521, '*bearish*,'], [522, 522, '*bearish*'],
    [523, 528, 'on Bitcoin *till the new year*.'], [529, 535, 'So it is what it is, anyways.'],
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
