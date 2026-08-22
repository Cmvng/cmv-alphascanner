// server/src/db.ts
// Railway Postgres. DATABASE_URL arrives as a reference variable (${{Postgres.DATABASE_URL}}),
// so no connection string is ever pasted and rotation propagates automatically.

import { Pool } from 'pg'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const connectionString = process.env.DATABASE_URL

export const hasDatabase = Boolean(connectionString)

export const pool = connectionString
  ? new Pool({
      connectionString,
      max: 8,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      // Railway's managed Postgres terminates TLS with its own cert on the private network.
      ssl: connectionString.includes('railway.internal') ? undefined : { rejectUnauthorized: false },
    })
  : null

export async function query<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  if (!pool) throw new Error('DATABASE_URL is not configured')
  const r = await pool.query(text, params as any[])
  return r.rows as T[]
}

/** Run every SQL migration in order. Each file is idempotent, so this is safe on every boot. */
export async function migrate(): Promise<void> {
  if (!pool) throw new Error('DATABASE_URL is not configured')
  const here = dirname(fileURLToPath(import.meta.url))
  // Resolve whether we are running from src/ (tsx) or dist/.
  const dirs = [resolve(here, '../../db/migrations'), resolve(here, '../../../db/migrations')]

  let dir: string | null = null
  let files: string[] = []
  for (const d of dirs) {
    try {
      files = (await readdir(d)).filter((f) => f.endsWith('.sql')).sort()
      if (files.length) { dir = d; break }
    } catch {
      /* try the next candidate */
    }
  }
  if (!dir) throw new Error('no migrations directory found')

  for (const f of files) {
    const sql = await readFile(join(dir, f), 'utf8')
    // Run each file in its own transaction so a later failure cannot half-apply an earlier one.
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query(sql)
      await client.query('commit')
      console.log(`[db] migration applied: ${f}`)
    } catch (e) {
      await client.query('rollback').catch(() => {})
      throw new Error(`migration ${f} failed: ${(e as Error).message}`)
    } finally {
      client.release()
    }
  }
}

/** Config values live in the database so thresholds are tunable without a deploy. */
export async function loadConfig(): Promise<Record<string, number>> {
  const rows = await query<{ key: string; value: string }>('select key, value from signal_config')
  const out: Record<string, number> = {}
  for (const r of rows) out[r.key] = Number(r.value)
  return out
}
