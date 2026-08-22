// src/lib/session.ts
//
// One place for the admin session token, so pages other than /admin can use it.
//
// sessionStorage, not localStorage: the token dies when the tab closes, which is the same
// lifetime it had when it lived in a React state variable. Moving it here widens WHERE it can be
// read (any page in this tab) without widening HOW LONG it survives.

const KEY = 'cmv_admin_token'

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    // Private-mode and blocked-storage browsers throw on access. No token is the safe answer.
    return null
  }
}

export function setAdminToken(token: string): void {
  try { sessionStorage.setItem(KEY, token) } catch { /* nothing to do — session stays in memory */ }
}

export function clearAdminToken(): void {
  try { sessionStorage.removeItem(KEY) } catch { /* already gone as far as we can tell */ }
}

/** Authorization header when signed in, empty otherwise — so callers can spread it either way. */
export function authHeader(): Record<string, string> {
  const t = getAdminToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}
