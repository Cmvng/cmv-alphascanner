// Determinism check for a render(t) page (14 Nov motion study, after Motion's motion-reviewer and the Remotion skills):
// every frame must be a pure function of t. Renders a set of times forward, then backward and shuffled in a fresh page,
// and compares the pictures pixel for pixel. A difference means something animates on its own (a CSS transition or
// @keyframes, requestAnimationFrame, a timer, Date.now, Math.random, an unseeked library) and frames will come out
// wrong in the parallel render. Also lists the usual culprits found in the page source.
//   node video/lib/determinism.mjs <page.html> [t0,t1,...]      (default: 24 times across the first 60 s)
// A small difference on a scaled image's edges (a big logo shown small) is Chromium decoding the image at the size it
// was first drawn at: pre-scale such images to about twice their shown size and the difference goes away.
import { createRequire } from 'module'
import fs from 'fs'
import { png2rgb } from './png.mjs'
const require = createRequire(import.meta.url)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const [page_, list] = process.argv.slice(2)
const ts = list ? list.split(',').map(Number) : [...Array(24)].map((_, i) => +(i * 2.5 + .37).toFixed(2))
const src = fs.readFileSync(page_, 'utf8')
const SMELLS = [[/transition\s*:/, 'CSS transition'], [/@keyframes|animation\s*:/, 'CSS animation'], [/requestAnimationFrame/, 'requestAnimationFrame'],
  [/setTimeout|setInterval/, 'timer'], [/Date\.now|performance\.now|new Date\(/, 'wall clock'], [/Math\.random/, 'Math.random (unseeded)'], [/\.animate\(/, 'element.animate()']]
for (const [re, what] of SMELLS) if (re.test(src)) console.log(`look at: ${what} appears in the page source`)
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
async function pass(order) {
  const p = await b.newPage({ viewport: { width: +(process.env.VIEW_W || 1920), height: +(process.env.VIEW_H || 1080) } })
  await p.goto('file://' + page_); await p.evaluate(() => window.READY)
  const shots = {}
  for (const t of order) { await p.evaluate(t => window.render(t), t); shots[t] = await p.screenshot({ type: 'png' }) }
  await p.close(); return shots
}
const fwd = await pass(ts), back = await pass([...ts].reverse())
const mix = await pass([...ts].sort((a, b) => Math.sin(a * 91.7) - Math.sin(b * 91.7)))
let bad = 0
const W = +(process.env.VIEW_W || 1920)
function where(x, y) { const a = png2rgb(x), c = png2rgb(y); let n = 0, mx = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1
  for (let i = 0; i < a.length; i += 3) { const d = Math.max(Math.abs(a[i] - c[i]), Math.abs(a[i + 1] - c[i + 1]), Math.abs(a[i + 2] - c[i + 2])); if (!d) continue
    n++; mx = Math.max(mx, d); const p = i / 3, px = p % W, py = (p / W) | 0; x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py) }
  return { mx, txt: `${n} px differ (max ${mx} levels) in x ${x0}-${x1}, y ${y0}-${y1}` } }
// up to 24 levels on edges is Chromium's compositor (anti-aliasing that depends on what was drawn before): invisible in
// the video. More than that is the page itself (an image decoded at another size, state left over from another frame).
let noise = 0
for (const t of ts) { for (const [o, s] of [['backward', back], ['shuffled', mix]]) if (!fwd[t].equals(s[t])) { const w = where(fwd[t], s[t])
  if (w.mx > 24) { bad++; console.log(`DIFFERS at t=${t} (${o}): ${w.txt}`) } else { noise++; console.log(`edge noise at t=${t} (${o}): ${w.txt}`) } break } }
await b.close()
console.log(bad ? `${bad} of ${ts.length} frames depend on the order they were drawn in: fix before rendering` : `all ${ts.length} frames match in forward, backward and shuffled order` + (noise ? ` (${noise} with edge noise of 24 levels or less, invisible)` : ''))
process.exit(bad ? 1 : 0)
