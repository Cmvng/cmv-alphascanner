"""The 32.2 s soundtrack of the entry's second cut, from the owner's 29 Oct effects-reel sample.
python3 -I splice32.py <reel audio.wav> <out song.wav>      (then: one gain to -14 LUFS + alimiter, as in the README)

The reel holds 25.87 s of a 151 bpm rap track with a big accent every two bars (3.17885 s, from 1.485 s). The low-passed
beat two cycles apart matches at 0.999 with a lag of 6.3577 s, and the waveforms are closest at 23.40 s (a line ending
on both sides), so the song plays 0-23.40, then from 23.40 - 6.3577 to the end, with a 40 ms equal-power crossfade.
The words then run "...can't be ignored / back and better, this is me but reinforced". Last 0.25 s fades out."""
import sys, wave, numpy as np
src, out = sys.argv[1:3]
w = wave.open(src); sr = w.getframerate(); ch = w.getnchannels()
x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32).reshape(-1, ch) / 32768
LAG, TO, XF, TOTAL = 6.3577, 23.40, 0.040, 32.2
xf = int(XF * sr); io = int(round(TO * sr)); ii = int(round((TO - LAG) * sr))
a, b = x[:io + xf // 2], x[ii - xf // 2:]
k = np.linspace(0, np.pi / 2, xf)[:, None]
y = np.concatenate([a[:-xf], a[-xf:] * np.cos(k) + b[:xf] * np.sin(k), b[xf:]])[:int(TOTAL * sr)]
f = int(0.25 * sr); y[-f:] *= np.sin(np.linspace(np.pi / 2, 0, f))[:, None] ** 2
o = wave.open(out, 'wb'); o.setnchannels(ch); o.setsampwidth(2); o.setframerate(sr)
o.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes()); o.close()
print(f'{len(y) / sr:.3f} s, splice at {TO} -> {TO - LAG:.4f}')
