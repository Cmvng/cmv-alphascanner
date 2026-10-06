# Study a finished video before it goes out (the owner, 6 Oct: "study each video after you create them and see what
# improvements could be made on the next video… where you made mistakes and what you take from it").
#
# usage: python3 video/lib/review_video.py video/out/<slug>        (daily.sh render runs it after every render)
#
# Writes <slug>/review/review.md and review/sheet.jpg:
#   - a frame at every spoken line, in order (look at every one: layout, overlaps, colour, what moves);
#   - the voice heard back by speech-to-text against the script (wrong words, numbers heard as money);
#   - the pronunciation check (say-check.txt: the stressed syllable of every unusual word);
#   - sound: loudness, true peak, and how hard the drop hits;
#   - pace: words per second and dead air per screen, length against each platform's limit;
#   - still stretches (nothing moving for seconds) and colour variety (a screen that is all one colour is monotonous).
# Then write what you learned in video/templates/REVIEWS.md: what worked, the mistakes and how they got through, what
# changes next time, and later the owner's reaction.
import difflib, json, unicodedata, os, re, subprocess, sys
import numpy as np

OUT = sys.argv[1].rstrip('/')
SLUG = os.path.basename(OUT)
MP4 = os.path.join(OUT, SLUG + '.mp4')
FF = os.environ.get('FFMPEG', 'ffmpeg')
R = os.path.join(OUT, 'review'); os.makedirs(R, exist_ok=True)
html = open(os.path.join(OUT, 'index.html'), encoding='utf-8').read()
D = json.loads(re.search(r'window\.DATA=(\{.*?\})</script>', html, re.S).group(1))
scenes, caps, dur = D['scenes'], D['captions'], D['duration']
notes, flags = [], []          # notes: numbers worth reading; flags: things that need a look


def run(args):
    return subprocess.run(args, capture_output=True, text=True).stderr


# ---------------------------------------------------------------- the spoken lines (time, scene, text)
captext = {}
try: captext = json.load(open(os.path.join(OUT, 'captext.json')))
except Exception: pass
lines = []
for k, sc in enumerate(scenes):
    for j, (s0, d) in enumerate(sc.get('lines') or []):
        lines.append({'id': f's{k}_{j}', 'k': k, 'type': sc['type'], 't': sc['start'] + s0, 'd': d, 'text': captext.get(f's{k}_{j}', '')})

# ---------------------------------------------------------------- 1. a frame at every spoken line
frames = []
for i, ln in enumerate(lines):
    f = os.path.join(R, f'f{i:03d}.jpg')
    subprocess.run([FF, '-loglevel', 'error', '-y', '-ss', f"{ln['t'] + ln['d'] * 0.6:.2f}", '-i', MP4, '-frames:v', '1', '-vf', 'scale=270:480', f])
    if os.path.exists(f): frames.append(f)
if frames:
    cols = 8
    subprocess.run([FF, '-loglevel', 'error', '-y', '-framerate', '1', '-i', os.path.join(R, 'f%03d.jpg'),
                    '-vf', f'tile={cols}x{(len(frames) + cols - 1) // cols}:padding=6:color=white', '-frames:v', '1', os.path.join(R, 'sheet.jpg')])
    for f in frames: os.remove(f)

# ---------------------------------------------------------------- 2. the voice heard back
ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = 'zero ten twenty thirty forty fifty sixty seventy eighty ninety'.split()


