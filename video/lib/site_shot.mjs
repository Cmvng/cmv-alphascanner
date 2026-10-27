// Screenshot a public web page when Chromium won't trust the session's proxy (ERR_CERT_AUTHORITY_INVALID): every
// request is fetched by Node, which verifies TLS against the proxy's CA bundle, so the browser makes no TLS connection
// itself. Read-only: no clicks, no logins, no wallets.
//   NODE_USE_ENV_PROXY=1 node video/lib/site_shot.mjs <url> <out.png> <width> <height> [scale]   (LOGREQ=1 lists fonts and errors)
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
await p.screenshot({ path: out, fullPage: true })
console.log('requests', n, 'failed', bad)
console.log((await p.evaluate(() => document.body.innerText)).slice(0, 2500))
await b.close()
