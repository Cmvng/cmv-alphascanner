# The owner's checkpoint: what they like, what they will not accept

One file. It is loaded at the start of every session (`CLAUDE.md`). Follow it without being asked. When the owner says
something new, add it here the same day with the date and their words; that is the only step needed for it to hold.
**Where an older note anywhere in `video/` disagrees with this file, this file wins.** The long history is in
`video/templates/REVIEWS.md`; the detail for each kind of video is in the `cmvng-video` skill.

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
  people wowed." On explainers they also liked "New Bass 01" (720) and "Sparta" (370).
- **`video/lib/music.json` holds their verdict on each track:** `"owner": "approved"` or `"rejected"`. No mark means
  they have never judged it. `"wow": true` is only a measurement (it sounds like "A New Life" on paper).
- **Music from their own samples comes first.** 4 Nov: the stock track was "very poor"; use the music from the reels
  they sent. 22 Oct: "Why did you not use any soundtrack for what I sent to you? I gave you templates."
- **Never a track they have not heard, chosen by its numbers.** 10 Nov, on a dark bed 20 dB under their voice: "What
  about weird soundtrack did you add?… are you not seeing the quality soundtracks that are playing?" Send a 10-second
  sample first. Say plainly that you cannot hear.
- **Never again:** "Sonor 01" (558) and "Fragments Of Bangkok" (625), both rejected by ear; "A Love Theme" (542),
  which got a Short blocked on YouTube (Content ID claim, 11 Oct).
- **Trending sound:** songs by top artists are copyrighted. Give a copyright-free track in that style and a second
  file with no music, so they can add a trending sound in the app (told to the owner 9 Nov; no objection).
- **Level:** the music is clearly music: about 12 dB under the voice while they speak, the drop in the first seconds,
  full level on the end card (`remix.py` in the 10 Nov Bagel template). The whole mix at -14 LUFS. Older notes that
  say 20 to 25 dB under the voice are out of date.
- **No made sounds.** No whooshes, swells, risers or hits. 22 Oct: "your slop AI transition sound."
- **Their own voice:** cleaned (echo, then noise), clear and forward, never pitch- or tempo-shifted. 3 Oct: "the voice
  should be more audible." Cut only at real silences; never clip or drop a word.
- **The narrator** is "Lara" on ElevenLabs (the owner pays; voice `vChnJZ1Cu89g2XXumPfT`, `eleven_v4`, one generation).
  Never change her pitch or tempo, never generate twice to retry, hear every take back before using it. Say what a
  long script will cost before generating. The free house voice only when the owner chooses it to save credits, and
  never pitched down on a first-person script (27 Oct: "It sounds so rubbish").
- **No narrator on a "fun" or "dope" video:** those are music-led. Never the owner's photo or a male voice as the
  presenter (2 Oct: "I don't like the video with my image there").

## Look
- **Colour:** "my style is light or shades of blue" (6 Oct). Light or blue backgrounds, blue accents. The subject keeps
  its own colours (a project's brand, a team's kit). Green and red only where they mean something. No yellow accents.
  Never a black background, cold opens included; deep navy or royal blue is fine.
