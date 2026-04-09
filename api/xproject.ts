import type { VercelRequest, VercelResponse } from '@vercel/node'

const cache = new Map<string, { data: any; time: number }>()
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hours

async function findCoinByXHandle(handle: string): Promise<{ id: string; symbol: string; name: string } | null> {
  try {
    // Search CoinGecko for coins matching this project name / handle
    const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(handle)}`)
    const d = await r.json()
    const coins = d.coins || []

    // For each top result, check if their links include this X handle
    for (const coin of coins.slice(0, 8)) {
      try {
        const detail = await fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`)
        const cd = await detail.json()
        const twitterHandle = cd.links?.twitter_screen_name?.toLowerCase() || ''
        const cleanHandle = handle.toLowerCase().replace('@', '')
        if (twitterHandle === cleanHandle) {
          return { id: coin.id, symbol: coin.symbol?.toUpperCase(), name: coin.name }
        }
      } catch { continue }
    }
    return null
  } catch { return null }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const { handle } = req.query
  if (!handle || typeof handle !== 'string') {
    return res.status(400).json({ error: 'Handle required' })
  }

  const clean = handle.replace('@', '').trim().toLowerCase()

  // Return cached result if fresh
  const cached = cache.get(clean)
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return res.status(200).json({ ...cached.data, cached: true })
  }

  try {
    // Fetch user profile + pinned tweet ID
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${clean}?user.fields=public_metrics,verified,created_at,profile_image_url,description,entities,pinned_tweet_id`,
      { headers: { Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}` } }
    )
    const userData = await userRes.json()
    const u = userData.data
    if (!u) return res.status(404).json({ error: 'User not found' })

    const bio = u.description || ''
    let pinnedTweetText = ''
    let recentTweetsText = ''

    // Fetch pinned tweet
    if (u.pinned_tweet_id) {
      try {
        const tweetRes = await fetch(
          `https://api.twitter.com/2/tweets/${u.pinned_tweet_id}?tweet.fields=text`,
          { headers: { Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}` } }
        )
        const tweetData = await tweetRes.json()
        pinnedTweetText = tweetData.data?.text || ''
      } catch { }
    }

    // Fetch recent tweets
    try {
      const tweetsRes = await fetch(
        `https://api.twitter.com/2/users/${u.id}/tweets?max_results=10&tweet.fields=text&exclude=retweets`,
        { headers: { Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}` } }
      )
      const tweetsData = await tweetsRes.json()
      recentTweetsText = (tweetsData.data || []).map((t: any) => t.text).join(' ')
    } catch { }

    // Search all text for $TICKER
    const allText = `${bio} ${pinnedTweetText} ${recentTweetsText}`
    const tickerMatches = allText.match(/\$([A-Z]{2,10})\b/g) || []
    const tickers = [...new Set(tickerMatches.map((t: string) => t.replace('$', '')))]
    const filtered = tickers.filter((t: string) => !['USD', 'BTC', 'ETH', 'USDC', 'USDT', 'SOL', 'BASE'].includes(t))
    const confirmedTicker = filtered.length > 0 ? filtered[0] : null

    // Token launch signals
    const allTextLower = allText.toLowerCase()
    const launchSignals = [
      'token live', 'now live', 'trading now', 'listed on', 'available on',
      'buy $', 'trade $', 'token launched', 'is officially live', 'tge complete',
      'airdrop live', 'claim now', 'now trading', 'officially live',
      'available on aerodrome', 'available on uniswap', 'live on'
    ]
    const tokenLaunchHinted = launchSignals.some((s: string) => allTextLower.includes(s))

    // CoinGecko X handle match — most reliable method
    let coingeckoMatch: { id: string; symbol: string; name: string } | null = null
    try {
      coingeckoMatch = await findCoinByXHandle(clean)
    } catch { }

    // Get live price if we have a CoinGecko match
    let tokenData: any = null
    if (coingeckoMatch) {
      try {
        const pr = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoMatch.id}&vs_currencies=usd&include_market_cap=true`)
        const pd = await pr.json()
        const price = pd[coingeckoMatch.id]?.usd
        const mcap = pd[coingeckoMatch.id]?.usd_market_cap
        if (price && price > 0) {
          const priceStr = price < 0.01 ? `$${price.toFixed(6)}` : price < 1 ? `$${price.toFixed(4)}` : `$${price.toFixed(2)}`
          const mcapStr = mcap ? (mcap >= 1e9 ? `$${(mcap / 1e9).toFixed(1)}B` : mcap >= 1e6 ? `$${(mcap / 1e6).toFixed(1)}M` : `$${Math.round(mcap).toLocaleString()}`) : ''
          tokenData = {
            token_live: true,
            ticker: coingeckoMatch.symbol,
            token_price: priceStr,
            market_cap: mcap,
            market_cap_str: mcapStr,
            token_note: `Live · Verified via CoinGecko X handle match${mcapStr ? ` · MCap ${mcapStr}` : ''}`,
            coingecko_id: coingeckoMatch.id,
            verified_match: true
          }
        }
      } catch { }
    }

    const metrics = u.public_metrics
    const followers = metrics?.followers_count || 0
    const following = metrics?.following_count || 0
    const tweetCount = metrics?.tweet_count || 0
    const listed = metrics?.listed_count || 0
    const createdYear = new Date(u.created_at || '').getFullYear()
    const age = new Date().getFullYear() - createdYear

    // CMV X Score
    const followerScore = Math.min(100, Math.log10(Math.max(followers, 1)) / 5 * 100)
    const listedScore = Math.min(100, Math.log10(Math.max(listed, 1)) / 4 * 100)
    const ageScore = Math.min(100, (age / 5) * 100)
    const activityScore = Math.min(100, (tweetCount / 1000) * 100)
    const ratioScore = Math.min(100, (followers / Math.max(following, 1)) / 100 * 100)
    const verifiedScore = u.verified ? 100 : 0

    const cmvScore = Math.round(
      (followerScore * 0.30) +
      (listedScore * 0.20) +
      (ageScore * 0.15) +
      (activityScore * 0.15) +
      (ratioScore * 0.10) +
      (verifiedScore * 0.10)
    )

    const result = {
      followers,
      following,
      tweet_count: tweetCount,
      listed,
      verified: u.verified || false,
      account_age_years: age,
      profile_image_url: u.profile_image_url?.replace('_normal', '_bigger') || null,
      description: bio,
      pinned_tweet: pinnedTweetText,
      recent_tweets: recentTweetsText.slice(0, 600),
      confirmed_ticker: coingeckoMatch?.symbol || confirmedTicker,
      all_tickers_found: filtered,
      token_launch_hinted: tokenLaunchHinted || !!coingeckoMatch,
      token_data: tokenData, // Pre-fetched token data — use directly in frontend
      cmv_score: Math.min(1000, Math.round(cmvScore * 10)),
      breakdown: {
        follower_reach: Math.round(followerScore),
        listed_quality: Math.round(listedScore),
        account_age: Math.round(ageScore),
        posting_activity: Math.round(activityScore),
        follower_ratio: Math.round(ratioScore),
        verified: Math.round(verifiedScore),
      },
      cached: false
    }

    cache.set(clean, { data: result, time: Date.now() })
    return res.status(200).json(result)
  } catch {
    return res.status(500).json({ error: 'Failed to fetch X data' })
  }
}
