"""Review of the finished edit (from the Kane edit), run on every video before it is sent:
  1. review-frames.jpg: a summary frame at every caption and graphic beat (for the post kit).
  2. review-full-NN.jpg: EVERY half second, 324x576, 20 frames a sheet. Look at every sheet: the summary alone missed
     a wrong font, unreadable screens, a note that came and went in 0.3 s and a jumping camera (Primus v2, 27 Oct).
  3. final16.wav: the sound, for the hear-back (faster-whisper on it; every line intact, no clipped word).
  python3 -I review.py <work dir> <video.mp4>"""
import json, subprocess, sys, glob, os
from PIL import Image, ImageDraw
K, VID = sys.argv[1:3]
plan = json.load(open(f'{K}/plan.json'))
TOT = plan['end'] + plan['endcard']
ts = sorted({round(c['o0'] + 0.5, 2) for c in plan['caps']} | {round(v + 0.6, 2) for v in plan['ev'].values()} | {plan['end'] + 1.5})
ts = [t for t in ts if t < TOT - 0.1][::2][:48]
W, H, C = 216, 384, 8
rows = (len(ts) + C - 1) // C
sh = Image.new('RGB', (W * C, (H + 22) * rows), (30, 30, 30)); d = ImageDraw.Draw(sh)
for i, t in enumerate(ts):
    f = f'{K}/rv_{i}.png'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', VID, '-frames:v', '1', '-vf', f'scale={W}:{H}', f], check=True)
    x, y = (i % C) * W, (i // C) * (H + 22)
    sh.paste(Image.open(f), (x, y)); d.text((x + 4, y + H + 4), f'{t:.1f}s', fill='white')
    os.remove(f)
sh.save(f'{K}/review-frames.jpg', quality=88)
# every half second, at a size where text, fonts and overlaps can be read
for f in glob.glob(f'{K}/review-full-*.jpg') + glob.glob(f'{K}/rf_*.png'):
    os.remove(f)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', VID, '-vf', 'fps=2,scale=324:576', f'{K}/rf_%04d.png'], check=True)
fs = sorted(glob.glob(f'{K}/rf_*.png'))
FW, FH, FC, FR = 324, 576, 5, 4
for k in range(0, len(fs), FC * FR):
    G = 10                                              # a gap, so words in two neighbouring frames never read as one
    s2 = Image.new('RGB', ((FW + G) * FC, (FH + 20) * FR), (30, 30, 30)); d2 = ImageDraw.Draw(s2)
    for j, f in enumerate(fs[k:k + FC * FR]):
        x, y = (j % FC) * (FW + G), (j // FC) * (FH + 20)
        s2.paste(Image.open(f), (x, y)); d2.text((x + 4, y + FH + 3), f'{(k + j) / 2:.1f}s', fill='white')
    s2.save(f'{K}/review-full-{k // (FC * FR):02d}.jpg', quality=82)
for f in fs:
    os.remove(f)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', VID, '-vn', '-ac', '1', '-ar', '16000', f'{K}/final16.wav'], check=True)
print(len(ts), 'summary frames;', (len(fs) + FC * FR - 1) // (FC * FR), 'full sheets (every 0.5 s): look at every one')
