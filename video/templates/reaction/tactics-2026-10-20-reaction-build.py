# builds video/out/reaction-2026-10-20-tactics.json: tonight's five tactics boards against the results (presenter format), the other four on a board
# Judged on the result. Scores and scorers: ESPN match data, read 20 Oct 2026 after full time.
import json, copy, re, unicodedata, os
V = '/home/user/cmv-alphascanner/video/'
src = json.load(open(V + 'out/analysis-2026-10-20-tactics.json'))
SC = ['4 3', '5 1', '1 1', '4 3', '4 2', '1 2', '2 2', '4 0', '0 1']   # in analysis pick order
picks = []
for k, p0 in enumerate(src['picks']):
  p = copy.deepcopy(p0); h, a = SC[k].split(); p.update(score_home=h, score_away=a, stage='Champions League')
  for side in ('home', 'away'):
    slug = re.sub(r'[^a-z0-9]+', '_', unicodedata.normalize('NFD', p[side]).encode('ascii', 'ignore').decode().lower()).strip('_')
    p['crest_' + side] = V + '.cache/crests/' + slug + '.png'
    if k < 5: p[side] = p[side + '_short']
  p.pop('kit', None) if k < 5 else None
  p['stadium'] = False
  picks.append(p)

def at(line, phrase): j = line.index(phrase); return [0, round(j / len(line), 3)]
def call(text, ok=True): return dict(label='Our call', text=text, ok=ok, yes='CALLED', no='MISSED', at=[0, 0.05])
def reveal(m, n, of, ok, scorers, people, say, text, phrase='Called it', **kw):
  b = dict(type='rx_reveal', match=m, n=n, of=of, ok=ok, scorers=scorers, people=people, say=[say], tally_at=at(say, phrase), extra=call(text, ok)); b.update(kw); return b
LI, MC, ST, NA, PS = range(5)
beats = [
  dict(type='rx_cold', tint='blue', people=['Alexis Mac Allister', 'Phil Foden', 'Scott McTominay', 'Lamine Yamal'],
       say=['Tonight, we drew up five tactics boards.', 'Liverpool came back from two goals down.', 'Phil Foden scored three.', 'So, how many verdicts held?'],
       steps=[dict(big='5', label='tactics boards tonight'), dict(big='2–0', label='down, and Liverpool came back'), dict(big='3', label='Foden goals against AEK', tone='hot'), dict(big='?', label='the verdicts', tone='hot', glitch=True)], tail=0.6),
  dict(type='rx_intro', drop=True, crests=5, title='The Tactics Board', title2='Full time', say=["Tonight's five tactics boards, against the results. Let's check the verdicts."]),
  reveal(LI, 1, 1, True, "Mikautadze 4' · Cardona 29' · Mac Allister 36' 65' · Araújo 45+2' · Wirtz 68' · Oluwaseyi 87'", ['Alexis Mac Allister'],
         "At Anfield, we said Liverpool don't lose. They trailed by two goals, but Mac Allister scored twice, and Liverpool beat Villarreal, four–three. Called it! One from one.", "Liverpool don't lose"),
  reveal(MC, 2, 2, True, "Anderson 12' · Foden 34' 65' 76' · Pilios 52' · Cherki 57'", ['Phil Foden'],
         "At the Etihad, we called a City win. Phil Foden scored a hat-trick, with Haaland rested, and City ran out five–one winners. Called it! Two from two.", "A Man City win",
         sticker={'e': '🎩', 'at': 0.4, 'x': 50, 'y': 790, 'r': -10}),
  reveal(ST, 3, 3, True, "Leweling 36' · Álvarez 47' · Hjulmand red card 64'", ['Julián Álvarez'],
         "In Stuttgart, we said Atlético don't lose. Álvarez cancelled out Leweling's goal, and ten-man Atlético held on for a one–one draw. Called it! Three from three.", "Atlético don't lose"),
  reveal(NA, 3, 4, False, "Politano 1' · Hauge 27' · McTominay 41' 75' · Helmersen 62' · Bjørtuft o.g. 88' · Fet 90+4'", ['Scott McTominay'],
         "In Naples, we said Bodø Glimt don't lose. McTominay scored twice, and Napoli took a seven-goal thriller, four–three. We missed this one.", "Bodø/Glimt don't lose", phrase='We missed'),
  reveal(PS, 3, 5, False, "Doué 38' · Espart 55' · Hernández 72' · Yamal 79' · Vitinha 81' · Ruiz 86'", ['Désiré Doué', 'Lamine Yamal'],
         "And the big one. We said Barcelona don't lose, but PSG scored three in the last twenty minutes and beat Barcelona, four–two. It's Barcelona's first defeat this season. We missed it.", "Barcelona don't lose",
         phrase='We missed', burst={'e': '🔥⚽🔥', 'at': 0.55}),
  dict(type='cb_board', kicker='The other four · full time', l1='The other', l2='four', model=False,
       cards=[dict(match=5 + j, note=n) for j, n in enumerate(["Guirassy scores twice, and Dortmund end a run of four away defeats.", "Kacor equalises for Slavia in the 90th minute.",
         'Four different scorers. Slovan have lost all three games.', "Til's goal leaves Porto without a point after three games."])],
       hl=[{'j': 0, 'at': [0, 0.3], 'to': [1, 0]}, {'j': 3, 'at': [1, 0.1]}],
       say=['First, the other four. Guirassy scored twice as Dortmund won in Azerbaijan.', 'And Porto lost at home to PSV, so they still have no points after three games.']),
  dict(type='rx_outro', n=3, of=5, ok=True, sub='Three from five', follow="Follow for tomorrow's analysis",
       say=["Three from five. Napoli and PSG broke two of our boards.", "Follow for tomorrow's Champions League analysis."]),
]
cfg = {'mode': 'review', 'title': 'The Tactics Board, full time: Champions League, 20 Oct', 'competition': 'Champions League', 'date': '2026-10-20',
  'caption_style': 'bold', 'voice_speed': 1.05, 'voice': 'af_heart',
  'presenter': {'id': 28293, 'crop': '1000:1080:460:0', 'from': 3.0, 'credit': 'Presenter (stand-in): Mixkit stock video'},
  'sound': 'cinematic', 'voice_fx': 'deep', 'music_drop': 'rx_intro', 'music_vibe': ['cinematic'], 'music_track': 586, 'stadiums': False,
  'picks': picks, 'review': {'beats': beats}}
for p in picks:
  for side in ('home', 'away'): assert os.path.exists(p['crest_' + side]), p['crest_' + side]
B = cfg['review']['beats']; bd = next(b for b in B if b['type'] == 'cb_board'); B.remove(bd); B.insert(2, bd)
json.dump(cfg, open(V + 'out/reaction-2026-10-20-tactics.json', 'w'), ensure_ascii=False, indent=1)
w = sum(len(' '.join(b['say']).split()) for b in beats); print('words', w, '≈', round(w * 0.394), 's')

