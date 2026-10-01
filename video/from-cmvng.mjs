#!/usr/bin/env node
// Fills in a picks file from cmvngpicks.com match pages, so you don't have to type anything.
//
//   node video/from-cmvng.mjs https://cmvngpicks.com/m/1010233 1010235 1023546 --out video/templates/today.json
//
// For each match it takes: competition, date and kick-off, the main bet ("THE BET") with its price and %,
// home/draw/away % and expected goals (from the scoreline grid), last-5 form, and goals scored/conceded.
// Check the file before making the video. You can change any pick, price or % by hand.

import fs from 'node:fs'

const args = process.argv.slice(2)
const outIdx = args.indexOf('--out')
const out = outIdx >= 0 ? args[outIdx + 1] : null
const ids = args.filter((a, i) => !a.startsWith('--') && (outIdx < 0 || i !== outIdx + 1))
if (!ids.length) { console.log('Usage: node video/from-cmvng.mjs <match url or id> ... [--out picks.json]'); process.exit(1) }

import { page, parse } from './lib/cmvng-site.mjs'

const picks = []
for (const id of ids) {
  try {
    const p = parse(await page(id))
    const missing = ['pick', 'odds', 'model'].filter(k => p[k] === undefined)
    console.error(`${p.home} v ${p.away}: ${p.pick ?? '?'} @ ${p.odds ?? '?'} (${p.model ?? '?'}%)${missing.length ? '  ← fill in: ' + missing.join(', ') : ''}`)
    picks.push(p)
  } catch (e) { console.error(`${id}: ${e.message}`) }
}
const first = picks.find(p => p._month)
const year = new Date().getUTCFullYear()
const result = {
  title: '',
  competition: first?.competition || '',
  date: first ? `${year}-${String(first._month).padStart(2, '0')}-${String(first._day).padStart(2, '0')}` : '',
  stake_example: 10000,
  currency: '₦',
  picks: picks.map(({ _day, _month, competition, ...p }) => p),
}
const json = JSON.stringify(result, null, 2) + '\n'
if (out) { fs.writeFileSync(out, json); console.error(`Saved ${out}`) } else process.stdout.write(json)
