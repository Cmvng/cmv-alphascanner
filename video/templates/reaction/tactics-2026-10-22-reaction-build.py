# builds video/out/reaction-2026-10-22-tactics.json: tonight's 25 Tactics Board verdicts against the results (presenter format):
# the other twenty on three boards first, then the five full boards, building to Bournemouth v Milan.
# Judged on the result ("don't lose" counts on a win or a draw). Scores and scorers: ESPN match data, read 22 Oct 2026 after full time.
import json, copy, re, unicodedata, os
V = '/home/user/cmv-alphascanner/video/'
SLUG = 'reaction-2026-10-22-tactics'
src = json.load(open(V + 'out/analysis-2026-10-22-tactics.json'))
# in analysis pick order (0–24): the five full boards, then the 17:45 board, the 20:00 board and the Conference League board
SC = ['2 2', '1 1', '3 0', '2 2', '1 2',
      '0 2', '1 0', '0 4', '2 4', '4 1', '4 0',
      '3 0', '1 0', '1 4', '0 6', '2 2', '0 3', '1 2',
      '0 0', '2 2', '2 0', '2 5', '2 0', '3 0', '2 0']
# what each verdict needed: 'H' home win, 'A' away win, 'H1X' home don't lose, 'A2X' away don't lose
NEED = ['H1X', 'H1X', 'H1X', 'H', 'A2X',
        'A2X', 'A2X', 'A2X', 'H', 'H1X', 'H',
        'A2X', 'A2X', 'A2X', 'H1X', 'A', 'H1X', 'A2X',
        'A', 'A2X', 'H', 'H1X', 'A2X', 'H1X', 'H1X']
def ok(k):
  h, a = map(int, SC[k].split()); n = NEED[k]
  return {'H': h > a, 'A': a > h, 'H1X': h >= a, 'A2X': a >= h}[n]
RES = [ok(k) for k in range(25)]
picks = []
for k, p0 in enumerate(src['picks'][:25]):
  p = copy.deepcopy(p0); h, a = SC[k].split(); p.update(score_home=h, score_away=a)
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
  assert ok == RES[m], (m, ok)
  b = dict(type='rx_reveal', match=m, n=n, of=of, ok=ok, scorers=scorers, people=people, say=[say], tally_at=at(say, phrase), extra=call(text, ok)); b.update(kw); return b
def board(kicker, l1, l2, idx, notes, say, hl):
  return dict(type='cb_board', kicker=kicker, l1=l1, l2=l2, model=False, deal_gap=0.16,
              cards=[dict(match=m, note=n, res='hit' if RES[m] else 'miss') for m, n in zip(idx, notes)], say=say, hl=hl)
