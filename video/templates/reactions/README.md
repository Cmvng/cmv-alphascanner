# The owner's video reactions: a signature for every video

**The owner, 29 Oct 2026:**
- "For my videos, there will be reaction videos, like in a corner… if I'm trying to explain something… say a moment
  and it's funny or an angry moment or sad moment or confusing moment, these reaction videos… will be the one that we
  use to express it… it flows with the video and is creative enough to captivate the audience."
- Then: "I did not say anything in any clip… they are just like reaction videos without any words."
- And, after the first version: "**they are videos, so it basically is like a video reaction**… You need to understand
  the creative idea so that you don't mix everything up and just like do one part… It's a video reaction."

**So:** each clip plays as a video. That means real speed, the owner's room, the whole reaction (2–3 s, not a 1 s
flash), and big enough to watch. It goes in the layouts viewers know from reaction videos: a reaction cam, a split
screen, a cutaway.

**Never go back to stickers.** The first version (commit 7ad483f) cut the face out with a white die-cut border at
about 25% of the frame width, for about 1 s. The owner rejected it.

The study, with the research and sources, is in `study-video-reactions.md`. The owner got it with two demos:
- your 7 Oct screen recording "Held Too Long", with 10 reactions;
- the 27 Oct Primus v3, with 5.

## The clips
- Nine silent clips are listed in `library.json`, with what each face means, where its reaction starts, its beats
  inside the clip and where the head is.
- They were filmed on 29 Oct (4K vertical on a phone, plain wall, grey T-shirt). Each holds one reaction for 5–8 s.
- The only sound is room tone, about −43 dB.
- Sources: the Dropbox links in `library.json` (`dl=1`).

**Building the frames** (about 25 minutes for nine on CPU; the output, video/out/vreact/, is not in git):
1. `python3 -I video/lib/react_matte.py <clip.mp4> <work>/m<i> rvm_mobilenetv3_fp32.onnx` cuts the owner out with
   Robust Video Matting. The model is in the RobustVideoMatting GitHub release v1.0.0 and runs on onnxruntime. The
   result is steady from frame to frame.
2. `python3 -I video/lib/vreact_prep.py video/templates/reactions/library.json video/out/vreact --clip <id>=<clip.mp4> … --matte <id>=<work>/m<i>/rgba.mkv …`
   writes each whole clip at 30 fps with the owner's camera grade:
   - `full/`: the room included;
   - `cut/`: RGBA WebP, the same frames.

   It also writes `lib.js`.

## Putting reactions on a finished video
1. **Write the events** (`held-events.js` and `primus-events.js` are the examples). Each event is `{k, id, t0, t1,
   from}`, where `from` is the second of the clip shown at t0. Start each event on the word it answers; take word
   times from faster-whisper on the finished video.
2. **Choose the format** (`k`), all drawn by `vr.js`:
   - `cam`: a reaction-cam window `box` with a white frame, the blue ring and a pop. Keep it about 3 s and about half
     the frame wide (520 px or more), in free space. `snap: [[0.8, 1.35], [1.6, 1.8]]` adds snap zooms onto the face.
   - `duet`: a split. Either the video slides up by `shift` and the reaction rises into the bottom half, or
     `side:'top'` drops it into the top half over a camera video ("me and me"). 3–6 s.
   - `cut`: a hard cut to the full-screen reaction with a push-in, then straight back. About 2 s, once or twice a
     video.
   - `freeze`: holds frame `at` and pushes in. List a `cam` over the same window after it.
   - `behind`: the cut-out owner, scaled by `sc` with clip point `at` placed at `to`, rises from behind the rect
     `front`, which is copied back from the video in front of them.
3. **Keep captions on top.** Give `caps` to any event that covers them:
   - `{band, bg}` keys the video's own burned-in letters off a flat page colour;
   - `'page'` has the page draw its own caption element, as `primus.html` does with v3's caption CSS and
     `plan.json` captions.
4. **Extract the frames the page draws itself:** `python3 -I video/lib/vr_frames.py <events.js> <video.mp4> <frames dir>`.
5. **Render:**
   ```
   PW=<playwright> node video/templates/reactions/render.mjs "$PWD/<page>.html#<frames dir>/" <out.mp4> --dur <s> --base <video.mp4>
   ```
   The sound is copied from the base. `--stills t1,t2,…` renders stills first.
6. **Check:** `python3 -I video/lib/vr_review.py <out.mp4> <video.mp4> <events.js> <review dir>`. Look at all of it:
   - `diff.txt`: outside the windows the video must match the old one (encode noise only);
   - `win-NN.jpg`: every window at 10 fps;
   - `full-NN.jpg`: the whole video every 0.5 s;
   - `ov-NN.jpg` (with a plan.json): every mark, stamp, chip, float and chapter at 10 fps.

   The owner's note on the first demo: shorter or smaller than this is "not visibly evident… too fast".

## The rules (from the study)
1. **One look:** the same frame and ring, the same seam, the same push-in. Vary the format, never the look.
2. **Land on the word, then hold until the reaction peaks.**
3. **Two or three a minute**, with the strongest saved for the climax. A react-first hook can open the video. The
   same face pays it off at the moment it was about.
4. **Free space only:**
   - never on the thing being explained, the captions or the platform buttons;
   - TikTok covers about the bottom 320 px and the right 120–164 px;
   - windows end above the caption box.
5. **Captions stay on top.**
6. **One meaning per face** (Side-Eye = "sure, buddy", the Grin = it came off), so viewers learn the vocabulary.
7. **No added sound** unless the owner picks one. Never a whoosh.
8. **Only inside videos with the owner's voice.** YouTube doesn't pay for "mostly non-verbal reactions".
