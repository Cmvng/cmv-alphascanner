# builds video/out/analysis-2026-10-21-tactics.json: "The Tactics Board", all nine of Wednesday's big games in depth
import json, copy, sys
V = '/home/user/cmv-alphascanner/video/'
S = '/tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/an21/'
DATA = json.load(open(S + 'tb-data.json')); PH = json.load(open(S + 'photos.json'))
base = json.load(open(V + 'templates/match-analysis/tactics-board-2026-10-13.json'))

def pick(mid):
  p = copy.deepcopy(json.load(open(S + 'pv_' + mid + '.json'))['picks'][0]); p.pop('top_scores', None)
  p['ko'] = p.get('kickoff'); p['competition'] = 'LaLiga' if p['competition'] == 'Laliga' else 'Champions League'
  for s in ('home', 'away'): p[s + '_short'] = DATA['short'].get(p[s], p[s])
  p['kit'] = {s: DATA['kit'][p[s]] for s in ('home', 'away') if p[s] in DATA['kit']}
  p['stadium'] = False
  return p

def fr(say, at):
  # [line, word] → [line, fraction of the line where that word starts], so each magnet and arrow lands on its word
  ln, w = at
  if not isinstance(w, str): return at
  ws = say[ln].split(); i = next(k for k, x in enumerate(ws) if x.strip('.,:;').startswith(w))
  return [ln, round(i / len(ws), 3)]

G = DATA['games']; BD = DATA.get('board')
picks = [pick(g['mid']) for g in G] + ([pick(c['mid']) for c in BD['cards']] if BD else [])
beats = [dict(type='tb_cold', steps=DATA['cold']['steps'], say=DATA['cold']['say'], tail=DATA['cold'].get('tail', 0.95))]
beats.append(dict(type='tb_title', l1='The Tactics', l2='Board.', left=DATA['title'].get('left', 'Champions League'), mid=DATA['title'].get('mid', 'Matchday 3'), right='Wed 21 Oct', sub=DATA['title']['sub'], say=DATA['title']['say']))
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
if BD: beats.append(dict(type='cb_board', kicker=BD['kicker'], l1='Also', l2='tonight', model=False, cards=[dict(match=len(G) + j, note=c['note']) for j, c in enumerate(BD['cards'])], hl=BD.get('hl', []), say=BD['say']))
beats.append(dict(type='tb_end', mid=DATA['title'].get('mid', 'Matchday 3'), right='Wed 21 Oct', l1="Tonight's", l2='verdicts', follow='Follow for the post-match', say=DATA['end']['say'], tail=0.6))

cfg = {k: v for k, v in base.items() if k not in ('review', 'picks')}
cfg.update({'title': 'The Tactics Board: all nine games, Wednesday 21 Oct', 'date': '2026-10-21', 'voice': 'af_heart', 'music_track': DATA['music_track'],
  'media_dir': '.cache/media/analysis-2026-10-21-tactics', 'review': {'project': 'The Tactics Board', 'beats': beats}, 'picks': picks})
cfg['cover'] = {'style': 'tb', 'kicker': 'Wednesday · 21 Oct', 'l1': 'The Tactics', 'l2': 'Board.', 'feature': [DATA.get('feature', 0)], 'foot': 'All nine games · drawn up one by one'}   # make-cover.mjs: PSG v Barcelona as the mini board
json.dump(cfg, open(V + 'out/analysis-2026-10-21-tactics.json', 'w'), ensure_ascii=False, indent=1)
w = sum(len(' '.join(b['say']).split()) for b in beats)
print('words', w, '≈', round(w * 0.394), 's')
for b in beats:
  for l in b['say']:
    if '/' in l: print('SLASH:', l)
for p, g in zip(picks, G):
  print(p['home_short'], 'v', p['away_short'], p['ko'], '|', g['verdict']['text'], '| H', p['home_win'], 'D', p['draw'], 'A', p['away_win'])
