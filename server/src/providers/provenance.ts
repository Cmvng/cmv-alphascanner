// server/src/providers/provenance.ts
//
// Project provenance — how long the public footprint has existed (§22).
//
// The spec calls this "scam/LARP detection". That name cannot survive contact with the data:
// nothing free tells you intent, and a detector that claims to is worse than no detector, because
// a confident wrong answer gets acted on. What IS knowable, for free and without a key, is how
// old the project's public surface is:
//
//   RDAP   — the ICANN-mandated successor to WHOIS. Registration and expiry dates, JSON, keyless.
//   crt.sh — Certificate Transparency mirror. Every publicly-trusted certificate ever issued for
//            a domain, with dates. Slow and frequently overloaded, so it must degrade cleanly.
//
// Age is context, not a verdict. Every legitimate project was three days old once. The value is
// in the CONTRADICTION: a project describing years of history on a domain registered last week is
// a discrepancy a reader can check for themselves. We surface the dates and let them do that.
//
// Deliberately NOT checked: WHOIS privacy/redaction. Post-GDPR, registrars redact by default and
// most large registrars do it automatically, so "hidden owner" is now the norm rather than a
// signal. Flagging it would generate noise on essentially every domain — several commercial
// "scam checkers" still do, and it is why their outputs are ignored.

import { RateLimiter, fetchWithTimeout, CircuitBreaker } from '../lib/net.js'
import { meter } from '../lib/meter.js'
import type { RiskAssessment, RiskCheck, Severity } from './goplus.js'

const DAY = 86_400_000

/** Hosts that are never a project's own domain, so an age check on them means nothing. */
const NOT_PROJECT_DOMAINS = new Set([
  'x.com', 'twitter.com', 't.me', 'telegram.me', 'discord.gg', 'discord.com',
  'medium.com', 'github.com', 'linktr.ee', 'dexscreener.com', 'geckoterminal.com',
  'pump.fun', 'raydium.io', 'uniswap.org', 'birdeye.so', 'dextools.io',
])

/**
 * Reduce a URL to the registrable domain, which is what RDAP is keyed on.
 *
 * This uses the naive "last two labels" rule, which is wrong for multi-part suffixes like
 * `.co.uk`. A full Public Suffix List would fix it but is a dependency, and getting it wrong
 * fails safe here: RDAP returns nothing for `co.uk` and the check reports itself unchecked
 * rather than inventing an age.
 */
export function registrableDomain(input: string | null): string | null {
  if (!input) return null
  let host: string
  try {
    host = new URL(input.includes('://') ? input : `https://${input}`).hostname.toLowerCase()
  } catch {
    return null
  }
  if (!host || host.split('.').length < 2) return null
  const parts = host.replace(/^www\./, '').split('.')
  const domain = parts.slice(-2).join('.')
  if (NOT_PROJECT_DOMAINS.has(domain)) return null
  return domain
}

function unchecked(key: string, reason: RiskCheck['reason']): RiskCheck {
  return { key, checked: false, reason, indicator: null }
}

function clear(key: string): RiskCheck {
  return { key, checked: true, indicator: null }
}

function flag(
  key: string,
  severity: Severity,
  indicator: string,
  observation: string,
  implication: string,
): RiskCheck {
  return { key, checked: true, indicator: { key, source: 'provenance', severity, indicator, observation, implication } }
}

function days(from: Date, to = new Date()): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY)
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

export interface ProvenanceThresholds {
  newDomainDays: number
  youngDomainDays: number
}

export const DEFAULT_PROVENANCE_THRESHOLDS: ProvenanceThresholds = {
  newDomainDays: 7,
  youngDomainDays: 30,
}

export class ProvenanceProvider {
  readonly id = 'provenance'
  readonly displayName = 'Domain provenance'
  // RDAP publishes no universal limit and bootstrap servers vary; crt.sh is routinely overloaded.
  // Deliberately slow — this data changes on a scale of months, so there is nothing to gain by
  // asking quickly.
  readonly rateLimitPerMin = 10

  private limiter = new RateLimiter(this.rateLimitPerMin)
  private rdapBreaker = new CircuitBreaker()
  private crtBreaker = new CircuitBreaker()
  private lastError: string | undefined

