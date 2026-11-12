"""The real numbers and charts for the 12 Nov meme coin video, fetched from public data APIs on the day.
  python3 -I fetch_data.py <data dir> <page dir>      writes <data dir>/data.json and raw pulls, <page dir>/data.js and <page dir>/img/coins/*.png

Sources (all public, no key): CoinGecko API (price, market cap, all-time high and its date, logo, the "Meme" category's
market cap), Binance market data (daily closes: PNUT, PEPE, BONK, WIF, DOGE), GeckoTerminal (daily closes of the biggest
Solana pool: BILLY, RETARDIO, POPCAT, NUB), DefiLlama (pump.fun fees, day by day). Every figure carries its date.
Nothing here is typed by hand: if a pull fails the field is left out and the page must not show it."""
import json, os, sys, time, urllib.request, urllib.parse, datetime
D, PAGE = sys.argv[1:3]
os.makedirs(D, exist_ok=True); os.makedirs(f'{PAGE}/img/coins', exist_ok=True)
def get(u, raw=False, tries=5):
    err = ''
    for k in range(tries):
        try:
            r = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0', 'Accept': '*/*'}), timeout=40).read()
            return r if raw else json.loads(r)
        except Exception as e:
            err = str(e)[:90]; time.sleep(8 + 8 * k)
    print('FAILED', u[:110], err); return None
CG = 'https://api.coingecko.com/api/v3'
COINS = [dict(id='peanut-the-squirrel', sym='PNUT', name='Peanut', bn='PNUTUSDT'), dict(id='pepe', sym='PEPE', name='Pepe', bn='PEPEUSDT'),
         dict(id='billy', sym='BILLY', name='Billy', gt=True), dict(id='retardio', sym='RETARDIO', name='Retardio', gt=True),
         dict(id='bonk', sym='BONK', name='Bonk', bn='BONKUSDT'), dict(id='dogwifcoin', sym='WIF', name='dogwifhat', bn='WIFUSDT'),
         dict(id='popcat', sym='POPCAT', name='Popcat', gt=True), dict(id='dogecoin', sym='DOGE', name='Dogecoin', bn='DOGEUSDT')]
nub = get(CG + '/search?query=nub'); time.sleep(2.5)
cand = [c for c in (nub or {}).get('coins', []) if 'nub' in c['id'] and 'cat' in (c['id'] + c['name'].lower())]
print('nub candidates:', [(c['id'], c['name'], c['symbol'], c.get('market_cap_rank')) for c in (nub or {}).get('coins', [])[:8]])
if cand: COINS.append(dict(id=cand[0]['id'], sym=cand[0]['symbol'].upper(), name=cand[0]['name'], gt=True))
mk = get(CG + '/coins/markets?vs_currency=usd&ids=' + ','.join(c['id'] for c in COINS)); time.sleep(2.5)
json.dump(mk, open(f'{D}/cg_markets.json', 'w'))
by = {m['id']: m for m in (mk or [])}
now = datetime.datetime.now(datetime.timezone.utc)
def thin(pts, n=240):                         # at most n points, keeping the highest one
    if len(pts) <= n: return pts
    step = len(pts) / n; out = [pts[int(i * step)] for i in range(n)]; hi = max(pts, key=lambda p: p[1])
    out = sorted(set(map(tuple, out + [hi, pts[-1]]))); return [list(p) for p in out]
for c in COINS:
    m = by.get(c['id'])
    if not m: print('no market data for', c['id']); continue
    c.update(price=m['current_price'], mcap=m['market_cap'], ath=m['ath'], ath_date=m['ath_date'][:10], from_ath=round(m['ath_change_percentage'], 1), rank=m.get('market_cap_rank'), img=m['image'])
    img = get(m['image'].replace('/large/', '/large/'), raw=True)
    if img:
        ext = '.png' if img[:4] == b'\x89PNG' else ('.webp' if img[8:12] == b'WEBP' else '.jpg'); open(f"{PAGE}/img/coins/{c['id']}{ext}", 'wb').write(img); c['logo'] = f"img/coins/{c['id']}{ext}"
    pts = []
    if c.get('bn'):
        start = 0
        while True:
            k = get(f"https://data-api.binance.vision/api/v3/klines?symbol={c['bn']}&interval=1d&limit=1000&startTime={start}")
            if not k: break
            pts += [[r[0] // 1000, float(r[4])] for r in k]
            if len(k) < 1000: break
            start = k[-1][0] + 1
        c['chart_src'] = f"Binance {c['bn']}, daily close"
    elif c.get('gt'):
        det = get(f"{CG}/coins/{c['id']}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false"); time.sleep(2.5)
        addr = ((det or {}).get('platforms') or {}).get('solana'); c['address'] = addr
        if addr:
            pools = get(f'https://api.geckoterminal.com/api/v2/networks/solana/tokens/{addr}/pools?page=1'); time.sleep(1.2)
            pl = sorted((pools or {}).get('data', []), key=lambda p: -float(p['attributes'].get('reserve_in_usd') or 0))
            # the oldest big pool has the longest history: take the pool created first among the top five by size
            pl = sorted(pl[:5], key=lambda p: p['attributes'].get('pool_created_at') or '9')
            if pl:
                pid = pl[0]['attributes']['address']; c['pool'] = pid; before = None
                for _ in range(4):
                    u = f'https://api.geckoterminal.com/api/v2/networks/solana/pools/{pid}/ohlcv/day?aggregate=1&limit=1000&currency=usd' + (f'&before_timestamp={before}' if before else '')
                    o = get(u); time.sleep(1.5)
                    rows = (((o or {}).get('data') or {}).get('attributes') or {}).get('ohlcv_list') or []
                    if not rows: break
                    pts += [[r[0], float(r[4])] for r in rows]; before = min(r[0] for r in rows)
                    if len(rows) < 1000: break
                pts = sorted(map(tuple, pts)); pts = [list(p) for p in pts]
                c['chart_src'] = 'GeckoTerminal, biggest Solana pool, daily close'
    if pts:
        hi = max(pts, key=lambda p: p[1]); c['first'] = datetime.datetime.fromtimestamp(pts[0][0], datetime.timezone.utc).strftime('%Y-%m-%d')
        c['chart_high'] = hi[1]; c['chart_high_date'] = datetime.datetime.fromtimestamp(hi[0], datetime.timezone.utc).strftime('%Y-%m-%d'); c['last'] = pts[-1][1]; c['n'] = len(pts)
        c['pts'] = thin(pts)
        if c['id'] == 'dogwifcoin': c['full'] = pts          # the chart on screen is drawn from every daily close, not the thinned set
    print(f"{c['sym']:9s} price {c['price']:<12g} mcap ${c['mcap'] / 1e6:,.1f}M  high {c['ath']:g} on {c['ath_date']}  {c['from_ath']}% from it | chart {c.get('n', 0)} days from {c.get('first')} high {c.get('chart_high_date')}")
cat = get(CG + '/coins/categories'); time.sleep(2.5)
meme = next((x for x in (cat or []) if x['id'] == 'meme-token'), None)
fees = get('https://api.llama.fi/summary/fees/pump.fun?dataType=dailyFees')
json.dump(fees, open(f'{D}/llama_pumpfun_fees.json', 'w'))
out = dict(fetched=now.strftime('%Y-%m-%d %H:%M UTC'), coins=COINS)
if meme: out['meme_cap'] = dict(now=meme['market_cap'], at=meme.get('updated_at', '')[:16], src='CoinGecko "Meme" category')
if fees and fees.get('totalDataChart'):
    ch = fees['totalDataChart']; cum, s = [], 0.0
    for t, v in ch: s += float(v); cum.append([t, s])
    out['pump_fees'] = dict(total=s, first=datetime.datetime.fromtimestamp(ch[0][0], datetime.timezone.utc).strftime('%Y-%m-%d'), last=datetime.datetime.fromtimestamp(ch[-1][0], datetime.timezone.utc).strftime('%Y-%m-%d'),
                            d30=sum(float(v) for t, v in ch[-30:]), cum=thin(cum, 160), src='DefiLlama, pump.fun launchpad fees', total_api=fees.get('totalAllTime'))
    print(f"pump.fun fees: ${s / 1e9:.3f}B from {out['pump_fees']['first']} to {out['pump_fees']['last']} (API total {fees.get('totalAllTime')}); last 30 days ${out['pump_fees']['d30'] / 1e6:.1f}M")
if meme: print(f"meme category market cap now: ${meme['market_cap'] / 1e9:.2f}B at {meme.get('updated_at')}")
json.dump(out, open(f'{D}/data.json', 'w')); open(f'{PAGE}/data.js', 'w').write('window.DATA = ' + json.dumps(out) + '\n')
