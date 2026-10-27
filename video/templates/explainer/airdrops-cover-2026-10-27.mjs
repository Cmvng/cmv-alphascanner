import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW)
const [page_, cover, thumb] = process.argv.slice(2)
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] })
const p = await b.newPage({ viewport: { width: 1280, height: 2700 } })
await p.goto('file://' + page_); await p.evaluate(() => document.fonts.ready)
await p.locator('#cover').screenshot({ path: cover }); await p.locator('#thumb').screenshot({ path: thumb })
await b.close()
