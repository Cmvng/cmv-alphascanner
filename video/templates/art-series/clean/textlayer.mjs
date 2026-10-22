// renders the text layer of a clean-cut spec as transparent PNG frames: node textlayer.mjs spec.json outdir
import path from 'node:path'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'
const [specPath, out] = process.argv.slice(2)
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'))
const req = createRequire('/home/user/cmv-alphascanner/video/make-cover.mjs')
let chromium
for (const p of ['playwright', path.join(execSync('npm root -g').toString().trim(), 'playwright')]) { try { ({ chromium } = req(p)); break } catch {} }
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
page.on('pageerror', e => console.error('page error:', e.message))
await page.goto('file://' + path.join(path.dirname(new URL(import.meta.url).pathname), 'textlayer.html'))
await page.evaluate(s => window.setSpec(s), spec)
fs.mkdirSync(out, { recursive: true })
const N = Math.round(spec.total * 30)
// frames are only re-captured when the visible text changes
let last = null, lastFile = null
for (let f = 0; f < N; f++) {
  const t = f / 30
  const key = JSON.stringify(spec.text.map(x => { const fd = x.fade ?? 0.08; return t < x.t0 || t >= x.t1 ? 0 : Math.min(1, (t - x.t0) / fd, (x.t1 - t) / fd).toFixed(3) }))
  const file = path.join(out, String(f).padStart(5, '0') + '.png')
  if (key === last) { fs.copyFileSync(lastFile, file); continue }
  await page.evaluate(t => window.seek(t), t)
  await page.screenshot({ path: file, omitBackground: true })
  last = key; lastFile = file
}
console.log('frames', N)
await browser.close()
