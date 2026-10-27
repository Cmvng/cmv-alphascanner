"""Base camera video and the sound mix for the Primus edit (the Kane edit's build, for a full-frame 1080x1920 selfie).
python3 -I build_av.py <work dir> <raw.mp4> <music.mp3> [--audio-only]  ->  base.mp4, voice.wav, mix.wav"""
import json, os, subprocess, sys
K, RAW, MUS = sys.argv[1:4]
plan = json.load(open(f'{K}/plan.json'))
PH = [(p['s'], p['e']) for p in json.load(open(f'{K}/phrases.json'))]
END, EC = plan['end'], plan['endcard']
GRADE = 'eq=contrast=1.05:brightness=0.015:saturation=1.05:gamma=1.04,unsharp=5:5:0.4'
AX, AY, W, H = 540, 1150, 1080, 1920          # punch-in anchor (between the eyes and the mouth) and the frame

def crop(z):
    w, h = W / z, H / z
    return f'crop={w:.0f}:{h:.0f}:{AX - AX / z:.0f}:{AY - AY / z:.0f},scale=1080:1920:flags=lanczos'

# video segments: every piece, split again at phrase gaps inside long pieces (a visual punch-in, no audio cut)
segs, z = [], 0
for p in plan['pieces']:
    cuts = [p['s']]
    for a, b in zip(PH, PH[1:]):
        m = round((a[1] + b[0]) / 2 * 30) / 30
        if p['s'] + 3.5 < m < p['e'] - 2.5 and m - cuts[-1] >= 3.5: cuts.append(m)
    cuts.append(p['e'])
    for a, b in zip(cuts, cuts[1:]):
        segs.append((a, b, 1.0 if z % 2 == 0 else 1.07)); z += 1
n = len(segs)
fc = [f'[0:v]fps=30,split={n}' + ''.join(f'[i{i}]' for i in range(n))]
for i, (a, b, zz) in enumerate(segs):
    fc.append(f'[i{i}]trim=start_frame={round(a * 30)}:end_frame={round(b * 30)},setpts=PTS-STARTPTS,{crop(zz)},{GRADE},setsar=1[v{i}]')
fc.append(''.join(f'[v{i}]' for i in range(n)) + f'concat=n={n}:v=1:a=0,format=yuv420p[v]')
if '--audio-only' not in sys.argv:
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', RAW, '-filter_complex', ';'.join(fc), '-map', '[v]', '-c:v', 'libx264',
                    '-preset', 'medium', '-crf', '17', '-r', '30', f'{K}/base.mp4'], check=True)
    # the end card's frames, in a pass of their own
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{K}/base.mp4', '-vf', f'tpad=stop_mode=clone:stop_duration={EC + 0.5}',
                    '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', f'{K}/base_pad.mp4'], check=True)
    os.replace(f'{K}/base_pad.mp4', f'{K}/base.mp4')
json.dump([{'s': a, 'e': b, 'zoom': zz} for a, b, zz in segs], open(f'{K}/segs.json', 'w'), indent=0)

# voice: the cleaned voice, cut on the same pieces with fades at every edge (30 ms on the very first), then a level chain
pcs = plan['pieces']; m = len(pcs)
fa = [f'[0:a]asplit={m}' + ''.join(f'[a{i}]' for i in range(m))]
for i, p in enumerate(pcs):
    d = p['e'] - p['s']; fin = 0.03 if i == 0 else 0.008
    fa.append(f'[a{i}]atrim=start_sample={round(p["s"] * 48000)}:end_sample={round(p["e"] * 48000)},asetpts=PTS-STARTPTS,afade=t=in:d={fin},afade=t=out:st={d - 0.008:.3f}:d=0.008[b{i}]')
fa.append(''.join(f'[b{i}]' for i in range(m)) + f'concat=n={m}:v=0:a=1,highpass=f=75,'
          'acompressor=threshold=0.1:ratio=2.5:attack=8:release=140:makeup=1.6,'
          f'apad=whole_dur={END + EC:.3f}[vo]')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{K}/src_df3.wav', '-filter_complex', ';'.join(fa), '-map', '[vo]',
                '-ar', '48000', '-ac', '1', f'{K}/voice.wav'], check=True)

# music: "Fragments Of Bangkok" (625) as a soft bed, its drop on "Proof of Nomad Life", ducked under the voice, out on the end card
TOT = END + EC
drop_at = plan['ev']['t_proof']; off = max(0.0, 35.954 - drop_at)
fm = (f'[1:a]atrim={off:.3f},asetpts=PTS-STARTPTS,volume=0.13,afade=t=in:d=1.2,'
      f'afade=t=out:st={TOT - 2.4:.3f}:d=2.4,apad=whole_dur={TOT:.3f},atrim=0:{TOT:.3f}[mu];'
      '[0:a]asplit=2[vk][vm];[mu][vk]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[md];'
      f'[vm][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[out]')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{K}/voice.wav', '-i', MUS, '-filter_complex', fm, '-map', '[out]',
                '-ar', '48000', '-ac', '2', f'{K}/mix.wav'], check=True)
print(f'{n} video segments; music from {off:.2f} s (drop at {drop_at:.2f} s); total {TOT:.2f} s')
