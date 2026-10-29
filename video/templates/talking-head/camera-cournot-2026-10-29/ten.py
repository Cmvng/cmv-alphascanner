"""10 fps sheets around every overlay change in the Cournot edit (float in and out, each outline, the walkthrough
keys and outlines, the notes, the stickers and the end card).
python3 -I ten.py <plan.json> <video.mp4> <out dir>  ->  ten-NN.jpg (30 frames a sheet, 6 x 5, 300x533 each)"""
import json, os, subprocess, sys, glob
from PIL import Image, ImageDraw, ImageFont
P, VID, OUT = sys.argv[1:4]
os.makedirs(OUT, exist_ok=True)
pl = json.load(open(P)); E = pl['ev']; END = pl['end']; TOT = END + pl['endcard']
pts = []                                       # (label, time): a window of -0.3..+0.7 s goes round each
def at(label, t): pts.append((label, t))
fl = [('res', .1, E['i_primus'] - .45, [E['hook_won']]), ('prim', E['i_primus'] - .35, E['i_part'] - .25, []),
      ('med', E['i_part'] - .2, E['zk_in'] - .15, [E['i_part'] + .25, E['i_cournot'] - .1]),
      ('zk', E['zk_in'] - .05, E['why_in'] - .15, [E['zk_prove']]),
      ('why', E['why_in'] - .05, E['v_in'] - .2, [E['why_in'] + .3, E['part_in']]),
      ('det', E['v_in'] - .1, E['v_rec'] - .05, []), ('log', E['v_rec'] - .15, E['v_primus'] - .15, []),
      ('quo', E['v_primus'] - .1, E['c_in'] - .15, [E['v_primus'] + .6]),
      ('por', E['c_in'] - .05, E['w2_in'] - .1, [E['c_without']]),
      ('auth', E['a_zk'] - .05, E['a_proof'] - .15, []), ('fs', E['a_valid'] - .1, E['a_out'], [E['a_valid'] + .35]),
      ('42', E['e_here'] - .1, E['e_gg'] - .1, [E['e_here'] + .1])]
for n, a, b, ms in fl:
    at(f'{n} in', a); at(f'{n} out', b)
    for m in ms: at(f'{n} mark', m)
at('date note', E['i_part'] + .5); at('bundle note', E['a_valid'] + .9)
for t in (E['a_in'], E['a_rules'] - .3, E['a_rules'], E['a_evid'], E['a_verdict'], E['a_verdict'] + .8, E['a_zk'] - .05):
    at('walk1', t)
for t in (E['nb_in'], E['nb_in'] + .5, E['nb_in'] + 1.0, E['nb_in'] + 1.5, E['nb_in'] + 2.6, E['e_here']):
    at('walk2', t)
for a, b in ((E['a_proof'] - .05, E['a_valid'] - .2), (E['e_gg'], END + .05)):   # stickers: every frame of them
    t = a - .3
    while t < b + .4: at('sticker', t); t += 1.0
at('end card', END); at('end card', END + 1.0); at('end card', END + 2.0); at('end card', TOT - .6)
frames = sorted({round(round((t + k / 10) * 10) / 10, 1) for _, t in pts for k in range(-3, 8)
                 if 0 <= t + k / 10 < TOT - .05})
lab = {}
for n, t in pts:
    lab.setdefault(round(round(t * 10) / 10, 1), n)
for f in glob.glob(f'{OUT}/ten-*.jpg') + glob.glob(f'{OUT}/tf_*.png'):
    os.remove(f)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', VID, '-vf', 'fps=10,scale=300:533', f'{OUT}/tf_%05d.png'], check=True)
W, H, G, C, R = 300, 533, 8, 6, 5
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
k = 0
for s in range(0, len(frames), C * R):
    sh = Image.new('RGB', (C * (W + G), R * (H + 26)), (30, 30, 30)); d = ImageDraw.Draw(sh)
    for j, t in enumerate(frames[s:s + C * R]):
        f = f'{OUT}/tf_{int(round(t * 10)) + 1:05d}.png'
        if not os.path.exists(f): continue
        x, y = (j % C) * (W + G), (j // C) * (H + 26)
        sh.paste(Image.open(f), (x, y)); d.text((x + 4, y + H + 3), f'{t:.1f}s {lab.get(t, "")}', fill='white', font=font)
    sh.save(f'{OUT}/ten-{k:02d}.jpg', quality=82); k += 1
for f in glob.glob(f'{OUT}/tf_*.png'):
    os.remove(f)
print(len(frames), 'frames at 10 fps,', k, 'sheets')
