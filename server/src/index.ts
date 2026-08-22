// server/src/index.ts
// The Railway service: serves the built SPA, runs the existing api/* handlers through a small
// adapter, exposes /api/radar, and drives the in-process scheduler.

import express from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { existsSync } from 'node:fs'

import { hasDatabase, migrate } from './db.js'
import { radarRouter } from './routes/radar.js'
import { targetRouter } from './routes/target.js'
import { performanceRouter } from './routes/performance.js'
import { costsRouter } from './routes/costs.js'
import { watchlistRouter } from './routes/watchlist.js'
import { startScheduler } from './scheduler.js'
import { ingestOnchain } from './jobs/ingest-onchain.js'
import { computeHeatForAll } from './jobs/compute-heat.js'
import { enrichTargets } from './jobs/enrich-targets.js'
import { runAlphaScans } from './jobs/run-alpha-scans.js'
import { assessRisk } from './jobs/assess-risk.js'
import { assessProvenance } from './jobs/assess-provenance.js'
import { checkAllSources } from './lib/health.js'
import { dispatchAlerts } from './jobs/dispatch-alerts.js'
import { trackOutcomes } from './jobs/track-outcomes.js'
import { updateTrust } from './jobs/update-trust.js'
import { flushMeter } from './lib/meter.js'
import { GoPlusProvider } from './providers/goplus.js'
import { ProvenanceProvider } from './providers/provenance.js'
import { MintLogProvider } from './providers/mintlogs.js'
import { GeckoTerminalProvider } from './providers/geckoterminal.js'
import { DexScreenerProvider } from './providers/dexscreener.js'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../..')

const PORT = Number(process.env.PORT) || 3000
const CHAINS = (process.env.CHAINS || 'solana,base,eth').split(',').map((c) => c.trim()).filter(Boolean)
const SCHEDULER_ON = process.env.IN_PROCESS_SCHEDULER !== 'false'

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '2mb' }))

// ── health ──────────────────────────────────────────────────────────────────
app.get('/healthz', (_req, res) => {
  res.json({ ok: true, database: hasDatabase, chains: CHAINS, scheduler: SCHEDULER_ON })
})

// ── engine routes ───────────────────────────────────────────────────────────
app.use('/api', radarRouter)
app.use('/api', targetRouter)
app.use('/api', performanceRouter)
app.use('/api', costsRouter)
app.use('/api', watchlistRouter)

/**
 * Run the existing Vercel-style handlers unchanged.
 *
 * `VercelRequest`/`VercelResponse` are structurally Node's IncomingMessage/ServerResponse plus a
 * few conveniences that Express already provides (`req.query`, `req.body`, `res.status().json()`),
 * so the scan pipeline ports with no rewrite.
 */
const VERCEL_ROUTES = ['xproject', 'xuser', 'claude', 'save-scan', 'websearch', 'admin']
for (const name of VERCEL_ROUTES) {
  app.all(`/api/${name}`, async (req, res, next) => {
    try {
      // Run TypeScript directly (tsx) so the handlers stay in one place with no duplicate
      // build output and no second compile target to keep in sync.
      const mod = await import(`${repoRoot}/api/${name}.ts`)
      const handler = (mod as any).default
      if (typeof handler !== 'function') return next()
      await handler(req as any, res as any)
    } catch (e: any) {
      console.error(`[api/${name}] failed to load or run:`, e?.message)
      if (!res.headersSent) res.status(500).json({ error: 'handler_error' })
    }
  })
}

// ── static SPA ──────────────────────────────────────────────────────────────
const dist = join(repoRoot, 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }))
  // Client-side routing: anything not matched above falls back to the app shell.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(join(dist, 'index.html'))
  })
} else {
  console.warn('[server] dist/ not found — static SPA will not be served')
}

