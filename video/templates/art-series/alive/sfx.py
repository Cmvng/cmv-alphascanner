"""Sound effects made from noise and sine, no samples:  python3 -I sfx.py <out.wav> <seconds> kind:time[:gain_db] ...
  riser:t   a 1.6 s swell that stops dead at t (leave a beat of silence after it, then the drop)
  boom:t    a low hit at t      whoosh:t   a soft pass centred on t
  tick:t    a clock tick        ding:t     a two-note chime            Stereo, 48 kHz, 16-bit."""
import sys, wave, numpy as np
out, dur = sys.argv[1], float(sys.argv[2]); SR = 48000; N = int(dur * SR); L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(7)
def lp(x, fc):                                     # one-pole low-pass, cutoff per sample
    y = np.zeros_like(x); a = 1 - np.exp(-2 * np.pi * np.asarray(fc, dtype=float) / SR); s = 0.0
    a = np.broadcast_to(a, x.shape)
    for i in range(len(x)): s += a[i] * (x[i] - s); y[i] = s
    return y
def put(sig_l, sig_r, t0):
    i = int(t0 * SR); a = max(0, -i); n = min(len(sig_l) - a, N - max(i, 0))
    if n > 0: L[max(i, 0):max(i, 0) + n] += sig_l[a:a + n]; R[max(i, 0):max(i, 0) + n] += sig_r[a:a + n]
for spec in sys.argv[3:]:
    p = spec.split(':'); kind, t = p[0], float(p[1]); g = 10 ** (float(p[2]) / 20) if len(p) > 2 else 1
    if kind == 'riser':
        n = int(1.6 * SR); u = np.linspace(0, 1, n); fc = 250 * (36 ** u)
        l = lp(rng.standard_normal(n), fc) - lp(rng.standard_normal(n), fc * .25); r = lp(rng.standard_normal(n), fc) - lp(rng.standard_normal(n), fc * .25)
        env = (u ** 2.2) * np.minimum(1, (1 - u) / .004); k = .5 * g / max(np.abs(l * env).max(), 1e-9); put(l * env * k, r * env * k, t - 1.6)
    elif kind == 'boom':
        n = int(1.4 * SR); tt = np.arange(n) / SR; f = 38 + 60 * np.exp(-tt / .07); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .38)
        c = lp(rng.standard_normal(n), 1800) * np.exp(-tt / .03) * .5; s = (s + c) * np.minimum(1, tt / .002); k = .7 * g / np.abs(s).max(); put(s * k, s * k, t)
    elif kind == 'whoosh':
        n = int(.7 * SR); u = np.linspace(0, 1, n); fc = 500 + 3500 * np.sin(np.pi * u) ** 2
        l = lp(rng.standard_normal(n), fc) - lp(rng.standard_normal(n), 200); r = lp(rng.standard_normal(n), fc) - lp(rng.standard_normal(n), 200)
        pan = u; env = np.sin(np.pi * u) ** 2.5; k = .16 * g / max(np.abs(l * env).max(), 1e-9); put(l * env * k * (1 - .6 * pan), r * env * k * (.4 + .6 * pan), t - .35)
    elif kind == 'tick':
        n = int(.09 * SR); tt = np.arange(n) / SR; s = (np.sin(2 * np.pi * 2300 * tt) + .5 * np.sin(2 * np.pi * 4100 * tt)) * np.exp(-tt / .012) * .32 * g; put(s, s, t)
    elif kind == 'ding':
        n = int(1.3 * SR); tt = np.arange(n) / SR; s = np.zeros(n)
        for f, d0, a in ((1318.5, 0, 1), (1975.5, .09, .8), (2637, .09, .25)):
            k = int(d0 * SR); s[k:] += a * np.sin(2 * np.pi * f * tt[:n - k]) * np.exp(-tt[:n - k] / .32)
        s *= np.minimum(1, tt / .003) * .22 * g; put(s, s * .9, t)
x = np.clip(np.stack([L, R], 1), -1, 1); w = wave.open(out, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes()); w.close()
print('sfx', out, f'{dur}s', len(sys.argv) - 3, 'events, peak', round(float(np.abs(x).max()), 3))
