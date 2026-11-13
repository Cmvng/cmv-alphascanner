"""The cut for the owner's 13 Nov recording about one of their flops: about eight posts for XO Market's campaign on
Kaito that did not make the top 50, the Limitless ambassador badge lost over the first of them, and the $50 for three
months of ambassador posts. What is removed, where every word lands, the captions and the cues for the page.
  python3 -I plan.py <work dir> [-v]   reads <work>/words_ctc.json, <work>/words_fixed.json and <work>/src16.wav;
                                       writes plan.json, plan.js, segs.json

The recording is an export from an editing app: between phrases the sound is digital silence, so every pause can be
found exactly. The cut is made from those silences, never from word times alone:
- every silence of 0.50 s or more is closed to 0.30 s (0.42 s after the end of a sentence);
- two repeats come out whole: the second "or the next one will be a flop", and "So this is what it is" just before
  "Yeah, it is what it is".
Nothing else is taken out: the rambling "okay, like, after every... what's the boss, like, what would you be?" has no
silence inside it to cut at, and "I also ignored the message" sits in the middle of it, so it stays (uncaptioned where
it cannot be made out). Nothing is cut where there is no silence, so no word is clipped."""
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
bad = set()
for i, w in enumerate(W):
    a, b = ISL[home[i]]
    if island((w['s'] + w['e']) / 2) != home[i] or not (a - 0.03 <= (w['s'] + w['e']) / 2 <= b + 0.03): bad.add(i)
    else: w['s'], w['e'] = max(w['s'], a), min(w['e'], b)
def spread(ids, a, b):                        # words laid over a..b by their length
    wt = [len(W[i]['w']) + 1.5 for i in ids]; tot = sum(wt); t0 = a
    for i, v in zip(ids, wt):
        d = (b - a) * v / tot; W[i]['s'], W[i]['e'] = t0, t0 + d * 0.92; t0 += d
whole = edge = 0
for k in sorted({home[i] for i in bad}):
    ids = [i for i in range(len(W)) if home[i] == k]; a, b = ISL[k]
    if sum(i in bad for i in ids) > 0.3 * len(ids):            # the aligner got the island wrong: all its words by length
        spread(ids, a + 0.02, b - 0.02); whole += 1; continue
    # only a word or two strayed (usually into the next pause): each run of them fills the gap its good neighbours leave
    n = 0
    while n < len(ids):
        if ids[n] not in bad: n += 1; continue
        m = n
        while m < len(ids) and ids[m] in bad: m += 1
        lo = W[ids[n - 1]]['e'] + 0.02 if n > 0 else a + 0.02
        hi = W[ids[m]]['s'] - 0.02 if m < len(ids) else b - 0.02
        run_ids = ids[n:m]
        if hi - lo < 0.18 * (m - n):          # the neighbour was stretched over their room: it is laid out with them
            if m == len(ids) and n > 0: run_ids = [ids[n - 1]] + run_ids; lo = W[ids[n - 1]]['s']
            elif n == 0 and m < len(ids): run_ids = run_ids + [ids[m]]; hi = W[ids[m]]['e']
        spread(run_ids, lo, max(hi, lo + 0.08 * len(run_ids))); edge += m - n; n = m
print(f'islands re-timed whole by word length: {whole} | stray words placed between their neighbours: {edge}')
for i in range(1, len(W)):                    # keep them in order
    if W[i]['s'] < W[i - 1]['s'] + 0.03: W[i]['s'] = W[i - 1]['s'] + 0.03
    if W[i]['e'] < W[i]['s'] + 0.05: W[i]['e'] = W[i]['s'] + 0.05
S, E = (lambda i: W[i]['s']), (lambda i: W[i]['e'])
sil_at = lambda t: next((a, b) for a, b in SIL if a - 0.02 <= t <= b + 0.02)
DROPS = [[sil_at(73.7)[0] + 0.14, sil_at(75.5)[1] - 0.18, 'a repeat: "or the next one will be a flop"'],
         [sil_at(176.5)[0] + 0.14, sil_at(178.9)[1] - 0.18, 'a repeat: "So this is what it is", said again as "Yeah, it is what it is"']]
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

