import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const { handle } = req.query
  if (!handle || typeof handle !== 'string') {
    return res.status(400).json({ error: 'Handle required' })
  }

  const clean = handle.replace('@', '').trim()

  try {
    const [userRes, tweetsRes] = await Promise.all([
      fetch(
        `https://api.twitter.com/2/users/by/username/${clean}?user.fields=public_metrics,verified,created_at,profile_image_url,description,entities`,
        { headers: { Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}` } }
      ),
      fetch(
        `https://api.twitter.com/2/users/by/username/${clean}?user.fields=public_metrics`,
        { headers: { Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}` } }
      )
    ])

    const userData = await userRes.json()
    const u = userData.data
    if (!u) return res.status(404).json({ error: 'User not found' })

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

    return res.status(200).json({
      followers,
      following,
      tweet_count: tweetCount,
      listed,
      verified: u.verified || false,
      account_age_years: age,
      profile_image_url: u.profile_image_url?.replace('_normal', '_bigger') || null,
      description: u.description || '',
      cmv_score: Math.min(1000, cmvScore * 10),
      breakdown: {
        follower_reach: Math.round(followerScore),
        listed_quality: Math.round(listedScore),
        account_age: Math.round(ageScore),
        posting_activity: Math.round(activityScore),
        follower_ratio: Math.round(ratioScore),
        verified: Math.round(verifiedScore),
      }
    })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch X data' })
  }
}
