// api/_lib/admin-auth.ts
// Server-side admin auth. Replaces `const ADMIN_PASSWORD = 'Damilola'` in src/pages/admin.tsx,
// which shipped the password in the public JS bundle, and replaces browser-side Supabase DELETE
// with the anon key (which required RLS permissive enough for anyone to wipe the table).
//
// Uses node:crypto only — no new dependency.

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'

const TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

function secret(): string {
  const s = process.env.ADMIN_SECRET
  if (s && s.length >= 16) return s
  // No secret configured → mint an ephemeral one. Tokens then die on restart, which is a safe
  // failure mode: admin simply has to log in again.
  const ephemeral = randomBytes(32).toString('hex')
  console.warn('[admin] ADMIN_SECRET not set — using an ephemeral secret; sessions end on restart')
  return ephemeral
}
const SECRET = secret()

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/** Constant-time password check against ADMIN_PASSWORD. */
export function checkPassword(submitted: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) {
    console.error('[admin] ADMIN_PASSWORD is not configured — refusing all logins')
    return false
  }
  if (typeof submitted !== 'string' || submitted.length === 0) return false
  // Hash both sides so timingSafeEqual gets equal-length buffers regardless of input length.
  return safeEqual(sign(submitted), sign(expected))
}

/** Issue an opaque `expiry.signature` token. */
export function issueToken(): string {
  const exp = String(Date.now() + TTL_MS)
  return `${exp}.${sign(exp)}`
}

/** Verify a token from the Authorization header. */
export function verifyToken(header: unknown): boolean {
  const raw = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : ''
  const [exp, sig] = raw.split('.')
  if (!exp || !sig) return false
  if (!safeEqual(sig, sign(exp))) return false
  return Number(exp) > Date.now()
}

/** Guard for privileged admin routes. Returns true if the caller is authorised. */
export function requireAdmin(req: { headers: Record<string, any> }, res: any): boolean {
  if (verifyToken(req.headers.authorization)) return true
  res.status(401).json({ error: 'Unauthorized' })
  return false
}
