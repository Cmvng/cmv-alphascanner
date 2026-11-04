"""The entry, second cut (4 Nov 2026, after the owner's notes): 32.2 s on the rap track from the effects reel the owner sent.
python3 -I castle32_plan.py <assets dir> <out plan.json>

The owner's notes on the 31-second cut: keep the frames sequence; the opening didn't promote Gamdom or tell the story; the
Mixkit track was "very poor", so use the music from the samples they sent. The track is from their 29 Oct effects-reel
sample: 151 bpm, an accent every two bars (3.17885 s) from 1.485 s, each rap line sitting between two accents. It runs
25.87 s, so the mix repeats two bars on the beat: source 0–23.40 then 17.0423–25.867 (the instrumental matches to 0.999
there; the words run "…can't be ignored / back and better, this is me but reinforced"). Accents in the film: O0…O9.

  0.00  the fall: the drawn eye on "I've seen it all" (13.10.2026 · Gamdom went offline.); on the accent, Gamdom's own post
        ("We're currently offline…", the real embed); then the ruins: "They said it was over."
  4.66  the wall: the veiled piece; the owner's sessions on the left; gamdom.com on a phone on the right, shown whole;
        each panel says what it shows
 10.23  the panels fly in as the mosaic (lands on the accent), melt into the drawing; MUST FIGHT BACK on the next accent
 15.79  one camera move: the eye, the tear, the ruins ("Kicked down."), then the stones, the tower, the flags
        ("Still standing.") on "back and better"
 19.76  the owner's frame images, two beats each (the sequence they liked, re-timed)
 23.74  the Gamdom casino lounge: "16.10.2026 · Gamdom is back." on the second "back and better"
 26.92  gamdom.com whole in a floating screen on "you can try it": Originals, King of the Hill
 28.51  the end card: Gamdom's logo, #GAMDOM100KROUND2, Code STEVE, 18+ | Gamble responsibly, the handle"""
import json, sys
A, OUT = sys.argv[1], sys.argv[2]
H0, PER = 1.485, 3.17885
b = PER / 8
O = [round(H0 + k * PER, 3) for k in range(10)]
bt = lambda t, n: round(t + n * b, 3)                     # n beats after t
TOTAL = 32.2
clips = {'proc': {'path': f'{A}/process.mp4'},
         'mhome': {'path': f'{A}/mob/mhome.mp4'}, 'morig': {'path': f'{A}/mob/morig.mp4'}, 'mkoth': {'path': f'{A}/mob/mkoth.mp4'},
         'orig': {'path': f'{A}/site/orig.mp4'}, 'koth': {'path': f'{A}/site/koth.mp4'}}
R = {'A': [0, 420, 1080, 1080], 'C': [0, 94, 1080, 1732], 'F': [6, 0, 1068, 1920], 'mob': [0, 0, 824, 1464], 'site': [0, 0, 1920, 1080]}
segs, text = [], []
def photo(t0, t1, img, c0=None, c1=None, ease='inout', **k):
    segs.append(dict(slot='photo', t0=round(t0, 3), t1=round(t1, 3), img=img, crop0=c0, crop1=c1, ease=ease, **k))
def say(t0, t1, k, s, **kw): text.append(dict(k=k, t0=round(t0, 3), t1=round(t1, 3), text=s, **kw))
# ---- the fall
photo(0.0, O[0], 'p_letters_clean', [0.715, 0.6, 0.48], [0.712, 0.6, 0.53], 'out', fade=0.3)          # the eye
say(0.3, O[0] - 0.06, 'date', '13.10.2026'); say(0.6, O[0] - 0.06, 'line', 'Gamdom went offline.')
t_ru = bt(O[0], 4)
photo(O[0], t_ru, 'p_letters_clean', [0.5, 0.5, 1.0], [0.5, 0.5, 0.93], 'lin', dim=[[O[0] - 0.4, 0.58]])   # the letters, under Gamdom's post
tweets = [dict(t0=O[0], t1=t_ru, img='img/tw_offline.png')]
photo(t_ru, O[1], 'p_final_clean', contain=True, keys=[[0, 0.39, 0.60, 0.53], [1, 0.40, 0.68, 0.47]])      # down the tear to the ruins
say(t_ru + 0.12, O[1] - 0.06, 'line', 'They said it was over.')
# ---- the wall: the owner's sessions on the left, gamdom.com on a phone on the right, each panel labelled with what it shows
fly = bt(O[3], -2)
L = [('A', 1.5, 'THE FIRST BLACK', .33, O[1], bt(O[1], 4)), ('C', 11.0, 'THE NAME', .5, bt(O[1], 4), O[2]),
     ('C', 17.0, 'THE EYE', .5, O[2], bt(O[2], 4)), ('F', 46.4, 'THE CASTLE', .5, bt(O[2], 4), fly)]
for part, src, lab, fx, a, z in L:
    segs.append(dict(slot='L', clip='proc', t0=a, t1=z, src=src, speed=1.0, rect=R[part], label=lab, fx=fx))
