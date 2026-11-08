"""The EASY MODE soundtrack: "Electro Dreams" (Mixkit 190) from 10.742 s, so its drop (16.742 s) lands on PREDICT ON EASY
MODE at 6.0 s, plus Mixkit game sound effects on the jumps, unlocks, combo hits, notifications, chat pops and coins.
One gain to -14 LUFS and a limiter.   python3 -I mix.py <190.mp3> <sfx dir with <id>.mp3> <out dir>"""
import os, re, subprocess, sys
MUS, SFX, OUT = sys.argv[1:4]; TOT = 30.0; MIN = 10.742
L = [8, 10, 14, 16, 18]
ev = [(0.55, 2073, -4, 0), (2.5, 254, -6, 1.2), (3.05, 237, -2, 0), (3.5, 237, -2, 0), (4.0, 237, -2, 0), (5.0, 2069, -4, 0)]
ev += [(t - .5, 2043, 1, 0) for t in L] + [(t, 254, 0, .9) for t in L]                    # hop, then the level unlocks
ev += [(10.5, 2047, 3, 0), (11.0, 2047, 3, 0), (11.5, 2069, 4, 0)]                        # 1 HIT, 2 HITS, COMBO!
ev += [(14.25 + .5 * k, 265, 6, .6) for k in range(4)] + [(16.25 + .5 * k, 2073, 9, 0) for k in range(4)]
ev += [(19.5, 2069, 1, 0), (20.0, 2073, 8, 0), (22.0, 2059, 4, 0)] + [(22.3 + .2 * k, 2069, -3, 0) for k in range(5)] + [(24.0, 2062, 4, 0)]
inputs = ['-ss', str(MIN), '-t', str(TOT), '-i', MUS]; parts = ["[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume='if(lt(t,5.9),1,0.7)':eval=frame,afade=t=out:st=28.0:d=2.0[m]"]   # the bed eases 3 dB under the effects after the drop
for k, (t, i, g, trim) in enumerate(ev, 1):
    inputs += ['-i', os.path.join(SFX, f'{i}.mp3')]
    tr = f'atrim=0:{trim},afade=t=out:st={trim - .15:.2f}:d=0.15,' if trim else ''
    parts.append(f'[{k}:a]{tr}aformat=sample_rates=48000:channel_layouts=stereo,volume={g}dB,adelay={int(t * 1000)}|{int(t * 1000)}[s{k}]')
mixin = '[m]' + ''.join(f'[s{k}]' for k in range(1, len(ev) + 1))
parts.append(f'{mixin}amix=inputs={len(ev) + 1}:duration=first:normalize=0,atrim=0:{TOT}[o]')
pre = os.path.join(OUT, 'premix.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(parts), '-map', '[o]', '-ar', '48000', pre], check=True)
log = subprocess.run(['ffmpeg', '-nostdin', '-v', 'info', '-i', pre, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', log)[-1]); G = -14 - I
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', pre, '-af', f'volume={G:.2f}dB,aresample=192000,alimiter=limit=0.84:attack=2:release=60:level=false,aresample=48000', '-ar', '48000', os.path.join(OUT, 'mix.wav')], check=True)
log = subprocess.run(['ffmpeg', '-nostdin', '-v', 'info', '-i', os.path.join(OUT, 'mix.wav'), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
print(f'premix {I:.1f} LUFS, gain {G:+.1f} dB ->', ' '.join(re.findall(r'(I:\s+-?[\d.]+ LUFS|Peak:\s+-?[\d.]+ dBFS)', log)[-2:]), f'({len(ev)} effects)')
