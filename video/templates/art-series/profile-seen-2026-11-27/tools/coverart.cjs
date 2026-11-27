// the cover art: the page in its cover mode (#c), dots only (no counter, no handle), at a few moments of the gather
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const [page_, outDir, times] = process.argv.slice(2)
;(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
  for (const [tag, w, h] of [['v', 1080, 1920], ['w', 1920, 1080]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
    p.on('pageerror', e => console.log('PAGE ERROR', e.message))
    await p.goto('file://' + page_ + '#c'); await p.evaluate(() => window.READY)
    for (const t of times.split(',')) {
      await p.evaluate(t => window.render(t), +t)
      await p.evaluate(() => { for (const e of document.querySelectorAll('#txt > *, #handle')) e.style.visibility = 'hidden' })
      await p.screenshot({ path: `${outDir}/art_${tag}_${t}.png` })
      await p.evaluate(() => { for (const e of document.querySelectorAll('#txt > *, #handle')) e.style.visibility = '' })
    }
    await p.close()
  }
  await b.close()
})()
