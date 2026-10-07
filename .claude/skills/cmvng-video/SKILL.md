---
name: cmvng-video
description: Make and send the cmvng picks video, results video or match preview video from cmvngpicks.com. Use when the owner asks for "today's picks video", "the singles video", "tonight's singles", "top singles for today", "the results video", "results for today", "a preview of <match>", "the analysis for <match>", "match analysis", "a video for X / YouTube", "football talk video", or a video for a named session or date.
---

# cmvng picks / results video

The owner asks in plain words; you fetch the real singles from the live site, write the presenter's script like a football analyst, render, check, and send the video. Picks, prices and percentages always come from the app. Never type or guess them.

## Never generic (the owner's fundamental rule, 5 Oct)

"When making me analysis videos, post-match analysis videos or crypto videos, it's important not to keep on making
generic videos. The social media algo doesn't like it." Every video must look and run differently from the last ones:
change the format (the shape of the story), the hook, the main visual device, the look and the sound, not one detail.
Before writing any video, read `video/templates/IDEAS.md` (the idea bank: the owner's references and our own ideas) and
the last few videos of the same kind, then pick a different format and say in the post kit what is new. The owner
keeps sending references to learn from; use them, and bring ideas of our own. The renderer stops a video whose run of
screens is within two changes of one of the last three of its kind (`--allow-same` only for a deliberate re-render).

**And above all, very creative** (the owner, 5 Oct: "most importantly the videos have to be very creative… like very
creative"). Different is the floor; creative is the bar. Every video starts from one bold concept (not a template filled
in), has a signature moment people would screenshot or share, pictures that act out the words, a surprise or twist,
and a payoff at the end. The test: would the owner say "I haven't seen that before"? Write the concept in one line at
the top of the post kit.

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

**The approved template.** Every match analysis video follows `video/templates/match-analysis/`. Read its `README.md` first (screen order, what made it work, the checklist) and copy the shape of `denmark-portugal-2026-10-01.json`. Save a `sources.md` with each new video.

**House colour: shades of blue** (the owner, 3 Oct: "my color is any shade of blue"). Accents, highlights, the
current caption word, rings, chips and glows are blue (sky `#4FB3FF`, `#3D7BFF`, `#6E9BFF`, deep `#1F5FDB`, navy
backgrounds). Never yellow or lime as an accent. Green and red appear only where they mean something: up/down
candles and price moves, won/lost, correct/missed.
**Blue is the background, not a filter** (the owner, 6 Oct: "my style is light or shades of blue", then "the logo,
the colour of the projects… the colour of the images should also remain there. Just that the background should reflect
light or blue… everything blends… not that everything now reflects blue… so monotonous"). The page is light sky blue
(or deep royal blue for a cold open, never black) and our frame (header, captions) is blue. The subject keeps its own
colours, logo and art: a project's brand colours from its own stylesheet, a team's kit, crest and flag. Use colour to
mean things (a colour per stat or class). Reference: the Fungo Labs explainer (`explainer.theme: "sky"` +
`explainer.brand`).

**What the owner loves (4 Oct): the soundtrack and the slow, suspenseful pace.** "The soundtrack was captivating… the
slow paced way it was analyzing the game was giving me, okay, what is going on here." The track was "A New Life"
(Mixkit 543, cinematic: a quiet build, then a hard drop on the title) with the voice at `voice_speed` 1.05. So:
- **The soundtrack must wow (the owner, 6 Oct: "Remember the type of sound tracks I like… sound tracks that keep people
  wowed, for either pre analysis or post analysis").** That means a cinematic film score with a quiet build and a
  hard drop, like "A New Life". Never pick a track for a theme or mood instead (a jazz track for the newspaper format
  was wrong). `lib/music.json` marks the tracks that qualify `"wow": true`, measured: a jump of 12 dB or more at the drop
  and a hit of 9 dB or more in the first half second. Analysis and post-match videos pick only from these. The pool:
  A New Life, The Farewell, Fragments Of Bangkok, A Love Theme, Discover (all Eugenio Mininni, Mixkit). Keep growing
  it with tracks that measure the same, and play new ones to the owner before relying on them.
- **A new soundtrack every video.** The rotation never repeats one of the last six; keep the drop on the title.
  Lean on the `cinematic` vibe for analysis and reviews (`"music_vibe": ["cinematic"]`; 10 tracks since 4 Oct, mostly
  Eugenio Mininni film scores, each with a timed build and drop), and grow that pool when it runs thin.
- **Keep the measured pace** for analysis (1.05) with real pauses; don't rush the numbers.
- **One new idea per video** (a different cold-open angle, transition, graphic or reveal), so no two look the same.
- **Subtitles:** every render now writes a `.srt` next to the video (real names and digits); send it with the video.

**House style: never say "AI Analyst"** in the video, the voice, titles or posts. The owner finds it cringe and low effort. It's "the analysis" or "match analysis" ("Here's the analysis.", "That's the analysis. Follow for more football, by the numbers."), and the render stops if the phrase appears.

**Research.** For each match, run a web-research subagent in the background, one per match, all in parallel. Ask it for a brief of under 500 words with a source URL and date on every fact:
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

For the **match analysis** version, add an `"analysis"` object built from the researched facts (each fact from a dated source; leave out anything unconfirmed):
- `stage`: the stage, e.g. "League A · Group 2 · Matchday 3"
- `table`: `[[team, played, points], ...]`
- `stakes`: 1–2 lines
- `players`: 4 entries, two home then two away, each `{name, team: home|away, role, club, fact}`. Free photos are found automatically, and the card shows the crest when there's none.
- `tactics`: `{home: {formation, points: [3 short notes]}, away: {...}}`
- `expect`: 2–3 lines
- `verdict`: a short chip in plain football language, e.g. "Our read: a Dutch win, but Greece score"
- **Every game gets a spoken verdict, not only a chip** (the owner, 7 Oct: "You didn't give your take on the matches"). Say "The verdict: …" with the reason and the app's likeliest score. This applies to round-up games too.
- `headline`: the match's story in 2–5 words, shown big on the opening screen, e.g. "Portugal without Ronaldo". Always write one; never a generic title.

Keep the opening to 6–7 seconds, with the story in the first sentence. Also render the 60-second cut: add `script_short` with tighter lines, then run `bash video/daily.sh render <file> --short` (main match only).

The script then also gets `pv_stake`, `pv_players`, `pv_tactics` and `pv_expect` lines.

**Cover the whole slate (the owner, 6 Oct).** "You didn't highlight the other matches for today" and "you didn't even give the
analysis for England on who might win by the numbers… you only dwelt on Spain". So:
- every match on the day's slate gets a round-up card (`bp_board` + `bp_job`, or `pv_round`): teams, kick-off (Lagos),
  competition, our model's chances and xG, two researched notes, and our read in football words;
- a second big match (same group, or a big name) gets its own by-the-numbers segment: form side by side (`bp_vs`), key men and
  team news, the last three meetings, our model with the likeliest score, and our read. Never one line;
- over X's 2:20, deliver the full video for YouTube and cut it at drawing boundaries into a thread of parts, each under 2:20
  (reference: `templates/match-analysis/vault-full-2026-10-06.json`).

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
- **Post wording:**
  - X post opens "<Home> v <Away>: tonight's analysis 📊".
  - YouTube title: "<Home> vs <Away>: Match Analysis | <the story>", e.g. "Denmark vs Portugal: Match Analysis | Portugal Without Ronaldo".
  - Never "AI Analyst".
- **Title, description, tags and pinned comment:** same rules; no betting words and no link to cmvngpicks.com (the site has booking codes).
- **Credits and disclosure:** put the photo credits from `credits.txt` in the description, and add "Narrated with an AI voice." at the very end. That line goes only in the description, never in the video, voice or title.
- **Facts:** team news, players and tactics must come from dated sources found today. Leave out what can't be confirmed; a wrong fact costs more trust than a missing one.
- **Volume:** one or two analyst videos a day, each with its own angle. Mass-posting near-identical videos is what YouTube refuses to pay for.

## Post-match reviews and reactions (after full time)

When the owner asks for "the reaction", "the review", "post-match" or "what happened in <match>", follow `video/templates/post-match/README.md`.

- **Format:** `mode: "review"` with hand-written `review.beats` (hook, moment, meme, stats, read, ratings, quote, table, cta), rendered by `video/review.html`. Each video gets its own structure and jokes.
- **Facts:** research the match after full time (score, scorers and minutes, key moments, stats, quotes, the table now), with a dated source for every fact.
- **Media:**
  - Reaction clips only from `video/lib/clips.json` (Mixkit, free licence; check any new clip's page and add it).
  - Player photos only from Wikimedia, with credit.
  - **Never broadcast footage or agency photos**, not even a second.
  - No famous meme photos; text memes over our clips only.
- **Voice:** real commentary in every video (YouTube won't pay for mostly non-verbal reactions).
- **Check:** the betting-word check runs, and "AI Analyst" is banned.
- **Reaction to our analysis** (the approved format, `video/templates/reaction/`): the female presenter (Mixkit 28293) and the `af_heart` voice, unless the owner asks otherwise. Main match last, as the finale.
- **Names:** transcribe every line. If a name could be misheard as a swear word in auto-captions, say it another way (keep it on screen).

## Prediction-market plays (Polymarket)

When the owner asks for "the Polymarket video" or "prediction market plays", copy `video/templates/reaction/polymarket-2026-10-02.json`.

- **Straight conversion only.** Take each of the app's picks and place it as the matching Polymarket market, exactly as you would at a bookmaker. **No edge analysis, no swapping picks, no adding or dropping picks on your own judgement.** The owner was clear on this.

  | App pick | Polymarket market | Side |
  |---|---|---|
  | Away draw no bet, or away/draw double chance | Will <home> win? | NO |
  | Home or draw | Will <away> win? | NO |
  | Home win / away win | Will <team> win? | YES |
  | Over / under N.5 goals | <Home> vs. <Away>: O/U N.5 | OVER / UNDER |
  | Team over / under N.5 | <Home> vs. <Away>: <Team> O/U N.5 | OVER / UNDER |
  | Both teams to score | <Home> vs. <Away>: Both Teams to Score | YES / NO |

- **Where the markets are:** the match event `unl-<hom>-<awa>-<date>` (win, draw, win) and `<same>-more-markets` (goals, team goals, both to score, halves). Search with `gamma-api.polymarket.com/public-search?q=…`.
- **Prices:** put `pm: {slug, q, idx}` on each pick's market, then run `python3 video/lib/pm_prices.py <file>` just before rendering. It updates every price, the slate and the "Prices at" chip.
- **Leave out, and say why:** a match with no live market (dead or old date), or a part of a pick that Polymarket can't combine (say "Poland or draw & over 1.5" becomes "Romania win: NO" only). Warn about a thin market (under about $10,000 liquidity).
- **Branding:** "Polymarket" in text only, in our own card design. No Polymarket logo, and no "cmvng × Polymarket": that suggests a partnership we don't have.
- **Compliance:** this is a tips video, so it carries `"tips": true` (the betting-word check is off). Keep "18+ · Not financial advice · Only where Polymarket is legal" on screen. Post it on TikTok, Telegram, Facebook or X, never as a monetised YouTube video.
- **Write-up:** for each match, list the app's pick and confidence, then the Polymarket market, side and price, as in `video/out/polymarket-2026-10-02-post-kit.md`.

## Explainers (motion graphics)

When the owner asks for an explainer ("explain Packs", "a video on how X works"), copy
`video/templates/explainer/limitless-packs-2026-10-03.json` and read `video/templates/explainer/README.md`.

- **Sound:** keep the approved settings: `af_heart` with `voice_fx: "deep"` at speed 1.0, `sound: "cinematic"`, a drop
  track (`music_track` 720 or 370) with `music_drop: "hook"`, and a cold open before the drop. The owner called the plain
  voice and soundtrack "basic"; this is the fix.
- **Two versions** when the owner can't choose: render once per `music_track` (each has its own beat grid).
- **The same edit for analysis and post-match videos** (owner, 3 Oct): a cold open (`analysis.cold` / an `rx_cold` beat),
  the title on the drop, `sound: "cinematic"`, `voice_fx: "deep"`. See the "cinematic edit" sections in
  `video/templates/match-analysis/README.md` and `video/templates/reaction/README.md`. Drop tracks rotate (19 in
  `lib/music.json`), so the soundtrack changes from video to video.

## The cold open (approved house style, 3 Oct: "the dark opening… the aura that keeps people excited")

Every analysis, post-match review and explainer opens cold. The renderer already defaults to the cinematic sound and
voice A for these modes, and when a cold open exists the music's drop lands on the next screen. Your job is the writing:

- **3–4 short lines, about 8 seconds.** One striking number per line, big on screen over a dark black-and-white photo.
- **Build, then a punchline.** The last line is the twist (red, with a glitch): the stake, the surprise, the doubt.
  Analysis: "41 years old." → "Still scoring for Croatia." → "87 goals for England." → "And today, only 100 England fans
  are allowed in." Post-match: "This morning, we made four calls." → "Ninety minutes each." → "Tonight, the scores came in."
- **Never give the answer away.** No verdict, no score, no tally in the cold open: the payoff comes after the drop.
- **Facts only from the sources file**, and numbers the viewer can feel (ages, goals, fans, minutes, money).
- Then silence (`tail` about 0.5 s) and the title slams in on the drop. Don't add a line that repeats the cold open in the title screen.
- **Facts** come only from the product's docs and app, listed in a sources file. The product's own logo, colours and
  art stay (credited, with the "not affiliated" footer).

## The owner's own recordings (talking head + chart)

When the owner sends a video they filmed (an X post link, or a Drive/Dropbox link to the original), edit it with
`video/edit-video.mjs`, following `video/templates/talking-head/README.md`: fetch (`video/lib/fetch_x.py`), transcribe
with word timings, write the edit decision list (cold open from their own strongest lines, clean clips cut only at
pauses, a zoom and a callout per clip, the showcase, the end card), check the cut by transcribing `voice.wav`, look
at stills, then render `--fmt vertical` and `--fmt wide`. Always clean the voice (`"voice": { "enhance": "df3" }`) and
keep the music under it (`level` -6, `duck` 10): the owner wants their voice clear and forward. On a crypto video
the showcase is the coin itself (live price, 24h change, 4-hour candles with the levels they talked about), not the
site. Reference: `eth-2026-10-02.edl.json`.
Phone screen recordings (no face-cam) use `"layout": "phone"` (reference `meme-2026-10-03.edl.json`). The owner's
rules from that video: never clip or drop words inside a sentence (cut only at real silences, whole phrases, via
`video/lib/phrases.py`), keep pauses natural, show the screen at its full width, never cropped at the sides (logos, names and prices
must show), labels in their own band, and highlight boxes with close-ups for the numbers they talk about, and check every cut edge and every number on screen before sending.
Desktop screen recordings with a face-cam corner use `"layout": "screen"` with `--fmt wide` (reference
`xo-2026-10-04.edl.json`). First check the screen and the voice are in sync: the owner records them on two devices and on
4 Oct the screen ran 18 s ahead (see the template README for the one-line fix). Take every number from the screen, not
from the transcript. The owner's rule (4 Oct): no part of the recording is ever cut out, their face included. The face-cam card
keeps the camera's own shape and shows the whole camera picture (no trimming, no punch-in); check it on stills across
the video before rendering.
A camera file plus a separate phone screen recording uses `"layout": "duo"` with `--fmt wide` (reference
`better-combos-2026-10-05.edl.json`, steps in the template README): the owner on a studio set
(`video/lib/studio_bg.py`), the whole phone beside them, a close-up panel between that follows what they talk about.
The owner prefers the vertical render of the same EDL (`--fmt vertical`): the phone screen fills the frame at full
width and the owner sits small in a corner (5 Oct: "I cannot even see the main things on the screen" in the 16:9 one).
Better still, and what the owner expected for the 5 Oct Polymarket video: the style of the two crypto creators they sent
on 4 Oct (the owner full frame, the phone floating in as tilted cards over the upper half, numbers popping out as cards,
white list cards, full-screen walkthroughs with the owner in a corner). See "Inspiration the owner likes" in the template README.
Look through the whole phone recording for private moments (incoming calls show the number, the notification shade)
and freeze over them; read the screen with `video/lib/screen_read.py` and check every count and number against it;
captions the transcript can't settle are re-transcribed on their own, and lines still unclear are left out at silences.
Subtitles: `python3 video/lib/edit_srt.py <out>/plan.json <name>.srt`.
**Delivery of any file over the 30 MiB chat limit (the owner, 7 Oct: "Why didn't you send me the site to download the
high quality version").** Send a compressed copy in the chat (two-pass, about 28 MB, as `daily.sh` does) and, every time,
publish the full-quality file(s) on a private download page: an Artifact with the `downloads` capability that fetches
the file in base64 parts (11,500,002 bytes each, so each text part stays under 16 MB), plays it, and saves it with one
tap. Upload at most four parts per publish (64 MB a publish). Reference pages: the 5 Oct edit and "Held Too Long" (7 Oct,
both cuts on one page). Check one served part against the local file, then give the owner the link with the chat copy.

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
- **Look:** set `"style"`. Use the one the owner asks for: `stadium` (home ground photo), `broadcast` (team-colour TV graphics) or `players` (recent photos of the home team's players, which falls back to the stadium). If the owner doesn't say, rotate day to day.
- **Names:** check every name the voice says against what the phonemizer does (`k.tokenizer.phonemize(name, 'en-us')`). Wrong ones go in `SAY_IPA` (`video/lib/narration.mjs`) as exact IPA with one stress mark, not as hyphenated respellings (those stress every syllable: "Doo-ay" came out doo-EYE, and the owner heard it). Test with Kokoro and faster-whisper.

## 3. Render

```bash
bash video/daily.sh render video/out/picks-<date>.json        # or results-<date>.json
```

Run it in the background. It takes about 5–8 minutes; the first run in a new session also installs the voice model (about 350 MB). It ends with `VIDEO` (full quality), `SEND` (under 29 MB for chat), `SCRIPT` (the post caption) and `CREDITS`.

(`bash video/daily.sh picks|results` does fetch and render in one go with the built-in template lines. Use it only if the owner wants it fast and unedited.)

## 4. Check, then send

- **Study it first (the owner, 6 Oct: "study each video after you create them… where you made mistakes and what you
  take from it").**
  - The render ends with `REVIEW video/out/<slug>/review/review.md`. Open `review/sheet.jpg` (a frame per spoken line)
    and read the review: the voice heard back, the pronunciation list, loudness and the drop, pace, still stretches,
    colour mix. Fix what it flags.
  - Then add an entry to `video/templates/REVIEWS.md`: what worked, the mistakes and how they got through, what
    changes next time. Add the owner's reaction when it comes.
  - Before starting any video, read the "Change next time" lines of the last three entries.
- **Pronunciation:** the render prints a pronunciation check before recording the voice (also in `say-check.txt`):
  every unusual word with its stressed syllable in capitals. Speech-to-text can't hear a wrong stress, so read it by
  eye; fix wrong ones with IPA in `SAY_IPA`. `node video/make-video.mjs <file> --say-check` prints it alone.
- **Frames:** pull 4–6 with ffmpeg (opening, a pick card, the slate or totals, the last card), put them in one contact sheet and look. Check for overlapping text, a missing stadium or crest, or a wrong name.
- **Voice:** transcribe the final audio with faster-whisper (`base.en`) and compare it with the script. Fix any name the voice gets wrong in `SAY_NAMES` in `video/lib/narration.mjs`, then re-render.
- **Send:** send the `SEND` file with SendUserFile (`display: render`). In a few short, plain-English lines, say which session it covers and list the picks; for results, won/lost and the money. Mention anything left out. Offer the caption from `script.txt` and the credits from `credits.txt`.

## If it fails

- `No session published for <date> yet`: the app hasn't published yet. Say so and list the sessions it has.
- A fetch error or empty legs: the site may be down, or its layout changed. Fix the readers in `video/lib/cmvng-site.mjs` against the live HTML; never guess the data.
- HTTP 429 from Wikimedia or TheSportsDB only slows the stadium or crest lookup. A team without a photo or crest falls back to the cmvng background or shield.

## Rules

- **Read-only:** only the public pages of cmvngpicks.com are read. Never change the app, its database, its Railway settings or its environment variables. The owner deploys the app.
- **On screen:** keep "18+ · Predictions, not guarantees" visible; the template already does this.
- **The owner:** plain English, short sentences, no jargon.
