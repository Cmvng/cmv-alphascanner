// scripts/arb/arb.mjs — arbitrage maths: bookmaker odds vs bookmaker odds vs Limitless order books
import { costToBuy, depth, yesLevels, noLevels } from './limitless.mjs'

export const OUTCOMES = ['H', 'D', 'A']
const NAME = { H: 'Home', D: 'Draw', A: 'Away' }
// Bookmaker double-chance market that covers "not <outcome>"
const DC_FOR_NOT = { H: 'X2', D: '12', A: '1X' }
const MAX_Q = 3000

// ---------- team-name matching (bookmakers and Limitless spell teams differently) ----------
const ALIASES = {
  turkey: 'turkiye', czechrepublic: 'czechia', northmacedonia: 'fyrmacedonia', macedonia: 'fyrmacedonia',
  republicofireland: 'repofireland', ireland: 'repofireland', bosniaherzegovina: 'bosniaandherzegovina',
  holland: 'netherlands', unitedstates: 'usa', southkorea: 'korearepublic',
}
export function normTeam(s) {
  const t = String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, 'and').replace(/\b(fc|cf|the)\b/g, '').replace(/[^a-z0-9]/g, '')
  return ALIASES[t] || t
}

// quotes: [{ bookmaker, home, away, odds: {H,D,A}, dc?: {'1X','X2','12'} }] -> Map(match.slug -> quotes oriented to Limitless home/away)
export function attachQuotes(matches, quotes) {
  const map = new Map()
  const flipDc = { '1X': 'X2', X2: '1X', 12: '12' }
  for (const q of quotes) {
    const qh = normTeam(q.home)
    const qa = normTeam(q.away)
    for (const m of matches) {
      const mh = normTeam(m.home)
      const ma = normTeam(m.away)
      let oriented = null
      if (qh === mh && qa === ma) oriented = q
      else if (qh === ma && qa === mh) {
        oriented = { ...q, odds: { H: q.odds.A, D: q.odds.D, A: q.odds.H } }
        if (q.dc) oriented.dc = Object.fromEntries(Object.entries(q.dc).map(([k, v]) => [flipDc[k] || k, v]))
      }
      if (oriented) map.set(m.slug, [...(map.get(m.slug) || []), oriented])
    }
  }
  return map
}

// ---------- breakeven sheet: the bookmaker odds you'd need to see for an arb against Limitless ----------
export function targets(books, feeScale) {
  const t = {}
  for (const o of OUTCOMES) {
    const yes = yesLevels(books[o])
    const no = noLevels(books[o])
    const yc = yes.length ? costToBuy(yes, 1, feeScale).cost : null
    const nc = no.length ? costToBuy(no, 1, feeScale).cost : null
    t[o] = {
      bid: books[o].bids[0]?.price ?? null,
      ask: books[o].asks[0]?.price ?? null,
      // back outcome at bookmaker + buy its NO on Limitless: bookmaker odds must exceed this
      needBack: nc !== null && nc < 1 ? 1 / (1 - nc) : null,
      // buy outcome YES on Limitless + bookmaker double chance on the other two: DC odds must exceed this
      needDc: yc !== null && yc < 1 ? 1 / (1 - yc) : null,
      dcKey: DC_FOR_NOT[o],
    }
  }
  return t
}

