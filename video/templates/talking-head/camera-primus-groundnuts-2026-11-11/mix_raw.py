"""The sound for an edit of the owner's own recording: THEIR voice track as recorded, cut, with quiet music under it.
  python3 -I mix_raw.py <work dir> <raw.mp4> <music.mp3> <drop s> <loop start> <loop end> [under dB = 10] [duck dB = 5]
  -> <work>/mix_raw.wav (the mix), mix_raw_voice.wav (voice only, same level), raw_voice_cut.wav and raw_bed.wav (for the gate)

The owner, 11 Nov: "the sound of the video was top quality. But when you made the edit… it was just poor." Measured:
the old chain squeezed the voice's loudness range from 7.2 to 4.0 LU (a compressor, then +10 dB into a limiter) and
left the music 6 dB under the voice where the consonants are. So here NOTHING is done to the voice:
  - no echo or noise removal, no filter, no compressor, no limiter, no resampling (it stays at its own sample rate);
  - it is cut at the plan's pieces with 8 ms fades at the joins, which is editing, and nothing else;
  - the mix is made louder by ONE plain gain, as far as the peaks allow (-1 dBTP), so its rise and fall is untouched.
The music is the only thing shaped: its highs are shelved down 8 dB above 4 kHz (the voice's crispness lives there),
it sits `under` dB below the speaking voice, dips `duck` dB more while they speak, and its drop lands on the first cut."""
import json, re, subprocess, sys
import numpy as np, soundfile as sf
K, RAW, MUS, DROP, L0, L1 = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6])
UNDER = float(sys.argv[7]) if len(sys.argv) > 7 else 10.0
DUCK = float(sys.argv[8]) if len(sys.argv) > 8 else 5.0
plan = json.load(open(f'{K}/plan.json')); TOT = plan['end'] + plan['endcard']
run = lambda *a: subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', *a], check=True)
db = lambda x: 20 * np.log10(np.sqrt(np.mean(np.square(x))) + 1e-12)
run('-i', RAW, '-vn', '-c:a', 'pcm_f32le', f'{K}/raw_audio.wav')                      # decoded once, at its own rate and channels
a, sr = sf.read(f'{K}/raw_audio.wav', dtype='float32', always_2d=True)
out = []
for i, p in enumerate(plan['pieces']):
    x = a[round(p['s'] * sr):round(p['e'] * sr)].copy(); n = int((.03 if i == 0 else .008) * sr); m = int(.008 * sr)
    x[:n] *= np.linspace(0, 1, n)[:, None]; x[-m:] *= np.linspace(1, 0, m)[:, None]; out.append(x)
v = np.concatenate(out); N = round(TOT * sr)
v = np.concatenate([v, np.zeros((max(0, N - len(v)), v.shape[1]), np.float32)])[:N]
sf.write(f'{K}/raw_voice_cut.wav', v, sr, subtype='FLOAT')
# the music, laid out so its drop lands on the first cut, then its loop bars again; highs shelved
at = plan['pieces'][1]['o']; off = DROP - at
segs, t = [(max(off, 0.0), L1)], L1 - max(off, 0.0)
while t < TOT + 1: segs.append((L0, L1)); t += L1 - L0
fm = [f'[0:a]asplit={len(segs)}' + ''.join(f'[m{i}]' for i in range(len(segs)))]
for i, (s0, s1) in enumerate(segs): fm.append(f'[m{i}]atrim={s0:.3f}:{s1:.3f},asetpts=PTS-STARTPTS[n{i}]')
lead = f'adelay={int(-off * 1000)}:all=1,' if off < 0 else ''
fm.append(''.join(f'[n{i}]' for i in range(len(segs))) + f'concat=n={len(segs)}:v=0:a=1,{lead}atrim=0:{TOT:.3f},highshelf=f=4000:g=-8,aresample={sr}[mu]')
run('-i', MUS, '-filter_complex', ';'.join(fm), '-map', '[mu]', '-ar', str(sr), '-ac', '2', '-c:a', 'pcm_f32le', f'{K}/raw_music.wav')
m, _ = sf.read(f'{K}/raw_music.wav', dtype='float32', always_2d=True)
m = np.concatenate([m, np.zeros((max(0, N - len(m)), 2), np.float32)])[:N]
vm = v.mean(1); k = int(sr * .05); fr = N // k
ve = np.array([db(vm[i * k:(i + 1) * k]) for i in range(fr)]); speaking = ve > -45
vlev = db(np.concatenate([vm[i * k:(i + 1) * k] for i in range(fr) if speaking[i]]))
mlev = db(m[int((at + 1) * sr):int(plan['end'] * sr)].mean(1))
g = (vlev - UNDER) - mlev
env = np.zeros(fr); x = 0.0
for i in range(fr):
    tgt = 1.0 if speaking[i] else 0.0
    x += (tgt - x) * (.05 / .25 if tgt > x else .05 / .6); env[i] = x
gain = 10 ** ((g - DUCK * np.repeat(env, k)) / 20); gain = np.concatenate([gain, np.full(N - len(gain), gain[-1])])
fade = np.ones(N); f0 = int((TOT - 2.4) * sr); fade[f0:] = np.linspace(1, 0, N - f0) ** 2; fade[:int(.5 * sr)] = np.linspace(0, 1, int(.5 * sr))
bed = m * (gain * fade)[:, None]
sf.write(f'{K}/raw_bed.wav', bed, sr, subtype='FLOAT')
v2 = v if v.shape[1] == 2 else np.repeat(v, 2, 1)
mix = bed + v2
sf.write(f'{K}/raw_pre.wav', mix, sr, subtype='FLOAT')
def meter(path):
    o = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', o)[-1]), float(re.findall(r'LRA:\s+(-?[\d.]+) LU', o)[-1]), float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', o)[-1])
I, LRA, TP = meter(f'{K}/raw_pre.wav')
up = -1.0 - TP                                                                        # one plain gain, to -1 dBTP; no limiter
sf.write(f'{K}/mix_raw.wav', mix * 10 ** (up / 20), sr, subtype='PCM_24')
sf.write(f'{K}/mix_raw_voice.wav', v2 * 10 ** (up / 20), sr, subtype='PCM_24')
sp = np.repeat(speaking, k)
def band(xx, lo, hi):
    X = np.abs(np.fft.rfft(xx)) ** 2; f = np.fft.rfftfreq(len(xx), 1 / sr); return 10 * np.log10(X[(f >= lo) & (f < hi)].sum() + 1e-12)
L = min(len(sp), int(plan['end'] * sr)); vb = vm[:L][sp[:L]]; bb = bed[:L].mean(1)[sp[:L]]
print(f'voice: {sr} Hz, {a.shape[1]} channel(s), untouched; speaking level {vlev:.1f} dB; one gain of {up:+.1f} dB (peak to -1 dBTP)')
print(f'music under the voice while speaking: {db(vb) - db(bb):.1f} dB overall; ' + ', '.join(f'{lo}-{hi} Hz {band(vb, lo, hi) - band(bb, lo, hi):.0f}' for lo, hi in ((120, 300), (300, 1000), (1000, 4000), (4000, 12000))))
Ir, Lr, _ = meter(f'{K}/raw_audio.wav'); Iv, Lv, _ = meter(f'{K}/mix_raw_voice.wav'); Im, Lm, Tm = meter(f'{K}/mix_raw.wav')
print(f'loudness range: the raw recording {Lr:.1f} LU, the voice in the edit {Lv:.1f} LU; the mix {Im:.1f} LUFS, peak {Tm:.1f} dBTP (the raw is {Ir:.1f} LUFS)')
