import type { VercelRequest, VercelResponse } from '@vercel/node'

const cache = new Map<string, { data: any; time: number }>()
const CACHE_TTL = 1000 * 60 * 60 * 24

async function xFetch(url: string, token: string) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  return r.json()
}

async function getCoingeckoToken(ticker: string, handle: string) {
  try {
    const searchTerms: string[] = []
    if (ticker) searchTerms.push(ticker)
    searchTerms.push(handle)
    const stripped = handle.replace(/^(try|use|get|go|the)/i, '')
    if (stripped !== handle && stripped.length > 3) searchTerms.push(stripped)

    for (const term of searchTerms) {
      if (!term || term.length < 2) continue
      try {
        const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(term)}`)
        const d = await r.json()
        if (!d.coins?.length) continue

        let match: any = null
        if (ticker && term === ticker) {
          const exact = d.coins.filter((c: any) => c.symbol?.toUpperCase() === ticker.toUpperCase())
          if (exact.length > 0) match = exact.sort((a: any, b: any) => (a.market_cap_rank || 9999) - (b.market_cap_rank || 9999))[0]
        } else {
          const nameMatches = d.coins.filter((c: any) => {
            const cName = c.name?.toLowerCase() || ''
            const t = term.toLowerCase()
            return (cName.includes(t) || t.includes(cName)) && (c.market_cap_rank || 9999) < 2000
          })
          if (nameMatches.length > 0) match = nameMatches.sort((a: any, b: any) => (a.market_cap_rank || 9999) - (b.market_cap_rank || 9999))[0]
        }

        if (!match) continue

        const pr = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${match.id}&vs_currencies=usd&include_market_cap=true`)
        const pd = await pr.json()
        const price = pd[match.id]?.usd
        const mcap = pd[match.id]?.usd_market_cap
        if (!price || price === 0) continue

        const priceStr = price < 0.01 ? `$${price.toFixed(6)}` : price < 1 ? `$${price.toFixed(4)}` : `$${price.toFixed(2)}`
        const mcapStr = mcap ? (mcap >= 1e9 ? `$${(mcap / 1e9).toFixed(1)}B` : mcap >= 1e6 ? `$${(mcap / 1e6).toFixed(1)}M` : `$${Math.round(mcap).toLocaleString()}`) : ''
        return {
          token_live: true,
          ticker: match.symbol?.toUpperCase(),
          token_price: priceStr,
          market_cap: mcap,
          market_cap_str: mcapStr,
          token_note: `Live · $${match.symbol?.toUpperCase()} · ${mcapStr}`
        }
      } catch { continue }
    }
    return null
  } catch { return null }
}

