// Finds a real photo of the home team's stadium for each match background.
//
//   team name → Wikidata (the team's "home venue") → the venue's photo on Wikimedia Commons
//
// Every photo comes with its author and licence (most are CC BY or CC BY-SA), which the video
// shows as a small credit line: that credit is what the licence asks for. Results are cached in
// video/.cache/stadiums so each team is looked up once.
// Your own picture always wins: put "stadium" (file or URL) on a pick, plus "stadium_credit".

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const UA = { 'User-Agent': 'cmvng-video/1.0 (https://cmvngpicks.com; video tool)' }
const C = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// short names bookmakers use → what Wikidata calls the club
const ALIAS = {
  'man city': 'Manchester City F.C.', 'man utd': 'Manchester United F.C.', 'man united': 'Manchester United F.C.',
  'spurs': 'Tottenham Hotspur F.C.', 'tottenham': 'Tottenham Hotspur F.C.', 'wolves': 'Wolverhampton Wanderers F.C.',
  'newcastle': 'Newcastle United F.C.', 'west ham': 'West Ham United F.C.', 'brighton': 'Brighton & Hove Albion F.C.',
  'leeds': 'Leeds United F.C.', 'nottm forest': 'Nottingham Forest F.C.', "nott'm forest": 'Nottingham Forest F.C.',
  'forest': 'Nottingham Forest F.C.', 'sheff utd': 'Sheffield United F.C.', 'leicester': 'Leicester City F.C.',
  'bournemouth': 'AFC Bournemouth', 'palace': 'Crystal Palace F.C.', 'villa': 'Aston Villa F.C.', 'sunderland': 'Sunderland A.F.C.',
  'inter': 'Inter Milan', 'milan': 'AC Milan', 'psg': 'Paris Saint-Germain F.C.', 'atletico': 'Atlético Madrid',
  'atletico madrid': 'Atlético Madrid', 'bayern': 'FC Bayern Munich', 'dortmund': 'Borussia Dortmund',
  'leverkusen': 'Bayer 04 Leverkusen', 'gladbach': 'Borussia Mönchengladbach', 'real': 'Real Madrid CF', 'barca': 'FC Barcelona',
}

export async function getJSON(url) {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, { headers: UA })
    if (r.status === 429) { await sleep(1000 * (+r.headers.get('retry-after') || 5) * 1.5 ** i); continue }
    if (!r.ok) throw new Error(`${r.status} for ${url}`)
    await sleep(300)                                       // be polite: Wikimedia rate-limits shared servers
    return r.json()
  }
  throw new Error('Wikimedia is rate-limiting this connection; try again in a minute')
}

export const claims = async (id) => (await getJSON(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`)).entities[id]
export const val = (c) => c?.mainsnak?.datavalue?.value
export const best = (list = []) => (list.find(c => c.rank === 'preferred') || list.find(c => c.rank !== 'deprecated'))

// the league's country, as Wikidata descriptions write it ("Argentine football club", "club in Buenos Aires, Argentina")
const DEMONYM = { argentina: 'argentin', uruguay: 'uruguay', brazil: 'brazil', usa: 'united states|american', england: 'english|england',
  spain: 'spanish|spain', italy: 'italian|italy', germany: 'german', france: 'french|france', norway: 'norw', nigeria: 'nigeria',
  netherlands: 'dutch|netherlands', portugal: 'portug', scotland: 'scottish|scotland', mexico: 'mexic', ghana: 'ghana' }
export async function findTeam(name, national, country) {
  const q = national ? `${name} national football team` : (ALIAS[C(name)] || name)
  const res = (await getJSON(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=8&search=${encodeURIComponent(q)}`)).search
  const ok = (d = '') => /football|soccer/i.test(d) && !/women|female|youth|under-?\d|u-?\d\d|reserve|season|futsal|beach|olympic|b team|academy/i.test(d)
  const cands = res.filter(r => ok(r.description) && (!national || /national|representing/i.test(r.description)))
  if (country && !national) {
    const re = new RegExp(DEMONYM[C(country)] || C(country), 'i')
    // many clubs are multi-sport ("Argentine sports club"); a club from another country is the wrong club
    const club = d => (ok(d) || /sports club|athletic club|\bclub\b/i.test(d)) && !/women|basketball|volleyball|rugby|handball|season|league/i.test(d)
    return res.find(r => club(r.description || '') && re.test(r.description || '')) || null
  }
  return cands[0] || null
}

