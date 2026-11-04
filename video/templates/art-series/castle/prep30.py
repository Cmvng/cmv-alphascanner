"""Images for the 30-second cut (4 Nov, after the owner's notes).
python3 -I prep30.py <uploads dir> <splash png> <page img dir>

1. The drawing, cleaned: the phone photo's grey paper and lifted blacks are set to the owner's own framed mockups
   (paper about 236, charcoal about 30, neutral white). Levels and white balance only: nothing is drawn or sharpened.
2. The owner's frame mockups as JPEGs (one per scene; two uploads were the same image). On the laptop one, the header
   shows a spade logo that isn't Gamdom's, so it is replaced with Gamdom's real logo taken from their own site.
3. Gamdom's real logo (castle mark and wordmark) with alpha, from their loading screen captured at 2.5x."""
import sys
import numpy as np
from PIL import Image
U, SPL, O = sys.argv[1:4]

def levels(src, dst, black, white, to_black=30, to_white=236, wb=True):
    a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    y = a @ np.array([.2126, .7152, .0722], np.float32)
    if wb:   # neutralise the paper: scale each channel so the brightest 10% are grey
        paper = a[y > np.percentile(y, 90)].mean(0); a = a * (paper.mean() / paper)
    k = (to_white - to_black) / (white - black)
    out = np.clip((a - black) * k + to_black, 0, 255)
    Image.fromarray(out.round().astype(np.uint8)).save(dst, quality=95)
    yo = out @ np.array([.2126, .7152, .0722], np.float32)
    print(dst.split('/')[-1], 'stretch', round(k, 3), 'luma pct 1/50/99:', [round(float(np.percentile(yo, q)), 1) for q in (1, 50, 99)])

levels(f'{O}/p_final.jpg', f'{O}/p_final_clean.jpg', 40, 212)
levels(f'{O}/p_letters.jpg', f'{O}/p_letters_clean.jpg', 44, 245, 28, 250, wb=False)

# the real logo with alpha (bright pixels over Gamdom's dark loading screen)
s = np.asarray(Image.open(SPL).convert('RGB')).astype(np.float32)
x0, x1, y0, y1 = 2133 - 6, 2664 + 7, 1299 - 6, 1400 + 7
c = s[y0:y1, x0:x1]; bg = np.array([7, 11, 16], np.float32)
al = np.clip((c.max(-1) - 18) / 70, 0, 1)
fg = np.clip((c - (1 - al[..., None]) * bg) / np.maximum(al[..., None], 1e-3), 0, 255)
logo = Image.fromarray(np.dstack([fg, al * 255]).round().astype(np.uint8), 'RGBA')
logo.save(f'{O}/glogo.png'); print('glogo', logo.size)

mocks = {'m_living': 'e05571af', 'm_gold': 'a0e2b181', 'm_concrete': '5b65da96', 'm_laptop': 'e8ea1052', 'm_gallery': '4a396c42', 'm_casino': '9d68c17a'}
for name, uid in mocks.items():
    im = Image.open(f'{U}/{uid}-image.png').convert('RGB')
    if name == 'm_laptop':   # cover the spade + generic wordmark, then place Gamdom's real logo at the same height
        a = np.asarray(im).astype(np.float32)
        X0, X1, Y0, Y1 = 925, 1575, 240, 356
        left = a[Y0:Y1, X0 - 30:X0 - 6].mean(1); right = a[Y0:Y1, X1 + 6:X1 + 30].mean(1)
        u = np.linspace(0, 1, X1 - X0)[None, :, None]
        a[Y0:Y1, X0:X1] = left[:, None, :] * (1 - u) + right[:, None, :] * u
        im = Image.fromarray(a.round().astype(np.uint8))
        h = 92; w = round(logo.width * h / logo.height)
        lg = logo.resize((w, h), Image.LANCZOS)
        im.paste(lg, (945, 298 - h // 2), lg)
        im.crop((860, 200, 1700, 400)).save(f'{O}/../lap_check.png')
    im.save(f'{O}/{name}.jpg', quality=92)
    print(name, im.size)