function extractIntelligence(tweets: any[], bio: string, pinnedTweet: string) {
  const allText = [bio, pinnedTweet, ...tweets.map((t: any) => t.text)].join(' ')
  const allLower = allText.toLowerCase()

  // Extract tickers — only from bio and pinned tweet, NOT from general tweets
  // This prevents false positives like $MON appearing in tweets about other projects
  const IGNORE_TICKERS = ['USD','BTC','ETH','USDC','USDT','SOL','BASE','OP','ARB','BNB','MATIC','AVAX','SUI','APT','SEI','INJ','TIA','DYDX','GMX','SNX']
  
  // Known top project → ticker mappings as fallback
  const KNOWN_TICKERS: Record<string, string> = {
    'hyperliquid': 'HYPE', 'eigenlayer': 'EIGEN', 'ethena': 'ENA',
    'jupiter': 'JUP', 'jito': 'JTO', 'wormhole': 'W',
    'starknet': 'STRK', 'zksync': 'ZK', 'scroll': 'SCR',
    'optimism': 'OP', 'arbitrum': 'ARB', 'celestia': 'TIA',
    'sei': 'SEI', 'aptos': 'APT', 'sui': 'SUI',
    'dydx': 'DYDX', 'gmx': 'GMX', 'synthetix': 'SNX',
    'aave': 'AAVE', 'uniswap': 'UNI', 'chainlink': 'LINK',
    'kaito': 'KAITO', 'berachain': 'BERA', 'monad': 'MON',
  }

  const bioAndPinned = [bio, pinnedTweet].join(' ')
  const bioTickerMatches = bioAndPinned.match(/\$([A-Z]{2,10})\b/g) || []
  
  // Also check all text for known project tickers
  const allTextLower = [bio, pinnedTweet, ...tweets.map((t: any) => t.text)].join(' ').toLowerCase()
  const knownTicker = Object.entries(KNOWN_TICKERS).find(([proj]) => 
    allTextLower.includes(proj) || allTextLower.includes(proj.replace(/[^a-z]/g, ''))
  )?.[1] || null

  const tickers = [...new Set([
    ...bioTickerMatches
      .map((t: string) => t.replace('$', ''))
      .filter((t: string) => !IGNORE_TICKERS.includes(t)),
    ...(knownTicker ? [knownTicker] : [])
  ])]
    .filter((t: string) => !['USD', 'BTC', 'ETH', 'USDC', 'USDT', 'SOL', 'BASE', 'OP', 'ARB', 'BNB'].includes(t))

  // Season detection
  const seasonMatches = allText.match(/[Ss]eason\s*(\d+)/g) || []
  const seasonNums = seasonMatches.map((s: string) => parseInt(s.match(/\d+/)?.[0] || '0')).filter(Boolean)
  const latestSeason = seasonNums.length > 0 ? Math.max(...seasonNums) : null

  // Date extraction for seasons
  const dateMatches = allText.match(/([A-Z][a-z]+ \d{1,2}[\s,]+ ?202[456])/g) || []

  // Funding and VC signals
  const fundingMatches = allText.match(/\$[\d.]+[MBK]\+?\s*(raised|funding|round|backed)/gi) || []
  const vcList = ['coinbase', 'a16z', 'paradigm', 'pantera', 'multicoin', 'polychain', 'binance', 'sequoia', 'dragonfly', '1confirmation', 'maelstrom', 'dcg', 'animoca', 'arthur hayes', 'naval', 'blockchange']
  const vcMentions = vcList.filter(vc => allLower.includes(vc))

  // Token launch signals
  const launchSignals = ['token live', 'officially live', 'tge complete', 'now trading', 'buy $', 'claim now', 'airdrop live', 'listed on', 'listing']
  const tokenLaunchHinted = launchSignals.some(s => allLower.includes(s))

  // User/traction metrics from tweets
  const userCountMatches = allText.match(/([\d,.]+[KMB]?\+?)\s*(users|traders|participants|addresses|wallets|volume)/gi) || []

  // Engagement
  const totalLikes = tweets.reduce((sum: number, t: any) => sum + (t.public_metrics?.like_count || 0), 0)
  const totalRetweets = tweets.reduce((sum: number, t: any) => sum + (t.public_metrics?.retweet_count || 0), 0)
  const avgLikes = tweets.length > 0 ? Math.round(totalLikes / tweets.length) : 0
  const avgRetweets = tweets.length > 0 ? Math.round(totalRetweets / tweets.length) : 0

  // Paid/organic detection
  const paidSignals = ['sponsored', 'paid partnership', '#ad', 'ambassador', 'in partnership with']
  const paidCount = paidSignals.filter(s => allLower.includes(s)).length
  const contentType = paidCount >= 2 ? 'mostly_paid' : 'organic'

  // Category from bio
  const bioLower = bio.toLowerCase()
  let category = 'DeFi'
  if (bioLower.includes('predict') || bioLower.includes('outcome') || bioLower.includes('forecast')) category = 'Prediction Market'
  else if (bioLower.includes('perp') || bioLower.includes('perpetual') || bioLower.includes('derivatives')) category = 'Perp DEX'
  else if (bioLower.includes('layer 1') || bioLower.includes('layer 2') || bioLower.includes(' l1 ') || bioLower.includes(' l2 ')) category = 'L1/L2'
  else if (bioLower.includes('lend') || bioLower.includes('borrow') || bioLower.includes('yield')) category = 'Lending/Yield'
  else if (bioLower.includes('nft') || bioLower.includes('gaming') || bioLower.includes('game')) category = 'NFT/Gaming'
  else if (bioLower.includes('real world') || bioLower.includes('rwa') || bioLower.includes('tokenized')) category = 'RWA'
  else if (bioLower.includes('social') || bioLower.includes('creator')) category = 'SocialFi'
  else if (bioLower.includes('agent') || bioLower.includes('intelligence') || (bioLower.includes('ai') && bioLower.includes('chain'))) category = 'AI'
  else if (bioLower.includes('infrastructure') || bioLower.includes('encryption') || bioLower.includes('sdk')) category = 'Infrastructure'
  else if (bioLower.includes('exchange') || bioLower.includes(' dex') || bioLower.includes('swap')) category = 'DEX'
  else if (bioLower.includes('restak')) category = 'Restaking'
  else if (bioLower.includes('bridge') || bioLower.includes('cross-chain')) category = 'Bridge'

  return {
    tickers,
    confirmedTicker: tickers.length > 0 ? tickers[0] : null,
    tokenLaunchHinted,
    latestSeason,
    seasonDates: dateMatches.slice(0, 3),
    fundingMentions: fundingMatches.slice(0, 3),
    vcMentions,
    userCountMentions: userCountMatches.slice(0, 4),
    contentType,
    avgLikes,
    avgRetweets,
    category,
  }
}


