"""Portrait-mode treatment for the owner's camera recordings: the room is blurred behind them (the person cut out with
Robust Video Matting, the blur computed without the person so no halo), plus a gentle tone fix (white balance from the
background, a small lift on the face, a touch of contrast). No vignette, no stylised look.
  python3 -I video/lib/portrait_look.py <in.mp4> <out.mp4> <rvm.onnx> [blur_sigma=26] [wb_strength=0.7]"""
import subprocess, sys, os
import numpy as np, cv2, onnxruntime as ort

SRC, OUT, MODEL = sys.argv[1:4]
SIG = float(sys.argv[4]) if len(sys.argv) > 4 else 26.0
WBS = float(sys.argv[5]) if len(sys.argv) > 5 else 0.7
W, H = map(int, subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                                         '-of', 'csv=p=0', SRC]).decode().split(',')[:2])
so = ort.SessionOptions(); so.intra_op_num_threads = os.cpu_count() or 4
sess = ort.InferenceSession(MODEL, so, providers=['CPUExecutionProvider'])

def frames():
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', SRC, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    while True:
        b = p.stdout.read(W * H * 3)
        if len(b) < W * H * 3: break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3)

# pass 1: mattes, and the background's average colour (it should be a neutral white/grey ceiling and walls)
rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4; dr = np.array([0.3], np.float32)
alphas, bgsum, bgn = [], np.zeros(3), 0.0
for img in frames():
    x = img.transpose(2, 0, 1)[None].astype(np.float32) / 255
    fgr, pha, *rec = sess.run(None, {'src': x, 'r1i': rec[0], 'r2i': rec[1], 'r3i': rec[2], 'r4i': rec[3], 'downsample_ratio': dr})
    a = np.clip((pha[0, 0] - 0.04) / 0.92, 0, 1).astype(np.float32)
    alphas.append((a * 255).astype(np.uint8))
    m = a < 0.02
    l = img.mean(axis=2)
    m &= (l > 60) & (l < 245)                                     # skip blown highlights (the lamp) and deep shadow
    bgsum += img[m].reshape(-1, 3).sum(axis=0); bgn += m.sum()
avg = bgsum / max(bgn, 1)
gain = (avg.mean() / avg) ** WBS                                  # neutralise the cast, keep the brightness
gain = gain / gain.max() * min(1.0, gain.max())                  # never push a channel past where it was
print('background average RGB', avg.round(1), 'white-balance gains', gain.round(3))

lut = np.clip(np.arange(256) / 255.0, 0, 1)
curve = lambda v, c: np.clip(v + c * (v - v * v) * (v - .5) * 2.2, 0, 1)   # a gentle S
face_lift = (np.power(lut, 0.92) * 255).astype(np.float32)        # midtones up a little on the person
bg_dim = 0.9                                                       # the room 10% darker, so the subject separates

enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '30', '-i', '-',
                        '-vf', 'hqdn3d=1.2:1.2:3:3', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p',
                        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', OUT], stdin=subprocess.PIPE)
k = 1 / 4                                                          # blur on a quarter-size copy (fast), then back up
ks = max(3, int(SIG * k * 6) | 1)
for i, img in enumerate(frames()):
    a = alphas[i].astype(np.float32) / 255
    f = img.astype(np.float32) * gain                              # white balance
    # the background without the person: blur only the pixels that are clearly room, then normalise
    hold = cv2.dilate((a > 0.03).astype(np.uint8), np.ones((31, 31), np.uint8)).astype(np.float32)
    wgt = 1 - hold
    sm = lambda z: cv2.resize(cv2.GaussianBlur(cv2.resize(z, None, fx=k, fy=k, interpolation=cv2.INTER_AREA), (ks, ks), SIG * k),
                              (W, H), interpolation=cv2.INTER_LINEAR)
    num = sm(f * wgt[..., None]); den = sm(wgt)[..., None]
    bg = np.where(den > 1e-3, num / np.maximum(den, 1e-3), sm(f)) * bg_dim
    person = face_lift[np.clip(f, 0, 255).astype(np.uint8)]
    out = person * a[..., None] + bg * (1 - a[..., None])
    out = curve(out / 255, 0.10) * 255
    enc.stdin.write(np.clip(out, 0, 255).astype(np.uint8).tobytes())
enc.stdin.close(); enc.wait()
print('wrote', OUT, len(alphas), 'frames')
