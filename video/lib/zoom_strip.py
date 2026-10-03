# Frames of a source video between two times with a 10% grid and the time, to choose zoom keyframes ("zk").
#   python3 zoom_strip.py <start> <end> <frames> <out.png> [source.mp4]
import subprocess, sys, io
from PIL import Image, ImageDraw, ImageFont
a, b, n, out = float(sys.argv[1]), float(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
ts = [a + (b - a) * i / max(1, n - 1) for i in range(n)]
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 44)
except Exception: font = ImageFont.load_default()
W, H = 324, 723; sheet = Image.new('RGB', (W * n, H), 'black')
for i, t in enumerate(ts):
    png = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.2f}', '-i', (sys.argv[5] if len(sys.argv) > 5 else 'raw.mp4'), '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True, check=True).stdout
    im = Image.open(io.BytesIO(png)).convert('RGB'); d = ImageDraw.Draw(im)
    for g in range(1, 10):
        d.line([(0, 241 * g), (1080, 241 * g)], fill=(0, 220, 255), width=3); d.line([(108 * g, 0), (108 * g, 2410)], fill=(0, 220, 255), width=3)
        d.text((6, 241 * g + 4), f'{g/10:.1f}', fill=(255, 230, 0), font=font)
    d.rectangle([640, 10, 1075, 90], fill=(200, 0, 0)); d.text((660, 22), f'{t:.1f}s', fill='white', font=font)
    sheet.paste(im.resize((W, H)), (i * W, 0))
sheet.save(out)
