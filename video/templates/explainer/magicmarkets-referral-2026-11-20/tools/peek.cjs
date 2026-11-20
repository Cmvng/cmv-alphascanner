// A public page at 2x: viewport shot, full-page shot, title, text and links.  node peek.cjs <out dir> <name> <url> [wait ms]
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const [out, name, url, wait] = process.argv.slice(2)
;(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  const r = await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => ({ err: e.message }))
  await p.waitForTimeout(+wait || 6000)
  console.log('=====', name, r && r.status ? r.status() : r, await p.title())
  await p.screenshot({ path: `${out}/${name}_view.png` }); await p.screenshot({ path: `${out}/${name}_full.png`, fullPage: true })
  const t = await p.evaluate(() => document.body.innerText); console.log(t.slice(0, 3000).replace(/\n+/g, ' | '))
  const links = await p.evaluate(() => [...new Set([...document.querySelectorAll('a[href]')].map(a => a.href))])
  console.log('LINKS:', links.filter(l => !l.startsWith('javascript')).slice(0, 80).join(' '))
  await b.close()
})()
