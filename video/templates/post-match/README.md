# Post-match review and reaction videos

The follow-up to every match analysis: what happened, the moments, the reactions, and how our read held up. Made after full time, for X, YouTube Shorts, TikTok and Facebook.

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