// ── boot ────────────────────────────────────────────────────────────────────
async function main() {
  if (hasDatabase) {
    try {
      await migrate()
      console.log('[server] migrations applied')
    } catch (e: any) {
      // A migration failure must not take the API down — the radar route reports unavailability
      // honestly rather than serving invented data.
      console.error('[server] migration failed:', e?.message)
    }
  } else {
    console.warn('[server] DATABASE_URL not set — engine routes will report unavailable')
  }

  const gecko = new GeckoTerminalProvider()
  const dex = new DexScreenerProvider()
  const goplus = new GoPlusProvider()
  // Domain provenance — free, keyless, and independent of anything onchain.
  const provenance = new ProvenanceProvider()
  // First non-price signal family: raw Transfer-from-zero logs. Free, keyless, and the only
  // coverage that exists for Stable and Robinhood Chain.
  const mintlogs = new MintLogProvider()
  const providers = [gecko, dex, mintlogs]

  const server = app.listen(PORT, () => {
    console.log(`[server] listening on :${PORT} | chains=${CHAINS.join(',')} | db=${hasDatabase}`)
  })

  let stopScheduler: (() => void) | undefined
  if (SCHEDULER_ON && hasDatabase) {
    stopScheduler = startScheduler([
      {
        name: 'ingest-onchain',
        everyMs: 10 * 60_000,
        run: async () => {
          const r = await ingestOnchain(providers, { chains: CHAINS })
          return { eventsWritten: r.eventsWritten, targetsSeen: r.targetsSeen }
        },
      },
      {
        // Fills in market cap (which drives the obscurity bonus) and the X handle (the only
        // join to the scanner). Runs between ingest and heat so scores use the best data.
        name: 'enrich-targets',
        everyMs: 10 * 60_000,
        run: async () => {
          const r = await enrichTargets(dex)
          return { targetsSeen: r.considered }
        },
      },
      {
        name: 'compute-heat',
        everyMs: 10 * 60_000,
        run: async () => {
          const r = await computeHeatForAll()
          return { targetsSeen: r.targetsScored }
        },
      },
      {
        // Risk is assessed independently of heat and alpha (§21). Free, so it runs broadly.
        name: 'assess-risk',
        everyMs: 12 * 60_000,
        run: async () => {
          const r = await assessRisk(goplus)
          return { targetsSeen: r.assessed }
        },
      },
      {
        // Provenance changes on a scale of months, so it runs on a long cycle and re-checks
        // weekly. Spending rate limit to re-read a registration date would buy nothing.
        name: 'assess-provenance',
        everyMs: 45 * 60_000,
        run: async () => {
          const r = await assessProvenance(provenance)
          return { targetsSeen: r.assessed }
        },
      },
      {
        // The only automatic spender. Gated by a heat threshold, a per-run cap and a 24h
        // cooldown, so a target hovering at the threshold cannot bill us every cycle.
        name: 'run-alpha-scans',
        everyMs: 15 * 60_000,
        run: async () => {
          const r = await runAlphaScans()
          return { targetsSeen: r.scanned }
        },
      },
      {
        // The feedback loop: snapshot each detection immutably, then measure forward at fixed
        // horizons. This is what lets the engine prove -- or disprove -- its own usefulness.
        name: 'track-outcomes',
        everyMs: 20 * 60_000,
        run: async () => {
          const r = await trackOutcomes(dex)
          return { targetsSeen: r.snapshotted + r.measured }
        },
      },
      {
        // Probes every provider, INCLUDING the risk sources, which run outside the discovery
        // pass and therefore never reported health at all before (§31).
        name: 'check-sources',
        everyMs: 15 * 60_000,
        run: async () => {
          const r = await checkAllSources([...providers, goplus, provenance])
          return { targetsSeen: r.ok + r.down }
        },
      },
      {
        // Metering is buffered in memory so it never adds a round-trip to the path it observes.
        name: 'flush-meter',
        everyMs: 5 * 60_000,
        run: async () => ({ eventsWritten: await flushMeter() }),
      },
      {
        // Closes the loop: outcomes feed back into how much each entity's signals are worth.
        // Hourly, because trust should move on evidence rather than on every tick.
        name: 'update-trust',
        everyMs: 60 * 60_000,
        run: async () => {
          const r = await updateTrust()
          return { targetsSeen: r.updated }
        },
      },
      {
        // A radar you have to visit is still pull-based. This is the step that makes
        // "never miss alpha" literal rather than aspirational.
        name: 'dispatch-alerts',
        everyMs: 5 * 60_000,
        run: async () => {
          const r = await dispatchAlerts()
          return { targetsSeen: r.sent }
        },
      },
    ])
    console.log('[server] scheduler started (10m cadence, no platform cap)')
  }

  const shutdown = (sig: string) => {
    console.log(`[server] ${sig} — shutting down`)
    stopScheduler?.()
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 10_000).unref()
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

void main()