  /**
   * RDAP registration and expiry. `rdap.org` is a redirector to whichever registry is
   * authoritative for the TLD, which avoids hard-coding the bootstrap table.
   */
  private async rdap(domain: string): Promise<{ registered: Date | null; expires: Date | null } | null> {
    if (this.rdapBreaker.isOpen) return null
    await this.limiter.take()
    try {
      const r = await fetchWithTimeout(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
        headers: { Accept: 'application/rdap+json' },
        timeoutMs: 9000,
        redirect: 'follow',
      })
      // 404 is a real answer: no such registration. It is not a failure, but it is also not an
      // age, so the caller still reports the check as unrun rather than inventing one.
      if (!r.ok) {
        this.lastError = `rdap HTTP ${r.status}`
        if (r.status >= 500) this.rdapBreaker.recordFailure()
        meter('provenance', false)
        return null
      }
      const body: any = await r.json()
      this.rdapBreaker.recordSuccess()
      meter('provenance', true)

      const events: any[] = Array.isArray(body?.events) ? body.events : []
      const pick = (action: string): Date | null => {
        const e = events.find((x) => String(x?.eventAction).toLowerCase() === action)
        const d = e?.eventDate ? new Date(e.eventDate) : null
        return d && Number.isFinite(d.getTime()) ? d : null
      }
      return { registered: pick('registration'), expires: pick('expiration') }
    } catch (e: any) {
      this.lastError = e?.name === 'AbortError' ? 'rdap timeout' : String(e?.message || e)
      this.rdapBreaker.recordFailure()
      meter('provenance', false)
      return null
    }
  }

  /**
   * Earliest publicly-logged certificate for the domain, from Certificate Transparency.
   *
   * This is an independent witness to the registration date. They usually agree; when they do
   * not — certificates starting long after registration, or a gap in the middle — the domain was
   * probably parked, dropped, or re-registered, and any claim of continuous history is checkable
   * against that.
   */
  private async firstCertificate(domain: string): Promise<Date | null> {
    if (this.crtBreaker.isOpen) return null
    await this.limiter.take()
    try {
      const r = await fetchWithTimeout(
        // No exclude=expired: we want the EARLIEST certificate ever issued (the true first public
        // presence), and expired certs are exactly the old ones that answer prove the domain is not new.
        `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`,
        { headers: { Accept: 'application/json' }, timeoutMs: 15_000 },
      )
      if (!r.ok) {
        this.lastError = `crt.sh HTTP ${r.status}`
        this.crtBreaker.recordFailure()
        meter('provenance', false)
        return null
      }
      const body: any = await r.json()
      this.crtBreaker.recordSuccess()
      meter('provenance', true)
      if (!Array.isArray(body) || body.length === 0) return null

      let earliest: number | null = null
      for (const row of body) {
        const t = row?.not_before ? Date.parse(String(row.not_before).replace(' ', 'T') + 'Z') : NaN
        if (Number.isFinite(t) && (earliest === null || t < earliest)) earliest = t
      }
      return earliest === null ? null : new Date(earliest)
    } catch (e: any) {
      this.lastError = e?.name === 'AbortError' ? 'crt.sh timeout' : String(e?.message || e)
      this.crtBreaker.recordFailure()
      meter('provenance', false)
      return null
    }
  }

  /**
   * Assess one project's public footprint. Always returns an assessment — a target with no
   * website produces four explicitly-unrun checks, which is a different and more useful answer
   * than an empty result.
   */
  async assess(
    website: string | null,
    thresholds: ProvenanceThresholds = DEFAULT_PROVENANCE_THRESHOLDS,
  ): Promise<RiskAssessment & { domain: string | null }> {
    const checks: RiskCheck[] = []
    const domain = registrableDomain(website)

    if (!domain) {
      // Having no website is itself worth stating — but as an absence of information, not as a
      // finding against the project. Plenty of real tokens launch with only a social account.
      for (const key of ['domain_age', 'domain_expiry', 'certificate_history', 'certificate_gap']) {
        checks.push(unchecked(key, 'no_domain'))
      }
      return { ...summarise(checks), domain: null }
    }

    const [reg, firstCert] = await Promise.all([this.rdap(domain), this.firstCertificate(domain)])

    // ── domain age ──────────────────────────────────────────────────────────
    if (!reg) {
      checks.push(unchecked('domain_age', 'source_unavailable'))
      checks.push(unchecked('domain_expiry', 'source_unavailable'))
    } else if (!reg.registered) {
      // The registry answered but withheld the date — some ccTLDs do. Not a failure of ours.
      checks.push(unchecked('domain_age', 'no_data'))
      checks.push(reg.expires ? expiryCheck(reg.expires) : unchecked('domain_expiry', 'no_data'))
    } else {
      const age = days(reg.registered)
      const on = reg.registered.toISOString().slice(0, 10)
      if (age <= thresholds.newDomainDays) {
        checks.push(
          flag(
            'domain_age',
            'medium',
            'Domain registered very recently',
            `The project domain ${domain} was registered on ${on}, ${plural(Math.max(age, 0), 'day')} ago.`,
            'Every new project starts here, so this is not itself a problem. It matters as a cross-check: if the project describes a history longer than its domain has existed, the two claims disagree.',
          ),
        )
      } else if (age <= thresholds.youngDomainDays) {
        checks.push(
          flag(
            'domain_age',
            'low',
            'Domain is less than a month old',
            `The project domain ${domain} was registered on ${on}, ${plural(age, 'day')} ago.`,
            'Consistent with a recent launch. Compare it against how long the project says it has been building.',
          ),
        )
      } else {
        checks.push(clear('domain_age'))
      }
      checks.push(reg.expires ? expiryCheck(reg.expires) : unchecked('domain_expiry', 'no_data'))
    }

    // ── certificate history ─────────────────────────────────────────────────
    if (!firstCert) {
      checks.push(unchecked('certificate_history', 'source_unavailable'))
    } else {
      const certAge = days(firstCert)
      if (certAge <= thresholds.newDomainDays) {
        checks.push(
          flag(
            'certificate_history',
            'low',
            'First certificate issued very recently',
            `The earliest public certificate for ${domain} was issued ${plural(Math.max(certAge, 0), 'day')} ago.`,
            'Independent confirmation that the site went live recently, from a source separate from the registry.',
          ),
        )
      } else {
        checks.push(clear('certificate_history'))
      }
    }

    // ── registration vs certificates ────────────────────────────────────────
    // The only check here that can catch something the others cannot: a long-registered domain
    // whose public presence started last week. That is the shape of a dropped domain bought for
    // its age, and it is invisible if you only look at the registration date.
    if (!reg?.registered || !firstCert) {
      checks.push(unchecked('certificate_gap', 'no_data'))
    } else {
      const gapDays = days(reg.registered, firstCert)
      if (gapDays > 365 && days(firstCert) <= thresholds.youngDomainDays) {
        checks.push(
          flag(
            'certificate_gap',
            'medium',
            'Domain is old but its public presence is new',
            `${domain} was registered ${plural(days(reg.registered), 'day')} ago, but its first public certificate appeared only ${plural(days(firstCert), 'day')} ago — a gap of about ${Math.round(gapDays / 365)} year(s).`,
            'A domain can be old because it was held continuously, or because it expired and was re-registered later. Both look identical in a registration date alone, so treat the domain\'s age as evidence of the current site only from the certificate date onward.',
          ),
        )
      } else {
        checks.push(clear('certificate_gap'))
      }
    }

    return { ...summarise(checks), domain }
  }

  async healthCheck() {
    const started = Date.now()
    // A domain that has existed for decades and will not disappear — if RDAP cannot answer for
    // this, the problem is ours or the redirector's, not the target's.
    const out = await this.rdap('iana.org')
    return out
      ? { ok: true, latencyMs: Date.now() - started }
      : { ok: false, latencyMs: Date.now() - started, error: this.lastError || 'unknown' }
  }
}

