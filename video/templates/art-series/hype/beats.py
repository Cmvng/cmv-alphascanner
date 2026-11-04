"""Beats, hits and the drop of a soundtrack, so the hype cut can land on them.
python3 -I beats.py <audio> <out.json> [t0 t1]

- onset strength: half-wave-rectified spectral flux of the log spectrum (2048-point frames, 512 hop at 44.1 kHz)
- tempo: the autocorrelation peak of the onset envelope between 70 and 180 BPM
- beats: the grid phase with the most onset energy, each beat snapped to the nearest onset peak within 45 ms
- hits: onset peaks above the 92nd percentile, at least 0.12 s apart (the cut points that feel like a punch)
- drop: where the 1 s loudness rises most against the 2 s before it
Prints a short table and writes all of it to the JSON."""
import json, subprocess, sys
import numpy as np

src, out = sys.argv[1], sys.argv[2]
t0, t1 = (float(sys.argv[3]), float(sys.argv[4])) if len(sys.argv) > 4 else (0.0, None)
SR, N, HOP = 44100, 2048, 512
cmd = ['ffmpeg', '-v', 'error', '-ss', str(t0), '-i', src] + (['-t', str(t1 - t0)] if t1 else []) + ['-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
x = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).astype(np.float64)
dur = len(x) / SR
win = np.hanning(N)
nf = 1 + max(0, (len(x) - N) // HOP)
frames = np.lib.stride_tricks.as_strided(x, shape=(nf, N), strides=(x.strides[0] * HOP, x.strides[0]))
S = np.log1p(1000 * np.abs(np.fft.rfft(frames * win, axis=1)))
flux = np.maximum(0, np.diff(S, axis=0)).sum(1)
flux = np.concatenate([[0], flux])
env = (flux - np.median(flux)) / (np.percentile(flux, 99) - np.median(flux) + 1e-9)
env = np.clip(env, 0, None)
ft = (np.arange(nf) * HOP + N / 2) / SR                 # frame centre times
fps_env = SR / HOP
# tempo by autocorrelation
e = env - env.mean()
ac = np.correlate(e, e, 'full')[len(e) - 1:]
lags = np.arange(len(ac))
bpm_of = lambda L: 60 * fps_env / L
ok = (lags > 0) & (bpm_of(np.maximum(lags, 1)) >= 70) & (bpm_of(np.maximum(lags, 1)) <= 180)
L = int(lags[ok][np.argmax(ac[ok])])
period = L / fps_env
bpm = 60 / period
# the beat grid phase with the most onset energy
best, best_ph = -1, 0
for ph in np.arange(0, period, 1 / fps_env):
    idx = np.round((np.arange(ph, dur, period)) * fps_env).astype(int)
    idx = idx[idx < len(env)]
    sc = env[idx].sum()
    if sc > best: best, best_ph = sc, ph
# onset peaks
pk = np.where((env[1:-1] > env[:-2]) & (env[1:-1] >= env[2:]) & (env[1:-1] > 0.15))[0] + 1
beats = []
for b in np.arange(best_ph, dur, period):
    near = pk[np.abs(ft[pk] - b) <= 0.045]
    beats.append(float(ft[near[np.argmax(env[near])]]) if len(near) else float(b))
# hits: the strongest onsets, at least 0.12 s apart
thr = np.percentile(env[pk], 92) if len(pk) else 1
hits, last = [], -1
for i in pk[np.argsort(-env[pk])]:
    if env[i] < thr: break
    if all(abs(ft[i] - h) >= 0.12 for h in hits): hits.append(float(ft[i]))
hits.sort()
# loudness per 0.1 s and the drop
hop = int(SR * 0.1)
rms = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2) + 1e-12) for i in range(0, len(x) - hop, hop)])
db = 20 * np.log10(rms + 1e-9)
drop, rise = 0.0, -99
for i in range(20, len(db) - 10):
    r = db[i:i + 10].mean() - db[i - 20:i].mean()
    if r > rise: rise, drop = r, i * 0.1
# snap the drop to the nearest hit or beat within 0.15 s
cand = [h for h in hits if abs(h - drop) <= 0.2] or [h for h in beats if abs(h - drop) <= 0.15]   # a hit first, else a beat
if cand: drop = min(cand, key=lambda h: abs(h - drop))
res = {'src': src, 'offset': t0, 'duration': round(dur, 3), 'bpm': round(bpm, 2), 'period': round(period, 4),
       'beats': [round(b + t0, 3) for b in beats], 'hits': [round(h + t0, 3) for h in hits],
       'drop': round(drop + t0, 3), 'drop_rise_db': round(float(rise), 1),
       'loud_db_per_100ms': [round(float(v), 1) for v in db]}
json.dump(res, open(out, 'w'), indent=0)
print(f'{dur:.1f} s  tempo {bpm:.1f} bpm (beat every {period:.3f} s)  {len(beats)} beats  {len(hits)} hits  drop at {drop + t0:.2f} s (+{rise:.1f} dB)')
print('hits:', ' '.join(f'{h + t0:.2f}' for h in hits[:60]))
