"""Word-timed captions in the owner's sample style (bold white sans on the chest, a few words at a time) and the
"AI PARODY" tag for the whole video.
  python3 -I captions_ass.py <words.json> <out.ass> --phrases phrases.txt [--framing framing.json] [--audio master16k.f32]
                             [--offset 0.4] [--dur 66.9] [--ys wide:1229,close:1400,punch:1470]
  words.json: [{"w": "Sit", "s": 0.12, "e": 0.40}, ...] on the master voice's clock.
  phrases.txt: one caption per line, in order, its words the same as the words file's (breaks set by hand, so a
    punchline is never shown before it is said).
  framing.json: [[t, "wide"|"close"|"punch"], ...] from assemble.py --framing-out. A caption sits at the height that
    keeps it on the chest and clear of the medals in that framing, and is split where the framing changes.
  audio: the master voice as 16 kHz mono float32. Each caption starts on the first sound of its first word (after at
    least 60 ms of quiet), not on Whisper's word start, which can run a few frames late on s, th and f.
  offset: the lead-in before the voice starts (assemble.py "lead"); added to every time.
Why the heights (28 Nov): a fixed caption line ran across the medal row in every close shot."""
import json, re, sys
a = sys.argv[1:]
def opt(name, default=None, conv=str):
    if name in a: i = a.index(name); v = a[i + 1]; del a[i:i + 2]; return conv(v)
    return default
PINS = opt('--pins'); PH = opt('--phrases'); FR = opt('--framing'); AU = opt('--audio'); OFF = opt('--offset', 0.0, float); DUR = opt('--dur', None, float)
YS = dict((k, int(v)) for k, v in (x.split(':') for x in opt('--ys', 'wide:1229,close:1400,punch:1470').split(',')))
words = json.load(open(a[0])); out = a[1]
W, H = 1080, 1920
def ts(t):
    t = max(0, t); cs = int(round(t * 100)); h = cs // 360000; m = cs // 6000 % 60; s = cs % 6000 / 100
    return f'{h}:{m:02d}:{s:05.2f}'
import math
def at_frame(t):
    """a time on the 30 fps frame grid, written so libass switches on that very frame (the frame before stays old)"""
    return (math.ceil(t * 100 - 1e-6) - 1) / 100
# chunks, from the hand-set phrases
lines = [l.strip() for l in open(PH, encoding='utf8') if l.strip()]
chunks, k = [], 0
norm = lambda x: re.sub(r'[^0-9a-z%-]', '', x.lower())
for l in lines:
    n = len(l.split()); c = [dict(x) for x in words[k:k + n]]
    if [norm(x['w']) for x in c] != [norm(x) for x in l.split()]: sys.exit(f'phrase does not match the words: {l!r} vs {[x["w"] for x in c]}')
    for x, t in zip(c, l.split()): x['w'] = t
    chunks.append(c); k += n
if k != len(words): sys.exit(f'{len(words) - k} words left over after the phrases')
# snap each caption's start to the first sound of its first word
if AU:
    import numpy as np
    x = np.fromfile(AU, np.float32); hop = 160
    db = 20 * np.log10(np.sqrt((x[:len(x) // hop * hop].reshape(-1, hop) ** 2).mean(1)) + 1e-6)
    loud = db > -45
    def tail_then_quiet(seg):
        q = [j for j, v in enumerate(seg) if not v]
        return not len(seg) or (bool(q) and not seg[q[0]:].any())
    prev = -1.0
    for c in chunks:
        s = c[0]['s']; lo, hi = int((s - 0.30) * 100), int((s + 0.40) * 100)
        si = int(round(s * 100))
        cand = [i for i in range(max(15, lo), min(len(loud) - 4, hi)) if loud[i:i + 4].all() and not loud[i - 15:i].any()   # a real pause (150 ms) before it
                and ((i >= si and tail_then_quiet(loud[si:i]))             # later: across silence (or a word's tail, then silence)
                     or (i < si and loud[i:si].mean() > 0.5))]              # earlier: only into speech that runs on to s
        if cand:
            best = min(cand, key=lambda i: abs(i / 100 - s)) / 100
            if best > prev + 0.2: c[0]['s'] = round(best, 2)
        prev = c[0]['s']
# pins: word starts measured by hand on the film's audio, where a word runs on from the last with no pause
if PINS:
    pins = json.load(open(PINS))
    for c in chunks:
        k = f"{c[0]['w'].lower().strip('.,!?:…')}@{round(c[0]['s'])}"
        for key, v in pins.items():
            w0, t0 = key.split('@')
            if c[0]['w'].lower().strip('.,!?:…') == w0 and abs(c[0]['s'] - float(t0)) < 0.6: c[0]['s'] = v
# where the framing changes
fr = json.load(open(FR)) if FR else [[-1e9, 'wide']]
frame_at = lambda t: ([f for x, f in fr if x <= t + 1e-6] or [fr[0][1]])[-1]
end_all = DUR if DUR else max(w['e'] for w in words) + OFF + 1.0
L = ['[Script Info]', 'ScriptType: v4.00+', f'PlayResX: {W}', f'PlayResY: {H}', 'WrapStyle: 2', 'ScaledBorderAndShadow: yes', '',
     '[V4+ Styles]',
     'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
     f'Style: Cap,Inter ExtraBold,{round(H * 0.038)},&H00FFFFFF,&H00FFFFFF,&H00141414,&H64000000,0,0,0,0,100,100,0,0,1,{round(H*0.0022)},{round(H*0.0026)},5,60,60,0,1',
     # the tag: a navy pill (BorderStyle 3 draws the outline colour as a box), below the phone's status bar and app bar
     'Style: Tag,Inter ExtraBold,30,&H00FFFFFF,&H00FFFFFF,&H384D1F0B,&H00000000,0,0,0,0,100,100,3,0,3,12,0,7,0,0,0,1', '',
     '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
     f'Dialogue: 1,{ts(0)},{ts(end_all)},Tag,,0,0,0,,{{\\an7\\pos(56,196)}}AI PARODY']
n_ev = 0
for i, c in enumerate(chunks):
    s = c[0]['s']; last_e = c[-1]['e']
    nxt = chunks[i + 1][0]['s'] if i + 1 < len(chunks) else None
    e = (end_all - OFF) if nxt is None else min(nxt, last_e + 0.9)   # the last caption stays to the end
    if nxt is not None and nxt - e < 0.4: e = nxt                    # no blink of empty screen before the next line
    txt = ' '.join(x['w'] for x in c).upper().replace('{', '(').replace('}', ')')
    cuts = sorted({s, e, *[t for t, _ in fr if s < t < e]})
    for m in range(len(cuts) - 1):
        p0, p1 = cuts[m], cuts[m + 1]
        if p1 - p0 < 0.02: continue
        y = YS[frame_at(p0)]
        pop = '\\fscx92\\fscy92\\t(0,80,\\fscx100\\fscy100)' if m == 0 else ''
        on_cut = lambda t: any(abs(t - x) < 0.02 for x, _ in fr)
        T0 = at_frame(p0 + OFF) if on_cut(p0) else p0 + OFF
        T1 = at_frame(p1 + OFF) if on_cut(p1) else p1 + OFF
        L.append(f'Dialogue: 0,{ts(T0)},{ts(T1)},Cap,,0,0,0,,{{\\an5\\pos({W // 2},{y}){pop}}}{txt}'); n_ev += 1
open(out, 'w').write('\n'.join(L) + '\n'); print(out, len(chunks), 'captions,', n_ev, 'events')
