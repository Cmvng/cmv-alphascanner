"""The 'pro' look of portrait_pro.py (9 Nov) for a whole recording that is being cut. portrait_pro.py holds every
matte in memory and draws one frame at a time, which is fine for a few seconds; this does the same look in steps that
keep to disk and run in parallel, and it draws only the frames the cut keeps.

  python3 -I portrait_pro_long.py prep    <raw.mp4> <work>                      -> pp_src.mp4 (30 fps, working size, denoised)
  python3 -I portrait_pro_long.py matte   <work> <rvm.onnx> [first n frames]    -> pp_alpha.mkv, pp_track.npz
  python3 -I portrait_pro_long.py preview <work> <segs.json> <out dir> t,t,... [look]  (output seconds; needs matte)
  python3 -I portrait_pro_long.py render  <work> <segs.json> <out.mp4> [workers=4] [look]

Two looks:
  room    (the default since 11 Nov) the owner's REAL room, softly out of focus behind them, as a lens would do it.
          Nothing is replaced. The matte only decides what stays sharp, and it is closed and feathered first, so a
          fast hand that the matte misses is at worst a little soft, never a block or a pasted edge.
  studio  the 9 Nov look: the room replaced by a smooth blue backdrop. Only for a calm speaker in front of a plain
          wall. On 11 Nov, with the owner close to the lens, waving and holding a bottle, it broke into blocks on every
          fast hand and the owner called it "the worst video ever… the way you cut the main character from the
          background… so muddled up. Is it not even better for you to actually blur all the elements in the background".

segs.json is the cut: [{"s": source s, "e": source s, "zoom": 1.0 | 1.05}, ...] in output order. The picture is
drawn at 1080x1920 from a 1224x2176 working copy, so the push-in and the punch-ins never go past the source's pixels.

The look (the settings that passed the full-size check on 9 Nov, scaled to the working size):
  - the room: a lens blur computed without the person (no halo), bright points bloom; then most of it blurred far wider,
    so marks on a plain wall go and the room's own light is left as a smooth backdrop; less colour, cooler, a wash of
    the house blue and a soft glow behind the head;
  - the person: shadows up a touch, a soft key from camera-left, warm skin, local contrast, forehead shine rolled off,
    a thin cool rim on the far edge;
  - framing: the crop rides a smoothed track of the head (which steadies a hand-held phone), a slow push-in from Z0 to
    Z1 over the video, the top of the head kept at TOPF of the frame height so cards fit above it.
No vignette, no grain, no stylised grade."""
import json, os, subprocess, sys
import numpy as np

WK, HK, OW, OH, FPS = 1224, 2176, 1080, 1920, 30
Z0, Z1, TOPF = 1.035, 1.075, 0.285
WIDE, EVEN, BG_GAIN, WASH, GLOW = 0.78, 0.62, 1.15, 0.18, 0.10   # the backdrop: share of the wide blur, how even, level, blue wash, glow
SC = WK / 1080                                                   # the 9 Nov sizes were tuned at 1080 wide


def reader(path, f0, n, pix, size, vf=None):
    ss = [] if f0 <= 0 else ['-ss', f'{(f0 - 0.5) / FPS:.5f}']
    cmd = ['ffmpeg', '-v', 'error', '-threads', '2'] + ss + ['-i', path] + (['-vf', vf] if vf else []) + ['-frames:v', str(n), '-f', 'rawvideo', '-pix_fmt', pix, '-']
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    for _ in range(n):
        b = p.stdout.read(size)
        if len(b) < size: break
        yield b
    p.stdout.close(); p.wait()


def count(path):
    return int(subprocess.check_output(['ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', path]).decode().strip().strip(','))


def prep(raw, K):
    # deblock first: a phone or CapCut export breaks fast hands into 8 px blocks, and any sharpening later makes them
    # worse (11 Nov). Then a temporal denoise, so the sharpening does not lift the phone's grain
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', raw, '-an', '-vf',
                    f'deblock=filter=strong:block=8:alpha=0.25:beta=0.25:gamma=0.25:delta=0.25,fps={FPS},scale={WK}:{HK}:flags=lanczos,hqdn3d=1.3:1.1:3:3',
                    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '10', '-g', '30', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709',
                    '-color_trc', 'bt709', f'{K}/pp_src.mp4'], check=True)
    print('pp_src.mp4:', count(f'{K}/pp_src.mp4'), 'frames')


