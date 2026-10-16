# builds video/out/reaction-2026-10-16-streak.json: this morning's "Ten in a row?" calls against tonight's results (presenter format)
# Judged on the result. Scores and scorers: ESPN match data (site.api.espn.com summaries), read 16 Oct 2026 after full time.
import json, copy, re, unicodedata, os
V = '/home/user/cmv-alphascanner/video/'
src = json.load(open(V + 'out/predictions-2026-10-16-streak.json'))
MED = V + '.cache/media/postmatch-2026-10-16-streak/'
info = {  # prediction pick index → score, stadium photo, credit
  0: dict(score=('1', '0'), st='eintracht_frankfurt.jpg', cr='Deutsche Bank Park · Photo: Davicilio20 · CC0'),
  1: dict(score=('4', '2'), st='frosinone_calcio.jpg', cr='Benito Stirpe Stadium · Photo: Simone Vacca (SEKAM) · CC BY-SA 4.0'),
  2: dict(score=('0', '3'), st='le_mans_fc.jpg', cr='Stade Marie-Marvingt · Photo: Le Mans · CC BY 3.0'),
  3: dict(score=('1', '1'), st='deportivo_de_la_coruna.jpg', cr='Abanca Riazor · Photo: Jenócrates · CC BY-SA 4.0'),
  4: dict(score=('1', '2'), st='burnley_f_c.jpg', cr='Turf Moor · Photo: Adam Haworth · CC BY 2.0'),
}
STAGE = ['Bundesliga', 'Serie A', 'Ligue 1', 'LaLiga', 'Championship']
picks = []
for k in range(5):
  p = copy.deepcopy(src['picks'][k]); i = info[k]
  p.update(stage=STAGE[k], score_home=i['score'][0], score_away=i['score'][1], stadium=MED + i['st'], stadium_credit=i['cr'])
  for side in ('home', 'away'):
    slug = re.sub(r'[^a-z0-9]+', '_', unicodedata.normalize('NFD', p[side]).encode('ascii', 'ignore').decode().lower()).strip('_')
    p['crest_' + side] = V + '.cache/crests/' + slug + '.png'
    p[side] = p[side + '_short']
  p.pop('kit', None)
  picks.append(p)
FR, FS, LM, DE, BU = range(5)

def at(line, phrase):
  j = line.index(phrase); return [0, round(j / len(line), 3)]
def call(text, ok=True): return dict(label='Our call', text=text, ok=ok, yes='CALLED', no='MISSED', at=[0, 0.05])
def take(m, text, crest, people, say): return dict(type='rx_take', match=m, take=text, crests=[crest], people=people, say=[say])
def reveal(m, n, of, ok, scorers, people, say, label, phrase='Called it', **kw):
  b = dict(type='rx_reveal', match=m, n=n, of=of, ok=ok, scorers=scorers, people=people, say=[say], tally_at=at(say, phrase),
           streak=dict(i=m, label=label))
  b.update(kw); return b

