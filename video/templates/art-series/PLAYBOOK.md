# Art series playbook (Gamdom #Gamdom100kRound2): read this before every cut

Built on 22 Oct, after the owner rejected CUT 01 twice. It combines:
- their feedback;
- measurements of their four template reels;
- three research briefs, with sources in `research/` (`01-speech-edits.md`, `02-art-progress.md`, `03-challenge.md`).

## The brief in one paragraph
The owner draws, and the template tells the story. Their footage is never restyled. The template's speech and music are the only sound, and its words are the text. The edit is straight cuts on the speech's pauses and the music's hits. The challenge organisers asked for **no AI** ("everything BUT ai… over saturated with ai slop"), with extra points for real, hand-made content. Our edit must look and feel hand-cut: no generated imagery, no stock effects, no AI voice.

## What the owner said (22 Oct)
- "Why did you not use any soundtrack for what I sent to you? I gave you templates."
- "There's no need for you to change… the progress shot… You only tell the story with the templates."
- "Why did you change the color?… that makes the video quality to be bad."
- "Your slop AI transition sound… Look at the samples I sent you… night and day."
- They liked the clean short version: template 4's speech, its lines on black, cut against the untouched footage. Its only problem was length (15 s, under the 30 s minimum).

## Measured from their templates
- **Template 4** (gym, "I am not like everybody else…", 14.9 s):
  - opens on a 0.2 s flash of footage;
  - black text screens of 1.6–1.7 s alternate with footage bursts of 0.5–0.7 s;
  - after the speech, a montage of about 5 s (shots of 0.5–1 s) ending on a 2 s hold;
  - text is small: a line takes about 50% of the width, centred just below the middle (≈ 44 px serif at 1080 wide).
- **Template 2** (tattoo, 10.4 s): hook text at the top, five stages of 1.4–1.8 s each, then a 2.5 s continuous wipe reveal.
- **Template 1** (33 s): one static shot; plain white serif captions, one phrase at a time.
- **Template 3** (13 s): a speaker on black, word-by-word captions, one script accent word.
- **The track's hits:** −9 dB spikes in RMS per 0.1 s, between phrases. Cut there.

## Rules for every cut
1. **Sound:**
   - Use the template's own soundtrack, extracted from the reel, as the only sound. No whooshes, booms, risers, rumbles or Mixkit music.
   - If one template is too short for 30 s, join a second template's speech on a shared word ("…something different." → "You asked to be different"), cutting on a hit.
2. **Footage:**
   - Untouched: no grade, black-and-white, vignette, grain, light leaks, embers, flashes or zoom past the source.
   - Verify with `clean/cmp.py` (mean difference from the source under 0.5 out of 255).
3. **Text:**
   - The template's lines in plain white serif.
   - On black screens (template 4) or in the band under the footage (template 1).
   - On black screens, match the template's small size: about 44–50 px at 1080 wide.
   - One line at a time. It appears with the first spoken word and leaves before the next phrase.
   - A script accent on at most one word per line, and only if the template does it.
4. **Cuts:**
   - Straight cuts only: no transition effects.
   - Cut in breath pauses and on hits; never mid-word.
   - Choose shots for the feeling of the line (a hand pressing charcoal for "burning"), not its literal words.
5. **Story:** the art in session order (blank page → sketch → first black → spread → where it stands). The two human moments, the face and the hands, go on the strongest lines.
6. **Hook:** the first 1–3 s shows the strongest frame (the best detail so far) or the template's first line. Never a title or logo first.
7. **Format:**
   - Full-screen 9:16 is the target; Instagram recommends bordered Reels less.
   - With square source footage, keep it untouched on black. Once the owner films in 4K landscape, crop 9:16 from it: 1215 × 2160 from 4K is sharper than our 1080 × 1920 output.
8. **Export:** one encode from the original file, 1080 × 1920, 30 fps, H.264, crf 14. Text goes in before export. No CapCut end card. Tell the owner to turn on "Upload at highest quality" (Instagram) or "Upload HD" (TikTok).
9. **Posting the entry:**
   - Post on X with #Gamdom100kRound2, tagging @stevewilldoit, @gamdom and @kingadukes. Add "18+ | Gamble responsibly". No referral links.
   - TikTok bans gambling content in Nigeria and limits branded gambling content to approved brands. Instagram can mute copied audio.
   - On Instagram, export without sound and add the template's audio with "Use audio".

## The story the series can tell (from the research)
Gamdom was hacked and offline from 13 to 16 Oct. "BACK Online" went up on 16 Oct, and the challenge with "Must fight back when kicked down" a few hours later. Gamdom's logo is a castle tower. The owner's castle rising from the ashes **is** Gamdom coming back. The reveal can say so in one line from the owner's own words.

Round 1 had a real-life category, won by a hand-painted street mural plus a dance (47 s, vertical). That is the closest precedent. Another hand-drawn entry on paper already uses the tagline (@Dammycrypt19, 16 Oct). Stand apart with the scale (62 × 94 cm), the filmed journey across sessions, and a real reveal.

## Ask the owner for, every session
1. **Camera setup:**
   - a tripod on taped floor marks, the same spot every session;
   - the 1x lens, straight on, landscape, 4K 30 fps;
   - focus, exposure and white balance locked (Blackmagic Camera app, free);
   - a time-lapse of 1 frame every 2 s.
2. **Light:** room light off; one diffused lamp at 45°, on the side away from the drawing hand.
3. **Clear frames:** step out of frame for 5 s every 10–15 min.
4. **Close-ups:** real-time, 5–10 s each, with sound (charcoal, blending, dust, blackened fingers), plus one slow slide along the sheet.
5. **The finished piece:** a tape-peel reveal, a pull-back, and the owner standing beside the piece for scale.
6. **The file:** send the original (as a Document on WhatsApp, or a Dropbox/Drive link), never a WhatsApp video. No CapCut export.
7. **The templates:** send the cut's template reels along with the footage.
