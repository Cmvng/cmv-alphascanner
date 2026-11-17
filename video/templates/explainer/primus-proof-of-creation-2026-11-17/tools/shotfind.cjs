// Capture a public page (viewport w x h CSS px at 2x, after scrolling the first match into the upper third) and report
// the box of each text to find, in the captured picture's own pixels (CSS px x 2), relative to the capture.
//   node shotfind.cjs <url> <out.png> <w> <h> <text1> [text2 ...]
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => {
  const [url, out, w, h, ...finds] = process.argv.slice(2)
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 })
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => console.log('goto:', e.message))
  await p.waitForTimeout(3000)
  for (const fr of p.frames()) for (const t of ['No thanks', 'Accept all', 'Got it']) {
    const btn = fr.getByText(t, { exact: true }); const n = await btn.count().catch(() => 0)
    if (n) { await btn.first().click({ timeout: 3000 }).then(() => console.log('clicked', t, 'in', fr.url().slice(0, 60))).catch(e => console.log('click', t, e.message.split('\n')[0])) }
  }
  await p.waitForTimeout(500)
  if (process.env.TOP) await p.evaluate(() => window.scrollTo(0, 0))
  if (process.env.CLICKS) for (const t of process.env.CLICKS.split('|')) { await p.getByText(t, { exact: true }).first().click({ timeout: 5000 }).catch(e => console.log('click', t, e.message.split('\n')[0])); await p.waitForTimeout(1500) }
  if (process.env.CLICKS) console.log('at', p.url())
  if (process.env.NAV) { await p.evaluate(h => { const a = [...document.querySelectorAll('a')].find(a => a.getAttribute('href') === h); if (a) a.click(); else window.history.pushState({}, '', h) }, process.env.NAV); await p.waitForTimeout(3500); console.log('nav to', p.url()) }
  const box = async (s, scroll) => p.evaluate(([s, scroll]) => {
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n
    while ((n = tw.nextNode())) {
      const i = n.textContent.indexOf(s); if (i < 0) continue
      const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + s.length)
      if (scroll) { n.parentElement.scrollIntoView({ block: 'center' }); window.scrollBy(0, innerHeight * -0.12) }
      const q = r.getBoundingClientRect(); if (q.width > 0) return [q.left, q.top, q.right, q.bottom]
    }
    return null
  }, [s, scroll])
  if (finds.length && !process.env.TOP) { await box(finds[0], true); await p.waitForTimeout(800) }
  for (const s of finds) { const r = await box(s, false); console.log(JSON.stringify(s), r ? r.map(v => Math.round(v * 2)) : 'NOT FOUND') }
  await p.screenshot({ path: out })
  console.log('title:', await p.title())
  await b.close()
})()
