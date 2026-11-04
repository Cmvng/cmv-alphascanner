// A public X post as X's own embed renders it (platform.twitter.com/embed/Tweet.html): node tweet_embed.cjs <id> <out.png> [light|dark]
(async () => {
const { chromium } = require('playwright')
const [id, out, theme] = process.argv.slice(2)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 620, height: 900 }, deviceScaleFactor: 2 })
const url = `https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=${theme || 'light'}&dnt=true&hideThread=true&lang=en`
const r = await p.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => ({ err: String(e) }))
console.log('status', r && r.status ? r.status() : r)
await p.waitForTimeout(2500)
const art = await p.$('article')
console.log('article?', !!art, 'title:', await p.title())
const txt = await p.evaluate(() => document.body.innerText.slice(0, 400))
console.log(txt)
if (art) await art.screenshot({ path: out }); else await p.screenshot({ path: out, fullPage: true })
await b.close()
})()
