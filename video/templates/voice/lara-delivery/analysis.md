# Lara's delivery, measured

> Verified 7 Nov 2026 by an independent re-measure (different silence detector, pitch tracker and alignment): rate, pauses, pitch level and range, loudness and emphasis confirmed within ~2 %. Corrections applied below: whisper timing, full-stop contour shares, comma micro-gaps. Emphasis st values are against the phrase median; above function words the lift is about +1.9 st for numbers, +2.0 contrast words, +2.7 names, +5 project names.

The owner wants the voice he likes from ElevenLabs without using ElevenLabs. "Lara – Natural, Relatable and Engaging" (eleven_v4, voice_id `vChnJZ1Cu89g2XXumPfT`) is a real person's professional library voice, so we do **not** copy its timbre (the sound of the voice). We measured its **delivery**, meaning how it paces, pauses, moves its pitch, stresses words and phrases a script, so that we can apply the same delivery to a voice we are free to use.

- **Takes:** three of our own generated files, 4.5 minutes in all:

  | Take | Length | Text used for the measurement |
  |---|---|---|
  | Primus (5 Nov) | 69.1 s | the exact text sent to ElevenLabs (`prim_trim.txt`) |
  | Agentics Credit (4 Nov) | 105.7 s | the video's captions |
  | Bagel (3 Nov) | 95.4 s | the video's captions; whisper large-v3 was re-run for the word times |

- **Files:**
  - `measure.py` does the measurement.
  - `profile.json` holds the machine-readable targets. Its `tts_targets` block holds the few numbers a pipeline needs.
  - This file explains the numbers.
- **Re-run on any new take:** `python3 -I measure.py <audio> <words.json> <script.txt | captions.json> out.json --compare profile.json`. It prints each target, the new take's value and a z-score.

## The delivery in one paragraph

Lara is a brisk, even, conversational explainer. She speaks at about **4.5 syllables a second** (≈166 script words a minute) and holds that rate whatever the content: lists, numbers, names and punch lines are not slowed. Pauses come **only where the punctuation is**. A full stop is a steady **~365 ms**, a new topic **~425 ms** and an ellipsis **~380 ms**. A comma pauses about half the time (**~200 ms**). Words with no punctuation between them never get a pause, not even before a number. Each phrase **starts high and peaks early**, on its first content word, about a quarter of the way in, some 7 st above her median. It then **falls steadily** (−3.7 st/s) to a **low, often creaky ending**, and the last word is stretched to **1.7×** and drops about 5 dB. Each new sentence **resets** the pitch up by ~4.7 st. Project names, numbers and contrast words ("not", "only", "every") take the pitch and loudness peaks. Her loudness is very even (phrase level SD 1.25 dB) and she takes **no audible breaths**.

## Per-take numbers

**Pace**

| | Primus | Agentics | Bagel | Pooled |
|---|---|---|---|---|
| Script words | 182 | 293 | 273 | 748 |
| Syllables (as spoken) | 278 | 418 | 367 | 1,063 |
| Script words / min | 158.3 | 166.6 | 171.9 | **166.3** |
| Syllables / s including pauses | 4.03 | 3.96 | 3.85 | 3.94 |
| Articulation rate, syl/s (pauses > 150 ms removed) | 4.51 | 4.59 | 4.42 | **4.51** |
| Share of time spent in pauses | 11.7 % | 14.0 % | 13.3 % | 13.2 % |
| Sentence rate p10 / median / p90, syl/s | 3.91 / 4.58 / 5.27 | 3.84 / 4.62 / 5.51 | 3.57 / 4.34 / 5.13 | 3.74 / 4.50 / 5.42 |
| Sentence rate CV | 0.12 | 0.14 | 0.16 | 0.15 |

**Pauses, ms.** Each cell is the median when she pauses, then (% of those boundaries with a pause of 80 ms or more, n boundaries).

