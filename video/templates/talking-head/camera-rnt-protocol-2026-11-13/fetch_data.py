"""Today's lending rates for the RNT Protocol video, from RNT Lend's own public API (the one its website uses).
  python3 -I fetch_data.py <data dir> <page dir>       writes <data dir>/data.json and <page dir>/data.js

The API returns the USDT0 reserve's history on the reental_polygon_v3 market (Aave V3, Polygon). Rates come as
"ray" numbers (1e27); the APY is compounded daily, the way the RNT website and the app show it:
APY = (1 + rate / 365) ^ 365 - 1. The latest point is today's rate."""
import json, sys, datetime, urllib.request
D, PAGE = sys.argv[1:3]
U = 'https://lend.rnt.finance/api/reserve-history/?chainId=137&asset=0xc2132d05d31c914a87c6611c10748aeb04b58e8f&timeWindow=LAST_WEEK'
it = json.loads(urllib.request.urlopen(urllib.request.Request(U, headers={'User-Agent': 'cmvng-video/1.0'}), timeout=40).read())['items']
apy = lambda lr: ((1 + int(lr) / 1e27 / 365) ** 365 - 1) * 100
last = it[-1]
out = dict(src=U, supply_apy=round(apy(last['liquidityRate']), 2), borrow_apy=round(apy(last['variableBorrowRate']), 2), t=last['timestamp'],
           at=datetime.datetime.fromtimestamp(last['timestamp'], datetime.timezone.utc).strftime('%-d %b %Y, %H:%M UTC'))
out['fetched'] = out['at']
out['per_day_7500'] = round(7500 * out['borrow_apy'] / 100 / 365, 2)       # the owner's $7,500 loan, one day's interest at today's borrow rate
out['year_10000'] = round(10000 * out['supply_apy'] / 100)                  # the owner's $10,000 supplied, a year at today's supply rate
out['week_min'] = round(min(apy(x['liquidityRate']) for x in it), 2); out['week_max'] = round(max(apy(x['liquidityRate']) for x in it), 2)
json.dump(out, open(f'{D}/data.json', 'w')); open(f'{PAGE}/data.js', 'w').write('window.DATA = ' + json.dumps(out) + '\n')
print(out)
