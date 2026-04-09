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
    const r = await fetch(
      `https://api.twitter.com/2/users/by/username/${clean}?user.fields=public_metrics,verified,created_at,profile_image_url,description`,
      { headers: { Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}` } }
    )
    const data = await r.json()
    const u = data.data
    if (!u) return res.status(404).json({ error: 'User not found' })

    const followers = u.public_metrics?.followers_count || 0
    const listed = u.public_metrics?.listed_count || 0
    const createdYear = new Date(u.created_at || '').getFullYear()
    const age = new Date().getFullYear() - createdYear
    const engRate = Math.min(0.3, (listed / Math.max(followers, 1)) * 2)

    return res.status(200).json({
      followers,
      engagement_rate: engRate,
      verified: u.verified || false,
      account_age_years: age,
      profile_image_url: u.profile_image_url?.replace('_normal', '_bigger') || null,
      description: u.description || '',
    })
  } catch {
    return res.status(500).json({ error: 'Failed to fetch user' })
  }
}