| Boundary | Primus | Agentics | Bagel | Pooled (median ± sd) |
|---|---|---|---|---|
| Full stop inside a paragraph | 365 (100 %, 9) | 385 (100 %, 17) | 335 (100 %, 17) | **365 ± 56** (100 %, 43) |
| New topic or scene | 485 (100 %, 4) | 465 (100 %, 4) | 368 (100 %, 10) | **418 ± 88** (100 %, 18) |
| Ellipsis "…" | 435 (100 %, 5) | 350 (100 %, 2) | 290 (100 %, 3) | **382 ± 65** (100 %, 10) |
| Colon or dash | – | 338 (100 %, 2) | 240 (100 %, 1) | 330 ± 57 (100 %, 3) |
| Comma | 110 (40 %, 15) | 245 (74 %, 23) | 175 (40 %, 25) | **200 ± 87** (52 %, 63) |
| No punctuation, before a number or name | – (0 %, 9) | 80 (4 %, 24) | – (0 %, 31) | (2 %, 64) |
| No punctuation, anywhere else | 115 (1 %, 139) | 325 (0.5 %, 220) | – (0 %, 185) | (0.4 %, 544) |

**Pitch and energy**

| | Primus | Agentics | Bagel | Pooled |
|---|---|---|---|---|
| F0 median, Hz | 212 | 204 | 217 | **211** |
| F0 p5 – p95, Hz | 166 – 330 | 163 – 323 | 167 – 338 | |
| Range p5–p95, st | 11.8 | 11.9 | 12.2 | **12.0** |
| SD, st | 3.66 | 3.65 | 3.74 | 3.68 |
| Declination in a phrase, median, st/s | −2.5 | −4.2 | −4.3 | −3.75 |
| Pitch reset at a sentence start, st | +4.7 | +5.6 | +4.1 | +4.7 |
| Full stops: share that fall / share that end low or creaky | 0.38 / 0.77 | 0.52 / 0.71 | 0.56 / 0.81 | 0.51 / 0.77 |
| Upspeak at full stops | 0.15 | 0.19 | 0.11 | 0.15 |
| Loudness, LUFS / true peak, dBTP | −19.9 / −1.0 | −20.0 / −0.9 | −19.7 / 0.0 | −19.9 |
| Drop on the phrase's last word, dB | −4.4 | −5.5 | −4.6 | −4.9 |
| Phrases with a creaky end | 0.18 | 0.28 | 0.16 | 0.21 |
| HNR, dB / jitter % / shimmer % | 18.5 / 1.6 / 7.0 | 17.5 / 1.9 / 7.6 | 17.9 / 1.8 / 7.5 | 18.0 / 1.8 / 7.4 |
| Spectral tilt, dB/oct / centroid of voiced frames, Hz | −6.1 / 411 | −6.2 / 414 | −6.2 / 435 | −6.2 / 420 |

The three takes agree closely. The rate, F0 range, SD, loudness and voice-quality numbers sit within a few percent of each other, so this is a stable style, not one lucky take. Commas vary most: Agentics paused at 74 % of them, the other two takes at 40 %.

## A. Pace

- **Rate:** an articulation rate of 4.51 syl/s (4.42–4.59 across takes), or 3.94 syl/s with the pauses included.
  - Sentences spread from 3.7 to 5.4 syl/s (p10–p90), a coefficient of variation of 0.15.
  - That is lively but not erratic.
- **Content changes the rate very little.** Median phrase rate against all phrases (n is the number of phrases):

  | Phrase kind | Rate vs all phrases |
  |---|---|
  | Lists (short comma chains) | 0.99 (16) |
  | With a number | 0.98 (33) |
  | With a name | 0.99 (25) |
  | Key lines (sentences of 6 words or fewer, or with a mid-sentence "…") | 1.01 (33) |
  | The hook (first sentence) | 0.99 (9) |
  | Short phrases (1–3 words) | 0.96 (43): final lengthening weighs more in a short phrase |
  | Long phrases (7+ words) | 1.02 (43) |

- **Asides speed up.**
  - "By the way…" sentences run at ×1.08 (9 phrases).
  - The one true parenthesis, "(just an example to show the maths)", ran at 5.5 syl/s, ×1.21. It was also 1.75 st lower and 0.7 dB quieter than the main line.
- **Numbers and names are not slowed.** Mid-phrase, a word's own syllable rate was compared with the rest of its phrase:
  - Multi-syllable numbers ran at ×1.35, against ×1.12 for other multi-syllable content words. Per syllable, numbers are said **faster**: a duration factor of 0.83.
  - Names ran at ×0.99, against ×0.88 for content words (factor 0.90).
  - Examples: "47" ("forty-seven", 4 syllables) took 0.56–0.61 s; "$8,200" took 1.5–1.6 s for 8 syllables. She marks numbers with pitch and loudness instead (section D).
