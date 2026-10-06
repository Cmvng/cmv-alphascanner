# Video reviews: what worked, what went wrong, what changes next time

The owner, 6 Oct: *"You need to study each video after you create them and see what improvements could be made on the
next video… and where you made some mistakes and what you take from it."*

## How this works

1. **Every render ends with a review.** `daily.sh render` runs `video/lib/review_video.py`, which writes
   `video/out/<slug>/review/review.md` and `review/sheet.jpg`:
   - a frame at every spoken line, in order;
   - the voice heard back by speech-to-text against the script;
   - the pronunciation list, with each unusual word's stressed syllable in capitals;
   - loudness, true peak, and how hard the drop hits;
   - pace per screen and length against each platform;
   - stretches where nothing moves;
   - the colour mix: it flags a video that is nearly all one colour.
2. **Look at the sheet and read the review before sending.** Fix what it flags, or say why not.
3. **Write an entry here** in the same format: what worked, the mistakes and how they got through, what changes next
   time. Add the owner's reaction when it comes.
4. **Before starting a video, read the "Change next time" lines of the last three entries.** Do them.

Speech-to-text can't hear a wrong stress (it wrote "Ethereum" for a wrong-sounding "ee-ther-REE-um"). So the
pronunciation list (`say-check.txt`, printed before the voice is recorded) is read by eye, every time.

---

## 6 Oct: post-match, "Under Review" (our ten calls v the final whistle)

- **Before writing:** read the last three entries' "Change next time" lines and applied them:
  - the whole slate, all ten games (the morning's lesson);
  - team kits on the blue page;
  - no "none" or "nil" right after a number in a sentence;
  - unique class names (`vr-…`);
  - stills before the first full render;
  - screens kept under 15 s;
  - the length checked against X while writing.
- **What worked:**
  - The idea pays off the morning: the calls go to a review screen, like a VAR check. Each part of a call is stamped
    CONFIRMED or OVERTURNED, then CALLED IT, HALF RIGHT or MISSED.
  - The case strip of all ten games along the bottom fills in as verdicts land, so the whole slate is always on screen.
  - The replay's scrub bar fills in the colours of whoever was ahead: the Croatia chequers, then Spain's red and
    yellow.
  - Honest verdicts: Spain won by one, not two (half right); Jordan v Venezuela was close but not a Jordan win (half
    right).
  - Facts from UEFA's own feeds (scores, minutes, cards, team stats, table, fixtures) plus dated reports.
- **Mistakes, and how they got through:**
  1. **The first render measured 82% blue.** The light page itself isn't counted (too pale), but the navy text, the
     navy caption boxes and the deep-blue cold open were, and the team colours only showed on thin bars and flags.
     The stills looked colourful to me because of the flags. Fixed: names, scores, numbers and the tops of the
     monitors are in each team's kit colour.
  2. **Three lines were heard wrong:**
     - "IK Start won five-one" was heard as "IK Start 151": "won five-one" merges into a number;
     - "the Faroes, two-all" was heard as "the pharaohs to all";
     - "six called, two half right" was heard as "to half right".
     Fixed: "five goals to one", "drew two-two", "and two half right".
  3. **The phonemizer guessed four words wrong:** "IK" (as "ick"), Niger (as "NYE-jer"), Montserrat's stress, and "St"
     (as "snt"). Caught on the pronunciation list before recording.
  4. **The end screen's flags were squashed:** `.vr-nx div` also matched the badge divs. Use `>` for layout rules
     inside cards.
  5. **Adding Kane's record and a quote pushed the estimate to 140 s.** Trimmed two lines.
- **Change next time:**
  - The colour check counts dark navy text as blue: put the subject's colours on the big type (scores, names,
    numbers), not only on bars and flags.
  - Never put a score straight after "won" ("won five-one"); say "five goals to one" or "beat … five-one".
  - Child selectors (`>`) for layout rules inside cards.
  - The wow pool is down to one fresh track (A New Life). Grow it before the next analysis.
- **The owner's reaction:** (waiting)

---

## 6 Oct: Papertrade explainer, "The House" (2:01, plus a 1:05 cut)

