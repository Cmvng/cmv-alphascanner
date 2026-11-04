"""The entry, third cut (4 Nov 2026): the owner's own staging. python3 -I castle33_plan.py <assets dir> <out plan.json>

The owner, after the second cut: "the artwork in a frame will be in the center, then the various progressions will be
around, like it will be revolving around", and the site "not scrolling… like a cinematic shot in between". Steve's post:
"make a 30+ second video promoting gamdom… Must fight back when kicked down." Same track and accents as the second cut
(O0…O9, 3.17885 s apart from 1.485 s; see splice32.py).

  0.00  the fall: the drawn eye (13.10.2026 · Gamdom went offline.), Gamdom's own post, the ruins ("They said it was over.")
  4.66  the framed piece centre stage; the owner's sessions revolve round it, passing behind and in front
  7.05  a cinematic shot of gamdom.com between the passes (Originals), a still screen under a moving camera
  8.64  the second pass, new sessions; on the accent the clips fly into the frame, the light comes on, and the camera
        pushes through the frame into the drawing; MUST FIGHT BACK on the next accent
 15.79  the read: "Kicked down." / "Still standing." (on "back and better")
 19.76  the owner's frame images, two beats each; 23.74 the casino: "Gamdom is back." on the second "back and better"
 26.92  two cinematic shots of gamdom.com on "you can try it": King of the Hill, Casino and Sports
 28.51  the end card"""
import json, sys
A, OUT = sys.argv[1], sys.argv[2]
H0, PER = 1.485, 3.17885
b = PER / 8
O = [round(H0 + k * PER, 3) for k in range(10)]
bt = lambda t, n: round(t + n * b, 3)
TOTAL = 32.2
clips = {'proc': {'path': f'{A}/process.mp4'}}
R = {'A': [0, 420, 1080, 1080], 'B': [166, 0, 748, 1920], 'C': [0, 94, 1080, 1732], 'D': [0, 656, 1080, 608], 'E': [0, 0, 1080, 1920],
     'F': [6, 0, 1068, 1920], 'G': [0, 420, 1080, 1080]}
FX = {'A': .33, 'D': .26}
segs, text = [], []
def photo(t0, t1, img, c0=None, c1=None, ease='inout', **k):
    segs.append(dict(slot='photo', t0=round(t0, 3), t1=round(t1, 3), img=img, crop0=c0, crop1=c1, ease=ease, **k))
def say(t0, t1, k, s, **kw): text.append(dict(k=k, t0=round(t0, 3), t1=round(t1, 3), text=s, **kw))
# ---- the fall
photo(0.0, O[0], 'p_letters_clean', [0.715, 0.6, 0.48], [0.712, 0.6, 0.53], 'out', fade=0.3)
say(0.3, O[0] - 0.06, 'date', '13.10.2026'); say(0.6, O[0] - 0.06, 'line', 'Gamdom went offline.')
t_ru = bt(O[0], 4)
photo(O[0], t_ru, 'p_letters_clean', [0.5, 0.5, 1.0], [0.5, 0.5, 0.93], 'lin', dim=[[O[0] - 0.4, 0.58]])
tweets = [dict(t0=O[0], t1=t_ru, img='img/tw_offline.png')]
photo(t_ru, O[1], 'p_final_clean', contain=True, keys=[[0, 0.39, 0.60, 0.53], [1, 0.40, 0.68, 0.47]])
say(t_ru + 0.12, O[1] - 0.06, 'line', 'They said it was over.')
# ---- the orbit: two passes of the owner's sessions round the framed piece, a cinematic site shot between them
p1, c1, p2 = [O[1], bt(O[1], 6)], [bt(O[1], 6), bt(O[1], 10)], [bt(O[1], 10), O[3]]
pass1 = [('A', 1.6), ('B', 5.6), ('C', 11.2), ('E', 37.2), ('C', 17.2), ('D', 29.8), ('F', 41.2), ('G', 49.6)]
pass2 = [('B', 7.9), ('C', 14.4), ('C', 20.4), ('E', 37.9), ('C', 23.4), ('D', 33.4), ('F', 45.0), ('G', 53.0)]
for (a, z), row in [(p1, pass1), (p2, pass2)]:
    for i, (part, src) in enumerate(row):
        segs.append(dict(slot='orb', pi=i, clip='proc', t0=a, t1=z, src=src, speed=1.0, rect=R[part], fx=FX.get(part, .5)))
