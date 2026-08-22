// server/src/scheduler.ts
// In-process scheduler. This is the whole reason the engine runs on Railway rather than
// serverless: there is no platform cadence cap here, and later phases need to hold WebSocket
// subscriptions open, which a request/response function cannot do.
//
// Each job is independently observable via cron_runs and guarded by a Postgres advisory lock,
// so overlapping ticks — or a second instance during a deploy — cannot double-write (§38, §39).

import { query, pool } from './db.js'

export interface Job {
  name: string
  everyMs: number
  run: () => Promise<{ eventsWritten?: number; targetsSeen?: number }>
}

/** Stable 32-bit key for pg_try_advisory_lock, derived from the job name. */
function lockKey(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0
  return h
}

async function runOnce(job: Job): Promise<void> {
  if (!pool) return
  const client = await pool.connect()
  const key = lockKey(job.name)

  try {
    const got = await client.query('select pg_try_advisory_lock($1) as ok', [key])
    if (!got.rows[0]?.ok) {
      console.log(`[scheduler] ${job.name} already running elsewhere — skipping this tick`)
      return
    }

    const started = await query<{ id: string }>(
      'insert into cron_runs (job, lock_key) values ($1,$2) returning id',
      [job.name, `${job.name}:${Date.now()}`],
    )
    const runId = started[0]?.id

    try {
      const out = await job.run()
      await query(
        `update cron_runs set finished_at = now(), status = 'ok',
                events_written = $2, targets_seen = $3 where id = $1`,
        [runId, out.eventsWritten ?? 0, out.targetsSeen ?? 0],
      )
      console.log(`[scheduler] ${job.name} ok`, out)
    } catch (e: any) {
      await query(
        `update cron_runs set finished_at = now(), status = 'error', errors = $2 where id = $1`,
        [runId, JSON.stringify({ message: String(e?.message || e) })],
      ).catch(() => {})
      console.error(`[scheduler] ${job.name} failed:`, e?.message || e)
    } finally {
      await client.query('select pg_advisory_unlock($1)', [key])
    }
  } finally {
    client.release()
  }
}

export function startScheduler(jobs: Job[]): () => void {
  const timers: NodeJS.Timeout[] = []

  for (const job of jobs) {
    // Stagger the first run so a cold start does not fire everything at once.
    const initialDelay = 5_000 + timers.length * 3_000
    const kick = setTimeout(() => {
      void runOnce(job)
      const t = setInterval(() => void runOnce(job), job.everyMs)
      timers.push(t)
    }, initialDelay)
    timers.push(kick)
  }

  return () => timers.forEach((t) => clearTimeout(t as unknown as NodeJS.Timeout))
}
