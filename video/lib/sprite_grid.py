# Sample an upscaled pixel-art sprite (e.g. from a video frame) back to its exact pixel grid, as a transparent PNG.
# usage: python3 video/lib/sprite_grid.py frame.png x0 y0 x1 y1 out.png [min_cell max_cell]
import sys, numpy as np
from PIL import Image
f, x0, y0, x1, y1, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6]
im = np.asarray(Image.open(f).convert('RGB')).astype(float)
c = im[y0:y1, x0:x1]
def period(prof):
    p = prof - prof.mean(); ac = np.correlate(p, p, 'full')[len(p) - 1:]
    lo = 8; k = lo + int(np.argmax(ac[lo:len(p) // 4])); return k
gx = np.abs(np.diff(c, axis=1)).sum(axis=(0, 2)); gy = np.abs(np.diff(c, axis=0)).sum(axis=(1, 2))
def best_cell(g, lo, hi):            # the cell size whose grid lines sit on the most edge energy
    sc = []
    for cell in np.arange(lo, hi, 0.25):
        s = max(g[np.round(np.arange(o, len(g) - 1, cell)).astype(int)].mean() for o in np.arange(0, cell, 1.0))
        sc.append((s, cell))
    return max(sc)[1]
lo, hi = (float(sys.argv[7]), float(sys.argv[8])) if len(sys.argv) > 8 else (8, 80)
cell = (best_cell(gx, lo, hi) + best_cell(gy, lo, hi)) / 2
# phase: the offset where edges line up best
def phase(g, cell):
    best, bo = -1, 0
    for o in np.arange(0, cell, 0.5):
        idx = np.round(np.arange(o, len(g) - 1, cell)).astype(int); s = g[idx[idx < len(g)]].sum()
        if s > best: best, bo = s, o
    return bo
ox, oy = phase(gx, cell), phase(gy, cell)
nx, ny = int((c.shape[1] - ox) // cell), int((c.shape[0] - oy) // cell)
bg = np.median(np.concatenate([c[:6, :6].reshape(-1, 3), c[:6, -6:].reshape(-1, 3)]), axis=0)
px = np.zeros((ny, nx, 4), np.uint8)
for j in range(ny):
    for i in range(nx):
        cx, cy = ox + (i + 0.5) * cell, oy + (j + 0.5) * cell
        r = max(2, int(cell * 0.2)); blk = c[int(cy) - r:int(cy) + r, int(cx) - r:int(cx) + r].reshape(-1, 3)
        col = np.median(blk, axis=0)
        a = 0 if np.linalg.norm(col - bg) < 28 else 255
        px[j, i] = [*np.round(col).astype(int), a]
# trim empty rows/cols
m = px[..., 3] > 0; ys, xs = np.where(m)
px = px[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
Image.fromarray(px, 'RGBA').save(out)
print(f'cell {cell:.1f}px, grid {px.shape[1]}x{px.shape[0]}, bg {bg.round()}')
