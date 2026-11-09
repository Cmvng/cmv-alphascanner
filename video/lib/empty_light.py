"""Near-empty frames on a LIGHT stage: frames with almost no dark or saturated pixels (text, photos, cards' ink).
  python3 -I empty_light.py <video>"""
import subprocess, sys
import numpy as np
W, H, FPS = 192, 108, 10
p = subprocess.run(['ffmpeg', '-v', 'error', '-i', sys.argv[1], '-vf', f'fps={FPS},scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True)
fr = np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W, 3).astype(int)
fr = fr[:, :int(H * 0.88)]                                  # ignore the caption row
lum = fr.mean(axis=3); ink = ((lum < 150) | (fr.max(axis=3) - fr.min(axis=3) > 90)).mean(axis=(1, 2))
runs, cur = [], None
for i, v in enumerate(ink):
    if v < 0.006:
        cur = cur or [i, i]; cur[1] = i
    elif cur: runs.append(cur); cur = None
if cur: runs.append(cur)
print(f'{len(fr)} frames; near-empty runs:', [(round(a / FPS, 1), round(b / FPS, 1)) for a, b in runs] or 'none')
