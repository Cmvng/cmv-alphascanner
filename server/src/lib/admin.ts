// server/src/lib/admin.ts
//
// Admin auth for the engine routes, reusing the ONE implementation that already exists in
// api/_lib/admin-auth.ts rather than reimplementing token verification here. Two verifiers would
// eventually disagree, and the one that disagreed by being more permissive would be the bug.
//
// The import is dynamic and absolute because the server's tsconfig has rootDir: src, so api/ is
// outside its compilation unit. Under tsx both this module and api/admin.ts resolve that path to
// the same file URL, so they share a module instance — which matters: when ADMIN_SECRET is not
// configured the module mints an ephemeral one, and two instances would sign with different keys.

import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

type AdminAuth = { verifyToken(header: unknown): boolean }
let cached: AdminAuth | null = null

async function load(): Promise<AdminAuth | null> {
  if (cached) return cached
  try {
    cached = (await import(/* @vite-ignore */ `${repoRoot}/api/_lib/admin-auth.ts`)) as AdminAuth
    return cached
  } catch (e: any) {
    console.error('[admin] could not load auth module:', e?.message)
    return null
  }
}

/**
 * Guard a privileged route. Fails CLOSED: if the auth module cannot be loaded at all, every
 * caller is rejected rather than admitted.
 */
export async function requireAdmin(req: { headers: Record<string, any> }, res: any): Promise<boolean> {
  const auth = await load()
  if (!auth) {
    res.status(503).json({ error: 'auth_unavailable' })
    return false
  }
  if (auth.verifyToken(req.headers.authorization)) return true
  res.status(401).json({ error: 'unauthorized' })
  return false
}