def smooth(v, k=31):
    v = np.asarray(v, np.float64); w = np.hanning(k); w /= w.sum(); p = k // 2
    return np.convolve(np.pad(v, p, mode='edge'), w, mode='valid')


def track_of(a):
    rows = np.where((a > .5).mean(axis=1) > .06)[0]
    t0 = int(rows[0]) if len(rows) else HK // 3
    band = a[t0:t0 + int(320 * SC)] > .5
    xs = np.where(band.any(axis=0))[0]
    return t0, float((band * np.arange(WK)).sum() / max(band.sum(), 1)), float(xs[-1] - xs[0]) if len(xs) else WK / 2


def matte(K, model, limit=0):
    import onnxruntime as ort
    so = ort.SessionOptions(); so.intra_op_num_threads = os.cpu_count() or 4
    sess = ort.InferenceSession(model, so, providers=['CPUExecutionProvider'])
    N = count(f'{K}/pp_src.mp4')
    if limit: N = min(N, limit)                                  # a short test before the long pass
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', f'{WK}x{HK}', '-r', str(FPS), '-i', '-',
                            '-c:v', 'ffv1', '-level', '3', '-g', '1', '-pix_fmt', 'gray', f'{K}/pp_alpha.mkv'], stdin=subprocess.PIPE)
    rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4; dr = np.array([0.27], np.float32)
    top, cx, hw, bgsum, bgn = [], [], [], np.zeros(3), 0.0
    for i, b in enumerate(reader(f'{K}/pp_src.mp4', 0, N, 'rgb24', WK * HK * 3)):
        img = np.frombuffer(b, np.uint8).reshape(HK, WK, 3)
        x = img.transpose(2, 0, 1)[None].astype(np.float32) / 255
        fgr, pha, *rec = sess.run(None, {'src': x, 'r1i': rec[0], 'r2i': rec[1], 'r3i': rec[2], 'r4i': rec[3], 'downsample_ratio': dr})
        a = np.clip((pha[0, 0] - 0.04) / 0.92, 0, 1).astype(np.float32)
        enc.stdin.write((a * 255).astype(np.uint8).tobytes())
        t0, c, w = track_of(a); top.append(t0); cx.append(c); hw.append(w)
        if i % 15 == 0:
            m = (a < .02) & (img.mean(axis=2) > 60) & (img.mean(axis=2) < 245)
            bgsum += img[m].reshape(-1, 3).sum(axis=0); bgn += m.sum()
        if i % 300 == 0: print('matte', i, '/', N, flush=True)
    enc.stdin.close(); enc.wait()
    avg = bgsum / max(bgn, 1); gain = (avg.mean() / avg) ** .7; gain = gain / gain.max()
    np.savez(f'{K}/pp_track.npz', top_raw=np.array(top), cx_raw=np.array(cx), hw_raw=np.array(hw),
             top=smooth(top), cx=smooth(cx), hw=smooth(np.minimum(hw, WK * .8), 45), gain=gain)
    print(f'{len(top)} frames; head top {min(top)}-{max(top)}, centre x {min(cx):.0f}-{max(cx):.0f}; WB gains {gain.round(3)}; alpha frames {count(K + "/pp_alpha.mkv")}')


