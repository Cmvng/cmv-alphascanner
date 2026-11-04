"""The 30-second cut of the castle film (the entry, 4 Nov 2026). python3 -I castle30_plan.py <beats.json> <assets dir> <out plan.json>

Music: "Fragments Of Bangkok" from 25.274 s, so the first stab (35.954) lands at 10.68, the second (36.984) at 11.71, the
full hit (39.074) at 13.80, and the downbeat after the long drum run (53.197) at 27.92, where the end card lands.
  0.00  cold open: the smoke ("13.10.2026 · Gamdom went offline."), then the eye ("They said it was over.")
  4.27  the owner's wall: the veiled piece in the centre, the sessions on the left, Gamdom's live site on the right
  9.93  the panels fly in and become a mosaic of the piece made of the owner's frames; it melts into the drawing
 13.80  MUST FIGHT BACK; then one camera move across the drawing, from the fall (the eye, the tear, the ruins) to the
        rise (the stones, the tower, the flags): "KICKED DOWN." / "STILL STANDING."
 20.21  the piece in the world, the owner's frame images on the beat: home, the gold frame, the concrete wall, Gamdom's
        homepage, the Gamdom gallery
 25.55  the Gamdom casino lounge: "16.10.2026 · Gamdom is back."
 27.92  the end card on the downbeat: Gamdom's logo, #GAMDOM100KROUND2, Code STEVE, 18+ | Gamble responsibly"""
import json, sys
B = json.load(open(sys.argv[1])); A = sys.argv[2]; OUT = sys.argv[3]
T0 = 25.274
beats = [round(b - T0, 3) for b in B['beats'] if b - T0 > 0.05]
snap = lambda t: min(beats, key=lambda b: abs(b - t))
BAR = 4 * B['period']
D, D2, D3 = round(35.954 - T0, 3), round(36.984 - T0, 3), round(39.074 - T0, 3)
E, E2, E3 = round(53.197 - T0, 3), round(54.404 - T0, 3), round(55.205 - T0, 3)
TOTAL = 31.5
P = f'{A}/process.mp4'
clips = {'proc': {'path': P}, 'home': {'path': f'{A}/site/home.mp4'}, 'orig': {'path': f'{A}/site/orig.mp4'}, 'koth': {'path': f'{A}/site/koth.mp4'}}
R = {'A': [0, 420, 1080, 1080], 'C': [0, 94, 1080, 1732], 'F': [6, 0, 1068, 1920], 'site': [0, 0, 1920, 1080]}
segs, text = [], []
def photo(t0, t1, img, c0=None, c1=None, ease='inout', **k):
    segs.append(dict(slot='photo', t0=round(t0, 3), t1=round(t1, 3), img=img, crop0=c0, crop1=c1, ease=ease, **k))
def say(t0, t1, k, s): text.append(dict(k=k, t0=round(t0, 3), t1=round(t1, 3), text=s))
# ---- cold open (2 bars)
b1o = round(D - 4 * BAR, 3)                # the first barline after the start (2.14)
b0 = round(D - 3 * BAR, 3)                 # the wall starts on the next one (4.27)
photo(0.0, b1o, 'p_letters_clean', [0.34, 0.36, 0.50], [0.36, 0.22, 0.50], 'lin', fade=0.6)
photo(b1o, b0, 'p_letters_clean', [0.715, 0.6, 0.48], [0.71, 0.6, 0.56], 'out')
say(0.35, b1o - 0.08, 'date', '13.10.2026'); say(0.8, b1o - 0.08, 'line', 'Gamdom went offline.')
say(b1o + 0.2, b0 - 0.08, 'line', 'They said it was over.')
# ---- the wall: sessions on the left, the live site on the right, a cut every two beats, the panels taking turns
fly = round(D - 0.75, 3)
cuts = [b for b in beats if b0 - 1e-3 <= b < fly - 0.6][::2]
left = [('A', 0.4, 4.6, 'THE FIRST BLACK', .33), ('C', 11.0, 17.0, 'THE EYE', .5), ('F', 41.0, 48.6, 'THE CASTLE', .5)]
right = [('orig', 0.0, 6.6, .52), ('koth', 0.4, 6.6, .55)]
li = ri = 0
for j, a in enumerate(cuts):
    z = cuts[j + 2] if j + 2 < len(cuts) else fly
    if j % 2 == 0:
        part, s0, s1, lab, fx = left[min(li, len(left) - 1)]; li += 1
        segs.append(dict(slot='L', clip='proc', t0=a, t1=z, src=s0, speed=1.0, rect=R[part], label=lab, fx=fx))
    else:
        cid, s0, s1, fx = right[min(ri, len(right) - 1)]; ri += 1
        segs.append(dict(slot='R', clip=cid, t0=a, t1=z, src=s0, speed=1.0, rect=R['site'], fx=fx))
