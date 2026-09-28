// scripts/arb/limitless.mjs — Limitless Exchange football markets + order books (public API, no key)
const API = 'https://api.limitless.exchange'
const FOOTBALL_MATCHES_CATEGORY = 49 // "Football Matches" (3-way group markets: home / draw / away)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(path, tries = 3) {
  let err
  for (let i = 0; i < tries; i++) {
    let r
    try {
      r = await fetch(API + path, { headers: { accept: 'application/json', 'user-agent': 'cmv-alphascanner-arb/1.0' } })
    } catch (e) {
      err = e
      await sleep(400 * 2 ** i)
      continue
    }
    if (r.ok) return r.json()
    err = new Error(`Limitless ${path} -> HTTP ${r.status}`)
    if (r.status !== 429 && r.status < 500) break
    await sleep(400 * 2 ** i)
  }
  throw err
}

// Taker BUY fee curve from docs.limitless.exchange/user-guide/fees. Fee is charged in outcome tokens,
// so paying `p` per share only nets you (1 - fee) shares. Loyalty discounts can make your real fee lower.
const BUY_FEE = [[0.5, 0.03], [0.55, 0.0252], [0.6, 0.0213], [0.65, 0.018], [0.7, 0.0151], [0.75, 0.0126],
  [0.8, 0.0105], [0.85, 0.0085], [0.9, 0.0068], [0.95, 0.0053], [0.99, 0.0042], [0.999, 0.004]]

export function buyFee(p) {
  if (p <= BUY_FEE[0][0]) return BUY_FEE[0][1]
  for (let i = 1; i < BUY_FEE.length; i++) {
    const [p1, f1] = BUY_FEE[i]
    if (p <= p1) {
      const [p0, f0] = BUY_FEE[i - 1]
      return f0 + ((f1 - f0) * (p - p0)) / (p1 - p0)
    }
  }
  return BUY_FEE[BUY_FEE.length - 1][1]
}

export async function listFootballMatches() {
  const out = []
  for (let page = 1; page <= 10; page++) {
    const j = await getJson(`/markets/active/${FOOTBALL_MATCHES_CATEGORY}?limit=25&page=${page}`)
    for (const g of j.data) {
      const m = parseGroup(g)
      if (m) out.push(m)
    }
    if (j.data.length < 25) break
  }
  return out.sort((a, b) => a.kickoff - b.kickoff)
}

function parseGroup(g) {
  const md = g.metadata || {}
  const subs = g.markets || []
  if (subs.length !== 3 || !md.homeTeam || !md.awayTeam) return null
  const H = subs.find((s) => s.title === md.homeTeam)
  const A = subs.find((s) => s.title === md.awayTeam)
  const D = subs.find((s) => /^draw$/i.test(s.title))
  if (!H || !A || !D) return null
  return {
    title: g.title,
    league: md.leagueName || '',
    home: md.homeTeam,
    away: md.awayTeam,
    kickoff: (md.startMatchTimestampInUTC || 0) * 1000,
    slug: g.slug,
    outcomes: { H: H.slug, D: D.slug, A: A.slug },
  }
}

// Order book of one outcome's YES token. Sizes come back in 1e6 units. Levels at 0.001 / 0.999 are placeholders.
export async function fetchBook(slug) {
  const j = await getJson(`/markets/${slug}/orderbook`)
  const clean = (lv) => (lv || []).filter((l) => l.price > 0.001 && l.price < 0.999).map((l) => ({ price: l.price, size: l.size / 1e6 }))
  return {
    bids: clean(j.bids).sort((a, b) => b.price - a.price),
    asks: clean(j.asks).sort((a, b) => a.price - b.price),
    mid: j.midpoint,
  }
}

export async function fetchMatchBooks(m) {
  const [H, D, A] = await Promise.all([fetchBook(m.outcomes.H), fetchBook(m.outcomes.D), fetchBook(m.outcomes.A)])
  return { H, D, A }
}

// Levels you can BUY from, cheapest first. NO is the mirror of the YES book: buying NO at 1-p fills against a YES bid at p.
export const yesLevels = (book) => book.asks.map((l) => ({ price: l.price, size: l.size }))
export const noLevels = (book) => book.bids.map((l) => ({ price: 1 - l.price, size: l.size }))

// USDC needed to end up holding `q` shares (each pays $1 if it wins), walking the book with the taker fee applied.
export function costToBuy(levels, q, feeScale = 1) {
  let need = q
  let cost = 0
  for (const { price, size } of levels) {
    if (need <= 1e-9) break
    const keep = 1 - buyFee(price) * feeScale
    const raw = Math.min(size, need / keep)
    cost += raw * price
    need -= raw * keep
  }
  return { cost, complete: need <= 1e-6 }
}

// Total shares (net of fee) available across the levels.
export const depth = (levels, feeScale = 1) => levels.reduce((s, l) => s + l.size * (1 - buyFee(l.price) * feeScale), 0)

// Runs `fn` over `items` with at most `n` in flight.
export async function pool(items, n, fn) {
  const res = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++
        res[k] = await fn(items[k], k)
      }
    }),
  )
  return res
}