- **Before writing:** read the last entries. I applied their "Change next time" lines:
  - a light-blue page, with Papertrade in its own cream, ink and red (from their stylesheet and favicon);
  - the pronunciation list read before recording;
  - a stills check before the first full render;
  - screens kept under about 15 s, and the length checked against X;
  - a short cut for TikTok and Reels.
- **What worked:**
  - The idea comes from the project's own story: Papertrade's creators compare it to the 1900s bucket shops. So: a
    chalkboard and ticker tape, the house as a building whose balance starts at $0, a deli-counter queue for winners,
    a printer that prints PAPER when you lose, and "Here, the losers own it".
  - Every number is real: Bitcoin and Ethereum are live from Hyperliquid (14:41 UTC). The catch ($43 at 1000×) is
    worked out from their own liquidation docs.
  - No betting words ("trade", "lock in", "the house"), so it stays monetisable.
- **Mistakes, and how they got through (all caught before sending):**
  1. **The stills check caught four layout bugs:**
     - a dark box behind "You ⇄ The house": `.vs` clashed with the old PvP screen's class. This is the third class
       clash today (after `.bar` and `.vs` on Fungo Labs);
     - the logo overlapping the wordmark;
     - dark text on the red chip;
     - the last line running off the screen.
  2. **The trade screen** had the "Lose" label wrapping and the bottom half empty. It was reorganised.
  3. **The first script ran 2:27 (estimated).** It was cut to 2:01 before rendering.
  4. **The review caught a meaning error.**
     - "While the house holds under two million dollars, every dollar lost earns a hundred" was heard as "while the
       household's under $2 million, every dollar lost earns **$100**".
     - Two causes: "house holds" sounds like "household", and a bare number after money talk is heard as dollars.
     - Fixed: "the house **has**…", "earns a hundred **PAPER**".
  5. **The review said "86% blue".** The check ignored cream and ink, so a subject in neutral colours looked all-blue.
     The check now counts cream and ink.
  6. **A `--say-check` run wiped the finished render** (the same trap as `--stills`, fixed this morning only for
     stills). It's fixed for both now.
  7. **Final reviews are clean.**
     - Full video: the colour mix is cream 44%, blue 33%, ink 17%, red 4%. The drop rises +8.5 dB. The peak is −2.8 dB.
     - Short cut: its only flag was a false alarm ("zero dollars" heard as "$0"). The money check now skips lines that
       say "dollars".
     - The short cut is 1:05, a bit over TikTok's 60 s sweet spot. Next time, write it to 50–55 s.
- **Change next time:**
  - **New CSS classes get a unique prefix** for the format (`pt-…`, `kh-…`), never a short generic name: `.vs`, `.bar`
    and `.cnt` were already taken.
  - **A unit after every number:** "a hundred PAPER", "forty-three dollars".
  - **Avoid word pairs that merge** ("house holds", "none" after a number).
  - Lay out every screen for the full 1080×1920: no empty bottom half.
- **The owner's reaction:** (waiting)

---

## 6 Oct: Fungo Labs explainer, "The Keyhole" (2:09, three versions)

- **What worked:**
  - The idea: privacy told as *who gets to look*: a crowd of eyes, the keyhole wipe between the public's view and
    the holder's view, and "Seen by all / Known by one" as the ending.
  - Every move is cued to the spoken word.
  - Every fact is from fungolabs.org and their posts.
  - The safety lines ("no wallet needed yet", "never DMs first") protect the audience.
