"""Lay track 720 ("New Bass 01") out under the whole video: its drop at <drop> s, then its 128-beat loop (22.906-83.81,
from video/lib/music.json) repeated on the beat with 20 ms crossfades, to <total> s.
  python3 -I extend_bed.py <720.mp3> <out.wav> <drop s> <total s>"""
import subprocess, sys
import numpy as np, soundfile as sf
src, out, DROP, TOT = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', src, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_f32le', out + '.src.wav'], check=True)
x, sr = sf.read(out + '.src.wav', dtype='float32', always_2d=True)
D, L0, L1 = 22.906, 22.906, 83.81
start = D - DROP
parts = [x[round(start * sr):round(L1 * sr)]]
n = sum(len(p) for p in parts); need = round(TOT * sr); xf = int(.02 * sr)
while n < need:
    seg = x[round(L0 * sr):round(L1 * sr)].copy()
    prev = parts[-1]; r = np.linspace(0, 1, xf)[:, None]
    tail = prev[-xf:] * (1 - r) + x[round(L0 * sr) - xf:round(L0 * sr)] * 0 + seg[:xf] * r
    parts[-1] = prev[:-xf]; parts.append(tail); parts.append(seg[xf:]); n = sum(len(p) for p in parts)
y = np.concatenate(parts)[:need]
sf.write(out, y, sr, subtype='FLOAT'); print(out, len(y) / sr, 's; drop at', DROP)
