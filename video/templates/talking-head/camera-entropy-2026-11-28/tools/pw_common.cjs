// Playwright context whose requests are fetched by Node (which trusts the session proxy's CA), as in video/lib/site_shot.mjs.
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
async function open(w, h, scale = 2, mobile = false) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale, isMobile: mobile, hasTouch: mobile })
  await ctx.route('**/*', async route => {
    const r = route.request(), u = r.url()
    if (!/^https?:/.test(u)) return route.continue()
    try {
      const headers = { ...r.headers() }; delete headers['host']
      const res = await fetch(u, { method: r.method(), headers, body: ['GET', 'HEAD'].includes(r.method()) ? undefined : r.postDataBuffer(), redirect: 'manual' })
      const body = Buffer.from(await res.arrayBuffer())
      const hs = {}; res.headers.forEach((v, k) => { if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k)) hs[k] = v })
      await route.fulfill({ status: res.status, headers: hs, body })
    } catch (e) { await route.abort() }
  })
  return { b, ctx }
}
module.exports = { open }
