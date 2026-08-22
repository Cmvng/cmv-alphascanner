// server/src/providers/goplus.ts
//
// Risk indicators. One free call returns ~15 of them across EVM and Solana, which makes this the
// best signal-per-integration-hour source available (~30 calls/min, no auth).
//
// TWO RULES GOVERN EVERYTHING IN THIS FILE:
//
// 1. "No indicator found" and "not checked" are different answers. The allSettled+null pattern
//    used for enrichment is WRONG here — a check that times out would render as a clean bill of
//    health the system never issued. Every check carries `checked` and, when false, a `reason`.
//
// 2. No output names an actor, asserts intent, or predicts an outcome. Each one states an
//    observable on-chain property and its consequence. The words scam/rug/fraud/fake never
//    appear in user-facing strings.

import { RateLimiter, fetchWithTimeout, CircuitBreaker } from '../lib/net.js'
import { meter } from '../lib/meter.js'

const BASE = 'https://api.gopluslabs.io/api/v1'

/** Our chain ids -> GoPlus numeric chain ids. Solana has its own endpoint. */
const EVM_CHAIN_IDS: Record<string, string> = {
  eth: '1',
  ethereum: '1',
  base: '8453',
  bsc: '56',
}

export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface RiskIndicator {
  key: string
  /** Short neutral label. Never an accusation. */
  indicator: string
  severity: Severity
  /** What was observed, stated as fact. */
  observation: string
  /** What that enables or implies — with a mitigating clause where one is honest. */
  implication: string
  source: string
}

export interface RiskCheck {
  key: string
  /** false => we could not run this check. Must render differently from "no issue found". */
  checked: boolean
  reason?: 'source_unavailable' | 'chain_unsupported' | 'not_applicable' | 'no_data'
  /** Present only when checked === true. */
  indicator: RiskIndicator | null
}

export interface RiskAssessment {
  checks: RiskCheck[]
  /** Counts by severity — never a single verdict word. */
  summary: Record<Severity, number>
  /** How many checks actually ran, so the UI can say "12 of 15 checked". */
  checkedCount: number
  totalCount: number
  assessedAt: Date
}

function pct(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : null
}

const truthy = (v: unknown) => v === '1' || v === 1 || v === true

/** A check we could not run. Rendered distinctly from a passing check. */
function unchecked(key: string, reason: RiskCheck['reason']): RiskCheck {
  return { key, checked: false, reason, indicator: null }
}

/** A check that ran and found nothing of concern. This is information too — show it. */
function clear(key: string): RiskCheck {
  return { key, checked: true, indicator: null }
}

function flag(key: string, i: Omit<RiskIndicator, 'key' | 'source'>): RiskCheck {
  return { key, checked: true, indicator: { key, source: 'goplus', ...i } }
}

export class GoPlusProvider {
  readonly id = 'goplus'
  readonly displayName = 'GoPlus Security'
  readonly rateLimitPerMin = 30

  private limiter = new RateLimiter(this.rateLimitPerMin)
  private breaker = new CircuitBreaker()
  private lastError: string | undefined

  private async get(path: string): Promise<any | null> {
    if (this.breaker.isOpen) return null
    await this.limiter.take()
    try {
      const r = await fetchWithTimeout(`${BASE}${path}`, { timeoutMs: 10_000 })
      if (!r.ok) {
        this.lastError = `HTTP ${r.status}`
        this.breaker.recordFailure()
        meter('goplus', false)
        return null
      }
      this.breaker.recordSuccess()
      this.lastError = undefined
      meter('goplus', true)
      return await r.json()
    } catch (e: any) {
      this.lastError = e?.name === 'AbortError' ? 'timeout' : String(e?.message || e)
      this.breaker.recordFailure()
      meter('goplus', false)
      return null
    }
  }

  async assess(chain: string, address: string): Promise<RiskAssessment> {
    const isSolana = chain.toLowerCase() === 'solana'
    const evmId = EVM_CHAIN_IDS[chain.toLowerCase()]

    if (!isSolana && !evmId) {
      const keys = EVM_KEYS
      return finalise(keys.map((k) => unchecked(k, 'chain_unsupported')))
    }

    const path = isSolana
      ? `/solana/token_security?contract_addresses=${encodeURIComponent(address)}`
      : `/token_security/${evmId}?contract_addresses=${encodeURIComponent(address.toLowerCase())}`

    const body = await this.get(path)
    const keys = isSolana ? SOLANA_KEYS : EVM_KEYS

    // Source down => every check is UNCHECKED, not "clean".
    if (!body) return finalise(keys.map((k) => unchecked(k, 'source_unavailable')))

    const result = body?.result ?? {}
    const data = result[address] ?? result[address.toLowerCase()] ?? Object.values(result)[0]
    if (!data || typeof data !== 'object') {
      return finalise(keys.map((k) => unchecked(k, 'no_data')))
    }

    return finalise(isSolana ? solanaChecks(data) : evmChecks(data))
  }

