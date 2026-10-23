"""Matchday Myths 01 (El Clásico): cut the six Kling shots to the narration, add captions, the end card, music and sound.

  python3 -P -E edit.py <scratchpad> <out.mp4> [--stills t1,t2,...]
"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

S, OUT = sys.argv[1], sys.argv[2]
STILLS = [float(x) for x in sys.argv[sys.argv.index('--stills') + 1].split(',')] if '--stills' in sys.argv else None
D, W = f'{S}/myth01_dl', f'{S}/myth01/work'
REPO = '/home/user/cmv-alphascanner/video'
FPS, WID, HEI, END = 24, 1080, 1920, 47.6
os.makedirs(W, exist_ok=True)

# narration take 2, opened up with longer pauses at the story beats
LEAD, CUTS, GAPS = 0.3, [8.6, 15.3, 26.6, 34.9, 37.3], [0.9, 0.4, 0.6, 0.8, 0.4]
def T(t): return LEAD + t + sum(g for c, g in zip(CUTS, GAPS) if t >= c)

# (start, end, source, src_in, src_out, options)
SHOTS = [
    (0.00, 4.10, 'v1', 0.0, 4.1, {}),
    (4.10, 9.95, 'v2', 0.0, 5.0, {}),
    (9.95, 16.60, 'v3', 0.0, 5.04, {}),
    (16.60, 20.85, 'v4', 0.0, 4.25, {}),
    (20.85, 25.60, 'v5', 0.0, 4.75, {}),
    (25.60, 28.75, 'v1', 1.6, 4.4, {'zoom': 1.12, 'blood': 1}),
    (28.75, 30.75, 'v6', 0.0, 2.0, {}),
    (30.75, 33.45, 'v2', 2.3, 5.0, {'zoom': 1.15, 'flip': 1}),
    (33.45, 35.90, 'v4', 2.6, 5.04, {'zoom': 1.1, 'flip': 1}),
    (35.90, 37.95, 'v5', 2.7, 4.75, {'zoom': 1.22}),
    (37.95, 41.00, 'v6', 2.0, 5.04, {}),
    (41.00, END, 'end', 0, 0, {}),
]


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def build_base():
    parts = []
    for i, (t0, t1, src, a, b, o) in enumerate(SHOTS):
        n = round(t1 * FPS) - round(t0 * FPS)
        dur, out = n / FPS, f'{W}/seg{i:02d}.mp4'
        parts.append(out)
        if src == 'end':        # the last frame of the seer, held, darkened, blurred and slowly pushed in
            last = f'{W}/seer_last.png'
            run(['ffmpeg', '-y', '-sseof', '-0.05', '-i', f'{D}/v6.mp4', '-frames:v', '1', last])
            vf = (f"scale=1296:2304,zoompan=z='1+0.0009*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={WID}x{HEI}:fps={FPS},"
                  "gblur=sigma=10,eq=brightness=-0.10:saturation=0.85,vignette=PI/4,format=yuv420p")
            run(['ffmpeg', '-y', '-loop', '1', '-i', last, '-vf', vf, '-frames:v', str(n), '-c:v', 'libx264', '-crf', '14',
                 '-preset', 'veryfast', '-r', str(FPS), out])
            continue
        span = b - a
        speed = span / dur
        f = [f'setpts=(PTS-STARTPTS)/{speed:.5f}']
        if speed < 0.97:
            f.append(f'minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1')
        f.append(f'fps={FPS}')
        z = o.get('zoom')
        if z:
            f.append(f'scale={round(WID * z / 2) * 2}:{round(HEI * z / 2) * 2},crop={WID}:{HEI}')
        if o.get('flip'):
            f.append('hflip')
        if o.get('blood'):
            f.append('eq=saturation=0.55:brightness=-0.05:contrast=1.08,colorchannelmixer=rr=1.18:gg=0.82:bb=0.86')
        f += ['vignette=PI/5', 'noise=alls=4:allf=t', 'tpad=stop_mode=clone:stop_duration=2', 'format=yuv420p']
        run(['ffmpeg', '-y', '-ss', f'{a:.3f}', '-t', f'{span:.3f}', '-i', f'{D}/{src}.mp4', '-vf', ','.join(f),
             '-frames:v', str(n), '-an', '-c:v', 'libx264', '-crf', '14', '-preset', 'veryfast', '-r', str(FPS), out])
    with open(f'{W}/concat.txt', 'w') as fh:
        fh.writelines(f"file '{p}'\n" for p in parts)
    run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', f'{W}/concat.txt', '-c', 'copy', f'{W}/base.mp4'])


def build_audio():
    sfx = f'{REPO}/.cache/sfx'
    ins = ['-i', f'{D}/vo2.mp3', '-ss', '26.004', '-i', f'{REPO}/.cache/music/625.mp3']
    hits = [  # (file, at, volume)
        ('2297', 0.0, 0.45), ('2909', 0.22, 0.6), ('2908', 9.93, 0.55), ('1492', 25.52, 0.3), ('1492', 28.68, 0.25),
        ('1143', 35.95, 0.55), ('2299', 39.2, 0.8), ('1492', 40.95, 0.25)]
    for h, _, _ in hits:
        ins += ['-i', f'{sfx}/{h}.mp3']
    bounds = [0.0] + CUTS + [99.0]
    fc = [f'[0:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit={len(bounds) - 1}' +
          ''.join(f'[s{i}]' for i in range(len(bounds) - 1))]
    for i in range(len(bounds) - 1):
        ms = round(T(bounds[i]) * 1000)
        fc.append(f'[s{i}]atrim={bounds[i]}:{bounds[i + 1]},asetpts=PTS-STARTPTS,adelay={ms}|{ms}[v{i}]')
    fc.append(''.join(f'[v{i}]' for i in range(len(bounds) - 1)) + f'amix=inputs={len(bounds) - 1}:normalize=0,volume=1.0[vo]')
    fc.append('[vo]asplit=2[vom][vok]')
    fc.append(f'[1:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:{END},volume=0.42,'
              f'afade=t=in:d=0.6,afade=t=out:st={END - 2.6}:d=2.6[mus]')
    fc.append(f'[mus][vok]sidechaincompress=threshold=0.04:ratio=5:attack=15:release=450,apad=whole_dur={END}[duck]')
    for k, (h, at, vol) in enumerate(hits):
        ms = round(at * 1000)
        extra = ',afade=t=out:st=8.0:d=1.8' if h == '2297' else ''
        fc.append(f'[{k + 2}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={vol}{extra},adelay={ms}|{ms}[x{k}]')
    fc.append('[vom][duck]' + ''.join(f'[x{k}]' for k in range(len(hits))) +
              f'amix=inputs={len(hits) + 2}:normalize=0:duration=longest,atrim=0:{END},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[out]')
    run(['ffmpeg', '-y', *ins, '-filter_complex', ';'.join(fc), '-map', '[out]', '-ac', '2', f'{W}/audio.wav'])


# ---------- captions ----------
FONTS = f'{REPO}/assets/fonts'
ANTON = f'{FONTS}/anton-latin-400-normal.woff2'
MAN8 = f'{FONTS}/manrope-latin-800-normal.woff2'
MAN6 = f'{FONTS}/manrope-latin-600-normal.woff2'
BLUE, BLUE_L, WHITE, NAVY = (79, 179, 255), (159, 208, 255), (255, 255, 255), (8, 20, 52)
_f = {}
def font(p, s):
    if (p, s) not in _f:
        _f[(p, s)] = ImageFont.truetype(p, s)
    return _f[(p, s)]

HEAD = [  # (from, to, text, row, size, colour)
    (0.30, 4.06, '9 BATTLES', 0, 150, BLUE_L), (2.54, 4.06, '9 VICTORIES', 1, 150, WHITE),
    (4.26, 9.80, '39 GOALS', 0, 180, WHITE),
    (10.08, 13.95, 'THE RECORD', 0, 160, BLUE_L), (14.06, 16.50, 'REAL MADRID · 1968', 0, 120, WHITE),
    (17.28, 20.78, '6 POINTS BEHIND', 0, 130, WHITE),
    (20.98, 24.40, 'ONE MORE WIN', 0, 125, BLUE_L), (22.40, 24.40, '= HISTORY', 1, 150, WHITE),
    (26.02, 28.68, 'PSG 4–2 BARÇA', 0, 130, WHITE),
    (30.68, 33.40, 'RAPHINHA', 0, 125, BLUE_L), (31.95, 33.40, '12 GOALS', 1, 160, WHITE),
    (33.64, 35.85, 'NO VINÍCIUS', 0, 140, WHITE),
    (36.08, 37.90, 'THE PROPHECY', 0, 140, BLUE_L),
]
_heads = {}
def head_img(text, size, colour):
    key = (text, size, colour)
    if key in _heads:
        return _heads[key]
    f = font(ANTON, size)
    while f.getlength(text) > 940:
        size -= 6
        f = font(ANTON, size)
    w, h = int(f.getlength(text)) + 80, int(size * 1.45) + 60
    sh = Image.new('L', (w, h), 0)
    ImageDraw.Draw(sh).text((40, 30), text, font=f, fill=235)
    sh = sh.filter(ImageFilter.GaussianBlur(14))
    im = Image.new('RGBA', (w, h), (0, 6, 20, 0))
    im.putalpha(sh)
    ImageDraw.Draw(im).text((40, 30), text, font=f, fill=colour + (255,))
    _heads[key] = im
    return im


def words():
    raw = json.load(open(f'{D}/vo2.words.json'))
    fix = {'Rafina': 'Raphinha', 'Vinicius.': 'Vinícius.'}
    out = []
    for a, b, w in raw:
        if w == '.m.' and out and out[-1][2] == 'p':
            out[-1] = (out[-1][0], T(b), 'p.m.')
            continue
        out.append((T(a), T(b), fix.get(w, w)))
    return out


def chunks(ws):
    cs, cur = [], []
    for w in ws:
        cur.append(w)
        if w[2][-1] in '.,' or len(cur) == 3:
            cs.append(cur)
            cur = []
    if cur:
        cs.append(cur)
    res = []
    for i, c in enumerate(cs):
        end = min(cs[i + 1][0][0] if i + 1 < len(cs) else END, c[-1][1] + 0.6)
        res.append((c[0][0], end, c))
    return res


def draw_subs(d, t, cs):
    for a, b, c in cs:
        if a <= t < b:
            f = font(MAN8, 58)
            sp = f.getlength(' ')
            total = sum(f.getlength(w[2]) for w in c) + sp * (len(c) - 1)
            x, y = WID / 2 - total / 2, 1420
            for w0, w1, txt in c:
                col = BLUE if w0 <= t < max(w1, w0 + 0.12) else WHITE
                d.text((x, y), txt, font=f, fill=col + (255,), stroke_width=7, stroke_fill=(0, 8, 24, 235))
                x += f.getlength(txt) + sp
            return


def ease(x):
    return 1 - (1 - max(0.0, min(1.0, x))) ** 3


def draw_heads(base, t):
    for a, b, text, row, size, col in HEAD:
        if not (a <= t < b):
            continue
        im = head_img(text, size, col)
        k = ease((t - a) / 0.22)
        alpha = k * (1 - ease((t - (b - 0.2)) / 0.2)) if t > b - 0.2 else k
        sc = 1.18 - 0.18 * k
        im2 = im.resize((round(im.width * sc), round(im.height * sc)), Image.BILINEAR)
        if alpha < 1:
            im2.putalpha(im2.getchannel('A').point(lambda v: int(v * alpha)))
        cy = 1060 + row * 175
        base.alpha_composite(im2, (round(WID / 2 - im2.width / 2), round(cy - im2.height / 2)))


def draw_pill(d, t):
    a = int(255 * ease(t / 0.3))
    f = font(MAN8, 30)
    d.rounded_rectangle((60, 150, 60 + f.getlength('MATCHDAY MYTHS') + 48, 206), 28, fill=(31, 95, 219, int(a * 0.92)))
    d.text((84, 160), 'MATCHDAY MYTHS', font=f, fill=(255, 255, 255, a))
    f2 = font(MAN6, 28)
    d.text((60 + f.getlength('MATCHDAY MYTHS') + 70, 162), 'EP. 01 · EL CLÁSICO', font=f2, fill=(255, 255, 255, int(a * 0.85)),
           stroke_width=3, stroke_fill=(0, 8, 24, int(a * 0.6)))


def draw_card(base, t):
    t0 = 40.25
    if t < t0:
        return
    k = ease((t - t0) / 0.45)
    lay = Image.new('RGBA', (WID, HEI), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    y0 = 640 + round(40 * (1 - k))
    d.rounded_rectangle((90, y0, 990, y0 + 600), 36, fill=NAVY + (int(205 * k),), outline=BLUE + (int(200 * k),), width=3)
    def ctext(y, s, f, col):
        d.text((WID / 2 - f.getlength(s) / 2, y0 + y), s, font=f, fill=col + (int(255 * k),))
    ctext(48, 'THE PROPHECY', font(MAN8, 36), BLUE)
    ctext(110, 'BARCELONA', font(ANTON, 150), WHITE)
    ctext(290, "DON'T LOSE", font(ANTON, 150), WHITE)
    d.line((240, y0 + 478, 840, y0 + 478), fill=BLUE + (int(160 * k),), width=2)
    ctext(500, 'Barcelona v Real Madrid', font(MAN6, 40), WHITE)
    ctext(548, 'Sunday 25 Oct · 9 p.m. Lagos', font(MAN6, 34), BLUE_L)
    if t >= 44.0:
        k2 = ease((t - 44.0) / 0.35)
        f = font(MAN8, 34)
        s = 'FOLLOW · SEE IF IT HOLDS'
        w = f.getlength(s) + 60
        d.rounded_rectangle((WID / 2 - w / 2, 1290, WID / 2 + w / 2, 1350), 30, fill=(31, 95, 219, int(235 * k2)))
        d.text((WID / 2 - f.getlength(s) / 2, 1300), s, font=f, fill=(255, 255, 255, int(255 * k2)))
    base.alpha_composite(lay)


def flash(base, t):
    for at, col, peak in ((9.95, (200, 230, 255), 0.55), (39.25, (120, 190, 255), 0.35)):
        if at <= t < at + 0.3:
            a = peak * (1 - (t - at) / 0.3)
            base.alpha_composite(Image.new('RGBA', (WID, HEI), col + (int(255 * a),)))


def frame_overlay(img, t, cs):
    base = img.convert('RGBA')
    flash(base, t)
    draw_heads(base, t)
    draw_card(base, t)
    lay = Image.new('RGBA', (WID, HEI), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    draw_pill(d, t)
    draw_subs(d, t, cs)
    base.alpha_composite(lay)
    return base.convert('RGB')


def render(cs):
    dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', f'{W}/base.mp4', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                           stdout=subprocess.PIPE)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{WID}x{HEI}',
                            '-r', str(FPS), '-i', '-', '-i', f'{W}/audio.wav', '-c:v', 'libx264', '-crf', '18',
                            '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest',
                            '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
    size, i = WID * HEI * 3, 0
    while True:
        buf = dec.stdout.read(size)
        if len(buf) < size:
            break
        img = Image.frombytes('RGB', (WID, HEI), buf)
        enc.stdin.write(frame_overlay(img, i / FPS, cs).tobytes())
        i += 1
    enc.stdin.close()
    enc.wait()
    dec.wait()
    return i


def srt(cs):
    def ts(x):
        ms = round(x * 1000)
        return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'
    lines, cur = [], []
    for a, b, c in cs:
        cur.append((a, b, ' '.join(w[2] for w in c)))
        if c[-1][2][-1] == '.':
            lines.append((cur[0][0], cur[-1][1], ' '.join(x[2] for x in cur)))
            cur = []
    if cur:
        lines.append((cur[0][0], cur[-1][1], ' '.join(x[2] for x in cur)))
    with open(OUT.rsplit('.', 1)[0] + '.srt', 'w') as fh:
        for n, (a, b, s) in enumerate(lines, 1):
            fh.write(f'{n}\n{ts(a)} --> {ts(b)}\n{s}\n\n')


if __name__ == '__main__':
    cs = chunks(words())
    if '--base-only' in sys.argv:
        build_base()
        sys.exit()
    if STILLS:          # preview stills only: overlay on the base video at chosen times
        for t in STILLS:
            p = f'{W}/still_{t:05.2f}.png'
            run(['ffmpeg', '-y', '-ss', f'{t:.3f}', '-i', f'{W}/base.mp4', '-frames:v', '1', p])
            frame_overlay(Image.open(p).convert('RGB'), t, cs).save(p)
        sys.exit()
    if '--skip-base' not in sys.argv:
        build_base()
    build_audio()
    n = render(cs)
    srt(cs)
    print('frames', n, 'seconds', n / FPS)
