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

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const ACRONYMS = new Set(['UEFA', 'FIFA', 'CAF', 'AFC', 'CONCACAF', 'CONMEBOL', 'OFC', 'NPFL', 'MLS', 'USL', 'EFL', 'FA', 'U21', 'U23', 'U19', 'U17', 'II', 'III'])
const titleCase = s => s.split(' ').map(w => ACRONYMS.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
const num = s => (s === undefined ? undefined : Number(String(s).replace(/[%,]/g, '')))
const isNum = s => /^-?\d+(\.\d+)?%?$/.test(s || '')

async function page(idOrUrl) {
  const url = /^https?:/.test(idOrUrl) ? idOrUrl : `https://cmvngpicks.com/m/${idOrUrl}`
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 cmvng-video' } })
  if (!r.ok) throw new Error(`${r.status} for ${url}`)
  const html = await r.text()
  const title = (html.match(/<title>(.*?)<\/title>/s) || [])[1]?.replace(/\s*-\s*cmvng\s*$/, '').trim()
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·')
  return { url, title, L: text.split('\n').map(s => s.trim()).filter(Boolean) }
}

function parse({ url, title, L }) {
  const [home, away] = title.split(' v ')
  const p = { home, away, source: url }
  // Header: "INTERNATIONAL - UEFA NATIONS LEAGUE", then the kick-off time and "Thu 1 Oct"
  const top = L.indexOf(`${home} v ${away}`)
  const comp = L.slice(top + 1, top + 4).find(l => / - /.test(l) && l === l.toUpperCase())
  if (comp) p.competition = titleCase(comp.split(' - ').slice(1).join(' - '))
  const ko = L.slice(top + 1, top + 8).find(l => /^\d\d:\d\d$/.test(l))
  const day = L.slice(top + 1, top + 8).map(l => l.match(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\d+) (\w{3})/)).find(Boolean)
  if (ko) p.kickoff = ko
  if (day) { p._day = Number(day[1]); p._month = MONTHS[day[2].toLowerCase()] }

  // THE BET: pick label sits just above "Home v Away"; price, book % and edge follow
  const b = L.indexOf('THE BET')
  if (b >= 0) {
    const j = L.indexOf(`${home} v ${away}`, b)
    if (j > 0) {
      p.pick = L[j - 1]
      if (isNum(L[j + 2]) && L[j + 3] === 'odds') p.odds = num(L[j + 2])
    }
    const conf = L.slice(b + 1, b + 5).find(l => /^\d{1,2}(\.\d)?$/.test(l))
    if (conf) p.model = num(conf)
  }
  // No "THE BET" on the page → use the pick tagged MAIN, else the first priced pick in the list
  const list = L.indexOf('PICKS')
  if (!p.pick && list > 0) {
    const main = L.indexOf('MAIN', list)
    if (main > 0) p.pick = L[main - 1]
    else for (let i = list + 1; i < L.length - 3; i++) {
      if (/^\d+\.\d\d$/.test(L[i])) { let j = i - 1; while (j > list && /^[A-Z ]+$/.test(L[j])) j--; p.pick = L[j]; p.note_check = 'No main bet on the page: this is the first priced pick. Check it.'; break }
      if (L[i] === 'SCORELINES') break
    }
  }
  // Prefer the % shown for the same bet in the PICKS list (one decimal)
  const k = L.indexOf(p.pick, list)
  if (k > 0) {
    const pc = L.slice(k + 1, k + 7).find(l => /^\d+(\.\d+)?%$/.test(l))
    if (pc) p.model = num(pc)
    const pr = L.slice(k + 1, k + 5).find(l => /^\d+\.\d\d$/.test(l))
    if (pr && !p.odds) p.odds = num(pr)
  }

  // Scoreline grid → home/draw/away and expected goals
  let ph = 0, pd = 0, pa = 0, xh = 0, xa = 0, tot = 0
  for (let i = 0; i < L.length - 1; i++) {
    const s = L[i].match(/^(\d)-(\d)$/), v = L[i + 1].match(/^([\d.]+)%$/)
    if (!s || !v) continue
    const h = +s[1], a = +s[2], q = +v[1]
    tot += q; xh += h * q; xa += a * q
    if (h > a) ph += q; else if (h === a) pd += q; else pa += q
  }
  if (tot > 50) {
    p.home_win = Math.round(ph / tot * 100); p.draw = Math.round(pd / tot * 100); p.away_win = 100 - p.home_win - p.draw
    p.xg_home = +(xh / tot).toFixed(2); p.xg_away = +(xa / tot).toFixed(2)
  }

  // Form, newest first on the site → oldest-to-newest for the video
  const f = L.indexOf('FORM · LAST 10')
  if (f >= 0) {
    const letters = []
    for (let i = f + 1; i < Math.min(L.length, f + 40); i++) if (/^[WDL]$/.test(L[i])) letters.push(L[i])
    if (letters.length >= 20) {
      p.form_home = letters.slice(0, 5).reverse().join('')
      p.form_away = letters.slice(10, 15).reverse().join('')
    }
  }
  for (const [label, key] of [['SCORED A GAME', 'scored'], ['CONCEDED A GAME', 'conceded']]) {
    const i = L.indexOf(label)
    if (i > 0 && isNum(L[i - 1]) && isNum(L[i + 1])) { p[`${key}_home`] = num(L[i - 1]); p[`${key}_away`] = num(L[i + 1]) }
  }
  return p
}

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
