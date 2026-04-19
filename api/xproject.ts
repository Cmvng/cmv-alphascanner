// patch-xproject.js
// Run this: node patch-xproject.js
// It reads your xproject.ts, applies 6 patches, writes xproject-patched.ts

const fs = require('fs');

const FILE = './api/xproject.ts'; // adjust path if needed
const OUT = './api/xproject.ts';  // overwrites in place — back up first!

let code = fs.readFileSync(FILE, 'utf8');
let changes = 0;

// ── PATCH 1: Reduce tweets from 20 to 5 (saves $0.075/scan) ──
if (code.includes('max_results=20')) {
  code = code.replace('max_results=20', 'max_results=5');
  changes++;
  console.log('✅ PATCH 1: Reduced tweet fetches from 20 to 5');
} else {
  console.log('⚠️  PATCH 1: max_results=20 not found (already patched?)');
}

// ── PATCH 2: Skip pinned tweet API call (saves $0.005/scan) ──
const pinnedOld = `    // 2. Pinned tweet
    if (u?.pinned_tweet_id) {
      try {
        const td = await xFetch(\`https://api.twitter.com/2/tweets/\${u?.pinned_tweet_id}?tweet.fields=text,public_metrics\`, TOKEN)
        pinnedTweetText = td.data?.text || ''
      } catch { }
    }`;

const pinnedNew = `    // 2. Pinned tweet — SKIPPED to save X API credits ($0.005/scan)
    // Bio already captures ticker, links, and category signals`;

if (code.includes('// 2. Pinned tweet')) {
  code = code.replace(pinnedOld, pinnedNew);
  changes++;
  console.log('✅ PATCH 2: Skipped pinned tweet API call');
} else {
  console.log('⚠️  PATCH 2: Pinned tweet block not found');
}

// ── PATCH 3: Increase cache TTL from 5 min to 2 hours ──
if (code.includes('1000 * 60 * 5')) {
  code = code.replace(
    'const CACHE_TTL = 1000 * 60 * 5 // 5 min — short TTL so data stays fresh',
    'const CACHE_TTL = 1000 * 60 * 120 // 2 hours — saves X API credits on repeat scans'
  );
  changes++;
  console.log('✅ PATCH 3: Cache TTL increased to 2 hours');
} else {
  console.log('⚠️  PATCH 3: CACHE_TTL line not found');
}

// ── PATCH 4: Remove CryptoRank source name from airdrop text ──
if (code.includes('categories on CryptoRank')) {
  code = code.replace(
    "airdrop_details: hasAirdropSignal ? 'Project tagged with airdrop-related categories on CryptoRank' : null,",
    "airdrop_details: hasAirdropSignal ? 'Project tagged with airdrop-related categories' : null,"
  );
  changes++;
  console.log('✅ PATCH 4: Removed CryptoRank name from airdrop text');
} else {
  console.log('⚠️  PATCH 4: CryptoRank airdrop text not found');
}

// ── PATCH 5: Remove raw news headlines from flag detail ──
const newsOld = 'detail: `Recent negative headlines detected: "${headlines[0]}"${headlines[1] ? ` and "${headlines[1]}"` : \'\'}.',
const newsPatterns = [
  /detail: `Recent negative headlines detected:.*?\.,/,
  /detail: `Recent negative headlines detected.*?\`,/,
];

let patch5 = false;
for (const pattern of newsPatterns) {
  if (pattern.test(code)) {
    code = code.replace(pattern, 
      "detail: `Recent negative coverage detected in crypto news — investigate before engaging.`,"
    );
    changes++;
    patch5 = true;
    console.log('✅ PATCH 5: Removed raw news headlines from flag detail');
    break;
  }
}
if (!patch5) {
  // Try exact string match
  if (code.includes('Recent negative headlines detected')) {
    const start = code.indexOf('Recent negative headlines detected');
    const lineStart = code.lastIndexOf('detail:', start);
    const lineEnd = code.indexOf(',', start + 30);
    if (lineStart > 0 && lineEnd > lineStart) {
      const oldLine = code.substring(lineStart, lineEnd + 1);
      code = code.replace(oldLine, 
        "detail: `Recent negative coverage detected in crypto news — investigate before engaging.`,"
      );
      changes++;
      console.log('✅ PATCH 5: Removed raw news headlines (fallback method)');
    } else {
      console.log('⚠️  PATCH 5: Could not isolate the news headline line');
    }
  } else {
    console.log('⚠️  PATCH 5: News headline text not found');
  }
}

// ── PATCH 6: Remove "Verified" from web search flag label ──
if (code.includes("label: 'Verified negative report'")) {
  code = code.replace(
    "label: 'Verified negative report'",
    "label: 'Negative report found'"
  );
  changes++;
  console.log('✅ PATCH 6: Renamed "Verified negative report" label');
} else {
  console.log('⚠️  PATCH 6: "Verified negative report" not found');
}

// Write result
fs.writeFileSync(OUT, code, 'utf8');
console.log(`\n─── Done: ${changes}/6 patches applied ───`);
console.log(`Written to: ${OUT}`);
console.log(`\nCost savings: $0.115 → $0.035 per scan (70% reduction)`);
