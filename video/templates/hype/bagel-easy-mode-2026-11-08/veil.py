"""A clean wallpaper patch behind the four notification cards on Bagel's Notification Center screenshot (phone4.png),
so the cards can pop in one per beat (at rest the screen is Bagel's own). Rows above and below the cards, blended.
  python3 -I veil.py   (run in the work dir; writes page/img/notif_veil.png)"""
import subprocess, numpy as np
W, H = 1368, 2460
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'page/img/phone4.png', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
a = np.frombuffer(raw, np.uint8).reshape(H, W, 3).astype(float)
x0, x1, y0, y1 = 100, 1270, 1040, 2130
top = a[y0 - 6:y0, x0:x1].mean(0); bot = a[y1:y1 + 6, x0:x1].mean(0)
u = np.linspace(0, 1, y1 - y0)[:, None, None]
p = top[None] * (1 - u) + bot[None] * u
k = 81; c = np.cumsum(np.pad(p, ((0, 0), (k // 2 + 1, k // 2), (0, 0)), mode='edge'), axis=1)      # soften the column streaks (the
p = (c[:, k:] - c[:, :-k]) / k                                                                    # slot left empty stays on screen)
p += np.random.default_rng(1).normal(0, 1.2, p.shape)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{x1 - x0}x{y1 - y0}', '-i', '-', 'page/img/notif_veil.png'],
               input=np.clip(p, 0, 255).astype(np.uint8).tobytes(), check=True)
