# Reading the owner's phone screen recording, to place close-ups and boxes on exactly what they talk about.
# Phone recordings are variable frame rate: everything here samples by timestamp (ffmpeg fps filter), never by frame index.
#
#   python3 video/lib/screen_read.py scroll <screen.mp4> <out.json>     page scroll at 10 fps: [[t, S, peak, diff], ...];
#                                     S = cumulative content shift in screen heights (negative = the page moved up), so
#                                     an item seen at y0 at time ref sits at y0 + S(t) - S(ref) at time t (same page)
#   python3 video/lib/screen_read.py ocr <screen.mp4> <scroll.json> <out.json>   OCR one frame per still stretch (>= 0.3 s,
#                                     one more every 6 s): {"t": [[x0, y0, x1, y1, text, score], ...]} in screen fractions
#   python3 video/lib/screen_read.py find <ocr.json> <t0> <t1> [regex]   the OCR boxes in a time range
#   python3 video/lib/screen_read.py legs <screen.mp4> <ocr.json> <t> ...   ticket legs at a still frame: the odds in the
#                                     right column with their colour (red = lost, green = won, grey = void or pending)
#                                     and the leg's name, to check a count ("1, 2, 3, 4 lost") before boxing each leg
import io, json, re, subprocess, sys
import numpy as np


def frame(video, t):
    from PIL import Image
    png = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.2f}', '-i', video, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True).stdout
    return np.asarray(Image.open(io.BytesIO(png)).convert('RGB'))


def scroll(video, out, W=270, H=566):
    import cv2
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', video, '-vf', f'fps=10,scale={W}:{H}:flags=area,format=gray', '-f', 'rawvideo', '-'], stdout=subprocess.PIPE)
    win = np.outer(np.hanning(H - 140), np.hanning(W)).astype(np.float32)    # the middle band: no status or nav bars
    prev, k, S, res = None, 0, 0.0, []
    while True:
        b = p.stdout.read(W * H)
        if len(b) < W * H: break
        g = np.frombuffer(b, np.uint8).reshape(H, W).astype(np.float32)[70:H - 70]
        if prev is None: res.append([0.0, 0.0, 1.0, 0.0])
        else:
            (dx, dy), r = cv2.phaseCorrelate(prev, g, win); d = float(np.abs(g - prev).mean())
            S += (0.0 if d < 0.3 else dy) / H
            res.append([round(k / 10, 2), round(S, 4), round(r, 2), round(d, 1)])
        prev = g; k += 1
    json.dump(res, open(out, 'w')); print(len(res), 'samples')


def stills(sc, min_len=0.3, every=6.0):
    ts, run = [], None
    for t, S, r, d in sc:
        still = d < 0.5
        if still and run is None: run = [t, t]
        elif still: run[1] = t
        elif run:
            if run[1] - run[0] >= min_len:
                n = int((run[1] - run[0]) // every) + 1; ts += [round(run[0] + (run[1] - run[0]) * (i + 0.5) / n, 1) for i in range(n)]
            run = None
    return ts


def ocr(video, scroll_json, out):
    from rapidocr_onnxruntime import RapidOCR
    eng = RapidOCR(intra_op_num_threads=2, inter_op_num_threads=1)
    try: res = json.load(open(out))
    except Exception: res = {}
    for t in stills(json.load(open(scroll_json))):
        if str(t) in res: continue
        im = frame(video, t)[..., ::-1].copy(); H, W = im.shape[:2]; boxes, _ = eng(im)
        res[str(t)] = [[round(min(p[0] for p in b) / W, 4), round(min(p[1] for p in b) / H, 4), round(max(p[0] for p in b) / W, 4), round(max(p[1] for p in b) / H, 4), txt, round(float(sc), 2)] for b, txt, sc in (boxes or [])]
        json.dump(res, open(out, 'w')); print(t, len(res[str(t)]), flush=True)


def find(ocr_json, t0, t1, rx=None):
    O = json.load(open(ocr_json)); rx = re.compile(rx, re.I) if rx else None
    for t in sorted(O, key=float):
        if t0 <= float(t) <= t1:
            print(f'@{t}: ' + ' | '.join(f'{x[4]}[{x[0]:.3f},{x[1]:.3f},{x[2]:.3f},{x[3]:.3f}]' for x in O[t] if not rx or rx.search(x[4])))


def legs(video, ocr_json, t):
    O = json.load(open(ocr_json)); boxes = O[t]; im = frame(video, float(t)).astype(int); H, W = im.shape[:2]; out = []
    for x0, y0, x1, y1, txt, sc in boxes:
        if x0 < 0.8 or not re.fullmatch(r'\d+\.\d\d', txt.replace(' ', '')): continue
        px = im[int(y0 * H):int(y1 * H) + 1, int(x0 * W):int(x1 * W) + 1].reshape(-1, 3); ink = px[px.sum(1) < 600]
        if not len(ink): continue
        r, g, b = ink.mean(0); col = 'red' if r > g + 40 else 'green' if g > r + 30 else 'grey'
        name = [c for c in boxes if c[2] < 0.8 and c[0] < 0.3 and abs((c[1] + c[3]) / 2 - (y0 + y1) / 2) < 0.02]
        out.append((round(y0, 3), round(y1, 3), txt, col, name[0][4] if name else '?'))
    return out


if __name__ == '__main__':
    cmd, *a = sys.argv[1:]
    if cmd == 'scroll': scroll(a[0], a[1])
    elif cmd == 'ocr': ocr(a[0], a[1], a[2])
    elif cmd == 'find': find(a[0], float(a[1]), float(a[2]), a[3] if len(a) > 3 else None)
    elif cmd == 'legs':
        for t in a[2:]:
            print('@', t)
            for l in legs(a[0], a[1], t): print('  ', l)
    else: print(__doc__ or 'see the header of this file')
