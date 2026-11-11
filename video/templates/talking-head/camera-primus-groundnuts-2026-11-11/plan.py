"""The cut for the owner's 11 Nov recording (Primus Labs zkTLS, the groundnuts example): what is removed, where every
word lands, the captions and the cues for the page.
  python3 -I plan.py <work dir>      reads <work>/words_ctc.json and <work>/src_df3.wav, writes plan.json, plan.js, segs.json

What comes out: the opening "So, basically today,", the stumble over the name ("The Primus Tech Lab's tech. What am I
saying?…" up to "in real time."), a repeated "I'm trying to buy this.", an "And, um,", and the second telling of the
story near the end ("But in this type of situation…" up to "I took the loan to buy the groundnuts."). Pauses of about
0.85 s and more are closed to 0.4 s. Every cut sits in a real silence of the cleaned voice and on the 30 fps grid."""
import json, subprocess, sys
import numpy as np
K = sys.argv[1]
W = json.load(open(f'{K}/words_ctc.json'))
FPS, ENDCARD = 30, 3.8
W[19]['e'] = 6.74      # the aligner ran "Lab." on through the pause; its real end is read off the voice's energy
snap = lambda t: round(t * FPS) / FPS
S, E = (lambda i: W[i]['s']), (lambda i: W[i]['e'])
END_SRC = E(437) + 0.45
def gap(i, keep=0.40):                       # close the pause after word i, leaving `keep` seconds
    g = S(i + 1) - E(i); cut = g - keep
    return [E(i) + keep * 0.5, E(i) + keep * 0.5 + cut, f'pause after "{W[i]["w"]}"']
def drop(i, j, why, lead=0.18, tail=0.14):   # take out words i..j and the pauses round them
    return [E(i - 1) + lead, S(j + 1) - tail, why]
REMOVE = [
    [0.0, S(3) - 0.12, 'filler: "So, basically today,"'],
    drop(20, 57, 'the stumble over the name, and the second introduction'),
    drop(62, 62, 'the pause after "like,"'),
    gap(73), gap(92, 0.5),
    drop(104, 108, 'repeat: "I\'m trying to buy this."'),
    gap(110),
    drop(134, 135, 'filler: "And, um,"'),
    gap(138), gap(158), gap(166), gap(181), gap(185), gap(191), gap(199),
    gap(299), gap(303), gap(314), gap(320), gap(332), gap(333),      # the pause after "I go." is only 0.45 s of real silence: left alone
    drop(354, 411, 'the second telling of the story'),
]
REMOVE = [[snap(a), snap(b), w] for a, b, w in REMOVE]
# hand corrections after the edge check, read off the voice's energy: {index in REMOVE: (from, to)}; None keeps the value
FIX = {1: (6.95, None),            # the first sentence ends at 6.74
       2: (21.95, None),           # "example, like," is one breath: "like," stays in the sound, only the pause after it goes
       12: (66.95, None),          # the tail of "this."
       len(REMOVE) - 1: (None, 150.37)}
for i, (a, b) in FIX.items():
    if a is not None: REMOVE[i][0] = snap(a)
    if b is not None: REMOVE[i][1] = snap(b)
pieces, t = [], 0.0
for a, b, _ in REMOVE:
    if a > t: pieces.append([t, a])
    t = b
pieces.append([t, snap(END_SRC)])
pieces = [p for p in pieces if p[1] - p[0] > 0.01]
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
    print(f'piece {i:2d}  src {s:7.3f}-{e:7.3f}  out {out(s):6.2f}-{out(e):6.2f}  edges {ls:5.0f} / {le:5.0f} dB' + ('   LOUD EDGE' if (i and ls > -45) or (i < len(pieces) - 1 and le > -45) else ''))
ws = [dict(i=i, w=w['w'], s=out(w['s']), e=out(w['e'])) for i, w in enumerate(W)]
lost = [w for w in ws if w['s'] is None or w['e'] is None]
print('words cut:', ' '.join(f"{w['i']}:{w['w']}" for w in lost))
T = lambda i: next(w['s'] for w in ws if w['i'] == i)
Te = lambda i: next(w['e'] for w in ws if w['i'] == i)