// ─── fetchDefiLlama ─────────────────────────────────────────────────
async function fetchDefiLlama(projectName: string, handle: string) {
  try {
    const slug = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const handleSlug = handle.toLowerCase().replace(/[^a-z0-9]/g, '')
    // Generate more slug variations to improve match rate
    const words = projectName.toLowerCase().split(/\s+/)
    const acronym = words.map((w: string) => w[0]).join('')
    const slugsToTry = [
      slug,
      handleSlug,
      slug.replace(/-/g, ''),
      handleSlug + '-protocol',
      handleSlug + '-fi',
      words.slice(0,3).join('-'),
      words.slice(0,2).join('-'),
      acronym,
      handle.toLowerCase(),
    ].filter((s: string, i: number, arr: string[]) => s && arr.indexOf(s) === i) // dedupe

    let data: any = null
    for (const s of slugsToTry) {
      try {
        const r = await fetch(`https://api.llama.fi/protocol/${s}`)
        if (r.ok) { data = await r.json(); break }
      } catch { continue }
    }
    if (!data) return null

    const currentTvl = data.tvl?.slice(-1)[0]?.totalLiquidityUSD || 0
    const tvlStr = currentTvl >= 1e9 ? `$${(currentTvl/1e9).toFixed(1)}B` : currentTvl >= 1e6 ? `$${(currentTvl/1e6).toFixed(1)}M` : currentTvl > 0 ? `$${Math.round(currentTvl).toLocaleString()}` : null

    const fees24h = data.metrics?.fees?.['24h'] || 0
    const revenue24h = data.metrics?.revenue?.['24h'] || 0
    const feesStr = fees24h >= 1e6 ? `$${(fees24h/1e6).toFixed(1)}M/day` : fees24h >= 1e3 ? `$${(fees24h/1e3).toFixed(0)}K/day` : null
    const revenueStr = revenue24h >= 1e6 ? `$${(revenue24h/1e6).toFixed(1)}M/day` : revenue24h >= 1e3 ? `$${(revenue24h/1e3).toFixed(0)}K/day` : null

    const raises = data.raises || []
    const totalRaised = raises.reduce((sum: number, r: any) => sum + (r.amount || 0), 0)
    const raisedStr = totalRaised >= 1e6 ? `$${(totalRaised/1e6).toFixed(1)}M raised` : null
    const investors = raises.flatMap((r: any) => (r.leadInvestors || []).concat(r.otherInvestors || [])).filter(Boolean).slice(0, 5)

    return {
      tvl: tvlStr,
      fees_24h: feesStr,
      revenue_24h: revenueStr,
      total_raised: raisedStr,
      investors: investors.slice(0, 5),
      category: data.category || null,
      chains: data.chains?.slice(0, 3) || [],
      audits: data.audits || [],
    }
  } catch { return null }
}

