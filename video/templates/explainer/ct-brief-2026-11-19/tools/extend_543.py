"""A New Life (Mixkit 543, Eugenio Mininni) is 99 s; its full section runs from the drop (24.642 s) to 69.677 s, the loop
points in video/lib/music.json (exactly 24 bars at 127.9 bpm), then it winds down to silence by about 88 s. The bed is
the track from <start> (so the drop lands where the video wants it) to 69.677, then the full section again from the
drop, as often as needed, joined on those downbeats with a 30 ms equal-power crossfade, cut to <length>.
  python3 -I extend_543.py <543.mp3> <out.wav> <start s> <length s>"""
import sys, subprocess, numpy as np
src, out, start, length = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
sr = 48000
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '2', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
A, B = 24.642, 69.677
segs, have = [(start, B)], B - start
while have < length:
    segs.append((A, B)); have += B - A
xf = int(.03 * sr); y = x[int(segs[0][0] * sr):int(segs[0][1] * sr)].copy()
for a, b in segs[1:]:
    s = x[int(a * sr) - xf // 2:int(b * sr)].copy()       # starts half a crossfade early so the downbeat lands on the join
    w = np.sin(np.linspace(0, np.pi / 2, xf))[:, None]
    y[-xf:] = y[-xf:] * np.cos(np.linspace(0, np.pi / 2, xf))[:, None] + s[:xf] * w
    y = np.concatenate([y, s[xf:]])
y = y[:int(length * sr)]
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(sr), '-ac', '2', '-i', '-', out], input=y.astype(np.float32).tobytes(), check=True)
print(out, round(len(y) / sr, 3), 's; joins at video', [round((B - start) + k * (B - A), 3) for k in range(len(segs) - 1)])
