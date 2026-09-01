// server/src/lib/dedupe.ts
// Deterministic idempotency keys (§39). A repeated cron run — or two overlapping runs — must
// never write the same observation twice. The key is a pure function of the observation, and
// the database enforces it with a unique index.

import { createHash } from 'node:crypto'

/**
 * Collapse chain aliases to one canonical id. Providers disagree on spelling — GeckoTerminal
 * passes the operator's CHAINS string through verbatim, DexScreener reverse-maps its own ids —
 * so the same token could land under both 'eth' and 'ethereum', which the (kind, chain, address)
 * unique index treats as two targets: heat, risk and alerts computed twice, convergence between
 * the two providers never registering. Normalise before the key is built.
 */
export function canonicalChain(chain: string | null | undefined): string {
  const c = (chain ?? '').toLowerCase().trim()
  const alias: Record<string, string> = { ethereum: 'eth', mainnet: 'eth', 'ethereum-mainnet': 'eth' }
  return alias[c] ?? c
}

/**
 * Bucket a timestamp so near-identical observations of the same continuous fact collapse.
 * A new pool reported at 12:00:03 and 12:00:57 by the same source is one observation, not two.
 */
export function timeBucket(d: Date, bucketMinutes: number): string {
  const ms = bucketMinutes * 60_000
  return new Date(Math.floor(d.getTime() / ms) * ms).toISOString()
}

export interface DedupeInput {
  source: string
  eventType: string
  /** Stable identity of the target: contract address or handle, already lowercased. */
  targetKey: string
  occurredAt: Date
  bucketMinutes?: number
}

export function dedupeKey({
  source,
  eventType,
  targetKey,
  occurredAt,
  bucketMinutes = 10,
}: DedupeInput): string {
  const canonical = [
    source.trim().toLowerCase(),
    eventType.trim().toLowerCase(),
    targetKey.trim().toLowerCase(),
    timeBucket(occurredAt, bucketMinutes),
  ].join('|')
  return createHash('sha256').update(canonical).digest('hex').slice(0, 40)
}

/** Canonical identity for a target, used both for dedupe keys and for upserts. */
export function targetKeyOf(t: {
  chain?: string | null
  contractAddress?: string | null
  xHandle?: string | null
}): string {
  if (t.contractAddress) return `${canonicalChain(t.chain)}:${t.contractAddress.toLowerCase()}`
  if (t.xHandle) return `x:${t.xHandle.toLowerCase()}`
  return 'unknown'
}
