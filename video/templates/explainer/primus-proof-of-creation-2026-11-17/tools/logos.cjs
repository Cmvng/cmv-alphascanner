// List the logo-like elements in the top 200 px of a public page and screenshot each at 4x:
//   node logos.cjs <url> <out prefix> <css selector list>
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => {
  const [url, out, sel] = process.argv.slice(2)
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 4 })
  await p.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => console.log('goto:', e.message))
  await p.waitForTimeout(4000)
  const els = await p.locator(sel).all()
  let k = 0
  for (const e of els.slice(0, 30)) {
    const r = await e.boundingBox().catch(() => null)
    if (!r || r.width < 10 || r.y > 200 || r.y < 0) continue
    const info = await e.evaluate(n => (n.getAttribute('alt') || n.getAttribute('aria-label') || '') + ' ' + (n.currentSrc || ''))
    const f = `${out}_${k++}.png`
    await e.screenshot({ path: f, omitBackground: true }).catch(() => {})
    console.log(f, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), info.slice(0, 120))
  }
  await p.screenshot({ path: `${out}_top.png`, clip: { x: 0, y: 0, width: 1440, height: 160 } })
  await b.close()
})()
