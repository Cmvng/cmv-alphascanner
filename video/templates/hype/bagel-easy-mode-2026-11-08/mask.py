"""Cut the phone out of Bagel's store art: alpha outside a rounded rectangle (the phone's outer frame)."""
import subprocess, sys, numpy as np
W, H = 1368, 2460; L, R, T, RAD = 12, 1356, 5, 236
for i in range(1, 6):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'page/img/phone{i}.jpg', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    a = np.frombuffer(raw, np.uint8).reshape(H, W, 3)
    y, x = np.mgrid[0:H, 0:W].astype(float)
    cx = np.clip(x, L + RAD, R - RAD); cy = np.clip(y, T + RAD, 1e9)
    d = np.hypot(x - cx, y - cy) - RAD                       # signed distance to the rounded rect (negative inside)
    d = np.where((x >= L) & (x <= R) & (y >= T + RAD), np.maximum(L - x, x - R), d)
    alpha = np.clip(0.5 - d, 0, 1) * 255
    out = np.dstack([a, alpha.astype(np.uint8)])
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{W}x{H}', '-i', '-', '-compression_level', '6', f'page/img/phone{i}.png'], input=out.tobytes(), check=True)
    print(i, 'ok')
