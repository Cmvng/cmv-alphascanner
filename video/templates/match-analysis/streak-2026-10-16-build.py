# builds video/out/predictions-2026-10-16-streak.json: "Ten in a row?", Friday's five league games as a streak short
# usage: python3 -I streak-2026-10-16-build.py <folder with pv_<match>.json files from `from-app.mjs preview --match <id> --out`>
import json, copy, sys
V = '/home/user/cmv-alphascanner/video/'
O = V + 'out/'
S = sys.argv[1].rstrip('/') + '/'

SHORT = {'Eintracht Frankfurt': 'Frankfurt', 'Le Mans FC': 'Le Mans', 'RC Deportivo de A Coruna': 'Deportivo'}
KIT = {'Eintracht Frankfurt': {'c': '#1C1C1C'}, 'Cologne': {'c': '#E3061B'}, 'Frosinone': {'c': '#1450A3'}, 'Sassuolo': {'c': '#00A04A'},
  'Le Mans FC': {'c': '#E30613'}, 'Toulouse': {'c': '#5B2B87'}, 'RC Deportivo de A Coruna': {'c': '#1B5CB8'}, 'Levante': {'c': '#B4053F'},
  'Burnley': {'c': '#6C1D45'}, 'Wolves': {'c': '#FDB913'}}
LEAGUE = {'Bundesliga': 'Bundesliga', 'Serie A': 'Serie A', 'Ligue 1': 'Ligue 1', 'Laliga': 'LaLiga', 'Championship': 'Championship'}

def pick(mid):
  p = copy.deepcopy(json.load(open(S + 'pv_' + mid + '.json'))['picks'][0]); p.pop('top_scores', None)
  p['ko'] = p.get('kickoff'); p['competition'] = LEAGUE.get(p['competition'], p['competition'])
  for s in ('home', 'away'): p[s + '_short'] = SHORT.get(p[s], p[s])
  p['kit'] = {s: KIT[p[s]] for s in ('home', 'away') if p[s] in KIT}
  p['stadium'] = False
  return p

# call order: kick-off order, the Turf Moor game last (the comment prompt)
CALLS = [
  dict(mid='1505114', side='home', verdict="Frankfurt don't lose",
       fact='Cologne: no away league win in 15. Frankfurt: no home win in 6.',
       say=["Cologne haven't won away in fifteen league games. Frankfurt haven't won at home in six. Your call?",
            "Our call: Frankfurt don't lose."]),
  dict(mid='1352460', side='home', verdict="Frosinone don't lose",
       fact='Sassuolo: no away win since mid-February. Frosinone: 50 of 69 home points under Alvini.',
       say=["Sassuolo haven't won away since February. Frosinone have taken fifty of sixty-nine home points under Alvini. Your call?",
            "Our call: Frosinone don't lose."]),
  dict(mid='1253487', side='away', verdict="Toulouse don't lose",
       fact='Le Mans: no home league defeat in over a year. Toulouse: unbeaten away.',
       say=["Le Mans haven't lost a home league game in over a year. Toulouse haven't lost away all season. Your call?",
            "Our call: Toulouse stay unbeaten."]),
  dict(mid='1505116', side='home', verdict="Deportivo don't lose",
       fact='Deportivo: four games without a win, and no win over Levante since March 2016.',
       say=["Deportivo haven't won in four, and haven't beaten Levante since 2016. Your call?",
            "Our call: Deportivo don't lose."]),
  dict(mid='1505336', side='home', verdict="Burnley don't lose",
       fact='Burnley: no home league win in almost a year. Wolves: no win there since 2010.',
       say=["And the big one. Burnley haven't won a home league game in almost a year. Wolves haven't won there since 2010. Your call?",
            "Our call: Burnley don't lose."]),
]
picks = [pick(c['mid']) for c in CALLS]

beats = [dict(type='st_cold', tail=0.6, tick_line=1, more_line=2,
  steps=[dict(big='5', label='calls last night'), dict(big='5/5', tone='green', label='all five came in'),
         dict(big='+5', label='tonight · Lagos time'), dict(big='10?', tone='hot', glitch=True, label='the streak')],
  say=['Last night, we called five games.', 'All five came in.', 'Tonight, five more.', 'Ten in a row?'])]
beats.append(dict(type='st_title', drop=True, kicker='Friday · five games · Lagos time', l1='Ten in', l2='a row?',
  sub='Make your call before ours lands', say=['Five games tonight. Make your call, before we show ours.']))
for i, c in enumerate(CALLS):
  beats.append(dict(type='st_call', match=i, side=c['side'], left=picks[i]['competition'], fact_label='The streaks', fact=c['fact'],
    verdict=c['verdict'], pauses=[1.8, 0], fact_at=[0, 0.02], model_at=[0, 0.6], verdict_at=[1, 0.3], say=c['say']))
beats.append(dict(type='st_end', l1='Ten in', l2='a row?', kicker='The results are next', text='If all five come in, it\'s ten in a row.',
  comment='Burnley or Wolves? Comment your call', follow='Follow for the results',
  say=['Five calls tonight. If all five come in, that\'s ten in a row.', 'Comment your call on Burnley and Wolves, and follow for the results.']))

cfg = {'mode': 'review', 'title': 'Ten in a row? Five Friday calls, 16 Oct', 'competition': 'Friday football', 'date': '2026-10-16',
  'sound': 'cinematic', 'voice': 'af_heart', 'voice_fx': 'deep', 'voice_speed': 1.05, 'music_vibe': ['cinematic'], 'music_drop': 'after_cold',
  'music_duck': 10, 'music_track': 543, 'stadiums': False, 'streak_prev': 5,
  'review': {'project': 'Ten in a row', 'beats': beats}, 'picks': picks}
json.dump(cfg, open(O + 'predictions-2026-10-16-streak.json', 'w'), ensure_ascii=False, indent=1)
w = sum(len(' '.join(b['say']).split()) for b in beats)
print('words', w, '≈', round(w * 0.394 + 5 * 1.8 + 3), 's')
for b in beats:
  for l in b['say']:
    if '/' in l: print('SLASH:', l)
for p, c in zip(picks, CALLS):
  hw, dr, aw = p['home_win'], p['draw'], p['away_win']
  print(p['home_short'], 'v', p['away_short'], p['ko'], c['verdict'], (hw + dr) if c['side'] == 'home' else (aw + dr), '%')
