# builds video/out/analysis-2026-10-23-tactics.json: Friday's football on the Tactics Board. Six full boards (Al Nassr at
# 14:30, then the five top-league games tonight), an afternoon board and an evening board.
# The app has no pages for Friday's top-five-league games, so those boards hide the numbers (model: false) and the verdict
# follows the dated research. App games keep the app's numbers.
import json, copy, runpy
V = '/home/user/cmv-alphascanner/video/'
S = '/tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/an23/'
SLUG = 'analysis-2026-10-23-tactics'
PH = json.load(open(S + 'photos.json'))
GAMES = runpy.run_path(S + 'games.py')['GAMES']
base = json.load(open(V + 'templates/match-analysis/tactics-board-2026-10-13.json'))
PV = json.load(open(V + 'out/preview-2026-10-23-board.json'))['picks']
TSDB = 'https://r2.thesportsdb.com/images/media/team/badge/'
SHORT = {'Al-Faisaly FC': 'Al-Faisaly', 'Al Nassr Club': 'Al Nassr', 'VfB Stuttgart': 'Stuttgart', 'Borussia Monchengladbach': 'Gladbach',
  'Ipswich Town': 'Ipswich', 'Nottingham Forest': 'Forest', 'Alaves': 'Alavés', 'Malaga': 'Málaga', 'Al-Ittihad Club': 'Al-Ittihad',
  'Diriyah Club': 'Al-Diriyah', 'Randers FC': 'Randers', 'Broendby IF': 'Brøndby', 'IF Elfsborg': 'Elfsborg', 'Malmo': 'Malmö', 'FC St. Pauli': 'St. Pauli',
  'KV Kortrijk': 'Kortrijk', 'KV Mechelen': 'Mechelen', 'Bolton Wanderers': 'Bolton', 'Vitoria Guimaraes': 'Vitória', 'Maritimo': 'Marítimo'}
KIT = {'Al-Faisaly FC': '#7A1020', 'Al Nassr Club': '#F5C400', 'VfB Stuttgart': '#E32219', 'Borussia Monchengladbach': '#111111', 'Brest': '#E2001A',
  'Nice': '#1A1A1A', 'Torino': '#8A1538', 'Monza': '#D5121E', 'Ipswich Town': '#0044A9', 'Nottingham Forest': '#DD0000', 'Alaves': '#0055A4',
  'Malaga': '#4EA6DD', 'Al-Ittihad Club': '#1A1A1A', 'Diriyah Club': '#B8955E', 'Bochum': '#005CA9', 'Wolfsburg': '#65B32E', 'Darmstadt': '#004E9E',
  'FC St. Pauli': '#5B3A29', 'Alanyaspor': '#F58220', 'Kocaelispor': '#0A7D3B', 'Randers FC': '#003B7A', 'Broendby IF': '#F6D500', 'IF Elfsborg': '#F5D200',
  'Malmo': '#6CB4EE', 'Go Ahead Eagles': '#E2001A', 'Telstar': '#1A1A1A', 'KV Kortrijk': '#E30613', 'KV Mechelen': '#F6C900', 'Bolton Wanderers': '#0C2340',
  'Middlesbrough': '#DE1B1B', 'Vitoria Guimaraes': '#1A1A1A', 'Maritimo': '#1F7A3A'}
CREST = {'Al-Faisaly FC': TSDB + 'a81pz21646835057.png', 'Al-Ittihad Club': TSDB + '8n1t1j1755192418.png', 'Bolton Wanderers': TSDB + 'yvxxrv1448808301.png',
  'Vitoria Guimaraes': TSDB + 'af52z61628855707.png', 'Broendby IF': TSDB + 'usxoux1784825763.png', 'Malmo': TSDB + '429jzd1779940315.png',
  'Wolfsburg': TSDB + 'ci9trv1778399557.png'}
# games the app doesn't cover: (home, away, kick-off, competition)
OWN = {'VfB Stuttgart': ('Borussia Monchengladbach', '19:30', 'Bundesliga'), 'Brest': ('Nice', '19:45', 'Ligue 1'), 'Torino': ('Monza', '19:45', 'Serie A'),
  'Ipswich Town': ('Nottingham Forest', '20:00', 'Premier League'), 'Alaves': ('Malaga', '20:00', 'LaLiga'),
  'Go Ahead Eagles': ('Telstar', '19:00', 'Eredivisie'), 'KV Kortrijk': ('KV Mechelen', '19:45', 'Belgian Pro League'),
  'Bolton Wanderers': ('Middlesbrough', '20:00', 'Championship'), 'Vitoria Guimaraes': ('Maritimo', '20:45', 'Primeira Liga')}

