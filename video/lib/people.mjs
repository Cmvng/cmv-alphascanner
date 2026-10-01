// Photo of a named player for the "players to watch" card: Wikidata (the footballer) → his photo on
// Wikimedia Commons, with author and licence for the credit line. Cached in .cache/people.
// No agency photos (Getty etc.): if a player has no free photo, the card shows the team's crest instead.

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { getJSON, claims, val, best, commonsPhoto } from './stadium.mjs'

const C = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export async function resolvePerson(name, { cacheDir, outDir }) {
  const dir = path.join(cacheDir, 'people'); fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(outDir, { recursive: true })
  const slug = C(name).replace(/ /g, '_'), meta = path.join(dir, `${slug}.json`)
  let info = fs.existsSync(meta) ? JSON.parse(fs.readFileSync(meta, 'utf8')) : null
  if (!info) {
    info = { none: true }
    try {
      const res = (await getJSON(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=6&search=${encodeURIComponent(name)}`)).search
      const hit = res.find(r => /footballer|football player|soccer player/i.test(r.description || ''))
      const file = hit && val(best((await claims(hit.id)).claims.P18))
      const ph = file && await commonsPhoto(file)
      if (ph && ph.width >= 400) {
        const orig = path.join(dir, `${slug}_orig${path.extname(new URL(ph.url).pathname) || '.jpg'}`)
        const r = await fetch(ph.url, { headers: { 'User-Agent': 'cmvng-video/1.0 (https://cmvngpicks.com)' } })
        if (r.ok) {
          fs.writeFileSync(orig, Buffer.from(await r.arrayBuffer()))
          const ok = spawnSync(process.env.FFMPEG || 'ffmpeg', ['-y', '-loglevel', 'error', '-i', orig, '-vf', "scale=-2:'min(900,ih)'", '-q:v', '3', path.join(dir, slug + '.jpg')]).status === 0
          if (ok) fs.rmSync(orig); else fs.renameSync(orig, path.join(dir, slug + '.jpg'))
          info = { file: slug + '.jpg', author: ph.author, licence: ph.licence }
        }
      }
    } catch (e) {
      console.warn(`  ! photo of ${name}: ${e.message}`)
      return null
    }
    fs.writeFileSync(meta, JSON.stringify(info))
  }
  if (info.none) return null
  fs.copyFileSync(path.join(dir, info.file), path.join(outDir, `p_${info.file}`))
  const lic = /public domain|cc0|pd/i.test(info.licence) ? '' : ` · ${info.licence}`
  return { src: `p_${info.file}`, credit: `${name} · Photo: ${info.author || 'Wikimedia Commons'}${lic}` }
}
