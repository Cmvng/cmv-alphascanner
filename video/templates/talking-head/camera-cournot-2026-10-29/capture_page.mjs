// Read-only: scroll a page through once with the wheel (so its intro animation finishes), then bring each phrase to the
// middle of the viewport and screenshot it, with the phrase's box and its section's box.
//   node capture_page.mjs <url> <out dir> <w> <h> <phrase> [phrase...]
import { createRequire } from 'module'
import fs from 'fs'
const require = createRequire(import.meta.url)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const [url, out, w, h, ...phrases] = process.argv.slice(2)
fs.mkdirSync(out, { recursive: true })
const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } })
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
const p = await ctx.newPage()
await p.goto(url, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(5000)
await p.mouse.move(+w / 2, +h / 2)
for (let i = 0; i < 60; i++) { await p.evaluate(() => window.scrollBy(0, 400)); await p.waitForTimeout(120) }
await p.waitForTimeout(2000)
const res = {}
for (const [i, ph] of phrases.entries()) {
  const loc = p.getByText(ph, { exact: false })
  const n = await loc.count(); let done = false
  for (let k = 0; k < n && !done; k++) {
    const el = loc.nth(k); if (!(await el.isVisible())) continue
    await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(400)
    await p.evaluate(() => window.scrollBy(0, 1))
    await p.waitForTimeout(2500)
    const bb = await el.boundingBox()
    await p.screenshot({ path: `${out}/p${i}.png` }); res[`p${i}`] = { phrase: ph, box: bb }; done = true
    console.log('p' + i, ph, JSON.stringify(bb))
  }
  if (!done) console.log('MISS', ph, n)
}
fs.writeFileSync(`${out}/boxes.json`, JSON.stringify(res, null, 1))
await b.close()
