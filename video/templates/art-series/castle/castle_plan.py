"""The Gamdom castle film (#Gamdom100kRound2, 4 Nov 2026): the timeline, every cut snapped to "Fragments Of Bangkok".
python3 -I castle_plan.py <beats.json> <assets dir> <out plan.json>

The story is the owner's drawing, read in its own order:
  cold open   the eye, the tear ("13.10.2026 · Gamdom went offline. They said it was over.")
  the wall    the finished piece veiled in the centre, the real sessions in the side panels (the owner's concept)
  the drop    the panels break into a mosaic of the piece made from the owner's own frames; it melts into the photo
  the read    the camera travels through the drawing: the name, the eye, the tear, the ruins, the stones, the flags
  the return  the drawn castle cuts to Gamdom's real castle logo ("16.10.2026 · Gamdom is back"), then the live site
  the close   blank page to finished piece, the artist at the wall, the credits, the hashtag on the last hit."""
import json, sys
B = json.load(open(sys.argv[1])); A = sys.argv[2]; OUT = sys.argv[3]
OFF = 13.954                                   # track second at video 0: the first stab (35.954) lands at video 22.0
beats = [round(b - OFF, 3) for b in B['beats'] if b - OFF > 0.1]
snap = lambda t: min(beats, key=lambda b: abs(b - t))
D, D2, D3 = 22.0, 23.03, 25.12                 # stab, second stab, the full hit (measured on the track)
END_STAB = round(88.69 - OFF, 3)               # the last hit before the fade: the hashtag lands here
TOTAL = round(END_STAB + 3.3, 2)
P = f'{A}/process.mp4'
clips = {'proc': {'path': P}, 'home': {'path': f'{A}/site/home.mp4'}, 'orig': {'path': f'{A}/site/orig.mp4'},
         'sports': {'path': f'{A}/site/sports.mp4'}, 'koth': {'path': f'{A}/site/koth.mp4'}, 'rewards': {'path': f'{A}/site/rewards.mp4'}}
# where the real picture sits inside each part of the owner's 59 s compilation (measured with cropdetect)
R = {'A': [0, 420, 1080, 1080], 'B': [166, 0, 748, 1920], 'C': [0, 94, 1080, 1732], 'D': [0, 656, 1080, 608], 'E': [0, 0, 1080, 1920],
     'F': [6, 0, 1068, 1920], 'G': [0, 420, 1080, 1080]}
FX = {'A': .33, 'D': .26}                                 # the first-black clip: keep the artist's arm and the black in the panel
segs, text = [], []
def photo(t0, t1, img, c0, c1, ease='inout', fade=0): segs.append(dict(slot='photo', t0=t0, t1=t1, img=img, crop0=c0, crop1=c1, ease=ease, fade=fade))
def line(t0, t1, s, k='line'): text.append(dict(k=k, t0=round(t0, 3), t1=round(t1, 3), text=s))
# ---- cold open: the eye, then the tear
c1 = snap(3.4); o1 = snap(6.4)
photo(0.0, c1, 'p_letters', [0.34, 0.36, 0.50], [0.36, 0.20, 0.50], 'lin', fade=0.7)   # the smoke rising
photo(c1, o1, 'p_letters', [0.715, 0.6, 0.28], [0.71, 0.6, 0.40], 'out')   # the eye, pulling back
line(0.45, 3.2, '13.10.2026', 'date'); line(1.1, c1 - 0.05, 'Gamdom went offline.')
line(c1 + 0.25, o1 - 0.1, 'They said it was over.')
# ---- the wall: the veiled piece and the real sessions, cut every two beats, the two panels taking turns
b0, b1 = o1, round(D - 0.75, 3)
wb = [b for b in beats if b0 - 1e-3 <= b < b1 - 0.3]
cuts = wb[::2]
order = [  # (part, source from, to, label, speed): the sessions in the order they were drawn
    ('A', 0.4, 4.6, 'THE FIRST BLACK', 1.0), ('B', 5.4, 10.3, 'THE FIRST LETTERS', 1.0), ('C', 11.0, 17.0, 'THE NAME', 1.0),
    ('E', 37.15, 40.5, 'THE TOOLS', 1.0), ('C', 17.0, 23.0, 'THE EYE', 1.0), ('D', 29.5, 36.2, 'HOURS AT THE WALL', 1.0),
    ('C', 23.0, 28.8, 'LASH BY LASH', 1.0), ('F', 41.0, 44.8, 'THE RUINS', 1.0), ('F', 44.8, 48.6, 'THE CASTLE', 1.0),
    ('G', 49.4, 56.8, 'THE LAST LINES', 1.0)]
