const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const out = process.argv[2]
const POSTS = [['x_launch', '2120927919904067886'], ['x_slate', '2122016038145695934']]
;(async () => {
  const b = await chromium.launch()
  for (const [n, id] of POSTS) {
    const p = await b.newPage({ viewport: { width: 620, height: 1400 }, deviceScaleFactor: 2 })
    try {
      await p.goto(`https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=light&dnt=true&hideThread=true&lang=en`, { waitUntil: 'networkidle', timeout: 45000 })
      await p.waitForTimeout(3000)
      const art = await p.$('article')
      if (art) await art.screenshot({ path: `${out}/${n}.png` }); else await p.screenshot({ path: `${out}/${n}.png`, fullPage: true })
      console.log('=====', n, !!art, (await p.evaluate(() => document.body.innerText)).slice(0, 600).replace(/\n+/g, ' | '))
    } catch (e) { console.log(n, 'FAILED', e.message.split('\n')[0]) }
    await p.close()
  }
  await b.close()
})()
