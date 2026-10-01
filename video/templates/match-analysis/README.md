# The match analysis template

**Reference video:** Denmark v Portugal plus the League A round-up, 1 October 2026 (2:02). The owner approved it as the template for every analysis video.

- `denmark-portugal-2026-10-01.json` is the exact file that made it: app numbers, research, script.
- `frames.jpg` shows the end of each screen, in order.
- `sources.md` lists every researched fact with its source.

**House style:** it is "the analysis" or "match analysis". Never "AI Analyst" on screen, in the voice, in titles or in posts: the owner finds it cringe and low effort, and the render stops if the phrase appears.

Every new analysis video copies this structure, tone and level of detail. Only the facts change.

## Platforms

X and YouTube (Shorts up to 3 minutes; X up to 2:20 without Premium). The video is football analysis only, with no betting content, so it can be monetised. Tips videos go to TikTok and Facebook instead.

## Screens, in order

| # | Screen | What it shows | Voice | Length in the reference |
|---|---|---|---|---|
| 1 | `pv_hook` | Both crests, "Match Analysis", competition and kick-off | Match, place, then the night's biggest story ("…without Cristiano Ronaldo, who has left the squad") | 10.9 s |
| 2 | `pv_stake` · What's on the line | The group table, highlighted, and 2 notes | The table, then what a result changes | 12.8 s |
| 3 | `pv_players` · Players to watch | 4 cards: photo, name, role, club and one fact | Two players a side, with the fact that makes each matter | 15.3 s |
| 4 | `pv_tactics` · How they play | Formation diagrams and 3 notes a side | Shape, then the one number that explains their style | 14.7 s |
| 5 | `pv_model` · Our model | xG and the win-chance bar from the app | **Why** the model says what it says, then the three percentages | 12.1 s |
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
