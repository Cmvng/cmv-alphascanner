# Post-match review and reaction videos

The follow-up to every match analysis: what happened, the moments, the reactions, and how our read held up. Made after full time, for X, YouTube Shorts, TikTok and Facebook.

## Judging a verdict: called it or missed it (the owner's rule, 9 Oct 2026)

There are only two results: **Called it** and **Missed it**. Never "half right".

> "If you made a prediction that Chelsea will win or just there will be goals in the match, if it happened, that means
> you called it. It's simple."

- If what the verdict said happened, it's called: "Slavia, comfortably" ended 0–1, and "Al Nassr, narrowly" ended 3–0.
  Both are called. The predicted score and the margin are never judged.
- "X don't lose" is called if X won or drew.
- A two-part verdict ("goals, and a GKS win") is called when both parts happened, and missed when either didn't.
- Say every miss plainly. The tally has two boxes: called and missed.

## How it's built

`mode: "review"` with a list of **beats** in `review.beats`. Every screen is written for the match, so no two videos run the same way (YouTube won't pay for near-identical template videos).

| Beat | What it shows | Good for |
|---|---|---|
| `hook` | Full-time score slam, crests, a 2–5 word **headline** ("Denmark do it again"), an emoji burst and a crowd sound | Always first: the score and the verdict in the first 2 seconds |
| `moment` | Minute, an emoji icon, the player (with photo if a free one exists), one line, an action clip (slow motion works) | Goals, saves, red cards, VAR, the turning point |
| `meme` (white) | A white caption block over a reaction clip, with a punch zoom and a boom | "Portugal fans at 0–1:", "Højlund at Parken be like:" |
| `meme` (`style: "pov"`) | Big "POV:" text over a full-screen reaction clip | "POV: you said Portugal win easy" |
| `stats` | Full-time numbers as bars, plus a "stat that hurts" chip with a record scratch | "Won the xG 2.1–0.6. Still lost 😭" |
| `read` | Our read before kick-off and the model bar, against the final score, with a stamp: CALLED IT ✅, MISSED IT ❌ or HALF RIGHT 🤏 | Every review: honesty builds trust |
| `ratings` | Quick-fire ratings, one player a beat, each with an emoji | Hero to zero |
| `quote` | A quote card: what a coach or player said after the game (short, attributed, from a dated report), with their photo or crest (`quote`, `who`, `role`, `player` for a photo) | The reaction from inside the camp |
| `table` | The group table after the game, plus what it means | Nations League, league run-ins |
| `cta` | Follow, and the next fixture | Always last |

Extras on any beat:
- `sticker: {e: "💀", at: 1.2, x, y, r}` pops an emoji sticker.
- `burst: {e: "🔥🇩🇰⚽", at}` sends emoji rising up the screen.
- `sfx` picks a sound: `boom`, `crowd`, `groan`, `scratch`, `aww` (sad trombone), `pop`, `ding`, `impact`.
- `hold` sets a beat's length when it has no voice.
- `clip: {id, from, speed}` adds a clip.

## The newspaper (np_*, first used 5 Oct 2026: "The Final Whistle")
Tomorrow's paper, tonight: a sheet of newsprint over the stadium at night. Reference: `newspaper-2026-10-05.json`.
`np_cold` (a printing press sets the opening lines in the dark; the next screen lands on the drop), `np_front` (the
front page spins in: masthead, headline, a halftone photo clipping, the score box, a deck, "Inside"), `np_report` (the
match report types itself into two columns), `np_moment` (the minute, a torn clipping with tape and a handwritten
arrow), `np_numbers` (stat bars in ink and blue), `np_called` (our morning read taped in, stamped CALLED IT, HALF RIGHT
or WRONG), `np_quote`, `np_briefs` (other results, each stamped against our call), `np_table`, `np_back` (folds shut).
`np_timeline` (minute by minute: the line draws down, each event lands as it is spoken and the score box ticks over)
and `np_bench` (up to three photo clippings pinned up, goal minutes handwritten under them) were added after the owner
asked for better scenes and sequence; the report and moment pages told the same goals twice. Paper, typewriter, tape and stamp sounds are in `lib/sfx.json`. Listen for numbers that sound like words: "Belgium one"
is heard as "Belgium won", so say "one-nil to Belgium".

## Under review (vr_*, first used 6 Oct 2026)
The morning's calls go to the review screen, like a VAR check. Reference: `under-review-2026-10-06.json`.
- **The look.**
  - A light-blue review room with white monitors.
  - Every team in its own kit, set on the pick as `kit: {home: {c, bg, ink}, away: {...}}`. `c` is the main colour;
    `bg` is a swatch (a CSS background, e.g. Croatia's chequers, `repeating-conic-gradient(#E1251B 0 25%,#FFFFFF 0 50%)
    0 0/22px 22px`); `ink` is the text colour on `c`. Without a kit, the crest's colour is used.
  - Green, red and amber only mean called, missed and half right.
  - The cold open is deep royal blue.
- **The case strip.** A strip of every match runs along the bottom and fills in as each verdict lands.
- **The screens:**
  - `vr_cold`: playback in the dark: `steps` (one big line per spoken line), a `clock` running from the morning call to
    tonight, and the ten calls lighting up on a scrub bar. `whistle: [line, at]` adds a whistle.
  - `vr_title`: UNDER / REVIEW on the drop, and a wall of one monitor per match.
  - `vr_replay`: a monitor with the score and the moment, plus a scrub bar coloured by who was ahead.
    - `items: [{min, kind: goal|og|red|yellow|sub|save|miss, team, who, tag, text, line, at}]`.
    - The playhead travels to each minute as it's spoken.
  - `vr_stat` ("Freeze frame"): split bars in the two kits.
    - `rows: [[label, home, away, line, at, hot, note]]`; the `hot` row gets an amber outline once it's said.
    - `callout` with a `player` photo.
  - `vr_call`: the call, checked and stamped.
    - `read`, `score`, then `checks: [{label, note, ok, line}]` are each stamped CONFIRMED or OVERTURNED on their line.
    - The stamp (`verdict: called|half|missed`) lands on the last line.
  - `vr_quote`: a quote card, if one is published.
  - `vr_table`: the table, plus notes timed to lines.
  - `vr_board`: four mini monitors.
    - `items: [{match, comp, score, read, verdict, chip}]`, one spoken line each. The score counts up; the verdict lands
      at the end of the line.
    - `verdict: "later"` is for a game still to finish.
  - `vr_tally`: the count, by verdict.
  - `vr_end`: next fixtures (`next: [{when, badges: [[match, side], ...], text}]`); the monitor switches off.

## Arrivals (ar_*, first used 8 Oct 2026)
The post-match as an airport arrivals board: the follow-up to a "route" analysis (the 7 Oct "Follow the Sun" globe), where
every game "lands" overnight. Reference: `arrivals-2026-10-08.json` (built from the morning's config: the picks keep
their `ko`, `city` and `kit`, plus `score_home`/`score_away`).
- **The look.**
  - A light terminal page with faint glass panes; split-flap tiles that turn through the drum to their letters.
  - Score tiles in each team's kit colour. Green, amber and red only mean called, half right and missed.
  - Deep royal blue only for the cold open (a runway at night, the approach lights chasing toward the horizon).
- **The screens:**
  - `ar_cold`: one big flap word per line (`steps: [{big, label, clock, tone, glitch}]`); a small flap clock; on the
    last line a plane's landing lights grow out of the horizon; the drop follows.
  - `ar_title`: ARRIVALS flips in on the drop, then the board: every game's time, city, crests, blank kit tiles,
    "LANDED".
  - `ar_flight` (one per game): the city and kick-off big, the score in kit tiles, the flight path, and the boarding
    pass.
    - `events: [{min, kind: goal|og|pen|red|post|save|line, team, who, min_label, line, at}]`. The plane reaches each
      event on its spoken line, and the score tiles flip as it passes each goal. Close events put their labels on
      opposite sides of the path.
    - `end_min` (default 90) for games settled in stoppage time.
    - The pass: `call` (the morning's verdict, in words), `fields` (likeliest score, our numbers); "Final" flips to the
      score at landing.
    - The stamp (`verdict: called|half|missed`) lands at the end of the last line.
    - The strip of all the games along the bottom fills in as each verdict lands.
  - `ar_board`: the whole board again, every score and verdict flipping in row by row, then the tally (`counts`).
  - `ar_end`: the board turns to DEPARTURES with the next fixtures (`next: [{when, city, status, lines: [{match, side,
    name}]}]`), "Follow for the next analysis", then the tiles go blank and the hall goes dark blue.
- **Sound:** an airport chime (Mixkit 1570) and the departures hall (357) under the cold open; a low jet into the drop
  (1579); a synthesised split-flap clatter (`flap`, `flaps`, `flapsl` in `audio.py`); a jet landing at every full time
  (1576); a stamp and a crowd for called, a groan for half right, a thud for missed.
- **Judging a call:** called or missed only; see "Judging a verdict" at the top.

## And the winner is… (en_res, en_board; first used 9 Oct 2026)
The results night for an "envelope" analysis ("The envelope, please", `video/templates/match-analysis/README.md`).
It opens the morning's envelopes against the final whistles. Reference: `video/out/postmatch-2026-10-09-envelope.json`.
- **Reuse:** the morning's `picks` (with `kit`), its `en_cold` and `en_title` beats, and its stadium photos. It is a
  companion of the morning video, so render with `--allow-same`: the repeat guard sees the shared envelope family.
- **`en_res` (one per game):**
  - The home ground behind, players and coaches behind the lines about them (`photos`, as `en_game`).
  - The score slams in as kit-coloured tiles (`score: [h, a]`, `ht`). `head` is the game's story in 2–5 words.
  - "How it happened": `moments: [{min, team: home|away, text, tag, at: [line, frac]}]`. Each row appears on its
    spoken words. When the sources disagree on a minute, the chip says "Early" or "Late" instead.
  - This morning's card slides in (`morning: {text, short, score}`). The stamp lands on the last line, which always
    starts "The verdict:" and says the call plainly (`verdict: called|half|missed`).
- **`en_board`:** every game's score, "Our call: …" and its stamp, then the tally of called, half right and missed.
  Set the timing with `stamps_at` and `tally_at`.
- **`en_end`:** takes `photos` too, so the last screen still stands in a real stadium. It shows no grid without
  `en_game` screens.
- **Judging:** called or missed only; see "Judging a verdict" at the top. (Before 9 Oct this section had a "half
  right" stamp for the wrong margin or one part of two. The owner found it confusing, so it is gone.)

## Rules that keep it monetised and legal

- **No broadcast footage. Ever.** Not even 2 seconds. A Content ID claim stops the money however short the clip.
- **Clips** come only from `video/lib/clips.json`: Mixkit clips checked to be under the free licence. Some Mixkit clips are "Restricted" (personal use only); those are banned, and the render stops if a clip isn't in the list. To add one, open its Mixkit page and check it says "Mixkit Stock Video Free License".
- **No agency photos** (Getty, Reuters, AP). Player photos come from Wikimedia Commons with credit, as in the previews.
- **No famous meme photos** (Drake, distracted boyfriend: they're owned). Text memes ("POV:", "Nobody:", "X fans right now") over our licensed clips are fine.
- **Real commentary in every video.** YouTube won't pay for "mostly non-verbal reactions" or clips stitched together with no narrative. The voice must carry the story.
- **The usual checks.** No betting words (the check runs automatically), never "AI Analyst", and photo credits in the description.
- **Facts from dated match reports.** Scores, minutes and scorers must come from a source, never from memory.

## Making one

1. After full time, research the match with a subagent:
   - the final score and the scorers with minutes;
   - 3–5 key moments;
   - full-time stats;
   - what the coaches and players said;
   - the table now;
   - the next fixture.
   
   Every fact needs a source and date.
2. Copy the beats from the template file that fits, then rewrite every line and pick clips by mood (see `clips.json` tags: `celebrate`, `shock`, `pain`, `rage`, `laugh`, `watch`, `goal`, `penalty`, `action`, `stadium`).
3. Render with `bash video/daily.sh render video/out/review-<date>-<match>.json`, check a frame of every beat, transcribe the voice, then send.
