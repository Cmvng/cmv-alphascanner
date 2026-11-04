"""The hype cut: the owner's original footage cut to the soundtrack, with beat effects and a text layer, one encode.
python3 -I hype.py <spec.json> <out.mp4> [--from t0 --to t1] [--stills t,t,...  <dir>]

Spec (times in seconds of the finished video):
  {"W": 1920, "H": 1080, "fps": 30, "total": 48.0, "audio": "track.wav", "audio_in": 0.0, "audio_fade": [47.4, 0.6],
   "sources": {"s1": "session1.mp4", ...}, "text": "<dir of RGBA PNG frames 00000.png …>" (optional),
   "shots": [
     {"t0": 0.0, "t1": 1.2, "src": "s1", "a": 10.0, "b": 12.4,       # source range played over the shot
      "map": [[0, 0], [0.5, 0.8], [1, 1]],                            # optional time map (output fraction -> source fraction): a speed ramp
      "fit": "cover" | "contain",  "focus": [0.5, 0.5],               # cover = fill 16:9 (crop round focus), contain = whole frame on black
      "zoom": [1.0, 1.12], "zease": "out",                            # a punch-in across the shot (never past the source's own pixels)
      "fx": [{"k": "neg", "t0": 0.0, "t1": 0.034}, {"k": "flash", "t0": .., "t1": ..}, {"k": "rgb", ...}, {"k": "shake", ...},
             {"k": "whip", "t0": .., "t1": .., "dir": 1}]},
     {"t0": 1.2, "t1": 2.0, "black": true}]}
The footage keeps its own colour: frames go yuv -> rgb -> yuv with the source's own matrix, nothing else, unless an
effect is asked for on that frame."""
import json, math, os, subprocess, sys
import numpy as np
from PIL import Image

args = sys.argv[1:]
spec = json.load(open(args[0])); OUT = args[1]
W, H, FPS = spec.get('W', 1920), spec.get('H', 1080), spec.get('fps', 30)
TOTAL = spec['total']
f_from = int(round(float(args[args.index('--from') + 1]) * FPS)) if '--from' in args else 0
f_to = int(round(float(args[args.index('--to') + 1]) * FPS)) if '--to' in args else int(round(TOTAL * FPS))
stills = [float(x) for x in args[args.index('--stills') + 1].split(',')] if '--stills' in args else None
SDIR = args[args.index('--stills') + 2] if stills else None

def probe(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                        'stream=width,height,r_frame_rate,avg_frame_rate,color_space,color_transfer,color_primaries:stream_side_data=rotation:stream_tags=rotate',
                        '-of', 'json', p], capture_output=True, text=True, check=True)
    s = json.loads(r.stdout)['streams'][0]
    rot = 0
    for sd in s.get('side_data_list', []) or []:
        if 'rotation' in sd: rot = int(sd['rotation'])
    if 'tags' in s and 'rotate' in s['tags']: rot = -int(s['tags']['rotate'])
    w, h = s['width'], s['height']
    if abs(rot) % 180 == 90: w, h = h, w                     # ffmpeg autorotates on decode
    num, den = map(int, (s.get('r_frame_rate') or '30/1').split('/'))
    return {'w': w, 'h': h, 'fps': num / den if den else 30.0, 'matrix': s.get('color_space') or 'bt709',
            'trc': s.get('color_transfer') or '', 'prim': s.get('color_primaries') or ''}

SRC = {k: {'path': v, **probe(v)} for k, v in spec['sources'].items()}
for k, s in SRC.items():
    if s['trc'] in ('arib-std-b67', 'smpte2084'): print(f'WARNING {k}: HDR ({s["trc"]}); it needs a tone map before it can be cut untouched in SDR')

def ease(u, kind):
    u = min(1.0, max(0.0, u))
    if kind == 'in': return u * u * u
    if kind == 'out': return 1 - (1 - u) ** 3
    if kind == 'inout': return 4 * u ** 3 if u < .5 else 1 - (-2 * u + 2) ** 3 / 2
    return u

def tmap(sh, u):
    m = sh.get('map')
    if not m: return sh['a'] + (sh['b'] - sh['a']) * u
    for (u0, v0), (u1, v1) in zip(m, m[1:]):
        if u <= u1 or (u1, v1) == tuple(m[-1]):
            k = 0 if u1 == u0 else (u - u0) / (u1 - u0)
            return sh['a'] + (sh['b'] - sh['a']) * (v0 + (v1 - v0) * min(1, max(0, k)))

def window(sh, s):
    """the source rectangle shown at zoom 1, as (x, y, w, h) in source px"""
    sw, shh = s['w'], s['h']
    if sh.get('fit', 'cover') == 'contain': return (0.0, 0.0, float(sw), float(shh))
    if sw / shh > W / H: wh = (shh * W / H, float(shh))
    else: wh = (float(sw), sw * H / W)
    fx, fy = sh.get('focus', [0.5, 0.5])
    x = min(max(0, fx * sw - wh[0] / 2), sw - wh[0]); y = min(max(0, fy * shh - wh[1] / 2), shh - wh[1])
    return (x, y, wh[0], wh[1])

