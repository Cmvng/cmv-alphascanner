// A public page at 2x in Lagos time (the owner's viewers), optionally scrolled to a text (SCROLLTO) and with a
// horizontal strip scrolled so a text sits near its left (HSCROLL), then the boxes of the texts to ring, in the
// capture's own pixels.   node cap.cjs <url> <out.png> <w> <h> <text...>     env: SCROLLTO, HSCROLL, LOGO=1 (print img srcs)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => {
  const [url, out, w, h, ...finds] = process.argv.slice(2)
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2, timezoneId: 'Africa/Lagos', locale: 'en-GB' })
  const p = await ctx.newPage()
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => console.log('goto:', e.message))
  await p.waitForTimeout(+(process.env.WAIT || 7000))
  if (process.env.CLICKS) for (const t of process.env.CLICKS.split('|')) { const b = p.getByText(t, { exact: true }); if (await b.count().catch(() => 0)) { await b.first().click({ timeout: 4000 }).then(() => console.log('clicked', t)).catch(e => console.log('click', t, e.message.split('\n')[0])); await p.waitForTimeout(1500) } else console.log('no', t) }
  const find = (s) => p.evaluate((s) => { const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; const all = []
    while ((n = tw.nextNode())) { const i = n.textContent.indexOf(s); if (i < 0) continue; const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + s.length)
      for (const q of r.getClientRects()) if (q.width > 0 && q.bottom > 0 && q.top < innerHeight) all.push([q.left, q.top, q.right, q.bottom]) } return all.length ? all : null }, s)
  if (process.env.SCROLLTO) { await p.evaluate(([s, OFF, B]) => { const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n
    while ((n = tw.nextNode())) if (n.textContent.includes(s)) { n.parentElement.scrollIntoView({ block: B }); window.scrollBy(0, -OFF); return } }, [process.env.SCROLLTO, +(process.env.OFF || 90), process.env.BLOCK || 'start']); await p.waitForTimeout(1500) }
  if (process.env.HSCROLL) { await p.evaluate((s) => { const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n
    while ((n = tw.nextNode())) if (n.textContent.trim() === s) { let e = n.parentElement; while (e && e.scrollWidth <= e.clientWidth + 2) e = e.parentElement
      if (e) { const r = n.parentElement.getBoundingClientRect(), er = e.getBoundingClientRect(); e.scrollLeft += r.left - er.left - 12 } return } }, process.env.HSCROLL); await p.waitForTimeout(800) }
  if (process.env.LOGO) console.log(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('header img, header svg, a img')].slice(0, 6).map(e => [e.tagName, e.getAttribute('src') || e.outerHTML.slice(0, 160), e.getBoundingClientRect().width]))))
  const BOX = {}
  for (const s of finds) { const r = await find(s); console.log(JSON.stringify(s), r ? JSON.stringify(r.map(q => q.map(v => Math.round(v * 2)))) : 'NOT FOUND'); BOX[s] = r ? r.map(q => q.map(v => Math.round(v * 2))) : null }
  if (process.env.BOXES) require('fs').writeFileSync(process.env.BOXES, JSON.stringify(BOX))
  await p.screenshot({ path: out })
  console.log('title:', await p.title(), '| at', new Date().toISOString())
  await b.close()
})()
