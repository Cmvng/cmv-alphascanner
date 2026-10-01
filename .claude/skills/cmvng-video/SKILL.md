---
name: cmvng-video
description: Make and send the cmvng picks video, results video or match preview video from cmvngpicks.com. Use when the owner asks for "today's picks video", "the singles video", "tonight's singles", "top singles for today", "the results video", "results for today", "a preview of <match>", "a video for X / YouTube", "football talk video", or a video for a named session or date.
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

## Match previews (for X and YouTube: no betting at all)

Tips videos don't earn on YouTube or X. A preview is football analysis only, so it can be monetised:

```bash
node video/from-app.mjs preview --team Greece          # a team in today's singles
node video/from-app.mjs preview --match 987933         # any match page: cmvngpicks.com/m/<number>
```

The file gets form, record, points a game, goals scored and conceded, shots on target, clean sheets, xG, win chances and the most likely scores. Write its script with the keys `pv_hook`, `pv_form`, `pv_stats`, `pv_model`, `pv_score` and `pv_cta` (1–2 lines each, under about 25 words a line). Then render it the same way.

**The approved template.** Every AI Analyst video follows `video/templates/ai-analyst/`. Read its `README.md` first (screen order, what made it work, the checklist) and copy the shape of `denmark-portugal-2026-10-01.json`. Save a `sources.md` with each new video.

**AI Analyst research.** For each match, run a web-research subagent in the background, one per match, all in parallel. Ask it for a brief of under 500 words with a source URL and date on every fact:
1. Context: the group or round, the table, what's on the line, the venue, the coaches.
2. Team news: absentees, call-ups, predicted XIs and formations, labelled as predicted.
3. Two key players per side: role, club, and one current stat.
4. How each side plays, from recent match reports.
5. The last three head-to-heads.
6. Storylines.

Tell it to mark anything unconfirmed and never invent facts.

Then check the brief against the app:
- If the app's form or numbers clash with the confirmed recent results, leave those screens out with `"skip": ["pv_form", "pv_stats"]` rather than show contradictions.
- Use the actual venue: cup ties are often on neutral ground. Set the pick's `stadium` to the venue's photo, e.g. resolve the host club's stadium with `lib/stadium.mjs`.
- Use only players in tonight's squad. Injured players are out.
- Test new names with Kokoro + faster-whisper, and add respellings to `SAY_NAMES` before rendering.

For the **AI Analyst** version, add an `"analysis"` object built from the researched facts (each fact from a dated source; leave out anything unconfirmed):
- `stage`: the stage, e.g. "League A · Group 2 · Matchday 3"
- `table`: `[[team, played, points], ...]`
- `stakes`: 1–2 lines
- `players`: 4 entries, two home then two away, each `{name, team: home|away, role, club, fact}`. Free photos are found automatically, and the card shows the crest when there's none.
- `tactics`: `{home: {formation, points: [3 short notes]}, away: {...}}`
- `expect`: 2–3 lines
- `verdict`: a short chip in plain football language, e.g. "Our read: a Dutch win, but Greece score"

The script then also gets `pv_stake`, `pv_players`, `pv_tactics` and `pv_expect` lines.

**Round-up of the night's other matches** (e.g. "Denmark v Portugal, plus the rest of League A"): the main match gets the full analyst treatment, then one "Around the league" screen per other match, with its stadium, crests, the app's win chances and xG, and two researched notes.

```bash
node video/from-app.mjs matches                                         # every match page the app lists, with its number
node video/from-app.mjs preview --match 1010232 --with 1010235,1010233  # main match + round-up matches
```

For each round-up pick, fill in `round: {title: "Around League A", stage: "Group 2 · Allianz Arena, Munich", points: [2 short researched notes]}` and set `stadium` / `stadium_credit` to the real venue. Research them with one short brief each (under 250 words: table, venue, one key player, team news, storyline). Script: `"pv_round": [[1–2 lines for match 2], [for match 3], ...]`, in the same order as the picks. Put the round-up matches from the main match's group first.

**Monetisation check:** every preview render reads all on-screen text and voiceover, and stops with a list if it finds a betting term: odds, bet, stake, tips, picks, bookies, units, booking codes, bookmaker names, naira or ₦, cmvngpicks.com, and so on. Reword and re-run. Never pass `--allow-words` for X or YouTube videos.

Preview rules, which keep it monetisable:
- **No betting words:** no odds, prices, bookies, stakes, units, bars, picks, tips, "value", "bet", booking codes or website links.
- **End with "Follow for more…"**.
- **Real analysis:** the script must explain why ("the gap shows at both ends…"), not just read numbers out. YouTube won't pay for repetitive, templated videos, so vary the hook and the angle each time.
- **Post caption:** "<Home> vs <Away>: what the numbers say | <competition> preview".
- **Title, description, tags and pinned comment:** same rules; no betting words and no link to cmvngpicks.com (the site has booking codes).
- **Credits and disclosure:** put the photo credits from `credits.txt` in the description, and add "Narrated with an AI voice."
- **Facts:** team news, players and tactics must come from dated sources found today. Leave out what can't be confirmed; a wrong fact costs more trust than a missing one.
- **Volume:** one or two analyst videos a day, each with its own angle. Mass-posting near-identical videos is what YouTube refuses to pay for.

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
- **Look:** set `"style"`. Use the one the owner asks for: `stadium` (home ground photo), `broadcast` (team-colour TV graphics) or `players` (recent photos of the home team's players, which falls back to the stadium). If he doesn't say, rotate day to day.
- **Names:** if a name the voice will say is Spanish, Portuguese or African, check it in `SAY_NAMES` (`video/lib/narration.mjs`) and add a respelling if needed. Test it with Kokoro and faster-whisper first.

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
