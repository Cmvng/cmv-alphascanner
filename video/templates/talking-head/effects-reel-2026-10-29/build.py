"""The effects sample reel: seven spans of the owner's recordings (six from the Cournot edit, one from the Bagel intro),
one after another, each to carry one effect. Writes <out>/base.mp4, voice.wav, mix.wav, plan.json and seg_*.mp4.
python3 -I build.py <out dir>"""
import json, os, subprocess, sys
import numpy as np
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
S = '/tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad'
SRC = {'c': (f'{S}/cournot/work/base.mp4', f'{S}/cournot/work/voice.wav'),      # the Cournot edit (output time)
       'b': (f'{S}/bagel/dl/raw.mp4', f'{S}/bagel/work/src_df3.wav')}           # the Bagel recording (its own time)
SPANS = [  # (effect id, source, start, end)
    ('behind', 'c', 0.00, 4.00), ('glass', 'c', 4.00, 12.20), ('orbit', 'c', 29.70, 35.53), ('doc', 'c', 41.02, 44.90),
    ('check', 'c', 44.90, 56.51), ('split', 'c', 65.28, 70.63), ('timeline', 'b', 48.45, 59.95)]
ENDCARD = 3.6
def pcm(path):
    return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                                        capture_output=True, check=True).stdout, np.float32)
AUD = {k: pcm(v[1]) for k, v in SRC.items()}
def quiet(k, t, r=0.08):
    x = AUD[k]; best = (1e9, t)
    for c in np.arange(t - r, t + r + 1e-6, 0.005):
        a, b = int((c - .01) * 16000), int((c + .01) * 16000)
        if a < 0: continue
        e = float(np.sqrt((x[a:b] ** 2).mean()) + 1e-9)
        if e < best[0]: best = (e, float(c))
    return best[1]
segs, o = [], 0.0
for i, (eid, k, a, b) in enumerate(SPANS):
    a2 = a if a == 0 else quiet(k, a); b2 = quiet(k, b)
    a2, b2 = round(a2 * 30) / 30, round(b2 * 30) / 30
    segs.append({'id': eid, 'src': k, 'a': round(a2, 4), 'b': round(b2, 4), 'o': round(o, 3)}); o += b2 - a2
END = round(o, 3)
GRADE_B = 'crop=608:1080:236:0,scale=1080:1920:flags=lanczos,unsharp=5:5:0.6,eq=contrast=1.05:brightness=0.02:saturation=1.05:gamma=1.04'
for i, s in enumerate(segs):
    # frame-exact: trim by frame number after fps=30 (a seek plus -t dropped a frame on four spans, 29 Oct)
    f0, f1 = round(s['a'] * 30), round(s['b'] * 30)
    vf = f'fps=30,trim=start_frame={f0}:end_frame={f1},setpts=PTS-STARTPTS' + ('' if s['src'] == 'c' else ',' + GRADE_B)
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', SRC[s['src']][0], '-vf', vf + ',setsar=1,format=yuv420p', '-an',
                    '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', '-r', '30', f'{OUT}/seg_{i}.mp4'], check=True)
    n = int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames',
                            '-of', 'csv=p=0', f'{OUT}/seg_{i}.mp4'], capture_output=True, text=True).stdout.strip())
    assert n == f1 - f0, (s['id'], n, f1 - f0)
open(f'{OUT}/segs.txt', 'w').write(''.join(f"file 'seg_{i}.mp4'\n" for i in range(len(segs))))
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{OUT}/segs.txt', '-vf',
                f'tpad=stop_mode=clone:stop_duration={ENDCARD + .5}', '-c:v', 'libx264', '-crf', '14', '-r', '30', f'{OUT}/base.mp4'], check=True)
# voice: each span with 8 ms fades; the Bagel voice gets the edit's level chain (the Cournot voice already has it)
fa, ins = [], []
for i, s in enumerate(segs):
    d = s['b'] - s['a']; chain = '' if s['src'] == 'c' else 'highpass=f=75,acompressor=threshold=0.1:ratio=2.5:attack=8:release=140:makeup=1.6,'
    ins += ['-ss', str(s['a']), '-t', f'{d:.4f}', '-i', SRC[s['src']][1]]
    fa.append(f'[{i}:a]aresample=48000,aformat=channel_layouts=mono,{chain}afade=t=in:d=0.008,afade=t=out:st={d - 0.008:.3f}:d=0.008[a{i}]')
fa.append(''.join(f'[a{i}]' for i in range(len(segs))) + f'concat=n={len(segs)}:v=0:a=1,apad=whole_dur={END + ENDCARD:.3f}[vo]')
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(fa), '-map', '[vo]', '-ar', '48000', '-ac', '1',
                f'{OUT}/voice.wav'], check=True)
# music: "A New Life" (Mixkit 543) with its drop on the second effect, under the voice
TOT = END + ENDCARD; DROP, LOOP = 24.642, (24.642, 69.677); off = DROP - segs[1]['o']
parts, t = [(off, LOOP[1])], LOOP[1] - off
while t < TOT: parts.append(LOOP); t += LOOP[1] - LOOP[0]
fm = [f'[0:a]asplit={len(parts)}' + ''.join(f'[m{i}]' for i in range(len(parts)))]
fm += [f'[m{i}]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS[n{i}]' for i, (a, b) in enumerate(parts)]
fm.append(''.join(f'[n{i}]' for i in range(len(parts))) + f'concat=n={len(parts)}:v=0:a=1,atrim=0:{TOT:.3f},aresample=48000,volume=0.12,afade=t=out:st={TOT - 2.4:.3f}:d=2.4[mu]')
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', f'{S}/cournot/music/543.mp3', '-filter_complex', ';'.join(fm), '-map', '[mu]',
                '-ar', '48000', '-ac', '2', f'{OUT}/bed.wav'], check=True)
mix = ('[0:a]asplit=2[vk][vm];[1:a][vk]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[md];'
       '[vm][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[out]')
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', f'{OUT}/voice.wav', '-i', f'{OUT}/bed.wav', '-filter_complex', mix, '-map', '[out]',
                '-ar', '48000', '-ac', '2', f'{OUT}/mix.wav'], check=True)
json.dump({'segs': segs, 'end': END, 'endcard': ENDCARD}, open(f'{OUT}/plan.json', 'w'), indent=1)
for s in segs: print(f"{s['id']:9s} {s['src']} {s['a']:7.3f}-{s['b']:7.3f}  at {s['o']:6.2f}")
print('end', END, 'total', round(TOT, 2))
