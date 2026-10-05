# The owner on a studio set: removes the room behind them in a camera recording and puts them in front of a deep-blue
# studio (key glow behind the head, soft LED panels, bokeh, an out-of-focus "cmvng" neon), every frame, nothing cropped.
#
#   python3 video/lib/studio_bg.py <camera.mp4> <work dir> [--out-size 648x1152] [--workers 2]
#
# Steps (each cached in the work dir; delete a file to redo that step):
#   studio_bg.png  the set, drawn at the camera's size
#   plate.png      the empty room at half size: per pixel, the median of frames (one a second) where RobustVideoMatting
#                  says the pixel is not the person (its own mask, grown by 12 px, never the finished matte: a matte that
#                  already holds a background object would hide that object from the plate); seen.npy counts the frames
#   presenter.mp4  one pass at --out-size (work at the size the edit shows; it is several times faster): the RVM matte,
#   alpha.mkv      plus a difference matte against the plate in a band around the person (it brings back ears and hair
#                  the model drops; never on bright wall-like pixels), a guided filter; then the composite with the edge
#                  colours rebuilt from the plate (no wall-coloured rim), grey wall and shadow pixels taken off the
#                  outline, a 0.25 choke, a light wrap from the set, a touch of contrast, warmth and sharpening
# Camera sound is not touched (the edit cleans it separately). CPU only: about 6 fps at 648x1152, so a 9-minute
# recording takes about 45 minutes. Check a few frames after the plate (ears, hair, a grey rim, things on the wall
# behind the head) before the long pass.
import argparse, multiprocessing, os, subprocess, sys, time, random
from collections import deque
from concurrent.futures import ProcessPoolExecutor
import numpy as np

# workers are spawned, not forked: a fork after OpenCV's or onnxruntime's thread pools have run can hang the child, and
# forked workers keep the encoder's input pipe open so it never sees the end of the video
SPAWN = multiprocessing.get_context('spawn')
RVM_URL = 'https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3_fp32.onnx'
RVM = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.cache', 'rvm', 'rvm_mobilenetv3_fp32.onnx')


def size_of(video):
    import cv2
    v = cv2.VideoCapture(video); w, h = int(v.get(3)), int(v.get(4)); v.release()
    return w, h


def frames(video, w, h, fps='30'):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-threads', '1', '-i', video, '-vf', f'fps={fps},scale={w}:{h}:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    n = w * h * 3
    while True:
        b = p.stdout.read(n)
        if len(b) < n: return
        yield b


def rvm_session(threads=2):
    import onnxruntime as ort
    if not os.path.exists(RVM):
        os.makedirs(os.path.dirname(RVM), exist_ok=True)
        subprocess.run(['curl', '-sSLf', '--max-time', '300', '-o', RVM, RVM_URL], check=True)
    so = ort.SessionOptions(); so.intra_op_num_threads = threads
    return ort.InferenceSession(RVM, so, providers=['CPUExecutionProvider'])


def rvm_step(s, fr, rec, dr):
    src = fr.astype(np.float32).transpose(2, 0, 1)[None] / 255
    fgr, pha, *rec = s.run(None, {'src': src, 'r1i': rec[0], 'r2i': rec[1], 'r3i': rec[2], 'r4i': rec[3], 'downsample_ratio': np.array([dr], np.float32)})
    return pha[0, 0], rec


def ratio(w, h):   # RVM's own network runs at about 270x480 whatever the input
    return min(1.0, 480 / max(w, h))


