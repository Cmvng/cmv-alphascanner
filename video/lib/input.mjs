// Reads a picks file (JSON or CSV), checks it, and works out everything the video
// needs that you don't have to type: fair odds, bookmaker %, edge, units and the
// stake split for the recap.

import fs from 'node:fs'

export const DEFAULTS = {
  mode: 'picks',             // 'picks' = before kick-off · 'results' = after the games, with returns
  title: '',                 // empty → "5 Picks" or "Results"
  competition: '',
  date: '',                  // YYYY-MM-DD
  stake_example: 10000,      // shown in the recap: how this amount splits across the picks
  currency: '₦',
  currency_word: 'naira',    // what the voiceover says
  units: { value: 7.5, small: 5 },
  skip_negative_edge: false, // true → leave out picks where your % is below the bookmaker's
  cta: { url: 'cmvngpicks.com', line: 'Full analysis on the app', say: 'C M V N G picks dot com' },
  voice: 'en_US-ryan-high',
  voice_speed: 1.12,         // 1 = the voice's normal pace; higher is faster
  music: true,               // true = built-in soft bed, false = none, or a path to your own track
}

const NUM = ['odds', 'model', 'home_win', 'draw', 'away_win', 'xg_home', 'xg_away', 'scored_home', 'scored_away',
  'conceded_home', 'conceded_away', 'rating_home', 'rating_away', 'units']

function parseCsv(text) {
  const rows = []
  for (const line of text.replace(/^﻿/, '').split(/\r?\n/)) {
    if (!line.trim()) continue
    const out = []; let cur = '', q = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++ } else q = !q }
      else if (c === ',' && !q) { out.push(cur); cur = '' }
      else cur += c
    }
    out.push(cur); rows.push(out.map(s => s.trim()))
  }
  const [head, ...body] = rows
  return body.map(r => Object.fromEntries(head.map((h, i) => [h.toLowerCase(), r[i] ?? ''])))
}

// CSV: one row per pick. Columns competition/date/stake_example/currency may sit on any row (first non-empty wins).
function fromCsv(text) {
  const rows = parseCsv(text)
  const top = {}
  for (const k of ['title', 'competition', 'date', 'stake_example', 'currency', 'currency_word']) {
    const v = rows.map(r => r[k]).find(Boolean); if (v) top[k] = k === 'stake_example' ? Number(v) : v
  }
  return { ...top, picks: rows }
}

export function loadInput(file) {
  const text = fs.readFileSync(file, 'utf8')
  const raw = file.toLowerCase().endsWith('.csv') ? fromCsv(text) : JSON.parse(text)
  const cfg = { ...DEFAULTS, ...raw, units: { ...DEFAULTS.units, ...(raw.units || {}) }, cta: { ...DEFAULTS.cta, ...(raw.cta || {}) } }
  if (!Array.isArray(raw.picks) || !raw.picks.length) throw new Error('The file needs a "picks" list with at least one match.')

  const errors = []
  let picks = raw.picks.map((p0, i) => {
    const p = { ...p0 }
    for (const k of NUM) if (p[k] !== undefined && p[k] !== '' && p[k] !== null) p[k] = Number(String(p[k]).replace('%', '')); else delete p[k]
    for (const k of Object.keys(p)) if (p[k] === '' || p[k] === null) delete p[k]
    for (const k of ['form_home', 'form_away']) if (p[k]) p[k] = String(p[k]).toUpperCase().replace(/[^WDL]/g, '').slice(0, 5)
    const where = `Pick ${i + 1}`
    if (cfg.mode === 'results') {
      const r = String(p.result || '').toLowerCase()
      p.result = /^w/.test(r) ? 'won' : /^l/.test(r) ? 'lost' : /^(v|void|push|ref)/.test(r) ? 'void' : ''
      if (!p.result) errors.push(`${where}: "result" must be won, lost or void`)
      if (p.score && !/^\d+\s*[-–:]\s*\d+$/.test(String(p.score))) errors.push(`${where}: "score" should look like 2-1`)
    }
    for (const k of ['home', 'away', 'pick']) if (!p[k]) errors.push(`${where}: "${k}" is missing`)
    if (!(p.odds > 1)) errors.push(`${where}: "odds" must be a bookmaker price above 1 (e.g. 1.85)`)
    if (!(p.model > 0 && p.model < 100)) errors.push(`${where}: "model" must be your % chance for the pick, between 0 and 100`)
    const x = [p.home_win, p.draw, p.away_win]
    if (x.some(v => v !== undefined) && x.some(v => v === undefined)) errors.push(`${where}: give all three of home_win, draw, away_win (or none)`)
    p.competition ||= cfg.competition
    // the maths
    p.fair = 100 / p.model                 // odds that would be a fair price if your % is right
    p.market = 100 / p.odds                // what the bookmaker's price implies (includes their margin)
    p.edge = p.odds * p.model / 100 - 1    // expected return per 1 staked, on your numbers
    p.value = p.edge > 0
    p.units ??= p.value ? cfg.units.value : cfg.units.small
    return p
  })
  if (errors.length) throw new Error('Please fix the picks file:\n  - ' + errors.join('\n  - '))
  if (cfg.skip_negative_edge) picks = picks.filter(p => p.value)
  if (!picks.length) throw new Error('No picks left after removing negative-edge picks.')

  // Recap: split the example stake by units, rounded down so the total never goes over
  const totalUnits = picks.reduce((s, p) => s + p.units, 0)
  const oneUnit = cfg.stake_example / totalUnits
  const step = cfg.stake_example >= 5000 ? 10 : cfg.stake_example >= 500 ? 1 : 0.01
  for (const p of picks) p.stake = Math.round(Math.floor(p.units * oneUnit / step + 1e-9) * step * 100) / 100
  const recap = { totalUnits, oneUnit, total: picks.reduce((s, p) => s + p.stake, 0) }
  if (cfg.mode === 'results') {
    for (const p of picks) p.ret = p.result === 'won' ? p.stake * p.odds : p.result === 'void' ? p.stake : 0
    recap.returned = picks.reduce((s, p) => s + p.ret, 0)
    recap.profit = recap.returned - recap.total
    recap.won = picks.filter(p => p.result === 'won').length
    recap.lost = picks.filter(p => p.result === 'lost').length
    recap.void = picks.filter(p => p.result === 'void').length
  }

  cfg.title ||= cfg.mode === 'results' ? 'Results' : `${picks.length} Picks`
  return { cfg, picks, recap }
}
