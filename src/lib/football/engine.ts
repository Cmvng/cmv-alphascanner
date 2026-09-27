// Football prediction engine.
//
// Data:  football-data.co.uk  → historical results, xG and bookmaker odds (free CSVs)
//        openfootball         → full season schedules (public domain JSON on GitHub)
// Model: Dixon-Coles (1997) — each team gets an attack and a defence rating, goals are
//        Poisson, low scores get the Dixon-Coles correction, and recent matches count
//        more than old ones (exponential time decay).
//
// Pure TypeScript with no dependencies and no internal imports, so the same file runs in
// the Vercel function (api/football.ts), the browser, and the backtest script.

// parent = the league above, so teams relegated from it aren't mistaken for weak promoted sides
export interface League { code: string; name: string; country: string; flag: string; openfootball: string; parent?: string }

export const LEAGUES: League[] = [
  { code: 'E0', name: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', openfootball: 'en.1' },
  { code: 'E1', name: 'Championship', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', openfootball: 'en.2', parent: 'E0' },
  { code: 'SP1', name: 'La Liga', country: 'Spain', flag: '🇪🇸', openfootball: 'es.1' },
  { code: 'D1', name: 'Bundesliga', country: 'Germany', flag: '🇩🇪', openfootball: 'de.1' },
  { code: 'I1', name: 'Serie A', country: 'Italy', flag: '🇮🇹', openfootball: 'it.1' },
  { code: 'F1', name: 'Ligue 1', country: 'France', flag: '🇫🇷', openfootball: 'fr.1' },
  { code: 'N1', name: 'Eredivisie', country: 'Netherlands', flag: '🇳🇱', openfootball: 'nl.1' },
  { code: 'P1', name: 'Primeira Liga', country: 'Portugal', flag: '🇵🇹', openfootball: 'pt.1' },
]

const DAY = 86_400_000
const MAX_GOALS = 10

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface Odds { home: number; draw: number; away: number; over25?: number; under25?: number }

export interface Match {
  date: number // UTC midnight, ms
  home: string
  away: string
  hg: number
  ag: number
  hthg?: number
  htag?: number
  hxg?: number
  axg?: number
  odds?: Odds    // average pre-match odds (collected when fixtures are published)
  closing?: Odds // average closing odds
}

export interface ModelOptions {
  xi: number             // time decay per day: weight = exp(-xi * daysAgo)
  xgWeight: number       // 0..1 share of xG (vs actual goals) in the rating target, where xG exists
  priorWeight: number    // pseudo-matches pulling each team towards its prior rating
  newTeamAttack: number  // prior attack for teams new to the league (1 = league average)
  newTeamDefence: number // prior defence for teams new to the league (1 = league average, higher = leakier)
  relegatedAttack: number  // same, for teams that just came down from the league above
  relegatedDefence: number
  maxIter: number
}

// Tuned with scripts/football-backtest.ts on 2024-25 and 2025-26 (8 leagues, 5,832 matches).
// xgWeight only affects seasons where football-data.co.uk publishes xG (2026-27 onwards).
export const DEFAULT_OPTIONS: ModelOptions = {
  xi: 0.002,
  xgWeight: 0.5,
  priorWeight: 6,
  newTeamAttack: 0.8,
  newTeamDefence: 1.2,
  relegatedAttack: 1.35,
  relegatedDefence: 0.75,
  maxIter: 300,
}

export interface TeamRating {
  team: string
  attack: number  // multiplier, league average = 1
  defence: number // expected goals conceded vs an average attack at a neutral venue
  weight: number  // sum of time-decay weights of matches used (≈ "recent matches")
  isNew: boolean
}

export interface Model {
  teams: Record<string, TeamRating>
  homeAdvantage: number // multiplier on home expected goals
  rho: number           // Dixon-Coles low-score dependence
  avgDefence: number
  htShare: number       // share of goals scored in the first half
  matchesUsed: number
  asOf: number
  options: ModelOptions
  relegated: string[]
}

export interface Outcome { home: number; draw: number; away: number }

export interface Prediction {
  xgHome: number
  xgAway: number
  probs: Outcome
  doubleChance: { homeOrDraw: number; awayOrDraw: number; homeOrAway: number }
  overUnder: { line: number; over: number; under: number }[]
  btts: { yes: number; no: number }
  correctScores: { score: string; p: number }[]
  halfTime: Outcome & { mostLikelyScore: string }
  pick: { outcome: 'home' | 'draw' | 'away'; label: string; p: number; tier: 'banker' | 'strong' | 'lean' | 'open'; safer: { label: string; p: number } }
}

// ─────────────────────────────────────────────────────────────
// Parsing
// ─────────────────────────────────────────────────────────────

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const split = (line: string) => {
    const out: string[] = []
    let cur = '', quoted = false
    for (const ch of line) {
      if (ch === '"') quoted = !quoted
      else if (ch === ',' && !quoted) { out.push(cur); cur = '' }
      else cur += ch
    }
    out.push(cur)
    return out
  }
  const header = split(lines[0]).map(h => h.trim())
  return lines.slice(1).map(line => {
    const cells = split(line)
    const row: Record<string, string> = {}
    header.forEach((h, i) => { if (h) row[h] = (cells[i] ?? '').trim() })
    return row
  })
}

// football-data dates are dd/mm/yyyy (older files use dd/mm/yy)
function parseFdDate(s: string): number {
  const [d, m, y] = s.split('/').map(Number)
  if (!d || !m || !y) return NaN
  return Date.UTC(y < 100 ? 2000 + y : y, m - 1, d)
}

const num = (s: string | undefined) => {
  if (s === undefined || s === '') return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

function pickOdds(r: Record<string, string>, closing: boolean): Odds | undefined {
  const c = closing ? 'C' : ''
  for (const book of ['Avg', 'B365', 'PS', 'Max']) {
    const home = num(r[`${book}${c}H`]), draw = num(r[`${book}${c}D`]), away = num(r[`${book}${c}A`])
    if (home && draw && away && home > 1 && draw > 1 && away > 1) {
      return {
        home, draw, away,
        over25: num(r[`Avg${c}>2.5`]) ?? num(r[`B365${c}>2.5`]),
        under25: num(r[`Avg${c}<2.5`]) ?? num(r[`B365${c}<2.5`]),
      }
    }
  }
  return undefined
}

export function parseResults(text: string): Match[] {
  const out: Match[] = []
  for (const r of parseCsv(text)) {
    const date = parseFdDate(r.Date ?? '')
    const hg = num(r.FTHG), ag = num(r.FTAG)
    if (!Number.isFinite(date) || hg === undefined || ag === undefined || !r.HomeTeam || !r.AwayTeam) continue
    out.push({
      date, home: r.HomeTeam, away: r.AwayTeam, hg, ag,
      hthg: num(r.HTHG), htag: num(r.HTAG),
      hxg: num(r.HxG), axg: num(r.AxG),
      odds: pickOdds(r, false), closing: pickOdds(r, true),
    })
  }
  return out
}

export interface Fixture { date: string; time?: string; home: string; away: string; round?: string; odds?: Odds }

export function parseFixturesCsv(text: string, leagueCode: string): Fixture[] {
  return parseCsv(text)
    .filter(r => r.Div === leagueCode && r.HomeTeam && r.AwayTeam && Number.isFinite(parseFdDate(r.Date ?? '')))
    .map(r => ({
      date: new Date(parseFdDate(r.Date)).toISOString().slice(0, 10),
      time: r.Time || undefined,
      home: r.HomeTeam, away: r.AwayTeam,
      odds: pickOdds(r, false),
    }))
}

interface OfMatch { round?: string; date: string; time?: string; team1: string; team2: string; score?: { ft?: [number, number] } | number[]; status?: string }

// ─────────────────────────────────────────────────────────────
// Team-name matching (openfootball "Manchester United FC" → football-data "Man United")
// ─────────────────────────────────────────────────────────────

const STOPWORDS = new Set(['fc', 'afc', 'cf', 'sc', 'ac', 'ssc', 'as', 'us', 'cd', 'ud', 'rc', 'rcd', 'sd', 'ca', 'club', 'de', 'del', 'la', 'le', 'calcio', 'sv', 'vfb', 'vfl', 'tsg', 'fsv', 'bv', 'sl', 'gd', 'cs', 'fk', 'afc', '1', '1.', 'the', 'and'])

function tokens(name: string): string[] {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t && !STOPWORDS.has(t) && !/^\d+$/.test(t))
}

function nameSimilarity(a: string, b: string): number {
  const ta = tokens(a), tb = tokens(b)
  let score = 0
  for (const x of ta) for (const y of tb) {
    if (x === y) score += 2
    else if (x.length >= 3 && y.length >= 3 && (x.startsWith(y) || y.startsWith(x))) score += 1
  }
  return score
}

// Primary: pair up already-played matches (same date + same score) across both sources.
// Fallback: token similarity against the league's known football-data names.
export function buildNameMap(schedule: OfMatch[], results: Match[]): Map<string, string> {
  const votes = new Map<string, Map<string, number>>()
  const vote = (of: string, fd: string) => {
    const m = votes.get(of) ?? new Map<string, number>()
    m.set(fd, (m.get(fd) ?? 0) + 1)
    votes.set(of, m)
  }
  const byDate = new Map<string, Match[]>()
  for (const r of results) {
    const k = new Date(r.date).toISOString().slice(0, 10)
    byDate.set(k, [...(byDate.get(k) ?? []), r])
  }
  for (const m of schedule) {
    const ft = !Array.isArray(m.score) ? m.score?.ft : undefined
    if (!ft) continue
    const cands = (byDate.get(m.date) ?? []).filter(r => r.hg === ft[0] && r.ag === ft[1])
    const best = cands.length === 1 ? cands[0]
      : cands.sort((x, y) => (nameSimilarity(m.team1, y.home) + nameSimilarity(m.team2, y.away)) - (nameSimilarity(m.team1, x.home) + nameSimilarity(m.team2, x.away)))[0]
    if (best && (cands.length === 1 || nameSimilarity(m.team1, best.home) + nameSimilarity(m.team2, best.away) > 0)) {
      vote(m.team1, best.home)
      vote(m.team2, best.away)
    }
  }
  const map = new Map<string, string>()
  for (const [of, v] of votes) map.set(of, [...v.entries()].sort((a, b) => b[1] - a[1])[0][0])

  const known = [...new Set(results.flatMap(r => [r.home, r.away]))]
  const taken = new Set(map.values())
  for (const of of new Set(schedule.flatMap(m => [m.team1, m.team2]))) {
    if (map.has(of)) continue
    const ranked = known.filter(k => !taken.has(k)).map(k => [k, nameSimilarity(of, k)] as const).sort((a, b) => b[1] - a[1])
    if (ranked[0] && ranked[0][1] > 0) { map.set(of, ranked[0][0]); taken.add(ranked[0][0]) }
  }
  return map
}

// ─────────────────────────────────────────────────────────────
// Model fitting
// ─────────────────────────────────────────────────────────────

// Fits attack/defence/home advantage by maximising the time-weighted Poisson likelihood
// (closed-form fixed-point updates), then fits the Dixon-Coles rho by golden-section search.
// Prior rating for a team with no history in this league
function newTeamPrior(opts: ModelOptions, relegated: string[], team: string) {
  return relegated.includes(team)
    ? { attack: opts.relegatedAttack, defence: opts.relegatedDefence }
    : { attack: opts.newTeamAttack, defence: opts.newTeamDefence }
}

export function fitModel(all: Match[], asOf: number, seasonStart: number, opts: ModelOptions = DEFAULT_OPTIONS, relegated: string[] = []): Model {
  const ms = all.filter(m => m.date < asOf)
  const names = [...new Set(ms.flatMap(m => [m.home, m.away]))].sort()
  const idx = new Map(names.map((n, i) => [n, i]))
  const n = names.length, N = ms.length
  const H = new Int32Array(N), A = new Int32Array(N)
  const w = new Float64Array(N), x = new Float64Array(N), y = new Float64Array(N)
  const scored = new Float64Array(n), conceded = new Float64Array(n), weight = new Float64Array(n)
  const isNew = names.map(() => true)
  const priors = names.map(t => newTeamPrior(opts, relegated, t))
  const b = opts.xgWeight

  ms.forEach((m, k) => {
    H[k] = idx.get(m.home)!; A[k] = idx.get(m.away)!
    w[k] = Math.exp(-opts.xi * (asOf - m.date) / DAY)
    x[k] = b > 0 && m.hxg !== undefined ? (1 - b) * m.hg + b * m.hxg : m.hg
    y[k] = b > 0 && m.axg !== undefined ? (1 - b) * m.ag + b * m.axg : m.ag
    scored[H[k]] += w[k] * x[k]; scored[A[k]] += w[k] * y[k]
    conceded[H[k]] += w[k] * y[k]; conceded[A[k]] += w[k] * x[k]
    weight[H[k]] += w[k]; weight[A[k]] += w[k]
    if (m.date < seasonStart) { isNew[H[k]] = false; isNew[A[k]] = false }
  })

  let sw = 0, sg = 0
  for (let k = 0; k < N; k++) { sw += w[k]; sg += w[k] * (x[k] + y[k]) }
  const att = new Float64Array(n).fill(1)
  const def = new Float64Array(n).fill(sw > 0 ? sg / (2 * sw) : 1.35)
  let gamma = 1.25
  const kP = opts.priorWeight
  const mean = (a: Float64Array) => { let s = 0; for (const v of a) s += v; return n ? s / n : 1 }

  for (let iter = 0; iter < opts.maxIter; iter++) {
    let maxChange = 0
    const g = Math.sqrt(gamma)

    // attack
    let B = mean(def)
    const denA = new Float64Array(n)
    for (let k = 0; k < N; k++) { denA[H[k]] += w[k] * gamma * def[A[k]]; denA[A[k]] += w[k] * def[H[k]] }
    for (let i = 0; i < n; i++) {
      const prior = isNew[i] ? priors[i].attack : 1
      const v = (scored[i] + kP * prior * B * g) / (denA[i] + kP * B * g)
      maxChange = Math.max(maxChange, Math.abs(v - att[i]) / att[i]); att[i] = v
    }
    const ma = mean(att)
    for (let i = 0; i < n; i++) { att[i] /= ma; def[i] *= ma }

    // defence
    B = mean(def)
    const denD = new Float64Array(n)
    for (let k = 0; k < N; k++) { denD[A[k]] += w[k] * gamma * att[H[k]]; denD[H[k]] += w[k] * att[A[k]] }
    for (let i = 0; i < n; i++) {
      const prior = B * (isNew[i] ? priors[i].defence : 1)
      const v = (conceded[i] + kP * prior * g) / (denD[i] + kP * g)
      maxChange = Math.max(maxChange, Math.abs(v - def[i]) / def[i]); def[i] = v
    }

    // home advantage
    let hn = 0, hd = 0
    for (let k = 0; k < N; k++) { hn += w[k] * x[k]; hd += w[k] * att[H[k]] * def[A[k]] }
    const newGamma = hd > 0 ? hn / hd : 1.25
    maxChange = Math.max(maxChange, Math.abs(newGamma - gamma) / gamma); gamma = newGamma

    if (maxChange < 1e-7) break
  }

  // Dixon-Coles rho on actual goals
  const lam = new Float64Array(N), mu = new Float64Array(N)
  for (let k = 0; k < N; k++) { lam[k] = gamma * att[H[k]] * def[A[k]]; mu[k] = att[A[k]] * def[H[k]] }
  const rhoLik = (rho: number) => {
    let s = 0
    for (let k = 0; k < N; k++) {
      const t = tau(ms[k].hg, ms[k].ag, lam[k], mu[k], rho)
      if (t <= 0) return -Infinity
      if (t !== 1) s += w[k] * Math.log(t)
    }
    return s
  }
  const rho = N > 0 ? goldenMax(rhoLik, -0.25, 0.25) : 0

  let htG = 0, ftG = 0
  for (const m of ms) if (m.hthg !== undefined && m.htag !== undefined) { htG += m.hthg + m.htag; ftG += m.hg + m.ag }

  const teams: Record<string, TeamRating> = {}
  names.forEach((t, i) => { teams[t] = { team: t, attack: att[i], defence: def[i], weight: weight[i], isNew: isNew[i] } })
  return {
    teams, homeAdvantage: gamma, rho, avgDefence: mean(def),
    htShare: ftG > 0 ? htG / ftG : 0.44, matchesUsed: N, asOf, options: opts, relegated,
  }
}

function tau(x: number, y: number, lam: number, mu: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - lam * mu * rho
  if (x === 0 && y === 1) return 1 + lam * rho
  if (x === 1 && y === 0) return 1 + mu * rho
  if (x === 1 && y === 1) return 1 - rho
  return 1
}

function goldenMax(f: (v: number) => number, lo: number, hi: number, tol = 1e-5): number {
  const r = (Math.sqrt(5) - 1) / 2
  let a = lo, b = hi, c = b - r * (b - a), d = a + r * (b - a)
  let fc = f(c), fd = f(d)
  while (b - a > tol) {
    if (fc > fd) { b = d; d = c; fd = fc; c = b - r * (b - a); fc = f(c) }
    else { a = c; c = d; fc = fd; d = a + r * (b - a); fd = f(d) }
  }
  return (a + b) / 2
}

// ─────────────────────────────────────────────────────────────
// Prediction
// ─────────────────────────────────────────────────────────────

function poisson(lambda: number, max: number): number[] {
  const p = [Math.exp(-lambda)]
  for (let k = 1; k <= max; k++) p.push(p[k - 1] * lambda / k)
  return p
}

// Fitted rating, or the new-team prior for a team with no matches yet
function teamRating(model: Model, team: string): TeamRating {
  if (model.teams[team]) return model.teams[team]
  const p = newTeamPrior(model.options, model.relegated, team)
  return { team, attack: p.attack, defence: model.avgDefence * p.defence, weight: 0, isNew: true }
}

export function expectedGoals(model: Model, home: string, away: string): [number, number] {
  const h = teamRating(model, home)
  const a = teamRating(model, away)
  return [model.homeAdvantage * h.attack * a.defence, a.attack * h.defence]
}

export function scoreMatrix(lam: number, mu: number, rho: number): number[][] {
  const ph = poisson(lam, MAX_GOALS), pa = poisson(mu, MAX_GOALS)
  let total = 0
  const m = ph.map((p, i) => pa.map((q, j) => { const v = Math.max(0, p * q * tau(i, j, lam, mu, rho)); total += v; return v }))
  return m.map(row => row.map(v => v / total))
}

function outcome(m: number[][]): Outcome {
  let home = 0, draw = 0, away = 0
  m.forEach((row, i) => row.forEach((p, j) => { if (i > j) home += p; else if (i === j) draw += p; else away += p }))
  return { home, draw, away }
}

export function predict(model: Model, home: string, away: string): Prediction {
  const [lam, mu] = expectedGoals(model, home, away)
  const m = scoreMatrix(lam, mu, model.rho)
  const probs = outcome(m)

  const totals = (line: number) => {
    let over = 0
    m.forEach((row, i) => row.forEach((p, j) => { if (i + j > line) over += p }))
    return { line, over, under: 1 - over }
  }
  let bttsYes = 0
  m.forEach((row, i) => row.forEach((p, j) => { if (i > 0 && j > 0) bttsYes += p }))

  const scores = m.flatMap((row, i) => row.map((p, j) => ({ score: `${i}-${j}`, p })))
    .sort((a, b) => b.p - a.p).slice(0, 6)

  // Half time: same ratings, scaled to the league's first-half share of goals
  const ht = scoreMatrix(lam * model.htShare, mu * model.htShare, 0)
  const htOut = outcome(ht)
  const htTop = ht.flatMap((row, i) => row.map((p, j) => ({ s: `${i}-${j}`, p }))).sort((a, b) => b.p - a.p)[0]

  const ranked = (['home', 'draw', 'away'] as const).map(o => ({ o, p: probs[o] })).sort((a, b) => b.p - a.p)
  const top = ranked[0]
  const label = top.o === 'home' ? `${home} win` : top.o === 'away' ? `${away} win` : 'Draw'
  const tier = top.p >= 0.7 ? 'banker' : top.p >= 0.55 ? 'strong' : top.p >= 0.45 ? 'lean' : 'open'
  const safer = top.o === 'away'
    ? { label: `${away} or draw`, p: probs.away + probs.draw }
    : top.o === 'home'
      ? { label: `${home} or draw`, p: probs.home + probs.draw }
      : probs.home >= probs.away
        ? { label: `${home} or draw`, p: probs.home + probs.draw }
        : { label: `${away} or draw`, p: probs.away + probs.draw }

  return {
    xgHome: lam, xgAway: mu, probs,
    doubleChance: { homeOrDraw: probs.home + probs.draw, awayOrDraw: probs.away + probs.draw, homeOrAway: probs.home + probs.away },
    overUnder: [0.5, 1.5, 2.5, 3.5, 4.5].map(totals),
    btts: { yes: bttsYes, no: 1 - bttsYes },
    correctScores: scores,
    halfTime: { ...htOut, mostLikelyScore: htTop.s },
    pick: { outcome: top.o, label, p: top.p, tier, safer },
  }
}

// Bookmaker odds → probabilities with the bookmaker margin removed
export function impliedProbs(o: Odds): Outcome {
  const s = 1 / o.home + 1 / o.draw + 1 / o.away
  return { home: 1 / o.home / s, draw: 1 / o.draw / s, away: 1 / o.away / s }
}

// ─────────────────────────────────────────────────────────────
// Backtesting: refit weekly, predict the next week, using only data available at the time
// ─────────────────────────────────────────────────────────────

export interface BacktestRecord {
  date: number; home: string; away: string; hg: number; ag: number
  p: Outcome; over25: number
  market?: Outcome; marketOver25?: number // from closing odds
  odds?: Odds // pre-match odds (what you could actually have bet at)
}

export function walkForward(matches: Match[], from: number, to: number, seasonStart: number, opts: ModelOptions = DEFAULT_OPTIONS, relegated: string[] = [], stepDays = 7): BacktestRecord[] {
  const sorted = [...matches].sort((a, b) => a.date - b.date)
  const out: BacktestRecord[] = []
  for (let t = from; t < to; t += stepDays * DAY) {
    const batch = sorted.filter(m => m.date >= t && m.date < Math.min(t + stepDays * DAY, to))
    if (!batch.length) continue
    const model = fitModel(sorted, t, seasonStart, opts, relegated)
    for (const m of batch) {
      const pr = predict(model, m.home, m.away)
      const c = m.closing
      let marketOver25: number | undefined
      if (c?.over25 && c.under25) marketOver25 = (1 / c.over25) / (1 / c.over25 + 1 / c.under25)
      out.push({
        date: m.date, home: m.home, away: m.away, hg: m.hg, ag: m.ag,
        p: pr.probs, over25: pr.overUnder.find(o => o.line === 2.5)!.over,
        market: c ? impliedProbs(c) : undefined, marketOver25, odds: m.odds,
      })
    }
  }
  return out
}

export interface BacktestSummary {
  matches: number
  model: { accuracy: number; logLoss: number; brier: number; over25Accuracy: number; over25LogLoss: number }
  market?: { matches: number; accuracy: number; logLoss: number; brier: number; over25Accuracy?: number; over25LogLoss?: number; modelLogLossSameMatches: number }
  valueBets: { bets: number; profit: number; roi: number; edgeThreshold: number }
}

export function summarize(records: BacktestRecord[], edgeThreshold = 0.05): BacktestSummary {
  const res = (r: BacktestRecord) => (r.hg > r.ag ? 'home' : r.hg === r.ag ? 'draw' : 'away') as keyof Outcome
  const scoreSet = (rs: BacktestRecord[], get: (r: BacktestRecord) => Outcome) => {
    let acc = 0, ll = 0, br = 0
    for (const r of rs) {
      const p = get(r), a = res(r)
      const argmax = (['home', 'draw', 'away'] as const).reduce((m, k) => (p[k] > p[m] ? k : m), 'home' as keyof Outcome)
      if (argmax === a) acc++
      ll -= Math.log(Math.max(p[a], 1e-12))
      for (const k of ['home', 'draw', 'away'] as const) br += (p[k] - (k === a ? 1 : 0)) ** 2
    }
    const n = rs.length || 1
    return { accuracy: acc / n, logLoss: ll / n, brier: br / n }
  }
  const binary = (rs: BacktestRecord[], get: (r: BacktestRecord) => number) => {
    let acc = 0, ll = 0
    for (const r of rs) {
      const p = get(r), over = r.hg + r.ag > 2.5
      if ((p > 0.5) === over) acc++
      ll -= Math.log(Math.max(over ? p : 1 - p, 1e-12))
    }
    const n = rs.length || 1
    return { accuracy: acc / n, logLoss: ll / n }
  }

  const model = scoreSet(records, r => r.p)
  const ou = binary(records, r => r.over25)
  const withMarket = records.filter(r => r.market)
  const withMarketOu = records.filter(r => r.marketOver25 !== undefined)

  // Flat 1-unit bets on any outcome where model probability × pre-match odds beats 1 + threshold
  let bets = 0, profit = 0
  for (const r of records) {
    if (!r.odds) continue
    const a = res(r)
    for (const k of ['home', 'draw', 'away'] as const) {
      if (r.p[k] * r.odds[k] - 1 >= edgeThreshold) { bets++; profit += k === a ? r.odds[k] - 1 : -1 }
    }
  }

  return {
    matches: records.length,
    model: { ...model, over25Accuracy: ou.accuracy, over25LogLoss: ou.logLoss },
    market: withMarket.length ? {
      matches: withMarket.length,
      ...scoreSet(withMarket, r => r.market!),
      ...(withMarketOu.length ? (() => { const b = binary(withMarketOu, r => r.marketOver25!); return { over25Accuracy: b.accuracy, over25LogLoss: b.logLoss } })() : {}),
      modelLogLossSameMatches: scoreSet(withMarket, r => r.p).logLoss,
    } : undefined,
    valueBets: { bets, profit, roi: bets ? profit / bets : 0, edgeThreshold },
  }
}

// ─────────────────────────────────────────────────────────────
// Data loading
// ─────────────────────────────────────────────────────────────

const FD_BASE = 'https://football-data.co.uk'
const OF_BASE = 'https://raw.githubusercontent.com/openfootball/football.json/master'

// Seasons start in July/August; before July we're still in the previous season
export const seasonStartYear = (now: Date) => (now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1)
export const fdSeason = (y: number) => `${String(y % 100).padStart(2, '0')}${String((y + 1) % 100).padStart(2, '0')}`
const ofSeason = (y: number) => `${y}-${String((y + 1) % 100).padStart(2, '0')}`
export const seasonStartDate = (y: number) => Date.UTC(y, 6, 1)

async function fetchText(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'CMVFootball/1.0' } })
    return r.ok ? await r.text() : null
  } catch {
    return null
  }
}

