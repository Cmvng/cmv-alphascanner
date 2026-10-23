"""Cover (1080x1920) and thumbnail (1280x720) for Matchday Myths 01: python3 -P -E cover.py <keyframes dir> <out prefix>"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

K, OUT = sys.argv[1], sys.argv[2]
FONTS = '/home/user/cmv-alphascanner/video/assets/fonts'
ANTON, MAN8, MAN6 = (f'{FONTS}/anton-latin-400-normal.woff2', f'{FONTS}/manrope-latin-800-normal.woff2',
                     f'{FONTS}/manrope-latin-600-normal.woff2')
BLUE, BLUE_L, WHITE = (79, 179, 255), (159, 208, 255), (255, 255, 255)
f = ImageFont.truetype


def fit(path, w, h, focus=0.5):
    im = Image.open(path).convert('RGB')
    r = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    l, t = (im.width - w) // 2, round((im.height - h) * focus)
    return im.crop((l, t, l + w, t + h))


def shade(im, top=0.0, bottom=0.75, start=0.45):
    w, h = im.size
    g = Image.new('L', (1, h))
    for y in range(h):
        p = y / h
        a = top * max(0, (0.18 - p) / 0.18) + bottom * max(0, (p - start) / (1 - start))
        g.putpixel((0, y), int(255 * min(1, a)))
    im.paste(Image.new('RGB', (w, h), (3, 10, 30)), (0, 0), g.resize((w, h)))
    return im


def glow_text(base, xy, s, font, fill, anchor='mm', blur=16):
    sh = Image.new('L', base.size, 0)
    ImageDraw.Draw(sh).text(xy, s, font=font, fill=230, anchor=anchor)
    base.paste(Image.new('RGB', base.size, (0, 6, 20)), (0, 0), sh.filter(ImageFilter.GaussianBlur(blur)))
    ImageDraw.Draw(base).text(xy, s, font=font, fill=fill, anchor=anchor)


def pill(d, x, y, s, font, h):
    w = font.getlength(s) + h
    d.rounded_rectangle((x, y, x + w, y + h), h // 2, fill=(31, 95, 219))
    d.text((x + h / 2, y + h / 2), s, font=font, fill=WHITE, anchor='lm')


# cover: the stand-off
c = shade(fit(f'{K}/k5.png', 1080, 1920), top=0.6, bottom=0.92, start=0.42)
d = ImageDraw.Draw(c)
pill(d, 60, 120, 'MATCHDAY MYTHS · EP. 01', f(MAN8, 34), 64)
glow_text(c, (540, 1270), 'EL CLÁSICO', f(ANTON, 210), WHITE)
glow_text(c, (540, 1430), 'THE PROPHECY', f(ANTON, 110), BLUE_L)
d = ImageDraw.Draw(c)
d.line((300, 1530, 780, 1530), fill=BLUE, width=3)
d.text((540, 1580), 'Barcelona v Real Madrid', font=f(MAN6, 46), fill=WHITE, anchor='mm')
d.text((540, 1640), 'Sunday · 9 p.m. Lagos', font=f(MAN6, 40), fill=BLUE_L, anchor='mm')
c.save(f'{OUT}_cover.png')

# thumbnail: the armada against the white kingdom
t = Image.new('RGB', (1280, 720))
t.paste(fit(f'{K}/k1.png', 640, 720, 0.18), (0, 0))
t.paste(fit(f'{K}/k3.png', 640, 720, 0.10), (640, 0))
t = shade(t, top=0.0, bottom=0.88, start=0.40)
seam = Image.new('L', (1280, 720), 0)
ImageDraw.Draw(seam).rectangle((636, 0, 644, 720), fill=255)
t.paste(Image.new('RGB', (1280, 720), BLUE), (0, 0), seam.filter(ImageFilter.GaussianBlur(6)))
d = ImageDraw.Draw(t)
pill(d, 28, 26, 'MATCHDAY MYTHS', f(MAN8, 26), 50)
glow_text(t, (320, 150), '9 FROM 9', f(ANTON, 96), WHITE, blur=12)
glow_text(t, (960, 150), 'THE RECORD: 1968', f(ANTON, 70), BLUE_L, blur=12)
glow_text(t, (640, 520), 'EL CLÁSICO', f(ANTON, 150), WHITE, blur=14)
glow_text(t, (640, 640), 'ONE MORE WIN = HISTORY', f(ANTON, 58), BLUE_L, blur=10)
t.save(f'{OUT}_thumbnail.png')
print('ok')
