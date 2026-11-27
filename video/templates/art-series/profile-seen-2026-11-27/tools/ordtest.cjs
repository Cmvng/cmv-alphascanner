const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const [page_, w, h, tA, seqFrom, out] = process.argv.slice(2)
;(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] })
  for (const mode of ['fresh', 'seq']) {
    const p = await b.newPage({ viewport: { width: +w, height: +h } })
    await p.goto('file://' + page_); await p.evaluate(() => window.READY)
    if (mode === 'seq') for (let f = Math.round(+seqFrom * 30); f < Math.round(+tA * 30); f++) await p.evaluate(t => window.render(t), f / 30)
    await p.evaluate(t => window.render(t), +tA); await p.screenshot({ path: `${out}_${mode}.png` }); await p.close()
  }
  await b.close()
})()
