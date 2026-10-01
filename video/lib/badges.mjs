// Finds a picture for each team, with no input needed:
//  - national teams → their flag (public-domain flags from flagcdn.com, cached locally)
//  - clubs          → a cmvng-style shield badge drawn in the club's colours
//  - your own crest → put "crest_home" / "crest_away" (file path or URL) in the picks file.
//                     Only do this for crests you have permission to use.

import fs from 'node:fs'
import path from 'node:path'

const C = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// country name (as written by bookmakers / your app) → flagcdn code
const COUNTRY = {
  // Europe
  'albania': 'al', 'andorra': 'ad', 'armenia': 'am', 'austria': 'at', 'azerbaijan': 'az', 'belarus': 'by', 'belgium': 'be',
  'bosnia and herzegovina': 'ba', 'bosnia herzegovina': 'ba', 'bosnia': 'ba', 'bulgaria': 'bg', 'croatia': 'hr', 'cyprus': 'cy',
  'czechia': 'cz', 'czech republic': 'cz', 'denmark': 'dk', 'england': 'gb-eng', 'estonia': 'ee', 'faroe islands': 'fo', 'finland': 'fi',
  'france': 'fr', 'georgia': 'ge', 'germany': 'de', 'gibraltar': 'gi', 'greece': 'gr', 'hungary': 'hu', 'iceland': 'is',
  'ireland': 'ie', 'republic of ireland': 'ie', 'israel': 'il', 'italy': 'it', 'kazakhstan': 'kz', 'kosovo': 'xk', 'latvia': 'lv',
  'liechtenstein': 'li', 'lithuania': 'lt', 'luxembourg': 'lu', 'malta': 'mt', 'moldova': 'md', 'montenegro': 'me', 'netherlands': 'nl',
  'holland': 'nl', 'north macedonia': 'mk', 'macedonia': 'mk', 'northern ireland': 'gb-nir', 'norway': 'no', 'poland': 'pl',
  'portugal': 'pt', 'romania': 'ro', 'russia': 'ru', 'san marino': 'sm', 'scotland': 'gb-sct', 'serbia': 'rs', 'slovakia': 'sk',
  'slovenia': 'si', 'spain': 'es', 'sweden': 'se', 'switzerland': 'ch', 'turkey': 'tr', 'turkiye': 'tr', 'ukraine': 'ua', 'wales': 'gb-wls',
  // Africa
  'algeria': 'dz', 'angola': 'ao', 'benin': 'bj', 'botswana': 'bw', 'burkina faso': 'bf', 'burundi': 'bi', 'cameroon': 'cm',
  'cape verde': 'cv', 'cabo verde': 'cv', 'central african republic': 'cf', 'chad': 'td', 'comoros': 'km', 'congo': 'cg',
  'dr congo': 'cd', 'congo dr': 'cd', 'democratic republic of congo': 'cd', 'djibouti': 'dj', 'egypt': 'eg', 'equatorial guinea': 'gq',
  'eritrea': 'er', 'eswatini': 'sz', 'ethiopia': 'et', 'gabon': 'ga', 'gambia': 'gm', 'ghana': 'gh', 'guinea': 'gn', 'guinea bissau': 'gw',
  'ivory coast': 'ci', 'cote d ivoire': 'ci', 'kenya': 'ke', 'lesotho': 'ls', 'liberia': 'lr', 'libya': 'ly', 'madagascar': 'mg',
  'malawi': 'mw', 'mali': 'ml', 'mauritania': 'mr', 'mauritius': 'mu', 'morocco': 'ma', 'mozambique': 'mz', 'namibia': 'na',
  'niger': 'ne', 'nigeria': 'ng', 'rwanda': 'rw', 'sao tome and principe': 'st', 'senegal': 'sn', 'seychelles': 'sc',
  'sierra leone': 'sl', 'somalia': 'so', 'south africa': 'za', 'south sudan': 'ss', 'sudan': 'sd', 'tanzania': 'tz', 'togo': 'tg',
  'tunisia': 'tn', 'uganda': 'ug', 'zambia': 'zm', 'zimbabwe': 'zw',
  // Americas
  'argentina': 'ar', 'bolivia': 'bo', 'brazil': 'br', 'chile': 'cl', 'colombia': 'co', 'ecuador': 'ec', 'paraguay': 'py', 'peru': 'pe',
  'uruguay': 'uy', 'venezuela': 've', 'mexico': 'mx', 'usa': 'us', 'united states': 'us', 'canada': 'ca', 'costa rica': 'cr',
  'panama': 'pa', 'jamaica': 'jm', 'honduras': 'hn', 'el salvador': 'sv', 'guatemala': 'gt', 'haiti': 'ht', 'trinidad and tobago': 'tt',
  'curacao': 'cw', 'suriname': 'sr', 'guyana': 'gy', 'nicaragua': 'ni', 'cuba': 'cu', 'dominican republic': 'do', 'puerto rico': 'pr',
  'dominica': 'dm', 'grenada': 'gd', 'saint lucia': 'lc', 'st lucia': 'lc', 'saint kitts and nevis': 'kn', 'st kitts and nevis': 'kn',
  'saint vincent and the grenadines': 'vc', 'antigua and barbuda': 'ag', 'barbados': 'bb', 'bahamas': 'bs', 'bermuda': 'bm',
  'belize': 'bz', 'aruba': 'aw', 'montserrat': 'ms', 'cayman islands': 'ky', 'turks and caicos islands': 'tc',
  'virgin islands u s': 'vi', 'us virgin islands': 'vi', 'virgin islands british': 'vg', 'british virgin islands': 'vg', 'anguilla': 'ai',
  'martinique': 'mq', 'guadeloupe': 'gp', 'french guiana': 'gf', 'saint martin': 'mf', 'sint maarten': 'sx', 'bonaire': 'bq',
  // Asia & Oceania
  'japan': 'jp', 'korea republic': 'kr', 'south korea': 'kr', 'north korea': 'kp', 'korea dpr': 'kp', 'china': 'cn', 'china pr': 'cn',
  'australia': 'au', 'iran': 'ir', 'saudi arabia': 'sa', 'qatar': 'qa', 'united arab emirates': 'ae', 'uae': 'ae', 'iraq': 'iq',
  'jordan': 'jo', 'uzbekistan': 'uz', 'oman': 'om', 'bahrain': 'bh', 'kuwait': 'kw', 'syria': 'sy', 'lebanon': 'lb', 'palestine': 'ps',
  'india': 'in', 'thailand': 'th', 'vietnam': 'vn', 'indonesia': 'id', 'malaysia': 'my', 'philippines': 'ph', 'singapore': 'sg',
  'new zealand': 'nz', 'kyrgyzstan': 'kg', 'tajikistan': 'tj', 'turkmenistan': 'tm', 'hong kong': 'hk', 'chinese taipei': 'tw',
  'bangladesh': 'bd', 'nepal': 'np', 'sri lanka': 'lk', 'afghanistan': 'af', 'myanmar': 'mm', 'cambodia': 'kh', 'laos': 'la',
  'mongolia': 'mn', 'yemen': 'ye', 'fiji': 'fj', 'papua new guinea': 'pg', 'solomon islands': 'sb', 'new caledonia': 'nc',
  'tahiti': 'pf', 'vanuatu': 'vu', 'samoa': 'ws', 'tonga': 'to', 'guam': 'gu', 'maldives': 'mv', 'bhutan': 'bt', 'brunei': 'bn',
  'timor leste': 'tl', 'macau': 'mo', 'pakistan': 'pk',
}

