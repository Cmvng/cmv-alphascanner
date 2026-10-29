"""Cut the owner out of the reel's own frames (Robust Video Matting, its memory reset at each span), so each cut-out
is the exact frame it sits on. Writes m_#####.png (RGBA): the camera's pixels inside the body, the matte's clean colour
at the edges.  python3 -I matte_frames.py <work dir> <model.onnx> <span ids...>"""
import json, os, sys, time
import numpy as np
import onnxruntime as ort
from PIL import Image
W, MODEL, *IDS = sys.argv[1:]
plan = json.load(open(f'{W}/plan.json')); os.makedirs(f'{W}/m', exist_ok=True)
so = ort.SessionOptions(); so.intra_op_num_threads = os.cpu_count() or 4
sess = ort.InferenceSession(MODEL, so, providers=['CPUExecutionProvider'])
dr = np.array([0.3], np.float32)
for s in plan['segs']:
    if s['id'] not in IDS: continue
    f0, n = round(s['o'] * 30), round((s['b'] - s['a']) * 30)
    rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4; t0 = time.time()
    for f in range(f0 + 1, f0 + n + 1):
        img = np.asarray(Image.open(f'{W}/src/f_{f:05d}.jpg').convert('RGB'))
        x = img.transpose(2, 0, 1)[None].astype(np.float32) / 255
        fgr, pha, *rec = sess.run(None, {'src': x, 'r1i': rec[0], 'r2i': rec[1], 'r3i': rec[2], 'r4i': rec[3], 'downsample_ratio': dr})
        a = np.clip((pha[0, 0] - 0.04) / 0.92, 0, 1)[..., None]
        w = np.clip((a - .85) / .1, 0, 1)
        rgb = img.astype(np.float32) * w + np.clip(fgr[0].transpose(1, 2, 0), 0, 1) * 255 * (1 - w)
        Image.fromarray(np.dstack([rgb, a * 255]).round().astype(np.uint8), 'RGBA').save(f'{W}/m/m_{f:05d}.png', compress_level=3)
    print(s['id'], n, 'frames from', f0 + 1, f'{time.time() - t0:.0f} s', flush=True)
