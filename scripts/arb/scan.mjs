#!/usr/bin/env node
// scripts/arb/scan.mjs — scan bookmaker odds vs Limitless football markets for arbitrage
//
//   node scripts/arb/scan.mjs                          breakeven sheet: odds a bookmaker must show to beat Limitless
//   node scripts/arb/scan.mjs --odds odds.json         check real bookmaker odds (any number of bookmakers)
//   node scripts/arb/scan.mjs --sportybet              pull SportyBet live (run from a Nigerian / home connection)
//
// flags: --match "belgium vs france"  --within 48 (hours)  --include-live  --no-fee  --fee-scale 0.5  --min-margin -3  --json
import { readFileSync } from 'node:fs'
import { listFootballMatches, fetchMatchBooks, pool, noLevels, costToBuy } from './limitless.mjs'
import { attachQuotes, targets, candidates, normTeam, OUTCOMES } from './arb.mjs'

const argv = process.argv.slice(2)
const flag = (n) => argv.includes(`--${n}`)
const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d)

const feeScale = flag('no-fee') ? 0 : Number(opt('fee-scale', 1))
const minMargin = Number(opt('min-margin', -100)) / 100
const within = opt('within') ? Number(opt('within')) * 3600e3 : Infinity
const wat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
const pct = (x) => (x * 100).toFixed(1) + '%'
const cents = (x) => (x == null ? '  — ' : (x * 100).toFixed(1))
const odds2 = (x) => (x == null ? '  — ' : x.toFixed(2))

async function loadQuotes() {
  const quotes = []
  if (opt('odds')) quotes.push(...JSON.parse(readFileSync(opt('odds'), 'utf8')))
  if (flag('sportybet')) {
    const { fetchSportyBetFootball } = await import('./sportybet.mjs')
    quotes.push(...(await fetchSportyBetFootball()))
  }
  return quotes
}

const now = Date.now()
let matches = await listFootballMatches()
matches = matches.filter((m) => flag('include-live') || m.kickoff > now).filter((m) => m.kickoff - now <= within)
if (opt('match')) {
  const q = normTeam(opt('match'))
  matches = matches.filter((m) => normTeam(m.title).includes(q) || normTeam(`${m.home}vs${m.away}`).includes(q))
}
if (!matches.length) {
  console.log('No matching upcoming Limitless football markets.')
  process.exit(0)
}

const quotes = await loadQuotes()
const quoteMap = attachQuotes(matches, quotes)
const bookList = await pool(matches, 6, (m) => fetchMatchBooks(m))
const mins = (m) => Math.round((m.kickoff - now) / 60000)

// ---- hedge calculator: "I back <outcome> @odds at a bookmaker; what does it cost to be delta-neutral on Limitless?" ----
//   node scripts/arb/scan.mjs --match "belgium vs france" --hedge A --at 2.22 --stake 100 [--include-live]
if (opt('hedge')) {
  if (matches.length !== 1) {
    console.log(`--hedge needs --match to pick exactly one match (got ${matches.length}).`)
    process.exit(1)
  }
  const [m] = matches
  const books = bookList[0]
  const o = opt('hedge').toUpperCase()
  const odds = Number(opt('at'))
  const stake = Number(opt('stake', 100))
  if (!OUTCOMES.includes(o) || !(odds > 1)) {
    console.log('usage: --hedge H|D|A --at <bookmaker odds> [--stake <USD-equivalent>]')
    process.exit(1)
  }
  const name = { H: m.home, D: 'Draw', A: m.away }[o]
  const payout = stake * odds // paid by the bookmaker if <name> wins
  const no = noLevels(books[o])
  const { cost: h, complete } = costToBuy(no, payout, feeScale) // NO shares pay $1 each if <name> does NOT win
  const locked = payout - stake - h // identical whether or not <name> wins (payout NO shares = payout)
  const needOdds = 1 / (1 - h / payout) // bookmaker odds at which locked = 0 at today's Limitless price (c = h/payout, odds = 1/(1-c))
  const beNo = 1 - 1 / odds // max NO price (maker, fee-free) at which locked >= 0
  const noBid = books[o].asks[0] ? 1 - books[o].asks[0].price : null // best resting NO bid = 1 - best YES ask
  console.log(`${m.title} (${wat.format(m.kickoff)} WAT)  —  back ${name} @${odds}, stake $${stake} -> returns $${payout.toFixed(2)} if ${name} wins\n`)
  console.log('DELTA-NEUTRAL NOW (Limitless market order, fee included)')
  console.log(`  buy ${payout.toFixed(1)} ${name} NO for $${h.toFixed(2)} (avg ${((h / payout) * 100).toFixed(1)}¢)${complete ? '' : '  ** book too thin for this size **'}`)
  console.log(`  outlay $${(stake + h).toFixed(2)} -> you get back $${payout.toFixed(2)} either way`)
  console.log(`  locked result: ${locked >= 0 ? '+' : '-'}$${Math.abs(locked).toFixed(2)}  (${((locked / (stake + h)) * 100).toFixed(2)}% of outlay)\n`)
  console.log('BREAK-EVEN WITHOUT FEES (resting limit order on Limitless = maker = no fee)')
  console.log(`  rest a buy of ${name} NO at ${(beNo * 100).toFixed(1)}¢ or lower  (= selling ${name} YES at ${((1 - beNo) * 100).toFixed(1)}¢ or higher)`)
  console.log(`  today's best NO bid is ${noBid == null ? '—' : (noBid * 100).toFixed(1) + '¢'}, taker price ${no[0] ? (no[0].price * 100).toFixed(1) + '¢' : '—'}`)
  console.log(`  your order only fills if the market moves toward ${name} by ~${noBid == null ? '?' : Math.max(0, (noBid - beNo) * 100).toFixed(1)}¢, or the bookmaker odds rise\n`)
  console.log(`BOOKMAKER SIDE: at today's Limitless price the hedge breaks even if the bookmaker offers ${name} at ${needOdds.toFixed(2)} or better (you have ${odds}).`)
  process.exit(0)
}

