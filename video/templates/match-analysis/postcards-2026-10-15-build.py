# builds video/out/analysis-2026-10-15-postcards.json: Europa League Thursday as postcards from the host cities
import json, copy, os, re
V = '/home/user/cmv-alphascanner/video/'
O = V + 'out/'
def prev(slug):
  return json.load(open(O + 'preview-2026-10-15-' + slug + '.json'))['picks'][0]

# the five postcards (in story order), then the board games
MAIN = ['lyon-crystal-palace', 'salzburg-ac-milan', 'celta-juventus', 'marseille-olympiacos', 'benfica-celtic']
UEL = ['nk-celje-ac-omonia-nicosia', 'union-gilloise-real-sociedad', 'scu-torreense-sunderland-afc', 'kks-lech-poznan-bayer-leverkusen',
       'alkmaar-hapoel-be-er-sheva-fc', 'sparta-prague-lillestroem-sk', 'hoffenheim-besiktas-istanbul', 'bournemouth-sturm-graz',
       'ferencvarosi-budapest-viktoria-plzen', 'gnk-dinamo-zagreb-rsc-anderlecht', 'jagiellonia-bialystok-fc-ararat-armenia', 'nec-nijmegen-pfc-levski-sofia']
UECL = ['hnk-hajduk-split-ajax', 'pfc-cska-sofia-monaco', 'cs-universitatea-craiova-getafe', 'panathinaikos-fk-borac-banja-luka',
        'atalanta-pafos-fc', 'brighton-fk-kauno-zalgiris', 'copenhagen-braga', 'freiburg-fk-jablonec']
SHORT = {'Crystal Palace': 'Palace', 'AC Milan': 'Milan', 'NK Celje': 'Celje', 'AC Omonia Nicosia': 'Omonia', 'Union Gilloise': 'Union SG',
  'SCU Torreense': 'Torreense', 'Sunderland AFC': 'Sunderland', 'KKS Lech Poznan': 'Lech Poznań', 'Bayer Leverkusen': 'Leverkusen',
  'Alkmaar': 'AZ', 'Hapoel Be`er Sheva FC': "Hapoel Be'er Sheva", 'Sparta Prague': 'Sparta Prague', 'Lillestroem SK': 'Lillestrøm',
  'Besiktas Istanbul': 'Beşiktaş', 'Ferencvarosi Budapest': 'Ferencváros', 'Viktoria Plzen': 'Viktoria Plzeň', 'GNK Dinamo Zagreb': 'Dinamo Zagreb',
  'RSC Anderlecht': 'Anderlecht', 'Jagiellonia Bialystok': 'Jagiellonia', 'FC Ararat-Armenia': 'Ararat-Armenia', 'NEC Nijmegen': 'NEC',
  'PFC Levski Sofia': 'Levski Sofia', 'HNK Hajduk Split': 'Hajduk Split', 'PFC CSKA Sofia': 'CSKA Sofia', 'CS Universitatea Craiova': 'U Craiova',
  'FK Borac Banja Luka': 'Borac', 'Pafos FC': 'Pafos', 'FK Kauno Zalgiris': 'Kauno Žalgiris', 'FK Jablonec': 'Jablonec', 'Celta': 'Celta Vigo'}
KIT = {'Lyon': {'c': '#1C3F94'}, 'Crystal Palace': {'c': '#C4122E'}, 'Salzburg': {'c': '#D11F3B'}, 'AC Milan': {'c': '#C8102E', 'bg': '#B00E28'},
  'Celta': {'c': '#6FB5E8', 'bg': '#5AA7E0'}, 'Juventus': {'c': '#1A1A1A'}, 'Benfica': {'c': '#E30613'}, 'Celtic': {'c': '#008C45'},
  'Marseille': {'c': '#2FAEE0', 'bg': '#1E9BD7'}, 'Olympiacos': {'c': '#D11E2D'}}

def pick(slug, ko=None, where=''):
  p = copy.deepcopy(prev(slug)); p.pop('top_scores', None)
  p['ko'] = ko or p.get('kickoff'); p['where'] = where; p['stage'] = 'Matchday 2'
  for s in ('home', 'away'):
    p[s + '_short'] = SHORT.get(p[s], p[s])
  k = {}
  for s in ('home', 'away'):
    if p[s] in KIT: k[s] = KIT[p[s]]
  if k: p['kit'] = k
  return p

DATA = json.load(open(os.path.dirname(__file__) + '/postcards-2026-10-15-data.json'))
picks = [pick(s, where=DATA['where'].get(s, '')) for s in MAIN + UEL + UECL]
idx = {s: i for i, s in enumerate(MAIN + UEL + UECL)}

def at(line, phrase):
  j = line.index(phrase); return round(j / len(line), 3)

beats = [dict(type='pc_cold', say=DATA['cold']['say'], steps=DATA['cold']['steps'], tail=0.6)]
beats.append(dict(type='pc_title', drop=True, l1='Postcards', l2='from Europe', sub=DATA['title_sub'], say=DATA['title_say']))
for s in MAIN:
  t = DATA['ties'][s]
  b = dict(type='pc_tie', match=idx[s], city=t['city'], stadium=t['stadium'], chip=t['chip'], notes=t['notes'], pols=t['pols'],
           verdict=t['verdict'], say=t['say'], credit=t['credit'])
  for k in ('flip_at', 'model_at', 'verdict_at', 'model', 'stamp', 'pm_city'):
    if k in t: b[k] = t[k]
  if 'verdict_at' not in b: b['verdict_at'] = [len(t['say']) - 1, at(t['say'][-1], DATA.get('call_phrase', 'Our call'))]
  beats.append(b)
for bd in DATA['boards']:
  beats.append(dict(type='pc_board', kicker=bd['kicker'], l1=bd['l1'], l2=bd['l2'], cols=bd['cols'],
    cards=[dict(match=idx[c['slug']], city=c['city'], note=c['note']) for c in bd['cards']], hl=bd.get('hl', []), say=bd['say']))
beats.append(dict(type='pc_end', l1="Tonight's", l2='postcards', kicker=DATA['end_kicker'], follow='Follow for the results', say=DATA['end_say']))

cfg = {'mode': 'review', 'title': 'Postcards from Europe: Europa League Thursday, 15 Oct', 'competition': 'UEFA Europa League', 'date': '2026-10-15',
  'sound': 'cinematic', 'voice_fx': 'deep', 'voice_speed': 1.05, 'music_vibe': ['cinematic'], 'music_drop': 'after_cold', 'music_duck': 10,
  'music_track': DATA['music_track'], 'stadiums': False, 'media_dir': '.cache/media/analysis-2026-10-15-postcards',
  'review': {'project': 'Postcards from Europe', 'beats': beats}, 'picks': picks}
json.dump(cfg, open(O + 'analysis-2026-10-15-postcards.json', 'w'), ensure_ascii=False, indent=1)
w = sum(len(' '.join(b['say']).split()) for b in beats)
print('words', w, '≈', round(w * 0.394), 's')
for b in beats:
  for l in b['say']:
    if '/' in l: print('SLASH:', l)
