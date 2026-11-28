"""Join the talking pieces into one upright film on the master voice, with the captions and the AI PARODY tag.
  python3 -I assemble.py <plan.json> <shots.json> <voice.wav> <captions.ass> <out.mp4> [--nocaps]
plan.json: the pieces with t0 (master time of each piece's first frame) and vdur, from align.py.
shots.json: {"close": 1.16, "punch": 1.32, "shots": {"1": "wide", "2": "close", ...}, "punches": [[37.50, 38.23]]}
Each join is placed where both pieces have picture, as near the planned cut (the middle of a silence) as they allow;
if they leave a gap, the next piece's first frame is held across it. A "close" shot is a centred punch-in on the head
and chest, so every join reads as a camera change. A punch is a harder punch-in on one moment inside a piece.
One encode; the voice is the master take, never the pieces' own audio."""
import json, subprocess, sys
plan = json.load(open(sys.argv[1])); S = json.load(open(sys.argv[2])); voice, ass, out = sys.argv[3:6]
nocaps = '--nocaps' in sys.argv
W, H, FPS = 1080, 1920, 30
DUR = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', voice]).decode())
q = lambda t: round(t * FPS) / FPS                       # every join on a frame
# the joins
segs = []
for i, p in enumerate(plan):
    a = 0.0 if i == 0 else segs[-1][2]
    end = p['t0'] + p['vdur']
    if i + 1 < len(plan):
        nx = plan[i + 1]['t0']
        j = min(max(p['cut_e'], nx), end) if end >= nx else end
        b = q(j)
        if b < nx - 1e-6 and end < nx: print(f'join {p["n"]}/{p["n"] + 1}: a gap of {nx - end:.3f} s, the next first frame is held')
    else:
        b = DUR
    segs.append((p, a, b))
for p, a, b in segs: print(f"piece {p['n']:2d}: {a:7.3f} - {b:7.3f}  ({S['shots'][str(p['n'])]})")


def crop(f, z, cy=0.0):
    """punch in by z, the window's top at cy of the spare height (0 = keep the top: the cap stays in frame)"""
    return f'crop=iw/{z}:ih/{z}:(iw-iw/{z})/2:(ih-ih/{z})*{cy}'


inputs, chains, labels = [], [], []
k = 0
for i, (p, a, b) in enumerate(segs):
    inputs += ['-i', p['video']]
    shot = S['shots'][str(p['n'])]
    # sub-segments: punches inside this piece
    cuts = [(a, b, shot)]
    for pa, pb in S.get('punches', []):
        pa, pb = q(pa), q(pb)
        nc = []
        for (x, y, s) in cuts:
            if pb <= x or pa >= y: nc.append((x, y, s)); continue
            if x < pa: nc.append((x, pa, s))
            nc.append((max(x, pa), min(y, pb), 'punch'))
            if pb < y: nc.append((pb, y, s))
        cuts = nc
    split = f'[{i}:v]fps={FPS},setpts=PTS-STARTPTS,split={len(cuts)}' + ''.join(f'[s{i}_{m}]' for m in range(len(cuts)))
    chains.append(split)
    for m, (x, y, s) in enumerate(cuts):
        lead = max(0.0, p['t0'] - x)                       # hold the first frame before the piece's picture begins
        st = max(0.0, x - p['t0']); en = y - p['t0']
        f = f'[s{i}_{m}]'
        if lead > 0: f += f'tpad=start_mode=clone:start_duration={lead:.4f},'
        f += f'tpad=stop_mode=clone:stop_duration=3,trim=start={st:.4f}:end={en + lead:.4f},setpts=PTS-STARTPTS,'
        if s == 'close': f += crop('', S.get('close', 1.16), S.get('close_cy', 0.0)) + ','
        if s == 'punch': f += crop('', S.get('punch', 1.32), S.get('punch_cy', 0.0)) + ','
        f += f'scale={W}:{H}:flags=lanczos,setsar=1,trim=duration={y - x:.4f}[c{k}]'
        chains.append(f); labels.append(f'[c{k}]'); k += 1
chains.append(''.join(labels) + f'concat=n={len(labels)}:v=1:a=0[cv]')
if nocaps: chains.append('[cv]null[vo]')
else:
    af = ass.replace('\\', '/').replace(':', '\\:')
    chains.append(f"[cv]ass='{af}'[vo]")
n = len(segs)
cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y', *inputs, '-i', voice, '-filter_complex', ';'.join(chains), '-map', '[vo]', '-map', f'{n}:a',
       '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', str(FPS), '-movflags', '+faststart',
       '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', f'{DUR:.3f}', out]
subprocess.run(cmd, check=True); print(out)