# ---- the set ---------------------------------------------------------------------------------------------------------
def backdrop(path, W, H):
    import cv2
    from PIL import Image, ImageDraw, ImageFont
    sx, sy = W / 1080, H / 1920
    rng = random.Random(7); np.random.seed(7)
    y = np.linspace(0, 1, H)[:, None]; x = np.linspace(0, 1, W)[None, :]
    top, mid, bot = np.array([13, 19, 34]), np.array([11, 17, 33]), np.array([5, 8, 16])
    t = y.repeat(W, 1)[..., None]
    img = np.where(t < 0.55, top + (mid - top) * (t / 0.55), mid + (bot - mid) * ((t - 0.55) / 0.45)).astype(np.float32)
    def glow(cx, cy, r, col, a):
        d2 = ((x * W - cx * sx) ** 2 + (y * H - cy * sy) ** 2) / (r * r * sx * sy)
        return np.exp(-d2)[..., None] * np.array(col, np.float32) * a
    img += glow(560, 760, 470, (40, 95, 200), 0.42)          # the key glow behind the head
    img += glow(560, 420, 900, (22, 44, 95), 0.22)           # a broad wash on the upper wall
    pan = np.zeros((H, W, 3), np.float32)                     # LED panels far behind, very soft
    for px in (70, 1010):
        cv2.rectangle(pan, (int((px - 12) * sx), int(220 * sy)), (int((px + 12) * sx), int(1200 * sy)), (90, 170, 255), -1)
    img += cv2.GaussianBlur(pan, (0, 0), 34 * sx) * 0.85
    shelf = np.zeros((H, W, 3), np.float32); cv2.rectangle(shelf, (0, int(1180 * sy)), (W, int(1192 * sy)), (60, 140, 255), -1)
    img += cv2.GaussianBlur(shelf, (0, 0), 22 * sx) * 0.6
    sign = Image.new('RGB', (W, H)); d = ImageDraw.Draw(sign)    # the neon: three bars and "cmvng", behind the focus plane
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', max(12, int(92 * sx)))
    bx, by = 110 * sx, 330 * sy
    for i, hh in enumerate((46, 72, 98)):
        d.rounded_rectangle([bx + i * 24 * sx, by + (80 - hh * 0.8) * sx, bx + (i * 24 + 14) * sx, by + 80 * sx], 5, fill=(130, 205, 255))
    d.text((bx + 88 * sx, by - 12 * sx), 'cmvng', font=font, fill=(130, 205, 255))
    sg = np.asarray(sign).astype(np.float32)
    neon = sg * 0.55 + cv2.GaussianBlur(sg, (0, 0), 8 * sx) * 1.1 + cv2.GaussianBlur(sg, (0, 0), 26 * sx) * 1.4 + cv2.GaussianBlur(sg, (0, 0), 70 * sx) * 1.3
    img += cv2.GaussianBlur(neon, (0, 0), 4.5 * sx) * 0.32
    bok = np.zeros((H, W, 3), np.float32)                     # bokeh, kept away from the space right behind the head
    cols = [(79, 179, 255), (61, 123, 255), (110, 155, 255), (140, 210, 255), (255, 186, 120)]
    for i in range(26):
        r = rng.uniform(14, 60); cx = rng.uniform(0, 1080); cy = rng.uniform(80, 1250)
        if 330 < cx < 790 and 480 < cy < 1250: continue
        c = cols[4] if rng.random() < 0.12 else cols[rng.randrange(4)]; a = rng.uniform(0.05, 0.16)
        disc = np.zeros((H, W, 3), np.float32); ctr, rr = (int(cx * sx), int(cy * sy)), int(r * sx)
        cv2.circle(disc, ctr, rr, tuple(v * a for v in c), -1, cv2.LINE_AA)
        cv2.circle(disc, ctr, rr, tuple(v * a * 0.6 for v in c), 3, cv2.LINE_AA)
        bok += disc
    img += cv2.GaussianBlur(bok, (0, 0), 3.0)
    vig = 1 - 0.45 * (((x - 0.5) * 1.7) ** 2 + ((y - 0.45) * 1.25) ** 2)
    img *= np.clip(vig, 0.45, 1)[..., None]
    img += np.random.normal(0, 2.2, img.shape).astype(np.float32)
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(path)


# ---- the empty room --------------------------------------------------------------------------------------------------
def plate(video, wd, W, H):
    import cv2
    w, h = W // 2, H // 2; s = rvm_session(3); k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)); F, Ms = [], []
    for b in frames(video, w, h, fps='1'):
        fr = np.frombuffer(b, np.uint8).reshape(h, w, 3); rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4
        for _ in range(3): pha, rec = rvm_step(s, fr, rec, ratio(w, h))   # a few passes let the recurrent state settle
        F.append(fr.copy()); Ms.append(cv2.dilate((pha > 0.05).astype(np.uint8), k).astype(bool))
    F = np.stack(F); Ms = np.stack(Ms); pl = np.zeros(F.shape[1:], np.float32); seen = (~Ms).sum(0)
    for y in range(0, h, 60):       # in strips, to keep memory down
        pl[y:y + 60] = np.nanmedian(np.where(Ms[:, y:y + 60][..., None], np.nan, F[:, y:y + 60].astype(np.float32)), axis=0)
    hole = np.isnan(pl[..., 0]).astype(np.uint8)
    pl = cv2.inpaint(np.nan_to_num(pl).clip(0, 255).astype(np.uint8), hole, 9, cv2.INPAINT_TELEA)
    cv2.imwrite(os.path.join(wd, 'plate.png'), cv2.cvtColor(pl, cv2.COLOR_RGB2BGR)); np.save(os.path.join(wd, 'seen.npy'), seen)
    print(f'plate: {len(F)} frames, {int((seen == 0).sum())} pixels never seen', flush=True)


