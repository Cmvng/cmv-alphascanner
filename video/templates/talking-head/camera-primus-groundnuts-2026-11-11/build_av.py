"""The camera base and the voice for the 11 Nov Primus edit.
  python3 -I build_av.py <work dir> <cam.mp4>   ->  base.mp4, voice.wav, voice16.wav   (the music: remix.py)

cam.mp4 is the cut camera picture in the studio look (video/lib/portrait_pro_long.py render, from the plan's
segs.json), with the top of the owner's head at 28.5% of the height. While the stage panel is down (plan['stage']) the
whole picture sits DOWN px lower, so the head is under the panel and the face stays whole. The strip that opens above
the picture is the top of the backdrop mirrored: it is a smooth blur, so the join does not show, and the panel covers
most of it. The move is a smoothstep over RAMP seconds; the page moves the panel on the same curve.
The owner's phone records the front camera mirrored (the Chelsea crest and the Nike tick on the shirt read backwards),
so the picture is flipped left to right here: FLIP = True. Check a frame of the raw recording for text before keeping it.
Sound: the cleaned voice cut on the same frames, 8 ms fades at each edge."""
import json, subprocess, sys
K, CAM = sys.argv[1:3]
plan = json.load(open(f'{K}/plan.json'))
FPS, END, EC = plan['fps'], plan['end'], plan['endcard']
TOT = END + EC
DOWN, RAMP, FLIP = 300, 0.45, True
ss = lambda a: f'(clip((t-{a:.3f})/{RAMP},0,1)*clip((t-{a:.3f})/{RAMP},0,1)*(3-2*clip((t-{a:.3f})/{RAMP},0,1)))'
k = '+'.join(f'({ss(a)}-{ss(b)})' for a, b in plan['stage'])
fc = (f'[0:v]{"hflip," if FLIP else ""}split=2[c][m];[m]crop=1080:{DOWN}:0:0,vflip[mf];[mf][c]vstack=inputs=2[tall];'
      f"[tall]crop=w=1080:h=1920:x=0:y='{DOWN}-{DOWN}*({k})',format=yuv420p,tpad=stop_mode=clone:stop_duration={EC + 0.5}[v]")
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', CAM, '-filter_complex', fc, '-map', '[v]', '-c:v', 'libx264',
                '-preset', 'fast', '-crf', '13', '-r', str(FPS), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', f'{K}/base.mp4'], check=True)
n = int(subprocess.check_output(['ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', f'{K}/base.mp4']).decode().strip().strip(','))
print(f'base.mp4: {n} frames, needs at least {round(TOT * FPS)}' + ('' if n >= round(TOT * FPS) else '   TOO SHORT'))

pcs = plan['pieces']; m = len(pcs)
fa = [f'[0:a]asplit={m}' + ''.join(f'[a{i}]' for i in range(m))]
for i, p in enumerate(pcs):
    d = p['e'] - p['s']; fin = 0.03 if i == 0 else 0.008
    fa.append(f'[a{i}]atrim=start_sample={round(p["s"] * 48000)}:end_sample={round(p["e"] * 48000)},asetpts=PTS-STARTPTS,'
              f'afade=t=in:d={fin},afade=t=out:st={d - 0.008:.3f}:d=0.008[b{i}]')
fa.append(''.join(f'[b{i}]' for i in range(m)) + f'concat=n={m}:v=0:a=1,highpass=f=75,'
          'acompressor=threshold=0.1:ratio=2.5:attack=8:release=140:makeup=1.6,'
          f'apad=whole_dur={TOT:.3f},atrim=0:{TOT:.3f}[vo]')
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', f'{K}/src_df3.wav', '-filter_complex', ';'.join(fa), '-map', '[vo]',
                '-ar', '48000', '-ac', '1', f'{K}/voice.wav'], check=True)
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', f'{K}/voice.wav', '-ar', '16000', '-ac', '1', f'{K}/voice16.wav'], check=True)
print(f'voice.wav: {TOT:.2f} s in {m} pieces; the stage is down in {plan["stage"]}')
