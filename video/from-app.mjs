#!/usr/bin/env node
// Builds the video file straight from cmvngpicks.com: the singles your app published, exactly as published.
//
//   node video/from-app.mjs picks                       today's latest session → picks file
//   node video/from-app.mjs results                     every single published today, once settled → results file
//   node video/from-app.mjs picks --session morning     a named session (morning, midday, evening, latest, all)
//   node video/from-app.mjs results --date 2026-09-30   another day (the last ~8 sessions are listed on /codes)
//   options: --money ngn|usd   --out file.json   --list (just show the sessions)
//
// Reads only public pages: /codes (sessions), the singles slip (pick, price, our %, book %, status, score),
// and each match page (home/draw/away %, expected goals, form, goals a game). Nothing is invented: a
// pick missing its price or % is left out and reported.

import fs from 'node:fs'
import path from 'node:path'
import { sessions, singles, page, parse } from './lib/cmvng-site.mjs'

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i < 0 ? d : argv[i + 1] }
const mode = ['results', 'picks', 'preview'].includes(argv[0]) ? argv[0] : null
if (!mode && !argv.includes('--list')) { console.log('Usage: node video/from-app.mjs picks|results|preview [--date YYYY-MM-DD] [--session morning|midday|evening|latest|all] [--money ngn|usd] [--out file.json]'); process.exit(1) }
const lagosToday = new Date(Date.now() + 3600e3).toISOString().slice(0, 10)
const date = opt('date', lagosToday)
const want = (opt('session', mode === 'results' ? 'all' : 'latest') || 'latest').toLowerCase()   // results: every single published that day
const money = opt('money', mode === 'results' ? 'usd' : 'ngn')
const MONEY = { ngn: [10000, '₦', 'naira'], usd: [100, '$', 'dollars'] }
const RESULT = { won: 'won', lost: 'lost', void: 'void', push: 'void', refund: 'void' }