# ---- matte and composite (worker side) -------------------------------------------------------------------------------
G = {}
def init_worker(wd, W, H):
    import cv2; cv2.setNumThreads(1)
    pl = cv2.cvtColor(cv2.imread(os.path.join(wd, 'plate.png')), cv2.COLOR_BGR2RGB)
    seen = np.load(os.path.join(wd, 'seen.npy')).astype(np.float32)
    S = cv2.cvtColor(cv2.imread(os.path.join(wd, 'studio_bg.png')), cv2.COLOR_BGR2RGB)
    k = max(3, int(23 * W / 648) | 1)
    G.update(W=W, H=H, PLs=cv2.resize(pl, (W // 2, H // 2), interpolation=cv2.INTER_AREA).astype(np.float32),
             SEENs=cv2.resize(seen, (W // 2, H // 2), interpolation=cv2.INTER_NEAREST),
             P=cv2.resize(pl, (W, H), interpolation=cv2.INTER_CUBIC).astype(np.float32), SEEN=cv2.resize(seen, (W, H), interpolation=cv2.INTER_NEAREST),
             S=cv2.resize(S, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32),
             BAND=cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)), OPEN=cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)),
             LUT=np.clip(((np.arange(256) / 255.0 - 0.5) * 1.06 + 0.5 + 0.015) * 255, 0, 255).astype(np.float32))
    G['Sblur'] = cv2.GaussianBlur(G['S'], (0, 0), 18 * W / 1080)


def fuse(fr, pha):
    """RVM's matte plus a difference matte against the plate, only in a band around the person and never on wall-ish
    pixels (bright, unsaturated), so ears and hair come back without the wall next to the neck."""
    import cv2
    W, H = G['W'], G['H']; hw = (W // 2, H // 2)
    sm = cv2.resize(fr, hw, interpolation=cv2.INTER_AREA); ps = cv2.resize(pha, hw, interpolation=cv2.INTER_AREA); f = sm.astype(np.float32)
    PL, SEEN = G['PLs'], G['SEENs']
    bgm = (ps < 0.01) & (SEEN >= 20)
    g = (f[bgm].mean(0) + 1) / (PL[bgm].mean(0) + 1) if bgm.sum() > 300 else np.ones(3, np.float32)   # exposure drift
    dm = np.clip((np.abs(f - PL * g).max(2) - 22) / 30, 0, 1)
    near = cv2.dilate((ps > 0.5).astype(np.uint8), G['BAND']).astype(bool) & (SEEN >= 15)
    hsv = cv2.cvtColor(sm, cv2.COLOR_RGB2HSV); wallish = (hsv[..., 2] > 165) & (hsv[..., 1] < 50)
    add = cv2.morphologyEx(np.where(near & ~wallish, dm, 0).astype(np.float32), cv2.MORPH_OPEN, G['OPEN'])
    a = np.maximum(pha, cv2.resize(add, (W, H), interpolation=cv2.INTER_LINEAR))
    return np.clip(cv2.ximgproc.guidedFilter(guide=fr, src=a, radius=max(2, round(4 * W / 648)), eps=1e-3), 0, 1)


def unshadow(fr, a):
    """Around the outline (outside the solid core), grey pixels that are not near-black leave the matte: the wall, or
    the owner's own shadow on it, which moves with them so no plate can hold it (5 Oct: a grey strip beside the head).
    Skin, hair and a coloured shirt stay."""
    import cv2
    hsv = cv2.cvtColor(fr, cv2.COLOR_RGB2HSV).astype(np.float32)
    grey = np.clip((50 - hsv[..., 1]) / 20, 0, 1) * np.clip((hsv[..., 2] - 45) / 20, 0, 1)
    k = max(3, int(15 * G['W'] / 648) | 1)
    core = cv2.erode((a > 0.95).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))).astype(bool)
    m = cv2.GaussianBlur(np.where(core, 1, 1 - grey).astype(np.float32), (0, 0), 1.0)
    return np.clip(cv2.ximgproc.guidedFilter(guide=fr, src=(a * m).astype(np.float32), radius=3, eps=1e-3), 0, 1)


