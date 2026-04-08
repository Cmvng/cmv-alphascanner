const BEARER = import.meta.env.VITE_X_BEARER_TOKEN

export async function fetchXUserData(handle: string) {
  try {
    const clean = handle.replace('@', '').trim()
    const r = await fetch(
      `https://api.twitter.com/2/users/by/username/${clean}?user.fields=public_metrics,verified,created_at,profile_image_url`,
      { headers: { Authorization: `Bearer ${BEARER}` } }
    )
    const d = await r.json()
    const u = d.data
    if (!u) return null
    const metrics = u.public_metrics
    const followers = metrics?.followers_count || 0
    const listed = metrics?.listed_count || 0
    const engRate = Math.min(0.3, (listed / Math.max(followers, 1)) * 2)
    const createdYear = new Date(u.created_at || '').getFullYear()
    const age = new Date().getFullYear() - createdYear
    return {
      followers,
      engagement_rate: engRate,
      verified: u.verified || false,
      account_age_years: age,
      profile_image_url: u.profile_image_url?.replace('_normal', '_bigger') || null,
    }
  } catch { return null }
}
