# "One of my flops" (the owner's recording, 13 Nov 2026, upright, 2:57)

The owner's 3:28 selfie take about one of their flops: about a month ago they started making videos for XO Market's
campaign on Kaito (top 50 rewarded, about 851 creators); about eight posts later they did not make the leaderboard;
the first of those videos cost them their Limitless ambassador badge (the coordinator said they were "promoting
another prediction market"; getting it back meant referring 10 people who trade $200); the Limitless ambassador work
paid "$50 for like three plus months of work. Nah, never again"; "chin up, you cannot be unlucky for 365 days". With
it, nine screenshots of their own posts on X (24 Sep to 5 Nov). The brief: "the pictures are what are the things I
was talking about... it's just me talking about my flops... my experience also with an ambassador program where I was
paid $0.5 per tweet... and the inspiration I've gotten from this". Out folder: `video/out/one-of-my-flops/`.

Built the way the fifth Primus version was (the checkpoint): the owner's own frames and voice, untouched; cuts,
graphics and quiet music on top; one encode; measured against the raw. Tools from the 13 Nov RNT template.

## The idea
The story told with their own posts. The eight XO posts stack in on a 24 Sep to 19 Oct timeline, drop into a dustbin
(DID NOT COUNT), 851 creators fill a board where only the top row of 50 is lit; on "at least it pushed me to start
creating video contents" the posts come back out of the bin. Then the Limitless badge falls, a checklist for getting
it back never ticks, and the real 5 Nov post lands before "$50 for 3+ months" and NEVER AGAIN.

## The moves, and the sample each is from (`../../STYLE-LIBRARY.md`)
| Move | Sample | Where |
|---|---|---|
| ONE OF MY / FLOPS as giant type behind the head, the handle pill above | S1, S3, S4 | 0:00 |
| "about a month ago", XO Market's own logo, "on Kaito", "for the top 50" as chips on their words | S1 (glass chips) | 0:07 |
| Their first XO post (24 Sep), whole, then pushed in on "my first approach... (Unfiltered)", ringed on "first ever approach" | S3 (a real page, the line outlined) | 0:18 |
| **Their own posts stacking in on a timeline** (new): eight posts, whole, 24 Sep to 19 Oct, one per beat of "8 videos or 7" | S2 (their post cards), S3 (screenshots on a timeline) | 0:33 |
| The posts fly into a dustbin, DID NOT COUNT stamped on top | S1 (objects acting the words), S2 (a stamp) | 0:39 |
| **851 dots in rows of 50** (new): the top row lit on "top 50", the other 801 pour in on "851 creators", "@i_am_vickyd not in the top 50" | S3 (a data card that builds) | 0:42 |
| An icon over the head on the word: shrug, the good side, thoughts and opinions, swearing face, see-no-evil monkey, hourglass, heart | S2 | 0:52 onwards |
| The posts come back out of the bin on "it pushed me" | S1 | 1:02 |
| Their first video beside the Limitless badge, which falls on "badge" and leaves a dashed outline: "removed" | S1 | 1:12 |
| "What I was told": Limitless, chevrons running to XO on "driving traffic" | S1 | 1:28 |
| **A checklist that never ticks** (new): "refer 10 people" (ten people pop on "10 people"), "they trade as much as $200"; the lock shakes on "badge back" | S1 (a checklist) | 1:39 |
| Their 5 Nov post, whole; $50 for 3+ months; NEVER AGAIN | S2, S4 (a giant number) | 2:11 |
| TRYING / PUSHING / TRYING on each word, BREAKTHROUGH behind the head | S2, S4 | 2:32 |
| chin up, 365 DAYS behind the head, the follow click on "days" | S2, S4 | 2:50 |
| Word-by-word captions, nine big phrases | S2, S3, S4 | throughout |
New against the 13 Nov RNT video: the posts on a timeline, the dustbin, the dots board, the badge, the checklist,
stamps, icons over the head. Kept: type behind the head, captions, follow click. No meter, flow, tiles or count-up.

## What is real
Their own posts (screenshots they sent), shown whole; XO Market's and Limitless's own logos from their sites. Every
number is the owner's own words; the dots card says "as I saw them on the campaign's Kaito page". Kaito's site could not
be opened (a bot check), so the campaign's numbers are not confirmed independently. `sources.md` lists everything.

## Build
```bash
K=<work dir>; RAW=<raw.mp4>; T=video/templates/talking-head/camera-flop-xo-2026-11-13; PAGE=<page dir>
ffmpeg -i $RAW -vn -ac 1 -ar 16000 $K/src16.wav
# words: faster-whisper medium.en -> words_in.json; each unclear phrase scored against the sound (CTC forward score of
# each candidate wording: ctcscore.py <wav> <from s> <to s> "<wording>"...); fixes by index -> words_fixed.json (fixwords.py)
python3 -I video/lib/align_words.py $K/src16.wav $K/words_fixed.json $K/words_ctc.json
python3 -I $T/plan.py $K                          # the cut from the real silences (two repeats out), the captions
python3 -I $T/tokens.py $K
python3 -I $T/mix_raw.py $K $RAW <720.mp3> 22.906 22.906 83.81 10 5
python3 -I $T/matte60.py $K $RAW <rvm.onnx> 0-6.4,151.9-157.3,169.8-173.6 && python3 -I $T/clean_alpha.py $K   # OUTPUT times
# $PAGE holds flop.html, cover.html (links), plan.js, tok.js, img/posts/p1..p9.png, img/logo/*, img/e/*.png, img/still.png
ALPHA=$K/alpha60c.mkv node $T/render_raw.mjs $PAGE/flop.html $K $RAW <dir> --stills <times>
CRF=18 ALPHA=$K/alpha60c.mkv node $T/render_raw.mjs $PAGE/flop.html $K $RAW <out.mp4>      # 7 to 8 minutes
python3 -I video/lib/versus_quality.py $RAW <out.mp4> $K/segs.json --voice $K/mix_raw_voice.wav
python3 -I $T/review.py $K <out.mp4> && python3 -P -E $T/hearback.py $K
node $T/cover.mjs $PAGE/cover.html <out prefix>   # cover, its middle square for X, the wide thumbnail
```

## What this recording taught
- **Score an unclear phrase against the sound, do not guess it.** Each doubtful wording was scored on the wav2vec2
  CTC posteriors (forward log-likelihood of each candidate). It settled "say my mind" (not "save"), "it's not a
  stepping stone" (as said), "you did your best, I did not get rewarded" (as said) and "zero point zero five dollars".
- **The owner's spoken number can differ from their own post.** They say $0.05 per tweet; their post and message say
  $0.5. The captions keep the spoken words; the message asks.
- **A stray word must not throw away a whole stretch of good times.** `plan.py` used to re-time a whole island by
  word length when one word strayed into the next pause (169 words). Now only the stray run is spread over the gap its
  neighbours leave, and a squeezed neighbour is laid out with it (6 small islands left to the old rule).
- **One spoken token can cover two caption words** ("I learnt"): `tokens.py` now shares its span between them.
- **An empty card again:** the checklist arrived three seconds before its first line. The card now comes with it.
- **CRF 14 on a grainy phone picture is 24 Mbit/s** (536 MB for 2:57, over X's 512 MB cap without Premium) while the
  face kept 108% of its detail. CRF 18 is the delivery setting: 14.5 Mbit/s, 326 MB, face detail 102% (lowest 91%).
- **A hear-back flag can be a word that is not there:** "and I'm like this" had no "and" in the sound (dropping it
  scored far better than dropping any other word). Score flags against the clean source, alternatives of equal length.