Rr = [('mhome', 0.4, 'GAMDOM.COM', O[1], bt(O[1], 6)), ('morig', 0.3, 'GAMDOM ORIGINALS', bt(O[1], 6), bt(O[1], 10)),
      ('mkoth', 0.3, 'KING OF THE HILL', bt(O[1], 10), fly)]
for cid, src, lab, a, z in Rr:
    segs.append(dict(slot='R', clip=cid, t0=a, t1=z, src=src, speed=1.0, rect=R['mob'], label=lab, fx=.5))
for (a, z, s) in [(O[1] + 0.18, bt(O[1], 4) - 0.1, 'So I picked up the charcoal.'), (bt(O[1], 4) + 0.12, O[2] - 0.1, 'Every line by hand.'),
                  (O[2] + 0.12, fly - 0.08, 'No AI. No shortcuts.')]:
    say(a, z, 'vline', s)
text.append(dict(k='chip', t0=round(O[1] + 0.2, 3), t1=fly, text='Charcoal on paper · 62 × 94 cm · by hand'))
# ---- the drop: the mosaic lands on the accent, melts three beats later, the title on the next accent
D, D2, D3 = O[3], bt(O[3], 3), O[4]
t_j = bt(D3, 4)
text.append(dict(k='title', t0=D3, t1=t_j, text='Must fight back', glitch=[bt(D3, n) for n in range(4)]))
# ---- one move across the drawing: the fall, then the rise on "back and better"
t_m = bt(O[5], 6)
uu = lambda t: round((t - t_j) / (t_m - t_j), 3)
photo(t_j, t_m, 'p_final_clean', contain=True, keys=[[0.0, 0.5, 0.5, 0.966], [uu(bt(t_j, 1.5)), 0.36, 0.42, 0.52], [uu(bt(O[5], -.5)), 0.40, 0.70, 0.46],
                                                     [uu(bt(O[5], 2.5)), 0.63, 0.58, 0.48], [1.0, 0.77, 0.30, 0.46]])   # whole, eye, ruins, stones, flags
say(t_j + 0.1, bt(O[5], 1) - 0.06, 'big', 'Kicked down.')            # the ruins, held to the word "back"
say(bt(O[5], 1), t_m - 0.04, 'big', 'Still standing.')                # on "back and better", as the camera climbs
# ---- the piece in the world: the owner's frame images, two beats each
mocks = [('m_living', [0.5, 0.30, 0.70]), ('m_gold', [0.5, 0.42, 0.74]), ('m_concrete', [0.5, 0.46, 0.78]),
         ('m_laptop', [0.5, 0.36, 0.76]), ('m_gallery', [0.5, 0.40, 0.80])]
for i, (img, c1) in enumerate(mocks):
    photo(bt(t_m, 2 * i), bt(t_m, 2 * i + 2), img, [0.5, 0.5, 1.0], c1, 'out')
t_c = O[7]
assert abs(bt(t_m, 10) - t_c) < 0.002, (bt(t_m, 10), t_c)
# ---- Gamdom is back, on the second "back and better"; then the live site on "you can try it"; then the end card
E = bt(O[8], 4)
photo(t_c, TOTAL, 'm_casino', [0.5, 0.5, 1.0], [0.5, 0.44, 0.86], 'lin', dim=[[O[8] - 0.2, 0.6], [E, 0.78]])
say(t_c + 0.2, O[8] - 0.08, 'dateb', '16.10.2026'); say(24.10, O[8] - 0.08, 'big', 'Gamdom is back.')
for cid, src, cap, a, z in [('orig', 0.0, 'Gamdom Originals', O[8], bt(O[8], 2)), ('koth', 0.4, 'King of the Hill', bt(O[8], 2), E)]:
    segs.append(dict(slot='screen', clip=cid, t0=a, t1=z, src=src, speed=1.0, rect=R['site']))
    say(a + 0.06, z - 0.03, 'cap', cap)
text.append(dict(k='end', t0=E, t1=TOTAL, e2=bt(E, 3), e3=bt(E, 5)))
W, H = 4000, 2670; sc = min(1920 / W, 1080 / H); mw, mh = W * sc, H * sc
plan = dict(fps=30, W=1920, H=1080, total=TOTAL, drop=D, drop2=D2, full=D3, build=[O[1], fly], fly=[fly, D], wave=[D2, round(D2 + 1.0, 3)],
            grow=[fly, D], art_full=[D, t_j], art='img/p_final_clean.jpg', art_wh=[W, H], push_to=1.035,
            mos_box=[round((1920 - mw) / 2, 2), round((1080 - mh) / 2, 2), round(mw, 2), round(mh, 2)], tweets=tweets, accents=O,
            segs=segs, text=text, clips=clips, audio=dict(src=f'{A}/mix32.wav', **{'in': 0}, fade=[TOTAL - 0.05, 0.05]))
json.dump(plan, open(OUT, 'w'), indent=1)
print(f'total {TOTAL} · accents {O}\n fall 0–{O[1]} · wall {O[1]}–{fly} · drop {D}/{D2}/{D3} · move {t_j}–{t_m} · frames {t_m}–{t_c} · casino {t_c} · site {O[8]} · end {E}')
