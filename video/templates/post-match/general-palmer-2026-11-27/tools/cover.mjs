// Cover (1080x1920), its middle square (the picture for an X post), the wide thumbnail (1280x720, YouTube), and the
// four middle cuts to look at (3:4, 1:1, 7:8, 16:9).
//   node cover.mjs <cover.html> <out prefix> "<query, e.g. h=@Cmv_ng&shift=230>"
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright')
const [page_, out, q = ''] = process.argv.slice(2)
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
for (const [m, w, h, f] of [['v', 1080, 1920, '_cover.png'], ['t', 1280, 720, '_thumbnail.png']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  await p.goto('file://' + page_ + '?' + q + '#' + m); await p.evaluate(() => window.READY)
  await p.screenshot({ path: out + f })
  if (m === 'v') {
    await p.screenshot({ path: out + '_x-square.png', clip: { x: 0, y: 420, width: 1080, height: 1080 } })
    for (const [n, ch] of [['3x4', 1440], ['7x8', 1234], ['16x9', 608]])
      await p.screenshot({ path: out + '_cut' + n + '.png', clip: { x: 0, y: Math.round((1920 - ch) / 2), width: 1080, height: ch } })
  }
  await p.close()
}
await b.close()
