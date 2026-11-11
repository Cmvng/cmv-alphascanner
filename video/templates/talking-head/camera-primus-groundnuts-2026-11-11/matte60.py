"""The owner's outline at the recording's own frame rate, for the stretches where a graphic sits behind them.
  python -I matte60.py <work dir> <raw.mp4> <rvm.onnx> <a-b,a-b,...>      (stretches in seconds of the finished video)
  -> <work>/alpha60.mkv (gray, 1080x1920, flipped like the picture, one frame for every finished frame at 60 a second)

The picture itself is NOT touched by this: the finished video is the owner's own frames (render_raw.mjs). The outline
only hides the part of a graphic that falls behind the head. It is made from the raw frames at 60 a second, so its
edge sits on the right frame (an outline made at 30 would trail the head on every other frame). Outside the stretches
it is white: nothing is behind the owner there, so nothing is computed. Each stretch is warmed up with a few frames
before it starts, because the model carries what it saw from frame to frame."""
import json, subprocess, sys
import cv2, numpy as np
K, RAW, MODEL, SPANS = sys.argv[1:5]
FPS, W, H, FLIP, WARM = 60, 1080, 1920, True, 10
segs = json.load(open(f'{K}/segs.json')); plan = json.load(open(f'{K}/plan.json'))
fr = [n for g in segs for n in range(round(g['s'] * FPS), round(g['e'] * FPS))]              # finished frame -> raw frame
spans = [tuple(float(x) for x in s.split('-')) for s in SPANS.split(',')]
want = np.zeros(len(fr), bool)
for a, b in spans: want[max(0, int(a * FPS)):min(len(fr), int(b * FPS) + 1)] = True
import onnxruntime as ort
so = ort.SessionOptions(); so.intra_op_num_threads = 4
sess = ort.InferenceSession(MODEL, so, providers=['CPUExecutionProvider'])
enc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'ffv1', '-level', '3', '-g', '60', '-pix_fmt', 'gray', f'{K}/alpha60.mkv'], stdin=subprocess.PIPE)
white = np.full((H, W), 255, np.uint8).tobytes(); ker = np.ones((3, 3), np.uint8); dr = np.array([0.3], np.float32)
total = round((plan['end'] + plan['endcard']) * FPS) + 60
j, done = 0, 0
while j < len(fr):
    if not want[j]: enc.stdin.write(white); j += 1; continue
    k = j
    while k + 1 < len(fr) and want[k + 1] and fr[k + 1] == fr[k] + 1: k += 1                  # one run of consecutive raw frames
    f0 = max(0, fr[j] - WARM); n = fr[k] - f0 + 1
    ss = [] if f0 <= 0 else ['-ss', f'{(f0 - 0.5) / FPS:.5f}']
    p = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-threads', '2'] + ss + ['-i', RAW, '-frames:v', str(n), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4
    for i in range(n):
        b = p.stdout.read(W * H * 3)
        if len(b) < W * H * 3: break
        x = np.frombuffer(b, np.uint8).reshape(H, W, 3).transpose(2, 0, 1)[None].astype(np.float32) / 255
        fgr, pha, *rec = sess.run(None, {'src': x, 'r1i': rec[0], 'r2i': rec[1], 'r3i': rec[2], 'r4i': rec[3], 'downsample_ratio': dr})
        if f0 + i < fr[j]: continue                                                            # warm-up
        a = (np.clip((pha[0, 0] - 0.04) / 0.92, 0, 1) * 255).astype(np.uint8)
        if FLIP: a = cv2.flip(a, 1)
        enc.stdin.write(cv2.GaussianBlur(cv2.dilate(a, ker), (0, 0), 1.3).tobytes()); done += 1
        if done % 200 == 0: print('outline', done, '/', int(want.sum()), flush=True)
    p.stdout.close(); p.wait(); j = k + 1
for _ in range(total - len(fr)): enc.stdin.write(white)
enc.stdin.close(); enc.wait()
print(f'alpha60.mkv: {total} frames, {done} of them the outline')
