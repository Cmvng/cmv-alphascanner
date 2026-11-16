# The page's images, each at the size it is shown (one file per displayed size). Sources are Prospect's own media
# (X posts of 12 and 15 Nov, launch video frames), the CFTC's pages and the 12 Nov release, as captured.
import sys
from PIL import Image
S = sys.argv[1]; O = f'{S}/page/img'
def rs(im, w): return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
def jpg(im, p, q=93): im.convert('RGB').save(p, quality=q, subsampling=0)
sl = {i: Image.open(f'{S}/dl/{n}.jpg').convert('RGB') for i, n in [(1, 'HXLqImsaMAA39_a'), (2, 'HXLqImsbMAAEzSr'), (3, 'HXLqImpbIAAlREy')]}
jpg(rs(sl[3], 700), f'{O}/slate3_700.jpg')
for i in (1, 2, 3): jpg(rs(sl[i], 560), f'{O}/slate{i}_560.jpg')
# the Panthers / Saints tile and its two rows, real pixels at native size
sl[3].crop((552, 388, 1003, 613)).save(f'{O}/tile.png')
sl[3].crop((552, 440, 1003, 522)).save(f'{O}/row_car.png')
sl[3].crop((552, 526, 1003, 608)).save(f'{O}/row_no.png')
lg = Image.open(f'{S}/dl/logo_x.png').convert('RGBA')
for w in (110, 200): rs(lg, w).save(f'{O}/logo_{w}.png')
xl = Image.open(f'{S}/shots/x_launch.png').convert('RGB').crop((0, 0, 1096, 404)); jpg(rs(xl, 822), f'{O}/x_launch.jpg')
ph = Image.open(f'{S}/shots/pr_date.png').convert('RGB').crop((0, 196, 2200, 860)); jpg(rs(ph, 940), f'{O}/pr_head.jpg')
jpg(rs(Image.open(f'{S}/shots/pr_about.png'), 925), f'{O}/pr_about.jpg')
jpg(rs(Image.open(f'{S}/shots/pr_disc.png'), 1110), f'{O}/pr_disc.jpg')
jpg(rs(Image.open(f'{S}/shots/pr_elig.png'), 1110), f'{O}/pr_elig.jpg')
for n in ('dcm', 'dco'):
    im = Image.open(f'{S}/shots/{n}.png').convert('RGB'); jpg(rs(im.crop((250, 440, 2310, 712)), 1500), f'{O}/{n}.jpg')
jpg(rs(Image.open(f'{S}/shots/dcm.png').convert('RGB').crop((280, 70, 960, 260)), 340), f'{O}/cftc_logo.jpg')
jpg(rs(Image.open(f'{S}/f30/k_0016.jpg'), 1000), f'{O}/orderbook.jpg')
jpg(rs(Image.open(f'{S}/f30/k_0170.jpg'), 960), f'{O}/market.jpg')
jpg(rs(Image.open(f'{S}/f30/k_0330.jpg'), 640), f'{O}/pbp_q.jpg')
for j, k in enumerate(range(187, 209)): jpg(rs(Image.open(f'{S}/f30/k_{k:04d}.jpg'), 960), f'{O}/chart/c_{j:02d}.jpg')
PB = list(range(306, 322)) + [321, 321] + list(range(324, 335))      # the two glitch frames 322-323 held on 321
for j, k in enumerate(PB): jpg(rs(Image.open(f'{S}/f30/k_{k:04d}.jpg'), 900), f'{O}/pbp/p_{j:02d}.jpg')
print('chart', 209 - 187, 'pbp', len(PB))