def pick(home):
  if home in OWN:
    away, ko, comp = OWN[home]; p = dict(home=home, away=away, kickoff=ko, competition=comp)
  else:
    p = copy.deepcopy(next(x for x in PV if x['home'] == home)); p.pop('top_scores', None); p.pop('round', None)
    p['competition'] = {'Super Lig': 'Süper Lig', 'Superliga': 'Danish Superliga'}.get(p['competition'], p['competition'])
  p['ko'] = p.get('kickoff')
  for s in ('home', 'away'): p[s + '_short'] = SHORT.get(p[s], p[s])
  p['kit'] = {s: {'c': KIT[p[s]]} for s in ('home', 'away') if p[s] in KIT}
  for s in ('home', 'away'):
    if p[s] in CREST: p['crest_' + s] = CREST[p[s]]
  p['stadium'] = False
  return p

def fr(say, at):
  # [line, word] → [line, fraction of the line where that word starts], so each magnet, arrow and card lands on its word
  ln, w = at
  if not isinstance(w, str): return at
  ws = say[ln].split(); i = next(k for k, x in enumerate(ws) if x.strip('.,:;’\'').startswith(w))
  return [ln, round(i / len(ws), 3)]

BOARDS = [
  dict(kicker='Friday afternoon · Lagos time', l1='This', l2='afternoon', cards=[
    dict(home='Al-Ittihad Club', note="Al-Ittihad don't lose · four goals at Ettifaq"),
    dict(home='Bochum', note="Wolfsburg don't lose · Bochum lost three straight"),
    dict(home='Darmstadt', note="St. Pauli don't lose · four away draws"),
    dict(home='Alanyaspor', note="Alanyaspor don't lose · unbeaten in three at home"),
    dict(home='Randers FC', note="Brøndby don't lose · five points above Randers"),
    dict(home='IF Elfsborg', note="Elfsborg don't lose · Östman has nine")],
   say=["Before tonight: Al-Ittihad don't lose to Al-Diriyah, and Wolfsburg don't lose in Bochum.",
        "St. Pauli, unbeaten away, don't lose in Darmstadt; Alanyaspor don't lose at home.",
        "Brøndby don't lose in Randers, and Elfsborg don't lose to Malmö, who haven't won in Borås since twenty twenty-one."],
   hl=[{'j': 0, 'at': [0, 'Al-Ittihad']}, {'j': 1, 'at': [0, 'Wolfsburg']}, {'j': 2, 'at': [1, 'St']}, {'j': 3, 'at': [1, 'Alanyaspor']},
       {'j': 4, 'at': [2, 'Brøndby']}, {'j': 5, 'at': [2, 'Elfsborg']}]),
  dict(kicker='Friday night · Lagos time', l1='Also', l2='tonight', model=False, cards=[
    dict(home='Go Ahead Eagles', note="Go Ahead don't lose · Telstar have one win in nine"),
    dict(home='KV Kortrijk', note="Mechelen don't lose · Kortrijk lost seven of eight"),
    dict(home='Bolton Wanderers', note="Boro don't lose · won the last nine meetings"),
    dict(home='Vitoria Guimaraes', note="Vitória don't lose · Ndoye back from a ban")],
   say=["Also tonight: Go Ahead Eagles don't lose to Telstar, and Mechelen don't lose in Kortrijk.",
        "Middlesbrough, nine unbeaten, don't lose at Bolton; Vitória don't lose to Marítimo."],
   hl=[{'j': 0, 'at': [0, 'Go']}, {'j': 1, 'at': [0, 'Mechelen']}, {'j': 2, 'at': [1, 'Middlesbrough']}, {'j': 3, 'at': [1, 'Vitória']}]),
]
COLD = dict(steps=[dict(big='16', label='games on Friday · Lagos time'), dict(big='0', label='Gladbach points after six games'),
                   dict(big='2018', label="Málaga's last top-flight win"), dict(big='Tonight', label='Stuttgart and Alavés at home', tone='red', glitch=True, glitch_at=0.5)],
            say=['Sixteen games on Friday.', 'Gladbach have lost all six.', "Málaga haven't won in the top flight since twenty-eighteen.", 'Both play tonight.'], tail=0.95)
