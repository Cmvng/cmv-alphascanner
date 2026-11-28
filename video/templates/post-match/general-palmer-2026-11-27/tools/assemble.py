"""Join the talking pieces into one upright film on the master voice, with the captions and the AI PARODY tag.
  python3 -I assemble.py <plan.json> <shots.json> <voice.wav> <captions.ass> <out.mp4> [--nocaps]
plan.json: the pieces with t0 (master time of each piece's first frame) and vdur, from align.py.
shots.json: {"zoom": {"wide": 1.0, "close": 1.16, "punch": 1.34}, "cy": {...},
             "timeline": [[0.0, "wide"], ["J1", "close"], [15.05, "punch"], ...]}
  The timeline gives the framing from each moment on; "J1" is the first join, wherever it falls. Every join must change
  the framing (the pose resets at a join, and a camera change hides it); a change inside a piece is a punch-in on
  continuous picture, placed in a pause.
Each join is placed where both pieces have picture, as near the planned cut (the middle of a silence) as they allow;
if they leave a gap, the next piece's first frame is held across it. One encode; the voice is the master take, never
the pieces' own audio."""
import json, subprocess, sys
plan = json.load(open(sys.argv[1])); S = json.load(open(sys.argv[2])); voice, ass, out = sys.argv[3:6]
nocaps = '--nocaps' in sys.argv
W, H, FPS = 1080, 1920, 30
DUR = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', voice]).decode())
q = lambda t: round(t * FPS) / FPS                       # every change on a frame

# 1. the joins
segs = []
for i, p in enumerate(plan):
    a = 0.0 if i == 0 else segs[-1][2]
    end = p['t0'] + p['vdur']
    if i + 1 < len(plan):
        nx = plan[i + 1]['t0']
        b = q(min(max(p['cut_e'], nx), end) if end >= nx else end)
        if end < nx: print(f'join {p["n"]}/{plan[i + 1]["n"]}: a gap of {nx - end:.3f} s, the next first frame is held')
    else:
        b = DUR
    segs.append((p, a, b))
joins = [b for _, _, b in segs[:-1]]

# 2. the framing timeline, with the joins put in
tl = []
for t, f, *_ in S['timeline']:
    tl.append((joins[int(t[1:]) - 1] if isinstance(t, str) else q(t), f))
tl.sort()
for k, j in enumerate(joins):
    before = [f for t, f in tl if t < j][-1]; after = [f for t, f in tl if t <= j][-1]
    if before == after: sys.exit(f'join {k + 1} at {j:.3f} does not change the framing ({before}): fix the timeline')
frame_at = lambda t: [f for x, f in tl if x <= t + 1e-6][-1]

# 3. one sub-segment per framing change inside each piece
inputs, chains, labels, k = [], [], [], 0
for i, (p, a, b) in enumerate(segs):
    inputs += ['-i', p['video']]
    pts = sorted({a, b, *[t for t, _ in tl if a < t < b]})
    subs = [(pts[m], pts[m + 1], frame_at(pts[m])) for m in range(len(pts) - 1)]
    print(f"piece {p['n']}: {a:7.3f} - {b:7.3f}  " + ' | '.join(f'{x:.2f} {f}' for x, _, f in subs))
    chains.append(f'[{i}:v]fps={FPS},setpts=PTS-STARTPTS,split={len(subs)}' + ''.join(f'[s{i}_{m}]' for m in range(len(subs))))
    for m, (x, y, f) in enumerate(subs):
        lead = max(0.0, p['t0'] - x)                   # hold the first frame before the piece's picture begins
        st = max(0.0, x - p['t0']); en = y - p['t0'] + lead
        z, cy = S['zoom'][f], S['cy'][f]
        g = f'[s{i}_{m}]'
        if lead > 0: g += f'tpad=start_mode=clone:start_duration={lead:.4f},'
        g += f'tpad=stop_mode=clone:stop_duration=3,trim=start={st:.4f}:end={en:.4f},setpts=PTS-STARTPTS,'
        if z != 1.0: g += f'crop=iw/{z}:ih/{z}:(iw-iw/{z})/2:(ih-ih/{z})*{cy},'
        g += f'scale={W}:{H}:flags=lanczos,setsar=1,trim=duration={y - x:.4f}[c{k}]'
        chains.append(g); labels.append(f'[c{k}]'); k += 1
chains.append(''.join(labels) + f'concat=n={len(labels)}:v=1:a=0[cv]')
if nocaps: chains.append('[cv]null[vo]')
else:
    af = ass.replace('\\', '/').replace(':', '\\:')
    chains.append(f"[cv]ass='{af}'[vo]")
n = len(segs)
cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y', *inputs, '-i', voice, '-filter_complex', ';'.join(chains), '-map', '[vo]', '-map', f'{n}:a',
       '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', str(FPS), '-movflags', '+faststart',
       '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', f'{DUR:.3f}', out]
subprocess.run(cmd, check=True); print(out, 'joins at', [round(j, 3) for j in joins])
