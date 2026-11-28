// Gambit's public app at phone size (no login): each page's top screen, the whole page, and every word's box.
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const fs = require('fs'), WB = fs.readFileSync(process.env.WB, 'utf8'), out = process.argv[2]
;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, timezoneId: 'Africa/Lagos', locale: 'en-GB' })
  const p = await ctx.newPage()
  for (const pair of process.argv.slice(3)) {
    const i = pair.indexOf('='), name = pair.slice(0, i), url = pair.slice(i + 1)
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => console.log('goto', name, e.message.slice(0, 60)))
    await p.waitForTimeout(7000)
    for (const t of ['Skip', 'Reject all', 'Accept', 'Got it']) { const x = p.getByText(t, { exact: true }); if (await x.count().catch(() => 0)) { await x.first().click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1200) } }
    await p.screenshot({ path: `${out}/${name}.png` }); await p.screenshot({ path: `${out}/${name}_full.png`, fullPage: true })
    fs.writeFileSync(`${out}/${name}.words.json`, JSON.stringify({ scale: 2.5, words: await p.evaluate(WB) }))
    console.log(name, p.url(), '|', (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 260))
  }
  await b.close()
})()
