"""The real numbers and charts for the 13 Nov Bitcoin video, fetched from public data on the day.
  python3 -I fetch_data.py <data dir> <page dir>     writes <data dir>/data.json, <page dir>/data.js and <page dir>/img/logo/*

Sources (public, no key): Binance market data (BTCUSDT daily candles, the last 1-minute price), CoinGecko (logos),
alternative.me (the Crypto Fear & Greed Index), Wikimedia Commons (the Nvidia logo). Every figure carries its date.
Nothing is typed by hand here: if a pull fails the field is left out and the page must not show it."""
import json, os, sys, time, urllib.request, datetime
D, PAGE = sys.argv[1:3]
os.makedirs(D, exist_ok=True); os.makedirs(f'{PAGE}/img/logo', exist_ok=True)
def get(u, raw=False):
    err = ''
    for k in range(4):
        try:
            r = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'cmvng-video/1.0', 'Accept': '*/*'}), timeout=40).read()
            return r if raw else json.loads(r)
        except Exception as e: err = str(e)[:80]; time.sleep(5 + 6 * k)
    print('FAILED', u[:100], err); return None
UTC = datetime.timezone.utc
ms = lambda s: int(datetime.datetime.fromisoformat(s).replace(tzinfo=UTC).timestamp() * 1000)
day = lambda t: datetime.datetime.fromtimestamp(t, UTC).strftime('%Y-%m-%d')
def kl(iv, a, b=None):
    out, st, end = [], ms(a), ms(b) if b else int(time.time() * 1000)
    while st < end:
        k = get(f'https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval={iv}&startTime={st}&endTime={end}&limit=1000')
        if not k: break
        out += k; st = k[-1][0] + 1
        if len(k) < 1000: break
    return [[r[0] // 1000, float(r[1]), float(r[2]), float(r[3]), float(r[4])] for r in out]
now = datetime.datetime.now(UTC)
d = kl('1d', '2025-01-01')
last = kl('1m', (now - datetime.timedelta(minutes=5)).strftime('%Y-%m-%dT%H:%M'))[-1]
out = dict(fetched=now.strftime('%Y-%m-%d %H:%M UTC'), src='Binance BTCUSDT')
out['now'] = dict(price=last[4], t=last[0] + 60, lagos=datetime.datetime.fromtimestamp(last[0] + 60, datetime.timezone(datetime.timedelta(hours=1))).strftime('%-d %b %Y, %H:%M Lagos'))
out['now']['chg24'] = None
t24 = get('https://data-api.binance.vision/api/v3/ticker/24hr?symbol=BTCUSDT')
if t24: out['now']['chg24'] = float(t24['priceChangePercent'])
top = max(d, key=lambda r: r[2]); out['top'] = dict(price=top[2], date=day(top[0]))
out['since'] = [[r[0], r[4]] for r in d if day(r[0]) >= '2025-09-01'][:-1] + [[last[0], last[4]]]      # the opening chart: every daily close from Sep 2025, the last one live
out['now']['from_top'] = round((last[4] / top[2] - 1) * 100, 1)
# the Bybit hack, 21 Feb 2025: daily candles from a week before to the bottom and after
by = [r for r in d if '2025-02-10' <= day(r[0]) <= '2025-04-22']
h = next(i for i, r in enumerate(by) if day(r[0]) == '2025-02-21')
after = by[h:]; bot = min(range(len(after)), key=lambda i: after[i][3]) + h
pt = lambda dd: next(i for i, r in enumerate(by) if day(r[0]) == dd)
out['bybit'] = dict(c=by, hack=h, bottom=bot, hack_high=by[h][2], low=by[bot][3], low_date=day(by[bot][0]), days=bot - h,
                    drop=round((by[bot][3] / by[h][2] - 1) * 100, 1), p91=dict(i=pt('2025-02-24'), v=by[pt('2025-02-24')][4]), p76=dict(i=pt('2025-03-11'), v=by[pt('2025-03-11')][3]))
# the Binance hack, 29 Oct 2026: daily candles from a week before to today (the last one still open)
bn = [r for r in d if day(r[0]) >= '2026-10-20']
bh = next(i for i, r in enumerate(bn) if day(r[0]) == '2026-10-29')
bn[-1][4] = last[4]; bn[-1][2] = max(bn[-1][2], last[4]); bn[-1][3] = min(bn[-1][3], last[4])
out['binance'] = dict(c=bn, hack=bh, hack_open=bn[bh][1], days=len(bn) - 1 - bh, drop=round((last[4] / bn[bh][1] - 1) * 100, 1))
# both falls from the day of the hack: % from that day's high, by day (Bybit to day 60; Binance to today)
o1 = by[h][2]; o2 = bn[bh][2]          # % from the hack day's HIGH, for both: the Bybit fall to its bottom is then the -25% the owner says
by_long = [r for r in d if day(r[0]) >= '2025-02-21'][:61]
out['overlay'] = dict(bybit=[round((r[4] / o1 - 1) * 100, 2) for r in by_long], bybit_low=[round((r[3] / o1 - 1) * 100, 2) for r in by_long],
                      binance=[round((r[4] / o2 - 1) * 100, 2) for r in bn[bh:]], bybit_base=o1, binance_base=o2)
fg = get('https://api.alternative.me/fng/?limit=1')
if fg: out['fng'] = dict(v=int(fg['data'][0]['value']), label=fg['data'][0]['value_classification'], date=day(int(fg['data'][0]['timestamp'])))
logos = {}
for cid, name in [('bitcoin', 'btc'), ('binancecoin', 'binance'), ('tether', 'usdt'), ('usd-coin', 'usdc'), ('ripple', 'xrp')]:
    c = get(f'https://api.coingecko.com/api/v3/coins/{cid}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false'); time.sleep(3)
    img = c and get(c['image']['large'], raw=True)
    if img: open(f'{PAGE}/img/logo/{name}.png', 'wb').write(img); logos[name] = f'img/logo/{name}.png'
ex = get('https://api.coingecko.com/api/v3/exchanges/bybit_spot'); time.sleep(2)
img = ex and get(ex['image'].replace('/small/', '/large/'), raw=True) or (ex and get(ex['image'], raw=True))
if img: open(f'{PAGE}/img/logo/bybit.png', 'wb').write(img); logos['bybit'] = 'img/logo/bybit.png'
wm = get('https://commons.wikimedia.org/w/api.php?action=query&titles=File:Nvidia_logo.svg&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json')
try:
    u = next(iter(wm['query']['pages'].values()))['imageinfo'][0]['thumburl']; img = get(u, raw=True)
    if img: open(f'{PAGE}/img/logo/nvidia.png', 'wb').write(img); logos['nvidia'] = 'img/logo/nvidia.png'
except Exception as e: print('nvidia logo', e)
out['logos'] = logos
json.dump(out, open(f'{D}/data.json', 'w')); open(f'{PAGE}/data.js', 'w').write('window.DATA = ' + json.dumps(out) + '\n')
b, n = out['bybit'], out['binance']
print('now', out['now']); print('top', out['top'])
print(f"Bybit: hack-day high {b['hack_high']} -> low {b['low']} on {b['low_date']} ({b['days']} days, {b['drop']}%); 24 Feb close {b['p91']['v']}; 11 Mar low {b['p76']['v']}")
print(f"Binance: hack-day open {n['hack_open']} -> now {last[4]} ({n['days']} days, {n['drop']}%)")
print('fng', out.get('fng'), '| logos', logos)
