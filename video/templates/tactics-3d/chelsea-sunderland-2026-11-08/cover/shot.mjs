// node shot.mjs <html> <hash> <out.png>
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const [html, hash, out] = process.argv.slice(2), v = hash.startsWith('v')
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] })
const p = await b.newPage({ viewport: { width: v ? 1080 : 1280, height: v ? 1920 : 720 } }); p.on('pageerror', e => console.log('PAGEERR', e.message))
await p.goto(`file://${html}#${hash}`, { timeout: 240000 }); await p.evaluate(() => window.READY); await p.waitForTimeout(200); await p.screenshot({ path: out }); await b.close()
