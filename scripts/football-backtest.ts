// Backtests the football model on past seasons: refits every week and predicts the next
// week's matches using only data available at the time, then compares against the
// bookmakers' closing odds.
//
//   npm run football:backtest                 → last 2 completed seasons, default settings
//   npm run football:backtest -- --grid       → try a grid of settings (for tuning)
//   npm run football:backtest -- --write      → save summary for the /football page
//
// Needs Node 22.6+ (runs TypeScript directly via --experimental-strip-types).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  DEFAULT_OPTIONS, LEAGUES, fdSeason, parseResults, seasonStartDate, seasonStartYear, summarize, walkForward,
  type BacktestRecord, type Match, type ModelOptions,
} from '../src/lib/football/engine.ts'

const args = new Map(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? 'true'] as const }))
const SEASONS = Number(args.get('seasons') ?? 2)
const CACHE = join(tmpdir(), 'cmv-football-cache')
mkdirSync(CACHE, { recursive: true })

async function load(code: string, year: number): Promise<Match[]> {
  const file = join(CACHE, `${code}_${fdSeason(year)}.csv`)
  if (!existsSync(file)) {
    const r = await fetch(`https://football-data.co.uk/mmz4281/${fdSeason(year)}/${code}.csv`)
    if (!r.ok) return []
    writeFileSync(file, await r.text())
  }
  return parseResults(readFileSync(file, 'utf8'))
}

const lastComplete = seasonStartYear(new Date()) - 1
const testYears = Array.from({ length: SEASONS }, (_, i) => lastComplete - i)

// league → all matches from (oldest test season - 2) to the last completed season
const data = new Map<string, Match[]>()
for (const l of LEAGUES) {
  const years = []
  for (let y = lastComplete - SEASONS - 1; y <= lastComplete; y++) years.push(y)
  data.set(l.code, (await Promise.all(years.map(y => load(l.code, y)))).flat().sort((a, b) => a.date - b.date))
}

function run(opts: ModelOptions) {
  const perLeague = new Map<string, BacktestRecord[]>()
  for (const l of LEAGUES) {
    const all = data.get(l.code)!
    const recs: BacktestRecord[] = []
    for (const y of testYears) {
      const start = seasonStartDate(y), end = seasonStartDate(y + 1)
      // Only use the two seasons before the test season, like the live app does
      const window = all.filter(m => m.date >= seasonStartDate(y - 2) && m.date < end)
      // Teams that played in the league above last season came down, rather than up
      const relegated = l.parent
        ? [...new Set(data.get(l.parent)!.filter(m => m.date >= seasonStartDate(y - 1) && m.date < start).flatMap(m => [m.home, m.away]))]
        : []
      recs.push(...walkForward(window, start, end, start, opts, relegated))
    }
    perLeague.set(l.code, recs)
  }
  return perLeague
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`

if (args.has('grid')) {
  const rows: { opts: ModelOptions; ll: number; mll: number }[] = []
  for (const xi of (args.get('xis') ?? '0.001,0.0015,0.002,0.003,0.004').split(',').map(Number))
    for (const priorWeight of (args.get('priors') ?? '1,3,6').split(',').map(Number))
      for (const [newTeamAttack, newTeamDefence] of [[1, 1], [0.8, 1.2], [0.7, 1.3]]) {
        const opts = { ...DEFAULT_OPTIONS, xi, priorWeight, newTeamAttack, newTeamDefence }
        const all = [...run(opts).values()].flat()
        const s = summarize(all)
        rows.push({ opts, ll: s.model.logLoss, mll: s.market!.logLoss })
        console.log(`xi=${xi} prior=${priorWeight} new=${newTeamAttack}/${newTeamDefence}  logLoss=${s.model.logLoss.toFixed(4)}  acc=${pct(s.model.accuracy)}  O2.5 LL=${s.model.over25LogLoss.toFixed(4)}`)
      }
  rows.sort((a, b) => a.ll - b.ll)
  console.log('\nBest:', rows[0].opts, 'logLoss', rows[0].ll.toFixed(4), '(bookmakers', rows[0].mll.toFixed(4) + ')')
} else {
  const perLeague = run(DEFAULT_OPTIONS)
  const leagues = LEAGUES.map(l => ({ code: l.code, name: l.name, ...summarize(perLeague.get(l.code)!) }))
  const overall = summarize([...perLeague.values()].flat())

  console.log(`Backtest seasons: ${testYears.map(y => `${y}-${String((y + 1) % 100).padStart(2, '0')}`).join(', ')}  (settings: ${JSON.stringify(DEFAULT_OPTIONS)})\n`)
  console.log('League            Matches  Accuracy  Bookies acc  LogLoss  Bookies LL  O2.5 acc  Value bets  ROI')
  for (const r of [...leagues, { code: 'ALL', name: 'All leagues', ...overall }]) {
    console.log(
      r.name.padEnd(17), String(r.matches).padStart(7), pct(r.model.accuracy).padStart(9), pct(r.market?.accuracy ?? 0).padStart(12),
      r.model.logLoss.toFixed(4).padStart(8), (r.market?.logLoss ?? 0).toFixed(4).padStart(11), pct(r.model.over25Accuracy).padStart(9),
      String(r.valueBets.bets).padStart(11), pct(r.valueBets.roi).padStart(7),
    )
  }
  const all = [...perLeague.values()].flat()
  const freq = ['home', 'draw', 'away'].map(k => all.filter(r => (r.hg > r.ag ? 'home' : r.hg === r.ag ? 'draw' : 'away') === k).length / all.length)
  const naive = -freq.reduce((s, f) => s + f * Math.log(f), 0)
  console.log(`\nLog loss: lower is better. A know-nothing guess (always the average H/D/A rates) scores ${naive.toFixed(4)}.`)

  if (args.has('write')) {
    const out = {
      generatedAt: new Date().toISOString(),
      seasons: testYears.map(y => `${y}-${String((y + 1) % 100).padStart(2, '0')}`),
      options: DEFAULT_OPTIONS,
      naiveLogLoss: naive,
      overall, leagues,
    }
    writeFileSync(new URL('../src/lib/football/backtest-summary.json', import.meta.url), JSON.stringify(out, null, 2) + '\n')
    console.log('Wrote src/lib/football/backtest-summary.json')
  }
}
