// server/src/db.ts
// Railway Postgres. DATABASE_URL arrives as a reference variable (${{Postgres.DATABASE_URL}}),
// so no connection string is ever pasted and rotation propagates automatically.

import { Pool } from 'pg'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

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

/** Run the SQL migrations. Idempotent — every statement is create-if-not-exists. */
export async function migrate(): Promise<void> {
  if (!pool) throw new Error('DATABASE_URL is not configured')
  const here = dirname(fileURLToPath(import.meta.url))
  // dist/ sits one level below the package root, so migrations resolve the same either way.
  const candidates = [
    resolve(here, '../../db/migrations/0001_alpha_engine.sql'),
    resolve(here, '../../../db/migrations/0001_alpha_engine.sql'),
  ]
  let sql: string | null = null
  for (const c of candidates) {
    try {
      sql = await readFile(c, 'utf8')
      break
    } catch {
      /* try the next candidate */
    }
  }
  if (!sql) throw new Error('migration file not found')
  await pool.query(sql)
}

/** Config values live in the database so thresholds are tunable without a deploy. */
export async function loadConfig(): Promise<Record<string, number>> {
  const rows = await query<{ key: string; value: string }>('select key, value from signal_config')
  const out: Record<string, number> = {}
  for (const r of rows) out[r.key] = Number(r.value)
  return out
}