export async function loadResults(code: string, startYear: number, seasons = 3): Promise<Match[]> {
  const years = Array.from({ length: seasons }, (_, i) => startYear - i)
  const texts = await Promise.all(years.map(y => fetchText(`${FD_BASE}/mmz4281/${fdSeason(y)}/${code}.csv`)))
  return texts.flatMap(t => (t ? parseResults(t) : [])).sort((a, b) => a.date - b.date)
}

// ─────────────────────────────────────────────────────────────
// League report (what the API returns)
// ─────────────────────────────────────────────────────────────

export interface FormEntry { result: 'W' | 'D' | 'L'; score: string; opponent: string; venue: 'H' | 'A'; date: string }

export interface FixturePrediction extends Fixture {
  prediction: Prediction
  market?: { implied: Outcome; edge: Outcome; over25Implied?: number }
  form: { home: FormEntry[]; away: FormEntry[] }
  ratings: { home?: TeamRating; away?: TeamRating }
}

export interface RatingRow { rank: number; team: string; attack: number; defence: number; goalDiff: number; isNew: boolean; arrival?: 'promoted' | 'relegated'; form: FormEntry[] }

export interface RoundReview { date: string; home: string; away: string; score: string; predicted: Outcome; correct: boolean }

export interface LeagueReport {
  league: League
  season: string
  generatedAt: string
  model: { homeAdvantage: number; rho: number; avgGoals: number; matchesUsed: number; lastResult?: string; xi: number }
  fixtures: FixturePrediction[]
  ratings: RatingRow[]
  seasonTrack?: BacktestSummary & { lastRound: RoundReview[] }
  notes: string[]
}