for j, a in enumerate(cuts):
    part, s0, s1, lab, sp = order[min(len(order) - 1, j * len(order) // len(cuts))]
    z = cuts[j + 2] if j + 2 < len(cuts) else b1
    n_same = sum(1 for k in range(len(cuts)) if order[min(len(order) - 1, k * len(order) // len(cuts))][3] == lab)
    k_in = sum(1 for k in range(j) if order[min(len(order) - 1, k * len(order) // len(cuts))][3] == lab)
    span = (z - a) * sp
    src = s0 + max(0, (s1 - s0 - span)) * (k_in / max(1, n_same - 1) if n_same > 1 else 0)
    segs.append(dict(slot='L' if j % 2 == 0 else 'R', clip='proc', t0=a, t1=z, src=round(src, 3), speed=sp, rect=R[part], label=lab, fx=FX.get(part, .5)))
first_r = next(s for s in segs if s['slot'] == 'R')
segs.append(dict(slot='R', clip='proc', t0=b0, t1=first_r['t0'], src=2.6, speed=1.0, rect=R['A'], label='THE FIRST BLACK', fx=.33))
lb = [b for b in wb if b > b0 + 0.6]
vl = ['So I picked up the charcoal.', 'Every line by hand.', 'Day after day.', 'No AI. No shortcuts.']
st = len(lb) // len(vl)
for i, s in enumerate(vl):
    line(lb[i * st], (lb[(i + 1) * st] - 0.12) if i < len(vl) - 1 else b1 - 0.05, s, 'vline')
text.append(dict(k='chip', t0=b0 + 0.2, t1=b1, text='Charcoal on paper · 62 × 94 cm · by hand'))
# ---- the drop
t_read = snap(28.4)
text.append(dict(k='title', t0=D3, t1=t_read, text='Must fight back', glitch=[b for b in beats if D3 - 1e-3 <= b < t_read]))
# ---- the read: the drawing in its own order
rd = [b for b in beats if t_read - 1e-3 <= b]
shots = [('p_letters', [0.12, 0.64, 0.50], [0.32, 0.64, 0.50], 'They hit the name.'),
         ('p_tear', [0.41, 0.20, 0.50], [0.41, 0.18, 0.36], 'The whole world watched.'),
         ('p_tear', [0.42, 0.45, 0.40], [0.42, 0.78, 0.40], 'One tear fell…'),
         ('p_ruins', [0.44, 0.84, 0.40], [0.64, 0.74, 0.50], '…into the ruins.'),
         ('p_base', [0.60, 0.48, 0.72], [0.62, 0.55, 0.50], 'Stone by stone,'),
         ('p_flags', [0.55, 0.70, 0.62], [0.55, 0.30, 0.62], 'the castle rose.')]
k = 0
for img, c0, cc1, s in shots:
    a, z = rd[k], rd[k + 5]; k += 5
    photo(a, z, img, c0, cc1)
    line(a + 0.12, z - 0.08, s)
t_logo = rd[k]
# ---- the return: the real logo, then the live site in a floating screen
t_site = rd[k + 6]
segs.append(dict(slot='still', t0=t_logo, t1=t_site, img='splash'))
line(t_logo + 0.25, t_site - 0.05, '16.10.2026', 'date2'); line(t_logo + 0.75, t_site - 0.05, 'Gamdom is back.', 'cap2')
sb = [b for b in beats if t_site - 1e-3 <= b]
screens = [('home', 0.6, 'Casino · 8,000+ games', 5), ('orig', 0.0, 'Every Original, rebuilt', 6), ('sports', 0.4, 'Sports · 30+ categories', 5),
           ('koth', 0.4, 'King of the Hill · $500k', 5), ('rewards', 0.3, 'Royalty ranks', 4)]
k = 0
for cid, src, cap, nb in screens:
    a, z = sb[k], sb[k + nb]; k += nb
    segs.append(dict(slot='screen', clip=cid, t0=a, t1=z, src=src, speed=1.0))
    line(a + 0.06, z - 0.05, cap, 'cap')
# ---- the close
t_blank = sb[k]
hb = [b for b in beats if t_blank - 1e-3 <= b]
t_rush, t_this, t_cred = hb[2], hb[4], hb[12]
segs.append(dict(slot='box', clip='proc', t0=t_blank, t1=t_rush, src=0.5, speed=1.0, rect=R['A']))
segs.append(dict(slot='box', clip='proc', t0=t_rush, t1=t_this, src=0.5, speed=round((56.4 - 0.5) / (t_this - t_rush), 3), rect=[0, 0, 1080, 1920], rush=True))
line(t_blank + 0.1, t_this - 0.05, 'From a blank page…', 'line')
photo(t_this, t_cred, 'p_final', [0.5, 0.5, 1.0], [0.5, 0.5, 0.92], 'out')
segs[-1]['contain'] = True
line(t_this + 0.1, t_cred - 0.1, '…to this.', 'line')
t_tag = round(END_STAB - 2.72, 3)
segs.append(dict(slot='box', clip='proc', t0=t_cred, t1=t_tag, src=49.6, speed=1.0, rect=R['G']))
text.append(dict(k='credit', t0=t_cred + 0.15, t1=t_tag - 0.05, lines=['Drawn by hand', '@i_am_vickyd', 'Charcoal on paper · 62 × 94 cm', 'Every frame real · no AI']))
photo(t_tag, TOTAL, 'p_final', [0.5, 0.5, 1.0], [0.5, 0.5, 0.96], 'out')
segs[-1]['contain'] = True; segs[-1]['dim'] = [t_tag, END_STAB, 0.5, 0.74]
line(t_tag + 0.15, END_STAB - 0.05, 'Must fight back when kicked down.', 'line')
text.append(dict(k='end', t0=END_STAB, t1=TOTAL, text='#Gamdom100kRound2', code='Code STEVE', sub='18+ | Gamble responsibly'))
plan = dict(fps=30, W=1920, H=1080, total=TOTAL, drop=D, drop2=D2, full=D3, build=[b0, b1], fly=[b1, D], wave=[D2, round(D2 + 1.0, 3)],
            grow=[round(D3 - 0.75, 3), D3], art_full=[D3, t_read], art='img/p_final.jpg', art_wh=[4000, 2670], segs=segs, text=text,
            audio=dict(src=f'{A}/625.mp3', **{'in': OFF}, fade=[round(TOTAL - 1.6, 2), 1.6]), clips=clips)
json.dump(plan, open(OUT, 'w'), indent=1)
print(f'total {TOTAL} s · open→{o1} · wall {b0}–{b1} ({len(cuts)} cuts) · drop {D}/{D2}/{D3} · read {t_read}–{t_logo} · logo {t_logo} · site {t_site}–{t_blank} · close {t_blank} · credits {t_cred} · tag {t_tag} · end {END_STAB}')
