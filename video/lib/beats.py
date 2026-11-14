"""The beat map of a music track (librosa): tempo, every beat, the strong onsets ("hits") and the drop, so cuts, slams
and pops can land on the music instead of on guessed times. From the 14 Nov motion study (librosa, item 18).

  python3 -I video/lib/beats.py <track.mp3> [--offset S] [--drop S] [--from S] [--to S] [--json out.json]

--offset S   where the track starts in the video's timeline is "the track's S seconds play at video 0" (mix.sh's OFF),
             so every time is also printed in video seconds (video = track - offset).
--drop S     a known drop time in the track (e.g. 31.997 for "Sparta"); otherwise the biggest energy jump is used.
--from/--to  only report this stretch of the track (track seconds).

The JSON holds track seconds: {"tempo", "beats", "downbeats" (every 4th beat from the beat nearest the drop), "hits"
(onsets clearly above their neighbours, with strength 0..1), "drop"}. Use hits for slams and stamps, downbeats for scene
cuts, beats for staggers. Never add a made sound on them: the owner hates whooshes and hits (22 Oct)."""
import argparse, json, sys
import numpy as np
import librosa

ap = argparse.ArgumentParser()
ap.add_argument('track'); ap.add_argument('--offset', type=float, default=None); ap.add_argument('--drop', type=float, default=None)
ap.add_argument('--from', dest='t0', type=float, default=0.0); ap.add_argument('--to', dest='t1', type=float, default=None)
ap.add_argument('--json')
A = ap.parse_args()

y, sr = librosa.load(A.track, sr=22050, mono=True)
hop = 512
env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
tempo, bf = librosa.beat.beat_track(onset_envelope=env, sr=sr, hop_length=hop, units='frames')
tempo = float(np.atleast_1d(tempo)[0])
beats = librosa.frames_to_time(bf, sr=sr, hop_length=hop)
# hits: onset peaks well above the local level (strong transients: kicks, snares, the drop)
pk = librosa.util.peak_pick(env, pre_max=6, post_max=6, pre_avg=40, post_avg=40, delta=float(np.percentile(env, 90)) * .35, wait=6)
ht = librosa.frames_to_time(pk, sr=sr, hop_length=hop); hs = env[pk] / (env.max() + 1e-9)
# drops: the level of the next 0.5 s against the 0.75 s before, a jump of 10 dB or more (on "Sparta" and "New Bass 01" the
# first drop jumps 13-15 dB: 31.99 s and 22.9 s). Tracks have several; the first one after 4 s is the default drop.
rms = librosa.feature.rms(y=y, hop_length=hop)[0]; db = 20 * np.log10(rms + 1e-6)
rt = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)
a, b = int(.75 * sr / hop), int(.5 * sr / hop)
cs = np.concatenate([[0], np.cumsum(db)])
jump = np.full(len(db), -99.0)
for i in range(a, len(db) - b): jump[i] = (cs[i + b] - cs[i]) / b - (cs[i] - cs[i - a]) / a
drops = []
for i in np.argsort(-jump):
    if jump[i] < 10: break
    t = float(rt[i])
    if all(abs(t - d) > 2 for d, _ in drops): drops.append((t, float(jump[i])))
drops.sort()
if len(ht): drops = [(float(ht[np.argmin(np.abs(ht - t))]) if np.min(np.abs(ht - t)) < .15 else t, j) for t, j in drops]
drop = A.drop if A.drop is not None else next((t for t, _ in drops if t > 4), drops[0][0] if drops else 0.0)
ib = int(np.argmin(np.abs(beats - drop))) if len(beats) else 0
down = beats[ib % 4::4] if len(beats) else beats
t1 = A.t1 if A.t1 is not None else len(y) / sr
sel = lambda a: [round(float(x), 3) for x in a if A.t0 <= x <= t1]
out = {'track': A.track, 'tempo': round(tempo, 2), 'drop': round(drop, 3), 'drops': [[round(t, 3), round(j, 1)] for t, j in drops], 'beats': sel(beats), 'downbeats': sel(down),
       'hits': [[round(float(t), 3), round(float(s), 2)] for t, s in zip(ht, hs) if A.t0 <= t <= t1]}
if A.json: json.dump(out, open(A.json, 'w'), indent=1)
V = (lambda x: f'{x - A.offset:7.3f}') if A.offset is not None else (lambda x: '')
print(f"tempo {out['tempo']} bpm, beat {60 / max(tempo, 1):.3f} s; drop at track {out['drop']}" + (f' = video {drop - A.offset:.3f}' if A.offset is not None else ''))
print('all drops (track s, dB jump): ' + ', '.join(f'{t:.2f} (+{j:.0f})' for t, j in drops))
print('strong hits (track s, strength' + (', video s' if A.offset is not None else '') + '):')
for t, s in out['hits']:
    if s >= .45: print(f'  {t:8.3f}  {s:.2f}  {V(t)}')
print(f"{len(out['beats'])} beats, {len(out['downbeats'])} downbeats, {len(out['hits'])} hits in range")