if (flag('json')) {
  const rows = matches.map((m, i) => ({ match: m.title, kickoff: new Date(m.kickoff).toISOString(), targets: targets(bookList[i], feeScale), arbs: candidates(m, bookList[i], quoteMap.get(m.slug) || [], feeScale) }))
  console.log(JSON.stringify(rows, null, 1))
  process.exit(0)
}

console.log(`Limitless fee model: ${feeScale === 0 ? 'none' : `published taker buy curve x${feeScale} (0.4-3%, worst case)`}   |   ${matches.length} matches, ${quotes.length} bookmaker quotes\n`)

// ---- 1. real arb check (only when bookmaker odds were supplied) ----
if (quotes.length) {
  let found = 0
  let matched = 0
  matches.forEach((m, i) => {
    const qs = quoteMap.get(m.slug)
    if (!qs) return
    matched++
    const cs = candidates(m, bookList[i], qs, feeScale).filter((c) => c.margin >= minMargin).sort((a, b) => b.margin - a.margin)
    console.log(`${m.title}  —  ${wat.format(m.kickoff)} WAT (${mins(m) > 0 ? `in ${mins(m)} min` : 'LIVE'})   quotes: ${qs.map((q) => q.bookmaker).join(', ')}`)
    for (const c of cs.slice(0, 6)) {
      const tag = c.margin > 0 ? '  ARB ' : '      '
      const size = c.unlimited ? 'size: bookmaker limits only' : c.best ? `best $${c.best.profit.toFixed(2)} on ${c.best.q} shares (up to ${c.maxProfitableQ})` : 'no profitable size'
      console.log(`${tag}${(c.margin * 100).toFixed(2).padStart(7)}%  ${c.kind.padEnd(26)} ${c.title}   [${size}]`)
      if (c.margin > 0 && c.best) {
        c.legs.forEach((l, k) => console.log(`             stake $${c.best.stakes[k].toFixed(2)} on ${l.venue}: ${l.bet}${l.odds ? ' @' + l.odds : ''}`))
        found++
      } else if (c.margin > 0 && c.unlimited) {
        const s = c.legs.reduce((a, l) => a + 1 / l.odds, 0)
        c.legs.forEach((l) => console.log(`             per $100: $${(100 / l.odds / s).toFixed(2)} on ${l.venue}: ${l.bet} @${l.odds}`))
        found++
      }
    }
    console.log()
  })
  console.log(`${matched} of ${matches.length} Limitless matches had bookmaker odds. ${found ? `${found} arbitrage(s) found.` : 'No arbitrage at the current prices.'}`)
  if (matched === 0) console.log('No team-name matches — check spelling against Limitless (see ALIASES in arb.mjs).')
  console.log()
}

// ---- 2. breakeven sheet ----
console.log('BREAKEVEN SHEET — compare with the bookmaker app. Arb exists if its odds are ABOVE these (Limitless fees included).')
console.log('  back  = bookmaker odds on the outcome, paired with Limitless NO on that outcome')
console.log('  dc    = bookmaker double-chance odds on the other two outcomes, paired with Limitless YES\n')
const col = (s, w) => String(s).padEnd(w).slice(0, Math.max(w, String(s).length))
console.log(col('kickoff (WAT)', 20) + col('match', 38) + col('Limitless bid/ask ¢', 36) + col('need back-odds', 22) + 'need double-chance odds')
console.log(col('', 58) + OUTCOMES.map((o) => col(o === 'H' ? 'Home' : o === 'D' ? 'Draw' : 'Away', 12)).join('') + '  ' + OUTCOMES.map((o) => col(o, 7)).join('') + '  ' + ['X2 (not H)', '12 (not D)', '1X (not A)'].map((k) => col(k, 12)).join(''))
for (const [i, m] of matches.entries()) {
  const t = targets(bookList[i], feeScale)
  const title = m.title.replace(/^UEFA NL, /, 'NL: ')
  const ba = OUTCOMES.map((o) => col(`${cents(t[o].bid)}/${cents(t[o].ask)}`, 12)).join('')
  const nb = OUTCOMES.map((o) => col(odds2(t[o].needBack), 7)).join('')
  const nd = OUTCOMES.map((o) => col(odds2(t[o].needDc), 12)).join('')
  console.log(col(wat.format(m.kickoff), 20) + col(title, 38) + ba + '  ' + nb + '  ' + nd)
}
