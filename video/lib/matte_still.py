"""Cut a person out of a still photo with Robust Video Matting (the photo is fed a few times so the recurrent state settles).
Used for the Nvidia CEO story (9 Nov) to put giant words behind a free-licence portrait.
  python3 -I matte_still.py <in.jpg> <out.png> <model.onnx> <max height> [downsample]"""
import sys, subprocess, numpy as np, onnxruntime as ort
SRC, OUT, MODEL, MH = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]); DR = float(sys.argv[5]) if len(sys.argv) > 5 else 0.25
w, h = map(int, subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', SRC]).decode().split(',')[:2])
H = min(MH, h) // 4 * 4; W = int(w * H / h) // 4 * 4
raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', SRC, '-vf', f'scale={W}:{H}:flags=lanczos', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
img = np.frombuffer(raw, np.uint8).reshape(H, W, 3)
sess = ort.InferenceSession(MODEL, providers=['CPUExecutionProvider'])
x = img.transpose(2, 0, 1)[None].astype(np.float32) / 255
rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4
for _ in range(6):
    fgr, pha, *rec = sess.run(None, {'src': x, 'r1i': rec[0], 'r2i': rec[1], 'r3i': rec[2], 'r4i': rec[3], 'downsample_ratio': np.array([DR], np.float32)})
a = np.clip((pha[0, 0] - 0.04) / 0.92, 0, 1)
rgb = (np.clip(fgr[0].transpose(1, 2, 0), 0, 1) * 255).astype(np.uint8)
rgba = np.dstack([rgb, (a * 255).astype(np.uint8)])
p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{W}x{H}', '-i', '-', OUT], stdin=subprocess.PIPE)
p.communicate(rgba.tobytes()); print(OUT, W, H)
