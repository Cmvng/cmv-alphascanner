"""Cut the owner's four pictures into pieces with alpha, over the clean backgrounds that layers.py wrote.
python3 -I cut_pieces.py <pics dir> <page img dir>
Each piece is a rectangle of the real picture. Its alpha is where it differs from the background, and the background
is un-mixed out of anti-aliased edges, so a piece sits cleanly on any part of the gradient while it moves. At rest the
rebuilt frame matches the original picture to within 2 to 3 levels (checked below)."""
import json, sys
import numpy as np
from PIL import Image
D, O = sys.argv[1:3]
L = json.load(open(f'{O}/layers.json'))
# the pieces of each picture (x0, y0, x1, y1 in picture px); chips split by hand where two sit on one row
P = {
 'step1-live': {'h1': [122, 384, 738, 453], 'h2': [120, 462, 414, 538], 's1': [122, 573, 719, 607], 's2': [122, 622, 660, 656], 's3': [120, 670, 582, 704], 'phone': L['step1-live']['phone_soft']},
 'step2-price': {'h1': [122, 353, 642, 426], 'h2': [122, 435, 849, 511], 's1': [122, 546, 741, 573], 's2': [122, 597, 835, 629], 'c1': [120, 675, 407, 736], 'c2': [430, 675, 640, 736], 'phone': L['step2-price']['phone_soft']},
 'step3-sell': {'h1': [120, 380, 930, 453], 'h2': [120, 465, 397, 538], 's1': [120, 573, 715, 607], 's2': [121, 622, 703, 656], 's3': [122, 670, 682, 704], 'phone': L['step3-sell']['phone_soft']},
 'step4-limit': {'h1': [122, 360, 674, 426], 'h2': [124, 435, 683, 511], 's1': [121, 548, 781, 580], 's2': [122, 595, 822, 629], 'c1': [120, 675, 447, 736], 'c2': [470, 675, 800, 736], 'phone': L['step4-limit']['phone_soft']},
}
out = {}
for n, els in P.items():
    a = np.asarray(Image.open(f'{D}/{n}.png').convert('RGB'))
    bg = np.asarray(Image.open(f'{O}/{n}-bg.png').convert('RGB')).astype(np.float32)
    els = dict(els, label=L[n]['label'])
    out[n] = {}
    for k, (x0, y0, x1, y1) in els.items():
        m = 14 if k == 'phone' else 8
        x0, y0, x1, y1 = max(0, x0 - m), max(0, y0 - m), min(1919, x1 + m), min(1079, y1 + m)
        crop = a[y0:y1 + 1, x0:x1 + 1].astype(np.float32)
        h, w = crop.shape[:2]
        d = np.abs(crop - bg[y0:y1 + 1, x0:x1 + 1]).max(-1)
        fy = np.minimum(np.arange(h), np.arange(h)[::-1])[:, None]; fx = np.minimum(np.arange(w), np.arange(w)[::-1])[None, :]
        edge = np.clip(np.minimum(fy, fx) / (m * .6), 0, 1)
        if k == 'phone':   # the phone keeps its pixels; its soft shadow fades out at the rectangle's edge
            alpha = np.maximum(np.clip(d / 3.0, 0, 1), np.where(edge >= 1, 1.0, 0.0)) * edge
            fg = crop
        else:              # text and chips: alpha from the difference, background un-mixed from the edges
            alpha = np.clip((d - 1.5) / 4.0, 0, 1)
            safe = np.maximum(alpha, 1e-3)[..., None]
            fg = np.clip((crop - (1 - safe) * bg[y0:y1 + 1, x0:x1 + 1]) / safe, 0, 255)
        Image.fromarray(np.dstack([fg, alpha * 255]).round().astype(np.uint8), 'RGBA').save(f'{O}/{n}-{k}.png')
        out[n][k] = [x0, y0, x1 - x0 + 1, y1 - y0 + 1]
json.dump(out, open(f'{O}/pieces.json', 'w'), indent=1)
# the logo, from the first picture, for every scene; the price card, for the cover
Image.open(f'{D}/step1-live.png').convert('RGB').crop((88, 56, 272, 128)).save(f'{O}/logo-crop.png')
Image.open(f'{D}/step2-price.png').convert('RGB').crop((1301, 144, 1799, 936)).save(f'{O}/step2-phone-card.png')
# check: background + logo + pieces must rebuild each picture
for n, els in out.items():
    orig = np.asarray(Image.open(f'{D}/{n}.png').convert('RGB')).astype(np.float32)
    c = Image.open(f'{O}/{n}-bg.png').convert('RGBA'); c.alpha_composite(Image.open(f'{O}/logo-crop.png').convert('RGBA'), (88, 56))
    for k, (x, y, w, h) in els.items(): c.alpha_composite(Image.open(f'{O}/{n}-{k}.png'), (x, y))
    d = np.abs(np.asarray(c.convert('RGB')).astype(np.float32) - orig).max(-1)
    print(n, 'rebuilt vs original: mean', round(float(d.mean()), 2), ' max', int(d.max()), ' pixels > 12:', int((d > 12).sum()))
