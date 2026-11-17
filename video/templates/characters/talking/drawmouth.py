# Draw an open (or half-open) mouth on one of the owner's cartoon poses, in place: the lips are found between the
# moustache and the beard, the lower lip and beard drop a little (a jaw), and an opening with top teeth is painted in
# the cartoon's own colours with a soft dark outline (4x supersampled). Everything else stays pixel for pixel.
#   python3 -I drawmouth.py <pose.png> <cx> <out_prefix> <mx> <my> <lx> <rx>   -> <out>_half.png, <out>_open.png, <out>_mouth.json
# mx, my: the centre of the mouth and the row where the lips meet; lx, rx: the corners (per pose in poses.tsv,
# measured from row-brightness profiles through the mouth: an automatic search picked the cheek, then the moustache).
import sys, json, numpy as np
from PIL import Image, ImageDraw, ImageFilter
src, cx, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]   # then: mx my lx rx
im = Image.open(src).convert('RGB'); A = np.asarray(im).astype(np.float32)
# --- the lips, measured per pose: centre x, line y, left and right corners
mx, my0, lx, rx = [float(v) for v in sys.argv[4:8]]
L = A.mean(axis=2); cols = slice(int(mx - 15), int(mx + 15))
my = int(my0); ty, by = my - 6, my + 9   # the line where the lips meet, measured per pose (row brightness through the mouth)
W = (rx - lx) * 0.62
info = dict(lips=[int(lx), int(ty), int(rx), int(by)], line_y=int(my), cx=float(mx), width=float(W))
def make(D):
    a = A.copy()
    # jaw: pixels below the line drop by up to 0.65 D, bell-shaped across the mouth, fading out 46 px down
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]].astype(np.float32)
    wx = np.exp(-((xx - mx) / (W * 0.75)) ** 2); fy = np.clip(1 - (yy - my) / 46, 0, 1) * (yy >= my)
    dy = 0.65 * D * wx * fy
    sy = np.clip(yy - dy, 0, a.shape[0] - 1); y0i = np.floor(sy).astype(int); t = (sy - y0i)[..., None]; y1i = np.clip(y0i + 1, 0, a.shape[0] - 1)
    xi = xx.astype(int); a = a[y0i, xi] * (1 - t) + a[y1i, xi] * t
    # opening: drawn 4x then reduced, over a box around the mouth
    S4 = 4; bx0, by0 = int(mx - W / 2 - 8), int(my - 6); bw, bh = int(W + 16), int(D + 14)
    layer = Image.new('RGBA', (bw * S4, bh * S4), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    def P(x, y): return ((x - bx0) * S4, (y - by0) * S4)
    N = 28; top = []; bot = []
    for i in range(N + 1):
        u = i / N; x = mx - W / 2 + W * u; s = np.sin(np.pi * u)
        top.append(P(x, my - 1.2 * (1 - s) * 1.2 + 0.6))          # nearly straight, corners a touch up (the smile)
        bot.append(P(x, my + D * (s ** 0.8)))
    poly = top + bot[::-1]
    d.polygon(poly, fill=(43, 20, 16, 255))
    # tongue: a low ellipse at the bottom
    d.ellipse([P(mx - W * 0.28, my + D * 0.55), P(mx + W * 0.28, my + D * 1.15)], fill=(132, 60, 52, 255))
    # top teeth: a band under the upper lip, clipped to the opening
    teeth = Image.new('RGBA', layer.size, (0, 0, 0, 0)); dt = ImageDraw.Draw(teeth)
    dt.rectangle([P(mx - W * 0.36, my - 2), P(mx + W * 0.36, my + max(2.5, D * 0.34))], fill=(244, 239, 231, 255))
    mask = Image.new('L', layer.size, 0); ImageDraw.Draw(mask).polygon(poly, fill=255)
    tongue_clip = Image.composite(layer, Image.new('RGBA', layer.size, (0, 0, 0, 0)), mask)
    teeth_clip = Image.composite(teeth, Image.new('RGBA', layer.size, (0, 0, 0, 0)), mask)
    lay = Image.alpha_composite(tongue_clip, teeth_clip)
    # outline
    od = ImageDraw.Draw(lay); od.line(poly + [poly[0]], fill=(26, 13, 9, 255), width=int(2.2 * S4), joint='curve')
    lay = lay.resize((bw, bh), Image.LANCZOS)
    base = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert('RGBA'); base.alpha_composite(lay, (bx0, by0))
    return base.convert('RGB')
H = max(6, round(W * 0.10)); O = max(12, round(W * 0.21))
make(H).save(out + '_half.png'); make(O).save(out + '_open.png')
info.update(half=H, open=O); json.dump(info, open(out + '_mouth.json', 'w')); print(info)