def words(n):
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + ('' if n % 10 == 0 else ' ' + ONES[n % 10])
    if n < 1000: return ONES[n // 100] + ' hundred' + ('' if n % 100 == 0 else ' and ' + words(n % 100))
    if n < 1_000_000: return words(n // 1000) + ' thousand' + ('' if n % 1000 == 0 else (' and ' if n % 1000 < 100 else ' ') + words(n % 1000))
    return str(n)


def norm(t):
    t = ''.join(c for c in unicodedata.normalize('NFKD', t) if not unicodedata.combining(c))     # Modrić -> modric
    t = re.sub(r'(\d)\s*×', r'\1 times', t).replace('×', ' times')
    t = re.sub(r'(\d)M\b', r'\1 million', t); t = re.sub(r'(\d)K\b', r'\1 thousand', t)
    t = t.lower().replace('’', "'").replace('%', ' percent').replace('-', ' ').replace('&', ' and ')
    t = re.sub(r'\d[\d,]*(\.\d+)?', lambda m: words(int(m.group(0).replace(',', ''))) if '.' not in m.group(0) else m.group(0), t)
    t = re.sub(r"[^a-z0-9.' ]", ' ', t).replace(' and ', ' ')
    return [w.strip(".'") for w in t.split() if w.strip(".'")]


heard = {}
vdir = os.path.join(OUT, 'voice')
if os.path.isdir(vdir) and lines:
    try:
        from faster_whisper import WhisperModel
        m = WhisperModel('small.en', device='cpu', compute_type='int8')
        for ln in lines:
            w = os.path.join(vdir, ln['id'] + '.wav')
            if not os.path.exists(w): continue
            segs, _ = m.transcribe(w, beam_size=5)
            heard[ln['id']] = ' '.join(s.text.strip() for s in segs)
    except Exception as e:
        flags.append(f'speech-to-text unavailable ({e})')
mism = []
for ln in lines:
    h = heard.get(ln['id'])
    if h is None or not ln['text']: continue
    a, b = norm(ln['text']), norm(h)
    a = [w for w in a if w not in ('a', 'dollar', 'dollars', 'one')]; b = [w for w in b if w not in ('a', 'dollar', 'dollars', 'one')]     # "$1" is heard "a dollar"
    a = ' '.join(a).replace('paper trade', 'papertrade').split(); b = ' '.join(b).replace('paper trade', 'papertrade').split()
    r = difflib.SequenceMatcher(None, a, b).ratio()
    diff = [f"'{' '.join(a[i1:i2])}' → '{' '.join(b[j1:j2])}'" for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b).get_opcodes() if op != 'equal']
    money = '$' in h and '$' not in ln['text'] and 'dollar' not in ln['text'].lower()     # a number heard as money that wasn't
    if r < 0.97 or money:
        mism.append((ln, h, r, diff, money))
if mism:
    flags.append(f'{len(mism)} spoken line(s) heard differently from the script (see "The voice, heard back")')

# ---------------------------------------------------------------- 3. sound
e = run([FF, '-hide_banner', '-nostats', '-i', MP4, '-af', 'ebur128=peak=true', '-f', 'null', '-'])
summ = e[e.rfind('Summary'):]
I = re.search(r'I:\s+(-?[\d.]+) LUFS', summ); TP = re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ); LRA = re.search(r'LRA:\s+([\d.]+) LU', summ)
I, TP, LRA = (float(x.group(1)) if x else None for x in (I, TP, LRA))
notes.append(f'Loudness {I} LUFS (aim -14), true peak {TP} dBFS (must stay under -1), range {LRA} LU')
if TP is not None and TP > -1: flags.append(f'true peak {TP} dBFS is over -1')
if I is not None and abs(I + 14) > 1.5: flags.append(f'loudness {I} LUFS is off the -14 target')


def vol(t0, d):
    o = run([FF, '-hide_banner', '-nostats', '-ss', f'{max(0, t0):.2f}', '-t', f'{d:.2f}', '-i', MP4, '-af', 'volumedetect', '-f', 'null', '-'])
    x = re.search(r'mean_volume:\s+(-?[\d.]+) dB', o); return float(x.group(1)) if x else None


cold = next((k for k, s in enumerate(scenes) if s['type'].endswith('_cold')), None)
if cold is not None and cold + 1 < len(scenes):
    td = scenes[cold + 1]['start']; before, after = vol(td - 1.0, 1.0), vol(td, 1.0)
    if before is not None and after is not None:
        notes.append(f'The drop at {td:.2f}s: {before:.1f} dB the second before, {after:.1f} dB the second after (+{after - before:.1f} dB)')
        if after - before < 6: flags.append(f'the drop only rises {after - before:.1f} dB: it may not hit')

# ---------------------------------------------------------------- 4. pace and length
pace = []
for k, sc in enumerate(scenes):
    ls = [l for l in lines if l['k'] == k]
    spoken = sum(l['d'] for l in ls); nw = sum(len(norm(l['text'])) for l in ls)
    cover = spoken / sc['dur'] if sc['dur'] else 0
    pace.append((k, sc['type'], sc['dur'], nw / spoken if spoken else 0, cover))
    if sc['dur'] > 16: flags.append(f'screen {k} ({sc["type"]}) runs {sc["dur"]:.1f}s: long for one screen')
    if ls and cover < 0.45 and not sc['type'].endswith('_cold'): flags.append(f'screen {k} ({sc["type"]}) is {100 * (1 - cover):.0f}% without voice')
LIMITS = [('X (no Premium)', 140), ('Instagram Reels', 90), ('TikTok sweet spot', 60), ('YouTube Shorts', 180)]
notes.append(f'Length {dur:.1f}s: ' + ', '.join(f'{n} {"OK" if dur <= s else "OVER " + str(s) + "s"}' for n, s in LIMITS))

