# Cut the owner's character out of its white background: the white region connected to the picture's edge is
# background; along the boundary the alpha comes from how white a pixel is, and its colour is un-mixed from white.
# The same alpha is used for the closed, half and open mouths (only the inside of the face differs).
#   python3 -I cutout.py <closed.png> <half.png> <open.png> <out prefix> <display height> [scale]
# Give one scale for every pose (0.585 for the CMV set: 599x899): a height per pose made the figure jump in size.
import sys, numpy as np
from PIL import Image
from scipy import ndimage
c, h, o, out, DH = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5])
A = np.asarray(Image.open(c).convert('RGB')).astype(np.float32)
mn = A.min(axis=2); near = mn > 236
lab, n = ndimage.label(near); edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(edge))
ring = ndimage.binary_dilation(bg, iterations=2) & ~bg
alpha = np.where(bg, 0.0, 1.0)
alpha[ring] = np.clip((252 - mn[ring]) / 40, 0, 1)
alpha = ndimage.gaussian_filter(alpha, 0.6) * (~bg | ring) ; alpha[~ndimage.binary_dilation(bg, iterations=3)] = 1.0
ys, xs = np.where(alpha > 0.02); top, bot = ys.min(), ys.max()
s = float(sys.argv[6]) if len(sys.argv) > 6 else DH / (bot - top)
for k, f in (('c', c), ('h', h), ('o', o)):
    X = np.asarray(Image.open(f).convert('RGB')).astype(np.float32)
    a = np.clip(alpha, 1e-3, 1)[..., None]; col = np.clip((X - (1 - a) * 255) / a, 0, 255)
    rgba = np.dstack([col, alpha * 255]).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA').resize((round(X.shape[1] * s), round(X.shape[0] * s)), Image.LANCZOS)
    im.save(f'{out}_{k}.png')
print(out, 'figure rows', top, bot, 'scale', round(s, 4), 'size', im.size, 'feet at', round(bot * s))
