// renders the hype cut's text layer as transparent 1920x1080 PNG frames: node textlayer16.mjs <text.json> <out dir>
// text.json: {"total": 48, "fps": 30, "items": [{"k": "word"|"line"|"small"|"title"|"end", "t0", "t1", "text", ...}]}
// Only frames whose look changes are captured; the rest are hard links to the last one. Frames with nothing on them
// are not written at all (hype.py treats a missing frame as no text).
import path from 'node:path'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const [specPath, out] = process.argv.slice(2)
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'))
const require = createRequire(import.meta.url)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
page.on('pageerror', e => console.error('page error:', e.message))
await page.goto('file://' + path.join(path.dirname(new URL(import.meta.url).pathname), 'textlayer16.html'))
await page.evaluate(s => window.setSpec(s), spec)
fs.mkdirSync(out, { recursive: true })
for (const f of fs.readdirSync(out)) if (f.endsWith('.png')) fs.unlinkSync(path.join(out, f))
const FPS = spec.fps || 30, N = Math.round(spec.total * FPS)
let last = null, lastFile = null, shots = 0
for (let f = 0; f < N; f++) {
  const t = f / FPS
  if (!spec.items.some(x => t >= x.t0 && t < x.t1)) { last = null; continue }
  const sig = await page.evaluate(t => window.seek(t), t)
  const file = path.join(out, String(f).padStart(5, '0') + '.png')
  if (sig === last) { fs.linkSync(lastFile, file); continue }
  await page.screenshot({ path: file, omitBackground: true }); shots++
  last = sig; lastFile = file
}
console.log('frames', N, 'captured', shots)
await browser.close()
