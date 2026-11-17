// List the links on a rendered page whose href or text matches a word:  node links.cjs <url> <word>
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => {
  const [url, word] = process.argv.slice(2)
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => console.log('goto:', e.message))
  await p.waitForTimeout(2500)
  const L = await p.$$eval('a', as => as.map(a => [a.getAttribute('href'), a.textContent.trim().slice(0, 60)]))
  for (const [h, t] of L) if ((h || '').toLowerCase().includes(word) || t.toLowerCase().includes(word)) console.log(h, '|', t)
  console.log('total links', L.length, 'title', await p.title())
  await b.close()
})()
