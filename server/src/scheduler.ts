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
  let locked = false

  try {
    const got = await client.query('select pg_try_advisory_lock($1) as ok', [key])
    locked = Boolean(got.rows[0]?.ok)
    if (!locked) {
      console.log(`[scheduler] ${job.name} already running elsewhere — skipping this tick`)
      return
    }

    let runId: string | undefined
    try {
      const started = await query<{ id: string }>(
        'insert into cron_runs (job, lock_key) values ($1,$2) returning id',
        [job.name, `${job.name}:${Date.now()}`],
      )
      runId = started[0]?.id

      const out = await job.run()
      await query(
        `update cron_runs set finished_at = now(), status = 'ok',
                events_written = $2, targets_seen = $3 where id = $1`,
        [runId, out.eventsWritten ?? 0, out.targetsSeen ?? 0],
      )
      console.log(`[scheduler] ${job.name} ok`, out)
    } catch (e: any) {
      // runId is undefined if the run could not even be recorded — still not fatal.
      if (runId) {
        await query(
          `update cron_runs set finished_at = now(), status = 'error', errors = $2 where id = $1`,
          [runId, JSON.stringify({ message: String(e?.message || e) })],
        ).catch(() => {})
      }
      console.error(`[scheduler] ${job.name} failed:`, e?.message || e)
    }
  } finally {
    // The unlock MUST live here, not beside the job body.
    //
    // Advisory locks are session-scoped and `client.release()` returns the connection to the
    // pool with its session intact — it does not release them. Previously the unlock sat in the
    // inner finally, so anything that threw between taking the lock and entering that block (the
    // `insert into cron_runs`, for instance) skipped it entirely and the lock was held for the
    // life of the process: one transient database error and that job never ran again.
    let destroyed = false
    if (locked) {
      try {
        await client.query('select pg_advisory_unlock($1)', [key])
      } catch (e: any) {
        // If the unlock itself fails the session is suspect. Destroy the connection instead of
        // returning a lock-holding session to the pool — a new one starts with no locks held.
        console.error(`[scheduler] ${job.name} unlock failed:`, e?.message || e)
        client.release(true)
        destroyed = true
      }
    }
    if (!destroyed) client.release()
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
