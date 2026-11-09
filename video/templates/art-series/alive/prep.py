"""Turns a photo of a drawing into the three maps the 'alive' page needs to light it as a relief:
  <name>_a.jpg  the photo itself (the albedo; never repainted)
  <name>_h.png  an 8-bit height map for moving the surface (macro shape + raised light areas), heavily smoothed
  <name>_n.png  an RGB normal map made from the float heights at three scales, for the moving light
Heights come from the picture: an optional depth map (Depth Anything v2, see depth.py) for real shapes such as the
castle tower, the smoothed brightness for stone and bricks (light = raised, cracks = cut in), and the fine brightness for
grain. Paper (large, bright, smooth areas) stays flat.
  python3 -I prep.py <photo> <out dir> <name> [--depth d.png] [--wd 1.0] [--wm 0.5] [--wf 0.25] [--long 4000]"""
import sys, argparse, numpy as np, cv2
ap = argparse.ArgumentParser(); ap.add_argument('photo'); ap.add_argument('out'); ap.add_argument('name')
ap.add_argument('--depth'); ap.add_argument('--wd', type=float, default=1.0); ap.add_argument('--wm', type=float, default=.5)
ap.add_argument('--wf', type=float, default=.25); ap.add_argument('--long', type=int, default=4000)
ap.add_argument('--crop', help='x0,y0,x1,y1 as fractions, applied before anything else')
a = ap.parse_args()
im = cv2.imread(a.photo); H0, W0 = im.shape[:2]
if a.crop:
    x0, y0, x1, y1 = (float(v) for v in a.crop.split(',')); im = im[int(y0 * H0):int(y1 * H0), int(x0 * W0):int(x1 * W0)]; H0, W0 = im.shape[:2]
s = min(1, a.long / max(H0, W0))
if s < 1: im = cv2.resize(im, (round(W0 * s), round(H0 * s)), interpolation=cv2.INTER_AREA)
H, W = im.shape[:2]
cv2.imwrite(f'{a.out}/{a.name}_a.jpg', im, [cv2.IMWRITE_JPEG_QUALITY, 93])
# work at 2048 on the long side
k = 2048 / max(H, W); w, h = round(W * k), round(H * k)
g = cv2.cvtColor(cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
# paper: bright, smooth and large
bl = cv2.GaussianBlur(g, (0, 0), 6); sd = np.sqrt(np.maximum(cv2.GaussianBlur(g * g, (0, 0), 6) - bl * bl, 0))
paper = ((bl > .62) & (sd < .045)).astype(np.uint8)
paper = cv2.morphologyEx(paper, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(paper)
keep = np.zeros_like(paper)
for i in range(1, n):
    if st[i, cv2.CC_STAT_AREA] > .008 * w * h: keep[lab == i] = 1          # small bright patches inside stone are not paper
ink = cv2.GaussianBlur(1 - keep.astype(np.float32), (0, 0), 2.6)          # 1 on the drawing, 0 on paper, soft edge
# heights
meso = cv2.GaussianBlur(g, (0, 0), 5) - cv2.GaussianBlur(g, (0, 0), 40)   # stone and bricks: light areas raised
fine = cv2.GaussianBlur(g, (0, 0), 1.2) - cv2.GaussianBlur(g, (0, 0), 5)  # grain and cracks
macro = np.zeros_like(g)
if a.depth:
    d = cv2.imread(a.depth, -1).astype(np.float32) / 65535
    macro = cv2.GaussianBlur(cv2.resize(d, (w, h), interpolation=cv2.INTER_CUBIC), (0, 0), 3)
    macro = (macro - macro.min()) / (macro.max() - macro.min() + 1e-6)
inkc = np.clip((ink - .55) / .4, 0, 1)                                   # the drawing proper, away from its soft edge
# 8-bit height for the geometry (smoothed again so the mesh has no steps)
hg = cv2.GaussianBlur((a.wd * macro + a.wm * meso * 2.2 + .03) * ink, (0, 0), 2.5)
lo, hi = float(hg.min()), float(hg.max())
cv2.imwrite(f'{a.out}/{a.name}_h.png', np.clip((hg - lo) / (hi - lo + 1e-6) * 255, 0, 255).astype(np.uint8))
# normal map from the float heights (x right, y up, z out of the paper)
def grad(z, sig, gain):
    z = cv2.GaussianBlur(z, (0, 0), sig); return cv2.Sobel(z, cv2.CV_32F, 1, 0, ksize=3) * gain, cv2.Sobel(z, cv2.CV_32F, 0, 1, ksize=3) * gain
gx1, gy1 = grad((a.wd * macro) * ink, 2.6, 20)
gx2, gy2 = grad((a.wm * meso * 2.2) * inkc + .03 * ink, 1.5, 9)
gx3, gy3 = grad(a.wf * fine * inkc, .8, 3.2)
gx, gy = gx1 + gx2 + gx3, gy1 + gy2 + gy3
nz = np.ones_like(gx); ln = np.sqrt(gx * gx + gy * gy + nz * nz)
nrm = np.dstack([(-gx / ln) * .5 + .5, (gy / ln) * .5 + .5, (nz / ln) * .5 + .5])     # image y is down, so +gy points up
cv2.imwrite(f'{a.out}/{a.name}_n.png', cv2.cvtColor((np.clip(nrm, 0, 1) * 255).astype(np.uint8), cv2.COLOR_RGB2BGR))
cv2.imwrite(f'{a.out}/{a.name}_ink.png', (np.clip(ink, 0, 1) * 255).astype(np.uint8))
print(a.name, f'{W}x{H}', 'height range', round(lo, 3), round(hi, 3), 'paper share', round(float(keep.mean()), 3))