TITLE = dict(left='Friday', mid='Friday football', sub='Six boards drawn up · ten more at a glance', say=['Six boards drawn up; ten more at a glance.'],
             full="The Tactics Board: Friday's 16 games, 23 Oct", foot='Al Nassr · Stuttgart · Brest · Torino · Ipswich · Alavés')
END = dict(say=['Sixteen verdicts today.', 'Follow for the post-match.'])

picks = [pick(g['team']) for g in GAMES]
for bd in BOARDS: picks += [pick(c['home']) for c in bd['cards']]

def game_beat(i, g):
  b = dict(type='tb_game', match=i, kicker=g['kicker'], say=g['say'], out_at=g.get('out_at', [1, 0.0]), arrows=[dict(a, at=fr(g['say'], a['at'])) for a in g['arrows']],
           model_at=fr(g['say'], g['model_at']), verdict=g['verdict'], **({'model': False} if g.get('model') is False else {}))
  for s in ('home', 'away'):
    t = copy.deepcopy(g[s])
    for k in t.get('key', []):
      ph = PH.get(k['name'])
      if ph:
        k['photo'] = ph['photo']
        if ph.get('credit'): k['credit'] = ph['credit']
      elif k.get('photo') is None or k.get('photo') is False: k.pop('photo', None)
      k.pop('wiki', None); k['at'] = fr(g['say'], k['at'])
    b[s] = t
  return b
def board_beat(bd, n0):
  return dict(type='cb_board', kicker=bd['kicker'], l1=bd['l1'], l2=bd['l2'], deal_gap=0.16, **({'model': False} if bd.get('model') is False else {}),
              cards=[dict(match=n0 + j, note=c['note']) for j, c in enumerate(bd['cards'])],
              hl=[dict(h, at=fr(bd['say'], h['at']), **({'to': fr(bd['say'], h['to'])} if 'to' in h else {})) for h in bd.get('hl', [])], say=bd['say'])

n = len(GAMES)
beats = [dict(type='tb_cold', steps=COLD['steps'], say=COLD['say'], tail=COLD['tail']),
         dict(type='tb_title', l1='The Tactics', l2='Board.', left=TITLE['left'], mid=TITLE['mid'], right='Fri 23 Oct', sub=TITLE['sub'], say=TITLE['say']),
         game_beat(0, GAMES[0]), board_beat(BOARDS[0], n)]
beats += [game_beat(i, g) for i, g in enumerate(GAMES) if i > 0]
beats += [board_beat(BOARDS[1], n + len(BOARDS[0]['cards'])),
          dict(type='tb_end', mid=TITLE['mid'], right='Fri 23 Oct', l1="Friday's", l2='verdicts', follow='Follow for the post-match', say=END['say'], tail=0.6)]

cfg = {k: v for k, v in base.items() if k not in ('review', 'picks')}
cfg.update({'title': TITLE['full'], 'competition': 'Friday football', 'date': '2026-10-23', 'voice': 'af_heart', 'music_track': 546,
  'media_dir': '.cache/media/' + SLUG, 'review': {'project': 'The Tactics Board', 'beats': beats}, 'picks': picks})
cfg['cover'] = {'style': 'tb', 'kicker': 'Friday · 23 Oct', 'l1': 'The Tactics', 'l2': 'Board.', 'feature': [0], 'n': len(GAMES), 'foot': TITLE['foot']}
json.dump(cfg, open(V + 'out/' + SLUG + '.json', 'w'), ensure_ascii=False, indent=1)
w = sum(len(' '.join(b['say']).split()) for b in beats)
print('words', w, '≈', round(w * 0.394), 's')
for b in beats:
  for l in b['say']:
    if '/' in l: print('SLASH:', l)
for p in picks: print(p['home_short'], 'v', p['away_short'], p['ko'], p['competition'], '| H', p.get('home_win'), 'D', p.get('draw'), 'A', p.get('away_win'))