- **Pre-pause lengthening is the main timing device.**
  - A word before a pause of 150 ms or more is **1.75×** its expected length. The same word compared with itself mid-phrase is ×1.31 (31 words).
  - A one-syllable word takes **0.43 s** before a pause and 0.19 s mid-phrase.
  - By boundary: colon ×1.88, new topic ×1.70, comma ×1.63, ellipsis ×1.59, full stop ×1.53.

## B. Pauses

The pause table above is the core result. In plain words:

- **The full stop is her metronome: 365 ms**, with a narrow spread (sd 56 ms, p10–p90 310–432 ms).
  - It is a little longer before a new topic or scene ("If you're new", "So", "Now", "Let's say", "By the way"): **418–425 ms**. At a paragraph break it is 439 ms on average.
  - Every sentence end had a pause; no exceptions in 65.
- **The ellipsis "…" pauses like a full stop (382 ms)** but does not close the melody (section C).
  - Mid-sentence ellipses averaged 350 ms ("one answer… [445] and Primus Labs", "all they get is… [290] active trader").
  - Ellipses at a sentence end averaged 412 ms.
- **The colon pauses ~330 ms** with a deep fall before it ("Now the part that matters: [330]").
- **The comma is a coin flip.** 52 % of commas get a pause of 80 ms or more, averaging 200 ms (p10–p90 107–317 ms).
  - Most of the rest get a 30–80 ms micro-gap: 82 % of commas have an energy dip of 30 ms or more at −50 dB (only 40–83 % are true silence, depending on the detector).
  - Commas inside lists behave the same (56 %, 200 ms).
  - A comma right before a number or name was always paused, at 250 ms (n = 3): "Team loses, [250] $0."
- **No punctuation, no pause.**
  - Before a number or name with no punctuation she paused at 1 of 64 boundaries: "shows 47 trades", "about $8,200", "put $100".
  - Elsewhere, 2 of 544 word gaps had a pause:
    - "they get [115] every trade, the timing and your balance", a beat before a list;
    - "settles at exactly $1 [325] or $0", a beat before the alternative.

    The Bagel script wrote the second kind out as "it's $20… [395] or zero".
- **Breaths:** none detected in any take. ElevenLabs v4 rendered these scripts without audible inhalations, and the pauses are clean silence.
- **Final lengthening goes with every pause** (section A). The two always come together: a stretched last word, then the silence.

What the pause timing looks like in practice ([ms] = measured gap):

> Your exchange shows 47 trades, [55] about $8,200 in volume. [400] Upload a statement, [40] and they get [115] every trade, [115] the timing, [140] and your balance. [345] Connect the account, [35] and they can keep reading it. [545] With Primus, [85] you make a proof from the exchange page itself. [310] … So all they get is… [290] active trader, [105] yes. [330]

> Team wins, [245] each share pays $1, [180] so $200. [415] Team loses, [250] $0. [385] (just an example to show the maths) [435] You don't have to wait for full time, [320] you can hit Close and it sells at whatever the price is right then. [365] Hold till the end and it settles at exactly $1 [325] or $0. [455] Now the part that matters: [330]

## C. Pitch

- **Level and range:**
  - The median is 211 Hz (204–217 across takes). The 5th–95th percentile range is about 165–330 Hz, which is **12.0 st**, with an SD of 3.7 st.
  - That is a wide, animated range for narration. A flat corporate read is usually 6–8 st.
- **Shape of a phrase:** one phrase is a stretch between punctuation or pauses of 150 ms or more; 141 had enough voicing to measure.
  - **Onset:** +0.8 st above her median. The first phrase of a sentence starts higher than later ones: +1.7 st against +0.1 st (medians).
  - **Peak:** +7.4 st, early, at **24 %** of the phrase's length (median). The phrase range is 10.5 st.
  - **End:** −1.9 st.
  - **Declination:** −3.75 st/s (median; −3.7 st/s on phrases of 1 s or more). The pitch falls from the early peak to the end without a second climb.