  async healthCheck() {
    const started = Date.now()
    // A well-known token on Ethereum, purely as a liveness probe.
    const body = await this.get('/token_security/1?contract_addresses=0xdac17f958d2ee523a2206206994597c13d831ec7')
    return { ok: !!body, latencyMs: Date.now() - started, error: body ? undefined : this.lastError }
  }
}

// ── check keys, so an unavailable source still reports the full list ────────
const EVM_KEYS = [
  'ownership', 'upgradeable', 'mintable', 'honeypot', 'sellable',
  'transfer_tax', 'transfer_pausable', 'blacklist', 'lp_locked', 'holder_concentration',
]
const SOLANA_KEYS = [
  'mint_authority', 'freeze_authority', 'metadata_mutable', 'transfer_fee', 'transferable',
]

function finalise(checks: RiskCheck[]): RiskAssessment {
  const summary: Record<Severity, number> = { low: 0, medium: 0, high: 0, critical: 0 }
  for (const c of checks) if (c.indicator) summary[c.indicator.severity]++
  return {
    checks,
    summary,
    checkedCount: checks.filter((c) => c.checked).length,
    totalCount: checks.length,
    assessedAt: new Date(),
  }
}

// ── EVM ─────────────────────────────────────────────────────────────────────
function evmChecks(d: any): RiskCheck[] {
  const out: RiskCheck[] = []

  // Ownership
  const owner = typeof d.owner_address === 'string' ? d.owner_address : ''
  const renounced = !owner || /^0x0{40}$/i.test(owner)
  out.push(
    renounced
      ? clear('ownership')
      : flag('ownership', {
          indicator: 'Contract ownership retained',
          severity: truthy(d.can_take_back_ownership) || truthy(d.hidden_owner) ? 'high' : 'medium',
          observation: 'The contract has an active owner address.',
          implication:
            'Privileged functions remain callable by the owner. Retained ownership is also normal for many actively-maintained projects.',
        }),
  )

  out.push(
    truthy(d.is_proxy)
      ? flag('upgradeable', {
          indicator: 'Upgradeable contract detected',
          severity: 'medium',
          observation: 'The contract matches a known upgradeable proxy pattern.',
          implication:
            'Contract logic can be changed after deployment. Upgradeability is also a deliberate design choice for many established projects.',
        })
      : clear('upgradeable'),
  )

  out.push(
    truthy(d.is_mintable)
      ? flag('mintable', {
          indicator: 'Supply can be increased',
          severity: 'high',
          observation: 'The contract exposes a mint function.',
          implication: 'Additional supply can be created, which would dilute existing holders.',
        })
      : clear('mintable'),
  )

  // Honeypot — the one place CRITICAL is defensible, because it is behavioural.
  out.push(
    truthy(d.is_honeypot)
      ? flag('honeypot', {
          indicator: 'Honeypot indicators present',
          severity: 'critical',
          observation: 'Analysis of the contract indicates buys may succeed while sells do not.',
          implication:
            'Under the conditions analysed, this token may not be sellable. Contract state can change.',
        })
      : clear('honeypot'),
  )

  out.push(
    truthy(d.cannot_sell_all) || truthy(d.cannot_buy)
      ? flag('sellable', {
          indicator: 'Trading restrictions detected',
          severity: 'high',
          observation: 'The contract restricts buying, or prevents selling the full balance.',
          implication: 'Positions may not be fully exitable under the conditions analysed.',
        })
      : clear('sellable'),
  )

  const buy = pct(d.buy_tax)
  const sell = pct(d.sell_tax)
  if (buy === null && sell === null) out.push(unchecked('transfer_tax', 'no_data'))
  else {
    const worst = Math.max(buy ?? 0, sell ?? 0) * 100
    out.push(
      worst >= 10
        ? flag('transfer_tax', {
            indicator: 'High transfer tax',
            severity: worst >= 25 ? 'high' : 'medium',
            observation: `Buy tax ${((buy ?? 0) * 100).toFixed(1)}%, sell tax ${((sell ?? 0) * 100).toFixed(1)}%.`,
            implication: 'A significant share of each trade is taken by the contract.',
          })
        : clear('transfer_tax'),
    )
  }

  out.push(
    truthy(d.transfer_pausable)
      ? flag('transfer_pausable', {
          indicator: 'Transfers can be paused',
          severity: 'high',
          observation: 'The contract exposes a function that can halt transfers.',
          implication: 'Transfers, including sells, can be disabled by whoever holds that permission.',
        })
      : clear('transfer_pausable'),
  )

  out.push(
    truthy(d.is_blacklisted)
      ? flag('blacklist', {
          indicator: 'Address blacklist present',
          severity: 'medium',
          observation: 'The contract can block specific addresses from transferring.',
          implication: 'Individual holders can be prevented from selling.',
        })
      : clear('blacklist'),
  )

  // LP lock — report coverage, and state the limitation honestly.
  const lps: any[] = Array.isArray(d.lp_holders) ? d.lp_holders : []
  if (lps.length === 0) out.push(unchecked('lp_locked', 'no_data'))
  else {
    const lockedPct = lps
      .filter((h) => truthy(h.is_locked) || /^0x0{40}$|dead$/i.test(String(h.address ?? '')))
      .reduce((sum, h) => sum + (pct(h.percent) ?? 0), 0) * 100
    const locker = lps.find((h) => truthy(h.is_locked) && h.tag)?.tag
    out.push(
      lockedPct < 50
        ? flag('lp_locked', {
            indicator: 'Liquidity not locked or burned',
            severity: lockedPct < 10 ? 'high' : 'medium',
            observation: `${lockedPct.toFixed(0)}% of LP tokens are held by a recognised locker contract or burn address.`,
            implication:
              'The remainder can be withdrawn from the pool at any time. A locker we do not recognise reads as unlocked here.',
          })
        : clear('lp_locked'),
    )
    if (locker) { /* locker name retained in raw payload for the detail view */ }
  }

  const holders: any[] = Array.isArray(d.holders) ? d.holders : []
  if (holders.length === 0) out.push(unchecked('holder_concentration', 'no_data'))
  else {
    const top10 = holders.slice(0, 10).reduce((s, h) => s + (pct(h.percent) ?? 0), 0) * 100
    const unlabelled = holders.slice(0, 10).filter((h) => !truthy(h.is_contract) && !h.tag).length
    out.push(
      top10 >= 70
        ? flag('holder_concentration', {
            indicator: 'Concentrated token supply',
            severity: top10 >= 90 ? 'high' : 'medium',
            observation: `The top 10 addresses hold ${top10.toFixed(0)}% of supply; ${unlabelled} are not identified as contracts or known wallets.`,
            implication:
              'A small number of addresses can move a large share of supply. Concentration alone is expected in early-stage and recently-launched tokens.',
          })
        : clear('holder_concentration'),
    )
  }

  return out
}

