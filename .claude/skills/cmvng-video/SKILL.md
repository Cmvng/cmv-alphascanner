---
name: cmvng-video
description: Make and send the cmvng picks video or results video from the singles published on cmvngpicks.com. Use when the owner asks for "today's picks video", "the singles video", "tonight's singles", "top singles for today", "the results video", "results for today", or a video for a named session or date.
---

# cmvng picks / results video

The owner asks in plain words; you fetch the real singles from the live site, write the presenter's script like a football analyst, render, check, and send the video. Picks, prices and percentages always come from the app. Never type or guess them.

## 1. Fetch

From the repo root (`cmv-alphascanner`):

```bash
node video/from-app.mjs picks                    # today's latest session (Lagos date) → video/out/picks-<date>.json
node video/from-app.mjs results                  # every single published today, settled ones only → video/out/results-<date>.json
```

Options:
- `--session morning|midday|evening|all`: "the singles for this evening" is `--session evening`.
- `--date YYYY-MM-DD`: another day. "Yesterday's results" is yesterday's date.
- `--money ngn|usd`: picks default to ₦10,000 and results to $100. Use what the owner asks for.

To see which sessions exist: `node video/from-app.mjs --list`.

Read the printed lines: every single with its pick, price, us % and book %, and for results won/lost and the score. Note any `left out:` lines to tell the owner.

## 2. Write the script (the presenter is a football analyst)

Open the JSON and add a `"script"` object. The voice reads it word for word, and the captions show it.

```json
"script": {
  "hook":  ["Four singles for tonight, and two of them carry our strongest signal. Here's the slate."],
  "picks": [["<the match + 1–2 stats that explain the pick>", "<the pick, at the price>", "<bookies % vs ours + the bars>"], ...],
  "slate": ["That's tonight's slate. Staking ₦10,000? Split it by the bars: the stronger the signal, the bigger the share."],
  "cta":   ["Full results tomorrow morning. Follow so you don't miss them.", "Predictions, not guarantees. Eighteen plus."]
}
```

For a results file use `"rhook"`, `"results"` (per pick: `["<the score line>", "<the pick: landed / didn't come in, at the price>"]`), `"rtotal"` and `"cta"`.

Rules:
- **Order:** exactly 3 lines per pick, in the same order as `picks`. Line 2 is when the pick card slams in, and line 3 is when the bars light. Results get 2 lines per pick.
- **Facts:** use only facts in the file: `home_win`/`draw`/`away_win`, `xg_*`, `scored_*`, `conceded_*`, `form_*`, the app's `read`, `model`, `book` and `odds`. Never invent injuries, streaks or history.
- **Numbers:** write them as digits ("at 1.57", "under 1.5 goals", "68%", "₦10,000"). The tool converts them for the voice.
- **Bars:** say them as the file computes them: 3 bars when the price × our % beats the bookies by 5%+, 2 for any edge, 1 otherwise. For 1 bar, say the price is short and to keep it light.
- **Tone:** confident, specific, calm, like a pundit. Vary the openers ("We start in…", "Next…", "And a late one…"), and keep each line under about 25 words.
- **Never** say "sure", "banker", "guaranteed", "fixed" or "lock". Say losses plainly in results.
- **Pace:** set `"voice_speed": 1.14` for a measured analyst pace, and `"results_when"` to match the cta ("tonight", "tomorrow").

## 3. Render

```bash
bash video/daily.sh render video/out/picks-<date>.json        # or results-<date>.json
```

Run it in the background. It takes about 5–8 minutes; the first run in a new session also installs the voice model (about 350 MB). It ends with `VIDEO` (full quality), `SEND` (under 29 MB for chat), `SCRIPT` (the post caption) and `CREDITS`.

(`bash video/daily.sh picks|results` does fetch and render in one go with the built-in template lines. Use it only if the owner wants it fast and unedited.)

## 4. Check, then send

- **Frames:** pull 4–6 with ffmpeg (opening, a pick card, the slate or totals, the last card), put them in one contact sheet and look. Check for overlapping text, a missing stadium or crest, or a wrong name.
- **Voice:** transcribe the final audio with faster-whisper (`base.en`) and compare it with the script. Fix any name the voice gets wrong in `SAY_NAMES` in `video/lib/narration.mjs`, then re-render.
- **Send:** send the `SEND` file with SendUserFile (`display: render`). In a few short, plain-English lines, say which session it covers and list the picks; for results, won/lost and the money. Mention anything left out. Offer the caption from `script.txt` and the credits from `credits.txt`.

## If it fails

- `No session published for <date> yet`: the app hasn't published yet. Say so and list the sessions it has.
- A fetch error or empty legs: the site may be down, or its layout changed. Fix the readers in `video/lib/cmvng-site.mjs` against the live HTML; never guess the data.
- HTTP 429 from Wikimedia or TheSportsDB only slows the stadium or crest lookup. A team without a photo or crest falls back to the cmvng background or shield.

## Rules

- **Read-only:** only the public pages of cmvngpicks.com are read. Never change the app, its database, its Railway settings or its environment variables. The owner deploys the app himself.
- **On screen:** keep "18+ · Predictions, not guarantees" visible; the template already does this.
- **The owner:** plain English, short sentences, no jargon.
