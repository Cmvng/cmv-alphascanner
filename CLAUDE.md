# cmv-alphascanner

This repository holds the cmvngpicks.com app and the owner's video work (`video/`).

## Any video request: read the checkpoint first

Whatever the owner asks for (a picks or results video, a match analysis, a post-match review, an edit of their own
recording, a video for Bagel, Primus Labs, Gamdom or any other project, an art film, a reel), the owner's preferences
are in one file, loaded here so every session starts with them:

@video/OWNER-CHECKPOINT.md

Rules for using it:
1. Follow it without being asked. The owner should never have to repeat a preference that is in it.
2. Before starting, write down for yourself the soundtrack, the format and the real material you will use, each
   checked against the checkpoint. Then load the `cmvng-video` skill for the detail of the kind of video.
3. Before sending anything, run `python3 -I video/lib/preflight.py <video> --kind … --music …` and go through its
   by-eye list. A FAIL means the video does not go out.
4. When the owner says they like or dislike something, add it to the checkpoint in the same session, with the date
   and their words, and commit it. The checkpoint is the only place a preference needs to be written to take effect.
5. If something the owner asks for is not covered and you cannot tell what they would want, ask one short question
   before building, not after.

## Working rules
- Develop on the branch the session names; commit and push before ending a turn. No pull request unless asked.
- cmvngpicks.com, its database, Railway and its environment are read-only from here. Never ask the owner for tokens,
  keys or passwords.
- Videos are not committed (`video/out/` is ignored). Templates, notes and tools are.
