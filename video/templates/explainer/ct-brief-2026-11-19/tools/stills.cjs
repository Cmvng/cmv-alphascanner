// Stills of the page at given times (1920x1080, DPR 1) and a contact sheet.  node stills.cjs <page.html> <out dir> <t1,t2,...>
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const [page, out, ts] = process.argv.slice(2)
;(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  await p.goto('file://' + page); await p.evaluate(() => window.READY)
  for (const t of ts.split(',').map(Number)) { await p.evaluate(t => window.render(t), t); await p.waitForTimeout(60); await p.screenshot({ path: `${out}/s_${t.toFixed(2).padStart(7, '0')}.jpg`, type: 'jpeg', quality: 82 }) }
  console.log('errors:', errs.slice(0, 5).join(' || ') || 'none'); await b.close()
})()
