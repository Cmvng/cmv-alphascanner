// X posts through X's embed widget at DPR 2, with the boxes (in the screenshot's pixels) of the text block, the media
// and named phrases (TreeWalker Range), so rings sit on the real words.  node postbox.cjs <out dir>
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const fs = require('fs'), out = process.argv[2]
const POSTS = {
  cult: ['2123154327971721573', ['own admin key', 'nearly $1 million in stablecoins', 'around twice the figure first reported', 'swap the code']],
  darkgrove: ['2123164384507855302', ['RNT Lend (~$955K lost)', 'Private Key Compromised']],
  blockaid: ['2123036162847613184', ['~$3.43M drained', 'sBOLD on ethereum', '@k3_capital']],
  lukso: ['2123030837608186321', ['about 300 Universal Profiles', 'around 1.4M', 'email-based recovery system']],
  bubblemaps: ['2123040341603598674', ['Baited his followers with callouts and public buys', 'Dumped on them for millions $', 'Used a side wallet operation', 'Is connected onchain to a serial rugger']],
  bw_closed: ['2122995414072762528', ['Anthropic IPO xStocks Campaign Is Closed', 'Total Subscription Cap of 500 million USDC has been reached']],
  bw_pm: ['2123024391642730576', ['Anthropic IPO Closing Market Cap Prediction Market is now live', 'Where will it close on day one?']],
  degen: ['2123064638069788769', ['Michigan shuts down sports betting', 'Kalshi', 'Polymarket,', 'Robinhood', 'Coinbase', 'by Nov 25']],
  ct_binance: ['2123131774691574003', ['court order in Abu Dhabi', '$6.3 billion hack', 'per Reuters']],
  variational: ['2123059725097177228', ['$110M Series B', '$1.5B valuation', 'Bain Capital Crypto', 'lift open interest caps on Omni', 'hundreds of new stock, index, commodity, and FX listings']],
  pancake: ['2122948487776272797', ['PancakeSwap is now Pancake', '6 years ago', 'More Than a Swap']],
}
;(async () => {
  const b = await chromium.launch(), res = {}
  for (const [n, [id, phrases]] of Object.entries(POSTS)) {
    const p = await b.newPage({ viewport: { width: 620, height: 1400 }, deviceScaleFactor: 2 })
    try {
      await p.goto(`https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=light&dnt=true&hideThread=true&lang=en`, { waitUntil: 'networkidle', timeout: 45000 })
      await p.waitForTimeout(3500)
      const art = await p.$('article'); await art.screenshot({ path: `${out}/${n}.png` })
      res[n] = await p.evaluate(phrases => {
        const A = document.querySelector('article').getBoundingClientRect(), k = 2
        const bx = r => [Math.round((r.left - A.left) * k), Math.round((r.top - A.top) * k), Math.round((r.right - A.left) * k), Math.round((r.bottom - A.top) * k)]
        const media = [...document.querySelectorAll('article img, article video')].map(e => e.getBoundingClientRect()).filter(r => r.width > 200).map(bx)
        const times = [...document.querySelectorAll('article time')].map(e => [e.getAttribute('datetime'), bx(e.getBoundingClientRect())])
        const tw = document.createTreeWalker(document.querySelector('article'), NodeFilter.SHOW_TEXT); let nodes = [], s = '', nd
        while ((nd = tw.nextNode())) { nodes.push([nd, s.length]); s += nd.nodeValue }
        const find = ph => { const i = s.indexOf(ph); if (i < 0) return null
          const loc = pos => { for (let j = nodes.length - 1; j >= 0; j--) if (nodes[j][1] <= pos) return [nodes[j][0], pos - nodes[j][1]] }
          const [n0, o0] = loc(i), [n1, o1] = loc(i + ph.length - 1), r = document.createRange(); r.setStart(n0, o0); r.setEnd(n1, o1 + 1)
          return [...r.getClientRects()].map(bx) }
        return { size: [Math.round(A.width * k), Math.round(A.height * k)], media, times, phrases: Object.fromEntries(phrases.map(ph => [ph, find(ph)])) }
      }, phrases)
      console.log(n, JSON.stringify(res[n]))
    } catch (e) { console.log(n, 'FAILED', e.message.split('\n')[0]) }
    await p.close()
  }
  fs.writeFileSync(`${out}/boxes.json`, JSON.stringify(res, null, 1)); await b.close()
})()
