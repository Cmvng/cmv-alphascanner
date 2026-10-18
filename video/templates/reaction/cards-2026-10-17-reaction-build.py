# builds video/out/reaction-2026-10-17-cards.json: yesterday's five card battles against the results (presenter format), the other eight on a board
# Judged on the result. Scores and scorers: ESPN match data, read 18 Oct 2026.
import json, copy, re, unicodedata, os
V = '/home/user/cmv-alphascanner/video/'
src = json.load(open(V + 'out/analysis-2026-10-17-cards.json'))
SC = ['0 2', '1 2', '6 1', '0 1', '2 5', '0 1', '1 0', '0 0', '3 2', '1 3', '1 3', '2 0', '2 2']   # in analysis pick order
picks = []
for k, p0 in enumerate(src['picks']):
  p = copy.deepcopy(p0); h, a = SC[k].split(); p.update(score_home=h, score_away=a, stage=p['competition'])
  for side in ('home', 'away'):
    slug = re.sub(r'[^a-z0-9]+', '_', unicodedata.normalize('NFD', p[side]).encode('ascii', 'ignore').decode().lower()).strip('_')
    p['crest_' + side] = V + '.cache/crests/' + slug + '.png'
    if k < 5: p[side] = p[side + '_short']
  p.pop('kit', None) if k < 5 else None
  p['stadium'] = False
  picks.append(p)
EV, BR, BA, NE, BE = range(5)
def at(line, phrase): j = line.index(phrase); return [0, round(j / len(line), 3)]
def call(text, ok=True): return dict(label='Our call', text=text, ok=ok, yes='CALLED', no='MISSED', at=[0, 0.05])
def reveal(m, n, of, ok, scorers, people, say, text, phrase='Called it', **kw):
  b = dict(type='rx_reveal', match=m, n=n, of=of, ok=ok, scorers=scorers, people=people, say=[say], tally_at=at(say, phrase), extra=call(text, ok)); b.update(kw); return b
beats = [
  dict(type='rx_cold', tint='blue', people=['Luis Díaz', 'Lamine Yamal', 'Pedro Neto', 'Alexander Isak'],
       say=['Yesterday, we dealt five card battles.', 'Luis Díaz scored three for Bayern.', 'Barcelona scored five in Seville.', 'So, how many battles did we win?'],
       steps=[dict(big='5', label='card battles yesterday'), dict(big='3', label='Díaz goals against Leipzig'), dict(big='5', label='Barcelona goals in Seville', tone='hot'), dict(big='?', label='the results', tone='hot', glitch=True)], tail=0.6),
  dict(type='rx_intro', drop=True, crests=5, title='Card battles', title2='The results', say=["Yesterday's five card battles, against the results. Let's turn them over."]),
  reveal(EV, 1, 1, True, "Pedro Neto 46' 90'", ['Pedro Neto'],
         "At Everton, we said Chelsea don't lose. Pedro Neto scored twice, and Chelsea won two–nil. Called it! One from one.", "Chelsea don't lose"),
  reveal(BR, 1, 2, False, "Lewis-Potter 44' · Muñoz 62' · Isak 70'", ['Alexander Isak'],
         "At Brentford, we said Brentford don't lose. They led through Lewis-Potter, but had a man sent off before half-time, and Muñoz and Isak turned it around. We missed this one.",
         "Brentford don't lose", phrase='We missed'),
  reveal(BA, 2, 3, True, "Díaz 12' 47' 69' · Pavlović 26' · Olise 34' · Kane 52' · Maksimović 90+1'", ['Luis Díaz', 'Harry Kane'],
         "Bayern Munich beat Leipzig, six–one! Luis Díaz scored a hat-trick. Called it! Two from three.", "A Bayern win", sticker={'e': '🎩', 'at': 0.45, 'x': 50, 'y': 790, 'r': -10}),
  reveal(NE, 3, 4, True, "Manzambi 36'", [],
         "Aston Villa beat Newcastle, one–nil, with a Manzambi header. Called it! Three from four.", "Villa don't lose"),
  reveal(BE, 4, 5, True, "Yamal 10' · Gómez 27' · Rodri 41' · Jesus 51' · Abde 53' · García 62' · Olmo 81'", ['Lamine Yamal', 'Dani Olmo'],
         "And the big one. Barcelona won five–two in Seville, after Betis had a man sent off, for a ninth straight league win. Called it! Four from five!", "Barcelona don't lose",
         burst={'e': '🔥⚽🔥', 'at': 1.0}),
  dict(type='cb_board', kicker='Also yesterday · full time', l1='Also', l2='yesterday', model=False,
       cards=[dict(match=5 + j, note=n) for j, n in enumerate(["Atlético's sixth straight win.", 'Venezia beat Napoli for the first time since 1942.', 'Dortmund stay unbeaten in the Bundesliga.',
         'City make it seven league wins from seven.', "PSG's fourth league win in a row.", 'Inter win in Bologna without Lautaro.', 'No happy return to Rome for De Rossi.', "Rangers' seven-game winning run ends."])],
       hl=[{'j': 1, 'at': [0, 0.3], 'to': [1, 0]}, {'j': 3, 'at': [1, 0.1]}],
       say=['Also yesterday, Venezia beat Napoli for the first time since nineteen forty-two.', 'And Manchester City made it seven league wins from seven.']),
  dict(type='rx_outro', n=4, of=5, ok=True, sub='Four from five', follow="Follow for today's card battles",
       say=["Four from five. Liverpool spoiled the set at Brentford.", "Follow for today's card battles."]),
]
cfg = {'mode': 'review', 'title': 'Card battles, the results: Saturday 17 Oct', 'competition': 'Saturday football', 'date': '2026-10-17',
  'caption_style': 'bold', 'voice_speed': 1.05, 'voice': 'af_heart',
  'presenter': {'id': 28293, 'crop': '1000:1080:460:0', 'from': 3.0, 'credit': 'Presenter (stand-in): Mixkit stock video'},
  'sound': 'cinematic', 'voice_fx': 'deep', 'music_drop': 'rx_intro', 'music_vibe': ['cinematic'], 'music_track': 587, 'stadiums': False,
  'picks': picks, 'review': {'beats': beats}}
for p in picks:
  for side in ('home', 'away'): assert os.path.exists(p['crest_' + side]), p['crest_' + side]
json.dump(cfg, open(V + 'out/reaction-2026-10-17-cards.json', 'w'), ensure_ascii=False, indent=1)
w = sum(len(' '.join(b['say']).split()) for b in beats); print('words', w, '≈', round(w * 0.394), 's')
