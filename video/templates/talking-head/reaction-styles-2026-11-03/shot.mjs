// Screenshot one local page at 1080x1920: node shot.mjs <page.html> <out.png>
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW)
const [page_, out] = process.argv.slice(2)
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
await p.goto('file://' + page_); await p.evaluate(() => window.READY)
await p.screenshot({ path: out, type: 'png' }); await b.close()
