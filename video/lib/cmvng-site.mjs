// Reads cmvngpicks.com pages: a match page (/m/<id>) and the public singles slips on /codes.
// Shared by from-cmvng.mjs (match pages you choose) and from-app.mjs (the day's published singles).

export const SITE = 'https://cmvngpicks.com'
export const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const ACRONYMS = new Set(['UEFA', 'FIFA', 'CAF', 'AFC', 'CONCACAF', 'CONMEBOL', 'OFC', 'NPFL', 'MLS', 'USL', 'EFL', 'FA', 'U21', 'U23', 'U19', 'U17', 'II', 'III'])
export const titleCase = s => s.split(' ').map(w => ACRONYMS.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
const num = s => (s === undefined ? undefined : Number(String(s).replace(/[%,]/g, '')))
const isNum = s => /^-?\d+(\.\d+)?%?$/.test(s || '')

export async function page(idOrUrl) {
  const url = /^https?:/.test(idOrUrl) ? idOrUrl : `${SITE}/m/${idOrUrl}`
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 cmvng-video' } })
  if (!r.ok) throw new Error(`${r.status} for ${url}`)
  const html = await r.text()
  const title = (html.match(/<title>(.*?)<\/title>/s) || [])[1]?.replace(/\s*-\s*cmvng\s*$/, '').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").trim()
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·')
  return { url, title, L: text.split('\n').map(s => s.trim()).filter(Boolean) }
}

export function parse({ url, title, L }) {
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
  // most likely scorelines from the grid → [[home, away, %], ...]
  const grid = []
  for (let i = 0; i < L.length - 1; i++) {
    const s = L[i].match(/^(\d)-(\d)$/), v = L[i + 1].match(/^([\d.]+)%$/)
    if (s && v) grid.push([+s[1], +s[2], +v[1]])
  }
  if (grid.length > 10) p.top_scores = grid.sort((a, b) => b[2] - a[2]).slice(0, 3)
  // the written read: last-10 record, points a game, shots on target, clean sheets (for match previews)
  const read = L.slice(L.indexOf('THE READ'), L.indexOf('THE READ') + 14).join(' ')
  const W = { none: 0, zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }
  const n = w => W[String(w).toLowerCase()] ?? Number(w)
  for (const [side, team] of [['home', home], ['away', away]]) {
    const esc = team.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const f = read.match(new RegExp(`${esc} have won (\\w+), drawn (\\w+) and lost (\\w+) of their last (\\w+), averaging ([\\d.]+) points a game`))
    if (f) { p[`record_${side}`] = [n(f[1]), n(f[2]), n(f[3])]; p[`games_${side}`] = n(f[4]); p[`ppg_${side}`] = +f[5] }
    const k = read.match(new RegExp(`${esc} score [\\d.]+ and concede [\\d.]+ a game over their last \\w+,[^.]*?(\\w+) clean sheets[^.]*\\. They average ([\\d.]+) shots with ([\\d.]+) on target`))
    if (k) { p[`clean_${side}`] = n(k[1]); p[`shots_${side}`] = +k[2]; p[`sot_${side}`] = +k[3] }
  }
  for (const [label, key] of [['SCORED A GAME', 'scored'], ['CONCEDED A GAME', 'conceded']]) {
    const i = L.indexOf(label)
    if (i > 0 && isNum(L[i - 1]) && isNum(L[i + 1])) { p[`${key}_home`] = num(L[i - 1]); p[`${key}_away`] = num(L[i + 1]) }
  }
  return p
}


// ---------------------------------------------------------------- the day's published singles (public /codes pages)
const UA = { 'User-Agent': 'Mozilla/5.0 cmvng-video' }
const unesc = s => String(s ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;|&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&middot;/g, '·').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
async function get(path) {
  const r = await fetch(SITE + path, { headers: UA })
  if (!r.ok) throw new Error(`${r.status} for ${SITE + path}`)
  return r.text()
}
const DOW = 'Mon|Tue|Wed|Thu|Fri|Sat|Sun'
// "Thu 01 Oct" → "2026-10-01" (the year that puts it nearest to today)
function isoDay(d, m) {
  const now = new Date(), y = now.getUTCFullYear()
  const best = [y - 1, y, y + 1].map(yy => new Date(Date.UTC(yy, m - 1, d))).sort((a, b) => Math.abs(a - now) - Math.abs(b - now))[0]
  return best.toISOString().slice(0, 10)
}

// Sessions listed on /codes, newest first: [{ date, name: 'Morning'|'Midday'|'Evening', run }]
export async function sessions() {
  const html = await get('/codes'), out = []
  for (const m of html.matchAll(/<a[^>]*href="\/codes\?s=(codes722-[0-9a-f]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const txt = unesc(m[2]), d = txt.match(new RegExp(`(?:${DOW}) (\\d{1,2}) (\\w{3})\\b.*?(Morning|Midday|Afternoon|Evening|Night)`, 'i'))
    if (d && !out.some(s => s.run === m[1])) out.push({ date: isoDay(+d[1], MONTHS[d[2].toLowerCase()]), name: d[3][0].toUpperCase() + d[3].slice(1).toLowerCase(), run: m[1] })
  }
  return out
}

// "International - UEFA Nations League" → "UEFA Nations League"
const league = s => s.includes(' - ') ? s.split(' - ').slice(1).join(' - ') : s
// the app's market labels → how the video shows them
function cleanPick(s) {
  return s.replace(/^Over\/Under:\s*(Over|Under) ([\d.]+)$/i, (_, ou, n) => `${ou[0].toUpperCase() + ou.slice(1).toLowerCase()} ${n} Goals`)
    .replace(/\bgoals\b/g, 'Goals').trim()
}

// One session's singles slip → legs with everything the slip shows
export async function singles(run) {
  const html = await get(`/codes?slip=singles&s=${run}`)
  return html.split('<div class="fl4-leg">').slice(1).map(L => {
    const g = re => (L.match(re) || [])[1]
    const match = unesc(g(/class="fl4-leg-m"[^>]*>([\s\S]*?)<\/a>/))
    const [home, away] = match.split(/\s+vs\s+/)
    const meta = unesc(g(/class="fl4-leg-meta">([\s\S]*?)<\/div>/))
    const val = unesc(g(/class="fd-val">([\s\S]*?)<\/div>/))
    const ko = meta.match(new RegExp(`(?:${DOW}) (\\d{1,2}) (\\w{3}) \\d{4} (\\d\\d:\\d\\d)`))
    const ft = meta.match(/FT (\d+)\s*-\s*(\d+)/)
    return {
      mid: +g(/href="\/m\/(\d+)"/) || null, home, away,
      pick: cleanPick(unesc(g(/class="fl4-leg-p">([\s\S]*?)<\/div>/))),
      odds: Number(g(/class="fl4-leg-n"><b>([\d.]+)<\/b>/)),
      model: Number((val.match(/Us\s*([\d.]+)%/) || [])[1] ?? g(/class="fl4-leg-n"><b>[\d.]+<\/b><span>([\d.]+)%/)),
      book: Number((val.match(/Book\s*([\d.]+)%/) || [])[1]) || undefined,
      status: g(/class="fl4-mk ([a-z]+)"/) || '',
      competition: league(unesc((meta.match(/·\s*(?:[A-Z]{2,4}\s+)?([^·]+?)\s*·/) || [])[1] || '')),
      country: (unesc((meta.match(/·\s*(?:[A-Z]{2,4}\s+)?([^·]+?)\s*·/) || [])[1] || '').split(' - ')[0] || '').replace(/^International$/, '') || undefined,
      kickoff: ko ? ko[3] : undefined, day: ko ? isoDay(+ko[1], MONTHS[ko[2].toLowerCase()]) : undefined,
      score: ft ? `${ft[1]}-${ft[2]}` : undefined,
      read: unesc(g(/class="fl4-note">([\s\S]*?)<\/div>/)) || undefined,   // the app's own analysis line
    }
  }).filter(l => l.home && l.away)
}
