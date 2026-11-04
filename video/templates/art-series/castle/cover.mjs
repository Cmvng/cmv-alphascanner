// node cover.mjs <cover.html> <out dir>  ->  castle_cover.png (1080x1920) and castle_thumbnail.png (1280x720)
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const [page_, out] = process.argv.slice(2)
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
for (const [k, w, h, name] of [['v', 1080, 1920, 'castle_cover.png'], ['t', 1280, 720, 'castle_thumbnail.png']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } }); await p.goto(`file://${page_}#${k}`); await p.evaluate(() => window.READY)
  await p.waitForTimeout(300); await p.screenshot({ path: `${out}/${name}` }); await p.close()
}
await b.close()
