"""Sheets of a 16:9 video: python3 -I sheets16.py <video> <out dir> <fps> <prefix> [t0 t1]"""
import sys, glob, os, subprocess
from PIL import Image, ImageDraw, ImageFont
V, D, FPS, PRE = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
t0, t1 = (float(sys.argv[5]), float(sys.argv[6])) if len(sys.argv) > 6 else (0, 1e9)
os.makedirs(D, exist_ok=True)
for f in glob.glob(f'{D}/x_*.png'): os.remove(f)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t0), '-i', V, '-t', str(t1 - t0), '-vf', f'fps={FPS},scale=480:270', f'{D}/x_%04d.png'], check=True)
fs = sorted(glob.glob(f'{D}/x_*.png')); C, R, G = 4, 6, 6
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
for k in range(0, len(fs), C * R):
    S = Image.new('RGB', (C * (480 + G), R * (270 + 22)), (30, 30, 30)); d = ImageDraw.Draw(S)
    for j, p in enumerate(fs[k:k + C * R]):
        x, y = (j % C) * (480 + G), (j // C) * (270 + 22)
        S.paste(Image.open(p), (x, y)); d.text((x + 4, y + 272), f'{t0 + (k + j) / FPS:.2f}s', fill='white', font=font)
    S.save(f'{D}/{PRE}-{k // (C * R):02d}.jpg', quality=82)
for f in fs: os.remove(f)
print(len(fs), 'frames')
