// Cover / thumbnail for a rendered video: a vertical cover (1080×1920, TikTok/Reels/X) and a YouTube thumbnail
// (1280×720), from the video's own data (crests, kit colours, cities) and the cfg's `cover` block.
//   node video/make-cover.mjs video/out/<slug>.json        (after the video has rendered: reads video/out/<slug>/index.html)
// cover: { kicker, l1, l2, tag (html), feature: [match index, …], more, rot: [lon, lat], sun_at: "HH:MM" }
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const file = process.argv[2]
if (!file) { console.error('Usage: node video/make-cover.mjs video/out/<slug>.json'); process.exit(1) }
const cfg = JSON.parse(fs.readFileSync(file, 'utf8')), slug = path.basename(file, '.json'), OUT = path.resolve(path.dirname(file), slug)
const idx = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8')
const m = idx.match(/<script>window\.DATA=([\s\S]*?)<\/script>/)
if (!m) { console.error(`No video data in ${OUT}/index.html: render the video first`); process.exit(2) }
const geo = ['d3-array.min.js', 'd3-geo.min.js', 'topojson-client.min.js', 'land-50m.js', 'countries-110m.js'].map(f => `<script src="assets/geo/${f}"></script>`).join('\n')
const tpl = fs.readFileSync(path.join(DIR, 'cover.html'), 'utf8')
const req = createRequire(import.meta.url)
let chromium
for (const p of [process.env.PLAYWRIGHT_PATH, 'playwright', path.join(execSync('npm root -g').toString().trim(), 'playwright')]) { if (!p) continue; try { ({ chromium } = req(p)); break } catch {} }
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
for (const [format, w, h, name] of [['vertical', 1080, 1920, `${slug}_cover.png`], ['youtube', 1280, 720, `${slug}_thumbnail.png`]]) {
  const page = tpl.replace('<script>\nconst D = window.DATA', `${geo}\n<script>window.DATA=${m[1]};window.COVER=${JSON.stringify({ ...(cfg.cover || {}), format }).replace(/</g, '\\u003c')}</script>\n<script>\nconst D = window.DATA`)
  const f = path.join(OUT, `cover-${format}.html`); fs.writeFileSync(f, page)
  const pg = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  pg.on('pageerror', e => console.error('  page error:', e.message))
  await pg.goto('file://' + f); await pg.evaluate(() => window.ready)
  await pg.screenshot({ path: path.join(OUT, name), clip: { x: 0, y: 0, width: w, height: h } })
  console.log(`COVER ${path.join(OUT, name)}`)
  await pg.close()
}
await browser.close()
