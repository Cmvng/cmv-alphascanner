# Study a finished edit of the owner's own recording before it goes out (the same habit as review_video.py, for
# edit-video.mjs outputs, which have clips and inserts instead of scenes).
#
# usage: python3 video/lib/review_edit.py video/out/edit-<slug> [_wide]
#
# Writes <out>/review<suffix>/review.md and sheet.jpg:
#   - a frame from the middle of every clip and insert, in order (look at every one: layout, marks, overlaps);
#   - every cut edge's level in the cleaned voice (a word clipped at a cut shows as a loud edge);
#   - sound: loudness, true peak, how hard the drop hits;
#   - length against each platform, clips that run long, stretches where nothing moves;
#   - the colour mix (blue is the frame; the subject keeps its colours).
# The voice heard back against the captions is a separate step (transcribe voice.wav per clip; see the talking-head README).
import json, os, re, subprocess, sys
import numpy as np

OUT = sys.argv[1].rstrip('/'); SUF = sys.argv[2] if len(sys.argv) > 2 else ''
SLUG = os.path.basename(OUT); MP4 = os.path.join(OUT, SLUG + SUF + '.mp4')
FF = os.environ.get('FFMPEG', 'ffmpeg')
R = os.path.join(OUT, 'review' + SUF); os.makedirs(R, exist_ok=True)
plan = json.load(open(os.path.join(OUT, 'plan.json'))); SEG = plan['segments']; dur = plan['duration']; drop = plan['drop']
notes, flags = [], []
run = lambda a: subprocess.run(a, capture_output=True, text=True).stderr

# ---- 1. a frame from the middle of every segment
items = [s for s in SEG if s['kind'] in ('cold', 'title', 'clip', 'insert', 'product', 'end')]
tiles = []
for i, s in enumerate(items):
    t = (s['start'] + s['end']) / 2; f = os.path.join(R, f'f_{i:02d}.jpg')
    subprocess.run([FF, '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', MP4, '-frames:v', '1', '-vf', 'scale=-2:480', f], check=False)
    if os.path.exists(f): tiles.append(f)
