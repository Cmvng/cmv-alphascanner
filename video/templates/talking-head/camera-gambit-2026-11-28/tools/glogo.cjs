const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 430, height: 932 } })).newPage()
  await p.goto('https://app.gambitmarkets.com/leaderboard', { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {}); await p.waitForTimeout(5000)
  const r = await p.evaluate(() => [...document.querySelectorAll('img')].map(i => { const q = i.getBoundingClientRect(); return [i.currentSrc || i.src, Math.round(q.left), Math.round(q.top), Math.round(q.width), i.naturalWidth] }).filter(x => x[2] < 60))
  console.log(JSON.stringify(r)); await b.close()
})()
