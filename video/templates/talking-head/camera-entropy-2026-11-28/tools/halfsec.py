"""Every half second of the finished file, 40 frames a sheet (8 x 5, 200x356 each, time stamped).
  python3 -I halfsec.py <video.mp4> <out dir>"""
import subprocess, sys, os
from PIL import Image, ImageDraw
V, O = sys.argv[1:3]; os.makedirs(O, exist_ok=True)
w, h = 200, 356
raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', V, '-vf', f'fps=2,scale={w}:{h}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
n = len(raw) // (w * h * 3)
for s in range(0, n, 40):
    sheet = Image.new('RGB', (8 * w, 5 * h), 'white'); d = ImageDraw.Draw(sheet)
    for k in range(40):
        i = s + k
        if i >= n: break
        im = Image.frombytes('RGB', (w, h), raw[i * w * h * 3:(i + 1) * w * h * 3])
        x, y = (k % 8) * w, (k // 8) * h; sheet.paste(im, (x, y)); d.rectangle((x, y, x + 46, y + 16), fill='black'); d.text((x + 3, y + 2), f'{i / 2:.1f}', fill='yellow')
    sheet.save(f'{O}/half-{s // 40:02d}.jpg', quality=82)
print(n, 'frames,', (n + 39) // 40, 'sheets')
