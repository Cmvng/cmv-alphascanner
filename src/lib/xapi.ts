export async function fetchProjectXData(handle: string) {
  try {
    const clean = handle.replace('@', '').trim()
    const r = await fetch(`/api/xproject?handle=${clean}`)
    if (!r.ok) {
      console.error(`xproject returned ${r.status} for @${clean}`)
      return null
    }
    const data = await r.json()
    if (data.error) {
      console.warn(`xproject partial error for @${clean}:`, data.error)
    }
    return data
  } catch (err) {
    console.error(`fetchProjectXData failed for @${handle}:`, err)
    return null
  }
}