// club → [short code, primary colour, secondary colour]
const CLUBS = {
  'arsenal': ['ARS', '#EF0107', '#FFFFFF'], 'aston villa': ['AVL', '#670E36', '#95BFE5'], 'bournemouth': ['BOU', '#DA291C', '#000000'],
  'brentford': ['BRE', '#E30613', '#FFFFFF'], 'brighton': ['BHA', '#0057B8', '#FFFFFF'], 'burnley': ['BUR', '#6C1D45', '#99D6EA'],
  'chelsea': ['CHE', '#034694', '#FFFFFF'], 'coventry': ['COV', '#59CBE8', '#FFFFFF'], 'crystal palace': ['CRY', '#1B458F', '#C4122E'],
  'everton': ['EVE', '#003399', '#FFFFFF'], 'fulham': ['FUL', '#FFFFFF', '#000000'], 'hull': ['HUL', '#F5A12D', '#000000'],
  'ipswich': ['IPS', '#3A64A3', '#FFFFFF'], 'leeds': ['LEE', '#FFFFFF', '#1D428A'], 'leicester': ['LEI', '#003090', '#FDBE11'],
  'liverpool': ['LIV', '#C8102E', '#F6EB61'], 'man city': ['MCI', '#6CABDD', '#FFFFFF'], 'manchester city': ['MCI', '#6CABDD', '#FFFFFF'],
  'man united': ['MUN', '#DA291C', '#FBE122'], 'manchester united': ['MUN', '#DA291C', '#FBE122'], 'newcastle': ['NEW', '#241F20', '#FFFFFF'],
  'nott m forest': ['NFO', '#DD0000', '#FFFFFF'], 'nottingham forest': ['NFO', '#DD0000', '#FFFFFF'], 'sunderland': ['SUN', '#EB172B', '#FFFFFF'],
  'tottenham': ['TOT', '#FFFFFF', '#132257'], 'west ham': ['WHU', '#7A263A', '#1BB1E7'], 'wolves': ['WOL', '#FDB913', '#231F20'],
  'southampton': ['SOU', '#D71920', '#FFFFFF'], 'west brom': ['WBA', '#122F67', '#FFFFFF'], 'norwich': ['NOR', '#FFF200', '#00A650'],
  'real madrid': ['RMA', '#FFFFFF', '#FEBE10'], 'barcelona': ['BAR', '#A50044', '#004D98'], 'ath madrid': ['ATM', '#CB3524', '#FFFFFF'],
  'atletico madrid': ['ATM', '#CB3524', '#FFFFFF'], 'sevilla': ['SEV', '#FFFFFF', '#D81E05'], 'betis': ['BET', '#00954C', '#FFFFFF'],
  'real betis': ['BET', '#00954C', '#FFFFFF'], 'sociedad': ['RSO', '#0067B1', '#FFFFFF'], 'real sociedad': ['RSO', '#0067B1', '#FFFFFF'],
  'villarreal': ['VIL', '#FFE667', '#005187'], 'valencia': ['VAL', '#FFFFFF', '#EE3524'], 'ath bilbao': ['ATH', '#EE2523', '#FFFFFF'],
  'athletic club': ['ATH', '#EE2523', '#FFFFFF'], 'bayern munich': ['FCB', '#DC052D', '#FFFFFF'], 'dortmund': ['BVB', '#FDE100', '#000000'],
  'leverkusen': ['B04', '#E32221', '#000000'], 'rb leipzig': ['RBL', '#DD0741', '#FFFFFF'], 'stuttgart': ['VFB', '#FFFFFF', '#E32219'],
  'ein frankfurt': ['SGE', '#E1000F', '#000000'], 'eintracht frankfurt': ['SGE', '#E1000F', '#000000'], 'inter': ['INT', '#0068A8', '#000000'],
  'milan': ['MIL', '#FB090B', '#000000'], 'ac milan': ['MIL', '#FB090B', '#000000'], 'juventus': ['JUV', '#FFFFFF', '#000000'],
  'napoli': ['NAP', '#12A0D7', '#FFFFFF'], 'roma': ['ROM', '#8E1F2F', '#F0BC42'], 'lazio': ['LAZ', '#87D8F7', '#FFFFFF'],
  'atalanta': ['ATA', '#1E71B8', '#000000'], 'fiorentina': ['FIO', '#482E92', '#FFFFFF'], 'paris sg': ['PSG', '#004170', '#DA291C'],
  'psg': ['PSG', '#004170', '#DA291C'], 'paris saint germain': ['PSG', '#004170', '#DA291C'], 'marseille': ['OM', '#2FAEE0', '#FFFFFF'],
  'lyon': ['OL', '#FFFFFF', '#DA0812'], 'monaco': ['ASM', '#E7182C', '#FFFFFF'], 'lille': ['LIL', '#E01E13', '#FFFFFF'],
  'lens': ['RCL', '#FFDD00', '#E30613'], 'benfica': ['SLB', '#E83030', '#FFFFFF'], 'porto': ['FCP', '#00428C', '#FFFFFF'],
  'sporting': ['SCP', '#008057', '#FFFFFF'], 'sp lisbon': ['SCP', '#008057', '#FFFFFF'], 'ajax': ['AJA', '#FFFFFF', '#D2122E'],
  'psv': ['PSV', '#ED1C24', '#FFFFFF'], 'psv eindhoven': ['PSV', '#ED1C24', '#FFFFFF'], 'feyenoord': ['FEY', '#FF0000', '#FFFFFF'],
  'celtic': ['CEL', '#018749', '#FFFFFF'], 'rangers': ['RAN', '#1B458F', '#FFFFFF'], 'galatasaray': ['GAL', '#A90432', '#FDB912'],
  'fenerbahce': ['FEN', '#002D72', '#FFED00'],
  // Nigeria / Ghana
  'enyimba': ['ENY', '#0A5C36', '#FFFFFF'], 'enugu rangers': ['RAN', '#C8102E', '#FFFFFF'], 'kano pillars': ['KAN', '#FFD700', '#0055A4'],
  'rivers united': ['RIV', '#003DA5', '#FFFFFF'], 'shooting stars': ['3SC', '#0047AB', '#FFFFFF'], 'remo stars': ['REM', '#0B3D91', '#FFD100'],
  'plateau united': ['PLU', '#E4002B', '#FFFFFF'], 'akwa united': ['AKW', '#009639', '#FFD100'], 'lobi stars': ['LOB', '#0047AB', '#FFFFFF'],
  'kwara united': ['KWA', '#0A6E3C', '#FFFFFF'], 'bendel insurance': ['BIN', '#E4002B', '#FFFFFF'], 'asante kotoko': ['KOT', '#D50000', '#FFFFFF'],
  'hearts of oak': ['HOA', '#B1121D', '#004B9B'],
}

