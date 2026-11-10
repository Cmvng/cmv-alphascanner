"""A new soundtrack on the finished picture (no picture re-render): the voice stays as built, the music changes.
  python3 -I remix.py <work dir> <music.mp3> <drop s> <loop start> <loop end> <out mix.wav> [under dB = 6] [duck dB = 5] [drop lands at s]

Why this exists: the first mix of this video put a dark film-score bed about 20 dB under the voice, picked from its
loudness curve alone. It read as a strange hum, not as music (the owner, 10 Nov). The owner's own reference reels
carry their music only about 5 dB under the level of speech. So here the music is set from measurements of the voice:
  - its level after the drop is `under` dB below the voice's level while speaking;
  - while the owner speaks it dips a further `duck` dB (a slow, shallow duck, so it never pumps);
  - the track's drop lands at the end of the first line (the first cut, about 3 s in), as it does within the first
    seconds of the owner's reference reels; the end card plays the music at full level before the fade.
The mix is then set to -14 LUFS, true peak under -1.5 dBTP."""
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf
K, MUS, DROP, L0, L1, OUT = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
UNDER = float(sys.argv[7]) if len(sys.argv) > 7 else 6.0
DUCK = float(sys.argv[8]) if len(sys.argv) > 8 else 5.0
plan = json.load(open(f'{K}/plan.json')); TOT = plan['end'] + plan['endcard']
at = float(sys.argv[9]) if len(sys.argv) > 9 else plan['pieces'][1]['o']   # where the drop lands: the first cut
run = lambda *a: subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', *a], check=True)
db = lambda x: 20 * np.log10(np.sqrt(np.mean(np.square(x))) + 1e-9)

# the music laid out: from (drop - at) to the loop's end, then the loop bars again
off = DROP - at
segs, t = [(max(off, 0.0), L1)], L1 - max(off, 0.0)
while t < TOT + 1:
    segs.append((L0, L1)); t += L1 - L0
fm = [f'[0:a]asplit={len(segs)}' + ''.join(f'[m{i}]' for i in range(len(segs)))]
for i, (a, b) in enumerate(segs):
    fm.append(f'[m{i}]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS[n{i}]')
lead = f'adelay={int(-off * 1000)}:all=1,' if off < 0 else ''
fm.append(''.join(f'[n{i}]' for i in range(len(segs))) + f'concat=n={len(segs)}:v=0:a=1,{lead}atrim=0:{TOT:.3f},aresample=48000[mu]')
run('-i', MUS, '-filter_complex', ';'.join(fm), '-map', '[mu]', '-ar', '48000', '-ac', '2', f'{K}/rm_music.wav')

v, sr = sf.read(f'{K}/voice.wav', dtype='float32'); m, _ = sf.read(f'{K}/rm_music.wav', dtype='float32')
n = min(len(v), len(m)); v, m = v[:n], m[:n]
k = int(sr * 0.05); fr = n // k
ve = np.array([db(v[i * k:(i + 1) * k]) for i in range(fr)])
speaking = ve > -38
vlev = db(np.concatenate([v[i * k:(i + 1) * k] for i in range(fr) if speaking[i]]))
after = m[int((at + 1) * sr):int(plan['end'] * sr)]
mlev = db(after.mean(axis=1))
g = (vlev - UNDER) - mlev                               # music gain: `under` dB below the speaking voice
# the duck: a smooth envelope from the voice (50 ms frames, 0.25 s attack, 0.6 s release), DUCK dB deep
env = np.zeros(fr); x = 0.0
for i in range(fr):
    tgt = 1.0 if speaking[i] else 0.0
    x += (tgt - x) * (0.05 / 0.25 if tgt > x else 0.05 / 0.6); env[i] = x
gain = 10 ** ((g - DUCK * np.repeat(env, k)) / 20)
gain = np.concatenate([gain, np.full(n - len(gain), gain[-1])])
fade = np.ones(n); f0 = int((TOT - 2.4) * sr); fade[f0:] = np.linspace(1, 0, n - f0) ** 2; fade[:int(.5 * sr)] = np.linspace(0, 1, int(.5 * sr))
bed = m * (gain * fade)[:, None]
sf.write(f'{K}/rm_bed.wav', bed, sr, subtype='PCM_24')
mix = bed + np.stack([v, v], axis=1)
sf.write(f'{K}/rm_pre.wav', mix, sr, subtype='PCM_24')
out = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-nostats', '-i', f'{K}/rm_pre.wav', '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
I = float(re.search(r'"input_i"\s*:\s*"(-?[\d.]+)"', out).group(1)); TP = float(re.search(r'"input_tp"\s*:\s*"(-?[\d.]+)"', out).group(1))
need = -14.0 - I
# if the peaks would pass -1.5 dBTP, a limiter takes the top off instead of leaving the whole mix quiet
af = f'volume={need:.2f}dB' + (',alimiter=limit=0.82:attack=3:release=60:level=disabled' if TP + need > -1.5 else '')
run('-i', f'{K}/rm_pre.wav', '-af', af, '-ar', '48000', '-ac', '2', OUT)
sp = np.repeat(speaking, k)[:n]
print(f'voice while speaking {vlev:.1f} dB; music after the drop {mlev:.1f} dB -> gain {g:+.1f} dB')
print(f'music under the voice: {vlev - db(bed[:len(sp)][sp][int(at * sr):].mean(axis=1)):.1f} dB while speaking, {vlev - db(bed[:len(sp)][~sp][int(at * sr):int(plan["end"] * sr)].mean(axis=1)):.1f} dB in the pauses')
print(f'mix before levelling: {I:.1f} LUFS, peak {TP:.1f} dBTP -> {af}; music from {off:.2f} s, drop at {at:.2f} s')
for f in ('rm_music.wav', 'rm_pre.wav'): os.remove(f'{K}/{f}')
