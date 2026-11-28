// Gambit app states at phone size for the screen-recording parts (no login): scrolls, taps, a market, the combo slip.
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const fs = require('fs'), WB = fs.readFileSync(process.env.WB, 'utf8'), out = process.argv[2]
;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, timezoneId: 'Africa/Lagos', locale: 'en-GB' })
  const p = await ctx.newPage()
  const shot = async n => { await p.screenshot({ path: `${out}/${n}.png` }); fs.writeFileSync(`${out}/${n}.words.json`, JSON.stringify({ scale: 2.5, scrollY: await p.evaluate(() => scrollY), words: await p.evaluate(WB) })); console.log('shot', n, await p.evaluate(() => scrollY)) }
  const go = async u => { await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {}); await p.waitForTimeout(6500); for (const t of ['Skip', 'Got it']) { const x = p.getByText(t, { exact: true }); if (await x.count().catch(() => 0)) { await x.first().click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1000) } } }
  const scrollTo = async txt => { await p.evaluate(s => { const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) if (n.textContent.trim() === s) { n.parentElement.scrollIntoView({ block: 'start' }); window.scrollBy(0, -120); return } }, txt); await p.waitForTimeout(1200) }
  const tap = async (txt, last) => { const x = p.getByText(txt, { exact: true }); const n = await x.count().catch(() => 0); if (!n) { console.log('no', txt); return false } await (last ? x.last() : x.first()).click({ timeout: 4000 }).catch(e => console.log('tap fail', txt)); await p.waitForTimeout(1600); return true }
  await go('https://app.gambitmarkets.com/leaderboard'); await shot('lb0')
  await scrollTo('GP PRIZE POOL'); await shot('lb1')
  if (await tap('P&L')) await shot('lb1_pnl')
  await scrollTo('Tournament'); await shot('lb2')
  await p.evaluate(() => scrollTo(0, 0)); await scrollTo('GP PRIZE POOL')
  if (await tap('Past winners')) { await shot('lb_past'); await p.keyboard.press('Escape'); await p.waitForTimeout(800) }
  await go('https://app.gambitmarkets.com/agents'); await shot('ag0')
  if (await tap('AI')) await shot('ag_ai')
  if (await tap('Manual')) await shot('ag_manual')
  await go('https://app.gambitmarkets.com/markets'); await shot('mk0')
  // a market page: the first market card link
  const href = await p.evaluate(() => { const a = [...document.querySelectorAll('a[href*="/market"]')].map(a => a.getAttribute('href')).filter(h => /\/markets?\/[^/]+/.test(h)); return a[0] || null })
  console.log('market link', href)
  if (href) { await go(new URL(href, 'https://app.gambitmarkets.com').href); await shot('mkt'); const t = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' '); for (const k of ['Combo', 'combo', 'Parlay', 'Polymarket', 'Kalshi', 'Robinhood']) { const i = t.indexOf(k); console.log(k, i >= 0 ? t.slice(Math.max(0, i - 80), i + 100) : '-') } }
  const t2 = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ')
  await b.close()
})()