// ─── fetchDefiLlamaHacks ─────────────────────────────────────────────────
async function fetchDefiLlamaHacks(projectName: string) {
  try {
    const r = await fetch('https://api.llama.fi/hacks')
    if (!r.ok) return []
    const hacks = await r.json()
    const nameLower = projectName.toLowerCase()
    return hacks.filter((h: any) =>
      h.name?.toLowerCase().includes(nameLower) || nameLower.includes(h.name?.toLowerCase() || '')
    ).map((h: any) => ({
      date: h.date,
      amount: h.amount ? `$${(h.amount/1e6).toFixed(1)}M` : 'unknown',
      technique: h.technique || 'unknown',
      classification: h.classification || 'Hack'
    })).slice(0, 3)
  } catch { return [] }
}

// ─── fetchRootData ─────────────────────────────────────────────────
async function fetchRootData(projectName: string, apiKey?: string) {
  try {
    if (!apiKey) return null
    // Try project name first, then handle as fallback
    const queries = [projectName, handle].filter((q, i, a) => q && a.indexOf(q) === i)
    let searchData: any = null
    for (const query of queries) {
      const searchRes = await fetch('https://api.rootdata.com/open/ser_inv', {
        method: 'POST',
        headers: { 'apikey': apiKey, 'language': 'en', 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      if (!searchRes.ok) continue
      const data = await searchRes.json()
      if (data.data?.length > 0) { searchData = data; break }
    }
    const fakeSearchRes = { ok: !!searchData, json: async () => searchData || { data: [] } }
    const searchRes = fakeSearchRes
    if (!searchRes.ok) return null
    const searchData = await searchRes.json()
    const project = searchData.data?.find((d: any) => d.type === 1)
    if (!project) return null

    const detailRes = await fetch('https://api.rootdata.com/open/get_item', {
      method: 'POST',
      headers: { 'apikey': apiKey, 'language': 'en', 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: project.id, include_team: 1, include_investors: 1 })
    })
    if (!detailRes.ok) return null
    const detail = await detailRes.json()
    const d = detail.data

    const totalRaised = d.total_funding ? `$${(d.total_funding/1e6).toFixed(1)}M` : null
    const investors = (d.investors || []).map((i: any) => i.name).filter(Boolean).slice(0, 6)
    const team = (d.team_members || []).map((t: any) => ({
      name: t.name || '',
      role: t.title || '',
      x_handle: t.twitter ? '@' + t.twitter.replace('https://twitter.com/', '').replace('@', '') : '',
    })).filter((t: any) => t.name).slice(0, 5)

    return { total_raised: totalRaised, investors, team, tags: d.tags || [], one_liner: d.one_liner || '' }
  } catch { return null }
}

// ─── fetchDexScreener ─────────────────────────────────────────────────
async function fetchDexScreener(ticker: string, projectName: string) {
  try {
    const query = ticker || projectName
    const r = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`)
    if (!r.ok) return null
    const data = await r.json()
    const pairs = data.pairs || []
    if (pairs.length === 0) return null

    const nameLower = projectName.toLowerCase()
    const tickerUpper = (ticker || '').toUpperCase()

    const best = pairs.find((p: any) =>
      (tickerUpper && p.baseToken?.symbol?.toUpperCase() === tickerUpper) &&
      (p.baseToken?.name?.toLowerCase().includes(nameLower) || nameLower.includes(p.baseToken?.name?.toLowerCase() || ''))
    ) || pairs.find((p: any) =>
      tickerUpper && p.baseToken?.symbol?.toUpperCase() === tickerUpper
    ) || pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0]

    if (!best) return null

    const price = parseFloat(best.priceUsd || '0')
    const priceStr = price > 0 ? (price < 0.01 ? `$${price.toFixed(6)}` : price < 1 ? `$${price.toFixed(4)}` : `$${price.toFixed(2)}`) : null
    const vol24h = best.volume?.h24 || 0
    const volStr = vol24h >= 1e6 ? `$${(vol24h/1e6).toFixed(1)}M` : vol24h >= 1e3 ? `$${(vol24h/1e3).toFixed(0)}K` : null
    const liq = best.liquidity?.usd || 0
    const liqStr = liq >= 1e6 ? `$${(liq/1e6).toFixed(1)}M` : liq >= 1e3 ? `$${(liq/1e3).toFixed(0)}K` : null
    const change24h = best.priceChange?.h24 || 0
    const isDown = change24h < -20

    return {
      token_live: price > 0,
      ticker: best.baseToken?.symbol?.toUpperCase(),
      token_price: priceStr,
      volume_24h: volStr,
      liquidity: liqStr,
      price_change_24h: change24h,
      dump_detected: isDown && change24h < -30,
      dex: best.dexId,
      chain: best.chainId,
      pair_url: best.url,
    }
  } catch { return null }
}

// ─── fetchGeckoTerminal ─────────────────────────────────────────────────
async function fetchGeckoTerminal(ticker: string, projectName: string) {
  try {
    const query = ticker || projectName
    const r = await fetch(`https://api.geckoterminal.com/api/v2/search/pools?query=${encodeURIComponent(query)}&page=1`, {
      headers: { 'Accept': 'application/json;version=20230302' }
    })
    if (!r.ok) return null
    const data = await r.json()
    const pools = data.data || []
    if (pools.length === 0) return null

    const tickerUpper = (ticker || '').toUpperCase()
    const best = pools.find((p: any) =>
      p.attributes?.base_token_price_usd &&
      (p.attributes?.name?.toUpperCase().includes(tickerUpper) || tickerUpper === '')
    ) || pools[0]

    if (!best?.attributes) return null
    const price = parseFloat(best.attributes.base_token_price_usd || '0')
    if (price === 0) return null

    const priceStr = price < 0.01 ? `$${price.toFixed(6)}` : price < 1 ? `$${price.toFixed(4)}` : `$${price.toFixed(2)}`
    return { token_live: true, token_price: priceStr, source: 'geckoterminal' }
  } catch { return null }
}

