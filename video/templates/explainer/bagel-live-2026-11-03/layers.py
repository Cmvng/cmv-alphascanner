"""Split the owner's four Bagel pictures into animatable pieces over a clean background.
python3 -I layers.py <pics dir> <out img dir>
1. The background is a smooth gradient: fit a cubic surface per channel to the pixels that are not content
   (robust refits), and write bg.png.
2. Content = pixels more than 6 levels from the fitted background. Report its row bands on the left (text) and the
   phone's box on the right (its soft shadow included), so each piece can be cut as a rectangle of the real picture."""
import json, sys
import numpy as np
from PIL import Image
D, O = sys.argv[1:3]
NAMES = ['step1-live', 'step2-price', 'step3-sell', 'step4-limit']
H, W = 1080, 1920
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
u, v = xx / W, yy / H
A = np.stack([np.ones_like(u), u, v, u * u, v * v, u * v, u ** 3, v ** 3, u * u * v, u * v * v], -1).reshape(-1, 10)
def fit(img, mask):
    out = np.zeros_like(img)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A[mask.ravel()], img[..., c].ravel()[mask.ravel()], rcond=None)
        out[..., c] = (A @ coef).reshape(H, W)
    return out
info = {}
for n in NAMES:
    img = np.asarray(Image.open(f'{D}/{n}.png').convert('RGB')).astype(np.float32)
    mask = np.ones((H, W), bool)
    for _ in range(4):
        bg = fit(img, mask); res = np.abs(img - bg).max(-1); mask = res < 3.0
    print(n, 'bg fit: share of pixels used', round(float(mask.mean()), 3), 'median residual', round(float(np.median(np.abs(img - bg)[mask])), 2))
    Image.fromarray(np.clip(bg + .5, 0, 255).astype(np.uint8)).save(f'{O}/{n}-bg.png')
    content = np.abs(img - bg).max(-1) > 6
    # left text column bands
    left = content[:, :1100]
    rows = np.where(left.any(1))[0]
    bands, s, p = [], rows[0], rows[0]
    for y in rows[1:]:
        if y - p > 4: bands.append((int(s), int(p))); s = y
        p = y
    bands.append((int(s), int(p)))
    bb = []
    for y0, y1 in bands:
        xs = np.where(left[y0:y1 + 1].any(0))[0]
        bb.append([int(xs.min()), y0, int(xs.max()), y1])
    # right: the phone card and its shadow (anything off-background right of x 1000)
    right = np.abs(img - bg).max(-1)[:, 1000:] > 2.5
    ys, xs = np.where(right[140:, :]); ph = [int(xs.min()) + 1000, int(ys.min()) + 140, int(xs.max()) + 1000, int(ys.max()) + 140]
    hard = content[:, 1000:]; ys2, xs2 = np.where(hard[140:, :]); card = [int(xs2.min()) + 1000, int(ys2.min()) + 140, int(xs2.max()) + 1000, int(ys2.max()) + 140]
    info[n] = {'left': bb, 'phone_soft': ph, 'phone_card': card}
    print('  left bands:', bb); print('  phone card', card, 'with shadow', ph)
json.dump(info, open(f'{O}/layers.json', 'w'), indent=1)
