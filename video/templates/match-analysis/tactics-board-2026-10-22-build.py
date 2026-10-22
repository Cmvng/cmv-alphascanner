# builds video/out/analysis-2026-10-22-tactics.json: last night's nine verdicts checked on one board, then Thursday's
# Europa League (five tactics boards + two boards) and the big Conference League ties on a board
import json, copy
V = '/home/user/cmv-alphascanner/video/'
S = '/tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/an22/'
SLUG = 'analysis-2026-10-22-tactics'
DATA = json.load(open(S + 'tb-data.json')); PH = json.load(open(S + 'photos.json'))
base = json.load(open(V + 'templates/match-analysis/tactics-board-2026-10-13.json'))
PV = json.load(open(V + 'out/preview-2026-10-22-juventus-rennes.json'))['picks']
Y = json.load(open(V + 'out/analysis-2026-10-21-tactics.json'))['picks']

def today(home):
  p = copy.deepcopy(next(x for x in PV if x['home'] == home)); p.pop('top_scores', None); p.pop('round', None)
  p['ko'] = p.get('kickoff')
  p['competition'] = 'Conference League' if 'Conference' in p['competition'] else 'Europa League'
  for s in ('home', 'away'): p[s + '_short'] = DATA['short'].get(p[s], p[s])
  p['kit'] = {s: DATA['kit'][p[s]] for s in ('home', 'away') if p[s] in DATA['kit']}
  if p['home'] in DATA.get('crest', {}): p['crest_home'] = DATA['crest'][p['home']]
  p['stadium'] = False
  return p

def last_night(r):
  # yesterday's pick, as it was in the 21 Oct video, with the full-time score
  p = copy.deepcopy(next(x for x in Y if x['home'] == r['home'])); p['score_home'], p['score_away'] = r['score']
  p['stadium'] = False
  return p

def fr(say, at):
  # [line, word] → [line, fraction of the line where that word starts], so each magnet, arrow and card lands on its word
  ln, w = at
  if not isinstance(w, str): return at
  ws = say[ln].split(); i = next(k for k, x in enumerate(ws) if x.strip('.,:;’\'').startswith(w))
  return [ln, round(i / len(ws), 3)]

G, BOARDS, R = DATA['games'], DATA['boards'], DATA['review']
picks = [today(g['team']) for g in G]
for bd in BOARDS: picks += [today(c['home']) for c in bd['cards']]
y0 = len(picks); picks += [last_night(r) for r in R['cards']]

beats = [dict(type='tb_cold', steps=DATA['cold']['steps'], say=DATA['cold']['say'], tail=DATA['cold'].get('tail', 0.95))]
beats.append(dict(type='tb_title', l1='The Tactics', l2='Board.', left=DATA['title']['left'], mid=DATA['title']['mid'], right='Thu 22 Oct', sub=DATA['title']['sub'], say=DATA['title']['say']))
beats.append(dict(type='cb_board', kicker=R['kicker'], l1=R['l1'], l2=R['l2'], model=False, deal_gap=0.16,
  cards=[dict(match=y0 + j, note=c['note'], res=c['res']) for j, c in enumerate(R['cards'])],
  hl=[dict(h, at=fr(R['say'], h['at']), **({'to': fr(R['say'], h['to'])} if 'to' in h else {})) for h in R.get('hl', [])], say=R['say']))
for i, g in enumerate(G):
  b = dict(type='tb_game', match=i, kicker=g['kicker'], say=g['say'], out_at=g.get('out_at', [1, 0.0]), arrows=[dict(a, at=fr(g['say'], a['at'])) for a in g['arrows']], model_at=fr(g['say'], g['model_at']), verdict=g['verdict'], **({'model': False} if g.get('model') is False else {}))
  for s in ('home', 'away'):
    t = copy.deepcopy(g[s])
    for k in t.get('key', []):
      ph = PH.get(k['name'])
      if ph:
        k['photo'] = ph['photo']
        if ph.get('credit'): k['credit'] = ph['credit']
      k.pop('wiki', None); k['at'] = fr(g['say'], k['at'])
    b[s] = t
  beats.append(b)
n = len(G)
for bd in BOARDS:
  beats.append(dict(type='cb_board', kicker=bd['kicker'], l1=bd['l1'], l2=bd['l2'], cards=[dict(match=n + j, note=c['note']) for j, c in enumerate(bd['cards'])],
    hl=[dict(h, at=fr(bd['say'], h['at']), **({'to': fr(bd['say'], h['to'])} if 'to' in h else {})) for h in bd.get('hl', [])], say=bd['say']))
  n += len(bd['cards'])
beats.append(dict(type='tb_end', mid=DATA['title']['mid'], right='Thu 22 Oct', l1="Tonight's", l2='verdicts', follow='Follow for the post-match', say=DATA['end']['say'], tail=0.6))

cfg = {k: v for k, v in base.items() if k not in ('review', 'picks')}
cfg.update({'title': DATA['title']['full'], 'date': '2026-10-22', 'voice': 'af_heart', 'music_track': DATA['music_track'],
  'media_dir': '.cache/media/' + SLUG, 'review': {'project': 'The Tactics Board', 'beats': beats}, 'picks': picks})
cfg['cover'] = {'style': 'tb', 'kicker': 'Thursday · 22 Oct', 'l1': 'The Tactics', 'l2': 'Board.', 'feature': [DATA.get('feature', 0)], 'n': len(G), 'foot': DATA['title']['foot']}
json.dump(cfg, open(V + 'out/' + SLUG + '.json', 'w'), ensure_ascii=False, indent=1)
w = sum(len(' '.join(b['say']).split()) for b in beats)
print('words', w, '≈', round(w * 0.394), 's')
for b in beats:
  for l in b['say']:
    if '/' in l: print('SLASH:', l)
for p in picks[:y0]: print(p['home_short'], 'v', p['away_short'], p['ko'], '| H', p['home_win'], 'D', p['draw'], 'A', p['away_win'])
