"""The sound for the Probly character video (20 Nov): the owner's OWN recorded voice, as recorded, with quiet music.
  python3 -I mix_pb.py <work dir> <rec.mp4> <bed_src.wav> <in s> <out s> <lead s> <total s> <drop s> [under dB=13] [duck dB=4]
  -> <work>/mix.wav, voice.wav (the voice alone, placed and at the same gain), bed.wav (the music as mixed, for preflight)

The cartoon speaks with the owner's voice from their recording (the checkpoint: "Their own recorded voice comes first").
Their voice is treated as their recordings are (mix_raw.py, 11 Nov):
  - nothing is done to it: no clean-up, no filter, no compressor, no limiter; it keeps its own sample rate;
  - it is cut once, from <in> to <out> (silence on both sides), with short fades, and placed at <lead> in the video;
  - the mix gets ONE plain gain, up to a peak of -1 dBTP, so its loud-and-soft range is untouched.
The music (bed_src.wav, already laid out so its drop lands at <drop> in the video) is the only thing shaped: highs
shelved down 8 dB above 4 kHz, `under` dB below the speaking voice, `duck` dB more while they speak, up to full level on
the end card (from 0.25 s after the last word), and faded out over the last 1.8 s."""
import re, subprocess, sys
import numpy as np, soundfile as sf
K, REC, BED = sys.argv[1], sys.argv[2], sys.argv[3]
T_IN, T_OUT, LEAD, TOT, DROP = (float(v) for v in sys.argv[4:9])
UNDER = float(sys.argv[9]) if len(sys.argv) > 9 else 13.0
DUCK = float(sys.argv[10]) if len(sys.argv) > 10 else 4.0
run = lambda *a: subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', *a], check=True)
db = lambda x: 20 * np.log10(np.sqrt(np.mean(np.square(x))) + 1e-12)
run('-i', REC, '-vn', '-c:a', 'pcm_f32le', f'{K}/rec_audio.wav')                      # decoded once, own rate and channels
a, sr = sf.read(f'{K}/rec_audio.wav', dtype='float32', always_2d=True)
x = a[round(T_IN * sr):round(T_OUT * sr)].copy(); n = int(.03 * sr)
x[:n] *= np.linspace(0, 1, n)[:, None]; x[-n:] *= np.linspace(1, 0, n)[:, None]
N = round(TOT * sr); v = np.zeros((N, a.shape[1]), np.float32); o = round(LEAD * sr); v[o:o + len(x)] = x[:N - o]
v2 = v if v.shape[1] == 2 else np.repeat(v, 2, 1)
run('-i', BED, '-af', f'atrim=0:{TOT:.3f},highshelf=f=4000:g=-8,aresample={sr}', '-ac', '2', '-c:a', 'pcm_f32le', f'{K}/bed_hs.wav')
m, _ = sf.read(f'{K}/bed_hs.wav', dtype='float32', always_2d=True)
m = np.concatenate([m, np.zeros((max(0, N - len(m)), 2), np.float32)])[:N]
vm = v.mean(1); k = int(sr * .05); fr = N // k
ve = np.array([db(vm[i * k:(i + 1) * k]) for i in range(fr)]); speaking = ve > -45
vlev = db(np.concatenate([vm[i * k:(i + 1) * k] for i in range(fr) if speaking[i]]))
END_V = LEAD + (T_OUT - T_IN)                                                         # the voice's last sample, video time
last = max(i for i in range(fr) if speaking[i]) * k / sr
mlev = db(m[int((DROP + 1) * sr):int(last * sr)].mean(1))
g = (vlev - UNDER) - mlev
env = np.zeros(fr); e = 0.0
for i in range(fr):
    tgt = 1.0 if speaking[i] else 0.0
    e += (tgt - e) * (.05 / .25 if tgt > e else .05 / .6); env[i] = e
gdb = g - DUCK * np.repeat(env, k); gdb = np.concatenate([gdb, np.full(N - len(gdb), gdb[-1])])
tt = np.arange(N) / sr; up = np.clip((tt - (last + .25)) / .6, 0, 1); gdb = gdb + (UNDER - 4) * up   # end card: up to 4 dB under the voice's speaking level
fade = np.ones(N); f0 = int((TOT - 1.8) * sr); fade[f0:] = np.linspace(1, 0, N - f0) ** 2; fade[:int(.3 * sr)] = np.linspace(0, 1, int(.3 * sr))
bed = m * (10 ** (gdb / 20) * fade)[:, None]
mix = bed + v2
sf.write(f'{K}/pre.wav', mix, sr, subtype='FLOAT')
def meter(path):
    oo = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', oo)[-1]), float(re.findall(r'LRA:\s+(-?[\d.]+) LU', oo)[-1]), float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', oo)[-1])
I, LRA, TP = meter(f'{K}/pre.wav')
G = -1.0 - TP                                                                         # one plain gain, to -1 dBTP; no limiter
sf.write(f'{K}/mix.wav', mix * 10 ** (G / 20), sr, subtype='PCM_24')
sf.write(f'{K}/voice.wav', v2 * 10 ** (G / 20), sr, subtype='PCM_24')
sf.write(f'{K}/bed.wav', bed * 10 ** (G / 20), sr, subtype='PCM_24')
sp = np.repeat(speaking, k); L = min(len(sp), int(last * sr)); vb = vm[:L][sp[:L]]; bb = bed[:L].mean(1)[sp[:L]]
def band(xx, lo, hi):
    X = np.abs(np.fft.rfft(xx)) ** 2; f = np.fft.rfftfreq(len(xx), 1 / sr); return 10 * np.log10(X[(f >= lo) & (f < hi)].sum() + 1e-12)
print(f'voice: {sr} Hz, {a.shape[1]} ch, untouched; rec {T_IN}-{T_OUT} s at video {LEAD} s (ends {END_V:.2f}, last word ~{last:.2f}); one gain {G:+.1f} dB')
print(f'music under the voice while speaking: {db(vb) - db(bb):.1f} dB; ' + ', '.join(f'{lo}-{hi} Hz {band(vb, lo, hi) - band(bb, lo, hi):.0f}' for lo, hi in ((120, 300), (300, 1000), (1000, 4000), (4000, 12000))))
Ir, Lr, _ = meter(f'{K}/rec_audio.wav'); Iv, Lv, _ = meter(f'{K}/voice.wav'); Im, Lm, Tm = meter(f'{K}/mix.wav')
print(f'loudness range: the recording {Lr:.1f} LU, the voice in the video {Lv:.1f} LU; the mix {Im:.1f} LUFS, peak {Tm:.1f} dBTP (the recording {Ir:.1f} LUFS)')