if tiles:
    from PIL import Image
    ims = [Image.open(f) for f in tiles]; w, h = ims[0].size; cols = 8; rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (w * cols, h * rows), 'white')
    for i, im in enumerate(ims): sheet.paste(im.resize((w, h)), ((i % cols) * w, (i // cols) * h))
    sheet.save(os.path.join(R, 'sheet.jpg'), quality=85)
    for f in tiles: os.remove(f)

# ---- 2. cut edges: each piece of the recording should start and end quiet in the cleaned voice
x = np.frombuffer(subprocess.run([FF, '-v', 'error', '-i', os.path.join(OUT, 'voice.wav'), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True).stdout, np.float32)
lvl = lambda a, b: 20 * np.log10(np.sqrt((x[int(a * 16000):int(b * 16000)] ** 2).mean() + 1e-12))
loud = []
for s in SEG:
    for p in s.get('pieces') or []:
        a, b = p['out'], p['out'] + p['dur']
        ea, eb = lvl(a, a + 0.03), lvl(b - 0.03, b)
        if ea > -35 or eb > -35: loud.append(f"{s.get('id', s['kind'])} piece at {a:.1f}s: start {ea:.0f} dB, end {eb:.0f} dB")
notes.append(f"Cut edges: {sum(len(s.get('pieces') or []) for s in SEG)} pieces, {len(loud)} with a loud edge")
for l in loud: flags.append('loud cut edge (a clipped word?): ' + l)

# ---- 3. sound
e = run([FF, '-hide_banner', '-nostats', '-i', MP4, '-af', 'ebur128=peak=true', '-f', 'null', '-'])
summ = e[e.rfind('Summary'):]
I = re.search(r'I:\s+(-?[\d.]+) LUFS', summ); TP = re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ)
I, TP = (float(m.group(1)) if m else None for m in (I, TP))
notes.append(f'Loudness {I} LUFS (aim -14), true peak {TP} dBFS (must stay under -1)')
if TP is not None and TP > -1: flags.append(f'true peak {TP} dBFS is over -1')
if I is not None and abs(I + 14) > 1.5: flags.append(f'loudness {I} LUFS is off the -14 target')
def vol(t0, d):
    o = run([FF, '-hide_banner', '-nostats', '-ss', f'{max(0, t0):.2f}', '-t', f'{d:.2f}', '-i', MP4, '-af', 'volumedetect', '-f', 'null', '-'])
    m = re.search(r'mean_volume:\s+(-?[\d.]+) dB', o); return float(m.group(1)) if m else None
b0, a0 = vol(drop - 1.0, 1.0), vol(drop, 1.0)
if b0 is not None and a0 is not None:
    notes.append(f'The drop at {drop:.2f}s: {b0:.1f} dB the second before, {a0:.1f} dB after (+{a0 - b0:.1f} dB)')
    if a0 - b0 < 6: flags.append(f'the drop only rises {a0 - b0:.1f} dB')
cold_end = max([s['end'] for s in SEG if s['kind'] == 'cold'] or [0])
if cold_end and drop - cold_end < 0.9: flags.append(f'only {drop - cold_end:.2f}s of silence before the drop (keep 0.9s or more)')

# ---- 4. length and pace
LIMITS = [('X (no Premium)', 140), ('Instagram Reels', 180), ('YouTube Shorts', 180), ('TikTok', 600)]
notes.append(f'Length {dur:.1f}s: ' + ', '.join(f'{n} {"OK" if dur <= s_ else "OVER " + str(s_) + "s"}' for n, s_ in LIMITS))
for s in SEG:
    if s['kind'] == 'clip' and s['end'] - s['start'] > 20: flags.append(f"clip {s.get('id')} runs {s['end'] - s['start']:.1f}s: give it a second mark or a callout change")

# ---- 5. motion and colour
W, H, FPS = 90, 160, 2
raw = subprocess.run([FF, '-loglevel', 'error', '-i', MP4, '-vf', f'fps={FPS},scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.float32) / 255
diffs = np.abs(np.diff(fr.mean(axis=3), axis=0)).mean(axis=(1, 2)) if len(fr) > 1 else np.array([])
run_s = 0
for i, dv in enumerate(list(diffs) + [1]):
    if dv < 0.0015: run_s += 1
    else:
        if run_s / FPS >= 3: flags.append(f'nothing moves from {(i - run_s) / FPS:.1f}s to {i / FPS:.1f}s')
        run_s = 0
px = fr[::2].reshape(-1, 3)
px = px[np.random.default_rng(1).choice(len(px), min(len(px), 80000), replace=False)]
mx, mn = px.max(1), px.min(1); d = mx - mn + 1e-9; r, g, b = px.T
h = (np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6 % 1) * 360
sat = np.where(mx > 0, (mx - mn) / (mx + 1e-9), 0); col = h[(sat > 0.3) & (mx > 0.25)]
FAM = [('red', 345, 15), ('orange', 15, 40), ('yellow', 40, 70), ('green', 70, 165), ('cyan', 165, 195), ('blue', 195, 255), ('purple', 255, 290), ('pink', 290, 345)]
fams = {}
for v in col:
    n_ = next((n for n, a_, b_ in FAM if (a_ > b_ and (v >= a_ or v < b_)) or (a_ <= v < b_)), 'red'); fams[n_] = fams.get(n_, 0) + 1
if fams:
    tot = sum(fams.values()); share = {k: v / tot for k, v in sorted(fams.items(), key=lambda kv: -kv[1])}
    notes.append('Colour mix of the coloured pixels: ' + ', '.join(f'{k} {100 * v:.0f}%' for k, v in share.items() if v >= 0.02))
    if share.get('blue', 0) > 0.8: flags.append(f'{100 * share["blue"]:.0f}% of the colour is blue: monotonous')

md = [f'# Review: {SLUG}{SUF}', '', f'Duration {dur:.1f}s · {sum(1 for s in SEG if s["kind"] == "clip")} clips · {sum(1 for s in SEG if s["kind"] == "insert")} inserts', '',
      '## Flags', ''] + ([f'- {f}' for f in flags] or ['- none']) + ['', '## Numbers', ''] + [f'- {n}' for n in notes] + ['', 'Frames: sheet.jpg (the middle of every clip and insert, in order).']
open(os.path.join(R, 'review.md'), 'w').write('\n'.join(md) + '\n')
print('\n'.join(md))
