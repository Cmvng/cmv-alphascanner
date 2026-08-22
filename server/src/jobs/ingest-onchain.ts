// server/src/jobs/ingest-onchain.ts
// Discovery pass: ask every provider what is new, qualify it, and write events.
//
// One dead provider must never break a run — every provider is wrapped in allSettled and its
// health is recorded either way (§31).

import { query, loadConfig } from '../db.js'
import { recordSourceHealth } from '../lib/health.js'
import { dedupeKey, targetKeyOf } from '../lib/dedupe.js'
import type { Discovery, DiscoveryProvider } from '../providers/types.js'

export interface IngestResult {
  targetsSeen: number
  targetsQualified: number
  eventsWritten: number
  errors: Array<{ source: string; error: string }>
}

/**
 * Qualification floor, applied at WRITE time.
 *
 * This is the cheapest and most important cost lever in the whole engine: 985monitor only tracks
 * wallets above a holdings floor and tokens above a market-cap floor, which is why a 5-minute
 * refresh is affordable for them at all. Without it, signal_events fills with dust and every
 * downstream query gets slower for no added signal.
 */
function qualifies(d: Discovery, cfg: Record<string, number>): boolean {
  const minLiq = cfg['floor.liquidity_usd'] ?? 0
  const minVol = cfg['floor.volume_24h_usd'] ?? 0
  const liq = d.target.liquidityUsd
  const vol = d.target.volume24hUsd

  // Unknown is not the same as zero. A brand-new pool legitimately has no 24h volume yet, so a
  // missing figure must not disqualify it — only a figure we have and that is genuinely too low.
  if (liq !== null && liq < minLiq) return false
  if (vol !== null && vol < minVol && (liq === null || liq < minLiq)) return false
  return true
}

async function upsertTarget(d: Discovery): Promise<string> {
  const t = d.target
  const rows = await query<{ id: string }>(
    `insert into targets
       (kind, chain, contract_address, x_handle, name, symbol,
        audience_size, liquidity_usd, market_cap_usd, volume_24h_usd, pool_created_at, last_event_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
     on conflict (kind, chain, lower(contract_address)) where contract_address is not null
     do update set
       name           = coalesce(excluded.name,           targets.name),
       symbol         = coalesce(excluded.symbol,         targets.symbol),
       liquidity_usd  = coalesce(excluded.liquidity_usd,  targets.liquidity_usd),
       market_cap_usd = coalesce(excluded.market_cap_usd, targets.market_cap_usd),
       volume_24h_usd = coalesce(excluded.volume_24h_usd, targets.volume_24h_usd),
       pool_created_at= coalesce(excluded.pool_created_at,targets.pool_created_at),
       last_event_at  = now(),
       updated_at     = now()
     returning id`,
    [
      t.kind, t.chain, t.contractAddress, t.xHandle, t.name, t.symbol,
      t.audienceSize, t.liquidityUsd, t.marketCapUsd, t.volume24hUsd, t.poolCreatedAt,
    ],
  )
  return rows[0].id
}

export async function ingestOnchain(
  providers: DiscoveryProvider[],
  opts: { chains: string[] },
): Promise<IngestResult> {
  const cfg = await loadConfig()
  const maxAgeHours = cfg['floor.max_age_hours'] ?? 168

  const result: IngestResult = { targetsSeen: 0, targetsQualified: 0, eventsWritten: 0, errors: [] }

  const settled = await Promise.allSettled(
    providers.map(async (p) => ({ provider: p, discoveries: await p.discover({ chains: opts.chains, maxAgeHours }) })),
  )

  for (let i = 0; i < settled.length; i++) {
    const s = settled[i]
    const provider = providers[i]

    if (s.status === 'rejected') {
      const error = String(s.reason?.message || s.reason)
      result.errors.push({ source: provider.id, error })
      await recordSourceHealth(provider.id, false, null, error)
      continue
    }

    await recordSourceHealth(provider.id, true, null)

    for (const d of s.value.discoveries) {
      result.targetsSeen++
      if (!qualifies(d, cfg)) continue
      result.targetsQualified++

      try {
        const targetId = await upsertTarget(d)
        const key = targetKeyOf(d.target)

        for (const e of d.events) {
          const dk = dedupeKey({
            source: provider.id,
            eventType: e.eventType,
            targetKey: key,
            occurredAt: e.occurredAt,
          })
          // ON CONFLICT DO NOTHING is what makes a duplicate cron run harmless (§39).
          const written = await query(
            `insert into signal_events
               (target_id, source, event_type, occurred_at, confidence, dedupe_key, raw, raw_reference)
             values ($1,$2,$3,$4,$5,$6,$7,$8)
             on conflict (dedupe_key) do nothing
             returning id`,
            [targetId, provider.id, e.eventType, e.occurredAt, e.confidence, dk, JSON.stringify(e.raw ?? null), e.rawReference],
          )
          if (written.length > 0) result.eventsWritten++
        }
      } catch (err: any) {
        result.errors.push({ source: provider.id, error: String(err?.message || err) })
      }
    }
  }

  return result
}
