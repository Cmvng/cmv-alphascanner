// crops of the 12 Nov release by element text, DPR 2: headline block, the disclosure paragraph, the eligibility paragraph
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => {
  const out = process.argv[2], b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 })
  await p.goto('https://www.newsfilecorp.com/release/323490', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => 0)
  await p.waitForTimeout(2000)
  // close the cookie banner by declining (no tracking), if present
  for (const t of ['Reject All']) { const el = p.getByText(t, { exact: true }); if (await el.count()) await el.first().click().catch(() => 0) }
  await p.waitForTimeout(800)
  const find = async (needle, tag) => p.evaluateHandle(([n, tg]) => [...document.querySelectorAll(tg)].find(e => e.innerText && e.innerText.includes(n) && e.innerText.length < 1200), [needle, tag])
  const jobs = [['pr_head', 'Prospect Markets Goes Live in the United States', 'h1'], ['pr_date', 'November 12, 2026 8:00 AM EST', '*'], ['pr_disc', 'Customers are introduced to Foris DAX', 'p'], ['pr_elig', 'Restrictions and eligibility requirements apply', 'p'], ['pr_live', 'Today, Prospect is live', 'p'], ['pr_about', 'Fans trade peer-to-peer', 'p']]
  for (const [n, needle, tag] of jobs) {
    const h = await find(needle, tag); const el = h.asElement()
    if (!el) { console.log(n, 'not found'); continue }
    await el.scrollIntoViewIfNeeded(); const bb = await el.boundingBox(); await el.screenshot({ path: `${out}/${n}.png` })
    console.log(n, JSON.stringify(bb), (await el.innerText()).slice(0, 160).replace(/\n/g, ' '))
  }
  await b.close()
})()
