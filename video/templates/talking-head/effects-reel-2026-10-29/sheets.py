"""Sheets of a video at a given rate: python3 -I sheets.py <video> <out dir> <fps> <prefix> [t0 t1]"""
import sys, glob, os, subprocess
from PIL import Image, ImageDraw, ImageFont
V, D, FPS, PRE = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
t0, t1 = (float(sys.argv[5]), float(sys.argv[6])) if len(sys.argv) > 6 else (0, 1e9)
os.makedirs(D, exist_ok=True)
for f in glob.glob(f'{D}/x_*.png'): os.remove(f)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t0), '-i', V, '-t', str(t1 - t0), '-vf', f'fps={FPS},scale=324:576', f'{D}/x_%04d.png'], check=True)
fs = sorted(glob.glob(f'{D}/x_*.png')); C, Rr, G = 6, 4, 8
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
for k in range(0, len(fs), C * Rr):
    S = Image.new('RGB', (C * (324 + G), Rr * (576 + 24)), (30, 30, 30)); d = ImageDraw.Draw(S)
    for j, p in enumerate(fs[k:k + C * Rr]):
        x, y = (j % C) * (324 + G), (j // C) * (576 + 24)
        S.paste(Image.open(p), (x, y)); d.text((x + 4, y + 578), f'{t0 + (k + j) / FPS:.2f}s', fill='white', font=font)
    S.save(f'{D}/{PRE}-{k // (C * Rr):02d}.jpg', quality=82)
for f in fs: os.remove(f)
print(len(fs), 'frames')