// ── Solana ──────────────────────────────────────────────────────────────────
function solanaChecks(d: any): RiskCheck[] {
  const out: RiskCheck[] = []
  const mintable = d.mintable
  const freezable = d.freezable

  out.push(
    mintable === undefined
      ? unchecked('mint_authority', 'no_data')
      : truthy(mintable?.status)
        ? flag('mint_authority', {
            indicator: 'Mint authority not revoked',
            severity: 'high',
            observation: 'The mint authority is still assigned to an address.',
            implication:
              'The holder of this authority can create additional supply at any time, diluting existing holders.',
          })
        : clear('mint_authority'),
  )

  out.push(
    freezable === undefined
      ? unchecked('freeze_authority', 'no_data')
      : truthy(freezable?.status)
        ? flag('freeze_authority', {
            indicator: 'Freeze authority not revoked',
            severity: 'high',
            observation: 'The freeze authority is still assigned to an address.',
            implication: 'Token accounts can be frozen, which would prevent holders from transferring.',
          })
        : clear('freeze_authority'),
  )

  out.push(
    d.metadata_mutable === undefined
      ? unchecked('metadata_mutable', 'no_data')
      : truthy(d.metadata_mutable?.status)
        ? flag('metadata_mutable', {
            indicator: 'Token metadata is mutable',
            severity: 'low',
            observation: 'Name, symbol and image can still be changed by the update authority.',
            implication:
              'The token can be made to resemble a different project later. Mutable metadata is also common and often benign.',
          })
        : clear('metadata_mutable'),
  )

  const fee = pct(d.transfer_fee?.max_fee ?? d.transfer_fee)
  out.push(
    fee === null
      ? unchecked('transfer_fee', 'no_data')
      : fee > 0
        ? flag('transfer_fee', {
            indicator: 'Transfer fee configured',
            severity: fee >= 10 ? 'high' : 'medium',
            observation: `A transfer fee of up to ${fee}% is configured on this mint.`,
            implication: 'A share of each transfer is taken by the fee authority.',
          })
        : clear('transfer_fee'),
  )

  out.push(
    truthy(d.non_transferable)
      ? flag('transferable', {
          indicator: 'Token is non-transferable',
          severity: 'critical',
          observation: 'The mint is configured as non-transferable.',
          implication: 'Holders cannot move or sell this token.',
        })
      : clear('transferable'),
  )

  return out
}
