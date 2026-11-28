"""Is the background gone, and is their voice still all there? Measured on the pauses and the words (28 Nov).
  python3 -I voice_check.py <recording audio.wav> <voice.wav as mixed> <words.json> [lead s=0]
Both files are compared on the same words (the voice file may carry one plain gain; it is taken out first)."""
import json, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
A, B, W = sys.argv[1:4]; LEAD = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0
def load(p):
    x, sr = sf.read(p, dtype='float32', always_2d=True); return x.mean(1), sr
a, sr = load(A); b, sr2 = load(B); assert sr == sr2
w = json.load(open(W)); w = w['words'] if isinstance(w, dict) else w
db = lambda v: 20 * np.log10(np.sqrt(np.mean(np.square(v))) + 1e-12)
cut = lambda x, s, e, o=0: x[int((s + o) * sr):int((e + o) * sr)]
words = [(x['s'], x['e']) for x in w]
gaps = [(p['e'] + .08, q['s'] - .08) for p, q in zip(w, w[1:]) if q['s'] - p['e'] > .5]
sa = np.concatenate([cut(a, s, e) for s, e in words]); sb = np.concatenate([cut(b, s, e, LEAD) for s, e in words])
g = db(sb) - db(sa); b = b / 10 ** (g / 20); sb = sb / 10 ** (g / 20)              # take out the plain gain
pa = np.concatenate([cut(a, s, e) for s, e in gaps]); pb = np.concatenate([cut(b, s, e, LEAD) for s, e in gaps])
hb = butter(4, [6000, 10000], 'bandpass', fs=sr, output='sos'); cb = butter(4, [4000, 12000], 'bandpass', fs=sr, output='sos')
print(f'plain gain in the voice file: {g:+.1f} dB (taken out)')
print(f'pauses under the speech: the recording {db(sa) - db(pa):.1f} dB, the clean voice {db(sb) - db(pb):.1f} dB')
print(f'6-10 kHz in the pauses under the same band in speech: the recording {db(sosfilt(hb, sa)) - db(sosfilt(hb, pa)):.1f} dB, the clean voice {db(sosfilt(hb, sb)) - db(sosfilt(hb, pb)):.1f} dB')
print(f'consonants (4-12 kHz) in the words, clean voice against the recording: {db(sosfilt(cb, sb)) - db(sosfilt(cb, sa)):+.1f} dB')
lw = [db(cut(b, s, e, LEAD)) - db(cut(a, s, e)) for s, e in words if e - s > .12]
print(f'each word, clean voice against the recording: median {np.median(lw):+.1f} dB, the quietest 2% {np.percentile(lw, 2):+.1f} dB, lowest {min(lw):+.1f} dB')
