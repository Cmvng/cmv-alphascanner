"""Take what is NOT the owner out of the outline, round the top of the head.
  python3 -I clean_alpha.py <work dir> [size=181]      alpha60.mkv -> alpha60c.mkv

The outline (matte60.py) sometimes takes a thing on the wall for part of the owner when it touches the hair in the
picture: on 11 Nov a striped wall fitting beside the hair. Wherever a graphic sat behind the head there, the fitting
showed THROUGH the graphic: a grey bump on the hair against the Primus plate, dark stripes over the coin of a chip.
It was only seen by looking at the hair edge at full size across each graphic's whole time on screen.
The head is wide and round; such a thing is narrow. So, from the top of the head down to just above the ears, the
outline is "opened" with a disc (anything the disc does not fit into is dropped). Below that line (ears, fingers,
shoulders) the outline is left exactly as it was. Frames that are all white (no graphic behind the head) pass through.
A raised finger or a bottle held beside the top of the head is narrow too and would be dropped with it (a graphic
would then pass in front of it): look at stills wherever a hand is that high while a graphic is behind the head."""
import subprocess, sys
import cv2, numpy as np
K = sys.argv[1]; SIZE = int(sys.argv[2]) if len(sys.argv) > 2 else 181
W, H, DOWN, FADE = 1080, 1920, 180, 40
rd = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-i', f'{K}/alpha60.mkv', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], stdout=subprocess.PIPE, bufsize=W * H * 4)
import json
RATE = json.load(open(f'{K}/plan.json')).get('fps', 60)
wr = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', f'{W}x{H}', '-r', str(RATE), '-i', '-', '-c:v', 'ffv1', '-level', '3', '-g', '1', f'{K}/alpha60c.mkv'], stdin=subprocess.PIPE)
Q = 4; ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (SIZE // Q | 1, SIZE // Q | 1)); EDGE = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)); n = changed = 0; worst = (0, 0)
while True:
    b = rd.stdout.read(W * H)
    if len(b) < W * H: break
    a = np.frombuffer(b, np.uint8).reshape(H, W)
    if a.min() < 250:                                             # a frame with an outline
        top_rows = np.where((a > 128).sum(1) >= 60)[0]
        if len(top_rows):
            top = int(top_rows[0]); y1 = min(H, top + DOWN + FADE); y0 = max(0, top - SIZE)
            roi = a[y0:min(H, y1 + SIZE)]
            # the solid part of the outline, opened; then the outline may reach only a few pixels beyond it. (Opening the
            # soft outline itself left a grey smudge where the thing had been: it is wide where it is faint.)
            # (done at a quarter of the size: a disc this big takes minutes a frame at full size, and the limit only has to be right to a few pixels)
            small = cv2.resize(((roi > 128) * 255).astype(np.uint8), (W // Q, roi.shape[0] // Q), interpolation=cv2.INTER_AREA)
            core = cv2.resize(cv2.morphologyEx(small, cv2.MORPH_OPEN, ker), (W, roi.shape[0]), interpolation=cv2.INTER_LINEAR)
            lim = cv2.GaussianBlur(cv2.dilate(((core > 128) * 255).astype(np.uint8), EDGE), (0, 0), 2.5)
            op = np.minimum(roi, lim)[:y1 - y0]
            w = np.ones(y1 - y0, np.float32); w[-FADE:] = np.linspace(1, 0, FADE)          # ease back to the untouched outline
            new = (op.astype(np.float32) * w[:, None] + a[y0:y1].astype(np.float32) * (1 - w[:, None])).round().astype(np.uint8)
            d = int((a[y0:y1].astype(np.int16) - new > 64).sum())
            if d:
                changed += 1
                if d > worst[0]: worst = (d, n)
                a = a.copy(); a[y0:y1] = new
            a = a.copy(); a[:y0] = np.minimum(a[:y0], 0) if top > 0 else a[:y0]            # nothing of the owner is above the top of the head
    wr.stdin.write(a.tobytes()); n += 1
wr.stdin.close(); wr.wait()
print(f'{n} frames; {changed} had something taken out; the most on frame {worst[1]} ({worst[1] / RATE:.2f} s): {worst[0]} px')
