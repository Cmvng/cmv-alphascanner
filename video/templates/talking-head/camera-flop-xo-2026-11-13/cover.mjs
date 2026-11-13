// Cover (1080x1920), its middle square (1080x1080, the picture for an X post) and the wide thumbnail (1280x720, YouTube).
//   node cover.mjs <cover.html next to img/still.png> <out prefix>
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright')
const [page_, out] = process.argv.slice(2)
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
for (const [m, w, h, f] of [['v', 1080, 1920, '_cover.png'], ['t', 1280, 720, '_thumbnail.png']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  await p.goto('file://' + page_ + '#' + m); await p.evaluate(() => window.READY)
  await p.screenshot({ path: out + f })
  if (m === 'v') await p.screenshot({ path: out + '_x-square.png', clip: { x: 0, y: 420, width: 1080, height: 1080 } })     // the picture for an X post: the cover's own middle square
  await p.close()
}
await b.close()