- **Reset:** a new sentence starts **+4.7 st** above where the last one ended (sd 3.6). After a new-topic boundary the reset is +5.7 st.
- **Final contours:** measured over the last word, with ±1.5 st as the threshold for a rise or a fall:

  | Boundary (n) | fall | level | rise | fall-rise | rise-fall | ends low or creaky |
  |---|---|---|---|---|---|---|
  | Full stop (61) | **0.51** | 0.18 | 0.15 | 0.08 | 0.08 | **0.77** |
  | Comma (63) | 0.37 | 0.10 | 0.10 | 0.25 | 0.19 | 0.54 |
  | Ellipsis mid-sentence (6) | – | 0.33 | 0.17 | 0.33 | 0.17 | 0.50 |
  | Ellipsis at a sentence end (4) | 0.50 | 0.25 | 0.25 | – | – | 0.75 |
  | List item before a comma (13) | 0.23 | – | 0.31 | 0.23 | 0.23 | **0.23** |
  | Colon (3) | 1.00 | – | – | – | – | 1.00 |
  | Last phrase of the take (3) | 1.00 | – | – | – | – | 1.00 |

  - **Low confidence:** the fall / level / rise shares at full stops depend on the method (39–45 % of full-stop endings are too creaky to track). An independent re-measure got 0.33 / 0.11 or 0.09 / 0.39 instead of 0.51 / 0.15. Do not use them as synthesis targets; what holds is that about **2/3 to 3/4 of full stops end low or creaky** (0.67–0.77).
- **Declaratives end low:** 77 % of full stops end low (at least 1.5 st under the phrase median) or creaky. A quarter end in **creak** (vocal fry), seen as F0 dropping to 50–90 Hz in the last 150 ms.
  - **Upspeak** (a full stop ending on a rise above the phrase median) is rare: 15 %.
  - **Commas use a continuation contour.** Fall-rise and rise-fall make up 44 %, against 16 % at full stops.
  - **List items stay up:** only 23 % end low.
  - **A mid-sentence ellipsis suspends the melody:** level or fall-rise, never creaky. "So all they get is…" ends +4.6 st up. That is the "wait for it" sound.
- **Questions:** the scripts had none. The quoted "will Liverpool win" was read level and creaky, with no question rise.
- **"Anyways…" (the sign-off)** falls 8–13 st across the word, the largest fall in each take.

## D. Emphasis

For every phrase of 3 or more words we found the word holding the phrase's F0 peak and the word holding its energy peak, then sorted those words by category. There were 116 phrases. In the table, **p(peak)** is the share of words in the category that carried their phrase's F0 peak, and **lift** is how much more often that happens than chance. The last three columns are each category's mean across all its words: F0 above the phrase median, level above the phrase's mean word level, and duration stretch when not before a pause.

| Category (words) | p(peak) | lift, F0 peak | lift, energy peak | st | dB | stretch |
|---|---|---|---|---|---|---|
| Project name (6) | **0.67** | 4.0 | 2.0 | **+6.3** | **+3.4** | 1.12 |
| Name, acronym or UI label (23) | 0.35 | 2.1 | 1.3 | +4.0 | +2.6 | 1.15 |
| Contrast word: not, only, every, just, even, nothing… (49) | 0.35 | 2.1 | 1.7 | +3.3 | +1.3 | 1.08 |
| Number or amount (37) | 0.30 | 1.8 | **2.3** | +3.2 | +1.75 | 1.07 |
| Verb (109) | 0.16 | 0.9 | 1.3 | +2.0 | +0.9 | 1.12 |
| Other content word (160) | 0.19 | 1.1 | 0.9 | +1.65 | −0.1 | 1.29 |
| Function word (318) | 0.10 | 0.6 | 0.6 | +1.3 | −0.7 | 0.70 |
| **First content word of the phrase** | **0.56** | **3.3** | 2.6 | | | |
| Last content word of the phrase | 0.13 | 0.8 | 0.8 | | | |
| The editors' key words (Bagel `*word*`, 53) | 0.15 | 0.9 | 1.4 | +0.9 | +0.4 | 1.12 |

The "st" column uses each word's 90th-percentile F0, so even function words sit about +1.3 st up. Read the other rows against that floor.

- **Position beats meaning.** Lara's main accent goes on the **first content word** of the phrase (56 %). Inside that, a project name, number or contrast word wins when one is present.
  - The F0 peak sits a quarter of the way through the phrase's words (median position 0.25).
  - The last content word gets the peak only 13 % of the time. Ends are for falling and lengthening, not for pitch.
- **Numbers are stressed by loudness more than by pitch.** They carry the phrase's energy peak 2.3× more often than chance, and are +3.2 st and +1.75 dB up.
  - "$10,000" +8.0 st / +4.6 dB
  - "48%" +8.7 st / +3.9 dB
  - "580" +8.5 st / +7.9 dB
  - "$20" +7.5 st / +5.5 dB
