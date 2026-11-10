"""The camera base and the sound for the 10 Nov Bagel edit.
  python3 -I build_av.py <work dir> <cam.mp4> <music.mp3>   ->  base.mp4, voice.wav, bed.wav, mix.wav

cam.mp4 is the cut camera picture, already in the studio look (video/lib/portrait_pro_long.py render, from the plan's
segs.json). Here it only goes soft behind a phone: a blurred copy faded in and out over it, like a change of focus.
Sound: the cleaned voice cut on the same frames, 8 ms fades at each edge; a quiet bed that ducks under the voice."""
import json, os, subprocess, sys
K, CAM, MUS = sys.argv[1:4]
plan = json.load(open(f'{K}/plan.json'))
FPS, END, EC = plan['fps'], plan['end'], plan['endcard']
TOT = END + EC
DROP = 22.338                                     # "Sonor 01" (Mixkit 558): where the track opens up
R = 0.32                                          # seconds for the focus to change
soft = plan['soft']; k = len(soft)
# one blurred copy of the whole cut (blurred small, then scaled back up), split once per window and faded in and out
# over the sharp picture. Every copy runs the full length: a copy that starts late makes ffmpeg hold the sharp frames
# in memory until it arrives (the first build died that way). The last frame is held under the end card.
fc = [f'[0:v]split=2[sh][bs]',
      f'[bs]scale=270:480:flags=bilinear,gblur=sigma=6,scale=1080:1920:flags=bicubic,eq=brightness=-0.03,format=yuva420p,split={k}' + ''.join(f'[s{j}]' for j in range(k))]
last = 'sh'
for j, (a, b) in enumerate(soft):
    fc.append(f'[s{j}]fade=t=in:st={a:.3f}:d={R}:alpha=1,fade=t=out:st={b:.3f}:d={R}:alpha=1[o{j}]')
    fc.append(f'[{last}][o{j}]overlay=eof_action=pass[x{j}]'); last = f'x{j}'
fc.append(f'[{last}]format=yuv420p,tpad=stop_mode=clone:stop_duration={EC + 0.5}[v]')
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', CAM, '-filter_complex', ';'.join(fc), '-map', '[v]', '-c:v', 'libx264',
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

off = DROP - (plan['ev']['ph1_up'] + 0.12)        # the track opens up as the first phone rises
fm = (f'[0:a]atrim={off:.3f}:{off + TOT:.3f},asetpts=PTS-STARTPTS,aresample=48000,volume=0.115,'
      f'afade=t=in:d=0.6,afade=t=out:st={TOT - 2.4:.3f}:d=2.4[mu]')
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', MUS, '-filter_complex', fm, '-map', '[mu]', '-ar', '48000', '-ac', '2', f'{K}/bed.wav'], check=True)
mix = ('[0:a]asplit=2[vk][vm];[1:a][vk]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[md];'
       '[vm][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[out]')
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', f'{K}/voice.wav', '-i', f'{K}/bed.wav', '-filter_complex', mix, '-map', '[out]',
                '-ar', '48000', '-ac', '2', f'{K}/mix.wav'], check=True)
# one-pass loudnorm lands a little under the target on speech with pauses: measure, then trim the level to -14 LUFS
import re
m = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-nostats', '-i', f'{K}/mix.wav', '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
I = float(re.search(r'"input_i"\s*:\s*"(-?[\d.]+)"', m).group(1)); TP = float(re.search(r'"input_tp"\s*:\s*"(-?[\d.]+)"', m).group(1))
g = min(-14.0 - I, -1.5 - TP)
os.replace(f'{K}/mix.wav', f'{K}/mix_pre.wav')
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', f'{K}/mix_pre.wav', '-af', f'volume={g:.2f}dB', '-ar', '48000', '-ac', '2', f'{K}/mix.wav'], check=True)
os.remove(f'{K}/mix_pre.wav')
print(f'mix: {I:.1f} LUFS, peak {TP:.1f} dBTP -> gain {g:+.2f} dB')
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', f'{K}/voice.wav', '-ar', '16000', '-ac', '1', f'{K}/voice16.wav'], check=True)
print(f'music from {off:.2f} s, opening up at {plan["ev"]["ph1_up"] + 0.12:.2f} s; total {TOT:.2f} s')