# captions: [first word, last word, text]; *word* is drawn in blue. The owner's words, as said. The swear word is
# starred (with U+2217, since * marks the blue). Left out because they cannot be made out: "open that" (after "XO
# Market"), "And I was, okay, like, after every," and "like, what's the, what's the, what's the boss, like, what would
# you be?" (around "I also ignored the message"). Word 345 ("and", before the last "I'm like this") is not in the sound
# (scored against the recording: dropping it scores far better than dropping any other word), so it is not captioned.
CAPS = [
    [0, 2, 'Right, so basically,'], [3, 8, "I'm going to be talking about"], [9, 13, 'my, one of my *flops*,'], [14, 19, 'like, one of my *big flops*.'],
    [20, 26, 'So I think about a month ago,'], [27, 33, 'I decided to actually start creating content'], [34, 36, 'on *XO Market*,'],
    [39, 45, 'because, like, on *Kaito*, and the terms,'], [46, 53, 'it was going to be for *top 50*,'],
    [54, 57, 'and I actually decided'], [58, 62, 'with my *first ever* approach'], [63, 69, 'to actually, like, start creating *video content*,'],
    [70, 72, '*experimenting*, to actually'], [73, 80, 'start creating video content, to *say my mind*'], [81, 86, 'and every single thing like that.'],
    [87, 92, "And you'll see on this video,"], [93, 101, 'I think I made about *8 videos or 7*,'], [102, 105, "I'm not really sure,"], [106, 109, '8 or 7 videos.'],
    [110, 116, 'And everything was just in the *dustbin*.'], [117, 120, 'It *did not count*.'], [121, 126, 'I did not make the *leaderboard*.'], [127, 132, 'I did not make *top 50*.'],
    [133, 138, 'And there were about *851 creators*'], [139, 143, 'who participated in this campaign,'], [144, 151, 'and *Cmvng* did not make the leaderboard.'],
    [152, 157, 'Well, it is what it is.'], [158, 166, "But the good side about it is that it's"], [167, 170, 'not a stepping stone.'],
    [171, 179, "At least it doesn't mean that the next one"], [180, 183, 'will be a *flop*.'],
    [192, 198, 'At least it *pushed me* to actually'], [199, 202, 'start creating *video contents*'], [203, 207, 'anyways, to *say my mind*.'],
    [208, 212, 'Basically, I like to talk,'], [213, 219, 'to express my *thoughts and my opinions*.'],
    [220, 223, 'And yeah, I forgot:'], [224, 230, 'because of me making the video,'], [231, 238, 'on my, the first video on *XO Market*,'], [239, 243, 'I lost my *Limitless badge*.'],
    [244, 250, 'Then when I went to actually message'], [251, 257, 'the coordinator of Limitless badges or something,'],
    [258, 260, 'he said, I...'], [261, 265, 'what did he say again?'], [266, 270, 'He said that I was'], [271, 274, '*promoting* another prediction market'],
    [275, 281, 'and then I was *driving traffic* from'], [282, 286, '*Limitless* to that prediction market,'],
    [287, 293, 'and so, in order for me to'], [294, 298, 'get my, the *badge back*,'], [299, 305, 'I need to actually refer *10 people*'],
    [306, 314, 'and they need to trade as much as *$200*'], [315, 321, 'before I can get the badge back.'],
    [322, 325, 'And I was like,'], [326, 330, 'really? Like, like, really?'], [331, 336, 'I was thinking, like, *what the f∗∗∗*,'],
    [337, 340, "like, I'm like this,"], [341, 344, "and I'm creating this,"], [346, 348, "I'm like this,"],
    [349, 353, 'because of the fact that'], [354, 359, 'I was *too far invested* already,'], [360, 365, "I've already created *lots of content*"],
    [366, 371, 'for my ambassadors, um, *ambassadorial rewards*,'], [372, 377, 'or whatever you might call it.'],
    [385, 392, 'I was like, I also *ignored the message*.'],
    [406, 410, 'And that was the *project*'], [411, 415, 'I made the *tweet* about,'], [416, 423, 'that I was paid *$0.05* per tweet.'],
    [424, 430, 'I think, in total, I was paid *$50*'], [431, 437, 'for like *three plus months of work*.'], [438, 440, '*Nah, never again.*'],
    [441, 447, 'At least those were those, actually, experiences'], [448, 452, 'that I learnt *the hard way*.'],
    [459, 464, 'Yeah, it is what it is.'], [465, 470, 'Like, *on to the next one*.'],
    [471, 474, 'We keep on *trying*,'], [475, 478, 'we keep on *pushing*,'], [479, 482, 'we keep on trying'], [483, 487, 'until we hit the *breakthrough*.'],
    [488, 494, 'So this is just me talking about'], [495, 498, 'one of my *flops*,'],
    [499, 505, 'and for those who might actually feel'], [506, 513, 'let down, or down, or something like that,'],
    [514, 517, 'you did your best,'], [518, 522, 'I did not get rewarded,'], [523, 524, '*chin up*,'], [525, 531, 'you cannot be unlucky for *365 days*.'],
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