- **Mistakes, and how they got through:**
  1. **v1 was dark.** I read "shades of blue" and made it navy and black. The owner: "my style is light or shades of
     blue." Nothing checked the look against the owner's style before a full render.
  2. **v2 painted everything blue**, including the project. The owner: "the logo, the colour of the projects… the
     colour of the images should also remain there. Just that the background should reflect light or blue… so
     monotonous." I took the brand colour as a filter for everything. Blue is the page; the subject keeps its colours.
  3. **"Ethereum" was stressed wrong** ("ee-ther-REE-um"). The phonemizer guessed it, and speech-to-text heard
     "Ethereum" anyway, so my check passed. The same check also showed:
     - "NFTs" said without its s;
     - "homomorphic" as "hah-muh";
     - "memecoin", "Vitalik", "DeFi", "ERC" and "FHEVM" all wrong (not used in this video, fixed for the next ones).
  4. Two lines were caught and fixed before sending:
     - "mints sealed" was heard as "meant sealed";
     - "2,500 for the sale" was heard as "$2,500".
  5. **About an hour lost to crashes.** Renders crashed at random. I blamed the browser before checking `df -h /`; the
     disk was full.
  6. **The chat copy came out at 29.0 MB**, over the limit, because the encoder overshoots its target.
  7. **Found by the new review before sending v4** (the corrected voice):
     - for four seconds of the genesis screen, while the voice says "3,232 NFTs", the disc looked empty: the dots
       bloomed in dark grey on black (fixed: unlit dots are a lighter grey);
     - "four stats, an element" was heard as "four stats and element" (now "one element");
     - the genesis screen runs 16.8 s, and one caption wraps to two lines (left as they are).
  8. **A stills check wiped the finished render**: `--stills` cleared the whole output folder. Fixed: it now clears
     only `stills/`.
- **Change next time:**
  - The colour rule: a light-blue page, and the subject in its own colours, logo and images. The review flags a video
    that is over 80% blue.
  - Before the first full render of a new look, render 8–10 stills and check them against the owner's rules
    (colour, logos, layout).
  - Read `say-check.txt` before recording, for every video. Crypto words are in `SAY_IPA` now.
  - If renders crash, check the disk first.
  - The chat copy now aims at 28 MB.
  - "Could go viral": also cut a 45–60 s version. 2:09 is long for TikTok and Reels.
- **The owner's reaction:**
  - v1: "Use a different creative style… light or shades of blue."
  - v2: "the logo, the colour of the projects… should also remain… so monotonous."
  - v3: "the way it pronounced Ethereum is weird."
  - v4: (the corrected voice and the two review fixes; waiting)

## 6 Oct: analysis, Croatia v Spain, "The Vault" (2:20) and the full slate (4:59 + an X thread of three)

- **What worked:**
  - The heist idea and the blueprint look.
  - The drop on the title (+8 dB).
  - Every fact dated in the sources file.
  - The full slate split into an X thread at screen boundaries.
- **Mistakes, and how they got through:** (found by running the new review on both videos)
  1. **One match out of ten.** The owner: "you didn't highlight the other matches", then "you didn't even give the
     analysis for England… by the numbers." I chose the biggest match instead of covering the slate.
  2. **99% of the colour was blue.** That's the same monotony the owner called out on Fungo Labs. Croatia's red and
     white, Spain's red and yellow, England's white and red, and Czechia's red, white and blue never appeared.
  3. **"Czechia none" was heard as "Czechia nine"**, in the table. That's a wrong number in the viewer's ear.
  4. Smaller mishearings:
     - "Croatia lost 7–0" was heard as "seven now";
     - "Our read" was heard as "I'll read";
     - "let in 3" was heard as "led in 3".
  5. **"Czechia's" was read as "Czechia… es"**: a name with an exact pronunciation lost its possessive s. Fixed in
     `lib/narration.mjs` on 6 Oct.
  6. **Too long.** The first cut was 140.2 s, over X's 140 s (trimmed after). The full slate is 4:59, too long for
     everything but YouTube. The England screen ran 16 s, and two caption chunks were long enough to wrap.
  7. The true peak was over 0 dB on the first mix (fixed with the limiter in the final mix).
- **Change next time:**
  - Cover the whole slate unless the owner names one match.
  - Team colours on the page: kits and flags on the blue background.
  - Never say "none" or "nil" right after a number: say "no points", "without a goal".
  - Say scores as "seven–nil" with the dash, and check them in the heard-back list.
  - Check the length against X (140 s) before writing the last screens.
  - Keep each screen under 15 s.
- **The owner's reaction:** asked for the other matches, the England analysis, and a master prompt with every lesson.