class Look:
    def __init__(self, K, look='room'):
        import cv2
        self.cv2 = cv2
        self.look = look
        cv2.setNumThreads(1)
        t = np.load(f'{K}/pp_track.npz')
        self.top, self.cx, self.hw, self.gain = t['top'], t['cx'], t['hw'], t['gain'].astype(np.float32)
        R = int(round(13 * SC))                                  # bokeh radius on the third-size copy (~39 px at 1080)
        yy, xx = np.mgrid[-R:R + 1, -R:R + 1]
        self.disc = ((xx * xx + yy * yy) <= R * R).astype(np.float32); self.disc /= self.disc.sum()
        self.gy, self.gx = np.mgrid[0:HK, 0:WK].astype(np.float32)
        self.BLUE = np.array([0.31, 0.62, 0.95], np.float32)     # house sky blue (#4FB3FF), as a light wash
        self.kd = int(round(35 * SC)) | 1; self.ke = int(round(13 * SC)) | 1
        r = int(round(6 * SC))                                   # the room look's lens: a disc of about 19 px at 1080
        yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
        self.disc_room = ((xx * xx + yy * yy) <= r * r).astype(np.float32); self.disc_room /= self.disc_room.sum()
        kc = int(round(21 * SC)) | 1
        self.k_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kc, kc))
        self.k_hold = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(round(13 * SC)) | 1,) * 2)

    def frame(self, img, alpha, f, zt):
        return self.frame_room(img, alpha, f, zt) if self.look == 'room' else self.frame_studio(img, alpha, f, zt)

    def crop(self, out, f, zt, sharp=.25):
        cv2 = self.cv2
        cw, ch = WK / zt, HK / zt
        x0 = np.clip(self.cx[f] - cw / 2, 0, WK - cw); y0 = np.clip(self.top[f] - TOPF * ch, 0, HK - ch)
        s = OW / cw
        M = np.array([[s, 0, -x0 * s], [0, s, -y0 * s]], np.float32)
        out = cv2.warpAffine(out, M, (OW, OH), flags=cv2.INTER_AREA if s < .95 else cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
        out = np.clip(out + sharp * (out - cv2.GaussianBlur(out, (0, 0), 1.2)), 0, 1)
        return (out * 255 + .5).astype(np.uint8)

    def frame_room(self, img, alpha, f, zt):
        """The real room, out of focus behind the owner. Nothing is replaced and nothing is lit by the matte: where the
        matte is wrong, the worst that happens is a patch that is a little too soft or a little too sharp."""
        cv2 = self.cv2
        a = alpha.astype(np.float32) / 255
        x = img.astype(np.float32) / 255 * self.gain
        k3 = 1 / 3
        small = lambda z: cv2.resize(z, None, fx=k3, fy=k3, interpolation=cv2.INTER_AREA)
        big = lambda z: cv2.resize(z, (WK, HK), interpolation=cv2.INTER_LINEAR)
        # what stays sharp: the matte with its holes and blocks closed, grown a little, then feathered
        # (no growing and no darkening of the room: either one draws an outline round the owner, a cut-out again)
        m = cv2.morphologyEx(a, cv2.MORPH_CLOSE, self.k_close)
        m = np.clip(cv2.GaussianBlur(m, (0, 0), 2.6 * SC), 0, 1)[..., None]
        # the room through a wider lens: a disc blur worked out WITHOUT the person, so no colour of theirs leaks into it.
        # Close to the person the disc finds no room at all; there the room is carried in from further out by two wider
        # blurs that also leave the person out. (A plain blur of the whole frame as the fall-back put a dark ring of
        # hair and skin round the head: the cut-out look again.)
        hold = cv2.dilate((a > .03).astype(np.uint8), self.k_hold).astype(np.float32)
        wgt = small(1 - hold)
        sfh = small(x + 1.2 * np.maximum(x - .82, 0))            # the ceiling lights open into soft discs
        sw = sfh * wgt[..., None]
        n1 = cv2.filter2D(sw, -1, self.disc_room); d1 = cv2.filter2D(wgt, -1, self.disc_room)[..., None]
        n2 = cv2.GaussianBlur(sw, (0, 0), 9 * SC); d2 = cv2.GaussianBlur(wgt, (0, 0), 9 * SC)[..., None]
        n3 = cv2.GaussianBlur(sw, (0, 0), 30 * SC); d3 = cv2.GaussianBlur(wgt, (0, 0), 30 * SC)[..., None]
        b3 = n3 / np.maximum(d3, 1e-4); t2 = np.clip(d2 / .06, 0, 1); b2 = n2 / np.maximum(d2, 1e-4) * t2 + b3 * (1 - t2)
        t1 = np.clip(d1 / .30, 0, 1); bg = big(n1 / np.maximum(d1, 1e-4) * t1 + b2 * (1 - t1))
        # the owner: only what a colourist would do to the whole picture
        p = np.power(np.clip(x, 0, 1), .96)
        p = p + .08 * (p - cv2.GaussianBlur(p, (0, 0), 5 * SC))                     # a little local contrast, the same everywhere
        pl = p.max(axis=2, keepdims=True)
        d = np.maximum(pl - .72, 0); roll = pl - (1 - .5) / (2 * (1 - .72)) * d * d
        p = p * (roll / np.maximum(pl, 1e-4))                    # tame the forehead shine
        bg = np.power(np.clip(bg, 0, 1), .96)                    # the same curve as the owner's layer, so no step at the edge
        out = p * m + bg * (1 - m)
        out = np.clip(out, 0, 1); out = np.clip(out + .10 * (out - out * out) * (out - .5) * 2.2, 0, 1)   # a gentle S-curve
        return self.crop(out, f, zt, .12)

    def frame_studio(self, img, alpha, f, zt):
        """img, alpha: the working frame and its matte (uint8); f: source frame number; zt: zoom over the full working frame."""
        cv2 = self.cv2
        a = alpha.astype(np.float32) / 255
        x = img.astype(np.float32) / 255 * self.gain
        k3 = 1 / 3
        small = lambda z: cv2.resize(z, None, fx=k3, fy=k3, interpolation=cv2.INTER_AREA)
        big = lambda z: cv2.resize(z, (WK, HK), interpolation=cv2.INTER_LINEAR)
        # --- the room: lens blur without the person, bright points bloom into bokeh
        hold = cv2.dilate((a > .03).astype(np.uint8), np.ones((self.kd, self.kd), np.uint8)).astype(np.float32)
        wgt = small(1 - hold)
        fh = x + 1.6 * np.maximum(x - .80, 0)
        sfh = small(fh)
        num = cv2.filter2D(sfh * wgt[..., None], -1, self.disc); den = cv2.filter2D(wgt, -1, self.disc)[..., None]
        fill = cv2.GaussianBlur(sfh, (0, 0), 18 * SC)
        bg = big(np.where(den > 1e-3, num / np.maximum(den, 1e-3), fill))
        # a plain wall with things on it (tape, a sheet of paper, a curtain's edge) still shows them as soft patches after
        # a lens blur, so most of the room is blurred again, far wider: what is left is the room's own light, smooth
        wide = big(cv2.GaussianBlur(small(bg), (0, 0), 46 * SC))
        bg = wide * WIDE + bg * (1 - WIDE)
        m = bg.reshape(-1, 3).mean(axis=0)
        bg = m + (bg - m) * EVEN                                 # evens out a dark edge (a curtain) without flattening the light
        lum = bg.mean(axis=2, keepdims=True)
        bg = lum + (bg - lum) * .70                              # less of the wall's own colour
        bg = bg * np.array([.955, .985, 1.045], np.float32) * BG_GAIN   # cooler; a little darker, so the subject separates
        bg = bg * (1 - WASH) + self.BLUE * WASH * lum.clip(0, 1) * 1.6  # a wash of the house blue
        gl = np.exp(-(((self.gx - self.cx[f]) ** 2 + (self.gy - (self.top[f] + .55 * self.hw[f])) ** 2) / (2 * (1.25 * self.hw[f]) ** 2)))[..., None]
        bg = bg * (1 + GLOW * gl)                                # a soft light on the backdrop behind the head
        # --- the person: light it
        c_x, t_y, h_w = self.cx[f], self.top[f], self.hw[f]
        kx, ky, kr = c_x - .18 * h_w, t_y + .62 * h_w, .95 * h_w  # key light from camera-left, on the face
        key = np.exp(-(((self.gx - kx) ** 2 + (self.gy - ky) ** 2) / (2 * kr * kr)))[..., None]
        p = np.power(np.clip(x, 0, 1), .95)                      # shadows up a touch
        p = p * (1 + .13 * key)                                  # the key
        p = p * np.array([1.025, 1.0, .965], np.float32)         # warm skin
        detail = p - cv2.GaussianBlur(p, (0, 0), 5 * SC)
        p = p + .18 * detail * a[..., None]                      # local contrast: eyes, brows, beard
        pl = p.max(axis=2, keepdims=True)
        d = np.maximum(pl - .70, 0); roll = pl - (1 - .5) / (2 * (1 - .70)) * d * d
        p = p * (roll / np.maximum(pl, 1e-4))                    # tame the forehead shine
        # --- a thin cool rim on the edge away from the key
        edge = np.clip(a - cv2.erode(a, np.ones((self.ke, self.ke), np.uint8)), 0, 1)
        edge = cv2.GaussianBlur(edge, (0, 0), 3 * SC)
        side = np.clip((self.gx - c_x) / max(h_w, 1) * 1.6 + .2, 0, 1) * .95 + .05
        rim = (edge * side)[..., None] * np.array([.80, .90, 1.0], np.float32) * .2
        p = 1 - (1 - np.clip(p, 0, 1)) * (1 - rim)               # screen blend
        out = p * a[..., None] + bg * (1 - a[..., None])
        out = np.clip(out, 0, 1); out = np.clip(out + .12 * (out - out * out) * (out - .5) * 2.2, 0, 1)   # a gentle S-curve
        # --- framing: the crop follows the smoothed head track; the head's top stays at TOPF of the frame
        return self.crop(out, f, zt)


def out_frames(segs):
    """[(source frame, punch zoom)] for every output frame."""
    o = []
    for g in segs:
        o += [(f, g['zoom']) for f in range(round(g['s'] * FPS), round(g['e'] * FPS))]
    return o


def runs(fr):
    """Stretches of consecutive source frames: [(first output index, first source frame, count)]."""
    r, i = [], 0
    while i < len(fr):
        j = i
        while j + 1 < len(fr) and fr[j + 1][0] == fr[j][0] + 1: j += 1
        r.append((i, fr[i][0], j - i + 1)); i = j + 1
    return r


def work(args):
    K, segs, j0, j1, out, look = args
    L = Look(K, look); fr = out_frames(segs); N = len(fr)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{OW}x{OH}', '-r', str(FPS), '-i', '-',
                            '-c:v', 'libx264', '-preset', 'medium', '-crf', '13', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709',
                            '-color_trc', 'bt709', '-threads', '2', out], stdin=subprocess.PIPE)
    done = 0
    for o0, f0, n in runs(fr[j0:j1]):
        src = reader(f'{K}/pp_src.mp4', f0, n, 'rgb24', WK * HK * 3); alp = reader(f'{K}/pp_alpha.mkv', f0, n, 'gray', WK * HK)
        for k, (b, ab) in enumerate(zip(src, alp)):
            j = j0 + o0 + k; f, pz = fr[j]
            zt = (Z0 + (Z1 - Z0) * j / max(N - 1, 1)) * pz
            enc.stdin.write(L.frame(np.frombuffer(b, np.uint8).reshape(HK, WK, 3), np.frombuffer(ab, np.uint8).reshape(HK, WK), f, zt).tobytes()); done += 1
    enc.stdin.close(); enc.wait()
    return j0, j1, done


