# builds video/out/analysis-2026-10-18-cards.json: "Card battles", Sunday's five biggest games as card battles, eight more on a binder page
import json, copy, sys
V = '/home/user/cmv-alphascanner/video/'
O = V + 'out/'
S = (sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/an18').rstrip('/') + '/'
DATA = json.load(open(S + 'cards-data.json'))

LEAGUE = {'Laliga': 'LaLiga', 'Premiership': 'Scottish Premiership'}
def pick(mid):
  p = copy.deepcopy(json.load(open(S + 'pv_' + mid + '.json'))['picks'][0]); p.pop('top_scores', None)
  p['ko'] = p.get('kickoff'); p['competition'] = LEAGUE.get(p['competition'], p['competition'])
  for s in ('home', 'away'): p[s + '_short'] = DATA['short'].get(p[s], p[s])
  p['kit'] = {s: DATA['kit'][p[s]] for s in ('home', 'away') if p[s] in DATA['kit']}
  p['stadium'] = False
  return p

B = DATA['battles']; BD = DATA['board']
picks = [pick(b['mid']) for b in B] + [pick(c['mid']) for c in BD['cards']]
beats = [dict(type='cb_cold', tail=DATA['cold'].get('tail', 0.6), steps=DATA['cold']['steps'], say=DATA['cold']['say'])]
beats.append(dict(type='cb_title', drop=True, kicker=DATA['title']['kicker'], l1='Card', l2='battles', sub_label=DATA['title']['sub_label'], sub=DATA['title']['sub'], say=DATA['title']['say']))
for i, b in enumerate(B):
  bt = dict(type='cb_battle', match=i, side=b['side'], left=picks[i]['competition'], story=b['story'], verdict=b['verdict'], say=b['say'])
  for k in ('rows', 'form', 'model_at', 'story_at', 'verdict_at', 'flip_at'):
    if k in b: bt[k] = b[k]
  beats.append(bt)
beats.append(dict(type='cb_board', kicker=BD['kicker'], l1='Also', l2='today', cards=[dict(match=len(B) + j, note=c['note']) for j, c in enumerate(BD['cards'])],
  hl=BD.get('hl', []), say=BD['say']))
beats.append(dict(type='cb_end', kicker=DATA['end']['kicker'], l1='Five', l2='battles', text_label=DATA['end']['text_label'], text=DATA['end']['text'],
  comment=DATA['end']['comment'], follow='Follow for the results', say=DATA['end']['say']))

cfg = {'mode': 'review', 'title': 'Card battles: Sunday 18 Oct', 'competition': 'Sunday football', 'date': '2026-10-18',
  'sound': 'cinematic', 'voice': 'af_heart', 'voice_fx': 'deep', 'voice_speed': 1.05, 'music_vibe': ['cinematic'], 'music_drop': 'after_cold',
  'music_duck': 10, 'music_track': DATA['music_track'], **({'music_drop_at': DATA['music_drop_at']} if 'music_drop_at' in DATA else {}), **({'music_level': DATA['music_level']} if 'music_level' in DATA else {}), 'stadiums': False, 'review': {'project': 'Card battles', 'beats': beats}, 'picks': picks}
json.dump(cfg, open(O + 'analysis-2026-10-18-cards.json', 'w'), ensure_ascii=False, indent=1)
w = sum(len(' '.join(b['say']).split()) for b in beats)
print('words', w, '≈', round(w * 0.394), 's')
for b in beats:
  for l in b['say']:
    if '/' in l: print('SLASH:', l)
for p, b in zip(picks, B):
  hw, dr, aw = p['home_win'], p['draw'], p['away_win']
  print(p['home_short'], 'v', p['away_short'], p['ko'], '|', b['verdict'], '|', 'home+draw', hw + dr, 'away+draw', aw + dr, 'home', hw, 'away', aw)