// ---------- candidate arbs for one match ----------
export function candidates(m, books, quotes, feeScale) {
  const label = { H: m.home, D: 'Draw', A: m.away }
  const yes = {}
  const no = {}
  for (const o of OUTCOMES) {
    yes[o] = yesLevels(books[o])
    no[o] = noLevels(books[o])
  }
  const bestBook = {}
  const bestDc = {}
  for (const q of quotes) {
    for (const o of OUTCOMES) {
      const od = q.odds?.[o]
      if (od > 1 && (!bestBook[o] || od > bestBook[o].odds)) bestBook[o] = { venue: q.bookmaker, odds: od }
    }
    for (const [k, od] of Object.entries(q.dc || {})) {
      if (od > 1 && (!bestDc[k] || od > bestDc[k].odds)) bestDc[k] = { venue: q.bookmaker, odds: od }
    }
  }
  const out = []
  const bookLeg = (o, b) => ({ venue: b.venue, bet: label[o], odds: b.odds })

  if (OUTCOMES.every((o) => bestBook[o])) {
    out.push({ kind: 'bookmakers 3-way', title: 'Best odds across bookmakers', legs: OUTCOMES.map((o) => bookLeg(o, bestBook[o])) })
    // same, but let Limitless YES supply any outcome where it is cheaper than every bookmaker
    let used = false
    const legs = OUTCOMES.map((o) => {
      const ly = yes[o].length ? costToBuy(yes[o], 1, feeScale).cost : Infinity
      if (ly < 1 / bestBook[o].odds) {
        used = true
        return { venue: 'Limitless', bet: `${label[o]} YES`, levels: yes[o] }
      }
      return bookLeg(o, bestBook[o])
    })
    if (used) out.push({ kind: '3-way incl. Limitless', title: 'Cheapest source per outcome', legs })
  }
  for (const o of OUTCOMES) {
    if (bestBook[o] && no[o].length) {
      out.push({
        kind: 'bookie + Limitless NO',
        title: `${bestBook[o].venue} ${label[o]} @${bestBook[o].odds} + Limitless ${label[o]} NO`,
        legs: [bookLeg(o, bestBook[o]), { venue: 'Limitless', bet: `${label[o]} NO`, levels: no[o] }],
      })
    }
    const dc = bestDc[DC_FOR_NOT[o]]
    if (dc && yes[o].length) {
      out.push({
        kind: 'Limitless YES + bookie DC',
        title: `Limitless ${label[o]} YES + ${dc.venue} ${DC_FOR_NOT[o]} @${dc.odds}`,
        legs: [{ venue: 'Limitless', bet: `${label[o]} YES`, levels: yes[o] }, { venue: dc.venue, bet: DC_FOR_NOT[o], odds: dc.odds }],
      })
    }
  }
  // Internal consistency of Limitless itself: 3 YES pay $1, 3 NO pay $2
  if (OUTCOMES.every((o) => yes[o].length)) out.push({ kind: 'Limitless 3xYES', title: 'Buy every outcome YES', legs: OUTCOMES.map((o) => ({ venue: 'Limitless', bet: `${label[o]} YES`, levels: yes[o] })) })
  if (OUTCOMES.every((o) => no[o].length)) out.push({ kind: 'Limitless 3xNO', title: 'Buy every outcome NO', mult: 2, legs: OUTCOMES.map((o) => ({ venue: 'Limitless', bet: `${label[o]} NO`, levels: no[o] })) })
  return out.map((c) => evaluate(c, feeScale))
}

const legCost = (l, q, feeScale) => (l.levels ? costToBuy(l.levels, q, feeScale).cost : q / l.odds)

// margin = profit / outlay at top of book (+ fees). best = most $ profit given Limitless depth.
export function evaluate(c, feeScale) {
  const mult = c.mult || 1
  const limLegs = c.legs.filter((l) => l.levels)
  const maxQ = Math.floor(Math.min(MAX_Q, ...limLegs.map((l) => depth(l.levels, feeScale))))
  const total = (q) => c.legs.reduce((s, l) => s + legCost(l, q, feeScale), 0)
  if (!(maxQ >= 1)) return { ...c, margin: NaN, best: null }
  const top = total(1) / mult
  let best = null
  let maxProfitableQ = 0
  if (limLegs.length) {
    for (let q = 1; q <= maxQ; q++) {
      const profit = mult * q - total(q)
      if (profit > 0) maxProfitableQ = q
      if (!best || profit > best.profit) best = { q, profit, outlay: total(q), stakes: c.legs.map((l) => legCost(l, q, feeScale)) }
    }
  }
  return { ...c, margin: 1 / top - 1, best: best && best.profit > 0 ? best : null, maxProfitableQ, unlimited: limLegs.length === 0 }
}