// ─── fetchCryptoNewsSentiment ─────────────────────────────────────────────────
async function fetchCryptoNewsSentiment(projectName: string, ticker?: string) {
  try {
    const query = ticker || projectName
    const r = await fetch(`https://cryptocurrency.cv/api/news?q=${encodeURIComponent(query)}&limit=10`)
    if (!r.ok) return null
    const data = await r.json()
    const articles = data.articles || []
    if (articles.length === 0) return null

    const titles = articles.map((a: any) => a.title || '').filter(Boolean)
    const negWords = ['hack', 'rug', 'scam', 'fraud', 'exit', 'delay', 'postpone', 'cancel', 'sue', 'sec', 'investigation', 'collapse', 'dump', 'exploit']
    const posWords = ['launch', 'partnership', 'funding', 'raised', 'growth', 'milestone', 'integration', 'listed', 'airdrop', 'season']
    let negCount = 0, posCount = 0
    titles.forEach((t: string) => {
      const tl = t.toLowerCase()
      negWords.forEach(w => { if (tl.includes(w)) negCount++ })
      posWords.forEach(w => { if (tl.includes(w)) posCount++ })
    })
    const sentiment = negCount > posCount + 2 ? 'negative' : posCount > negCount ? 'positive' : 'neutral'
    const recentHeadlines = titles.slice(0, 5)
    const redFlagHeadlines = titles.filter(t => negWords.some(w => t.toLowerCase().includes(w))).slice(0, 3)

    return { sentiment, article_count: articles.length, recent_headlines: recentHeadlines, red_flag_headlines: redFlagHeadlines, negative_signals: negCount, positive_signals: posCount }
  } catch { return null }
}

