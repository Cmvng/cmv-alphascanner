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
      cached: false
    }

    cache.set(clean, { data: result, time: Date.now() })
    return res.status(200).json(result)
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to fetch X data' })
  }
}
