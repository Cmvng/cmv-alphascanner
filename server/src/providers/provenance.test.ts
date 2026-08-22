import { describe, it, expect } from 'vitest'
import { registrableDomain } from './provenance.js'

/* The domain extractor is the part of provenance that decides whether a check runs at all, so
   its failure mode matters more than its success rate: extracting the WRONG domain would produce
   a confident age for something that is not the project's site. */

describe('registrableDomain', () => {
  it('extracts the registrable domain from a full URL', () => {
    expect(registrableDomain('https://example.com/path?x=1')).toBe('example.com')
  })

  it('strips www and subdomains down to the registrable name', () => {
    expect(registrableDomain('https://www.example.com')).toBe('example.com')
    expect(registrableDomain('https://app.docs.example.com')).toBe('example.com')
  })

  it('accepts a bare hostname without a scheme', () => {
    expect(registrableDomain('example.com')).toBe('example.com')
  })

  it('is case-insensitive', () => {
    expect(registrableDomain('HTTPS://Example.COM')).toBe('example.com')
  })

  // The important one. A token's "website" is very often a Telegram invite or an aggregator
  // page. Checking the age of t.me would report Telegram's 2013 registration as the project's
  // history — a confidently wrong answer, which is worse than no answer.
  it('refuses social and aggregator hosts rather than reporting their age', () => {
    for (const url of [
      'https://t.me/someproject',
      'https://x.com/someproject',
      'https://twitter.com/someproject',
      'https://discord.gg/abcdef',
      'https://linktr.ee/someproject',
      'https://dexscreener.com/solana/abc',
      'https://pump.fun/coin/abc',
      'https://medium.com/@someproject',
    ]) {
      expect(registrableDomain(url)).toBeNull()
    }
  })

  it('returns null rather than guessing on unusable input', () => {
    expect(registrableDomain(null)).toBeNull()
    expect(registrableDomain('')).toBeNull()
    expect(registrableDomain('localhost')).toBeNull()
    expect(registrableDomain('not a url at all')).toBeNull()
  })

  /* Known limitation, asserted so it is a documented behaviour rather than a latent surprise:
     the naive last-two-labels rule is wrong for multi-part suffixes. It fails safe — RDAP has no
     registration for `co.uk`, so the check reports itself unrun instead of inventing an age. */
  it('mis-splits multi-part suffixes, and that failure is safe', () => {
    expect(registrableDomain('https://project.co.uk')).toBe('co.uk')
  })
})
