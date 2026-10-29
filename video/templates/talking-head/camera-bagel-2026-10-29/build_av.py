"""Sound for the Bagel edit: the owner's cleaned voice cut on the plan's voice pieces (silence under fast, held and
title pieces), and the music under it: 370 "Sparta" (Arulo, Mixkit), its drop (31.997 s) on the title, looped on
its measured bars, ducked under the voice, out over the end card.
  python3 -I build_av.py <work dir> <src_df3.wav> <370.mp3>  ->  <work>/voice.wav, <work>/bed.wav, <work>/mix.wav"""
import json, subprocess, sys

K, VOICE, MUS = sys.argv[1:4]
plan = json.load(open(f'{K}/plan.json'))
TOT, SR = plan['dur'], 48000
DROP, LOOP = 31.997, (31.997, 95.997)        # music.json: the drop, and the bars that loop cleanly (32 bars at 120 bpm)

# voice: each voice span (plan['voice']: a = the span of the cleaned voice, o0 = where it starts in the edit),
# 8 ms fades at its edges (30 ms on the first)
vp = sorted(plan['voice'], key=lambda v: v['o0'])
fa, labels = [f'[0:a]asplit={len(vp)}' + ''.join(f'[a{i}]' for i in range(len(vp)))], []
for i, p in enumerate(vp):
    a0, a1 = p['a']; d = a1 - a0; fin = .03 if i == 0 else .008
    fa.append(f'[a{i}]atrim=start_sample={round(a0 * SR)}:end_sample={round(a1 * SR)},asetpts=PTS-STARTPTS,'
              f'afade=t=in:d={fin},afade=t=out:st={d - .008:.4f}:d=0.008,adelay={round(p["o0"] * 1000)}|{round(p["o0"] * 1000)}[b{i}]')
    labels.append(f'[b{i}]')
fa.append(''.join(labels) + f'amix=inputs={len(vp)}:normalize=0:duration=longest,highpass=f=75,'
          'acompressor=threshold=0.1:ratio=2.5:attack=8:release=140:makeup=1.6,'
          f'apad=whole_dur={TOT:.3f},atrim=0:{TOT:.3f}[vo]')
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', VOICE, '-filter_complex', ';'.join(fa), '-map', '[vo]', '-ar', str(SR), '-ac', '1',
                f'{K}/voice.wav'], check=True)

# music: from (drop - drop time) so the drop lands on the plan's music_drop_at (else the title), then the loop bars
# again until the end; a drop later than the track's own lead-in starts the music after a silence
title = plan.get('music_drop_at') or next(p['o0'] for p in plan['pieces'] if p['mode'] == 'title')
off, lead = DROP - title, 0.0
if off < 0:
    off, lead = 0.0, -off
segs, t = [(off, LOOP[1])], lead + LOOP[1] - off
while t < TOT:
    segs.append(LOOP); t += LOOP[1] - LOOP[0]
# the bed in a pass of its own: with the split, trims and concat in the same graph as the sidechain, the music
# dropped out after about 88 s wherever the voice was silent
fm = [f'[0:a]asplit={len(segs)}' + ''.join(f'[m{i}]' for i in range(len(segs)))]
for i, (a, b) in enumerate(segs):
    fm.append(f'[m{i}]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS[n{i}]')
fm.append(''.join(f'[n{i}]' for i in range(len(segs))) + f'concat=n={len(segs)}:v=0:a=1,adelay={round(lead * 1000)}:all=1,atrim=0:{TOT:.3f},aresample={SR},'
          f'volume={plan.get("music_level", 0.12)},afade=t=out:st={TOT - 2.6:.3f}:d=2.6[mu]')
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', MUS, '-filter_complex', ';'.join(fm), '-map', '[mu]', '-ar', str(SR), '-ac', '2',
                f'{K}/bed.wav'], check=True)
mix = ('[0:a]asplit=2[vk][vm];[1:a][vk]sidechaincompress=threshold=0.03:ratio=7:attack=12:release=380[md];'
       '[vm][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[out]')
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', f'{K}/voice.wav', '-i', f'{K}/bed.wav', '-filter_complex', mix, '-map', '[out]',
                '-ar', str(SR), '-ac', '2', f'{K}/mix.wav'], check=True)
print(f'{len(vp)} voice pieces; music from {off:.2f} s, drop at {title:.2f} s, after {lead:.2f} s of no music, {len(segs)} segments; total {TOT:.2f} s')
