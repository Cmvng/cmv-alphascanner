# The mouth track: a voice -> closed / half / open for every frame, changing 15 times a second.
# Open on loud syllables, half on soft ones, closed between words (word times) and when quiet. The state is held for
# 2 frames, so the mouth never flickers. Written as window.MOUTH for the page.
#   python3 -I mouthtrack.py <voice.wav> <words.js> <seconds> <out mouth.js> [fps] [timemap]
# voice.wav: the voice alone, as placed in the video (the voice stem the mix writes, lead-in and pauses included).
# words.js: window.WORDS = [[start, end, word], ...] in the take's own time; timemap moves them to video time when the
# mix shifts the take, as "lead,cut,pause": t -> t + lead + (t >= cut ? pause : 0) (Prospect: "0.2,8.36,0.6").
import sys, json, numpy as np, soundfile as sf
wav, wjs, dur, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
FPS = int(sys.argv[5]) if len(sys.argv) > 5 else 30
lead, cut, pause = [float(v) for v in sys.argv[6].split(',')] if len(sys.argv) > 6 else (0, 1e9, 0)
y, sr = sf.read(wav); y = y if y.ndim == 1 else y.mean(axis=1)
W = json.loads(open(wjs).read().split('=', 1)[1].strip().rstrip(';'))
T = lambda s: s + lead + (pause if s >= cut else 0)
words = [(T(a), T(b)) for a, b, *_ in W]
n = int(round(dur * FPS))
rms = np.array([np.sqrt(np.mean(y[int(i / FPS * sr):int((i + 1) / FPS * sr)] ** 2)) for i in range(n)])
ref = np.percentile(rms[rms > 1e-4], 90)
st = []
for i in range(n):
    t = (i + .5) / FPS; inword = any(a - .03 <= t <= b + .02 for a, b in words); v = rms[i] / ref
    st.append(0 if not inword or v < .12 else (2 if v > .45 else 1))
o = []
for i in range(0, n, 2): s = max(st[i:i + 2]); o += [s, s]
o = o[:n]
for i in range(1, n - 1):
    if o[i] == 2 and o[i - 1] == 0 and o[i + 1] == 0: o[i] = 1
open(out, 'w').write('window.MOUTH=' + json.dumps(o) + ';')
print('frames', n, 'closed/half/open', [o.count(k) for k in (0, 1, 2)])
