"""Blur a bit of the room that stayed sharp beside the owner's hair (the outline took it for part of them).
  python3 -I patch_room.py <work dir> <first frame> <last frame> <centre x> <centre y> <radius x> <radius y>
  -> <work>/patch/p_NNN.png and <work>/patch.json; then run build_av.py again (it lays the patches on the picture).

Found on 11 Nov by watching the first second frame by frame: a striped fitting on the wall passed behind the hair and
was kept sharp for 19 frames while the rest of the room is softly out of focus. Inside an ellipse round it, every
pixel that is NOT the owner (their hair is found as the large dark mass; thin dark lines are not hair) is replaced by
a smooth blur of the room around it. The owner's own pixels are never touched. Frames are numbers in base.mp4."""
import json, os, subprocess, sys
import cv2, numpy as np
K = sys.argv[1]; F0, F1, CX, CY, RX, RY = [int(x) for x in sys.argv[2:8]]
X0, Y0, W, H = CX - RX - 40, CY - RY - 40, 2 * RX + 80, 2 * RY + 80
os.makedirs(f'{K}/patch', exist_ok=True)
n = F1 - F0 + 1
raw = subprocess.check_output(['ffmpeg', '-nostdin', '-v', 'error', '-ss', f'{max(F0 - 0.5, 0) / 30:.5f}', '-i', f'{K}/base.mp4', '-frames:v', str(n),
                               '-vf', f'crop={W}:{H}:{X0}:{Y0}', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'])
fr = np.frombuffer(raw, np.uint8).reshape(n, H, W, 3)
yy, xx = np.mgrid[0:H, 0:W]
ell = np.clip(1.25 - np.sqrt(((xx - (CX - X0)) / RX) ** 2 + ((yy - (CY - Y0)) / RY) ** 2), 0, .25) / .25      # 1 inside, soft edge
for i in range(n):
    f = fr[i].astype(np.float32); g = cv2.cvtColor(fr[i], cv2.COLOR_BGR2GRAY)
    dark = cv2.morphologyEx((g < 52).astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17)))   # the hair: a large dark mass
    num, lab, st, _ = cv2.connectedComponentsWithStats(dark)
    hair = (lab == (1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])))) if num > 1 else np.zeros_like(dark, bool)
    hair = cv2.dilate(hair.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))) > 0
    room = (~hair).astype(np.float32)
    blur = cv2.GaussianBlur(f * room[..., None], (0, 0), 13) / np.maximum(cv2.GaussianBlur(room, (0, 0), 13), 1e-3)[..., None]   # the room only, smoothed
    a = ell * cv2.GaussianBlur(room, (0, 0), 1.5) * (cv2.erode(room, np.ones((3, 3), np.uint8)))
    ramp = min(1, (i + 1) / 2, (n - i) / 2)                                                                     # ease in and out over two frames
    rgba = np.dstack([np.clip(blur, 0, 255), np.clip(a * ramp * 255, 0, 255)]).astype(np.uint8)
    cv2.imwrite(f'{K}/patch/p_{i:03d}.png', rgba)
json.dump(dict(x=X0, y=Y0, start=F0, count=n), open(f'{K}/patch.json', 'w'))
print(f'{n} patches, frames {F0}-{F1}, at ({X0},{Y0}) {W}x{H}')
