// node stills.cjs <page.html> <outdir> <t1> <t2> ...   one PNG per time (seeking forward), 1920x1080 at DPR 1
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => {
  const [page, out, ...ts] = process.argv.slice(2)
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] }), p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
  p.on('pageerror', e => console.log('PAGEERROR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()) })
  await p.goto('file://' + page); await p.evaluate(() => window.READY)
  for (const t of ts) { await p.evaluate(t => window.render(+t), t); await p.waitForTimeout(30); await p.screenshot({ path: `${out}/st_${(+t).toFixed(2).padStart(6, '0')}.png` }) }
  await b.close()
})()