- **Project names get the strongest accent:** +6.3 st and +3.4 dB. "@agenticscredit" was +10.8 st, the highest point of its phrase.
- **Pitch and loudness peaks fall on the same word in 46 % of phrases.** The strongest accents (combined pitch, loudness and length) average +5.9 st, +3.3 dB and a stretch of 1.20.
- **Lara does not follow an editor's key-word marks:** the Bagel `*key words*` peaked at chance level (lift 0.9). To steer her stress, move the word toward the front of the phrase, or make it a contrast word or a name (see the script rules below).

## E. Energy and voice quality

- **Output level:**
  - −19.9 LUFS integrated, the same on all three takes (−20.0 to −19.7).
  - True peak −1.0 to 0.0 dBTP, so the raw take needs the limiter we already use.
  - Loudness range 2.6–2.9 LU.
- **Very even:**
  - The SD of phrase loudness is only 1.25 dB.
  - Inside a phrase, the content words' peaks span a median of 5 dB.
  - Within a phrase the frame-level range (p95–p10) is about 31 dB. That number is mostly consonants against vowels.
- **Phrase-final drop:**
  - The last word is **−4.9 dB** under the rest of its phrase (sd 3.2). The last 200 ms is −10.4 dB under the phrase mean.
  - The drop is deepest at a colon (−8.0) and before a new topic (−6.8), then a full stop (−5.2), a comma (−4.1) and an ellipsis (−3.6). The ellipsis keeps its energy up because the thought is not finished.
- **Creak:**
  - 21 % of phrases end creaky: 25 % of full stops, 21 % of commas, 10 % of ellipses.
  - HNR falls by ~7.8 dB (median) in the last 150 ms of a phrase.
  - Creaky ends are a large part of why she sounds "relatable" rather than announcer-like. A tiny re-voiced blip (< 60 ms) often follows the creak; we ignore it in the contours.
- **Spectrum:** a tilt of −6.2 dB/octave, an alpha ratio of −7.9 dB, a Hammarberg index of 18.9 dB and a voiced centroid of 420 Hz. This is a warm, fairly dark, non-pressed voice. These numbers describe timbre; we report them so that the free voice can be EQ'd in the same direction, not to copy the voice.
- **Rough periodicity:** HNR 18 dB, jitter 1.8 %, shimmer 7.4%. Taken on 128 kbps MP3 TTS, these are indicative only.
- **Breaths:** none.

## F. How she handled specific tokens

| Written | Said (whisper) | What she did |
|---|---|---|
| "…" mid-sentence | – | Pause 290–445 ms, melody suspended (level or fall-rise), small energy drop (−3.6 dB) |
| "…" at a sentence end | – | Pause ~410 ms, usually a fall |
| "$8,200" | "eight thousand two hundred dollars" | 1.5–1.6 s, no pause before it; carried the F0 and energy peak of "about $8,200 in volume" (+3.0 st, +2.9 dB) |
| "$10,000", "$9,300", "$700", "$100" | in full, with "dollars" | 0.9–1.7 s, +5.8 to +8.0 st above the phrase |
| "47" | "forty-seven" | 0.56–0.61 s (fast), no pause before, +2.5 to +4.7 st |
| "0.50" | "**50 cents**" | The TTS rewrote it. Write what you want heard |
| "5" | "five" | |
| "$0" | "zero" | Low and falling, −3 st, a −5 st fall |
| "12%", "48%", "0.5%" | "twelve percent", "zero point five percent" | Percent amounts take the peak like money does |
| "ZK-TLS", "F.H.E." (Primus text) | letter by letter, "Z-K-T-L-S", "F-H-E" | ZK-TLS: 1.17 s at a sentence start after 420 ms, +7.8 st |
| "ACS", "NBA" | letters | Stretched ×1.4–1.5 at a phrase end |
| "@agenticscredit" | "Agentics Credit" | 0.90 s after a 515 ms pause; the highest pitch of its phrase (+10.8 st, +5.7 dB) |
| "Primus Labs" (written as the name in the TTS text) | "Primus Labs" | +6–9 st |
| "So…" / "So" opening a sentence | | Pause 280–445 ms before (median 335), none after; starts +2.8 st above the phrase |
| "By the way," | | ~490 ms before, then fast (5.5 syl/s) and +2.4 st; then a 70–130 ms comma |
| "(just an example to show the maths)" | | ×1.21 faster, −1.75 st, −0.7 dB: classic parenthetical prosody |
| Lists "NBA, Premier League, La Liga," | | No pauses between the first items, 330 ms after the last; items rise or stay up |
| "X or Y" | | A beat of 325–395 ms before "or", even with no punctuation |
| "anyways…" (closing) | | ~430 ms pause before, 0.63–0.71 s long, a big fall (−8 to −13 st), no creak |
| Quoted question "will Liverpool win" | | Read level and creaky, no question rise |