# ---------------------------------------------------------------- 5. motion and colour
W, H, FPS = 90, 160, 4
raw = subprocess.run([FF, '-loglevel', 'error', '-i', MP4, '-vf', f'fps={FPS},scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.float32) / 255
still, run_s = [], 0
diffs = np.abs(np.diff(fr.mean(axis=3), axis=0)).mean(axis=(1, 2)) if len(fr) > 1 else np.array([])
for i, dv in enumerate(diffs):
    if dv < 0.0015: run_s += 1
    else:
        if run_s / FPS >= 2.5: still.append(((i - run_s) / FPS, i / FPS))
        run_s = 0
if run_s / FPS >= 2.5: still.append(((len(diffs) - run_s) / FPS, len(diffs) / FPS))
for a, b in still: flags.append(f'nothing moves from {a:.1f}s to {b:.1f}s')
# colour: hues of the coloured pixels (saturation > 0.3, value > 0.25), per screen and overall
px = fr[::2].reshape(-1, 3)
def to_hsv(p):                      # vectorised RGB (0..1) -> hue (0..1), saturation, value
    mx, mn = p.max(1), p.min(1); d = mx - mn + 1e-9; r, g, b = p.T
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6
    return np.stack([h % 1, np.where(mx > 0, (mx - mn) / (mx + 1e-9), 0), mx], 1)


hsv = to_hsv(px[np.random.default_rng(1).choice(len(px), min(len(px), 80000), replace=False)]) if len(px) else np.zeros((0, 3))
col = hsv[(hsv[:, 1] > 0.3) & (hsv[:, 2] > 0.25)]
# neutrals that belong to a subject: warm paper/cream (low saturation, warm hue, bright) and ink (very dark)
cream = int((((hsv[:, 0] * 360 > 20) & (hsv[:, 0] * 360 < 65)) & (hsv[:, 1] > 0.06) & (hsv[:, 1] <= 0.3) & (hsv[:, 2] > 0.75)).sum())
ink = int((hsv[:, 2] < 0.22).sum())
FAM = [('red', 345, 15), ('orange', 15, 40), ('yellow', 40, 70), ('green', 70, 165), ('cyan', 165, 195), ('blue', 195, 255), ('purple', 255, 290), ('pink', 290, 345)]


def family(h):
    d = h * 360
    for n, a, b in FAM:
        if (a > b and (d >= a or d < b)) or (a <= d < b): return n
    return 'red'


if len(col):
    fams = {}
    for h in col[:, 0]: fams[family(h)] = fams.get(family(h), 0) + 1
    if cream: fams['cream'] = cream
    if ink: fams['ink'] = ink
    tot = sum(fams.values()); share = {k: v / tot for k, v in sorted(fams.items(), key=lambda x: -x[1])}
    notes.append('Colour mix of the coloured pixels: ' + ', '.join(f'{k} {100 * v:.0f}%' for k, v in share.items() if v >= 0.02))
    if share.get('blue', 0) > 0.8: flags.append(f'{100 * share["blue"]:.0f}% of the colour is blue: monotonous (the owner, 6 Oct: blue is the background, the subject keeps its colours)')
    if sum(1 for v in share.values() if v >= 0.05) < 2: flags.append('fewer than two colour families: the video may look flat')

# ---------------------------------------------------------------- 6. captions
long_caps = [c for c in caps if len(' '.join(w['w'] for w in c['words'])) > 34]
if long_caps: flags.append(f'{len(long_caps)} caption chunk(s) over 34 characters (may wrap to two lines)')

# ---------------------------------------------------------------- write it up
say = ''
try: say = open(os.path.join(OUT, 'say-check.txt')).read().strip()
except Exception: pass
md = [f'# Review: {SLUG}', '', f'Look at `review/sheet.jpg` (one frame per spoken line, in order: {len(frames)} frames) before anything else.', '']
md += ['## Needs a look', ''] + ([f'- {x}' for x in flags] or ['- Nothing flagged. Still watch it through once with sound.']) + ['']
md += ['## Numbers', ''] + [f'- {x}' for x in notes] + ['']
md += ['## Pace per screen', '', '| # | screen | seconds | words/s | voice cover |', '|---|---|---|---|---|']
md += [f'| {k} | {t} | {d:.1f} | {wps:.2f} | {100 * c:.0f}% |' for k, t, d, wps, c in pace] + ['']
md += ['## The voice, heard back', '']
if mism:
    for ln, h, r, diff, money in mism:
        md += [f'- {ln["id"]} ({ln["t"]:.1f}s) script: "{ln["text"]}"', f'  heard: "{h}"', f'  differs: {"; ".join(diff) or "punctuation only"}' + ('  **heard as money ($)**' if money else '')]
else:
    md += ['- Every line was heard as written.' if heard else '- (not checked)']
md += ['', 'Speech-to-text cannot hear a wrong stress. Check the pronunciation list below by eye.', '']
if say: md += ['## Pronunciation', '', '```', say, '```', '']
md += ['## Spoken lines and the frame for each', ''] + [f'{i + 1}. {l["t"]:.1f}s · {l["type"]} · {l["text"]}' for i, l in enumerate(lines)] + ['']
md += ['## My review (copy into video/templates/REVIEWS.md)', '', '- **What worked:**', '- **Mistakes, and how they got through:**',
       '- **Change next time:**', "- **The owner's reaction:** (after sending)", '']
open(os.path.join(R, 'review.md'), 'w').write('\n'.join(md))
print(f'REVIEW  {os.path.join(R, "review.md")}  ({len(flags)} to look at)')
for x in flags: print('  ! ' + x)
