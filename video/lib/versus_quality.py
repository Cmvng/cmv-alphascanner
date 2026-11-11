"""Is the edit at least as good as the owner's recording? Measured, before anything is sent.
  python3 -I versus_quality.py <raw.mp4> <final.mp4> <segs.json> [--flip] [--voice <voice-only mix.wav>]

The owner, 11 Nov, after four edits of one recording: "the original quality of the video, the sound of the video was
top quality. But when you made the edit… it was just poor… you are making it worse." Every earlier check compared the
edit with our own targets; none compared it with what the owner sent. This one does, on the things that had dropped:
  frame rate   the edit keeps the recording's frames a second (it had been cut from 60 to 30)
  bitrate      the edit's picture has at least the recording's bitrate
  detail       fine detail on the face is at least 90% of the recording's (it had fallen to about half)
  colour       the face has not moved in lightness or colour (it had come out darker and bluer)
  voice        the voice keeps its rise and fall: loudness range within 1 LU of the same cuts of the raw sound
segs.json: the kept stretches of the recording, [{"s": seconds, "e": seconds}, …], in order. --flip if the edit mirrors
the picture. A FAIL means the video does not go out. This is measurement, not eyes or ears: still look, and say so."""
import json, re, subprocess, sys
import cv2, numpy as np
RAW, FIN, SEGS = sys.argv[1:4]
FLIP = '--flip' in sys.argv
VOICE = sys.argv[sys.argv.index('--voice') + 1] if '--voice' in sys.argv else None
segs = json.load(open(SEGS)); fails = 0
def say(ok, text):
    global fails
    fails += 0 if ok else 1; print(('ok    ' if ok else 'FAIL  ') + text)
def probe(path, sel, key):
    o = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', sel, '-show_entries', f'stream={key}', '-of', 'csv=p=0', path]).decode().strip().split('\n')[0].strip(',')
    return o
def fps(path):
    a, b = probe(path, 'v:0', 'avg_frame_rate').split('/'); return float(a) / float(b)
fr, ff = fps(RAW), fps(FIN)
say(abs(fr - ff) < .5, f'frame rate: the recording {fr:.2f}, the edit {ff:.2f} frames a second')
br, bf = float(probe(RAW, 'v:0', 'bit_rate')) / 1e6, float(probe(FIN, 'v:0', 'bit_rate')) / 1e6
say(bf >= br * .98, f'picture bitrate: the recording {br:.1f}, the edit {bf:.1f} Mbit/s')
tab, acc = [], 0.0
for g in segs: tab.append((acc, acc + g['e'] - g['s'], g['s'])); acc += g['e'] - g['s']
def raw_t(t):
    for a, b, s in tab:
        if a <= t < b: return s + (t - a)
def grab(path, t):
    w, h = int(probe(path, 'v:0', 'width')), int(probe(path, 'v:0', 'height'))
    r = subprocess.check_output(['ffmpeg', '-nostdin', '-v', 'error', '-ss', f'{t:.4f}', '-i', path, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'])
    return np.frombuffer(r, np.uint8).reshape(h, w, 3)
det, col = [], []
for i in range(12):
    t = acc * (i + .5) / 12
    a, b = grab(RAW, raw_t(t)), grab(FIN, t)
    if FLIP: a = cv2.flip(a, 1)
    h, w = a.shape[:2]; y0, y1, x0, x1 = int(.38 * h), int(.62 * h), int(.36 * w), int(.64 * w)      # the middle of the frame: the face, clear of graphics
    ca, cb = a[y0:y1, x0:x1], b[y0:y1, x0:x1]
    la = cv2.Laplacian(cv2.cvtColor(ca, cv2.COLOR_BGR2GRAY), cv2.CV_32F).var(); lb = cv2.Laplacian(cv2.cvtColor(cb, cv2.COLOR_BGR2GRAY), cv2.CV_32F).var()
    det.append(lb / max(la, 1e-6))
    col.append(cv2.cvtColor(cb, cv2.COLOR_BGR2LAB).reshape(-1, 3).mean(0) - cv2.cvtColor(ca, cv2.COLOR_BGR2LAB).reshape(-1, 3).mean(0))
d = float(np.median(det)); c = np.median(np.array(col), 0)
say(d >= .9, f'fine detail on the face: {d * 100:.0f}% of the recording (lowest of twelve moments {min(det) * 100:.0f}%)')
say(float(np.abs(c).max()) < 2, f'colour on the face against the recording: lightness {c[0]:+.1f}, green-red {c[1]:+.1f}, blue-yellow {c[2]:+.1f} (within 2 is no visible shift)')
def lra(args):
    o = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', *args, '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'LRA:\s+(-?[\d.]+) LU', o)[-1])
if VOICE:
    n = len(segs); f = ';'.join(f"[0:a]atrim={g['s']:.4f}:{g['e']:.4f},asetpts=PTS-STARTPTS[a{i}]" for i, g in enumerate(segs)) + ';' + ''.join(f'[a{i}]' for i in range(n)) + f'concat=n={n}:v=0:a=1,ebur128[o]'
    lr = lra(['-i', RAW, '-filter_complex', f, '-map', '[o]']); lv = lra(['-t', f'{acc:.3f}', '-i', VOICE, '-af', 'ebur128'])
    say(abs(lr - lv) <= 1, f"voice: loudness range {lv:.1f} LU in the edit, {lr:.1f} LU in the same cuts of the recording")
print(f'\n{fails} FAIL'); sys.exit(1 if fails else 0)
