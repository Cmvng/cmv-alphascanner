# The owner's checkpoint: what they like, what they will not accept

One page. It is loaded at the start of every session (`CLAUDE.md`). Follow it without being asked. When the owner says
something new, add it here the same day with the date and their words; that is the only step needed for it to hold.
The long history is in `video/templates/REVIEWS.md`; the detail for each kind of video is in the `cmvng-video` skill.

The owner: a sports and crypto creator in Lagos. Handle **@Cmv_ng** (art: **@i_am_vickyd**). They ask in plain,
often voice-typed words ("Gundam" meant Gamdom, "Begu" is Bagel). They want the finished video, done properly, without
going back and forth.

## Before you start (settle these four, in this order)
1. **What did they send, and what is it for?** Their words are the brief. If they sent reels, templates or pictures,
   those are the brief too: their soundtrack, their editing style, their images.
2. **The soundtrack.** Choose it now, from "Sound" below. A track they have not heard goes to them as a 10-second
   sample before the build.
3. **The real material.** Which real screens, logos, footage and dated facts the video will show. If a real screen
   cannot be had, say so once, plainly, with the best real option, before building.
4. **The format.** Different from the last videos of the same kind (`video/templates/IDEAS.md`), one bold idea, and the
   shape for where it will be posted (upright for TikTok, Instagram and their own phone footage).

## Sound
- **Music they like:** cinematic film score with a quiet build and a hard drop. Named: **"A New Life"** (Mixkit 543).
  4 Oct: "The soundtrack was captivating." 6 Oct: "Remember the type of sound tracks I like… sound tracks that keep
  people wowed." The pool measured to match it is marked `"wow": true` in `video/lib/music.json`.
- **Music from their own samples comes first.** 4 Nov: the stock track was "very poor"; use the music from the reels
  they sent. 22 Oct: "Why did you not use any soundtrack for what I sent to you? I gave you templates."
- **Never a track they have not heard, chosen by its numbers.** 10 Nov, on a dark bed 20 dB under their voice: "What
  about weird soundtrack did you add?… are you not seeing the quality soundtracks that are playing?" Send a 10-second
  sample first. Say plainly that you cannot hear.
- **Trending sound:** songs by top artists are copyrighted. Give a copyright-free track in that style and a second
  file with no music, so they can add a trending sound in the app (told to the owner 9 Nov; no objection).
- **Level:** the music is clearly music: about 12 dB under the voice while they speak, the drop in the first seconds,
  full level on the end card (`remix.py` in the 10 Nov Bagel template). The whole mix at -14 LUFS.
- **No made sounds.** No whooshes, swells, risers or hits. 22 Oct: "your slop AI transition sound."
- **Their own voice:** cleaned (echo, then noise), clear and forward, never pitch- or tempo-shifted. Cut only at real
  silences; never clip or drop a word.
- **The narrator** is "Lara" on ElevenLabs (the owner pays; voice `vChnJZ1Cu89g2XXumPfT`, `eleven_v4`, one generation).
  Never change her pitch or tempo, never generate twice to retry, hear every take back before using it.

## Look
- **Colour:** "my style is light or shades of blue" (6 Oct). Light or blue backgrounds, blue accents. The subject keeps
  its own colours (a project's brand, a team's kit). Green and red only where they mean something. No yellow accents.
  Never a black background; deep navy is fine.
- **The owner on camera gets the studio look by default** (`video/lib/portrait_pro_long.py`): the room becomes a clean
  backdrop, the face is lit, the framing is steady. 9 Nov: "good, but… I need it to be the best." 10 Nov:
  "professionally done. The background, every single thing."
- **Their art footage is never restyled** unless they ask. 22 Oct: "why did you change the color?"
- **Upright (9:16)** for their own phone footage and anything for TikTok or Instagram; make both shapes for
  music-led films.
- **Cast a story with what the story is about.** 10 Nov: "Why did you use chess pieces for the primus lab video.. It
  makes it look weird." Chess pieces belong to the football tactics board only.

## Real material
- **Real screens only, shown whole.** Never redraw an app's or a brand's interface. 29 Oct, on redrawn screens: "This
  is the worst ever… I just wasted 3hrs of my time on this rubbish."
- **An app screen sits whole inside the frame,** all its edges in view; zoom only for a short push-in on the thing
  being named. 29 Oct: "the screen recording part is actually like almost bigger than the screen."
- Never zoom a photo past its own pixels. Use a project's own logo and art, at its quality.
- **Facts only from dated sources,** two where it matters (fixtures, prices). Say what could not be confirmed.
- **Bagel and Polymarket:** "Same markets. Same liquidity." (the owner's wording, 8 Nov). Bagel is its own app built
  on Polymarket's markets; never "100% Polymarket", no Polymarket logo, no wording that suggests a partnership.

## Reactions (their own sticker clips)
- **At most three a video,** as die-cut stickers. 29 Oct: "There are too many reactions." "I liked it when the reaction
  was like a sticker."
- Mix the grey T-shirt set and the shirtless set. Each at its peak about a second after its line. None over the hook.
- They flow with the video (7 Nov: "intertwined… not a case whereby it just shows up and goes away").
- When the owner is on camera for the whole video: none, unless they ask.

## Creativity
- **Never generic.** 5 Oct: "it's important not to keep on making generic videos. The social media algo doesn't like
  it." "The videos have to be very creative." A different format each time, one bold idea, a moment worth sharing.
- 8 Oct, on a flat hype edit: "This is like a 1/10." "Just looks normal." Build in the project's own medium.

## Wording
- Never "AI Analyst". It is "the analysis".
- Monetised football videos (X, YouTube): no betting words at all, no link to cmvngpicks.com.
- Judging a verdict: only "Called it" or "Missed it". 9 Oct: "if it happened, that means you called it."
- Captions carry the owner's own words. If a fact they say is off, keep their words and tell them; never put a number
  on screen that contradicts them.

## How to work with them
- **No excuses.** 29 Oct: "Stop giving me excuses." Do the work; say once what is truly not possible.
- **No back and forth.** 4 Nov: "I need the best quality work… not going back and forth." Fewer, surer versions.
- **Tell them early what is coming and how long.** 29 Oct: "It took forever." Queue long renders one after another.
- **Check before they do.** 27 Oct: "didn't you cross check these things?" Every half second on sheets, every caption
  against the sound, real screens at full size.
- **"Take your time" means get it right,** not go quiet: short updates while long steps run.

## Before you send
- The soundtrack is one they approved, or they said yes to its sample for this video.
- Nothing on screen is a redrawn interface; every app or page shot shows its edges.
- Every fact on screen has a dated source; anything the owner said that is off has been noted for them.
- No made transition sounds. The music is audible under the voice and does not fight it.
- The first frame is a whole picture. No black background. Blue or light, the subject in its own colours.
- At most three reactions; none when they are on camera throughout.
- Looked at every half second of the finished file, and listened back to every caption.
- The message to the owner says plainly what is real, what is not from today, and what you could not check.