def render(K, segs_path, out, workers=4, look='room'):
    from concurrent.futures import ProcessPoolExecutor
    import multiprocessing
    segs = json.load(open(segs_path)); N = len(out_frames(segs))
    edges = [round(N * i / workers) for i in range(workers + 1)]
    jobs = [(K, segs, edges[i], edges[i + 1], f'{K}/pp_part{i}.mp4', look) for i in range(workers)]
    with ProcessPoolExecutor(workers, mp_context=multiprocessing.get_context('spawn')) as ex:
        for j0, j1, done in ex.map(work, jobs):
            print(f'part {j0}-{j1}: {done} frames' + ('' if done == j1 - j0 else '   SHORT'), flush=True)
    open(f'{K}/pp_parts.txt', 'w').write(''.join(f"file 'pp_part{i}.mp4'\n" for i in range(workers)))
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{K}/pp_parts.txt', '-c', 'copy', out], check=True)
    got = count(out)
    print(f'{out}: {got} frames, wanted {N}' + ('' if got == N else '   MISMATCH'))


def preview(K, segs_path, outdir, times, look='room'):
    import cv2
    segs = json.load(open(segs_path)); fr = out_frames(segs); N = len(fr); L = Look(K, look)
    os.makedirs(outdir, exist_ok=True)
    for t in times:
        j = min(N - 1, round(t * FPS)); f, pz = fr[j]
        b = next(reader(f'{K}/pp_src.mp4', f, 1, 'rgb24', WK * HK * 3)); ab = next(reader(f'{K}/pp_alpha.mkv', f, 1, 'gray', WK * HK))
        zt = (Z0 + (Z1 - Z0) * j / max(N - 1, 1)) * pz
        o = L.frame(np.frombuffer(b, np.uint8).reshape(HK, WK, 3), np.frombuffer(ab, np.uint8).reshape(HK, WK), f, zt)
        cv2.imwrite(f'{outdir}/pp_{t:.2f}.png', cv2.cvtColor(o, cv2.COLOR_RGB2BGR)); print('preview', t, 'source frame', f, flush=True)


if __name__ == '__main__':
    cmd, a = sys.argv[1], sys.argv[2:]
    if cmd == 'prep': prep(a[0], a[1])
    elif cmd == 'matte': matte(a[0], a[1], int(a[2]) if len(a) > 2 else 0)
    elif cmd == 'preview': preview(a[0], a[1], a[2], [float(x) for x in a[3].split(',')], a[4] if len(a) > 4 else 'room')
    elif cmd == 'render': render(a[0], a[1], a[2], int(a[3]) if len(a) > 3 else 4, a[4] if len(a) > 4 else 'room')
    else: sys.exit(__doc__)
