// open a public page headless, wait, screenshot it, and list the images it loaded:  node peek.cjs <url> <out.png> [w] [h] [dsf] [waitms]
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => {
  const [url, out, w = 1440, h = 900, dsf = 2, wait = 6000] = process.argv.slice(2)
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dsf })
  const imgs = new Set(); p.on('response', r => { const t = r.headers()['content-type'] || ''; if (t.startsWith('image/')) imgs.add(r.url() + '  ' + t) })
  await p.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => console.log('goto:', e.message))
  await p.waitForTimeout(+wait); await p.screenshot({ path: out })
  console.log('title:', await p.title()); console.log([...imgs].join('\n'))
  await b.close()
})()
