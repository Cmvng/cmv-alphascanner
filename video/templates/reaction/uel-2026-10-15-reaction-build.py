# builds video/out/reaction-2026-10-15-postcards.json: this afternoon's five postcards against tonight's results (presenter format)
# Judged on the result. Scores and scorers: ESPN match data and UEFA's match feed, read 15 Oct 2026 after full time (both agree).
import json, copy, re, unicodedata, os
V = '/home/user/cmv-alphascanner/video/'
src = json.load(open(V + 'out/analysis-2026-10-15-postcards.json'))
MED = V + '.cache/media/analysis-2026-10-15-postcards/'
venues = json.load(open(MED + 'venues.json'))
NAMES = {'Crystal Palace': 'Crystal Palace', 'AC Milan': 'Milan', 'Celta': 'Celta Vigo'}
info = {  # analysis pick index → score, stadium photo
  0: dict(score=('3', '2'), st='s_lyon.jpg'),
  1: dict(score=('0', '4'), st='s_salzburg.jpg'),
  2: dict(score=('1', '2'), st='s_celta.jpg'),
  3: dict(score=('0', '1'), st='s_marseille.jpg'),
  4: dict(score=('4', '1'), st='s_benfica.jpg'),
}
picks = []
for k in range(5):
  p = copy.deepcopy(src['picks'][k]); i = info[k]
  p.update(stage='Matchday 2', score_home=i['score'][0], score_away=i['score'][1], stadium=MED + i['st'], stadium_credit=venues[i['st']])
  for side in ('home', 'away'):
    slug = re.sub(r'[^a-z0-9]+', '_', unicodedata.normalize('NFD', p[side]).encode('ascii', 'ignore').decode().lower()).strip('_')
    p['crest_' + side] = V + '.cache/crests/' + slug + '.png'
    p[side] = NAMES.get(p[side], p[side]); p[side + '_short'] = p[side]
  picks.append(p)
LY, SA, CE, MA, BE = range(5)

# the board games keep the app's names (their crests are cached by them) and the analysis short names; they get the score
BOARD = {  # analysis index → (home goals, away goals, note)
  5: ('0', '3', 'Omonia: three away goals'), 6: ('1', '1', 'Honours even in Leuven'), 7: ('1', '2', 'Sunderland win in Leiria'),
  8: ('0', '4', 'Four for Leverkusen'), 9: ('2', '1', 'Three points for AZ'), 10: ('1', '1', "Sparta's winning run ends"),
  11: ('2', '3', 'Two wins from two for Beşiktaş'), 12: ('3', '0', 'A clean sheet, and six points'), 13: ('2', '1', 'Ferencváros still unbeaten'),
  14: ('1', '0', 'Dinamo edge Anderlecht'), 15: ('3', '1', 'The losing run is over'), 16: ('1', '1', 'A point for NEC'),
  17: ('2', '1', 'Ajax beaten in Split'), 18: ('1', '2', 'Monaco win away'), 19: ('1', '1', 'A point for Getafe'),
  20: ('2', '1', 'Panathinaikos bounce back'), 21: ('3', '1', 'Three for Atalanta'), 22: ('4', '0', 'Four, and a clean sheet'),
  23: ('3', '0', 'Braga beaten again'), 24: ('3', '2', 'Five goals in Freiburg'),
}
CITY = {}
for b in src['review']['beats']:
  if b['type'] == 'pc_board':
    for c in b['cards']: CITY[c['match']] = c['city']
bidx = {}
for k, (h, a, note) in BOARD.items():
  p = copy.deepcopy(src['picks'][k]); p.update(score_home=h, score_away=a, stadium=False); bidx[k] = len(picks); picks.append(p)
def card(k): return dict(match=bidx[k], city=CITY[k], note=BOARD[k][2])

def at(line, phrase):
  j = line.index(phrase); return [0, round(j / len(line), 3)]
def take(m, text, crest, people, say): return dict(type='rx_take', match=m, take=text, crests=[crest], people=people, say=[say])
def reveal(m, n, of, ok, scorers, people, say, **kw):
  b = dict(type='rx_reveal', match=m, n=n, of=of, ok=ok, scorers=scorers, people=people, say=[say], tally_at=at(say, 'Called it'))
  b.update(kw); return b

