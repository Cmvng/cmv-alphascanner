---
name: cmvng-video
description: Make and send the cmvng picks video or results video from the singles published on cmvngpicks.com. Use when the owner asks for "today's picks video", "the singles video", "top singles for today", "the results video", "how did today's picks do (video)", or a video for a named session or date.
---

# cmvng picks / results video

The owner asks in plain words; you fetch the real singles from the live site, render, check, and send the video. Never type picks, prices or percentages yourself: everything comes from the app's published singles.

## 1. Make it

From the repo root (`cmv-alphascanner`):

```bash
bash video/daily.sh picks                      # today's latest session (Lagos date)
bash video/daily.sh results                    # every single published today, settled ones only
```

Options go after the mode:
- `--session morning|midday|evening|all`: a named session. "After the morning session" means `--session morning`, or `midday` if the day has no morning session.
- `--date YYYY-MM-DD`: another day. Only the last ~8 sessions are on the site.
- `--money ngn|usd`: picks default to ₦10,000 and results to $100. Use what the owner asks for.

To see which sessions exist: `node video/from-app.mjs --list`.

Run it in the background. It takes about 5–8 minutes, and the first run in a new session also installs the voice model, about 350 MB. Its output ends with:
- `VIDEO`: the full-quality file
- `SEND`: a copy under 29 MB for chat
- `SCRIPT`: the post caption
- `CREDITS`: the photo and music credits

## 2. Check before sending

- Read the fetch lines at the top of the output: every single, its price, us %, book %, and for results won/lost and the score. Report any `left out:` lines (not settled yet, no price) to the owner.
- Pull 4–6 frames with ffmpeg (opening, a pick card, the slate or totals, the last card), put them in one contact sheet and look at them. Check for overlapping text, a missing stadium, or a wrong name.
- If something looks wrong, fix the cause in `video/`, re-run, and commit the fix.

## 3. Send

Send the `SEND` file with SendUserFile (`display: render`). In a few short, plain-English lines, say:
- which session it covers and how many singles, with the picks listed
- for results: won/lost and the money line
- anything left out, and why

Offer the caption from `script.txt` and the credits from `credits.txt` for the post.

## If it fails

- `No session published for <date> yet`: the app hasn't published that day yet. Say so and list the sessions it does have.
- A fetch error or empty legs: the site may be down, or its page layout changed. The readers are in `video/lib/cmvng-site.mjs` (`sessions()`, `singles()`, `parse()`). Fix the reader against the live HTML; never guess the data.
- Wikimedia rate limits (HTTP 429) only slow the stadium lookup. It retries by itself, and a team without a photo gets the plain cmvng background.

## Rules

- Read-only: only the public pages of cmvngpicks.com are read. Never change the app, its database, its Railway settings or its environment variables. The owner deploys the app himself.
- Never say "sure", "banker", "guaranteed" or "fixed". Keep "18+ · Predictions, not guarantees" on screen; the template already does this.
- Post the losing days too. The results video says losses plainly.
- Plain English with the owner: short sentences, no jargon.
