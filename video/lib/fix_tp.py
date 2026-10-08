"""Keep a finished video's true peak under -1 dBTP.

ffmpeg's built-in AAC encoder can overshoot badly on one frame of hard, clipped music: on 8 Oct a trap track mastered to
-5 dBFS came out at +4 dBTP when the encoder was fed float audio, but at -3.3 dBTP from 16-bit audio. The overshoot
depends on the frame, so this script measures the true peak, and while it is over the ceiling it re-encodes the audio
from the clean source with the next setting (16-bit input, a higher bitrate), copying the video.

  python3 video/lib/fix_tp.py <video.mp4> <clean audio source: wav or media> [bitrate_kbps] [ceiling_dbtp]
"""
import os
import re
import shutil
import subprocess
import sys

FF = shutil.which('ffmpeg') or 'ffmpeg'


def true_peak(path):
    err = subprocess.run([FF, '-nostats', '-hide_banner', '-i', path, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    m = re.findall(r'TPK:\s+(-?[\d.]+|-inf)\s+(-?[\d.]+|-inf)', err)
    if not m:
        return None
    return max(float(x) if x != '-inf' else -120.0 for x in m[-1])


def main():
    video, src = sys.argv[1], sys.argv[2]
    br = int(sys.argv[3]) if len(sys.argv) > 3 else 192
    ceiling = float(sys.argv[4]) if len(sys.argv) > 4 else -1.0
    tp = true_peak(video)
    print(f'True peak {tp} dBTP ({os.path.basename(video)})')
    if tp is None or tp <= ceiling:
        return
    tries = [('s16', br, ''), ('flt', br + 64, ''), ('s16', br + 64, ''), ('s16', br, 'alimiter=limit=0.5:level=0,')]
    tmp = video + '.tp.mp4'
    for fmt, kbps, pre in tries:
        af = f'{pre}aresample=48000,aformat=sample_fmts={fmt}:channel_layouts=stereo'
        subprocess.run([FF, '-y', '-loglevel', 'error', '-i', video, '-i', src, '-map', '0:v', '-map', '1:a:0', '-af', af,
                        '-c:v', 'copy', '-c:a', 'aac', '-b:a', f'{kbps}k', '-ar', '48000', '-ac', '2', '-shortest', '-movflags', '+faststart', tmp], check=True)
        t2 = true_peak(tmp)
        print(f'  re-encoded ({fmt}, {kbps}k{", limited" if pre else ""}): {t2} dBTP')
        if t2 is not None and t2 <= ceiling:
            os.replace(tmp, video)
            return
    os.replace(tmp, video)
    print('  ! still over the ceiling after every setting: check the mix')


if __name__ == '__main__':
    main()