# captions: [first word, last word, text]; *word* is drawn in blue. Fillers are left out. The owner says "the Primus
# Tech Lab"; the captions give the project its name, Primus Labs.
CAPS = [
    [3, 11, "I'm going to be giving you a *practical example*"], [12, 19, 'on how to use the *Primus Labs* tech.'],
    [58, 61, "Let's say, for example,"], [63, 67, 'I just left the gym'], [68, 73, 'and I went to a *supermarket*,'],
    [74, 78, "and I'm trying to pay."], [80, 87, 'A big supermarket, *anywhere in the world*.'],
    [88, 93, "And I'm trying to buy *this*."], [94, 103, 'This is what you call a *bottle of groundnuts*.'],
    [109, 115, 'And then, I do not have *cash*.'], [116, 121, 'My *bank app* is not working.'], [126, 133, "I don't have my *ATM card* on me."],
    [136, 138, '*Binance* was hacked.'], [139, 142, 'Yeah, it was hacked.'], [143, 145, 'So they paused *withdrawals*,'],
    [146, 153, 'and I could not actually pay with *crypto*.'], [154, 158, 'So, what do I do?'],
    [159, 166, 'And I figure out that they actually use'], [167, 172, 'the *Primus Labs zkTLS*'], [173, 179, 'to verify proofs on the *encrypted* node.'],
    [182, 185, 'And I need this.'], [186, 191, 'So, what do I simply do?'],
    [192, 199, 'I simply *log in* on my Binance app'], [200, 206, 'through the tech that they already use,'],
    [207, 213, 'to *verify* that I have the money'], [214, 218, 'to pay for the service.'],
    [219, 228, 'So, more or less: okay, *I have the money*,'], [229, 234, "but I can't withdraw it now,"], [235, 241, "so I'm going to *pay it forward*."],
    [242, 250, 'But you have to verify I have the money'], [251, 254, 'to pay it forward.'],
    [255, 260, 'So I log in, *they check*'], [261, 267, 'that I have the money, sufficient enough.'],
    [268, 271, 'In fact, *1000x* more'], [272, 275, 'than the required amount'], [276, 283, 'to pay for this bottle of groundnuts.'],
    [284, 291, 'And they say: yeah, *good, good, good, good*.'], [292, 295, 'You have the money.'], [296, 299, 'So, *you can go*.'],
    [300, 303, 'And that is it.'], [304, 311, 'I take the groundnuts and I go.'], [312, 313, "Everybody's *happy*."], [314, 314, '*Voilà*.'],
    [315, 320, 'So, do you understand it now?'],
    [321, 325, '*Primus Labs* uses'], [326, 333, 'what they call *zkTLS* to verify proofs.'],
    [334, 343, "But it's *not* actually working on every platform."], [345, 353, 'It only works on platforms that *use the tech*.'],
    [412, 418, "And now I'm going out to drink"], [419, 424, 'some *garri* and some groundnuts,'], [425, 428, 'and everyone is happy.'],
    [429, 436, "So, I hope you understand what I'm saying."], [437, 437, '*Peace*.'],
]
caps = []
for a, b, text in CAPS:
    caps.append(dict(o0=round(T(a) - 0.06, 3), o1=round(Te(b) + 0.25, 3), t=text, a=a, b=b))
for c, n in zip(caps, caps[1:]):
    c['o1'] = round(min(c['o1'], n['o0'] - 0.02), 3)
caps[0]['o0'] = 0.0
# cues for the page (output seconds)
ev = dict(
    hook=0.0, title_out=Te(19) + 0.15,
    st1_in=T(58) - 0.40, r_super=T(73), r_world=T(84), r_item=T(100), r_cash=T(115), r_bank=T(117), r_atm=T(130), r_bin=T(136),
    r_crypto=T(145), r_how=T(155),
    dg_in=T(159) - 0.10, dg_primus=T(168), dg_zk=T(171), dg_verify=T(174), dg_enc=T(178), dg_need=T(184), dg_what=T(186),
    dg_login=T(194), dg_bin=T(198), dg_tech=T(202), dg_ver2=T(208), dg_money=T(213), dg_have=T(226), dg_cant=T(232), dg_later=T(239),
    dg_check=T(260), dg_enough=T(266), dg_1000=T(270),
    r2_in=T(284) - 0.15, r2_good=T(288), r2_have=T(293), r2_go=T(297), st1_out=Te(299) + 0.80,
    sum_in=T(304) - 0.10, sum_go=T(311), sum_happy=T(313), sum_out=Te(320) + 0.05,
    pg_in=T(321) - 0.30, pg_zk=T(330), pg_not=T(338), pg_only=T(346), pg_out=Te(353) + 0.45,
    garri=T(420), peace=T(437), end=END,
)
ev = {k: round(v, 3) for k, v in ev.items()}
# where the stage is down and the camera sits 300 px lower: [in, out] in output seconds
stage = [[ev['st1_in'], ev['st1_out']], [ev['pg_in'], ev['pg_out']]]
# a punch-in with no sound cut at these sentence starts, so a long piece does not sit on one framing
PUNCH = [snap(W[i]['s'] - 0.10) for i in (94, 143, 207, 229, 242, 255, 268, 284, 334, 345, 429)]
segs, z = [], 0
for s_, e_ in pieces:
    cuts = [s_] + [t for t in PUNCH if s_ + 1.6 < t < e_ - 1.6] + [e_]
    for a, b in zip(cuts, cuts[1:]):
        segs.append(dict(s=a, e=b, zoom=1.0 if z % 2 == 0 else 1.05)); z += 1
json.dump(segs, open(f'{K}/segs.json', 'w'), indent=0)
plan = dict(fps=FPS, end=END, endcard=ENDCARD, total=round(END + ENDCARD, 4), pieces=[dict(s=s, e=e, o=o) for s, e, o in off], removed=REMOVE, words=ws,
            caps=caps, ev=ev, punch=PUNCH, segs=segs, stage=[[round(a, 3), round(b, 3)] for a, b in stage])
json.dump(plan, open(f'{K}/plan.json', 'w'), indent=0)
open(f'{K}/plan.js', 'w').write('window.PLAN = ' + json.dumps(dict(end=END, endcard=ENDCARD, caps=caps, ev=ev, stage=plan['stage'])) + '\n')
print(f'{len(pieces)} pieces, {len(segs)} picture segments, speech {END:.2f} s, with the end card {END + ENDCARD:.2f} s; {len(caps)} captions')
for k, v in ev.items(): print(f'  {k:9s} {v:6.2f}', end='')
print()
