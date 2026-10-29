"""Cut the owner out of a reaction clip (Robust Video Matting, temporally consistent), for the reaction-sticker library.
Writes <out>/rgba.mkv: 1080x1920 RGBA (FFV1, lossless) with the room removed; the colour is the model's foreground
estimate, so hair edges carry no wall colour. Plain walls give clean mattes; busy rooms don't.
  python3 -I video/lib/react_matte.py <clip.mp4> <out dir> <model rvm_mobilenetv3_fp32.onnx> [downsample 0.3]"""
import subprocess, sys, os, time
import numpy as np
import onnxruntime as ort

SRC, OUT, MODEL = sys.argv[1:4]
DR = float(sys.argv[4]) if len(sys.argv) > 4 else 0.3
W, H = 1080, 1920
os.makedirs(OUT, exist_ok=True)
so = ort.SessionOptions(); so.intra_op_num_threads = os.cpu_count() or 4
sess = ort.InferenceSession(MODEL, so, providers=['CPUExecutionProvider'])
dec = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-i', SRC, '-vf', f'scale={W}:{H}:flags=lanczos', '-r', '30', '-f', 'rawvideo',
                        '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{W}x{H}', '-r', '30', '-i', '-',
                        '-c:v', 'ffv1', '-pix_fmt', 'bgra', os.path.join(OUT, 'rgba.mkv')], stdin=subprocess.PIPE)
rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4
dr = np.array([DR], np.float32)
n, t0 = 0, time.time()
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3:
        break
    img = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    x = img.transpose(2, 0, 1)[None].astype(np.float32) / 255
    fgr, pha, *rec = sess.run(None, {'src': x, 'r1i': rec[0], 'r2i': rec[1], 'r3i': rec[2], 'r4i': rec[3], 'downsample_ratio': dr})
    a = pha[0, 0]
    a = np.clip((a - 0.04) / 0.92, 0, 1)                       # drop the faint haze the model leaves on the wall
    rgb = np.clip(fgr[0].transpose(1, 2, 0), 0, 1)
    out = np.dstack([(rgb * 255 + .5).astype(np.uint8), (a * 255 + .5).astype(np.uint8)])
    enc.stdin.write(out.tobytes()); n += 1
enc.stdin.close(); enc.wait(); dec.wait()
print(f'{SRC}: {n} frames, {time.time() - t0:.0f} s')
