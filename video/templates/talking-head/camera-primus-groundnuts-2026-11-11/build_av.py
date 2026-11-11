"""The camera base and the voice for the 11 Nov Primus edit.
  python3 -I build_av.py <work dir> <cam.mp4> [full]   ->  base.mp4, voice.wav, voice16.wav   (the music: remix.py)
`full`: the owner stays full screen the whole way (the third version, talk.html); the picture is only flipped.

cam.mp4 is the cut camera picture: the WHOLE frame as the owner shot it (video/lib/portrait_pro_long.py render with
PP_FULL=1 and the room look, from the plan's segs.json). Nothing of it is ever cropped here either.
  - Full frame for the hook, the pay-off and the sign-off.
  - While the sheet is down (plan['stage']) the whole picture is made smaller (S_STAGE) and sits at the bottom centre,
    so the sheet covers only the ceiling above the owner's head and everything they hold up stays in view. The page
    draws the frame round it. The move is a smoothstep over RAMP seconds; the page moves on the same curve.
The first version of this file pushed the picture 300 px down under the panel instead, and the render zoomed in on the
head. Together they put the bottle of groundnuts out of frame for most of the video. The owner: "You cut what I'm
actually trying to show. You cut it and everything just looks so weird."
The owner's phone records the front camera mirrored (the Chelsea crest and the Nike tick on the shirt read backwards),
so the picture is flipped left to right here: FLIP = True. Check a frame of the raw recording for text before keeping it.
Sound: the cleaned voice cut on the same frames, 8 ms fades at each edge."""
import json, subprocess, sys
K, CAM = sys.argv[1:3]
plan = json.load(open(f'{K}/plan.json'))
FPS, END, EC = plan['fps'], plan['end'], plan['endcard']
TOT = END + EC
S_STAGE, MARGIN, RAMP, FLIP, BG = 0.75, 24, 0.45, True, '0xDFE9FA'    # the same numbers are in stage.html
ss = lambda a: f'(clip((t-{a:.3f})/{RAMP},0,1)*clip((t-{a:.3f})/{RAMP},0,1)*(3-2*clip((t-{a:.3f})/{RAMP},0,1)))'
k = '+'.join(f'({ss(a)}-{ss(b)})' for a, b in plan['stage'])
sc = f'(1-{1 - S_STAGE:.4f}*({k}))'
FULLONLY = len(sys.argv) > 3 and sys.argv[3] == 'full'
fc = (f"[0:v]{'hflip,' if FLIP else ''}scale=w='2*trunc(540*{sc})':h='2*trunc(960*{sc})':eval=frame:flags=bicubic[fg];"
      f'color=c={BG}:s=1080x1920:r={FPS}[bg];'
      f"[bg][fg]overlay=x='(W-w)/2':y='(H-h)-{MARGIN}*({k})':eval=frame:shortest=1,format=yuv420p,tpad=stop_mode=clone:stop_duration={EC + 0.5}[v]")
if FULLONLY: fc = f"[0:v]{'hflip,' if FLIP else ''}format=yuv420p,tpad=stop_mode=clone:stop_duration={EC + 0.5}[v]"
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
