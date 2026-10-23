"""data.js for the Kane overlay page: the plan, the Limitless series and the photo paths."""
import json, sys, datetime as D
K, LIM, PH, OUT = sys.argv[1:5]
plan = json.load(open(f'{K}/plan.json'))
a = json.load(open(f'{LIM}/hp_1m.json'))
ser = {}
for s in a:
    t = s['title'].strip()
    if t in ('Harry Kane', 'Lamine Yamal'):
        ser[t] = {D.datetime.utcfromtimestamp(int(x['timestamp']) / 1000): x['price'] for x in s['prices']}
days, kane, yamal = [], [], []
for i in range(30):
    d = D.datetime(2026, 9, 24, 12) + D.timedelta(days=i)
    if d.date() == D.date(2026, 9, 30): continue            # a 50/50 reset in the feed that day
    days.append(i); kane.append(ser['Harry Kane'][d]); yamal.append(ser['Lamine Yamal'][d])
days.append(29.04); kane.append(0.765); yamal.append(0.1625)  # 13:00 UTC, the hour the owner recorded (14:08 Lagos)
ph = {k: f'file://{PH}/{v}' for k, v in {
    'kane': 'Harry_Kane_England_v_Ghana_23_June_2026_219_cropped_jpg.jpg',
    'kane_back': 'Harry_Kane_England_v_Panama_27_June_26_142_jpg.jpg',
    'yamal': 'Lamine_Yamal_Argentina_v_Spain_19_July_2026_214_new_cropped_.jpg',
    'mbappe': 'Kylian_Mbappe_France_v_Senegal_16_June_2026_391_cropped_jpg.jpg',
    'messi': 'Leo_Messi_Argentina_v_Egypt_7_July_2026_1_jpg.jpg'}.items()}
open(f'{OUT}/data.js', 'w').write('window.PLAN=' + json.dumps(plan) + ';\nwindow.SERIES=' +
    json.dumps({'days': days, 'kane': kane, 'yamal': yamal}) + ';\nwindow.PH=' + json.dumps(ph) + ';\n')
print(len(days), 'chart points; level day', min(zip(days, kane, yamal), key=lambda r: abs(r[1] - r[2]) if 8 <= r[0] <= 14 else 9))