/** Domain about to lapse. A site that stops resolving next month is a fact worth knowing. */
function expiryCheck(expires: Date): RiskCheck {
  const left = days(new Date(), expires)
  if (left > 60) return clear('domain_expiry')
  if (left < 0) {
    return flag(
      'domain_expiry',
      'high',
      'Domain registration has lapsed',
      `The registration for this domain expired ${plural(-left, 'day')} ago.`,
      'An expired domain can stop resolving at any time and can be re-registered by anyone once it is released — including by someone other than the original project.',
    )
  }
  return flag(
    'domain_expiry',
    'low',
    'Domain registration expires soon',
    `The registration expires in ${plural(left, 'day')}.`,
    'Often just a renewal that has not happened yet. Worth noting only because a lapsed domain can be picked up by anyone.',
  )
}

/** Counts by severity plus the checked/total split — never a single verdict word (§18). */
function summarise(checks: RiskCheck[]): RiskAssessment {
  const summary: Record<Severity, number> = { low: 0, medium: 0, high: 0, critical: 0 }
  let checkedCount = 0
  for (const c of checks) {
    if (!c.checked) continue
    checkedCount++
    if (c.indicator) summary[c.indicator.severity]++
  }
  return { checks, summary, checkedCount, totalCount: checks.length, assessedAt: new Date() }
}
