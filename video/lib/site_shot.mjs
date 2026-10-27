// Screenshot a public web page when Chromium won't trust the session's proxy (ERR_CERT_AUTHORITY_INVALID): every
// request is fetched by Node, which verifies TLS against the proxy's CA bundle, so the browser makes no TLS connection
// itself. Read-only: no clicks, no logins, no wallets.
//   NODE_USE_ENV_PROXY=1 node video/lib/site_shot.mjs <url> <out.png> <width> <height> [scale]   (LOGREQ=1 lists fonts and errors)
// FONTS="Play:wght@400;700" loads Google fonts the page's CSS names but never loads itself (otherwise the browser falls
// back to Times and the capture looks broken). It prints every font family the page asks for, and which are missing.
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const [url, out, w, h, scale] = process.argv.slice(2)
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(scale || 2) })
let n = 0, bad = 0
await ctx.route('**/*', async route => {
  const r = route.request()
  const u = r.url()
  if (!/^https?:/.test(u)) return route.continue()
  try {
    const headers = { ...r.headers() }; delete headers['host']
    const res = await fetch(u, { method: r.method(), headers, body: ['GET', 'HEAD'].includes(r.method()) ? undefined : r.postDataBuffer() })
    const body = Buffer.from(await res.arrayBuffer())
    const hs = {}; res.headers.forEach((v, k) => { if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k)) hs[k] = v })
    n++; if (process.env.LOGREQ && (res.status !== 200 || /font|woff/.test(u))) console.log(res.status, r.resourceType(), u.slice(0, 110)); await route.fulfill({ status: res.status, headers: hs, body })
  } catch (e) { bad++; await route.abort() }
})
const p = await ctx.newPage()
await p.goto(url, { waitUntil: 'load', timeout: 90000 }).catch(e => console.log('goto', e.message.split('\n')[0]))
await p.waitForTimeout(9000)
if (process.env.FONTS) {
  for (const f of process.env.FONTS.split(',')) await p.addStyleTag({ url: `https://fonts.googleapis.com/css2?family=${f}&display=block` })
  await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.fonts].filter(f => f.status !== 'loaded').map(f => f.load().catch(() => 0))) })
  await p.waitForTimeout(1500)
}
const fontReport = await p.evaluate(() => {
  const loaded = new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/["']/g, '')))
  const fams = new Set(); for (const el of document.querySelectorAll('body *')) if (el.childElementCount === 0 && el.textContent.trim() && el.getBoundingClientRect().width > 0) fams.add(getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim())
  return [...fams].map(f => [f, loaded.has(f)])
})
console.log('fonts', JSON.stringify(fontReport))
const missing = fontReport.filter(([, ok]) => !ok).map(([f]) => f)
if (missing.length) console.log('MISSING FONTS (the capture shows a fallback; pass them in FONTS):', missing.join(', '))
await p.screenshot({ path: out, fullPage: true })
console.log('requests', n, 'failed', bad)
console.log((await p.evaluate(() => document.body.innerText)).slice(0, 2500))
await b.close()
