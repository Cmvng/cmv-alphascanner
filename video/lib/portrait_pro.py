"""The 'pro' look for the owner's camera recordings (9 Nov, "I need it to be the best"). Everything is built from the
person's matte (Robust Video Matting), so the person and the room are treated separately, like a lit studio shot:
  - framing: a slow push-in that follows the face, with the hand shake smoothed out (the crop rides a smoothed track);
  - the room: a real lens blur (disc bokeh, bright points bloom), computed without the person (no halo), dimmed, cooled
    and washed lightly toward the house blue;
  - the person: highlight roll-off (forehead shine), a soft key light on the face, shadows lifted a touch, warm skin,
    local contrast for eyes and beard, and a thin cool rim light on the edge away from the key;
  - finish: temporal denoise before any sharpening, a gentle S-curve, a light sharpen after the reframe.
No vignette, no grain, no stylised grade (the owner's rules).
  python3 -I video/lib/portrait_pro.py <in.mp4> <out.mp4> <rvm.onnx> [preview_frame]"""
import subprocess, sys, os
import numpy as np, cv2, onnxruntime as ort

SRC, OUT, MODEL = sys.argv[1:4]
PREVIEW = int(sys.argv[4]) if len(sys.argv) > 4 else -1
W, H = map(int, subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                                         '-of', 'csv=p=0', SRC]).decode().split(',')[:2])
so = ort.SessionOptions(); so.intra_op_num_threads = os.cpu_count() or 4
sess = ort.InferenceSession(MODEL, so, providers=['CPUExecutionProvider'])

def frames(vf='null'):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', SRC, '-vf', vf, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    while True:
        b = p.stdout.read(W * H * 3)
        if len(b) < W * H * 3: break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3)

# ---------- pass 1: mattes, face track, background colour
rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4; dr = np.array([0.3], np.float32)
alphas, top, cx, hw, bgsum, bgn = [], [], [], [], np.zeros(3), 0.0
for img in frames():
    x = img.transpose(2, 0, 1)[None].astype(np.float32) / 255
    fgr, pha, *rec = sess.run(None, {'src': x, 'r1i': rec[0], 'r2i': rec[1], 'r3i': rec[2], 'r4i': rec[3], 'downsample_ratio': dr})
    a = np.clip((pha[0, 0] - 0.04) / 0.92, 0, 1).astype(np.float32)
    alphas.append((a * 255).astype(np.uint8))
    rows = np.where((a > .5).mean(axis=1) > .06)[0]
    t0 = int(rows[0]) if len(rows) else H // 3
    band = a[t0:t0 + 320] > .5
    xs = np.where(band.any(axis=0))[0]
    top.append(t0); cx.append(float((band * np.arange(W)).sum() / max(band.sum(), 1))); hw.append(float(xs[-1] - xs[0]) if len(xs) else W / 2)
    m = (a < .02) & (img.mean(axis=2) > 60) & (img.mean(axis=2) < 245)
    bgsum += img[m].reshape(-1, 3).sum(axis=0); bgn += m.sum()
N = len(alphas)
def smooth(v, k=31):
    v = np.asarray(v, np.float64); w = np.hanning(k); w /= w.sum(); p = k // 2
    return np.convolve(np.pad(v, p, mode='edge'), w, mode='valid')
top, cx, hw = smooth(top), smooth(cx), smooth(np.minimum(hw, W * .8), 45)
avg = bgsum / max(bgn, 1); gain = (avg.mean() / avg) ** .7; gain = gain / gain.max()
print(f'{N} frames; head top {top.min():.0f}-{top.max():.0f}, centre x {cx.min():.0f}-{cx.max():.0f}, width ~{hw.mean():.0f}; WB gains {gain.round(3)}')

# ---------- helpers
k3 = 1 / 3
R = 13                                                           # bokeh radius on the third-size copy (~39 px full size)
yy, xx = np.mgrid[-R:R + 1, -R:R + 1]
disc = ((xx * xx + yy * yy) <= R * R).astype(np.float32); disc /= disc.sum()
small = lambda z: cv2.resize(z, None, fx=k3, fy=k3, interpolation=cv2.INTER_AREA)
big = lambda z: cv2.resize(z, (W, H), interpolation=cv2.INTER_LINEAR)
gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)
BLUE = np.array([0.31, 0.62, 0.95], np.float32)                  # house sky blue (#4FB3FF), as a light wash
def scurve(v, c=.12): return np.clip(v + c * (v - v * v) * (v - .5) * 2.2, 0, 1)
def rolloff(v, knee=.70, s=.5):                                # smooth (no visible edge where it starts)
    d = np.maximum(v - knee, 0); return v - (1 - s) / (2 * (1 - knee)) * d * d

