# Edge finder for prediction-market videos: our app's win/draw/win chances against Polymarket's live prices
# (public Gamma API, no key). Edit the M list each day: (event slug, home, away, app home/draw/away %, app pick).
# Prints every YES/NO option with its buy price, our chance and the edge; writes the table to a JSON file.
import json, urllib.request, datetime, sys
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent':'cmvng-video/1.0'}), timeout=30) as r: return json.load(r)
M = [  # slug, home, away, app home/draw/away %, app's own pick
 ('unl-bel-tur-2026-10-02','Belgium','Türkiye',51,26,23,'Türkiye under 1.5 goals (Belgium to win)'),
 ('unl-pol-rom-2026-10-02','Poland','Romania',46,26,28,'Poland or draw & over 1.5'),
 ('unl-hun-geo-2026-10-02','Hungary','Georgia',46,25,29,'Over 1.5 goals (no side)'),
 ('unl-lat-mon-2026-10-02','Latvia','Montenegro',29,26,45,'Montenegro draw no bet'),
 ('unl-cyp-arm-2026-10-02','Cyprus','Armenia',55,24,21,'Over 1.5 goals (Cyprus likelier)'),
 ('conl-skn-cub-2026-10-02','St Kitts & Nevis','Cuba',40,24,36,'Over 1.5 goals (no side)'),
]
out = []
for slug,h,a,ph,pd,pa,apick in M:
    e = get('https://gamma-api.polymarket.com/events?slug='+slug)[0]
    rows = []
    for m in e['markets']:
        q = m['question']; ask = float(m['bestAsk']); bid = float(m['bestBid']); vol = float(m.get('volume') or 0); liq = float(m.get('liquidity') or 0)
        who = 'draw' if 'draw' in q.lower() else ('home' if q.startswith('Will '+e['title'].split(' vs.')[0]) else 'away')
        p = {'home':ph,'draw':pd,'away':pa}[who]/100
        rows.append(dict(q=q, who=who, side='YES', price=ask, ours=p, edge=p-ask, vol=vol, liq=liq))
        rows.append(dict(q=q, who=who, side='NO', price=round(1-bid,3), ours=1-p, edge=(1-p)-(1-bid), vol=vol, liq=liq))
    rows.sort(key=lambda r: -r['edge'])
    print(f"\n== {h} v {a}  | app: {ph}/{pd}/{pa}  | app pick: {apick}  | vol ${sum(float(m.get('volume') or 0) for m in e['markets']):,.0f}")
    for r in rows: print(f"   {r['side']:3} {r['q'][:55]:55} price {r['price']*100:5.1f}¢  ours {r['ours']*100:4.0f}%  edge {r['edge']*100:+5.1f}")
    out.append(dict(slug=slug, home=h, away=a, app=[ph,pd,pa], app_pick=apick, rows=rows))
json.dump(dict(at=datetime.datetime.utcnow().isoformat(timespec='minutes')+'Z', matches=out), open(sys.argv[1] if len(sys.argv) > 1 else 'pm_edges.json','w'), indent=1)