function hashColour(name) {
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return [`hsl(${h % 360} 62% 42%)`, `hsl(${(h >> 8) % 360} 70% 88%)`]
}
const luminance = (hex) => {
  if (!hex.startsWith('#')) return 0.3
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function monogram(name) {
  const key = C(name)
  const club = CLUBS[key]
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(w => w && !/^(fc|cf|sc|ac|afc|cd|the)$/i.test(w))
  const code = club?.[0] || (words.length > 1 ? words.slice(0, 3).map(w => w[0]).join('') : (words[0] || name).slice(0, 3)).toUpperCase()
  const [c1, c2] = club ? [club[1], club[2]] : hashColour(key)
  const ink = luminance(c1) > 0.6 ? '#0F1B2D' : '#FFFFFF'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 230">
<defs><clipPath id="s"><path d="M100 6 L188 34 V112 C188 168 150 204 100 224 C50 204 12 168 12 112 V34 Z"/></clipPath>
<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<g clip-path="url(#s)"><rect width="200" height="230" fill="${c1}"/>
<g transform="skewX(-11) translate(36 0)" fill="${c2}" opacity=".9"><rect x="96" y="150" width="14" height="80"/><rect x="118" y="122" width="14" height="108"/><rect x="140" y="94" width="14" height="136"/></g>
<rect width="200" height="230" fill="url(#g)"/></g>
<path d="M100 6 L188 34 V112 C188 168 150 204 100 224 C50 204 12 168 12 112 V34 Z" fill="none" stroke="${c2}" stroke-width="7"/>
<text x="100" y="${code.length > 3 ? 112 : 118}" text-anchor="middle" font-family="Manrope" font-weight="800" font-size="${code.length > 3 ? 44 : 56}" letter-spacing="-2" fill="${ink}">${code}</text>
</svg>`
  // drawn inline (not as an image) so the code uses the page's Manrope font
  return { kind: 'shield', svg, colour: c1 }
}

async function fetchTo(url, file) {
  const r = await fetch(url, { headers: { 'User-Agent': 'cmvng-video/1.0' } })
  if (!r.ok) throw new Error(`${r.status} for ${url}`)
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()))
}

// Club crests: a large transparent PNG from TheSportsDB, checked to be the men's football club.
// Crests are the clubs' trademarks: the owner chose to show them, as the app does.
const SDB = 'https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t='
const CREST_ALIAS = {
  'tottenham': 'Tottenham Hotspur', 'spurs': 'Tottenham Hotspur', 'man city': 'Manchester City', 'man utd': 'Manchester United',
  'man united': 'Manchester United', 'wolves': 'Wolverhampton Wanderers', 'newcastle': 'Newcastle United', 'west ham': 'West Ham United',
  'brighton': 'Brighton and Hove Albion', 'leeds': 'Leeds United', 'nottm forest': 'Nottingham Forest', 'sheff utd': 'Sheffield United',
  'leicester': 'Leicester City', 'palace': 'Crystal Palace', 'villa': 'Aston Villa', 'inter': 'Inter Milan', 'psg': 'Paris SG',
  'atletico madrid': 'Atletico Madrid', 'bayern': 'Bayern Munich', 'dortmund': 'Borussia Dortmund', 'gladbach': 'Borussia Monchengladbach',
  'estudiantes de la plata': 'Estudiantes', 'ca platense': 'Platense', 'new york red bulls': 'New York Red Bulls',
  'saint louis city sc': 'St. Louis City', 'saint louis city': 'St. Louis City',
}
async function clubCrest(name, cacheDir) {
  const dir = path.join(cacheDir, 'crests'); fs.mkdirSync(dir, { recursive: true })
  const slug = C(name).replace(/ /g, '_'), meta = path.join(dir, `${slug}.json`)
  if (fs.existsSync(meta)) { const m = JSON.parse(fs.readFileSync(meta, 'utf8')); return m.file ? path.join(dir, m.file) : null }
  const strip = s => s.replace(/\b(F\.?C\.?|A\.?F\.?C\.?|C\.?F\.?|S\.?C\.?|CA|AC|CD|SD|FK|SK|IF)\b\.?/gi, '').replace(/\s+/g, ' ').trim()
  const tries = [...new Set([CREST_ALIAS[C(name)], name, strip(name)].filter(Boolean))]
  const want = C(strip(CREST_ALIAS[C(name)] || name))
  for (const q of tries) {
    try {
      const r = await fetch(SDB + encodeURIComponent(q), { headers: { 'User-Agent': 'cmvng-video/1.0' } })
      if (!r.ok) continue
      const teams = (await r.json())?.teams || []
      const t = teams.find(t => t.strSport === 'Soccer' && !/women|ladies|femen|u\d\d|youth|reserve|\bii\b|\bb\b/i.test(t.strTeam) && t.strBadge
        && (C(t.strTeam).includes(want.split(' ')[0]) || want.includes(C(t.strTeam).split(' ')[0])))
      if (!t) continue
      const file = `${slug}.png`
      await fetchTo(t.strBadge, path.join(dir, file))
      fs.writeFileSync(meta, JSON.stringify({ file, team: t.strTeam, url: t.strBadge }))
      return path.join(dir, file)
    } catch {}
  }
  fs.writeFileSync(meta, JSON.stringify({ file: null }))
  return null
}

export async function resolveBadge(name, crest, cacheDir, outDir) {
  fs.mkdirSync(cacheDir, { recursive: true }); fs.mkdirSync(outDir, { recursive: true })
  if (crest) {
    const ext = path.extname(crest.split('?')[0]) || '.png'
    const file = path.join(outDir, `crest_${C(name).replace(/ /g, '_')}${ext}`)
    if (/^https?:/.test(crest)) await fetchTo(crest, file); else fs.copyFileSync(crest, file)
    return { kind: 'crest', src: path.basename(file), colour: '#1F5FDB' }
  }
  const code = COUNTRY[C(name)]
  if (code) {
    const cached = path.join(cacheDir, `flag_${code}.png`)
    try {
      if (!fs.existsSync(cached)) await fetchTo(`https://flagcdn.com/w640/${code}.png`, cached)
      fs.copyFileSync(cached, path.join(outDir, `flag_${code}.png`))
      return { kind: 'flag', src: `flag_${code}.png`, colour: '#1F5FDB' }
    } catch (e) {
      console.warn(`  ! could not get the flag for ${name} (${e.message}); using a badge instead`)
    }
  }
  if (crest !== false) {
    const f = await clubCrest(name, cacheDir)
    if (f) {
      fs.copyFileSync(f, path.join(outDir, path.basename(f)))
      return { kind: 'crest', src: path.basename(f), colour: CLUBS[C(name)]?.[1] || '#1F5FDB' }
    }
  }
  return monogram(name)
}

export const isCountry = (name) => Boolean(COUNTRY[C(name)])
