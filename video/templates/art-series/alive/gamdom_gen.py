"""The plan for 'The Living Drawing' (the owner's Gamdom charcoal piece, 9 Nov 2026): every cut on the beat grid.
  python3 -I gamdom_gen.py <page dir> <bpm> <drop seconds in the video> [beats per world shot = 8]
Before the drop: the real footage (tools, the hand, the hours, the artist facing the eye). On the drop: the camera
goes into the drawing, lit as a relief (the name, the eye, the tear, the castle), pulls back to the whole piece, and
ends on the artist at the finished wall. Writes plan.js and plan.json; prints the timeline."""
import json, sys
OUT = sys.argv[1]; BPM = float(sys.argv[2]); DROP = float(sys.argv[3]); SB = int(sys.argv[4]) if len(sys.argv) > 4 else 8
B = 60 / BPM; r3 = lambda x: round(x, 3)
bt = lambda n: r3(DROP + n * B)                      # the time of beat n (0 = the drop)
M = json.load(open(f'{OUT}/seq/meta.json'))
shots, pans, text, flash = [], [], [], []

# ---------------------------------------------------------------- before the drop: the artist's footage
PRE = int(DROP // B)                                  # whole beats available before the drop
n3 = min(4, max(2, (PRE - 9) // 3))                   # beats each panel waits for the next
t0 = bt(-(3 * n3 + 9))                                # first panel
PW, PH, GAP = 592, 1052, 24; X0 = (1920 - 3 * PW - 2 * GAP) // 2; Y0 = 14
t_wide = bt(-9)                                       # the triptych gives way to the wide shot
def cover(name, w, h): m = M[name]; s = max(w / m['w'], h / m['h']); return round(m['w'] * s, 1), round(m['h'] * s, 1)
for i, (name, cap, cy, speed) in enumerate([('tools', 'Charcoal', .5, 1), ('hand', 'By hand', .34, 1), ('lapse', '62 × 94 cm', .42, 2.2)]):
    a = r3(t0 + i * n3 * B); iw, ih = cover(name, PW, PH); x = X0 + i * (PW + GAP)
    pans.append(dict(dir=f'seq/{name}', n=M[name]['n'], x=x, y=Y0, w=PW, h=PH, iw=iw, ih=ih, cy=cy, z0=1.0, z1=1.06, speed=speed, pop=.035, fi=.1, fo=.18, **{'from': a, 'to': t_wide}))
    text.append(dict(k='cap', text=cap, x=x + PW / 2, y=Y0 + PH - 74, align='c', fi=.25, fo=.15, dy=10, **{'from': r3(a + .12), 'to': r3(t_wide - .2)}))
# the artist facing the eye: one wide shot, a slow push, then one beat of dark before the drop
m = M['back1']; sc = 1.25; w, h = round(m['w'] * sc), round(m['h'] * sc)
t_dark = bt(-1)
pans.append(dict(dir='seq/back1', n=m['n'], x=(1920 - w) // 2, y=(1080 - h) // 2 - 10, w=w, h=h, iw=w, ih=h, z0=1.0, z1=1.07, speed=1, fi=.3, fo=.12, **{'from': t_wide, 'to': t_dark}))
text.append(dict(k='serif', text='It started as dust.', x=960, y=(1080 - h) // 2 + h + 2, align='c', fi=.5, fo=.12, dy=14, css='font-size:64px', **{'from': r3(t_wide + 2 * B), 'to': r3(t_dark - .1)}))

# ---------------------------------------------------------------- on the drop: inside the drawing
flash.append([bt(0), .85, .28])
k = 0
def shot(img, beats, **o):
    global k; a, b = bt(k), bt(k + beats); k += beats
    def tm(keys): return [[r3(a + u * (b - a))] + v for u, *v in keys]
    for key in ('cam', 'light', 'pool', 'exp'):
        if key in o: o[key] = tm(o[key])
    if 'amp' in o and isinstance(o['amp'], list): o['amp'] = tm(o['amp'])
    if 'burst' in o: o['burst'] = o['burst'][:3] + [r3(a + o['burst'][3] * (b - a))]
    if 'shake' in o: o['shake'] = [r3(a + o['shake'][0] * (b - a))] + o['shake'][1:]
    shots.append(dict(img=img, **{'from': a, 'to': b}, **o)); return a, b
def label(txt, a, b): text.append(dict(k='serif', text=txt, x=110, y=930, fi=.3, fo=.2, dy=16, css='font-size:76px', **{'from': r3(a + B * .5), 'to': r3(b - B * .9)}))

# 1. the name: low across the cracked stone
a, b = shot('letters', SB, amp=.3, ease='out2', shake=[0, .012, .45],
            cam=[[0, [-.98, -.22, 2.75], [-.72, -.12, 0], 30, 0], [1, [.3, -.22, 2.75], [.16, -.12, 0], 30, 0]],
            light=[[0, [-.85, .25, .45], .46, .85, .12], [1, [.8, .3, .5], .46, .85, .12]], pool=[[0, [-.9, -.1], 3.1, .06], [1, [.2, -.1], 3.1, .06]])
label('the name', a, b)
# 2. the eye: the whole word; the light comes up and the eye is looking back
a, b = shot('letters', SB, amp=.26, ease='out2',
            cam=[[0, [.25, -.06, 4.15], [.1, -.06, 0], 30, 0], [1, [.02, -.08, 3.3], [.02, -.08, 0], 30, 0]],
            light=[[0, [-.9, -.1, .35], .16, .7, .1], [.55, [.1, .45, .6], .5, .85, .12], [1, [.4, .5, .6], .5, .85, .12]], lease='out2',
            pool=[[0, [-2.4, .4], 1.3, .02], [.55, [.2, -.1], 3.4, .05], [1, [.2, -.1], 3.6, .05]])
label('the eye', a, b)
# 3. the tear: down its trail into the ruins
a, b = shot('eye', SB, amp=.26, ease='io', burst=[-.26, -1.06, .55, .78],
            cam=[[0, [-.3, .52, 2.1], [-.32, .48, 0], 30, 0], [1, [-.22, -.56, 2.1], [-.24, -.6, 0], 30, 0]],
            light=[[0, [.5, .6, .55], .46, .85, .14], [1, [.4, .3, .5], .46, .85, .14]], pool=[[0, [-.32, .5], 2.3, .05], [1, [-.26, -.6], 2.4, .05]])
label('the tear', a, b)
# 4. the castle: up the tower to the flags
a, b = shot('castle', SB, amp=.5, wave=.014, ease='out2',
            cam=[[0, [-.5, -.55, 2.15], [.05, -.4, 0], 30, 0], [1, [.32, .5, 2.6], [.02, .52, 0], 30, 0]],
            light=[[0, [-.8, .3, .5], .6, .8, .1], [1, [.55, .65, .55], .52, .78, .1]], pool=[[0, [0, -.4], 3.8, .2], [1, [0, .5], 4.0, .16]])
label('the rise', a, b)
# 5. the whole piece: pull back until it is a sheet in a pool of light
flash.append([bt(k), .5, .22])
a, b = shot('whole', SB + SB // 2, amp=[[0, .42], [1, .2]], ease='out2',
            cam=[[0, [.75, .12, 2.1], [.85, .2, 0], 30, 0], [1, [0, .0, 5.7], [0, .0, 0], 30, 0]],
            light=[[0, [-.6, .5, .55], .5, .8, .1], [1, [.3, .6, .66], .55, .7, .08]], pool=[[0, [.9, .2], 3.0, .06], [1, [0, 0], 3.3, .07]])
t_end = b
# ---------------------------------------------------------------- the end: the artist at the wall
m = M['back']; w = h = 940; EB = SB
t_out = bt(k + EB)
pans.append(dict(dir='seq/back', n=m['n'], x=110, y=70, w=w, h=h, iw=w, ih=round(w * m['h'] / m['w']), z0=1.0, z1=1.04, speed=1, fi=.35, **{'from': t_end, 'to': r3(t_out + 2)}))
tx = 1160
text.append(dict(k='serif', text='Drawn by hand.', x=tx, y=330, fi=.5, dy=20, css='font-size:104px', **{'from': r3(t_end + B), 'to': r3(t_out + 2)}))
text.append(dict(k='cap', text='Charcoal on paper', x=tx + 4, y=480, fi=.5, dy=12, **{'from': r3(t_end + 2 * B), 'to': r3(t_out + 2)}))
text.append(dict(k='cap', text='62 × 94 cm', x=tx + 4, y=530, fi=.5, dy=12, **{'from': r3(t_end + 3 * B), 'to': r3(t_out + 2)}))
text.append(dict(k='small', text='@i_am_vickyd', x=tx + 4, y=610, fi=.5, dy=12, css='font-size:34px;font-weight:800;letter-spacing:.04em;color:#fff', **{'from': r3(t_end + 4 * B), 'to': r3(t_out + 2)}))
TOTAL = r3(t_out + 1.2)
plan = dict(fps=30, pr=1, ns=.42, bg='#050a16',
            images=dict(castle=dict(pw=4000, ph=3000, flags=[[.235, .655, .41, .76], [.535, .755, .735, .89], [.80, .645, .975, .76]]),
                        letters=dict(pw=4000, ph=3000), eye=dict(pw=4000, ph=3000), whole=dict(pw=3920, ph=2605)),
            shots=shots, pans=pans, text=text, flash=flash, shade=[[0, 0], [r3(TOTAL - .9), 0], [TOTAL, 1]], total=TOTAL, bpm=BPM, drop=DROP)
open(f'{OUT}/plan.js', 'w').write('// generated by gamdom_gen.py\nwindow.PLAN = ' + json.dumps(plan, indent=1, ensure_ascii=False) + '\n')
print(f'beat {B:.3f} s, first panel {t0}, wide {t_wide}, dark {t_dark}, drop {DROP}, whole {a}-{b}, out {t_out}, total {TOTAL}')
for s in shots: print('  shot', s['img'], s['from'], s['to'])