class Reader:
    """streams one shot's source range as RGB frames at the source's own rate, cropped to its window and scaled
    once to the resolution the shot needs (enough for its deepest zoom, never more than the source has)"""
    def __init__(self, sh):
        s = SRC[sh['src']]; self.s = s
        x, y, w, h = window(sh, s); self.win = (x, y, w, h)
        zmax = max(sh.get('zoom', [1, 1]))
        need = (min(W / w, H / h) if sh.get('fit', 'cover') == 'contain' else W / w) * zmax
        sc = min(1.0, need)                                            # scale down to what the deepest zoom needs; never up here
        self.ow, self.oh = max(2, int(round(w * sc / 2)) * 2), max(2, int(round(h * sc / 2)) * 2)
        times = [tmap(sh, (f / FPS - sh['t0']) / (sh['t1'] - sh['t0'])) for f in range(int(round(sh['t0'] * FPS)), int(round(sh['t1'] * FPS)))] or [sh['a']]
        self.lo, hi = max(0.0, min(times)), max(times)
        # decode only the frames the shot can show: the source rate for real time and slow motion, fewer for fast
        # shots, and keyframes only for a rush (a whole session in a second)
        speed = (hi - self.lo) / max(1e-6, sh['t1'] - sh['t0'])
        self.r = s['fps'] if (speed <= 1.05 or sh.get('map')) and speed < 6 else min(s['fps'], FPS / speed)
        self.keys = 1 / self.r > 1.5
        m = {'bt709': 'bt709', 'smpte170m': 'bt601', 'bt470bg': 'bt601', 'bt2020nc': 'bt2020'}.get(s['matrix'], 'bt709')
        vf = (f"fps={self.r:.6f},crop={int(w)}:{int(h)}:{int(x)}:{int(y)},"
              f"scale={self.ow}:{self.oh}:flags=lanczos+accurate_rnd+full_chroma_int:in_color_matrix={m}:out_color_matrix={m},format=rgb24")
        self.p = subprocess.Popen(['ffmpeg', '-v', 'fatal'] + (['-skip_frame', 'nokey'] if self.keys else []) + ['-ss', f'{self.lo:.4f}', '-i', s['path'], '-t', f'{hi - self.lo + 3 / self.r:.4f}',
                                   '-vf', vf, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
        self.k, self.cur = -1, None
        self.nb = self.ow * self.oh * 3
    def at(self, t):
        want = max(0, int(round((t - self.lo) * self.r)))
        if self.cur is not None and want < self.k: want = self.k          # time maps only run forward (holds are fine)
        while self.k < want:
            b = self.p.stdout.read(self.nb)
            if len(b) < self.nb: break                                     # end of range: keep the last frame
            self.cur = np.frombuffer(b, np.uint8).reshape(self.oh, self.ow, 3); self.k += 1
        return self.cur
    def close(self):
        try: self.p.stdout.close(); self.p.kill()
        except Exception: pass

def fxamt(sh, k, t):
    for e in sh.get('fx', []):
        if e['k'] == k and sh['t0'] + e['t0'] <= t < sh['t0'] + e['t1']:
            return e, (t - sh['t0'] - e['t0']) / max(1e-6, e['t1'] - e['t0'])
    return None, 0

def shift_x(a, n):
    """shift columns by n px, repeating the edge column (no wrap-around)"""
    if n == 0: return a
    idx = np.clip(np.arange(a.shape[1]) - n, 0, a.shape[1] - 1)
    return a[:, idx]
def render_shot_frame(sh, rd, t):
    u = (t - sh['t0']) / (sh['t1'] - sh['t0'])
    img = rd.at(tmap(sh, u))
    if img is None: return np.zeros((H, W, 3), np.uint8)
    z0, z1 = sh.get('zoom', [1, 1]); z = z0 + (z1 - z0) * ease(u, sh.get('zease', 'out'))
    fx, fy = 0.5, 0.5
    e, p = fxamt(sh, 'shake', t)
    dx = dy = 0.0
    if e:
        a = e.get('amp', 14) * (1 - p) ** 2
        dx, dy = a * math.sin(p * 37), a * math.cos(p * 29)
    ih, iw = img.shape[:2]
    im = Image.fromarray(img)
    if sh.get('fit', 'cover') == 'contain':
        sc = min(W / iw, H / ih) * z
        nw, nh = iw * sc, ih * sc
        frame = Image.new('RGB', (W, H))
        frame.paste(im.resize((max(1, int(round(nw))), max(1, int(round(nh)))), Image.LANCZOS), (int(round((W - nw) / 2 + dx)), int(round((H - nh) / 2 + dy))))
        out = np.asarray(frame)
    else:
        bw, bh = iw / z, ih / z
        bx = (iw - bw) * fx + dx * iw / W; by = (ih - bh) * fy + dy * ih / H
        bx = min(max(0, bx), iw - bw); by = min(max(0, by), ih - bh)
        if abs(z - 1) < 1e-6 and (iw, ih) == (W, H) and dx == dy == 0: out = img
        else: out = np.asarray(im.resize((W, H), Image.LANCZOS, box=(bx, by, bx + bw, by + bh)))
    out = out.astype(np.int16) if any(fxamt(sh, k, t)[0] for k in ('neg', 'flash', 'rgb', 'whip')) else out
    e, p = fxamt(sh, 'whip', t)
    if e:                                   # horizontal motion blur that builds then clears, with the frame sliding
        s = e.get('amp', 160) * math.sin(math.pi * p); d = e.get('dir', 1)
        acc = np.zeros_like(out, np.int32)
        K = 9
        for i in range(K):
            acc += shift_x(out, int(d * s * (i / (K - 1) - .5) + d * s * .5))
        out = (acc // K).astype(np.int16)
    e, p = fxamt(sh, 'rgb', t)
    if e:                                   # RGB split plus a few torn bands, fading over the effect
        a = e.get('amp', 18) * (1 - p)
        o = out.copy()
        o[..., 0] = shift_x(out[..., 0], int(round(a))); o[..., 2] = shift_x(out[..., 2], -int(round(a)))
        r2 = np.random.default_rng(int(t * 1000))
        for _ in range(5):
            y0 = int(r2.integers(0, H - 40)); hh = int(r2.integers(8, 60))
            o[y0:y0 + hh] = shift_x(o[y0:y0 + hh], int(r2.integers(-1, 2) * a * 2.5))
        out = o
    e, p = fxamt(sh, 'neg', t)
    if e: out = 255 - out
    e, p = fxamt(sh, 'flash', t)
    if e:
        a = e.get('amp', 1.0) * (1 - p)
        out = out + (255 - out) * a
    return np.clip(out, 0, 255).astype(np.uint8) if out.dtype != np.uint8 else out

def text_frame(f):
    d = spec.get('text')
    if not d: return None
    p = os.path.join(d, f'{f:05d}.png')
    return np.asarray(Image.open(p).convert('RGBA')) if os.path.exists(p) else None

def frames():
    shots = sorted(spec['shots'], key=lambda s: s['t0'])
    want = set(int(round(t * FPS)) for t in stills) if stills else None
    cur, rd = None, None
    for f in range(f_from, f_to):
        if want is not None and f not in want: continue
        t = f / FPS
        sh = next((s for s in shots if s['t0'] - 1e-6 <= t < s['t1'] - 1e-6), None)
        if sh is not cur:
            if rd: rd.close()
            rd = None if (sh is None or sh.get('black')) else Reader(sh)
            cur = sh
        img = np.zeros((H, W, 3), np.uint8) if rd is None else render_shot_frame(sh, rd, t)
        tx = text_frame(f)
        if tx is not None:
            a = tx[..., 3:4].astype(np.float32) / 255
            if a.max() > 0: img = (img * (1 - a) + tx[..., :3] * a + .5).astype(np.uint8)
        yield f, img
    if rd: rd.close()

if stills:
    os.makedirs(SDIR, exist_ok=True)
    for f, img in frames(): Image.fromarray(img).save(f'{SDIR}/still_{f / FPS:.2f}.png')
    sys.exit(0)

t_a, t_b = f_from / FPS, f_to / FPS
af = spec.get('audio_fade', [TOTAL - .5, .4])
enc = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-']
if spec.get('audio'):
    enc += ['-ss', f'{spec.get("audio_in", 0) + t_a:.4f}', '-i', spec['audio'], '-af',
            f'afade=t=out:st={af[0] - t_a:.3f}:d={af[1]},apad=whole_dur={t_b - t_a:.3f},atrim=0:{t_b - t_a:.3f}', '-c:a', 'aac', '-b:a', '256k']
enc += ['-t', f'{t_b - t_a:.3f}', '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p',
        '-c:v', 'libx264', '-preset', spec.get('preset', 'slow'), '-crf', str(spec.get('crf', 14)), '-pix_fmt', 'yuv420p',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-r', str(FPS), '-movflags', '+faststart', OUT]
p = subprocess.Popen(enc, stdin=subprocess.PIPE)
n = 0
for f, img in frames():
    p.stdin.write(img.tobytes()); n += 1
    if n % 300 == 0: print('frame', f, flush=True)
p.stdin.close(); p.wait()
print('done', n, 'frames', OUT, 'exit', p.returncode)
