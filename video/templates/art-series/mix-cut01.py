# mixes CUT 01's sound: the Thunder track (Mixkit 318) plus Mixkit sound effects, gain + limiter to about -14 LUFS
# python3 mix-cut01.py <out dir> video/.cache/sfx video/.cache/music/318.mp3  → <out dir>/mix.wav
import sys, subprocess
P, X, M = sys.argv[1], sys.argv[2], sys.argv[3]
T = 27.6
E = [  # (file, start s, gain, extra filters)
 (f'{X}/2297.mp3', 0.0, 0.28, 'aloop=loop=2:size=310000,atrim=0:20,afade=t=out:st=18:d=2'),   # low rumble under the build
 (f'{X}/497.mp3', 0.0, 0.45, 'aloop=loop=1:size=260000,atrim=0:12,afade=t=out:st=9.5:d=2.5'),  # heartbeat
 (f'{X}/1143.mp3', 0.0, 0.55, ''),                                                           # the cracks land at 0.55
 (f'{X}/2299.mp3', 6.09, 0.32, ''), (f'{X}/2299.mp3', 10.59, 0.36, ''), (f'{X}/2299.mp3', 16.09, 0.4, ''),
 (f'{X}/1492.mp3', 1.32, 0.28, ''), (f'{X}/1492.mp3', 6.22, 0.28, ''), (f'{X}/1492.mp3', 16.12, 0.32, ''),
 (f'{X}/2951.mp3', 11.80, 0.35, ''), (f'{X}/2951.mp3', 21.47, 0.4, ''), (f'{X}/2951.mp3', 22.73, 0.4, ''),
 (f'{X}/3194.mp3', 2.7, 0.3, ''), (f'{X}/3194.mp3', 4.5, 0.25, ''), (f'{X}/3194.mp3', 8.2, 0.25, ''), (f'{X}/3194.mp3', 12.6, 0.3, ''), (f'{X}/3194.mp3', 14.2, 0.3, ''),
 (f'{X}/2908.mp3', 16.05, 0.55, 'areverse,atrim=0:3.95'),   # swell into the drop, ends at 20.0
 (f'{X}/2908.mp3', 19.99, 1.0, ''),                         # the drop
 (f'{X}/2299.mp3', 20.77, 0.7, ''), (f'{X}/2299.mp3', 21.41, 0.7, ''), (f'{X}/2299.mp3', 22.04, 0.7, ''), (f'{X}/2299.mp3', 22.67, 0.7, ''), (f'{X}/2299.mp3', 23.30, 0.7, ''),
 (f'{X}/2909.mp3', 23.21, 0.9, ''),                         # end card boom, peak at 24.0
]
args = ['ffmpeg', '-v', 'error', '-y', '-i', M] + sum([['-i', f] for f, *_ in E], [])
fc = [f"[0:a]atrim=0:{T},asetpts=PTS-STARTPTS,volume=enable='between(t,19.97,20.2)':volume=0.02,afade=t=out:st=26.0:d=1.6,aformat=sample_rates=44100:channel_layouts=stereo[m]"]
for i, (f, st, g, ex) in enumerate(E, 1):
  fc.append(f'[{i}:a]aformat=sample_rates=44100:channel_layouts=stereo,' + (ex + ',' if ex else '') + f'volume={g},adelay={int(st * 1000)}|{int(st * 1000)},apad=whole_dur={T}[e{i}]')
fc.append('[m]' + ''.join(f'[e{i}]' for i in range(1, len(E) + 1)) + f'amix=inputs={len(E) + 1}:normalize=0:duration=first,atrim=0:{T}[mix]')
fc.append('[mix]volume=0.60dB,alimiter=limit=0.82:attack=2:release=60:level=disabled[out]')
args += ['-filter_complex', ';'.join(fc), '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s16le', f'{P}/mix.wav']
r = subprocess.run(args, capture_output=True, text=True); print('mix', r.returncode, r.stderr[-600:])
