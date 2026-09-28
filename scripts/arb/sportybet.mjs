// scripts/arb/sportybet.mjs — SportyBet Nigeria football odds (1X2 + double chance)
//
// UNTESTED: SportyBet answers datacenter IPs with a 403 (CloudFront), so this could not be run from the build
// sandbox. The response shape below is taken from SportyBet's public web client and may have changed. Run it
// from a Nigerian / home connection. If it breaks, dump the raw JSON and adjust toQuote(), or fall back to
// typing odds into a JSON file (see odds.example.json).
const BASE = 'https://www.sportybet.com/api/ng/factsCenter'

export async function fetchSportyBetFootball({ pages = 6, pageSize = 100 } = {}) {
  const quotes = []
  for (let pageNum = 1; pageNum <= pages; pageNum++) {
    // market 1 = 1X2, market 10 = double chance
    const qs = new URLSearchParams({ sportId: 'sr:sport:1', marketId: '1,10', pageSize: String(pageSize), pageNum: String(pageNum), option: '1' })
    const r = await fetch(`${BASE}/pcUpcomingEvents?${qs}`, {
      headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0', referer: 'https://www.sportybet.com/ng/' },
    })
    if (!r.ok) throw new Error(`SportyBet HTTP ${r.status} — it blocks datacenter IPs; run this from a Nigerian / home connection`)
    const tournaments = (await r.json())?.data?.tournaments ?? []
    if (!tournaments.length) break
    for (const t of tournaments) {
      for (const e of t.events ?? []) {
        const q = toQuote(e)
        if (q) quotes.push(q)
      }
    }
  }
  if (!quotes.length) throw new Error('SportyBet returned no parsable football events — response shape may have changed')
  return quotes
}

function toQuote(e) {
  const market = (id) => (e.markets ?? []).find((m) => String(m.id) === id)
  const pick = (m, re) => Number(m?.outcomes?.find((o) => re.test(o.desc) && o.isActive !== 0)?.odds)
  const m1 = market('1')
  const odds = { H: pick(m1, /^home$/i), D: pick(m1, /^draw$/i), A: pick(m1, /^away$/i) }
  if (!e.homeTeamName || !e.awayTeamName || !Object.values(odds).every((x) => x > 1)) return null
  const m10 = market('10')
  const dc = m10 ? { '1X': pick(m10, /^home or draw$/i), X2: pick(m10, /^draw or away$/i), 12: pick(m10, /^home or away$/i) } : undefined
  return { bookmaker: 'SportyBet', home: e.homeTeamName, away: e.awayTeamName, kickoff: e.estimateStartTime, odds, dc }
}
