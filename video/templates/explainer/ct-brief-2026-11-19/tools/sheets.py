# Half-second sheets of the finished video: every 0.5 s, 6 x 4 per sheet, each frame 480x270 with its time.
#   python3 -I sheets.py <video> <out dir> [step]
import subprocess, sys, os
from PIL import Image, ImageDraw
v, out = sys.argv[1], sys.argv[2]; step = float(sys.argv[3]) if len(sys.argv) > 3 else .5
os.makedirs(out, exist_ok=True)
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', v], capture_output=True, text=True).stdout)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', v, '-vf', f'fps={1 / step},scale=480:270', f'{out}/f_%04d.png'], check=True)
fs = sorted(f for f in os.listdir(out) if f.startswith('f_'))
for k in range(0, len(fs), 24):
    sh = Image.new('RGB', (6 * 480, 4 * 270), 'white'); d = ImageDraw.Draw(sh)
    for j, f in enumerate(fs[k:k + 24]):
        x, y = (j % 6) * 480, (j // 6) * 270; sh.paste(Image.open(f'{out}/{f}'), (x, y))
        t = (k + j) * step; d.rectangle([x, y, x + 64, y + 18], fill='black'); d.text((x + 4, y + 3), f'{t:6.1f}', fill='white')
    sh.save(f'{out}/sheet_{k // 24:02d}.jpg', quality=82)
for f in fs: os.remove(f'{out}/{f}')
print(len(fs), 'frames,', (len(fs) + 23) // 24, 'sheets, video', round(dur, 3), 's')
