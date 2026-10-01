# Match analysis template · study and improvements

Study of the Denmark v Portugal video (1 October 2026), the approved template. I checked:
- a frame from every screen and from key moments inside each screen;
- the timing of every line;
- the loudness;
- the whole voiceover, transcribed and read against the script;
- the other four videos from the same night.

## What already works (keep it)

- **Story first.** The biggest news (Ronaldo leaving) is in the opening line.
- **It explains the model.** Portugal are top, but the model leans Denmark, and the video says why.
- **Facts are real and dated.** Confirmed line-ups, real venues, a source for every fact (`sources.md`).
- **Sound.** Loudness is -14.4 LUFS, right where YouTube and TikTok set it (-14). The voice runs at 153 words a minute, a calm analyst pace, with short natural pauses.
- **Monetisation.** No betting words anywhere, and the automatic check passed (136 lines).
- **Length.** 2:02 is inside YouTube Shorts (3:00) and X (2:20).

## Fixed today (already in the template)

| Problem found | Fix |
|---|---|
| Both teams' bars the same colour. All four League A games had this: Denmark and Portugal both red, Greece and Netherlands both blue. The win-chance bar read as one block | When two teams' colours are close, the away side's segment turns light |
| The model screen showed "0% 0% 0%" for about 6 seconds while the voice explained xG. It looked broken | The percentages appear only when they count up |
| The players screen was half empty for about 8 seconds, until the away players came in | The away cards wait dimmed, then light up when the voice reaches them |
| Some players had no photo even though one exists (Mariano Díaz in the Dominican Republic video) | If the main photo is missing or too small, it searches the player's own photo category. Højlund still has no free photo large enough, so his card shows the crest |
| The voice read "4-4-2" as "four all two", and "2.0" as "two point" | Fixed, plus new respellings: Højlund, Damsgaard, Gonçalo, Leão, Vitinha, Haaland, Atlético, Gaich |
| "AI Analyst" on screen and in the voice sounded cringe and low effort (owner's call) | Now "Match Analysis" and "the analysis" everywhere. The render stops if "AI Analyst" appears |
| No thumbnail image | Every render now saves a cover image (`_cover.jpg`), the finished opening screen |

## Proposed next (each changes the look or the format, so they need your OK)

Ranked by likely impact.

1. **A headline for the match on the opening screen.** Every video opens with the same big title (now "MATCH ANALYSIS"), and the news only comes through the voice. Show the story instead, e.g. **PORTUGAL WITHOUT RONALDO**, with "Match analysis" as a small tag.
   - **Why:** people decide in the first 1 to 2 seconds whether to swipe away. YouTube also pays less for videos that look the same each time.
2. **A shorter opening.** The opening screen lasts 10.9 seconds. Aim for 6 to 7, with the news in the first sentence.
3. **Two versions from one render.**
   - The full 2-minute video for X and YouTube.
   - A 50 to 60 second cut (main match only, no round-up) for Shorts and Reels.
   
   Shorter videos are watched to the end more often.
4. **More movement inside long screens.** Most screens hold for 12 to 15 seconds and go still after the first 2. Add:
   - a slow zoom on the stadium photo;
   - a highlight on each point as the voice reaches it.
5. **One "big number" moment.** A full-screen stat such as **22 shots to 12**, the fact that explains the model. These are the frames people screenshot and share.
6. **Different music each video.** All five videos tonight used the same track. Rotate 4 to 6 tracks so the videos don't sound identical, and check each track's licence covers monetised YouTube.
7. **A male analyst voice as an option** (still open). The best free voice today is female. A paid voice or your own recorded voice would be the step up.
8. **A short follow-up after the match:** "How did our read hold up?", about 20 seconds. Football only, no betting. It builds a series and trust.
9. **Richer app numbers for international games.** The app's Denmark v Portugal page had 14 numbers and no shots or records, so the stats screen was left out. If the app showed the same depth as club games, the video would gain a stats screen. This is an app change, so it's your call.

## Rules learned this week

- **Timing:** make the video after the line-ups are out (about 75 minutes before kick-off), so formations and players are fact.
- **Names:** test every new name with the voice before rendering, especially Spanish, Portuguese, Nordic and African names.
- **Clashing numbers:** when the app's form clashes with confirmed recent results, leave that screen out.
- **Venues:** cup ties are often on neutral ground. Check the venue.
- **Round-up order:** matches from the main match's group go first.