- **The owner on camera: their real room, softly blurred behind them. Never cut them out onto a replaced backdrop.**
  11 Nov, on the cut-out look: "this is the worst video ever… See the way you cut the main character from the
  background. See the way it looks so muddled up. Is it not even better for you to actually blur all the elements in
  the background". Use `video/lib/portrait_pro_long.py` with the `room` look: nothing replaced, the room out of focus,
  the framing steady. They still want it polished (9 Nov: "I need it to be the best"; 10 Nov: "professionally done.
  The background, every single thing"), and polish means a clean picture, not an effect that shows. Never crop into
  their face (4 Oct: "make sure no part is cut out, half of my face is cut out").
- **A screen recording with their camera in it:** the screen is the main picture and their camera sits in a small
  corner. 5 Oct: "put my main video in the small corner… I cannot even see the main things on the screen."
- **Their art footage is never restyled** unless they ask. 22 Oct: "why did you change the color?"
- **Upright (9:16)** for their own phone footage and anything for TikTok or Instagram; make both shapes for
  music-led films.
- **Cast a story with what the story is about.** 10 Nov: "Why did you use chess pieces for the primus lab video.. It
  makes it look weird." Chess pieces belong to the football tactics board only.
- **Rendered to the quality of what sits beside it.** 9 Nov, on a flat board: "It was not quality… just flat… not
  really clean." No flat home-made graphics next to a project's polished art.
- **Every video gets its own cover and thumbnail** (8 Oct: "why is there no unique cover image?"; 13 Oct: a "clean
  and mini cover").

## Real material
- **Real screens only, shown whole.** Never redraw an app's or a brand's interface. 27 Oct: "use the actual graphic
  from the website itself." 29 Oct, on redrawn screens: "This is the worst ever… I just wasted 3hrs of my time on this
  rubbish."
- **Get the real thing yourself.** 27 Oct: "If I can do it myself without connecting a wallet, you can also do it."
  Public pages, store listings and media kits are fetched, not asked for. Ask the owner only for what needs their
  login or their phone.
- **An app screen sits whole inside the frame,** all its edges in view; zoom only for a short push-in on the thing
  being named. 29 Oct: "the screen recording part is actually like almost bigger than the screen."
- Never zoom a photo past its own pixels. Use a project's own logo and art, at its quality.
- **Facts only from dated sources,** two where it matters (fixtures, prices). Say what could not be confirmed.
- **Their script is theirs.** 27 Oct: "It has been fact checked… Make sure you do this well." Keep their wording; put
  a doubt in the message to them, never in a rewrite.
- **Bagel and Polymarket:** "Same markets. Same liquidity." (the owner's wording, 8 Nov). Bagel is its own app built
  on Polymarket's markets; never "100% Polymarket", no Polymarket logo, no wording that suggests a partnership.

## Reactions (their own sticker clips)
- **At most three a video** (one or two in the body, plus the sign-off), as die-cut stickers. 29 Oct: "There are too
  many reactions." 4 Nov: "I like the reaction when it's in sticker form… It makes it look more real." 7 Nov: "You
  have to be clean and simple… if you have too many reactions, it makes it to be looking too disjointed."
- **Mix the grey T-shirt set and the shirtless set.** 7 Nov: "I have two separate reaction videos. I don't know why
  you're not mixing them together."
- **Each one fits its line** (7 Nov: "the reaction have to fit the context of the video") and flows with the video
  ("intertwined… Not a case whereby it just shows up and goes away"). Its peak about a second after the line. None
  over the hook.
- When the owner is on camera for the whole video: none, unless they ask.

## Creativity
- **Never generic.** 5 Oct: "it's important not to keep on making generic videos. The social media algo doesn't like
  it." "The videos have to be very creative." A different format each time, one bold idea, a moment worth sharing.
- 8 Oct, on a flat hype edit: "This is like a 1/10." "Just looks normal." Build in the project's own medium.
- **What they loved:** the cold open ("the punchline, the aura that will keep people excited"); the slow, suspenseful
  pace of the analysis; the "20 hours" reel they sent (9 Nov: "I loved it… it looks super cool").
- **The one exception:** when they say to reuse a template, do exactly that (17 Oct: "Use the same templates, cos my
  credits have almost finished").

## By kind of video
- **Match analysis:** every match on the slate (21 Oct: "do the analysis for all the matches, not some, cos I see you
  keep on doing only 5"); on a very big slate, the top matches in depth and the rest briefly (10 Oct). A spoken
  verdict on every game (7 Oct: "You didn't give your take on the matches"). Each team's own stadium and its players
  (8 Oct: "The stadiums have to be the stadiums of the teams"). What it must contain is the 1 Oct template ("This is
  the template now… save it and study it"); how it looks changes every time.
- **The write-up goes in the message itself,** not as a path (8 Oct: "Where is the write up"), written like a
  professional preview (9 Oct: "a clean writeup that is without AI slop").
- **Post-match:** the presenter format: the lady at the mic, the commentary, the stadiums, the players. 13 Oct, on a
  graphics-only board: "I expected something creative."
- **Their own recording:** their real room softly blurred, their voice forward, the real screens of what they talk about, real dated
  facts beside their words, no reactions, music by the rules above. Their example is illustrated step by step, in
  the order they tell it (11 Nov: "the illustration… done properly and sequenced in a good way… in layers… the right
  order that a professional will approve 10/10").
- **A project (Bagel, Primus Labs, Gamdom…):** its own screens, logo, art and colours. On a crypto video the coin
  itself is the showcase: live price, change and candles.
- **Art (@i_am_vickyd):** their footage and templates as sent, their music, a clean story. 22 Oct: "You only tell the
  story with the templates."
- **Picks and Polymarket plays:** a straight conversion of the app's picks, nothing added or dropped. Never "sure",
  "banker", "guaranteed", "fixed" or "lock".

## Wording
- Never "AI Analyst". It is "the analysis".
- Monetised football videos (X, YouTube): no betting words at all, no link to cmvngpicks.com.
- Judging a verdict: only "Called it" or "Missed it", never "half right". 9 Oct: "if it happened, that means you
  called it." The result decides: if the winner we called won, it is called.
- Captions carry the owner's own words. If a fact they say is off, keep their words and tell them; never put a number
  on screen that contradicts them.

## How to work with them
- **No excuses.** 29 Oct: "Stop giving me excuses. All of this information is on the internet." Do the work; say once
  what is truly not possible.
- **No back and forth.** 4 Nov: "I need the best quality work… not going back and forth." Fewer, surer versions.
- **Tell them early what is coming and how long.** 29 Oct: "It took forever." 7 Nov: "Why is this taking so long?"
  Run heavy renders one at a time; several at once make each three times slower.
- **Be fast, without dropping the standard.** 11 Nov: "be fast with it. Don't take too much time… last time like you
  took forever", and in the same message "take your time to do the right job." Start the long steps first (working
  copy, cut-out, studio-look render) and do the light work beside them (voice, cut plan, real screens, the page, the
  cover); check the page on stills over a stand-in picture, so there is one final render.
- **Check before they do.** 27 Oct: "Didn't you cross check what you did?" Every half second on sheets, every caption
  against the sound, real screens at full size. **And watch it move:** consecutive frames at every fast hand movement,
  at full size. On 11 Nov the half-second sheets looked clean while every fast hand broke into blocks in motion.
- **Do what they asked, and nothing that can go wrong on top.** 11 Nov: "I will tell you to do something, you will do
  worse. If I edited this video myself, it will never be like this." An effect they did not ask for is either
  flawless in motion or left out.
- **Study each finished video** and write what to change in `video/templates/REVIEWS.md` (6 Oct: "You need to study
  each video after you create them").
- **A file too big for the chat** goes on a private download page as well as a smaller chat copy (7 Oct: "Why didn't
  you send me the site to download the high quality version").
- **"Take your time" means get it right,** not go quiet: short updates while long steps run.

## Before you send
- The soundtrack is one they approved, or they said yes to its sample for this video.
- Nothing on screen is a redrawn interface; every app or page shot shows its edges.
- Every fact on screen has a dated source; anything the owner said that is off has been noted for them.
- No made transition sounds. The music is audible under the voice and does not fight it.
- The first frame is a whole picture. No black background. Blue or light, the subject in its own colours.
- At most three reactions; none when they are on camera throughout.
- The owner's face is whole in every shot; a screen they are showing is the main picture.
- The owner is not cut out of their room. Every fast hand movement was watched frame by frame: no block, halo or edge.
- It has its own cover and thumbnail, and it is not the same format as the last video of its kind.
- Looked at every half second of the finished file, and listened back to every caption.
- The message to the owner says plainly what is real, what is not from today, and what you could not check; an
  analysis carries its write-up in the message.
