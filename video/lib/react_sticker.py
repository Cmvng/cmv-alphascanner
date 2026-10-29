"""Turn a cut-out reaction clip (react_matte.py's rgba.mkv) into a die-cut sticker: a bust shape (the shoulders trimmed by
a smooth curve, so no straight frame-edge cut), a white border, no shadow (the page adds it).
Writes <out>/f_0001.png… (RGBA, 30 fps), <out>/peak.png and <out>/meta.json.
  python3 -I video/lib/react_sticker.py <rgba.mkv> <out dir> <width px> [in s] [out s] [peak s] [tall]
"tall" is for raised arms (hands on the head): one tall curve holds the hands, the head and the shoulders, instead of the
bust curve plus an uncut band at the top, which would cut straight across the forearms."""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter

SRC, OUT, SW = sys.argv[1], sys.argv[2], int(sys.argv[3])
T_IN = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0
T_OUT = float(sys.argv[5]) if len(sys.argv) > 5 else 99.0
T_PEAK = float(sys.argv[6]) if len(sys.argv) > 6 else None
TALL = len(sys.argv) > 7 and sys.argv[7] == 'tall'
W, H, FPS = 1080, 1920, 30
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.startswith('f_') and f.endswith('.png'):
        os.remove(os.path.join(OUT, f))

dec = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-i', SRC, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], stdout=subprocess.PIPE)
frames = []
while True:
    b = dec.stdout.read(W * H * 4)
    if len(b) < W * H * 4:
        break
    frames.append(np.frombuffer(b, np.uint8).reshape(H, W, 4))
dec.wait()
i0, i1 = int(T_IN * FPS), min(len(frames), int(T_OUT * FPS))
frames = frames[i0:i1]

# where the person is: the highest point of the silhouette over the kept frames, and the centre of the head
A = np.stack([f[:, :, 3] for f in frames]).astype(np.float32) / 255
rows = np.where(A.max(axis=(0, 2)) > .5)[0]
top = int(rows.min())
head = A[:, top:top + 500, :].mean(axis=(0, 1))
cx = int((head * np.arange(W)).sum() / max(head.sum(), 1e-6))
CW, CH = 980, (1440 if TALL else 1260)                      # crop: head and upper shoulders (and raised arms)
x0 = int(np.clip(cx - CW // 2, 0, W - CW)); y0 = int(np.clip(top - 70, 0, H - CH))
# the bust: an ellipse that holds the head and tapers across the shoulders, so the bottom is a smooth curve
yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float32)
ecx, ecy, rx, ry = cx - x0, (top - y0) + 640, 475, 580       # closes above the crop's bottom: a rounded base
if TALL:
    ecy, rx, ry = (top - y0) + 690, 476, 700
bust = ((xx - ecx) / rx) ** 2 + ((yy - ecy) / ry) ** 2
bust = np.clip((1.0 - bust) * 40, 0, 1)                    # crisp but anti-aliased edge
if not TALL:
    bust[: max(0, ecy - 200)] = 1                          # never clip the head
S = SW / CW
SH = int(round(CH * S))
B = 10                                                     # white border, px at the sticker's size
PAD = B + 4
peak_i = None if T_PEAK is None else int((T_PEAK - T_IN) * FPS)
for n, f in enumerate(frames):
    c = f[y0:y0 + CH, x0:x0 + CW].astype(np.float32)
    a = c[:, :, 3] / 255 * bust
    im = Image.fromarray(np.dstack([c[:, :, :3], a * 255]).astype(np.uint8), 'RGBA').resize((SW, SH), Image.LANCZOS)
    canvas = Image.new('RGBA', (SW + 2 * PAD, SH + 2 * PAD), (0, 0, 0, 0)); canvas.paste(im, (PAD, PAD))
    al = canvas.getchannel('A')
    grown = al.filter(ImageFilter.GaussianBlur(B * .55))
    ring = np.clip((np.asarray(grown, np.float32) / 255 - .06) * 9, 0, 1)
    ring = np.maximum(ring, np.asarray(al, np.float32) / 255)
    white = Image.new('RGBA', canvas.size, (255, 255, 255, 0)); white.putalpha(Image.fromarray((ring * 255).astype(np.uint8)))
    white.alpha_composite(canvas)
    white.save(os.path.join(OUT, f'f_{n + 1:04d}.png'), optimize=False, compress_level=3)
    if peak_i is not None and n == peak_i:
        white.save(os.path.join(OUT, 'peak.png'))
if peak_i is None:
    Image.open(os.path.join(OUT, f'f_{len(frames) // 2:04d}.png')).save(os.path.join(OUT, 'peak.png'))
json.dump({'frames': len(frames), 'fps': FPS, 'w': SW + 2 * PAD, 'h': SH + 2 * PAD, 'src': os.path.basename(os.path.dirname(SRC)),
           'in': T_IN, 'out': T_IN + len(frames) / FPS, 'crop': [x0, y0, CW, CH]}, open(os.path.join(OUT, 'meta.json'), 'w'))
print(OUT, len(frames), 'frames', SW + 2 * PAD, 'x', SH + 2 * PAD)
