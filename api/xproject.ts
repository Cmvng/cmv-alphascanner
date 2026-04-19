// ── PATCH for xproject.ts: Better error handling ──
// Apply these 2 changes to debug why @letsCatapult returns 0 data

// ═══════════════════════════════════════════════════════════
// PATCH A: Add logging to the X API user lookup
// ═══════════════════════════════════════════════════════════

// FIND this block (around line 480):
/*
    const userData = await xFetch(
      `https://api.twitter.com/2/users/by/username/${clean}?user.fields=public_metrics,verified,created_at,profile_image_url,description,pinned_tweet_id,id`,
      TOKEN
    )
    const u = userData.data || null
*/

// REPLACE WITH:
/*
    const userData = await xFetch(
      `https://api.twitter.com/2/users/by/username/${clean}?user.fields=public_metrics,verified,created_at,profile_image_url,description,pinned_tweet_id,id`,
      TOKEN
    )
    
    // Debug: log what X API actually returned
    console.log(`[xproject] X API response for @${clean}:`, JSON.stringify({
      has_data: !!userData.data,
      has_errors: !!userData.errors,
      error_detail: userData.errors?.[0]?.detail || null,
      status: userData.status || null,
      title: userData.title || null,
      followers: userData.data?.public_metrics?.followers_count || 0,
    }))
    
    // If X API returned an error, log it clearly
    if (userData.errors) {
      console.error(`[xproject] X API ERROR for @${clean}:`, JSON.stringify(userData.errors))
    }
    if (userData.title === 'Unauthorized' || userData.status === 401) {
      console.error(`[xproject] X API TOKEN EXPIRED OR INVALID`)
    }
    
    const u = userData.data || null
*/


// ═══════════════════════════════════════════════════════════
// PATCH B: Don't cache results with 0 followers (failed lookups)
// ═══════════════════════════════════════════════════════════

// FIND this line (near the end of the handler):
/*
    cache.set(clean, { data: result, time: Date.now() })
*/

// REPLACE WITH:
/*
    // Only cache if we got real X data (prevents caching failed lookups)
    if (result.followers > 0 || result.tweet_count > 0) {
      cache.set(clean, { data: result, time: Date.now() })
    } else {
      console.warn(`[xproject] NOT caching @${clean} — no X data returned (followers=0, tweets=0)`)
    }
*/


// ═══════════════════════════════════════════════════════════
// PATCH C: Also skip enrichment if X API returned nothing
// This saves you money — don't call 8 other APIs for a failed scan
// ═══════════════════════════════════════════════════════════

// FIND this line (after the user lookup):
/*
    const bio = u?.description || ''
*/

// ADD AFTER IT:
/*
    // If X API returned nothing, return early with error — don't waste API credits
    if (!u || (!u.public_metrics?.followers_count && !u.public_metrics?.tweet_count)) {
      console.warn(`[xproject] No X data for @${clean} — returning early, skipping enrichment`)
      return res.status(200).json({
        error: `Could not fetch X profile for @${clean}. The handle may be incorrect, the account may be suspended, or the X API token may need refreshing.`,
        partial: true,
        handle: clean,
        name: clean,
        description: '',
        followers: 0,
        tweet_count: 0,
        enriched: {},
        token_data: null,
        cmv_score: 0,
        category: 'Unknown',
        confirmed_ticker: null,
        avg_likes: 0,
        avg_retweets: 0,
        account_age_years: 0,
        verified: false,
        profile_image_url: null,
        x_api_failed: true,  // Frontend can check this flag
      })
    }
*/
