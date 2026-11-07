# Bagel, "my top picks for today" (7 Nov 2026): THE CHAIN

This is the owner's 4-pick Bagel combo (Fulham, Tottenham Hotspur, Arsenal, Manchester City, all to win; $2.84 → $31.23) and how
anyone can build one. A combo is a chain, and every link has to hold.

## Shape (79.6 s)
1. **Money hook (0–5.5 s).** "$2.84 → $31.23". The payout counts up as it's said.
2. **Bagel logo and chips.**
3. **The chain.** Four team links slam in on the beat. The track's drop lands on "Fulham". The counter goes "1 pick … 4 picks",
   then "11.0x", with Max payout $2.84 → $31.23.
4. **The owner's real slip, shown whole** (`page/img/slip.jpg`, 968×2174), under a camera (`PLAN.cam`).
   - The links move into a column on the right, and each one lights up as its pick is explained.
   - Blue rings on the screenshot mark the card being talked about (`PLAN.rings`, in screenshot pixels).
5. **"A combo is a chain".** All four links light up and all four cards are ringed. Then the slip's Cost and Max payout rows,
   with "roughly a 1 in 11 shot".
6. **The how-to.**
   - A 0.6 s pause is cut in before "If you're new", and the beat stops for it.
   - Four step tiles, beside the same real screen, with rings on Add Funds, Yes, the 5.37x multiplier, and Cost and Max payout.
7. **Warning** (all four must win, only stake what you can afford to lose, 18+), then the end card.

## Reactions
These are the owner as a character (`video/lib/react_flow.js`, `video/templates/reactions/PLAYBOOK.md`), all from the shirtless set.
- He listens beside the left edge of his slip (The Stare).
- He grins on "my brave one" (Crack-Up, frames 0–20).
- He's intrigued by Forest's home record (Hmm).
- He goes "uh-oh" on "all four have to win" (Nervous, 0–60, at 400 px).
- He ducks out for the how-to.
- He smiles on the end card (The Wince, 0–24).

## Build
```
python3 house_voice.py --text script.txt --out voice.wav --voice af_heart --project Bagel   # video/lib/voice/
python3 -I video/lib/align_words.py voice.wav voice.words.json words_ctc.json              # then page/words.js
bash mix.sh <work> voice.wav 403.mp3                                                      # Mixkit 403, drop on "Fulham"
bash video/templates/art-series/unveil/render_par.sh page/bagel-picks.html plan.json out.mp4 3 16
node cover.mjs page/cover.html <out>                                                     # cover + thumbnail
```
`page/plan.js` holds every time, in take seconds. Sources are in `sources.md`. `page/img/` (the owner's screenshot, the Bagel logo) stays in the work dir and is not committed.
