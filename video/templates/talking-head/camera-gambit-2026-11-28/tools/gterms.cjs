const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const fs = require('fs'), WB = fs.readFileSync(process.env.WB, 'utf8'), out = process.argv[2]
;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, timezoneId: 'Africa/Lagos', locale: 'en-GB' })
  const p = await ctx.newPage()
  for (const u of ['https://app.gambitmarkets.com/terms', 'https://gambitmarkets.com/terms']) {
    await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {}); await p.waitForTimeout(6000)
    const ok = await p.evaluate(() => { const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) if (n.textContent.includes('Kalshi')) { n.parentElement.scrollIntoView({ block: 'center' }); return n.textContent.slice(0, 300) } return null })
    console.log(u, '->', p.url(), '|', ok)
    if (ok) { await p.waitForTimeout(1000); await p.screenshot({ path: `${out}/terms.png` }); fs.writeFileSync(`${out}/terms.words.json`, JSON.stringify({ scale: 2.5, scrollY: await p.evaluate(() => scrollY), words: await p.evaluate(WB) })); break }
  }
  await b.close()
})()
