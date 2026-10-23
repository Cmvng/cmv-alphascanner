"""Review of the finished Kane edit: a frame sheet at every caption and graphic beat, and the sound heard back."""
import json, subprocess, sys
from PIL import Image, ImageDraw
K, VID = sys.argv[1:3]
plan = json.load(open(f'{K}/plan.json'))
ts = sorted({round(c['o0'] + 0.5, 2) for c in plan['caps']} | {round(v + 0.6, 2) for v in plan['ev'].values()} | {plan['end'] + 1.5})
ts = [t for t in ts if t < plan['end'] + plan['endcard'] - 0.1][::2][:48]
W, H, C = 216, 384, 8
rows = (len(ts) + C - 1) // C
sh = Image.new('RGB', (W * C, (H + 22) * rows), (30, 30, 30)); d = ImageDraw.Draw(sh)
for i, t in enumerate(ts):
    f = f'{K}/rv_{i}.png'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', VID, '-frames:v', '1', '-vf', f'scale={W}:{H}', f], check=True)
    x, y = (i % C) * W, (i // C) * (H + 22)
    sh.paste(Image.open(f), (x, y)); d.text((x + 4, y + H + 4), f'{t:.1f}s', fill='white')
sh.save(f'{K}/review-frames.jpg', quality=88)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', VID, '-vn', '-ac', '1', '-ar', '16000', f'{K}/final16.wav'], check=True)
print(len(ts), 'frames')
