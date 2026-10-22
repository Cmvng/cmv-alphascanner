# CUT 01 (redo) sound: the owner's template soundtrack (speech + its music) at full level, a few quiet
# transitions under it, a swell into the boom on the end card, then a low tail. → <out>/mix.wav
import sys, subprocess
P, X, A = sys.argv[1], sys.argv[2], sys.argv[3]
T = 36.8
E = [  # (file, start s, gain, extra filters)
 (f'{X}/1492.mp3', 5.28, 0.16, ''),                          # whoosh into the look (peak 6.36)
 (f'{X}/1492.mp3', 13.90, 0.16, ''),                         # into the second freeze (14.98)
 (f'{X}/1492.mp3', 25.64, 0.16, ''),                         # into "You asked for this life" (26.72)
 (f'{X}/1492.mp3', 29.92, 0.24, ''),                         # the session rushes past (31.0)
 (f'{X}/2908.mp3', 29.27, 0.30, 'areverse,atrim=0:3.95'),    # swell ending on the boom
 (f'{X}/2909.mp3', 32.43, 0.95, ''),                         # boom on the end card (peak 33.22)
 (f'{X}/2297.mp3', 33.0, 0.30, 'atrim=0:3.8,afade=t=in:d=0.3,afade=t=out:st=2.6:d=1.2'),  # low tail
]
args = ['ffmpeg', '-v', 'error', '-y', '-i', A] + sum([['-i', f] for f, *_ in E], [])
fc = [f"[0:a]aformat=sample_rates=44100:channel_layouts=stereo,afade=t=out:st=33.3:d=0.25,apad=whole_dur={T}[m]"]
for i, (f, st, g, ex) in enumerate(E, 1):
    fc.append(f'[{i}:a]aformat=sample_rates=44100:channel_layouts=stereo,' + (ex + ',' if ex else '') + f'volume={g},adelay={int(st * 1000)}|{int(st * 1000)},apad=whole_dur={T}[e{i}]')
fc.append('[m]' + ''.join(f'[e{i}]' for i in range(1, len(E) + 1)) + f'amix=inputs={len(E) + 1}:normalize=0:duration=first,atrim=0:{T},afade=t=out:st={T - 0.7}:d=0.7[mix]')
fc.append('[mix]alimiter=limit=0.84:attack=2:release=60:level=disabled[out]')
args += ['-filter_complex', ';'.join(fc), '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s16le', f'{P}/mix.wav']
r = subprocess.run(args, capture_output=True, text=True); print('mix', r.returncode, r.stderr[-600:])
