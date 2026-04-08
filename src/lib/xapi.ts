export async function fetchProjectXData(handle: string) {
  try {
    const clean = handle.replace('@', '').trim()
    const r = await fetch(`/api/xproject?handle=${clean}`)
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}
