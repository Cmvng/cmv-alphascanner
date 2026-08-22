// server/src/index.ts
// The Railway service: serves the built SPA, runs the existing api/* handlers through a small
// adapter, exposes /api/radar, and drives the in-process scheduler.

import express from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { existsSync } from 'node:fs'

import { hasDatabase, migrate } from './db.js'
import { radarRouter } from './routes/radar.js'
import { startScheduler } from './scheduler.js'
import { ingestOnchain } from './jobs/ingest-onchain.js'
import { computeHeatForAll } from './jobs/compute-heat.js'
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

  const providers = [new GeckoTerminalProvider(), new DexScreenerProvider()]

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
        name: 'compute-heat',
        everyMs: 10 * 60_000,
        run: async () => {
          const r = await computeHeatForAll()
          return { targetsSeen: r.targetsScored }
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
