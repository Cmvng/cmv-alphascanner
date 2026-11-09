"""Depth map of a picture with Depth Anything v2 (small, ONNX, CPU).  python3 -I depth.py <model.onnx> <in.jpg> <out.png> [long side, multiple of 14]
Writes a 16-bit PNG: near = bright (the model's inverse depth, min-max normalised)."""
import sys, numpy as np, cv2, onnxruntime as ort
model, src, out = sys.argv[1:4]; L = int(sys.argv[4]) if len(sys.argv) > 4 else 1022
im = cv2.cvtColor(cv2.imread(src), cv2.COLOR_BGR2RGB); h, w = im.shape[:2]
s = L / max(h, w); W, H = int(round(w * s / 14)) * 14, int(round(h * s / 14)) * 14
x = cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
x = ((x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]).transpose(2, 0, 1)[None].astype(np.float32)
so = ort.SessionOptions(); so.intra_op_num_threads = 4
d = ort.InferenceSession(model, so, providers=['CPUExecutionProvider']).run(None, {'pixel_values': x})[0][0]
d = (d - d.min()) / (d.max() - d.min() + 1e-9)
cv2.imwrite(out, (d * 65535).astype(np.uint16)); print(out, d.shape)
