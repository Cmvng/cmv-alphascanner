# The match analysis template

**Reference video:** Denmark v Portugal plus the League A round-up, 1 October 2026 (2:02). The owner approved it as the template for every analysis video.

- `denmark-portugal-2026-10-01.json` is the exact file that made it: app numbers, research, script.
- `frames.jpg` shows the end of each screen, in order.
- `sources.md` lists every researched fact with its source.

**House style:** it is "the analysis" or "match analysis". Never "AI Analyst" on screen, in the voice, in titles or in posts: the owner finds it cringe and low effort, and the render stops if the phrase appears.

Every new analysis video copies this structure, tone and level of detail. Only the facts change.

## The cinematic edit (approved by the owner, 3 Oct 2026: the default for every analysis)

The owner liked the edit of the Packs explainer, asked for it here too, then approved the result ("the dark opening, the cold open, the punchline"). Reference: `croatia-england-2026-10-03-cinematic.json`.

- **Cold open** (`analysis.cold` + `script.pv_cold`): before the title, a dark screen with one big number per line over a
  black-and-white photo (a player to watch, by `player`, or the stadium). Example: "41 years old." (Modrić) / "Still scoring
  for Croatia." / "87 goals for England." (Kane) / "And today, only 100 England fans are allowed in." (stadium, red, with a
  glitch). Steps: `{ big, label, player?, tone: "hot"|"red", glitch, glitch_at }`, one per line; `pauses` and `tail` set the
  silences. Facts only from the sources file.
- **The drop:** the title screen lands on the music's drop, out of a short silence and a reverse swell.
- **Settings:** `"sound": "cinematic"`, `"voice_fx": "deep"`, `"voice_speed": 1.05`, `"music_drop": "pv_hook"`, and
  `"music_vibe"` (e.g. `["dark trap", "trap", "hip-hop"]`) to pick from the drop tracks in `lib/music.json`, which rotate.

## Another format: the blueprint heist ("The Vault", 6 Oct 2026)
Not every analysis has to run through the screens below. On 6 Oct the analysis was told as a heist plan drawn on a
blueprint (`mode: "review"` with `bp_*` beats, drawn by `review.html`; copy `vault-2026-10-06.json`). Use it when one
side is a "vault": a long unbeaten run, a fortress, a defence nobody scores against. Don't use it two days running.
- **The look:** blueprint paper in our blue, white plotter lines that draw themselves, monospace labels, the architect's
  handwritten notes, dossier photos in blue duotone, a title block on every drawing (`review.project`, `review.ref`),
  and the camera panning across one big sheet between drawings. Red only for danger (the alarm, cracks, FAILED).
- **The drawings:** `bp_cold` (numbers in the dark over a faint vault), `bp_title` (unrolls on the drop), `bp_target` (a
  dial counting the run), `bp_alarm` (a 90-minute clock, early goals marked in red), `bp_damage` (a wall cracking under
  the goals conceded), `bp_files` (two dossiers), `bp_plan` (a pitch, expected shapes, the passing as a laser grid,
  arrows and notes), `bp_history` (case files, stamped), `bp_chances` (a gauge, xG bars, the likeliest score),
  `bp_meanwhile` (the other match in the group), `bp_stakes` (the table, called "The prize": "stake" is a banned word),
  `bp_verdict` (our read, the vault shutting, the question).
- **Sound:** a safe dial ticking as the count climbs, the lock, a low alarm, a laser scan, pen on paper (lib/sfx.json).
- **Timing:** most drawings take `line`/`at` hints (which spoken line, how far into it) for when a mark, arrow, stamp or
  note lands. Check every drawing on stills at the real voice timing before the full render.

## Another format: Follow the Sun (a day of games around the world, 7 Oct 2026)
For a slate spread over countries and kick-offs. Reference: `follow-the-sun-2026-10-07.json` (mode "review", screens
`gl_*` in `review.html`).

**The look:**
- A globe (d3-geo, Natural Earth land in warm sand, a pale blue ocean) flies city to city as the kick-offs move through
  the day. The ball follows the great circle.
- At each stop, the night falls where it really is at that kick-off; the sun's position comes from the date and hour.
- The host country is tinted in the home team's kit, and the venue is labelled.
- A timeline of the day (Lagos time) runs along the bottom. The sun moves along it and becomes the moon after dusk.

**Each pick needs:**
- `ko` (Lagos "HH:MM");
- `city: {name, lat, lon, venue, local, iso}`, where `iso` is the numeric country code used for the tint;
- `home_short` / `away_short`;
- `kit` where the crest colour is wrong.

**The screens:**
- `gl_cold`: the globe at night, every city lighting up, one big line per spoken line.
- `gl_title`: FOLLOW THE SUN on the drop, the globe spinning while the day runs from the first kick-off to the last.
- `gl_match`: a stop, made of the kick-off board, the city, the model bar and `points: [[tag, text, line, at]]`.
  Keep it to two spoken lines.
- `gl_deep`: "Inside the game", for the headline games: last five as W/D/L pills, the table, key men, and the read.
  Each block lands on its line (`form_at`, `table_at`, `men_at`, `read_at`).
