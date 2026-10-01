// Real action photos of a national team's players for the "highlights" background of the reaction videos:
// Wikimedia Commons photos from the team's 2026 World Cup matches (WikiPortraits and others), free licences only,
// each with its author and licence for the credit line. Broadcast footage and agency photos are never used.
//
//   resolveTeamPhotos('Portugal', { names: ['Bruno Fernandes', 'Vitinha', ...], cacheDir, outDir, count: 6 })
//   → [{ src, credit }]  (copied into outDir), or [] when the team has none (then the stadium is used)

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { getJSON, commonsPhoto } from './stadium.mjs'

const API = 'https://commons.wikimedia.org/w/api.php?format=json&action=query&'
const C = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ø/g, 'o').replace(/[^a-z0-9]+/g, ' ').trim()
const SKIP = /supporter|fan ?fest|ceremony|venue|stadium|logo|map|art\b|bus\b|flag|bandera|scoreboard|screen|brewing|watch|party|mural|ticket|crowd|cropped/i

async function members(cat) {
  const d = await getJSON(`${API}list=categorymembers&cmtype=file|subcat&cmlimit=500&cmtitle=${encodeURIComponent('Category:' + cat)}`)
  return (d?.query?.categorymembers || []).map(x => x.title)
}
async function walk(cat, depth, out, seen) {
  if (seen.has(cat) || depth < 0) return
  seen.add(cat)
  for (const t of await members(cat)) {
    if (t.startsWith('File:') && /\.jpe?g$/i.test(t)) out.add(t.slice(5))
    else if (t.startsWith('Category:') && !SKIP.test(t)) await walk(t.slice(9), depth - 1, out, seen)
  }
}

export async function resolveTeamPhotos(team, { names = [], cacheDir, outDir, count = 6 }) {
  const dir = path.join(cacheDir, 'teamphotos'); fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(outDir, { recursive: true })
  const slug = C(team).replace(/ /g, '_'), meta = path.join(dir, `${slug}.json`)
  let list = fs.existsSync(meta) ? JSON.parse(fs.readFileSync(meta, 'utf8')) : null
  if (!list) {
    list = []
    try {
      const files = new Set()
      await walk(`Matches of ${team === 'Netherlands' ? 'the Netherlands' : team} at the 2026 FIFA World Cup`, 2, files, new Set())
      // only this team's own players (the name leads the file name), one photo per player first, then more
      const keys = names.map(n => [n, C(n).split(' ').pop()])
      const cands = [...files].filter(f => !SKIP.test(f)).map(f => ({ f, who: keys.find(([, k]) => C(f).split(' ').slice(0, 4).includes(k))?.[0] })).filter(x => x.who)
      const order = []; const used = new Set()
      for (const x of cands) if (!used.has(x.who)) { used.add(x.who); order.push(x) }
      for (const x of cands) if (!order.includes(x)) order.push(x)
      // files not named by player ("Netherlands v Tunisia 2026 World Cup - 553….jpg"): the team's own match photos
      if (order.length < count) for (const f of [...files].filter(f => !SKIP.test(f) && C(f).includes(C(team)))) if (!order.some(x => x.f === f)) order.push({ f, who: team })
      for (const x of order) {
        if (list.length >= count) break
        const ph = await commonsPhoto(x.f)
        if (!ph || ph.width < 1200 || /\bnc\b|\bnd\b|non-?commercial|no ?deriv/i.test(ph.licence || '')) continue
        const file = `${slug}_${list.length + 1}.jpg`, orig = path.join(dir, file + '.orig')
        const r = await fetch(ph.url, { headers: { 'User-Agent': 'cmvng-video/1.0 (https://cmvngpicks.com; video tool)' } })
        if (!r.ok) continue
        fs.writeFileSync(orig, Buffer.from(await r.arrayBuffer()))
        const ok = spawnSync(process.env.FFMPEG || 'ffmpeg', ['-y', '-loglevel', 'error', '-i', orig, '-vf', "scale='min(2000,iw)':-2", '-q:v', '3', path.join(dir, file)]).status === 0
        if (ok) fs.rmSync(orig); else fs.renameSync(orig, path.join(dir, file))
        list.push({ file, who: x.who, author: ph.author, licence: ph.licence, title: x.f })
      }
    } catch (e) {
      console.warn(`  ! World Cup photos for ${team}: ${e.message}`)
      return []
    }
    fs.writeFileSync(meta, JSON.stringify(list, null, 1))
  }
  return list.map(x => {
    fs.copyFileSync(path.join(dir, x.file), path.join(outDir, x.file))
    const lic = /public domain|cc0|pd/i.test(x.licence || '') ? '' : ` · ${x.licence}`
    return { src: x.file, credit: `${x.who}, 2026 World Cup · Photo: ${x.author || 'Wikimedia Commons'}${lic}` }
  })
}
