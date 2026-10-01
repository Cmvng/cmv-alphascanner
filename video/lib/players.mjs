// "Players" style: real match photos of the home team behind each pick, from Wikimedia Commons.
//
//   team → Wikidata (its Commons category) → "Matches of <team>" → the most recent match categories → action photos
//
// Like the stadium photos, each comes with author and licence for the on-screen credit. Cached in .cache/players.
// Broadcast footage and agency photos (Getty etc.) are never used: they're copyrighted and get videos taken down.

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { getJSON, findTeam, claims, val, best, commonsPhoto } from './stadium.mjs'

const C = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const API = 'https://commons.wikimedia.org/w/api.php?format=json&action=query&'
const BAD = /logo|crest|badge|emblem|\bkit\b|\.svg|\.png|map\b|stadium|ticket|shirt|jersey|flag|scarf|stamp|coin|poster|programme|trophy|\bbus\b|banner|tifo|women|female|u-?\d\d\b|youth|press|conference|fans?\b|supporters|signing|portrait|museum/i

async function members(cat, type, limit = 200) {
  const d = await getJSON(`${API}list=categorymembers&cmtype=${type}&cmlimit=${limit}&cmtitle=${encodeURIComponent('Category:' + cat)}`)
  return d?.query?.categorymembers || []
}
const yearOf = s => +((s.match(/\b(19|20)\d\d\b/) || [])[0] || 0)

async function candidates(team, national, country) {
  const t = await findTeam(team, national, country)
  if (!t) return []
  const cat = val(best((await claims(t.id)).claims.P373))
  if (!cat) return []
  const subs = (await members(cat, 'subcat')).map(m => m.title.replace(/^Category:/, ''))
  // The squad list: every player has a photo category of their own, so a photo from it shows the team's player
  // (a match category would also hold the other side's players).
  const playersCat = subs.find(s => /^players of/i.test(s) && !/under-?\d|women/i.test(s))
  if (!playersCat) return []
  const people = (await members(playersCat, 'subcat', 500)).map(m => m.title.replace(/^Category:/, ''))
  // a photo counts when its name says it's with this team (country / club words) or it's recent (2022+)
  const words = C(team).split(' ').filter(w => w.length >= 4)
  const forTeam = f => { const c = C(f); return words.some(w => c.includes(w)) && yearOf(f) >= 2016 }   // named for this team, and not too old
  const out = []
  for (const person of people.slice(-60).reverse()) {            // the list's end is usually the newer players
    const files = (await members(person, 'file', 40)).map(m => m.title.replace(/^File:/, ''))
      .filter(f => /\.jpe?g$/i.test(f) && !BAD.test(f) && forTeam(f))
    if (files.length) out.push({ file: files.sort((x, y) => yearOf(y) - yearOf(x))[0], match: person.replace(/\s*\(.*\)$/, ''), who: person })
    if (out.length >= 12) break
  }
  return out
}

// → up to `count` [{ src, credit }] copied into outDir, or [] (then the stadium is used)
export async function resolvePlayers(team, { national, country, cacheDir, outDir, count = 3 }) {
  const dir = path.join(cacheDir, 'players'); fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(outDir, { recursive: true })
  const slug = C(team).replace(/ /g, '_') || 'team', meta = path.join(dir, `${slug}.json`)
  // your own photos first: video/photos/<team>/ (e.g. video/photos/germany/*.jpg). Use only photos you own or licensed.
  const own = path.join(path.dirname(cacheDir), 'photos', slug)
  if (fs.existsSync(own)) {
    const files = fs.readdirSync(own).filter(f => /\.(jpe?g|png|webp)$/i.test(f)).sort().slice(0, count)
    if (files.length) return files.map(f => { fs.copyFileSync(path.join(own, f), path.join(outDir, `own_${slug}_${f}`)); return { src: `own_${slug}_${f}`, credit: '' } })
  }
  let list = fs.existsSync(meta) ? JSON.parse(fs.readFileSync(meta, 'utf8')) : null
  if (!list) {
    list = []
    try {
      const seenMatch = new Map()
      for (const c of await candidates(team, national, country)) {
        if ((seenMatch.get(c.match) || 0) >= 2 || list.some(x => x.who === c.who)) continue   // different matches, different players
        const ph = await commonsPhoto(c.file)
        if (!ph || ph.width < 1600 || ph.height < 1000 || ph.width < ph.height) continue
        const n = list.length + 1, orig = path.join(dir, `${slug}_${n}_orig.jpg`), file = `${slug}_${n}.jpg`
        const r = await fetch(ph.url, { headers: { 'User-Agent': 'cmvng-video/1.0 (https://cmvngpicks.com)' } })
        if (!r.ok) continue
        fs.writeFileSync(orig, Buffer.from(await r.arrayBuffer()))
        const ok = spawnSync(process.env.FFMPEG || 'ffmpeg', ['-y', '-loglevel', 'error', '-i', orig, '-vf', "scale=-2:'min(2400,ih)'", '-q:v', '3', path.join(dir, file)]).status === 0
        if (ok) fs.rmSync(orig); else fs.renameSync(orig, path.join(dir, file))
        list.push({ file, author: ph.author, licence: ph.licence, match: c.match, who: c.who })
        seenMatch.set(c.match, (seenMatch.get(c.match) || 0) + 1)
        if (list.length >= count) break
      }
    } catch (e) {
      console.warn(`  ! player photos for ${team}: ${e.message}`)
      return []                                                     // not cached: retried next time
    }
    fs.writeFileSync(meta, JSON.stringify(list, null, 1))
  }
  return list.map(x => {
    fs.copyFileSync(path.join(dir, x.file), path.join(outDir, x.file))
    const lic = /public domain|cc0|pd/i.test(x.licence) ? '' : ` · ${x.licence}`
    return { src: x.file, credit: `${x.match} · Photo: ${x.author || 'Wikimedia Commons'}${lic}` }
  })
}
