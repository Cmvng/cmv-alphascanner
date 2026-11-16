"""New Bass 01 (Mixkit 720) is 96 s with its music ending at about 84 s; the brief runs 110.75 s. Its full section repeats
a 4-bar cycle (downbeats 61.045, 68.661, 76.278 have the same band energies within 0.03), so the bed is the track from
just before the drop, with three extra 2-cycle loops (76.278 back to 61.045) joined on those downbeats with a 30 ms
equal-power crossfade, then the section again until the end of the video.
  python3 -I extend_music.py <720.mp3> <out.wav> <start s> <length s>"""
import sys, subprocess, numpy as np
src, out, start, length = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
sr = 48000
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '2', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
A, B = 61.045, 76.278                                     # one 2-cycle loop: B -> A
segs = [(start, B), (A, B), (A, B), (A, B), (A, 90.0)]
xf = int(.03 * sr); y = x[int(segs[0][0] * sr):int(segs[0][1] * sr)].copy()
for a, b in segs[1:]:
    s = x[int(a * sr) - xf // 2:int(b * sr)].copy()       # starts half a crossfade early so the downbeat lands on the join
    w = np.sin(np.linspace(0, np.pi / 2, xf))[:, None]
    y[-xf:] = y[-xf:] * np.cos(np.linspace(0, np.pi / 2, xf))[:, None] + s[:xf] * w
    y = np.concatenate([y, s[xf:]])
y = y[:int(length * sr)]
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(sr), '-ac', '2', '-i', '-', out], input=y.astype(np.float32).tobytes(), check=True)
print(out, round(len(y) / sr, 3), 's; joins at video', [round((segs[0][1] - start) + k * (B - A), 3) for k in range(4)])
