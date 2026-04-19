// lib/enrichment-engine.ts
// Smart analysis layer — runs after all API enrichment, before Claude
// Extracts red flags, generates insights, cross-references data points
// Cost: $0 — pure logic, no API calls

export interface EnrichmentAnalysis {
  red_flags: { type: string; label: string; detail: string; severity: 'high' | 'medium' | 'low' }[]
  warnings: { label: string; detail: string }[]
  strengths: { label: string; detail: string }[]
  project_summary: string
  risk_level: 'critical' | 'high' | 'medium' | 'low'
  category_insights: string
  positioning_advice: string
}

export function analyzeEnrichedData(xd: any, cg: any): EnrichmentAnalysis {
  const enriched = xd?.enriched || {}
  const flags: EnrichmentAnalysis['red_flags'] = []
  const warnings: EnrichmentAnalysis['warnings'] = []
  const strengths: EnrichmentAnalysis['strengths'] = []

  const followers = xd?.followers || 0
  const following = xd?.following || 0
  const listed = xd?.listed || 0
  const avgLikes = xd?.avg_likes || 0
  const accountAge = xd?.account_age_years || 0
  const verified = xd?.verified || false
  const bio = (xd?.description || '').toLowerCase()
  const tweetCount = xd?.tweet_count || 0

  const investors = enriched.confirmed_investors || []
  const team = (enriched.rootdata_team || []).filter((t: any) => t.name && t.name.length > 1)
  const hacks = enriched.known_hacks || []
  const tvl = enriched.tvl || ''
  const revenue = enriched.revenue_24h || ''
  const fees = enriched.fees_24h || ''
  const sentiment = enriched.news_sentiment || ''
  const newsCount = enriched.news_article_count || 0
  const newsFlags = enriched.news_red_flags || []
  const chains = enriched.chains || []
  const category = enriched.defillama_category || xd?.category || ''

  const tokenLive = cg?.token_live || false
  const dexDump = enriched.dex_dump_detected || false
  const dexLiq = enriched.dex_liquidity || ''
  const priceChange = cg?.price_change_24h || 0

  // ══════════════════════════════════════════
  // CROSS-REFERENCE ANALYSIS — the smart part
  // ══════════════════════════════════════════

  // 1. FOLLOWER CREDIBILITY ANALYSIS
  if (followers > 0) {
    const engagementRate = avgLikes / followers
    const listRatio = listed / followers

    // Bot detection: high followers but extremely low engagement
    if (followers > 10000 && engagementRate < 0.001) {
      flags.push({
        type: 'shill',
        label: 'Likely purchased followers',
        detail: `${followers.toLocaleString()} followers but only ${avgLikes.toFixed(1)} avg likes (${(engagementRate * 100).toFixed(3)}% engagement rate). Legitimate projects with this following typically get 100+ likes per post.`,
        severity: 'high'
      })
    } else if (followers > 5000 && engagementRate < 0.003) {
      warnings.push({
        label: 'Low engagement ratio',
        detail: `${(engagementRate * 100).toFixed(2)}% engagement rate — below average for a project with ${(followers/1000).toFixed(0)}K followers`
      })
    }

    // List ratio analysis — genuine projects get listed more
    if (followers > 50000 && listRatio < 0.003) {
      flags.push({
        type: 'shill',
        label: 'Low credibility ratio',
        detail: `Only ${listed} accounts have listed this project despite ${followers.toLocaleString()} followers — suggests low genuine engagement or bot followers.`,
        severity: 'medium'
      })
    }

    // Follow farming
    if (following > followers * 1.5 && followers < 15000) {
      flags.push({
        type: 'shill',
        label: 'Follow farming pattern',
        detail: `Following ${following.toLocaleString()} but only ${followers.toLocaleString()} followers (ratio: ${(following/followers).toFixed(1)}x). Legitimate projects follow far fewer accounts than follow them.`,
        severity: 'medium'
      })
    }

    // New account with suspiciously high followers
    if (accountAge < 0.5 && followers > 30000) {
      flags.push({
        type: 'suspicious',
        label: 'Rapid follower growth on new account',
        detail: `Account is only ${Math.round(accountAge * 12)} months old with ${(followers/1000).toFixed(0)}K followers — could indicate purchased followers or a rebranded/recycled account.`,
        severity: 'medium'
      })
    }

    // Strengths
    if (followers > 10000 && engagementRate > 0.01) {
      strengths.push({
        label: 'Healthy community engagement',
        detail: `${(engagementRate * 100).toFixed(1)}% engagement rate across ${(followers/1000).toFixed(0)}K followers — indicates genuine community interest`
      })
    }
  }

  // 2. FUNDING vs TEAM CROSS-REFERENCE
  if (investors.length > 0 && team.length === 0) {
    warnings.push({
      label: 'Funded but anonymous team',
      detail: `${investors.length} investors have funded this project but no team members are publicly identified — unusual for a funded project`
    })
  }

  if (investors.length === 0 && accountAge > 2 && !tokenLive) {
    flags.push({
      type: 'suspicious',
      label: 'No funding after extended operation',
      detail: `Project has been active for ${accountAge.toFixed(1)} years with no confirmed funding and no token — raises questions about sustainability and business model.`,
      severity: 'medium'
    })
  }

  if (investors.length > 0) {
    const raised = enriched.total_raised_cryptorank || enriched.total_raised_rootdata || enriched.total_raised_defillama
    if (raised) {
      strengths.push({
        label: 'Verified funding',
        detail: `${raised} raised from ${investors.length} investor${investors.length > 1 ? 's' : ''}`
      })
    }
  }

  // 3. SECURITY ANALYSIS
  if (hacks.length > 0) {
    hacks.forEach((h: any) => {
      flags.push({
        type: 'exploit',
        label: 'Security exploit on record',
        detail: typeof h === 'string' ? h : `${h.name || 'Protocol'} exploited${h.amount ? ' for ' + h.amount : ''}${h.date ? ' on ' + h.date : ''} — funds were compromised`,
        severity: 'high'
      })
    })
  }

  // 4. TOKEN ANALYSIS
  if (tokenLive) {
    if (dexDump) {
      flags.push({
        type: 'dump',
        label: 'Token price dumping',
        detail: `Significant price decline detected on DEX — could indicate sell-off by insiders, failed catalyst, or beginning of a rug pull.`,
        severity: 'high'
      })
    }

    if (priceChange > 100) {
      flags.push({
        type: 'suspicious',
        label: 'Extreme price pump',
        detail: `Token up ${priceChange.toFixed(0)}% in 24 hours — extreme volatility often indicates manipulation, wash trading, or an unsustainable pump-and-dump.`,
        severity: 'medium'
      })
    }

    if (priceChange < -30) {
      flags.push({
        type: 'dump',
        label: 'Significant price drop',
        detail: `Token down ${Math.abs(priceChange).toFixed(0)}% in 24 hours — investigate the cause before any involvement.`,
        severity: 'medium'
      })
    }

    if (dexLiq) {
      const liqStr = dexLiq.replace(/[^0-9.]/g, '')
      const liqNum = parseFloat(liqStr) || 0
      const isK = dexLiq.includes('K')
      if (isK && liqNum < 50) {
        flags.push({
          type: 'suspicious',
          label: 'Dangerously low liquidity',
          detail: `Only ${dexLiq} liquidity on DEX — extremely high rug pull risk. A single large sell would crash the price. Do not buy.`,
          severity: 'high'
        })
      } else if (isK && liqNum < 200) {
        warnings.push({
          label: 'Low DEX liquidity',
          detail: `${dexLiq} liquidity — trades will experience significant slippage`
        })
      }
    }
  }

  // Token unlock / vesting pressure
  if (enriched.vesting_warning) {
    flags.push({
      type: 'tokenomics',
      label: 'Upcoming token unlock',
      detail: enriched.vesting_warning,
      severity: 'medium'
    })
  }

  // 5. BIO ANALYSIS — scan for copycat / hype language
  const hypePhrases: [string, string][] = [
    ['100x', 'Claims 100x potential — extremely common in scam projects'],
    ['guaranteed returns', 'Promises guaranteed returns — a hallmark of fraudulent schemes'],
    ['guaranteed profit', 'Promises guaranteed profit — no legitimate project can guarantee returns'],
    ['next binance', 'Positioning as "the next Binance" — copycat marketing tactic'],
    ['next coinbase', 'Positioning as "the next Coinbase" — copycat marketing tactic'],
    ['the next', 'Uses "the next [X]" positioning — typically a sign of a copycat project'],
    ['killer of', 'Claims to be a "[X] killer" — aggressive positioning rarely backed by substance'],
    ['risk free', 'Claims to be "risk free" — no crypto project is risk free'],
    ['no risk', 'Claims "no risk" — misleading and potentially fraudulent'],
    ['airdrop', ''], // not a red flag, but note it
    ['presale', 'Mentions presale — verify legitimacy carefully before sending funds'],
  ]

  for (const [phrase, detail] of hypePhrases) {
    if (bio.includes(phrase) && detail) {
      flags.push({
        type: 'shill',
        label: 'Hype language in project bio',
        detail,
        severity: phrase.includes('guaranteed') || phrase.includes('risk free') ? 'high' : 'medium'
      })
      break // only flag one
    }
  }

  // Airdrop signal
  if (bio.includes('airdrop') || bio.includes('drop hunting')) {
    strengths.push({
      label: 'Airdrop mentioned in bio',
      detail: 'Project explicitly mentions airdrop — potential farming opportunity'
    })
  }

  // 6. NEWS CROSS-REFERENCE
  if (sentiment === 'negative') {
    flags.push({
      type: 'suspicious',
      label: 'Negative news coverage',
      detail: `Negative sentiment detected across ${newsCount} recent article${newsCount > 1 ? 's' : ''} — investigate the nature of the coverage before engaging.`,
      severity: 'medium'
    })
  }

  newsFlags.forEach((nf: string) => {
    const lower = nf.toLowerCase()
    if (lower.includes('scam') || lower.includes('fraud')) {
      flags.push({ type: 'suspicious', label: 'Scam allegations in news', detail: nf, severity: 'high' })
    } else if (lower.includes('sec') || lower.includes('investigation') || lower.includes('lawsuit')) {
      flags.push({ type: 'regulatory', label: 'Regulatory concerns in news', detail: nf, severity: 'high' })
    } else if (lower.includes('hack') || lower.includes('exploit')) {
      flags.push({ type: 'exploit', label: 'Security incident in news', detail: nf, severity: 'high' })
    }
  })

  // Web search red flags (if already detected)
  const webFlags = enriched.web_search_flags || []
  webFlags.forEach((wf: any) => {
    flags.push({
      type: 'suspicious',
      label: `Web: ${wf.keyword || 'red flag'} detected`,
      detail: wf.context || wf.detail || '',
      severity: (wf.keyword || '').includes('shut') || (wf.keyword || '').includes('scam') || (wf.keyword || '').includes('hack') ? 'high' : 'medium'
    })
  })

  if (sentiment === 'positive' && newsCount > 3) {
    strengths.push({
      label: 'Positive press coverage',
      detail: `Positive sentiment across ${newsCount} articles`
    })
  }

  // 7. REVENUE / TVL ANALYSIS
  if (tvl && revenue) {
    strengths.push({
      label: 'Revenue-generating protocol',
      detail: `${tvl} TVL with ${revenue} daily revenue — real economic activity`
    })
  } else if (tvl && !revenue && !fees) {
    const cat = category.toLowerCase()
    if (cat.includes('dex') || cat.includes('lending') || cat.includes('defi')) {
      warnings.push({
        label: 'DeFi protocol with no revenue',
        detail: `${tvl} TVL deployed but no fees or revenue reported — may indicate unsustainable tokenomics or early stage`
      })
    }
  }

  // 8. DILUTION ANALYSIS
  if (followers > 300000 && !tokenLive) {
    flags.push({
      type: 'tokenomics',
      label: 'Extreme airdrop dilution risk',
      detail: `${(followers/1000).toFixed(0)}K followers competing for potential airdrop — expect very heavy dilution. Unless you can position in top 1-5%, rewards may not be worth the effort.`,
      severity: 'medium'
    })
  }

  // ══════════════════════════
  // GENERATE SUMMARY & ADVICE
  // ══════════════════════════

  // Determine risk level
  const highFlags = flags.filter(f => f.severity === 'high').length
  const medFlags = flags.filter(f => f.severity === 'medium').length
  const riskLevel: EnrichmentAnalysis['risk_level'] =
    highFlags >= 2 ? 'critical' :
    highFlags >= 1 ? 'high' :
    medFlags >= 3 ? 'high' :
    medFlags >= 1 ? 'medium' : 'low'

  // Project summary
  const summaryParts: string[] = []
  if (category) summaryParts.push(`${category} project`)
  if (bio && bio.length > 10) summaryParts.push(`described as: "${(xd?.description || '').slice(0, 120)}"`)
  if (investors.length > 0) summaryParts.push(`backed by ${investors.length} investors`)
  if (tvl) summaryParts.push(`with ${tvl} TVL`)
  if (team.length > 0) summaryParts.push(`${team.length} known team members`)
  else summaryParts.push('anonymous team')

  // Category-specific insights
  let catInsight = ''
  const catLower = category.toLowerCase()
  if (catLower.includes('dex') || catLower.includes('perp')) {
    catInsight = 'DEX/Perp projects are competitive. Look for unique features, growing volume, and sustainable fee models. Test with small amounts first.'
  } else if (catLower.includes('lending') || catLower.includes('defi')) {
    catInsight = 'DeFi lending protocols need strong TVL, audited contracts, and transparent team. Check for insurance funds and liquidation mechanisms.'
  } else if (catLower.includes('l1') || catLower.includes('l2') || catLower.includes('chain')) {
    catInsight = 'L1/L2 projects need developer ecosystem, transaction volume, and unique tech. Look for testnet activity and developer grants programs.'
  } else if (catLower.includes('ai')) {
    catInsight = 'AI crypto projects are trending but many lack substance. Verify the AI actually works, check for published research, and look for real product usage.'
  } else if (catLower.includes('gaming') || catLower.includes('nft')) {
    catInsight = 'Gaming/NFT projects live or die by community. Check active player count, marketplace volume, and whether the game is actually playable.'
  } else if (catLower.includes('rwa')) {
    catInsight = 'RWA projects need regulatory compliance and real asset backing. Long-term play — verify the legal structure and asset custody.'
  } else if (catLower.includes('social') || catLower.includes('socialfi')) {
    catInsight = 'SocialFi is first-mover advantage. Get in early, build followers within the platform, and engage consistently.'
  } else if (catLower.includes('prediction')) {
    catInsight = 'Prediction markets — farm points but never bet more than you can lose. Keep farming wallet separate.'
  } else if (catLower.includes('wallet') || catLower.includes('infra')) {
    catInsight = 'Infrastructure/wallet projects — value comes from integration and developer adoption. Look for partnerships and SDK usage.'
  }

  // Positioning advice based on risk
  let advice = ''
  if (riskLevel === 'critical') {
    advice = 'AVOID — multiple high-severity red flags detected. Do not engage, farm, or invest until issues are resolved and independently verified.'
  } else if (riskLevel === 'high') {
    advice = 'EXTREME CAUTION — significant concerns detected. If you engage, use burner wallets only, never approve unlimited token spending, and do not commit funds you cannot afford to lose.'
  } else if (riskLevel === 'medium') {
    advice = 'PROCEED CAREFULLY — some concerns noted. Do your own research beyond this scan, verify team identities, check smart contract audits, and start with minimal exposure.'
  } else {
    advice = 'REASONABLE RISK — no major red flags detected. Standard precautions apply: verify contracts, use hardware wallets for large amounts, and stay informed about project updates.'
  }

  // Deduplicate flags by label
  const seen = new Set<string>()
  const dedupedFlags = flags.filter(f => {
    const key = f.label.toLowerCase().slice(0, 25)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return {
    red_flags: dedupedFlags,
    warnings,
    strengths,
    project_summary: summaryParts.join(', ') || 'Limited project data available',
    risk_level: riskLevel,
    category_insights: catInsight || 'Research the specific sector this project operates in.',
    positioning_advice: advice,
  }
}
