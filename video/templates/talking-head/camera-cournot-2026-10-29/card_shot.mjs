// Read-only: scroll the page through once (its intro animation), then put an element's top at several heights in the
// viewport and screenshot each, so a card can be caught whole (below a sticky bar) and still in its active state.
//   node card_shot.mjs <url> <out dir> <w> <h> <text> <offset,offset,...>
import { createRequire } from 'module'
import fs from 'fs'
const require = createRequire(import.meta.url)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const [url, out, w, h, text, offs] = process.argv.slice(2)
fs.mkdirSync(out, { recursive: true })
const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } })
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
const p = await ctx.newPage()
await p.goto(url, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(5000)
for (let i = 0; i < 60; i++) { await p.evaluate(() => window.scrollBy(0, 400)); await p.waitForTimeout(120) }
await p.waitForTimeout(1500)
const el = p.getByText(text, { exact: true }).first()
await el.evaluate(e => e.scrollIntoView({ block: 'start' })); await p.waitForTimeout(800)
for (const o of offs.split(',').map(Number)) {
  const top = await el.evaluate(e => e.getBoundingClientRect().top)
  await p.evaluate(d => window.scrollBy(0, d), top - o); await p.waitForTimeout(2200)
  const bb = await el.boundingBox()
  await p.screenshot({ path: `${out}/o${o}.png` })
  console.log(o, JSON.stringify(bb))
}
await b.close()