function formFor(team: string, results: Match[], n = 6): FormEntry[] {
  return results.filter(m => m.home === team || m.away === team).slice(-n).reverse().map(m => {
    const home = m.home === team
    const gf = home ? m.hg : m.ag, ga = home ? m.ag : m.hg
    return {
      result: gf > ga ? 'W' : gf === ga ? 'D' : 'L',
      score: `${gf}-${ga}`, opponent: home ? m.away : m.home, venue: home ? 'H' : 'A',
      date: new Date(m.date).toISOString().slice(0, 10),
    }
  })
}

export async function buildLeagueReport(code: string, now = new Date(), opts: ModelOptions = DEFAULT_OPTIONS): Promise<LeagueReport> {
  const league = LEAGUES.find(l => l.code === code)
  if (!league) throw new Error(`Unknown league ${code}`)
  const startYear = seasonStartYear(now)
  const seasonStart = seasonStartDate(startYear)
  const notes: string[] = []

  const [results, parentResults, ofText, fixturesText] = await Promise.all([
    loadResults(code, startYear),
    league.parent ? loadResults(league.parent, startYear - 1, 1) : Promise.resolve([]),
    fetchText(`${OF_BASE}/${ofSeason(startYear)}/${league.openfootball}.json`),
    fetchText(`${FD_BASE}/fixtures.csv`),
  ])
  if (!results.length) throw new Error('No results data available from football-data.co.uk')

  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const relegated = [...new Set(parentResults.flatMap(m => [m.home, m.away]))]
  const model = fitModel(results, today, seasonStart, opts, relegated)
  const current = results.filter(m => m.date >= seasonStart)
  const played = new Set(current.map(m => `${m.home}|${m.away}`))

  // Upcoming fixtures: openfootball schedule + football-data fixtures.csv (which carries odds)
  let upcoming: Fixture[] = []
  if (ofText) {
    try {
      const schedule: OfMatch[] = JSON.parse(ofText).matches ?? []
      const names = buildNameMap(schedule, current.length ? current : results)
      const unmatched = new Set<string>()
      for (const m of schedule) {
        if (m.status === 'postponed' || Date.parse(m.date) < today) continue
        const home = names.get(m.team1), away = names.get(m.team2)
        if (!home) unmatched.add(m.team1)
        if (!away) unmatched.add(m.team2)
        if (!home || !away || played.has(`${home}|${away}`)) continue
        upcoming.push({ date: m.date, time: m.time, home, away, round: m.round })
      }
      if (unmatched.size) notes.push(`Could not match team names: ${[...unmatched].join(', ')}`)
    } catch {
      notes.push('Season schedule could not be parsed')
    }
  } else {
    notes.push('Season schedule unavailable — showing fixtures.csv only')
  }
  const csvFixtures = fixturesText ? parseFixturesCsv(fixturesText, code) : []
  for (const f of csvFixtures) {
    if (Date.parse(f.date) < today || played.has(`${f.home}|${f.away}`)) continue
    const existing = upcoming.find(u => u.home === f.home && u.away === f.away)
    if (existing) { existing.odds = f.odds; existing.time ??= f.time }
    else upcoming.push(f)
  }
  upcoming.sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')))
  // Show the next matchday (plus any midweek round straight after it)
  if (upcoming.length) {
    const first = Date.parse(upcoming[0].date)
    upcoming = upcoming.filter(f => Date.parse(f.date) <= first + 6 * DAY)
  }

  const fixtures: FixturePrediction[] = upcoming.map(f => {
    const prediction = predict(model, f.home, f.away)
    let market: FixturePrediction['market']
    if (f.odds) {
      const implied = impliedProbs(f.odds)
      const o = f.odds
      market = {
        implied,
        edge: { home: prediction.probs.home * o.home - 1, draw: prediction.probs.draw * o.draw - 1, away: prediction.probs.away * o.away - 1 },
        over25Implied: o.over25 && o.under25 ? (1 / o.over25) / (1 / o.over25 + 1 / o.under25) : undefined,
      }
    }
    return {
      ...f, prediction, market,
      form: { home: formFor(f.home, results), away: formFor(f.away, results) },
      ratings: { home: model.teams[f.home], away: model.teams[f.away] },
    }
  })

  // Power ratings for teams in the current season: expected goal difference per match vs an average team, neutral venue
  const g = Math.sqrt(model.homeAdvantage)
  const seasonTeams = new Set(current.flatMap(m => [m.home, m.away]))
  for (const f of upcoming) { seasonTeams.add(f.home); seasonTeams.add(f.away) }
  const ratings: RatingRow[] = [...seasonTeams].map(team => {
    const t = teamRating(model, team)
    const attack = t.attack
    const defence = t.defence / model.avgDefence
    const arrival = t.isNew ? (relegated.includes(team) ? 'relegated' as const : 'promoted' as const) : undefined
    return { team, attack, defence, goalDiff: g * model.avgDefence * (attack - defence), isNew: t.isNew, arrival, form: formFor(team, results, 5), rank: 0 }
  }).sort((a, b) => b.goalDiff - a.goalDiff).map((r, i) => ({ ...r, rank: i + 1 }))

  // This season's track record: what the model would have said before each week's matches
  let seasonTrack: LeagueReport['seasonTrack']
  if (current.length >= 10) {
    const records = walkForward(results, seasonStart, today, seasonStart, opts, relegated)
    const lastDate = Math.max(...current.map(m => m.date))
    const lastRound = records.filter(r => r.date > lastDate - 4 * DAY).map(r => {
      const actual = r.hg > r.ag ? 'home' : r.hg === r.ag ? 'draw' : 'away'
      const top = (['home', 'draw', 'away'] as const).reduce((m, k) => (r.p[k] > r.p[m] ? k : m), 'home' as keyof Outcome)
      return { date: new Date(r.date).toISOString().slice(0, 10), home: r.home, away: r.away, score: `${r.hg}-${r.ag}`, predicted: r.p, correct: top === actual }
    })
    seasonTrack = { ...summarize(records), lastRound }
  }

  const totalGoals = current.length ? current.reduce((s, m) => s + m.hg + m.ag, 0) / current.length
    : results.reduce((s, m) => s + m.hg + m.ag, 0) / results.length
  return {
    league,
    season: ofSeason(startYear),
    generatedAt: now.toISOString(),
    model: {
      homeAdvantage: model.homeAdvantage, rho: model.rho, avgGoals: totalGoals, matchesUsed: model.matchesUsed,
      lastResult: results.length ? new Date(results[results.length - 1].date).toISOString().slice(0, 10) : undefined,
      xi: opts.xi,
    },
    fixtures, ratings, seasonTrack, notes,
  }
}