// A match preview: one match, football numbers only (no odds, picks or stakes), for X / YouTube.
//   node video/from-app.mjs preview --match 987933       (the number in cmvngpicks.com/m/<number>)
//   node video/from-app.mjs preview --team Greece         (finds that team in today's singles)
if (mode === 'preview') {
  let mid = opt('match')
  if (!mid && opt('team')) {
    const day = (await sessions()).filter(s => s.date === date)
    for (const s of day) { const l = (await singles(s.run)).find(l => [l.home, l.away].some(t => t.toLowerCase().includes(opt('team').toLowerCase()))); if (l) { mid = l.mid; break } }
  }
  if (!mid) { console.error('Say which match: --match <id from cmvngpicks.com/m/<id>> or --team <name in today\'s singles>'); process.exit(2) }
  const m = parse(await page(mid))
  if (!m.home || !m.away) { console.error(`Couldn't read match ${mid}`); process.exit(2) }
  const keep = ['home', 'away', 'competition', 'kickoff', 'home_win', 'draw', 'away_win', 'xg_home', 'xg_away', 'form_home', 'form_away', 'scored_home', 'scored_away',
    'conceded_home', 'conceded_away', 'top_scores', 'record_home', 'record_away', 'games_home', 'games_away', 'ppg_home', 'ppg_away', 'clean_home', 'clean_away', 'shots_home', 'shots_away', 'sot_home', 'sot_away']
  const pk = Object.fromEntries(keep.filter(k => m[k] !== undefined).map(k => [k, m[k]]))
  const year = new Date().getUTCFullYear()
  const mdate = m._month ? `${year}-${String(m._month).padStart(2, '0')}-${String(m._day).padStart(2, '0')}` : date
  const out = { mode: 'preview', competition: m.competition || '', date: mdate, picks: [pk] }
  const slug = `preview-${mdate}-${(m.home + '-' + m.away).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const file = opt('out', path.join(path.dirname(new URL(import.meta.url).pathname), 'out', `${slug}.json`))
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n')
  console.error(`Preview · ${m.home} v ${m.away} · ${m.competition} · ${m.kickoff || ''}  (${Object.keys(pk).length - 2} numbers)`)
  console.log(file)
  process.exit(0)
}

const all = await sessions()
if (argv.includes('--list') || !mode) { for (const s of all) console.log(`${s.date}  ${s.name.padEnd(8)} ${s.run}`); process.exit(0) }
const day = all.filter(s => s.date === date)
if (!day.length) {
  console.error(`No session published for ${date} yet. Sessions on the site:\n` + all.map(s => `  ${s.date} ${s.name}`).join('\n'))
  process.exit(2)
}

// choose the session(s)
let chosen
if (want === 'all') chosen = day
else if (want !== 'latest') chosen = day.filter(s => s.name.toLowerCase() === want)
else chosen = [day[0]]                                    // newest first on the site
if (!chosen.length) { console.error(`No ${want} session on ${date}. That day has: ${day.map(s => s.name).join(', ')}`); process.exit(2) }

// read the singles; for results, "latest" means the newest session whose games have all finished
let legs = []
for (const s of chosen) legs.push(...(await singles(s.run)).map(l => ({ ...l, session: s.name })))
if (mode === 'results' && want === 'latest') {
  for (const s of day) {
    const L = (await singles(s.run)).map(l => ({ ...l, session: s.name }))
    if (L.length && L.every(l => RESULT[l.status])) { legs = L; chosen = [s]; break }
  }
}
// the same game + pick can appear in two sessions: keep it once
const seen = new Set(); legs = legs.filter(l => { const k = `${l.mid}|${l.pick}`; if (seen.has(k)) return false; seen.add(k); return true })
if (!legs.length) { console.error(`The ${chosen.map(s => s.name).join(' + ')} session on ${date} has no singles.`); process.exit(2) }

console.error(`${mode === 'results' ? 'Results' : 'Picks'} · ${date} · ${chosen.map(s => s.name).join(' + ')} session · ${legs.length} singles`)
const picks = [], left = []
for (const l of legs) {
  if (!(l.odds > 1) || !(l.model > 0 && l.model < 100)) { left.push(`${l.home} v ${l.away}: no price or % on the slip`); continue }
  const p = { home: l.home, away: l.away, competition: l.competition || undefined, kickoff: l.kickoff, pick: l.pick, odds: l.odds, model: l.model, book: l.book, read: l.read, country: l.country }
  if (mode === 'results') {
    const r = RESULT[l.status]
    if (!r) { left.push(`${l.home} v ${l.away}: not settled yet (${l.status || 'no status'})`); continue }
    p.result = r
    if (l.score) p.score = l.score
  }
  // the match page adds the deeper numbers (all optional)
  if (l.mid) {
    try {
      const m = parse(await page(l.mid))
      for (const k of ['home_win', 'draw', 'away_win', 'xg_home', 'xg_away', 'form_home', 'form_away', 'scored_home', 'scored_away', 'conceded_home', 'conceded_away'])
        if (m[k] !== undefined) p[k] = m[k]
    } catch (e) { console.error(`  (match page for ${l.home} v ${l.away} unavailable: ${e.message})`) }
  }
  console.error(`  ${(l.home + ' v ' + l.away).padEnd(40)} ${l.pick.padEnd(38)} @${l.odds.toFixed(2)}  us ${l.model}%  book ${l.book ?? '?'}%${p.result ? `  → ${p.result}${p.score ? ' ' + p.score : ''}` : ''}`)
  picks.push(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)))
}
for (const s of left) console.error(`  left out: ${s}`)
if (!picks.length) { console.error('Nothing to make a video from.'); process.exit(2) }

const comps = [...new Set(picks.map(p => p.competition))]
const [stake, currency, currency_word] = MONEY[money]
const out = {
  ...(mode === 'results' ? { mode: 'results' } : {}),
  competition: comps.length === 1 ? comps[0] : '',
  date,
  stake_example: stake, currency, currency_word,
  ...(mode === 'results' ? { results_session: chosen.map(s => s.name).join(' + ') } : { session: chosen.map(s => s.name).join(' + ') }),
  picks,
}
const file = opt('out', path.join(path.dirname(new URL(import.meta.url).pathname), 'out', `${mode}-${date}.json`))
fs.mkdirSync(path.dirname(file), { recursive: true })
fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n')
console.error(`Saved ${file}`)
console.log(file)
