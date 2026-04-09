import type { VercelRequest, VercelResponse } from '@vercel/node'

const cache = new Map<string, { data: any; time: number }>()
const CACHE_TTL = 1000 * 60 * 60 * 24

async function xFetch(url: string, token: string) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  return r.json()
}

async function getCoingeckoToken(ticker: string, handle: string) {
  try {
    // Search by ticker first
    if (ticker) {
      const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(ticker)}`)
      const d = await r.json()
      const matches = (d.coins || []).filter((c: any) => c.symbol?.toUpperCase() === ticker.toUpperCase())
      if (matches.length > 0) {
        const best = matches.sort((a: any, b: any) => (a.market_cap_rank || 9999) - (b.market_cap_rank || 9999))[0]
        const pr = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${best.id}&vs_currencies=usd&include_market_cap=true`)
        const pd = await pr.json()
        const price = pd[best.id]?.usd
        const mcap = pd[best.id]?.usd_market_cap
        if (price && price > 0) {
          const priceStr = price < 0.01 ? `$${price.toFixed(6)}` : price < 1 ? `$${price.toFixed(4)}` : `$${price.toFixed(2)}`
          const mcapStr = mcap ? (mcap >= 1e9 ? `$${(mcap / 1e9).toFixed(1)}B` : mcap >= 1e6 ? `$${(mcap / 1e6).toFixed(1)}M` : `$${Math.round(mcap).toLocaleString()}`) : ''
          return { token_live: true, ticker: best.symbol?.toUpperCase(), token_price: priceStr, market_cap: mcap, market_cap_str: mcapStr, token_note: `Live · $${best.symbol?.toUpperCase()} · ${mcapStr}` }
        }
      }
    }

    // Search by handle variants (strip try/use/go prefixes)
    const variants = [handle, handle.replace(/^(try|use|get|go|the)/i, '')]
    for (const v of variants) {
      if (v.length < 3) continue
      const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(v)}`)
      const d = await r.json()
      if (d.coins?.length > 0) {
        const match = d.coins.find((c: any) => {
          const cName = c.name?.toLowerCase() || ''
          return (cName.includes(v.toLowerCase()) || v.toLowerCase().includes(cName)) && (c.market_cap_rank || 9999) < 1500
        })
        if (match) {
          const pr = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${match.id}&vs_currencies=usd&include_market_cap=true`)
          const pd = await pr.json()
          const price = pd[match.id]?.usd
          const mcap = pd[match.id]?.usd_market_cap
          if (price && price > 0 && ticker) {
            const priceStr = price < 0.01 ? `$${price.toFixed(6)}` : price < 1 ? `$${price.toFixed(4)}` : `$${price.toFixed(2)}`
            const mcapStr = mcap ? (mcap >= 1e9 ? `$${(mcap / 1e9).toFixed(1)}B` : mcap >= 1e6 ? `$${(mcap / 1e6).toFixed(1)}M` : `$${Math.round(mcap).toLocaleString()}`) : ''
            return { token_live: true, ticker: match.symbol?.toUpperCase(), token_price: priceStr, market_cap: mcap, market_cap_str: mcapStr, token_note: `Live · $${match.symbol?.toUpperCase()} · ${mcapStr}` }
          }
        }
      }
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
  const TOKEN = process.env.X_API_BEARER_TOKEN!

  // Return cached result if fresh (pass ?nocache=true to bypass)
  const noCache = req.query.nocache === 'true'
  const cached = cache.get(clean)
  if (!noCache && cached && Date.now() - cached.time < CACHE_TTL) {
    return res.status(200).json({ ...cached.data, cached: true })
  }
  // Clear cache if requested
  if (noCache) cache.delete(clean)

  try {
    // 1. Fetch project X profile
    const userData = await xFetch(
      `https://api.twitter.com/2/users/by/username/${clean}?user.fields=public_metrics,verified,created_at,profile_image_url,description,entities,pinned_tweet_id,id`,
      TOKEN
    )
    const u = userData.data
    if (!u) return res.status(404).json({ error: 'User not found' })

    const bio = u.description || ''
    let pinnedTweetText = ''
    let recentTweetsText = ''

    // 2. Fetch pinned tweet
    if (u.pinned_tweet_id) {
      try {
        const tweetData = await xFetch(`https://api.twitter.com/2/tweets/${u.pinned_tweet_id}?tweet.fields=text`, TOKEN)
        pinnedTweetText = tweetData.data?.text || ''
      } catch { }
    }

    // 3. Fetch recent tweets for ticker detection
    try {
      const tweetsData = await xFetch(
        `https://api.twitter.com/2/users/${u.id}/tweets?max_results=10&tweet.fields=text&exclude=retweets`,
        TOKEN
      )
      recentTweetsText = (tweetsData.data || []).map((t: any) => t.text).join(' ')
    } catch { }

    // Founder profiles fetched separately via xuser API per team member

    // 5. Extract ticker from all X text
    const allText = `${bio} ${pinnedTweetText} ${recentTweetsText}`
    const tickerMatches = allText.match(/\$([A-Z]{2,10})\b/g) || []
    const tickers = [...new Set(tickerMatches.map((t: string) => t.replace('$', '')))]
    const filtered = tickers.filter((t: string) => !['USD', 'BTC', 'ETH', 'USDC', 'USDT', 'SOL', 'BASE', 'OP', 'ARB'].includes(t))
    const confirmedTicker = filtered.length > 0 ? filtered[0] : null

    const allTextLower = allText.toLowerCase()
    const launchSignals = ['token live', 'now live', 'trading now', 'listed on', 'officially live', 'tge complete', 'airdrop live', 'now trading', 'available on aerodrome', 'available on uniswap', 'live on', 'buy $', 'claim now']
    const tokenLaunchHinted = launchSignals.some(s => allTextLower.includes(s))

    // 6. Fetch token data from CoinGecko
    const tokenData = await getCoingeckoToken(confirmedTicker || '', clean)

    // 7. Compute CMV X Score
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
      confirmed_ticker: tokenData?.ticker || confirmedTicker,
      all_tickers_found: filtered,
      token_launch_hinted: tokenLaunchHinted || !!tokenData?.token_live,
      token_data: tokenData,

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
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to fetch X data' })
  }
}