enc = None if PREVIEW >= 0 else subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                        '-r', '30', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p',
                        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', OUT], stdin=subprocess.PIPE)
# temporal denoise first, so the sharpening later doesn't lift the phone's grain
for i, img in enumerate(frames('hqdn3d=1.3:1.1:3:3')):
    if PREVIEW >= 0 and i != PREVIEW: continue
    a = alphas[i].astype(np.float32) / 255
    f = img.astype(np.float32) / 255 * gain
    # --- the room: lens blur without the person, bright points bloom into bokeh
    hold = cv2.dilate((a > .03).astype(np.uint8), np.ones((35, 35), np.uint8)).astype(np.float32)
    wgt = small(1 - hold)
    fh = f + 1.6 * np.maximum(f - .80, 0)
    num = cv2.filter2D(small(fh) * wgt[..., None], -1, disc); den = cv2.filter2D(wgt, -1, disc)[..., None]
    fill = cv2.GaussianBlur(small(fh), (0, 0), 18)
    bg = big(np.where(den > 1e-3, num / np.maximum(den, 1e-3), fill))
    lum = bg.mean(axis=2, keepdims=True)
    bg = lum + (bg - lum) * .82                                  # a little less saturation
    bg = bg * np.array([.96, .985, 1.035], np.float32) * .9       # cooler and darker, so the subject separates
    bg = bg * .92 + BLUE * .08 * lum.clip(0, 1) * 1.6            # a light wash of the house blue
    # --- the person: light it
    c_x, t_y, h_w = cx[i], top[i], hw[i]
    kx, ky, kr = c_x - .18 * h_w, t_y + .62 * h_w, .95 * h_w     # key light from camera-left, on the face
    key = np.exp(-(((gx - kx) ** 2 + (gy - ky) ** 2) / (2 * kr * kr)))[..., None]
    p = np.power(np.clip(f, 0, 1), .95)                          # shadows up a touch
    p = p * (1 + .13 * key)                                      # the key
    p = p * np.array([1.025, 1.0, .965], np.float32)             # warm skin
    detail = p - cv2.GaussianBlur(p, (0, 0), 5)
    p = p + .18 * detail * a[..., None]                          # local contrast: eyes, brows, beard
    pl = p.max(axis=2, keepdims=True)
    p = p * (rolloff(pl) / np.maximum(pl, 1e-4))                 # tame the forehead shine
    # --- a thin cool rim on the edge away from the key
    edge = np.clip(a - cv2.erode(a, np.ones((13, 13), np.uint8)), 0, 1)
    edge = cv2.GaussianBlur(edge, (0, 0), 3)
    side = np.clip((gx - c_x) / max(h_w, 1) * 1.6 + .2, 0, 1) * .95 + .05
    rim = (edge * side)[..., None] * np.array([.80, .90, 1.0], np.float32) * .2
    p = 1 - (1 - np.clip(p, 0, 1)) * (1 - rim)                   # screen blend
    out = p * a[..., None] + bg * (1 - a[..., None])
    out = scurve(np.clip(out, 0, 1))
    # --- framing: slow push-in, the crop following the smoothed face track (this is also the stabiliser)
    z = 1.13 + .03 * (i / max(N - 1, 1))
    cw, ch = W / z, H / z
    x0 = np.clip(cx[i] - cw / 2, 0, W - cw)
    y0 = np.clip(top[i] - .17 * ch, 0, H - ch)
    M = np.array([[z, 0, -x0 * z], [0, z, -y0 * z]], np.float32)
    out = cv2.warpAffine(out, M, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
    out = np.clip(out + .25 * (out - cv2.GaussianBlur(out, (0, 0), 1.2)), 0, 1)
    o8 = (out * 255 + .5).astype(np.uint8)
    if PREVIEW >= 0:
        cv2.imwrite(OUT, cv2.cvtColor(o8, cv2.COLOR_RGB2BGR)); print('preview', OUT); break
    enc.stdin.write(o8.tobytes())
if enc: enc.stdin.close(); enc.wait(); print('wrote', OUT)
