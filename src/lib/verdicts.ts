// src/lib/verdicts.ts
// ONE definition of the verdict vocabulary, consumed by every page.
//
// The bug this fixes: home.tsx emits ALPHA PLAY / FARM IT / ENGAGE / OBSERVE / AVOID, while
// feed.tsx, tierlist.tsx and admin.tsx still expected FARM IT / CREATE CONTENT / WATCH / SKIP.
// The feed's tier view renders only the verdicts it knows, so four of the five current verdicts
// never appeared at all — scans were being silently dropped from the feed, not merely mis-styled.
// Supabase holds a mix of both vocabularies, so the legacy names must keep resolving forever.

export type Verdict = 'ALPHA PLAY' | 'FARM IT' | 'ENGAGE' | 'OBSERVE' | 'AVOID'

export interface VerdictStyle {
  verdict: Verdict
  tier: 'S' | 'A' | 'B' | 'C' | 'D'
  label: string
  emoji: string
  color: string
  bg: string
  border: string
  tc: string
}

export const VERDICTS: Record<Verdict, VerdictStyle> = {
  'ALPHA PLAY': { verdict: 'ALPHA PLAY', tier: 'S', label: 'Tier S', emoji: '⚡', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', tc: '#6d28d9' },
  'FARM IT':    { verdict: 'FARM IT',    tier: 'A', label: 'Tier A', emoji: '🌾', color: '#16a34a', bg: '#dcfce7', border: '#86efac', tc: '#15803d' },
  'ENGAGE':     { verdict: 'ENGAGE',     tier: 'B', label: 'Tier B', emoji: '✍️', color: '#ca8a04', bg: '#fef9c3', border: '#fde047', tc: '#a16207' },
  'OBSERVE':    { verdict: 'OBSERVE',    tier: 'C', label: 'Tier C', emoji: '👁️', color: '#ea580c', bg: '#fff7ed', border: '#fdba74', tc: '#c2410c' },
  'AVOID':      { verdict: 'AVOID',      tier: 'D', label: 'Tier D', emoji: '🚫', color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db', tc: '#4b5563' },
}

/** Display order, best first. Every page that groups by verdict must use this. */
export const VERDICT_ORDER: Verdict[] = ['ALPHA PLAY', 'FARM IT', 'ENGAGE', 'OBSERVE', 'AVOID']

/**
 * Historical verdicts still sitting in Supabase, mapped onto the current vocabulary.
 * A data migration would let this shrink, but rows written by older builds must never
 * disappear from the feed just because the wording changed.
 */
const LEGACY: Record<string, Verdict> = {
  'CREATE CONTENT': 'ENGAGE',
  'WATCH': 'OBSERVE',
  'SKIP': 'AVOID',
  'S': 'ALPHA PLAY',
  'A': 'FARM IT',
  'B': 'ENGAGE',
  'C': 'OBSERVE',
  'D': 'AVOID',
}

/**
 * Resolve any stored verdict — current, legacy or unknown — to a style.
 * Returns null for genuinely unrecognised input so callers can decide, rather than
 * silently mislabelling a row as OBSERVE.
 */
export function resolveVerdict(raw: unknown): VerdictStyle | null {
  if (typeof raw !== 'string') return null
  const key = raw.trim().toUpperCase()
  if (key in VERDICTS) return VERDICTS[key as Verdict]
  const mapped = LEGACY[key]
  return mapped ? VERDICTS[mapped] : null
}

/** Style for rendering, with a neutral fallback so an unknown verdict is still visible. */
export const UNKNOWN_STYLE: VerdictStyle = {
  verdict: 'OBSERVE', tier: 'C', label: 'Unclassified', emoji: '❔',
  color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db', tc: '#4b5563',
}

export function verdictStyle(raw: unknown): VerdictStyle {
  return resolveVerdict(raw) ?? UNKNOWN_STYLE
}

/** Score thresholds — the single source for tier boundaries on the 0-100 scale. */
export function tierForScore(score: number): VerdictStyle['tier'] {
  return score >= 95 ? 'S' : score >= 85 ? 'A' : score >= 60 ? 'B' : score >= 35 ? 'C' : 'D'
}