orbit = dict(t0=O[1], t1=O[3], passes=[p1, p2], fly=[bt(O[3], -2), O[3]], push=[O[3], O[4]], n=8)
cine = [dict(t0=c1[0], t1=c1[1], img='img/s_orig.jpg', keys=[[0, 330, 30, 430, -26, 7], [1, 90, 10, 140, -15, 4]])]
say(O[1] + 0.15, c1[0] - 0.08, 'line', 'So I picked up the charcoal.')
say(c1[0] + 0.06, c1[1] - 0.03, 'cap', 'Gamdom Originals')
say(p2[0] + 0.1, orbit['fly'][0] - 0.05, 'line', 'Every line by hand. No AI.')
for a, z in [(round(O[1] + 0.2, 3), c1[0]), (p2[0], orbit['fly'][0])]:              # not over the site shot
    text.append(dict(k='chip', t0=a, t1=z, text='Charcoal on paper · 62 × 94 cm · by hand'))
# ---- the title on the next accent, over the drawing the camera has pushed into
D3 = O[4]; t_j = bt(D3, 4)
photo(D3, t_j, 'p_final_clean', contain=True, keys=[[0, 0.5, 0.5, 1.0], [1, 0.5, 0.5, 0.966]])
text.append(dict(k='title', t0=D3, t1=t_j, text='Must fight back', glitch=[bt(D3, n) for n in range(4)]))
# ---- the read
t_m = bt(O[5], 6)
uu = lambda t: round((t - t_j) / (t_m - t_j), 3)
photo(t_j, t_m, 'p_final_clean', contain=True, keys=[[0.0, 0.5, 0.5, 0.966], [uu(bt(t_j, 1.5)), 0.36, 0.42, 0.52], [uu(bt(O[5], -.5)), 0.40, 0.70, 0.46],
                                                     [uu(bt(O[5], 2.5)), 0.63, 0.58, 0.48], [1.0, 0.77, 0.30, 0.46]])
say(t_j + 0.1, bt(O[5], 1) - 0.06, 'big', 'Kicked down.')
say(bt(O[5], 1), t_m - 0.04, 'big', 'Still standing.')
# ---- the piece in the world: the owner's frame images, two beats each
mocks = [('m_living', [0.5, 0.30, 0.70]), ('m_gold', [0.5, 0.42, 0.74]), ('m_concrete', [0.5, 0.46, 0.78]),
         ('m_laptop', [0.5, 0.36, 0.76]), ('m_gallery', [0.5, 0.40, 0.80])]
for i, (img, cc) in enumerate(mocks):
    photo(bt(t_m, 2 * i), bt(t_m, 2 * i + 2), img, [0.5, 0.5, 1.0], cc, 'out')
t_c = O[7]
E = bt(O[8], 4)
photo(t_c, TOTAL, 'm_casino', [0.5, 0.5, 1.0], [0.5, 0.44, 0.86], 'lin', dim=[[O[8] - 0.2, 0.6], [E, 0.78]])
say(t_c + 0.2, O[8] - 0.08, 'dateb', '16.10.2026'); say(24.10, O[8] - 0.08, 'big', 'Gamdom is back.')
# ---- gamdom.com on "you can try it": two cinematic shots
cine += [dict(t0=O[8], t1=bt(O[8], 2), img='img/s_koth.jpg', keys=[[0, 0, -40, 60, 16, 6], [1, 0, -20, 300, 9, 3]]),
         dict(t0=bt(O[8], 2), t1=E, img='img/s_home.jpg', keys=[[0, -120, 130, 330, 20, 5], [1, -40, 100, 140, 11, 3]])]
say(O[8] + 0.06, bt(O[8], 2) - 0.03, 'cap', 'King of the Hill')
say(bt(O[8], 2) + 0.06, E - 0.03, 'cap', 'Casino · Sports')
text.append(dict(k='end', t0=E, t1=TOTAL, e2=bt(E, 3), e3=bt(E, 5)))
plan = dict(fps=30, W=1920, H=1080, total=TOTAL, drop=O[3], full=D3, art='img/p_final_clean.jpg', art_wh=[4000, 2670], tweets=tweets,
            orbit=orbit, cine=cine, accents=O, segs=segs, text=text, clips=clips, audio=dict(src=f'{A}/mix32.wav', **{'in': 0}, fade=[TOTAL - 0.05, 0.05]))
json.dump(plan, open(OUT, 'w'), indent=1)
print(f'total {TOTAL} · fall 0–{O[1]} · orbit {p1} cine {c1} orbit {p2} · push {O[3]}–{O[4]} · read {t_j}–{t_m} · frames {t_m}–{t_c} · casino {t_c} · cine {O[8]}–{E} · end {E}')