// ─── detectFUDSignals ─────────────────────────────────────────────────
function detectFUDSignals(u: any, intel: any, dexData: any, hacksData: any[], newsData: any) {
  const flags: Array<{type: string, label: string, detail: string, severity: 'high'|'medium'|'low'}> = []

  // Only run X-based checks if Twitter actually returned real data
  const hasRealXData = u && u.public_metrics && (u.public_metrics.followers_count > 0 || u.public_metrics.tweet_count > 0)

  const followers = u?.public_metrics?.followers_count || 0
  const following = u?.public_metrics?.following_count || 0
  const listed = u?.public_metrics?.listed_count || 0
  const tweetCount = u?.public_metrics?.tweet_count || 0
  const createdAt = u?.created_at ? new Date(u.created_at) : new Date()
  const ageMonths = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)

  // 1. Very new account with inflated followers — only if real X data
  if (hasRealXData && ageMonths < 6 && followers > 10000) {
    flags.push({
      type: 'suspicious',
      label: 'New account with high followers',
      detail: `Account is only ${Math.round(ageMonths)} months old but has ${followers.toLocaleString()} followers — possible purchased followers or rebranded account.`,
      severity: 'medium'
    })
  }

  // 2. Follow farming — only if real X data
  if (hasRealXData && following > followers * 2 && followers < 5000) {
    flags.push({
      type: 'suspicious',
      label: 'Follow-farming detected',
      detail: `Following ${following.toLocaleString()} accounts but only ${followers.toLocaleString()} followers — classic follow-for-follow farming pattern.`,
      severity: 'low'
    })
  }

  // 3. Low listed count — only if real X data
  if (hasRealXData && followers > 5000 && listed < followers * 0.005) {
    flags.push({
      type: 'suspicious',
      label: 'Low credibility ratio',
      detail: `Only ${listed} accounts have listed this project despite ${followers.toLocaleString()} followers — suggests low genuine engagement or bot followers.`,
      severity: 'low'
    })
  }

  // 4. Inactive account — only if real X data
  if (hasRealXData && ageMonths > 12 && tweetCount < 50) {
    flags.push({
      type: 'other',
      label: 'Inactive account',
      detail: `Account is ${Math.round(ageMonths)} months old but only has ${tweetCount} tweets — possibly abandoned or not genuinely active.`,
      severity: 'low'
    })
  }

  // 5. Token dump detected from DexScreener
  if (dexData?.dump_detected) {
    const change = dexData.price_change_24h || 0
    flags.push({
      type: 'dump',
      label: 'Token dump detected',
      detail: `Token price dropped ${Math.abs(change).toFixed(1)}% in the last 24 hours — significant sell pressure detected on DEX.`,
      severity: 'high'
    })
  }

  // 6. Very low liquidity — easy rug
  if (dexData?.token_live && dexData?.liquidity) {
    const liqNum = parseFloat(dexData.liquidity.replace(/[$KMB]/g, '')) *
      (dexData.liquidity.includes('B') ? 1e9 : dexData.liquidity.includes('M') ? 1e6 : dexData.liquidity.includes('K') ? 1e3 : 1)
    if (liqNum < 50000) {
      flags.push({
        type: 'dump',
        label: 'Extremely low liquidity',
        detail: `Only ${dexData.liquidity} liquidity on DEX — very easy to rug pull or manipulate price.`,
        severity: 'high'
      })
    }
  }

  // 7. Known hack from DefiLlama
  if (hacksData && hacksData.length > 0) {
    hacksData.forEach((hack: any) => {
      flags.push({
        type: 'exploit',
        label: 'Security exploit on record',
        detail: `${hack.classification || 'Hack'} detected — ${hack.amount} lost via ${hack.technique || 'unknown technique'}.`,
        severity: 'high'
      })
    })
  }

  // 8. Negative news signals
  if (newsData?.red_flag_headlines && newsData.red_flag_headlines.length > 0) {
    const headlines = newsData.red_flag_headlines.slice(0, 2)
    flags.push({
      type: 'other',
      label: 'Negative news coverage',
      detail: `Recent negative headlines detected: "${headlines[0]}"${headlines[1] ? ` and "${headlines[1]}"` : ''}.`,
      severity: 'medium'
    })
  }

  // 9. Reward campaign in pinned tweet (paid shill signal)
  const pinnedLower = (u?.pinned_tweet_text || '').toLowerCase()
  const rewardKeywords = ['$5000','$10k','rewards pool','top creators','create a thread','retweet to win','airdrop campaign','task campaign']
  const hasRewardCampaign = rewardKeywords.some(k => pinnedLower.includes(k))
  if (hasRewardCampaign) {
    flags.push({
      type: 'shill',
      label: 'Paid content campaign active',
      detail: 'Pinned tweet contains a paid content/reward campaign — inflating organic mentions artificially.',
      severity: 'medium'
    })
  }

  // 10. Bio mentions multiple big names without verification (name dropping)
  const bioLower = (u?.description || '').toLowerCase()
  const bigNames = ['binance','coinbase','a16z','paradigm','sequoia','polychain','multicoin','pantera']
  const bigNameMentions = bigNames.filter(n => bioLower.includes(n))
  if (hasRealXData && bigNameMentions.length >= 2 && intel.vcMentions.length === 0) {
    flags.push({
      type: 'suspicious',
      label: 'Unverified name-dropping in bio',
      detail: `Bio mentions ${bigNameMentions.join(', ')} but no confirmed funding rounds found — possible false credibility claims.`,
      severity: 'medium'
    })
  }

  return flags
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const { handle } = req.query
  if (!handle || typeof handle !== 'string') return res.status(400).json({ error: 'Handle required' })

  const clean = handle.replace('@', '').trim().toLowerCase()
  const TOKEN = process.env.X_API_BEARER_TOKEN!

  const noCache = req.query.nocache === 'true'
  const cached = cache.get(clean)
  if (!noCache && cached && Date.now() - cached.time < CACHE_TTL) {
    return res.status(200).json({ ...cached.data, cached: true })
  }
  if (noCache) cache.delete(clean)

  try {
    // 1. Project profile
    const userData = await xFetch(
      `https://api.twitter.com/2/users/by/username/${clean}?user.fields=public_metrics,verified,created_at,profile_image_url,description,pinned_tweet_id,id`,
      TOKEN
    )
    const u = userData.data
    if (!u) return res.status(404).json({ error: 'User not found' })

    const bio = u.description || ''
    let pinnedTweetText = ''

    // 2. Pinned tweet
    if (u.pinned_tweet_id) {
      try {
        const td = await xFetch(`https://api.twitter.com/2/tweets/${u.pinned_tweet_id}?tweet.fields=text,public_metrics`, TOKEN)
        pinnedTweetText = td.data?.text || ''
      } catch { }
    }

    // 3. Recent tweets with engagement metrics
    let recentTweets: any[] = []
    try {
      const td = await xFetch(
        `https://api.twitter.com/2/users/${u.id}/tweets?max_results=20&tweet.fields=text,public_metrics,created_at&exclude=retweets`,
        TOKEN
      )
      recentTweets = td.data || []
    } catch { }

    // 4. Extract all intelligence from X data
    const intel = extractIntelligence(recentTweets, bio, pinnedTweetText)

    // 5. Token data from CoinGecko
    const tokenData = await getCoingeckoToken(intel.confirmedTicker || '', clean)

    // 6. CMV X Score
    const metrics = u.public_metrics
    const followers = metrics?.followers_count || 0
    const following = metrics?.following_count || 0
    const tweetCount = metrics?.tweet_count || 0
    const listed = metrics?.listed_count || 0
    const createdYear = new Date(u.created_at || '').getFullYear()
    const age = new Date().getFullYear() - createdYear

    const followerScore = Math.min(100, Math.log10(Math.max(followers, 1)) / 5 * 100)
    const listedScore = Math.min(100, Math.log10(Math.max(listed, 1)) / 4 * 100)
    const ageScore = Math.min(100, (age / 5) * 100)
    const activityScore = Math.min(100, (tweetCount / 1000) * 100)
    const ratioScore = Math.min(100, (followers / Math.max(following, 1)) / 100 * 100)
    const verifiedScore = u.verified ? 100 : 0
    const engagementScore = Math.min(100, (intel.avgLikes / Math.max(followers * 0.01, 1)) * 100)

    const cmvScore = Math.round(
      (followerScore * 0.28) + (listedScore * 0.18) + (ageScore * 0.12) +
      (activityScore * 0.12) + (ratioScore * 0.10) + (verifiedScore * 0.10) + (engagementScore * 0.10)
    )

    // ── Run all enrichment tools in parallel ──────────────────────────
  const projectName = u.name || clean
  const confirmedTicker = intel.confirmedTicker

  const [defiLlama, defiLlamaHacks, dexScreener, geckoTerminal, newsData, rootData] = await Promise.allSettled([
    fetchDefiLlama(projectName, clean),
    fetchDefiLlamaHacks(projectName),
    confirmedTicker ? fetchDexScreener(confirmedTicker, projectName) : Promise.resolve(null),
    confirmedTicker ? fetchGeckoTerminal(confirmedTicker, projectName) : Promise.resolve(null),
    fetchCryptoNewsSentiment(projectName, confirmedTicker || undefined),
    process.env.ROOTDATA_API_KEY ? fetchRootData(projectName, process.env.ROOTDATA_API_KEY) : Promise.resolve(null),
  ])

  const dlData = defiLlama.status === 'fulfilled' ? defiLlama.value : null
  const hacksData = defiLlamaHacks.status === 'fulfilled' ? defiLlamaHacks.value : []
  const dexData = dexScreener.status === 'fulfilled' ? dexScreener.value : null
  const geckoData = geckoTerminal.status === 'fulfilled' ? geckoTerminal.value : null
  const news = newsData.status === 'fulfilled' ? newsData.value : null
  const rdData = rootData.status === 'fulfilled' ? rootData.value : null

  let tokenData: any = null
  if (dexData?.token_live) tokenData = { ...dexData, source: 'dexscreener' }
  else if (geckoData?.token_live) tokenData = { ...geckoData, source: 'geckoterminal' }

  const allInvestors = [...new Set([...(dlData?.investors || []), ...(rdData?.investors || [])])]

  const autoFudFlags = detectFUDSignals(u, intel, dexData, hacksData || [], news)

  const enrichedContext = {
    tvl: dlData?.tvl || null,
    fees_24h: dlData?.fees_24h || null,
    revenue_24h: dlData?.revenue_24h || null,
    total_raised_defillama: dlData?.total_raised || null,
    defillama_category: dlData?.category || null,
    chains: dlData?.chains || [],
    total_raised_rootdata: rdData?.total_raised || null,
    rootdata_team: rdData?.team || [],
    confirmed_investors: allInvestors,
    known_hacks: hacksData,
    news_sentiment: news?.sentiment || null,
    news_article_count: news?.article_count || 0,
    news_red_flags: news?.red_flag_headlines || [],
    news_recent: news?.recent_headlines?.slice(0, 3) || [],
    dex_volume_24h: dexData?.volume_24h || null,
    dex_liquidity: dexData?.liquidity || null,
    dex_dump_detected: dexData?.dump_detected || false,
    dex_price_change_24h: dexData?.price_change_24h || null,
    auto_fud_flags: autoFudFlags,
    auto_fud_count: autoFudFlags.length,
  }

  const result = {
      followers, following, tweet_count: tweetCount, listed,
      verified: u.verified || false,
      account_age_years: age,
      profile_image_url: u.profile_image_url?.replace('_normal', '_bigger') || null,
      description: bio,
      pinned_tweet: pinnedTweetText,
      recent_tweets: recentTweets.map((t: any) => t.text).join(' ').slice(0, 800),

      // X intelligence — Claude uses this instead of searching for it
      confirmed_ticker: tokenData?.ticker || intel.confirmedTicker,
      all_tickers_found: intel.tickers,
      token_launch_hinted: intel.tokenLaunchHinted || !!tokenData?.token_live,
      token_data: tokenData,
      category: intel.category,
      latest_season: intel.latestSeason,
      season_dates: intel.seasonDates,
      funding_mentions: intel.fundingMentions,
      vc_mentions: intel.vcMentions,
      user_count_mentions: intel.userCountMentions,
      content_type: intel.contentType,
      avg_likes: intel.avgLikes,
      avg_retweets: intel.avgRetweets,

      cmv_score: Math.min(1000, Math.round(cmvScore * 10)),
      breakdown: {
        follower_reach: Math.round(followerScore),
        listed_quality: Math.round(listedScore),
        account_age: Math.round(ageScore),
        posting_activity: Math.round(activityScore),
        follower_ratio: Math.round(ratioScore),
        verified: Math.round(verifiedScore),
        engagement: Math.round(engagementScore),
      },
      name: u.name || handle,
      handle: clean,
      enriched: enrichedContext,
      cached: false
    }

    cache.set(clean, { data: result, time: Date.now() })
    return res.status(200).json(result)
  } catch (e: any) {
    return res.status(200).json({ 
      error: e.message, partial: true, handle: clean,
      name: clean, description: '', followers: 0, tweet_count: 0,
      enriched: {}, token_data: null, cmv_score: 0
    })
  }
}