async function sparql(q) {
  const d = await getJSON('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q))
  return d.results.bindings
}

// stadiums that list the team as a tenant, else the country's biggest stadiums (national teams rarely have one home)
async function venuesFor(teamId, countryId) {
  const fileOf = (b) => decodeURIComponent(b.img.value.split('/Special:FilePath/')[1] || '')
  const ask = async (where) => (await sparql(`SELECT ?s ?sLabel ?cap ?img WHERE { ${where} ?s wdt:P18 ?img . OPTIONAL { ?s wdt:P1083 ?cap }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } ORDER BY DESC(xsd:integer(?cap)) LIMIT 4`))
    .map(b => ({ label: b.sLabel.value, file: fileOf(b) }))
  let v = await ask(`?s wdt:P466 wd:${teamId} .`)
  if (!v.length && countryId) v = await ask(`?s wdt:P31/wdt:P279* wd:Q483110 ; wdt:P17 wd:${countryId} ; wdt:P1083 ?c . FILTER(?c > 20000)`)
  return v
}

// a big landscape photo of the venue on Commons, for when its main photo is too small
async function searchCommons(venue) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch=${encodeURIComponent(venue + ' filetype:bitmap')}&prop=imageinfo&iiprop=size`
  const pages = Object.values((await getJSON(u)).query?.pages || {}).sort((a, b) => a.index - b.index)
  const p = pages.find(p => { const i = p.imageinfo?.[0]; return i && i.width >= 2000 && i.height >= 1300 && i.width >= i.height })
  return p ? p.title.replace(/^File:/, '') : null
}

export async function commonsPhoto(file) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=2600&titles=${encodeURIComponent('File:' + file)}`
  const page = Object.values((await getJSON(u)).query.pages)[0]
  const ii = page?.imageinfo?.[0]
  if (!ii) return null
  const m = ii.extmetadata || {}
  const strip = (h = '') => String(h).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  return {
    url: ii.thumburl || ii.url, width: Math.min(ii.width, ii.thumbwidth || ii.width), height: Math.min(ii.height, ii.thumbheight || ii.height),
    author: strip(m.Artist?.value).slice(0, 60), licence: strip(m.LicenseShortName?.value), page: ii.descriptionurl,
  }
}

// → { src, credit, venue } or null. src is copied into outDir.
export async function resolveStadium(team, { national, country, cacheDir, outDir, own, ownCredit }) {
  fs.mkdirSync(outDir, { recursive: true })
  if (own) {
    const ext = path.extname(own.split('?')[0]) || '.jpg', file = `stadium_${C(team).replace(/ /g, '_')}${ext}`
    if (/^https?:/.test(own)) fs.writeFileSync(path.join(outDir, file), Buffer.from(await (await fetch(own, { headers: UA })).arrayBuffer()))
    else fs.copyFileSync(own, path.join(outDir, file))
    return { src: file, credit: ownCredit || '', venue: '' }
  }
  const dir = path.join(cacheDir, 'stadiums'); fs.mkdirSync(dir, { recursive: true })
  const slug = C(team).replace(/ /g, '_') || 'team', meta = path.join(dir, `${slug}.json`)
  let info = fs.existsSync(meta) ? JSON.parse(fs.readFileSync(meta, 'utf8')) : null
  if (!info) {
    info = { none: true }
    try {
      const t = await findTeam(team, national, country)
      if (t) {
        const tc = (await claims(t.id)).claims
        const venueId = val(best(tc.P115))?.id
        let venue = null
        if (venueId) {
          const v = await claims(venueId)
          venue = { label: v.labels?.en?.value || '', file: val(best(v.claims.P18)) }
        } else {
          venue = (await venuesFor(t.id, val(best(tc.P17))?.id || val(best(tc.P1532))?.id))[0] || null
        }
        let photo = venue?.file && await commonsPhoto(venue.file)
        if (venue && !(photo && photo.width >= 1800 && photo.height >= 1200)) {
          const alt = await searchCommons(venue.label)
          if (alt) photo = await commonsPhoto(alt)
        }
        if (photo && photo.width >= 1200) {
          const ext = path.extname(new URL(photo.url).pathname).toLowerCase() || '.jpg'
          const r = await fetch(photo.url, { headers: UA })
          if (r.ok) {
            const orig = path.join(dir, slug + '_orig' + ext)
            fs.writeFileSync(orig, Buffer.from(await r.arrayBuffer()))
            // 2400 px tall is plenty for a 1920 px frame with the slow zoom, and renders much faster
            const ok = spawnSync(process.env.FFMPEG || 'ffmpeg', ['-y', '-loglevel', 'error', '-i', orig, '-vf', "scale=-2:'min(2400,ih)'", '-q:v', '3', path.join(dir, slug + '.jpg')]).status === 0
            if (ok) fs.rmSync(orig); else fs.renameSync(orig, path.join(dir, slug + '.jpg'))
            info = { file: slug + '.jpg', venue: venue.label, author: photo.author, licence: photo.licence, page: photo.page }
          }
        }
      }
    } catch (e) {
      console.warn(`  ! stadium photo for ${team}: ${e.message}`)
      return null                                          // not cached, so it's retried next time
    }
    fs.writeFileSync(meta, JSON.stringify(info, null, 1))
  }
  if (info.none) return null
  fs.copyFileSync(path.join(dir, info.file), path.join(outDir, info.file))
  const lic = /public domain|cc0|pd/i.test(info.licence) ? '' : ` · ${info.licence}`
  return { src: info.file, venue: info.venue, credit: `${info.venue} · Photo: ${info.author || 'Wikimedia Commons'}${lic}` }
}
