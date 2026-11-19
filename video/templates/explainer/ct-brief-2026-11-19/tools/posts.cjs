// X posts through X's own embed widget (DPR 2): screenshot of the article + its text. node posts.cjs <out dir>
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const out = process.argv[2]
const POSTS = [['cult', '2123154327971721573'], ['darkgrove', '2123164384507855302'], ['blockaid', '2123036162847613184'], ['lukso', '2123030837608186321'], ['bubblemaps', '2123040341603598674'], ['bw_closed', '2122995414072762528'], ['bw_pm', '2123024391642730576'], ['degen', '2123064638069788769'], ['ct_binance', '2123131774691574003'], ['variational', '2123059725097177228'], ['pancake', '2122948487776272797']]
;(async () => {
  const b = await chromium.launch()
  for (const [n, id] of POSTS) {
    const p = await b.newPage({ viewport: { width: 620, height: 1400 }, deviceScaleFactor: 2 })
    try {
      await p.goto(`https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=light&dnt=true&hideThread=true&lang=en`, { waitUntil: 'networkidle', timeout: 45000 })
      await p.waitForTimeout(3500)
      const art = await p.$('article')
      if (art) await art.screenshot({ path: `${out}/${n}.png` }); else await p.screenshot({ path: `${out}/${n}.png`, fullPage: true })
      const imgs = await p.evaluate(() => [...document.querySelectorAll('article img')].map(i => i.src).filter(s => /media|card_img|ext_tw/.test(s)))
      console.log('=====', n, !!art, (await p.evaluate(() => document.body.innerText)).slice(0, 1400).replace(/\n+/g, ' | '))
      console.log('   media:', imgs.join(' '))
    } catch (e) { console.log(n, 'FAILED', e.message.split('\n')[0]) }
    await p.close()
  }
  await b.close()
})()
