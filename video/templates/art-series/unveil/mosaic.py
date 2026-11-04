"""The drop's photomosaic: the finished piece rebuilt from tiles of the owner's own progress footage.
python3 -I mosaic.py <config.json> <page dir> [cols rows]
-> <page dir>/img/mosaic.jpg (the tiles composed, 2x the centre box) and <page dir>/img/tiles.json

Each cell of the piece gets the progress frame whose 3x3 brightness pattern matches it best, with a penalty for
reuse so the whole journey shows. Tiles are pulled 30% toward the cell's brightness so the castle reads in the mosaic
(a graphic, not the footage: the real frames play untouched in the panels)."""
import json, os, subprocess, sys
import numpy as np
from PIL import Image
cfg = json.load(open(sys.argv[1])); PAGE = sys.argv[2]
COLS, ROWS = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (25, 16)
BW, BH = cfg.get('centre_wh', [1000, 660])
SC = 2                                                           # the mosaic is drawn at 2x for the grow to full frame
tw, th = BW * SC / COLS, BH * SC / ROWS
TW, TH = int(round(tw)), int(round(th))
os.makedirs(f'{PAGE}/img', exist_ok=True)
# the pool: frames every 0.5 s from every progress clip and time-lapse (in story order)
pool, meta = [], []
srcs = [c['clip'] for c in cfg['build_clips']] + [x for x in cfg.get('mosaic_extra', [])]
for cid in dict.fromkeys(srcs):
    path = cfg['clips'][cid]['path']
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'fps={cfg.get("mosaic_fps", 2)},scale={TW * 2}:{TH * 2}:force_original_aspect_ratio=increase,crop={TW * 2}:{TH * 2},format=rgb24',
                          '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.uint8).reshape(-1, TH * 2, TW * 2, 3)
    pool.append(a); meta += [cid] * len(a)
pool = np.concatenate(pool)
print('pool', pool.shape[0], 'frames from', len(set(meta)), 'clips')
def sig(img3):                                                   # 3x3 mean luminance
    y = img3[..., :3].astype(np.float32) @ np.array([.2126, .7152, .0722], np.float32)
    h, w = y.shape[-2:]
    return np.stack([y[..., i * h // 3:(i + 1) * h // 3, j * w // 3:(j + 1) * w // 3].mean((-1, -2)) for i in range(3) for j in range(3)], -1)
ps = sig(pool)
art = Image.open(cfg['art'] if os.path.isabs(cfg['art']) else os.path.join(PAGE, cfg['art'])).convert('RGB').resize((BW * SC, BH * SC), Image.LANCZOS)
A = np.asarray(art)
out = np.zeros_like(A)
use = np.zeros(len(pool))
cells = [(c, r) for r in range(ROWS) for c in range(COLS)]
rng = np.random.default_rng(11)
rng.shuffle(cells)
tiles = []
for c, r in cells:
    x0, y0 = int(round(c * tw)), int(round(r * th)); x1, y1 = int(round((c + 1) * tw)), int(round((r + 1) * th))
    cell = A[y0:y1, x0:x1]
    s = sig(np.asarray(Image.fromarray(cell).resize((TW * 2, TH * 2))))
    d = ((ps - s) ** 2).sum(-1) + use * cfg.get('mosaic_reuse', 900.0)
    k = int(np.argmin(d)); use[k] += 1
    tile = np.asarray(Image.fromarray(pool[k]).resize((x1 - x0, y1 - y0), Image.LANCZOS)).astype(np.float32)
    tgt = cell.astype(np.float32).mean((0, 1))
    kp = cfg.get('mosaic_pull', .3)                             # how far each tile is pulled to its cell's tone
    tile = tile * (1 - kp) + (tile - tile.mean((0, 1)) + tgt) * kp
    out[y0:y1, x0:x1] = np.clip(tile, 0, 255).astype(np.uint8)
    side = 'L' if c < COLS / 2 else 'R'
    tiles.append({'c': c, 'r': r, 'x': x0 / SC, 'y': y0 / SC, 'w': (x1 - x0) / SC, 'h': (y1 - y0) / SC,
                  'side': side, 'u': float(rng.uniform(0, 1)), 'v': float(rng.uniform(0, 1)), 'd': float(rng.uniform(0, 1))})
Image.fromarray(out).save(f'{PAGE}/img/mosaic.jpg', quality=92)
T = {'cols': COLS, 'rows': ROWS, 'box': [BW, BH], 'tiles': tiles}
json.dump(T, open(f'{PAGE}/img/tiles.json', 'w'))
open(f'{PAGE}/img/tiles.js', 'w').write('window.TILES = ' + json.dumps(T) + ';\n')
print('mosaic', COLS, 'x', ROWS, 'tiles;', int((use > 0).sum()), 'different frames used')
