"""Contact sheet of stills: python3 -I sheet.py <dir> <out.jpg> [cols] [tile_w]"""
import sys, glob, os
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4; tw = int(sys.argv[4]) if len(sys.argv) > 4 else 480
fs = sorted(glob.glob(os.path.join(d, '*.png')) + glob.glob(os.path.join(d, '*.jpg')), key=lambda f: float(os.path.basename(f).split('_')[-1].rsplit('.', 1)[0]))
ims = [Image.open(f).convert('RGB') for f in fs]
th = int(tw * ims[0].height / ims[0].width)
S = Image.new('RGB', (cols * tw, ((len(ims) + cols - 1) // cols) * (th + 22)), 'white')
for i, (f, im) in enumerate(zip(fs, ims)):
    x, y = (i % cols) * tw, (i // cols) * (th + 22)
    S.paste(im.resize((tw, th)), (x, y + 22)); ImageDraw.Draw(S).text((x + 4, y + 4), os.path.basename(f), fill=(200, 0, 0))
S.save(out, quality=85); print(out, len(ims))