JU, LE, BO, BE, CE = range(5)
beats = [
  dict(type='rx_cold', tint='blue', people=['Nick Woltemade', 'Luka Sučić', 'Mike Maignan', 'Justin Kluivert'],
       say=['Tonight, twenty-five verdicts.', 'Real Sociedad scored six in Norway.', 'Bournemouth beat ten-man Milan.', 'So, how many held?'],
       steps=[dict(big='25', label='verdicts tonight'), dict(big='6', label='Real Sociedad goals in Lillestrøm'),
              dict(big='3–0', label='Bournemouth v ten-man Milan', tone='hot'), dict(big='?', label='the verdicts', tone='hot', glitch=True)], tail=0.6),
  dict(type='rx_intro', drop=True, crests=5, title='The Tactics Board', title2='Full time',
       say=["Tonight's twenty-five verdicts, against the results. Let's check them."]),
  board('Europa League · 17:45 · full time', 'Early', 'kick-offs', [5, 6, 7, 8, 9, 10],
        ['Hofmann scored twice in two minutes', 'Diakité scored the only goal', 'Patati scored twice', 'Linssen scored twice for NEC',
         'Four goals against Torreense', 'Guilherme Smith scored twice'],
        ['First, the early Europa games: four from six.',
         'Leverkusen, AZ, Ferencváros and Union came through. Marseille lost in Graz, and NEC scored four in Zagreb.'],
        [{'j': 0, 'at': [1, 'Leverkusen']}, {'j': 2, 'at': [1, 'AZ']}, {'j': 4, 'at': [1, 'Ferencváros']}, {'j': 5, 'at': [1, 'Union']},
         {'j': 1, 'at': [1, 'Marseille']}, {'j': 3, 'at': [1, 'NEC']}]),
  board('Europa League · 20:00 · full time', 'At', 'eight', [11, 12, 13, 14, 15, 16, 17],
        ['Kramarić, Daghim and Hložek scored', 'González headed in on 78 minutes', 'Pavlidis, Aursnes and Prestianni scored',
         'Gómez and Sučić scored twice each', 'Kučys equalised on 90 minutes', 'Cvetković, Winkler and Onia-Seke scored', 'Reinaldo scored the winner'],
        ['At eight, a hard night: two from seven. Benfica and Levski delivered.',
         'Real Sociedad scored six in Lillestrøm, Hoffenheim beat Lyon by three goals, and Celje equalised in the ninetieth minute against Salzburg.'],
        [{'j': 2, 'at': [0, 'Benfica']}, {'j': 6, 'at': [0, 'Levski']}, {'j': 3, 'at': [1, 'Real']}, {'j': 0, 'at': [1, 'Hoffenheim']},
         {'j': 4, 'at': [1, 'Celje']}]),
  board('Conference League · full time', 'Conference', 'League', [18, 19, 20, 21, 22, 23, 24],
        ["Brighton's winning run ended", 'Carrizo equalised for Copenhagen', 'Salah scored a penalty', 'Ajeti scored twice for Lugano',
         'Arokodare and Ouazane scored late', 'Brunner, Camara and Fati scored', 'Gómez scored in the third minute'],
        ['In the Conference League, four from seven.',
         'Brighton were held in Jablonec, Lugano scored five at Getafe, and Ajax struck twice late against Atalanta.'],
        [{'j': 0, 'at': [1, 'Brighton']}, {'j': 3, 'at': [1, 'Lugano']}, {'j': 4, 'at': [1, 'Ajax']}]),
  reveal(JU, 1, 1, True, "Çelik 5' · Al-Tamari 15' · Dia pen 43' · Woltemade pen 67'", ['Nick Woltemade'],
         "Now the five big boards. In Turin, we said Juventus don't lose. Rennes led at half-time, but Woltemade's penalty made it two–two. Called it! One from one.",
         "Juventus don't lose"),
  reveal(LE, 2, 2, True, "Tutierov 2' · Bengtsson 70'", [],
         "In Poznań, we said Lech Poznań don't lose. Sunderland scored in the second minute, but Bengtsson equalised, one–one. Called it! Two from two.",
         "Lech don't lose"),
  reveal(BE, 2, 3, False, "Ndidi 45+2' · Pino 51' · Mateta 55' · Olaitan 73' · Akdağ red card 77'", ['Jean-Philippe Mateta'],
         "In Istanbul, we called a Beşiktaş win. Palace led through Mateta, Olaitan levelled at two–two, and Beşiktaş finished with ten men. We missed this one.",
         'A Beşiktaş win', phrase='We missed'),
  reveal(CE, 3, 4, True, "Baur 47' · Javi Rodríguez 68' 71'", ['Javi Rodríguez'],
         "At Celtic Park, we said Celta Vigo don't lose. Baur scored first, but Javi Rodríguez scored twice in three minutes. Called it! Three from four.",
         "Celta Vigo don't lose"),
  reveal(BO, 4, 5, True, "Kluivert pen 8' · Maignan red card 27' · Tavernier pen 32' · Adli 84'", ['Justin Kluivert', 'Marcus Tavernier'],
         "And the big one. We said Bournemouth don't lose. Maignan was sent off, two penalties went in, and Bournemouth beat Milan, three–nil, in the clubs' first ever meeting. Called it! Four from five.",
         "Bournemouth don't lose", burst={'e': '🔥⚽🔥', 'at': 0.55}),
  dict(type='rx_outro', n=4, of=5, ok=True, sub='Four from five', follow="Follow for Friday's analysis",
       say=["Four from five on the big boards, and fourteen from twenty-five in all.", "Follow for Friday's analysis."]),
]
assert sum(RES) == 14, sum(RES)
cfg = {'mode': 'review', 'title': 'The Tactics Board, full time: Europa and Conference League, 22 Oct', 'competition': 'Europa League', 'date': '2026-10-22',
  'caption_style': 'bold', 'voice_speed': 1.05, 'voice': 'af_heart',
  'presenter': {'id': 28293, 'crop': '1000:1080:460:0', 'from': 3.0, 'credit': 'Presenter (stand-in): Mixkit stock video'},
  'sound': 'cinematic', 'voice_fx': 'deep', 'music_drop': 'rx_intro', 'music_vibe': ['cinematic'], 'music_track': 607, 'stadiums': False,
  'picks': picks, 'review': {'beats': beats}}
for p in picks:
  for side in ('home', 'away'): assert os.path.exists(p['crest_' + side]), p['crest_' + side]
# board highlights: [line, word] → [line, fraction], as in the analysis build
for b in beats:
  for h in b.get('hl', []):
    for key in ('at', 'to'):
      if key in h and isinstance(h[key][1], str):
        ln, w = h[key]; ws = b['say'][ln].split(); i = next(k for k, x in enumerate(ws) if x.strip('.,:;’\'').startswith(w))
        h[key] = [ln, round(sum(len(x) + 1 for x in ws[:i]) / len(b['say'][ln]), 3)]
json.dump(cfg, open(V + 'out/' + SLUG + '.json', 'w'), ensure_ascii=False, indent=1)
w = sum(len(' '.join(b['say']).split()) for b in beats); print('words', w, '≈', round(w * 0.394), 's', '| called', sum(RES), 'of 25')