- `gl_end`: the whole route drawn city to city.

**The cover:** `node video/make-cover.mjs video/out/<slug>.json` after the render, with a `cover` block in the cfg. It
makes `<slug>_cover.png` (1080×1920) and `<slug>_thumbnail.png` (1280×720).

**Lessons from the first one:**
- The pale ocean and sand land are there because a saturated blue globe measured 91% blue.
- Eight stops fit under X's 140 s only at two lines each.

## Two cuts from one file

- **Full** (about 2 minutes, for X and YouTube): `bash video/daily.sh render video/out/<file>.json`
- **Short** (about 60 seconds, for Shorts, Reels and TikTok): `bash video/daily.sh render video/out/<file>.json --short`. The main match only, with no round-up and no tactics screen. Tighter lines go in `script_short`, which overrides `script` screen by screen.

## Platforms

X and YouTube (Shorts up to 3 minutes; X up to 2:20 without Premium). The video is football analysis only, with no betting content, so it can be monetised. Tips videos go to TikTok and Facebook instead.

## Screens, in order

| # | Screen | What it shows | Voice | Length in the reference |
|---|---|---|---|---|
| 1 | `pv_hook` | Both crests, the **headline** (`analysis.headline`, e.g. "Portugal without Ronaldo"), competition and kick-off | The story first, then the match: "Portugal top the group, and tonight they're without Cristiano Ronaldo. It's Denmark, in Copenhagen. Here's the analysis." | aim for 6–7 s |
| 2 | `pv_stake` · What's on the line | The group table, highlighted, and 2 notes | The table, then what a result changes | 12.8 s |
| 3 | `pv_players` · Players to watch | 4 cards: photo, name, role, club and one fact | Two players a side, with the fact that makes each matter | 15.3 s |
| 4 | `pv_tactics` · How they play | Formation diagrams and 3 notes a side | Shape, then the one number that explains their style | 14.7 s |
| 5 | `pv_model` · Our model | xG and the win-chance bar from the app | **Why** the model says what it says, then the three percentages | 12.1 s |
| 5a | `pv_big` · The number (optional, `analysis.big`) | One full-screen stat that explains the model, just before it: `{kick?, num}` or `{kick?, pair: [home, away]}` with both crests, a `label` and an optional `note` chip | The number, then why it matters | first used 5 Oct (France v Belgium: one goal conceded each in three games) |
| 6 | `pv_expect` · What to expect | 3 points and the verdict chip | How the game will look, the key duel, a history fact, then "Our read: …" | 15.3 s |
| 7+ | `pv_round` · Around League A | One screen per other match: its stadium, crests, xG, win chances and 2 notes | One storyline, then the model's favourite | 8.9–14.7 s each |
| last | `pv_cta` | "Follow for more match analysis" | "That's the analysis. Follow for more football, by the numbers." | 5.1 s |

Form and stats screens (`pv_form`, `pv_stats`) are skipped when the app's numbers clash with confirmed recent results. The likely-scores screen is left out of the analyst version.

## What made it work

1. **Lead with the news.** Ronaldo leaving the squad is in the first line.
2. **Explain the model.** Portugal are top, but the model leans Denmark, and the video says why: Portugal were outshot 22 to 12 in Oslo, and Denmark won the last meeting in Copenhagen. Never just read out numbers.
3. **Use confirmed line-ups.** It was made after the teams were announced (about 75 minutes before kick-off), so the formations and players are fact, not prediction.
4. **Give one specific fact per player.** "Scored the only goal the last time Portugal came here" beats "a key player".
5. **Round-up order:** matches from the same group come first, because they affect the main match's table.
6. **Calm analyst tone.** 153 words a minute, at voice speed 1.14.

## How to make one

```bash
node video/from-app.mjs matches                                         # match numbers on the app
node video/from-app.mjs preview --match <main> --with <id>,<id>,<id>    # app numbers for the main match + round-up
```

1. **Research** in parallel:
   - one deep brief for the main match (context and table, team news and confirmed XIs, two key players a side with a current stat, how each plays, the last 3 meetings, storylines, form);
   - one short brief (under 250 words) for each round-up match.
   
   Every fact needs a dated source; mark anything unconfirmed and leave it out.
2. **Fill in** `analysis`, the `round` object for each round-up match, a `stadium` for the real venue, `skip`, and the `script`. Copy the shape of `denmark-portugal-2026-10-01.json`.
3. **Check names:** test new names with Kokoro and whisper, and add respellings to `SAY_NAMES`.
4. **Render:** `bash video/daily.sh render video/out/<file>.json`. The betting-word check runs first.
5. **Check:** look at a frame from the end of every screen, then transcribe the whole voice with whisper and read it against the script.
6. **Send** the video and the post kit, and save `sources.md` next to it. The kit has:
   - the X post, opening "<Home> v <Away>: tonight's analysis 📊";
   - the YouTube title "<Home> vs <Away>: Match Analysis | <the story>";
   - the description, with photo credits;
   - the tags.
   
   The line "Narrated with an AI voice" goes only at the end of the YouTube description, never in the video.