## G. Script style that works with this voice

| | Primus (TTS text) | Agentics (captions) | Bagel (captions) |
|---|---|---|---|
| Words / sentences | 182 / 17 | 293 / 22 | 273 / 29 |
| Words per sentence, median (p10–p90) | 11 (7–15) | 14 (4–22) | 9 (3–17) |
| Ellipses per 100 words | 3.3 | 1.0 | 1.1 |
| Commas per sentence | 0.9 | 1.05 | 0.9 |
| "you / your" per 100 words | 5.0 | 6.8 | 7.0 |
| "I / my" per 100 words | 0.5 | 2.0 | 1.5 |
| Contractions per 100 words | 2.8 | 4.4 | 5.9 |
| Numbers written as digits / as words | 4 / 0 | 17 / 0 | 15 / 1 |
| Questions | 0 | 0 | 0 |

- **Openers** that recur: "If you're new," "So…", "Now…", "Let's say…", "By the way,", "This is my account.", and "anyways…" to close.
- **Address and tense:** second person throughout, a light first person ("I tried it", "my example", "my link is in the post"), and present tense.

## How to write a script for this delivery

These rules turn the measurements into writing habits. A TTS voice that only reads punctuation will then land close to Lara's timing. A pipeline that can set breaks and pitch, using `tts_targets` in `profile.json`, will land closer still.

1. **Sentence length:**
   - Write sentences of **8–14 words** (a median of about 11), mixed with **3–6-word punch lines** ("This is my account.", "Same rules.", "Team loses, $0.").
   - At ~166 words a minute, a 60 s video holds about **165 words**, and 100 s holds about 275.
2. **Punctuation controls the pauses:**

   | Write | You get |
   |---|---|
   | "." | ≈ 365 ms |
   | A new paragraph, or "So / Now / If you're new / Let's say / By the way" at a sentence start | ≈ 420–440 ms, with a pitch reset |
   | "…" | ≈ 380 ms, with the melody held up: setups, cliff-hangers, "wait for it" |
   | ":" | ≈ 330 ms, with a firm fall: before an explanation or a list |
   | "," | a 50 / 50 chance of ~200 ms; otherwise only a micro-break |

   - If the beat **must** happen (before a reveal, a number or a reaction), use a full stop or an ellipsis, not a comma.
3. **No punctuation means no pause.**
   - She will run straight into a number or a name ("shows 47 trades", "about $8,200").
   - To set a number apart, put a comma before it ("Team loses, $0." → 250 ms) or an ellipsis ("it's $20… or zero").
4. **Numbers:**
   - Write money and percentages as digits with the symbol: "$8,200", "12%", "47 trades". They are read in full, quickly, and given pitch (+3 st) and loudness (+1.75 dB).
   - Write the words you want heard when the digits are ambiguous: "50 cents", not "0.50".
5. **Acronyms and handles:**
   - Write acronyms as letters: "ZK-TLS", "F.H.E.", "ACS". They are spelled out and stretched at a phrase end.
   - Never put an @handle in the voice text. Write the spoken name ("Agentics Credit", "Primus Labs") and keep the @handle for the captions.
6. **Put the word you want stressed early in its phrase.**
   - The pitch peak goes on the first content word 56 % of the time, and the end of a phrase always falls.
     - "**580** and above puts you on the waitlist" stresses 580.
     - "you get on the waitlist at 580 and above" would bury it.
   - Project names and contrast words ("not", "only", "every", "just", "even", "nothing") pull the accent too. Use them when the emphasis matters: "Not the 47 trades, the $8,200 or your login."
7. **One idea per phrase, and a fall at every full stop.** Lara's phrases go high and then down. Long chains of subordinate clauses flatten into one long fall. Split them.
8. **Asides go fast and low.**
   - Put disclaimers in "By the way," sentences or (parentheses). They are read ~8–20 % faster and, in parentheses, lower and quieter: "(just an example to show the maths)", "these numbers are just my example".
