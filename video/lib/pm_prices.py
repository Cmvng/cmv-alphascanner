# Refresh the Polymarket prices in a prediction-market video file (public Gamma API, no key).
# Each pm_pick beat's market carries `pm: {slug, q, idx}`: the event slug, the exact Polymarket question,
# and our side (0 = first outcome YES/OVER, 1 = second NO/UNDER). The buy price of the first outcome is the
# best ask; of the second, 1 - best bid. Updates yes/no/price on the picks, the slate rows and the hook chip.
#   python3 video/lib/pm_prices.py video/out/polymarket-2026-10-02.json
import json, sys, urllib.request, datetime
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'cmvng-video/1.0'}), timeout=30) as r: return json.load(r)
def market(slug, q):
    for s in (slug, slug + '-more-markets'):
        for e in get('https://gamma-api.polymarket.com/events?slug=' + s):
            for m in e['markets']:
                if m['question'] == q: return m
    raise SystemExit('missing on Polymarket: ' + q)
path = sys.argv[1]; cfg = json.load(open(path))
beats = cfg['review']['beats']; prices = {}
for b in beats:
    mk = b.get('market') or {}
    if b['type'] != 'pm_pick' or 'pm' not in mk: continue
    m = market(mk['pm']['slug'], mk['pm']['q'])
    ask, bid = float(m['bestAsk']), float(m['bestBid'])
    mk['yes'], mk['no'] = round(ask, 2), round(1 - bid, 2)
    mk['price'] = mk['yes'] if mk['pm']['idx'] == 0 else mk['no']
    prices[b['match']] = mk['price']
    print(f"{cfg['picks'][b['match']]['home']:>22} v {cfg['picks'][b['match']]['away']:<12} {mk['question'][:38]:38} {mk['side']:5} {mk['price']*100:3.0f}¢  $100 → ${100/mk['price']:.0f}   liquidity ${float(m.get('liquidity') or 0):,.0f}")
for b in beats:
    if b['type'] == 'pm_slate':
        for r in b['rows']:
            if r['match'] in prices: r['price'] = prices[r['match']]
    if b['type'] == 'pm_hook':
        now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=1)))
        b['chip'] = f"Polymarket · Prices at {now:%H:%M} Lagos"
    for i, line in enumerate(b.get('say') or []):   # keep spoken prices in step ("at 82 cents")
        if b['type'] == 'pm_pick' and b['match'] in prices:
            import re
            b['say'][i] = re.sub(r'at \d+ cents', f"at {round(prices[b['match']]*100)} cents", line)
json.dump(cfg, open(path, 'w'), indent=1, ensure_ascii=False)
print('updated', path)
