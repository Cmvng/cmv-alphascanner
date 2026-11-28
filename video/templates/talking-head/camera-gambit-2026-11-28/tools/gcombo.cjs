const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const fs = require('fs'), WB = fs.readFileSync(process.env.WB, 'utf8'), out = process.argv[2]
;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, timezoneId: 'Africa/Lagos', locale: 'en-GB' })
  const p = await ctx.newPage()
  const shot = async n => { await p.screenshot({ path: `${out}/${n}.png` }); fs.writeFileSync(`${out}/${n}.words.json`, JSON.stringify({ scale: 2.5, words: await p.evaluate(WB) })); console.log('shot', n) }
  const go = async u => { await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {}); await p.waitForTimeout(6500); const x = p.getByText('Skip', { exact: true }); if (await x.count().catch(() => 0)) { await x.first().click().catch(() => {}); await p.waitForTimeout(800) } }
  const look = async name => { const t = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' '); for (const k of ['Combo', 'combo', 'COMBO', 'Parlay', 'parlay', 'Polymarket', 'Kalshi', 'Robinhood']) { let i = t.indexOf(k); if (i >= 0) console.log(name, k, '::', t.slice(Math.max(0, i - 100), i + 140)) } }
  await go('https://app.gambitmarkets.com/markets/sports'); await shot('sp'); await look('sports')
  const links = await p.evaluate(() => [...new Set([...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')))].filter(h => h.startsWith('/')).slice(0, 80))
  console.log('links', links.join(' '))
  const ev = links.find(h => /\/(event|market|m)\/[^/]+/.test(h) && !/markets\/(sports|politics|crypto)$/.test(h))
  if (ev) { await go('https://app.gambitmarkets.com' + ev); await shot('ev'); await look('event') }
  await b.close()
})()