9. **Lists:** "NBA, Premier League, La Liga," gives quick items that stay up, then a pause after the last item. Lead in with a colon ("pick a league: …") for a clear beat before the list.
10. **Alternatives:** write "X… or Y" for the "$1 or $0" suspense beat. She tends to add it anyway.
11. **Openers and the close:**
    - Start sections with "If you're new,", "So…", "Now…", "Let's say…". Each gets a ~420 ms beat and a pitch reset, which is where scene changes and stickers can land.
    - End with "…anyways…" for the signature falling sign-off.
12. **Tone of the words:**
    - Direct address (5–7 "you / your" per 100 words).
    - A little first person (0.5–2 per 100: "I tried it", "my example").
    - Contractions (3–6 per 100 words).
    - No questions. Lara's quoted question was read flat, so if you need a real question, test it.

## Applying the profile to a voice we are free to use

1. Write the script by the rules above, as plain text with real punctuation and blank lines between sections.
2. Synthesise with the free voice at its own pitch. Keep its median: Lara's 211 Hz is a reference, not a target. Aim for her **range (≈12 st)** and her **phrase shape** (an early peak, then a fall), not her register.
3. Get word times: `words.py`.
4. Run `measure.py … --compare profile.json`. The biggest levers, in order, are:
   1. articulation rate (4.5 syl/s);
   2. pause lengths by class (365 / 425 / 380 / 330 / 200 ms);
   3. final lengthening (×1.75);
   4. F0 range and reset (12 st, +4.7 st);
   5. the share of low or creaky full stops (≈ 0.77);
   6. emphasis on numbers and names (+3–6 st, +2–3 dB).
5. Pauses can be corrected after synthesis without touching the voice. The measurement already knows each boundary's class and its gap, so silence can be stretched or trimmed to the `break_ms` targets.
6. Level the raw voice to about −20 LUFS before the usual mix (−14.5 LUFS, limiter at −1.4 dBTP).

## Caveats and measurement uncertainty

- **Sample size:**
  - Three takes, 270 s, one model (eleven_v4). Section totals are solid: 65 sentence ends, 63 commas, 141 phrases.
  - The rarer classes are thin: ellipsis 10, colon 3, parenthesis 1, questions 0.
  - ElevenLabs is stochastic: the same text twice would differ. The sd values give the spread to expect.
- **Script text:**
  - Primus was measured against the exact text sent to ElevenLabs.
  - Agentics and Bagel were measured against their captions, which can differ in punctuation from what was sent. Bagel's captions start in lowercase.
  - Topic starts come from openers, paragraphs and the scene times in the caption files.
- **Alignment:**
  - Words are re-timed by CTC forced alignment (wav2vec2-base-960h, int8 ONNX, 95 MB, cached in `~/.cache/huggingface`). Word edges are good to about ±20–40 ms.
  - Without that model, `measure.py` falls back to whisper times plus an estimated lag. On Agentics the fallback gave the same pause medians within ~10 ms for sentences, topics and commas.
- **Pause threshold:** silence is anything under −50 dB relative to the loud frames. At −45 dB the medians grow by about 20 ms; at −55 dB they shrink by about 15 ms. Gaps of 30–80 ms inside phrases are often consonant closures (as in "builds a score [35] called"), not pauses.
- **Pitch:**
  - Praat autocorrelation, 120–500 Hz, with octave jumps removed. Creak is read from a second track with a 50 Hz floor.
  - Rise and fall need ±1.5 st over the final word. Contour labels are approximate, especially on one-syllable words.
- **Emphasis categories are heuristic:**
  - Verbs come from a lexicon.
  - "Name" includes app buttons such as "Live", "Sell" and "Close".
  - Syllables are counted by rule from what whisper heard (about ±10 %).
- **Voice-quality numbers are rough:** HNR, jitter and shimmer were taken on 128 kbps MP3 TTS output.
- **Breath detection** could miss a very quiet inhale, but no take had any unvoiced island with breath-like spectra.
- **A side finding for timing anything to `words.json`:** faster-whisper large-v3 word starts run about **0.13–0.16 s early mid-phrase, but about 0.4 s early on the first word after a pause** (42–53 % of those more than 0.4 s early), which is exactly where captions and reaction stickers land (independent re-measure, 7 Nov). Use CTC-aligned times (`video/lib/align_words.py`), not whisper + 0.2 s.