beats = [
  dict(type='rx_cold', tint='blue', people=['Keito Nakamura', 'Gonçalo Ramos', 'Randal Kolo Muani', 'Vangelis Pavlidis'],
       say=['This afternoon, we sent five postcards.', 'Milan scored four in Salzburg.', 'Juventus won it in stoppage time.', 'So, how many arrived?'],
       steps=[dict(big='5', label='postcards this afternoon'), dict(big='4', label='Milan goals in Salzburg', tone='hot'),
              dict(big="90+2'", label='the winner in Vigo', tone='red'), dict(big='?', label='the results', tone='hot', glitch=True)],
       tail=0.6),
  dict(type='rx_intro', drop=True, crests=5, title='Our analysis', title2='vs the results',
       say=["This afternoon's Europa League postcards, against tonight's results. Five calls. Let's see how many arrived."]),
  take(LY, "**Lyon** don't lose", 'home', ['Keito Nakamura', 'Corentin Tolisso'],
       "We start in Lyon, at a quarter to six, with Pierre Sage back at his old club. Our call: Lyon don't lose."),
  reveal(LY, 1, 1, True, "Tolisso 8' · Nuamah 45+2' · Pino 50' · Šulc 76' · Kamada 81'", ['Keito Nakamura', 'Ernest Nuamah', 'Corentin Tolisso'],
       'Three–two to Lyon! Tolisso and Nuamah put them two up, Palace pulled one back twice, and Nakamura, on our postcard, set up two. Called it!'),
  take(SA, "**Milan** don't lose", 'away', ['Adrien Rabiot', 'Haris Tabaković'],
       "Same time, in Salzburg, unbeaten in fifteen games. Our call: Milan don't lose."),
  reveal(SA, 2, 2, True, "Cissé 15' 32' 49' · Gonçalo Ramos 72'", ['Gonçalo Ramos', 'Adrien Rabiot'],
       "Four–nil to Milan! Alphadjo Cissé became the youngest Italian to score a hat-trick in Europe, and Gonçalo Ramos added a fourth. Called it!",
       sticker={'e': '🎩', 'at': 0.3, 'x': 50, 'y': 790, 'r': -10}),
  take(CE, "**Juventus** don't lose", 'away', ['Iago Aspas', 'Francisco Conceição'],
       "Eight o'clock, Vigo. Juventus had kept four clean sheets in a row in Europe. Our call: Juventus don't lose."),
  reveal(CE, 3, 3, True, "Hugo Álvarez 18' · Woltemade 58' · Kolo Muani 90+2'", ['Randal Kolo Muani', 'Nick Woltemade'],
       'Two–one to Juventus! Celta scored first, Woltemade levelled, and Kolo Muani headed the winner in stoppage time. Called it! Three from three.',
       sticker={'e': '⏱️', 'at': 0.62, 'x': 50, 'y': 790, 'r': 10}),
  take(MA, "**Olympiacos** don't lose", 'away', ['Amine Gouiri'],
       "In Marseille, the home side had lost four in a row in September. Our call: Olympiacos don't lose."),
  reveal(MA, 4, 4, True, "Hezze 42'", [],
       'One–nil to Olympiacos! Hezze headed in the only goal before half-time, and Marseille never found a way back. Called it! Four from four.'),
  dict(type='pc_board', kicker='Europa League · matchday 2 · full time', l1='Also', l2='tonight', cols=3,
       cards=[card(k) for k in range(5, 17)], hl=[{'j': 6, 'at': [1, 0.0], 'to': [1, 0.55]}, {'j': 3, 'at': [1, 0.55]}],
       say=['Before the last postcard, the rest of the Europa League.', 'Beşiktaş beat Hoffenheim three–two, and Leverkusen scored four in Poland.']),
  dict(type='pc_board', kicker='Conference League · matchday 1 · full time', l1='Opening', l2='night', cols=2,
       cards=[card(k) for k in range(17, 25)], hl=[{'j': 0, 'at': [0, 0.45]}],
       say=["And on the Conference League's opening night, Ajax lost two–one at Hajduk Split."]),
  take(BE, 'A **Benfica** win', 'home', ['Vangelis Pavlidis', 'Callum McGregor'],
       'And the last postcard: Lisbon, where Celtic won the European Cup in nineteen sixty-seven. Our call: a Benfica win.'),
  reveal(BE, 5, 5, True, "J. Durán 5' (pen) 36' · Bah 23' · C. Durán 63' · Pavlidis 89'", ['Jhon Durán', 'Vangelis Pavlidis', 'Alexander Bah'],
       "Benfica beat Celtic, four–one! Jhon Durán scored twice, Celtic's Camilo Durán pulled one back, and Pavlidis, on our postcard, made it four. Called it! Five from five!",
       burst={'e': '🔥⚽🔥', 'at': 1.0}),
  dict(type='rx_outro', n=5, of=5, ok=True, sub='on Thursday night', follow='Follow for the next analysis',
       say=['Five postcards, five delivered. A perfect night. Follow for the next analysis.']),
]
cfg = {
  'mode': 'review', 'title': 'Our analysis vs the results: Europa League Thursday, 15 Oct', 'competition': 'UEFA Europa League',
  'date': '2026-10-15', 'caption_style': 'bold', 'voice_speed': 1.05, 'voice': 'af_heart',
  'presenter': {'id': 28293, 'crop': '1000:1080:460:0', 'from': 0.5, 'credit': 'Presenter (stand-in): Mixkit stock video'},
  'sound': 'cinematic', 'voice_fx': 'deep', 'music_drop': 'rx_intro', 'music_vibe': ['cinematic'], 'music_track': 586, 'music_drop_at': 17.33,
  'media_dir': '.cache/media/analysis-2026-10-15-postcards', 'picks': picks, 'review': {'beats': beats},
}
for p in picks[:5]:
  for side in ('home', 'away'): assert os.path.exists(p['crest_' + side]), p['crest_' + side]
json.dump(cfg, open(V + 'out/reaction-2026-10-15-postcards.json', 'w'), ensure_ascii=False, indent=1)
w = sum(len(' '.join(b['say']).split()) for b in beats)
print('words', w, '≈', round(w * 0.394), 's')
for b in beats:
  for s in b['say']:
    if '/' in s: print('SLASH', s)
