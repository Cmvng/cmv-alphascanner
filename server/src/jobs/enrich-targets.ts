// server/src/jobs/enrich-targets.ts
// Second pass over freshly-discovered targets.
//
// GeckoTerminal's new_pools feed is fast but thin — it gives an address and a pool, not a market
// cap or an X handle. Both matter: market cap drives the obscurity bonus (a target with no price
// is treated as unknown, deliberately scoring neutral), and the X handle is the ONLY join between
// discovery and the existing scanner. Without this pass, alpha_score stays null forever.

import { query } from '../db.js'
import type { DexScreenerProvider } from '../providers/dexscreener.js'

export interface EnrichResult {
  considered: number
  enriched: number
  handlesFound: number
}

export async function enrichTargets(
  dex: DexScreenerProvider,
  { limit = 40 }: { limit?: number } = {},
): Promise<EnrichResult> {
  // Prioritise targets we know least about but that are already showing signal.
  const rows = await query<{ id: string; chain: string; contract_address: string }>(
    `select id, chain, contract_address
       from targets
      where contract_address is not null
        and chain is not null
        and (market_cap_usd is null or x_handle is null)
        and first_seen_at > now() - interval '7 days'
      order by heat desc, last_event_at desc nulls last
      limit $1`,
    [limit],
  )

  const result: EnrichResult = { considered: rows.length, enriched: 0, handlesFound: 0 }

  for (const row of rows) {
    try {
      const info = await dex.enrich(row.chain, row.contract_address)
      if (!info) continue

      // coalesce: never overwrite a known value with a null from a partial response.
      await query(
        `update targets set
           name           = coalesce($2, name),
           symbol         = coalesce($3, symbol),
           x_handle       = coalesce($4, x_handle),
           liquidity_usd  = coalesce($5, liquidity_usd),
           market_cap_usd = coalesce($6, market_cap_usd),
           volume_24h_usd = coalesce($7, volume_24h_usd),
           pool_created_at= coalesce($8, pool_created_at),
           updated_at     = now()
         where id = $1`,
        [
          row.id,
          info.name ?? null,
          info.symbol ?? null,
          info.xHandle ?? null,
          info.liquidityUsd ?? null,
          info.marketCapUsd ?? null,
          info.volume24hUsd ?? null,
          info.poolCreatedAt ?? null,
        ],
      )
      result.enriched++
      if (info.xHandle) result.handlesFound++
    } catch (e: any) {
      console.warn('[enrich] target failed', row.id, e?.message)
    }
  }

  return result
}