CHOKE = 0.25
def work(args):
    """out = a * grade(Fg) + (1 - a) * set, where Fg = (I - (1 - a) * g * P) / a is the person's own colour at the edge
    (the known empty room P taken out), plus a light wrap of the set's glow on the outline."""
    import cv2
    buf, pha = args; W, H = G['W'], G['H']
    fr = np.frombuffer(buf, np.uint8).reshape(H, W, 3); a0 = unshadow(fr, fuse(fr, pha))
    I = fr.astype(np.float32); a = np.clip((a0[..., None] - CHOKE) / (1 - CHOKE), 0, 1); P, SEEN = G['P'], G['SEEN']
    sb = (a[..., 0] < 0.02) & (SEEN >= 20)
    g = (I[sb][::5].mean(0) + 1) / (P[sb][::5].mean(0) + 1) if sb.sum() > 1500 else np.ones(3, np.float32)
    Fg = np.clip(np.where((SEEN >= 15)[..., None] & (a < 0.98), (I - (1 - a) * P * g) / np.maximum(a, 0.25), I), 0, 255)
    Fg = G['LUT'][Fg.astype(np.uint8)] * np.array([1.02, 1.0, 0.975], np.float32)          # contrast, warmth
    Fg = Fg + (Fg - cv2.GaussianBlur(Fg, (0, 0), 0.9 * W / 648)) * 0.4                      # gentle sharpening
    out = a * Fg + (1 - a) * G['S'] + np.clip(a * (1 - a) * 4, 0, 1) * G['Sblur'] * 0.08
    return np.clip(out, 0, 255).astype(np.uint8).tobytes(), (a0 * 255 + 0.5).astype(np.uint8).tobytes()


def render(video, wd, W, H, workers):
    s = rvm_session(2); rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4; dr = ratio(W, H)
    pool = ProcessPoolExecutor(workers, mp_context=SPAWN, initializer=init_worker, initargs=(wd, W, H))
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '30', '-i', '-',
                            '-c:v', 'libx264', '-preset', 'medium', '-crf', '13', '-pix_fmt', 'yuv420p', '-threads', '1', os.path.join(wd, 'presenter.part.mp4')], stdin=subprocess.PIPE)
    ena = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', f'{W}x{H}', '-r', '30', '-i', '-', '-c:v', 'ffv1', '-threads', '1', os.path.join(wd, 'alpha.mkv')], stdin=subprocess.PIPE)
    q = deque(); n = 0; t0 = time.time()
    def flush(k):
        while len(q) > k:
            o, a = q.popleft().result(); enc.stdin.write(o); ena.stdin.write(a)
    for b in frames(video, W, H):
        pha, rec = rvm_step(s, np.frombuffer(b, np.uint8).reshape(H, W, 3), rec, dr)
        q.append(pool.submit(work, (b, pha.copy()))); flush(workers * 4); n += 1
        if n % 900 == 0: print(f'{n} frames · {n / (time.time() - t0):.1f} fps', flush=True)
    flush(0); enc.stdin.close(); ena.stdin.close(); enc.wait(); ena.wait(); pool.shutdown()
    os.replace(os.path.join(wd, 'presenter.part.mp4'), os.path.join(wd, 'presenter.mp4'))
    print(f'presenter: {n} frames in {time.time() - t0:.0f} s', flush=True)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('video'); ap.add_argument('wd')
    ap.add_argument('--out-size', default=''); ap.add_argument('--workers', type=int, default=2)
    a = ap.parse_args(); os.makedirs(a.wd, exist_ok=True)
    W, H = size_of(a.video)
    ow, oh = (int(v) for v in a.out_size.split('x')) if a.out_size else (W, H)
    J = lambda f: os.path.join(a.wd, f)
    if not os.path.exists(J('studio_bg.png')): backdrop(J('studio_bg.png'), W, H); print('set drawn', flush=True)
    if not os.path.exists(J('plate.png')): plate(a.video, a.wd, W, H)
    if not os.path.exists(J('presenter.mp4')): render(a.video, a.wd, ow - ow % 2, oh - oh % 2, a.workers)
    print('presenter:', J('presenter.mp4'))