first_l = next(s for s in segs if s['slot'] == 'L'); first_l['t0'] = b0   # the left panel opens with the wall
first_r = next(s for s in segs if s['slot'] == 'R')
segs.append(dict(slot='R', clip='home', t0=b0, t1=first_r['t0'], src=0.6, speed=1.0, rect=R['site'], fx=.45))
for (a, z, s) in [(b0 + 0.18, b0 + BAR - 0.1, 'So I picked up the charcoal.'), (b0 + BAR + 0.12, b0 + 2 * BAR - 0.1, 'Every line by hand.'),
                  (b0 + 2 * BAR + 0.12, fly - 0.08, 'No AI. No shortcuts.')]:
    say(a, z, 'vline', s)
text.append(dict(k='chip', t0=round(b0 + 0.2, 3), t1=fly, text='Charcoal on paper · 62 × 94 cm · by hand'))
# ---- the drop: mosaic → the drawing → the title
t_j = snap(D3 + BAR)
text.append(dict(k='title', t0=D3, t1=t_j, text='Must fight back', glitch=[b for b in beats if D3 - 1e-3 <= b < t_j]))
# ---- one move across the drawing: the fall, then the rise
jb = [b for b in beats if b >= t_j - 1e-3][:9]
t_m = jb[8]
photo(t_j, t_m, 'p_final_clean', contain=True, keys=[[0.0, 0.5, 0.5, 0.966], [0.25, 0.36, 0.42, 0.52], [0.5, 0.40, 0.70, 0.46],
                                                     [0.75, 0.63, 0.58, 0.48], [1.0, 0.77, 0.30, 0.46]])
say(jb[2] + 0.1, jb[5] - 0.05, 'big', 'Kicked down.')
say(jb[5] + 0.12, t_m - 0.04, 'big', 'Still standing.')
# ---- the piece in the world: the owner's frame images, two beats each
mb = [b for b in beats if b >= t_m - 1e-3][:11]
mocks = [('m_living', [0.5, 0.30, 0.70]), ('m_gold', [0.5, 0.42, 0.74]), ('m_concrete', [0.5, 0.46, 0.78]),
         ('m_laptop', [0.5, 0.36, 0.76]), ('m_gallery', [0.5, 0.40, 0.80])]
for i, (img, c1) in enumerate(mocks):
    photo(mb[2 * i], mb[2 * i + 2], img, [0.5, 0.5, 1.0], c1, 'out')
t_c = mb[10]
photo(t_c, TOTAL, 'm_casino', [0.5, 0.5, 1.0], [0.5, 0.44, 0.86], 'lin', dim=[E, 0.78])
say(t_c + 0.2, E - 0.08, 'dateb', '16.10.2026'); say(t_c + 0.45, E - 0.08, 'big', 'Gamdom is back.')
text.append(dict(k='end', t0=E, t1=TOTAL, e2=E2, e3=E3))
W, H = 4000, 2670; sc = min(1920 / W, 1080 / H); mw, mh = W * sc, H * sc
plan = dict(fps=30, W=1920, H=1080, total=TOTAL, drop=D, drop2=D2, full=D3, build=[b0, fly], fly=[fly, D], wave=[D2, round(D2 + 1.0, 3)],
            grow=[fly, D], art_full=[D, t_j], art='img/p_final_clean.jpg', art_wh=[W, H], push_to=1.035,
            mos_box=[round((1920 - mw) / 2, 2), round((1080 - mh) / 2, 2), round(mw, 2), round(mh, 2)],
            segs=segs, text=text, clips=clips, audio=dict(src=f'{A}/625.mp3', **{'in': T0}, fade=[TOTAL - 1.0, 1.0]))
json.dump(plan, open(OUT, 'w'), indent=1)
print(f'total {TOTAL} · open 0–{b0} · wall {b0}–{fly} ({len(cuts)} cuts) · drop {D}/{D2}/{D3} · move {t_j}–{t_m} · frames {t_m}–{t_c} · casino {t_c} · end {E} ({E2}, {E3})')
