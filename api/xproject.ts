import type { VercelRequest, VercelResponse } from '@vercel/node'

const BEARER = process.env.X_API_BEARER_TOKEN || ''

// ─── DefiLlama ───────────────────────────────────────────────────────────────
async function fetchDefiLlama(projectName: string, handle: string) {
  try {
    const slug = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const handleSlug = handle.toLowerCase().replace(/[^a-z0-9]/g, '')
    const slugsToTry = [slug, handleSlug, slug.replace(/-/g, ''), handleSlug + '-protocol']

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

// ─── DefiLlama Hacks ─────────────────────────────────────────────────────────
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

// ─── RootData ────────────────────────────────────────────────────────────────
async function fetchRootData(projectName: string, apiKey?: string) {
  try {
    if (!apiKey) return null
    const searchRes = await fetch('https://api.rootdata.com/open/ser_inv', {
      method: 'POST',
      headers: { 'apikey': apiKey, 'language': 'en', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: projectName })
    })
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

// ─── DexScreener ─────────────────────────────────────────────────────────────
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

// ─── GeckoTerminal ───────────────────────────────────────────────────────────
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

// ─── Crypto News Sentiment ────────────────────────────────────────────────────
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

// ─── X Intelligence Extraction ────────────────────────────────────────────────
function extractIntelligence(tweets: any[], bio: string, pinnedTweet: string) {
  const allText = [bio, pinnedTweet, ...tweets.map((t: any) => t.text)].join(' ')
  const allLower = allText.toLowerCase()

  // Ignore major tokens that projects reference but don't own
  const IGNORE_TICKERS = [
    'USD','BTC','ETH','USDC','USDT','SOL','BASE','OP','ARB','BNB','MATIC','AVAX',
    'SUI','APT','SEI','INJ','TIA','DYDX','GMX','SNX','WIF','PEPE','BONK',
    // Major DeFi tokens often referenced in bios but not owned by the project
    'AAVE','UNI','LINK','CRV','MKR','COMP','BAL','SUSHI','YFI','1INCH',
    'LIDO','RPL','FXS','CVX','LDO','STG','GNO','SAFE',
    // Layer tokens often mentioned
    'STRK','ZK','MANTA','SCROLL','BLAST','MODE','ZORA',
    // Exchange tokens
    'BNB','OKB','KCS','FTT','CRO','HT',
  ]
  const KNOWN_TICKERS: Record<string, string> = {
    'hyperliquid': 'HYPE', 'eigenlayer': 'EIGEN', 'ethena': 'ENA',
    'jupiter': 'JUP', 'jito': 'JTO', 'wormhole': 'W',
    'starknet': 'STRK', 'zksync': 'ZK', 'scroll': 'SCR',
    'celestia': 'TIA', 'kaito': 'KAITO', 'berachain': 'BERA',
    'aave': 'AAVE', 'uniswap': 'UNI', 'chainlink': 'LINK',
    'limitless': 'LMTS', 'drift': 'DRIFT', 'marginfi': 'MRGN',
    'kamino': 'KMNO', 'pendle': 'PENDLE', 'gmx': 'GMX',
    'synthetix': 'SNX', 'dydx': 'DYDX', 'vertex': 'VRTX',
  }

  // Bio/pinned only for ticker — prevents false positives from mentions
  const bioAndPinned = [bio, pinnedTweet].join(' ')
  const bioTickerMatches = (bioAndPinned.match(/\$([A-Z]{2,10})\b/g) || [])
    .map((t: string) => t.replace('$', ''))
    .filter((t: string) => !IGNORE_TICKERS.includes(t))
    .filter((t: string) => {
      // Extra check: reject if the ticker appears in a "powered by" or "built on" context
      const bioLower = bioAndPinned.toLowerCase()
      const tLower = t.toLowerCase()
      const poweredByContext = ['powered by','built on','built with','uses','via','through','accepts','supports','collateral','yields in','earn','stake','deposit']
      const tickerIdx = bioLower.indexOf('$' + tLower)
      if (tickerIdx === -1) return true
      const before = bioLower.slice(Math.max(0, tickerIdx - 30), tickerIdx)
      return !poweredByContext.some(ctx => before.includes(ctx))
    })

  // Known map fallback
  const knownEntry = Object.entries(KNOWN_TICKERS).find(([proj]) => allLower.includes(proj))
  const knownTicker = knownEntry ? knownEntry[1] : null
  const tickers = [...new Set([...bioTickerMatches, ...(knownTicker ? [knownTicker] : [])])]

  // Token launch hints
  const tokenLaunchHinted = /tge|token launch|token drop|airdrop|claim your|token generation|snapshot/i.test(allText)

  // Season detection
  const seasonMatches = allText.match(/[Ss]eason\s*(\d+)/g) || []
  const latestSeason = seasonMatches.length > 0 ? Math.max(...seasonMatches.map(s => parseInt(s.replace(/[Ss]eason\s*/,'')))) : null
  const dateMatches = allText.match(/([A-Z][a-z]+ \d{1,2}[\s,]+ ?202[456])/g) || []
  const fundingMatches = allText.match(/\$[\d.]+[MBK]\+?\s*(raised|funding|round|backed)/gi) || []
  const vcMentions = ['a16z','andreessen','coinbase ventures','paradigm','sequoia','multicoin','pantera','polychain','binance labs','okx ventures','animoca','framework','dragonfly','1confirmation','peak xv','bain capital'].filter(vc => allLower.includes(vc))
  const userCountMatches = allText.match(/([\d,.]+[KMB]?\+?)\s*(users|traders|participants|addresses|wallets)/gi) || []
  const avgLikes = tweets.length > 0 ? Math.round(tweets.reduce((sum: number, t: any) => sum + (t.public_metrics?.like_count || 0), 0) / tweets.length) : 0
  const avgRetweets = tweets.length > 0 ? Math.round(tweets.reduce((sum: number, t: any) => sum + (t.public_metrics?.retweet_count || 0), 0) / tweets.length) : 0
  const paidKeywords = ['sponsored','paid partnership','#ad','#sponsored','in partnership with'].filter(k => allLower.includes(k))
  const contentType = paidKeywords.length > 2 ? 'mostly_paid' : 'organic'

  let category = 'Infrastructure'
  const bioLower = bio.toLowerCase()
  if (bioLower.includes('predict') || bioLower.includes('outcome') || bioLower.includes('forecast')) category = 'Prediction Market'
  else if (bioLower.includes('perp') || bioLower.includes('perpetual') || bioLower.includes('derivatives')) category = 'Perp DEX'
  else if (bioLower.includes('layer 1') || bioLower.includes('layer 2') || bioLower.includes(' l1') || bioLower.includes(' l2')) category = 'L1/L2'
  else if (bioLower.includes('lend') || bioLower.includes('borrow') || bioLower.includes('yield')) category = 'DeFi/Lending'
  else if (bioLower.includes('nft') || bioLower.includes('gaming') || bioLower.includes('game')) category = 'NFT/Gaming'
  else if (bioLower.includes('real world') || bioLower.includes('rwa') || bioLower.includes('tokenized')) category = 'RWA'
  else if (bioLower.includes('social') || bioLower.includes('creator')) category = 'SocialFi'
  else if (bioLower.includes('agent') || bioLower.includes('intelligence') || (bioLower.includes('ai') && bioLower.includes('chain'))) category = 'AI'
  else if (bioLower.includes('bridge') || bioLower.includes('cross-chain')) category = 'Bridge'
  else if (bioLower.includes('restaking') || bioLower.includes('liquid staking')) category = 'Restaking'
  else if (bioLower.includes('dex') || bioLower.includes('swap') || bioLower.includes('amm')) category = 'DEX'

  return { tickers, confirmedTicker: bioTickerMatches[0] || knownTicker || null, tokenLaunchHinted, latestSeason, seasonDates: dateMatches.slice(0, 3), fundingMentions: fundingMatches.slice(0, 3), vcMentions, userCountMentions: userCountMatches.slice(0, 3), contentType, avgLikes, avgRetweets, category }
}

// ─── CMV X Score ─────────────────────────────────────────────────────────────
function computeCMVScore(followers: number, following: number, listed: number, tweetCount: number, verified: boolean, avgLikes: number, avgRetweets: number, accountAgeYears: number) {
  let score = 0
  if (followers >= 1000000) score += 300
  else if (followers >= 500000) score += 250
  else if (followers >= 100000) score += 200
  else if (followers >= 50000) score += 160
  else if (followers >= 10000) score += 120
  else if (followers >= 5000) score += 80
  else if (followers >= 1000) score += 40
  else score += 10

  const ffRatio = following > 0 ? followers / following : followers
  if (ffRatio > 50) score += 100
  else if (ffRatio > 20) score += 80
  else if (ffRatio > 10) score += 60
  else if (ffRatio > 5) score += 40
  else score += 20

  if (listed > 1000) score += 150
  else if (listed > 500) score += 120
  else if (listed > 100) score += 90
  else if (listed > 50) score += 60
  else if (listed > 10) score += 30
  else score += 10

  if (tweetCount > 5000) score += 100
  else if (tweetCount > 2000) score += 80
  else if (tweetCount > 1000) score += 60
  else if (tweetCount > 500) score += 40
  else score += 20

  if (verified) score += 100

  if (avgLikes > 1000) score += 150
  else if (avgLikes > 500) score += 120
  else if (avgLikes > 100) score += 90
  else if (avgLikes > 50) score += 60
  else if (avgLikes > 10) score += 30
  else score += 10

  if (accountAgeYears >= 5) score += 100
  else if (accountAgeYears >= 3) score += 80
  else if (accountAgeYears >= 2) score += 60
  else if (accountAgeYears >= 1) score += 40
  else score += 20

  return Math.min(1000, Math.round(score))
}

// ─── Auto FUD Signal Detection (no Claude needed) ────────────────────────────
function detectFUDSignals(u: any, intel: any, dexData: any, hacksData: any[], newsData: any) {
  const flags: Array<{type: string, label: string, detail: string, severity: 'high'|'medium'|'low'}> = []

  const followers = u.public_metrics?.followers_count || 0
  const following = u.public_metrics?.following_count || 0
  const listed = u.public_metrics?.listed_count || 0
  const tweetCount = u.public_metrics?.tweet_count || 0
  const createdAt = u.created_at ? new Date(u.created_at) : new Date()
  const ageMonths = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)

  // 1. Very new account with inflated followers
  if (ageMonths < 6 && followers > 10000) {
    flags.push({
      type: 'suspicious',
      label: 'New account with high followers',
      detail: `Account is only ${Math.round(ageMonths)} months old but has ${followers.toLocaleString()} followers — possible purchased followers or rebranded account.`,
      severity: 'medium'
    })
  }

  // 2. Follow farming — following way more than followers
  if (following > followers * 2 && followers < 5000) {
    flags.push({
      type: 'suspicious',
      label: 'Follow-farming detected',
      detail: `Following ${following.toLocaleString()} accounts but only ${followers.toLocaleString()} followers — classic follow-for-follow farming pattern.`,
      severity: 'low'
    })
  }

  // 3. Low listed count vs high followers (fake/bot followers)
  if (followers > 5000 && listed < followers * 0.005) {
    flags.push({
      type: 'suspicious',
      label: 'Low credibility ratio',
      detail: `Only ${listed} accounts have listed this project despite ${followers.toLocaleString()} followers — suggests low genuine engagement or bot followers.`,
      severity: 'low'
    })
  }

  // 4. Very low tweet count for age (inactive or abandoned)
  if (ageMonths > 12 && tweetCount < 50) {
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
  const pinnedLower = (u.pinned_tweet_text || '').toLowerCase()
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
  const bioLower = (u.description || '').toLowerCase()
  const bigNames = ['binance','coinbase','a16z','paradigm','sequoia','polychain','multicoin','pantera']
  const bigNameMentions = bigNames.filter(n => bioLower.includes(n))
  if (bigNameMentions.length >= 2 && intel.vcMentions.length === 0) {
    flags.push({
      type: 'suspicious',
      label: 'Unverified name-dropping in bio',
      detail: `Bio mentions ${bigNameMentions.join(', ')} but no confirmed funding rounds found — possible false credibility claims.`,
      severity: 'medium'
    })
  }

  return flags
}


// ─── Main Handler ─────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const handle = (req.query.handle as string || '').replace('@', '').trim()
  if (!handle) return res.status(400).json({ error: 'Handle required' })

  try {
    // 1. Fetch X user data
    const uRes = await fetch(`https://api.twitter.com/2/users/by/username/${handle}?user.fields=description,public_metrics,verified,created_at,entities,pinned_tweet_id,profile_image_url`, {
      headers: { Authorization: `Bearer ${BEARER}` }
    })
    if (!uRes.ok) return res.status(uRes.status).json({ error: 'X API error' })
    const uData = await uRes.json()
    const u = uData.data
    if (!u) return res.status(404).json({ error: 'User not found' })

    // 2. Fetch recent tweets + pinned
    const tweetsRes = await fetch(`https://api.twitter.com/2/users/${u.id}/tweets?max_results=20&tweet.fields=text,public_metrics,created_at`, {
      headers: { Authorization: `Bearer ${BEARER}` }
    })
    const tweetsData = tweetsRes.ok ? await tweetsRes.json() : { data: [] }
    const recentTweets = tweetsData.data || []

    let pinnedTweetText = ''
    if (u.pinned_tweet_id) {
      const ptRes = await fetch(`https://api.twitter.com/2/tweets/${u.pinned_tweet_id}?tweet.fields=text`, {
        headers: { Authorization: `Bearer ${BEARER}` }
      })
      if (ptRes.ok) { const pt = await ptRes.json(); pinnedTweetText = pt.data?.text || '' }
    }

    const bio = u.description || ''
    const metrics = u.public_metrics
    const followers = metrics?.followers_count || 0
    const following = metrics?.following_count || 0
    const listed = metrics?.listed_count || 0
    const tweetCount = metrics?.tweet_count || 0
    const verified = u.verified || false
    const createdAt = u.created_at ? new Date(u.created_at) : new Date()
    const accountAgeYears = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365)
    const pfpUrl = u.profile_image_url?.replace('_normal', '_400x400') || null
    const projectName = u.name || handle

    // 3. Extract X intelligence
    const intel = extractIntelligence(recentTweets, bio, pinnedTweetText)

    // 4. CMV X Score
    const cmvScore = computeCMVScore(followers, following, listed, tweetCount, verified, intel.avgLikes, intel.avgRetweets, accountAgeYears)

    // 5. Run all external APIs in parallel
    const [defiLlama, defiLlamaHacks, dexScreener, geckoTerminal, newsData, rootData] = await Promise.allSettled([
      fetchDefiLlama(projectName, handle),
      fetchDefiLlamaHacks(projectName),
      intel.confirmedTicker ? fetchDexScreener(intel.confirmedTicker, projectName) : Promise.resolve(null),
      intel.confirmedTicker ? fetchGeckoTerminal(intel.confirmedTicker, projectName) : Promise.resolve(null),
      fetchCryptoNewsSentiment(projectName, intel.confirmedTicker || undefined),
      process.env.ROOTDATA_API_KEY ? fetchRootData(projectName, process.env.ROOTDATA_API_KEY) : Promise.resolve(null),
    ])

    const dlData = defiLlama.status === 'fulfilled' ? defiLlama.value : null
    const hacksData = defiLlamaHacks.status === 'fulfilled' ? defiLlamaHacks.value : []
    const dexData = dexScreener.status === 'fulfilled' ? dexScreener.value : null
    const geckoData = geckoTerminal.status === 'fulfilled' ? geckoTerminal.value : null
    const news = newsData.status === 'fulfilled' ? newsData.value : null
    const rdData = rootData.status === 'fulfilled' ? rootData.value : null

    // 6. Best token data — priority: DexScreener > GeckoTerminal > (CoinGecko in frontend)
    let tokenData: any = null
    if (dexData?.token_live) tokenData = { ...dexData, source: 'dexscreener' }
    else if (geckoData?.token_live) tokenData = { ...geckoData, source: 'geckoterminal' }

    // 7. Merge investors from DefiLlama + RootData
    const allInvestors = [...new Set([...(dlData?.investors || []), ...(rdData?.investors || [])])]
    const allTeam = rdData?.team || []

    // 8. Build enriched context for Claude
    const enrichedContext = {
      // DefiLlama
      tvl: dlData?.tvl || null,
      fees_24h: dlData?.fees_24h || null,
      revenue_24h: dlData?.revenue_24h || null,
      total_raised_defillama: dlData?.total_raised || null,
      defillama_category: dlData?.category || null,
      chains: dlData?.chains || [],
      // RootData
      total_raised_rootdata: rdData?.total_raised || null,
      rootdata_team: allTeam,
      // Combined investors
      confirmed_investors: allInvestors,
      // Hacks
      known_hacks: hacksData,
      // News sentiment
      news_sentiment: news?.sentiment || null,
      news_article_count: news?.article_count || 0,
      news_red_flags: news?.red_flag_headlines || [],
      news_recent: news?.recent_headlines?.slice(0, 3) || [],
      // DexScreener
      dex_volume_24h: dexData?.volume_24h || null,
      dex_liquidity: dexData?.liquidity || null,
      dex_dump_detected: dexData?.dump_detected || false,
      dex_price_change_24h: dexData?.price_change_24h || null,
      // Auto-detected FUD signals — no Claude needed
      auto_fud_flags: autoFudFlags,
      auto_fud_count: autoFudFlags.length,
    }

    // Auto-detect FUD signals from all available data
    const autoFudFlags = detectFUDSignals(u, intel, dexData, hacksData || [], news)

    return res.status(200).json({
      id: u.id,
      name: projectName,
      handle,
      description: bio,
      pinned_tweet: pinnedTweetText,
      recent_tweets: recentTweets.map((t: any) => t.text).join(' ').slice(0, 800),
      followers, following, listed,
      tweet_count: tweetCount,
      verified,
      account_age_years: Math.round(accountAgeYears * 10) / 10,
      profile_image_url: pfpUrl,
      cmv_score: cmvScore,
      // X intelligence
      confirmed_ticker: intel.confirmedTicker,
      token_launch_hinted: intel.tokenLaunchHinted,
      category: intel.category,
      latest_season: intel.latestSeason,
      season_dates: intel.seasonDates,
      vc_mentions: intel.vcMentions,
      funding_mentions: intel.fundingMentions,
      user_count_mentions: intel.userCountMentions,
      content_type: intel.contentType,
      avg_likes: intel.avgLikes,
      avg_retweets: intel.avgRetweets,
      // Token data from DEX
      token_data: tokenData,
      // All enriched external data
      enriched: enrichedContext,
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