beats = [
  dict(type='rx_cold', tint='blue', people=['Kristian Thorstvedt', 'Aron Dønnum', 'Jamie Vardy', 'Fer López'],
       say=['This morning, we asked: ten in a row?', 'Toulouse scored three at Le Mans.', 'Jamie Vardy scored at Turf Moor.', 'So, did we make it to ten?'],
       steps=[dict(big='10?', label='the question this morning', tone='hot'), dict(big='3', label='Toulouse goals at Le Mans'),
              dict(big="20'", label='Vardy at Turf Moor'), dict(big='?', label='the streak', tone='hot', glitch=True)],
       tail=0.6),
  dict(type='rx_intro', drop=True, crests=5, title='Ten in a row?', title2='The results',
       say=["This morning's five calls, against tonight's results. Five came in last night. Let's see how far the streak goes."]),
  reveal(FR, 1, 1, True, "Ebnoutalib 77'", [],
       "In Frankfurt, we said Frankfurt don't lose. They beat Cologne, one–nil, with a goal from Younes Ebnoutalib, thirteen minutes from time. Called it! Six in a row.",
       '6 in a row', extra=call("Frankfurt don't lose")),
  reveal(FS, 2, 2, True, "Calò 9' · Berardi 15' · Raimondo 26' 30' 57' · Thorstvedt 37'", ['Kristian Thorstvedt'],
       "In Frosinone, we said Frosinone don't lose. They beat Sassuolo by four goals to two, and Antonio Raimondo scored a hat-trick. Called it! Seven in a row.",
       '7 in a row', extra=call("Frosinone don't lose"), sticker={'e': '🎩', 'at': 0.55, 'x': 50, 'y': 790, 'r': -10}),
  reveal(LM, 3, 3, True, "Russell-Rowe 46' · Dønnum 59' · Tengstedt 87'", ['Aron Dønnum'],
       "At Le Mans, we said Toulouse stay unbeaten. They won three–nil, with goals from Russell-Rowe, Dønnum and Tengstedt. Called it! Eight in a row.",
       '8 in a row', extra=call("Toulouse don't lose")),
  reveal(DE, 4, 4, True, "Nsongo 63' · Requena 82'", [],
       "At Riazor, we said Deportivo don't lose. Deportivo went ahead in the second half, Levante levelled with eight minutes left, and one–all is enough. Called it! Nine in a row.",
       '9 in a row', extra=call("Deportivo don't lose")),
  take(BU, "**Burnley** don't lose", 'home', ['Jamie Vardy', 'Jacob Bruun Larsen'],
       "And the big one, for ten in a row. Burnley hadn't won at home in almost a year, and Wolves hadn't won at Turf Moor since twenty ten. Our call: Burnley don't lose."),
  reveal(BU, 4, 5, False, "Vardy 20' · Fer López 39' · Chirewa 72'", ['Jamie Vardy', 'Fer López', 'Tawanda Chirewa'],
       "Wolves beat Burnley, two–one. Jamie Vardy scored first, but Fer López and Tawanda Chirewa turned it around, and Wolves won at Turf Moor for the first time since twenty ten. We missed this one.",
       'Stopped at 9', phrase='We missed', extra=dict(call("Burnley don't lose", False), at=[0, 0.75])),
  dict(type='rx_outro', n=4, of=5, ok=True, sub='Four from five tonight', follow='Follow for the next analysis', streak=dict(label='9 in a row'),
       say=['Four from five tonight, and nine in a row, until Wolves.', 'If you called Wolves, take a bow, and tell us in the comments. Follow for the next analysis.']),
]
cfg = {
  'mode': 'review', 'title': 'Ten in a row? The results: Friday 16 Oct', 'competition': 'Friday football',
  'date': '2026-10-16', 'caption_style': 'bold', 'voice_speed': 1.05, 'voice': 'af_heart',
  'presenter': {'id': 28293, 'crop': '1000:1080:460:0', 'from': 0.5, 'credit': 'Presenter (stand-in): Mixkit stock video'},
  'sound': 'cinematic', 'voice_fx': 'deep', 'music_drop': 'rx_intro', 'music_vibe': ['cinematic'], 'music_track': 551,
  'streak': {'prev': 5, 'results': ['ok', 'ok', 'ok', 'ok', 'no']},
  'media_dir': '.cache/media/postmatch-2026-10-16-streak', 'picks': picks, 'review': {'beats': beats},
}
for p in picks:
  for side in ('home', 'away'): assert os.path.exists(p['crest_' + side]), p['crest_' + side]
  assert os.path.exists(p['stadium']), p['stadium']
json.dump(cfg, open(V + 'out/reaction-2026-10-16-streak.json', 'w'), ensure_ascii=False, indent=1)
w = sum(len(' '.join(b['say']).split()) for b in beats)
print('words', w, '≈', round(w * 0.394), 's')
for b in beats:
  for s in b['say']:
    if '/' in s: print('SLASH', s)
