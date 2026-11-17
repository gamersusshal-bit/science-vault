# The Science Vault: production playbook

This is the procedure for producing and drafting Shorts for the YouTube channel
LearnIT (@sush15427, channel id UClwsg9mIPTVoHTFwMblg9GA). Follow it in order.
The goal is videos worth watching, not volume: if a video fails a gate, drop it
and say so. Fewer good videos beats the full count.

## 0. Setup (fresh workspace)

    scripts/setup.sh        # npm ci, python deps, Kokoro voice model into .models/

Chrome for rendering is expected at `google-chrome`. Run everything from the repo root.

## 1. Choose topics (owner's direction, 2026-11-16: proven viral animated topics, made our own way)

Topics now come from what is already going viral in animated explainer Shorts, checked
against who actually watches this channel. We make our own original video on the idea:
our own script, our own visuals, our own title. Never copy another channel's wording,
shots, characters, thumbnail or title, and never re-upload anyone's footage.

vidIQ calls cost 5 credits each and the account has about 150 a month, so research is
cached in the repo and refreshed only when needed.

1a. Audience: `research/audience.json`
- If `checked` is more than 7 days old, call `vidiq_channel_analytics` once with
  channelId `UClwsg9mIPTVoHTFwMblg9GA` and report `audience_demographics`, and save
  the rows and today's date. Once the channel has views, also save `audience_geography`
  on alternate weeks.
- If the rows are empty (new channel), say so in the owner message and do not guess an
  audience. When there is data, let it steer the pick and the wording: favour candidate
  topics and vocabulary that suit the largest age group, and use units and everyday
  references that suit the top countries.

1b. Viral candidates: `research/viral_topics.json`
- If fewer than 6 candidates have `"used": false`, or `refreshed` is more than 7 days
  old, call `vidiq_outliers` once (contentType "short", limit 50, minViews 500000,
  keyword about animated science / what-if / how-it-works explainers; vary the keyword
  between refreshes). Add new ideas to the file with the evidence (views, breakout
  score, video id of the example) and keep the old unused ones.
- Record only the idea and the hook format, in our own words. Skip superhero, prank,
  comedy, health-advice, biohacking and non-science results.
- If vidIQ credits have run out, use the cache; if the cache is empty, pick by the
  field rotation below and tell the owner the viral research could not run.

1c. Pick two for today
- Prefer the candidates with the strongest evidence (high views and a breakout score
  well above 1, ideally seen on more than one channel).
- Never repeat a topic in `videos/_log.json`, and do not use the same field or hero
  visual as either of the last two videos. Fields: space, physics, earth and weather,
  biology, chemistry, the human body, mathematics of nature, deep time, engineering
  and how things work.
- A topic still qualifies only if all of these hold:
  1. It can be stated as a contradiction or surprise in one sentence under 12 words.
  2. The explanation is a mechanism that can be drawn moving, not a list of facts.
  3. Every claim can be backed by a primary or authoritative source (journal paper,
     NASA/ESA/NOAA/USGS, a university, a standard textbook). Search the web and confirm.
     A viral video is evidence of interest, never a source for facts.
  4. It is settled science or a clearly labelled thought experiment. No health advice,
     no contested or sensational claims, no "scientists are baffled".
- Reject and replace any topic that fails. Mark the chosen candidates `"used": true`
  with the slug. Record sources in the script file.

1d. Hook format
- Open with the format that is working for that idea: "What if ...", "What happens
  when ...", "Why you can't ...", "How ... actually works". Title and first line state
  the question or surprise plainly; the claim in them must be true as worded.
- In the owner message, name the viral evidence each topic was chosen on.

## 2. Write the script: `videos/<slug>/script.json`

Copy the shape of `videos/sun-vanishes/script.json`.

- 60 to 85 spoken words, 7 lines at most, target 25 to 40 seconds.
- Voice (owner's choice, 2026-11-16): each day, set `"voice": "am_fenrir"` in one
  video's script and `"voice": "af_heart"` in the other. If only one video is made,
  alternate with the voice of the most recent entry in `videos/_log.json`. Record the
  voice used in each log entry as `"voice"`.
- Mascot test (owner's choice, 2026-11-16): one of the two daily videos has Fizz, the
  lab mascot. On even calendar dates Fizz goes in the `am_fenrir` video, on odd dates
  in the `af_heart` video, so the mascot is not tied to one voice. If only one video is
  made, give it Fizz only if the most recent log entry did not have it. Record
  `"fizz": true` or `false` in each log entry.
- Owner's instruction, 2026-11-17: NO Fizz in any video made on 2026-11-17. Both of
  that day's videos get `"fizz": false` and no `fizz: true` in `src/videos/index.ts`.
  The mascot test above resumes with the videos made on 2026-11-18, unless the owner
  says otherwise. Do not count 2026-11-17's videos toward the 14 in section 6.
- Line 1 is the hook: the contradiction, complete within 3 seconds of speech.
- Each line adds new information. The last line is the payoff and should echo the hook.
- Split lines into `parts`. Give each part a `speed` (0.82 to 1.08) and a `pause`
  (0.1 to 0.55 s): slower on the hook's second half and the payoff, a held pause
  before each reveal. Use `tts` only to add punctuation that shapes the read.
- Spell numbers as words in `text`. Avoid symbols and abbreviations.
- `beats.drop` = the word where the opening event happens; `beats.hit` = the word
  where the climax lands. The sound bed is built around these two moments.
- `sources`: one entry per factual claim, with the figure and where it comes from.
- Re-read every number against its source before continuing.

## 3. Build the scene: `src/videos/<camelSlug>/<Name>.tsx`

Read `src/videos/sunVanishes/SunVanishes.tsx` first; it is the reference for quality
and structure. Then write a NEW scene for this topic. Do not copy its visuals.

Rules:
- 1080 x 1920, 30 fps. Read all timing from `videos/<slug>/timeline.json`
  (line starts, word starts), never hard-coded seconds.
- One continuous world with a camera, not a sequence of slides. The main visual
  fills the frame and is the explanation: the viewer should understand the idea
  with the sound off.
- Frame 0 must already show a title or image that poses the question.
- Something on screen must change at least every 2 seconds. Each line of narration
  gets its own visual development.
- Safe zones: keep text and key visuals between y=140 and y=1540, and out of the
  right-hand 140 px below y=1100 (Shorts buttons). Captions go at top=1440.
- Reuse `Starfield` (space topics only), `Captions`, `useFonts`/`FONT`. For non-space
  topics build a fitting background (ocean depth gradient, cell interior, sky, lab
  dark) and a different accent palette. Two consecutive videos must not share a look.
- Labels inside the world: 34 px or larger, short, upper case.
- Include both `<Audio>` tracks: `staticFile("<slug>/narration.wav")` and
  `staticFile("<slug>/bed.wav")` at volume 0.6.
- Only use `remotion`, React and the fonts already installed. No network assets,
  no stock footage, no images of real people.
- Register the video in `src/videos/index.ts`.
- Fizz (when this video has the mascot): register it with `timeline: <its timeline json>`
  and `fizz: true`; the composition then adds Fizz on top of the scene with automatic
  cues (surprise at `beats.drop` and `beats.hit`, thinking on the question line,
  pointing at the answer, laughing on the payoff). Pass `fizzCues` only if those land
  badly. Keep the bottom-left corner, x 30 to 300 and y 1120 to 1435, free of key
  visuals and labels. Fizz never speaks and is never written into the script; the
  narration stays the same with or without it. Do not change Fizz's design, colours
  or name; `out/fizz-sheet.png` (`npx remotion still fizz-sheet`) shows every mood.

## 4. Render and check

    scripts/make.sh <slug>      # voice, bed, type-check, render, loudness, automatic gate
    scripts/stills.sh <slug>    # writes out/<slug>.sheet.png

- `make.sh` must print PASS (20 to 58 s, 1080x1920, 30 fps, about -14 LUFS, no dead air).
- Open the contact sheet image and look at it. Reject and fix if: text overlaps
  other text or the main visual, anything is clipped, a frame is empty, captions
  collide with the scene, or consecutive frames look the same for more than 3 seconds.
  Also render 3 or 4 single frames at the key beats with
  `npx remotion still <slug> out/f.png --frame=N --browser-executable=$(command -v google-chrome)`
  and inspect them at full size.
- With Fizz: also check in the stills that Fizz is fully on screen, does not cover the
  main visual or a label, and reacts on the right beats.
- At most two fix-and-rerender rounds per video. If it still fails, drop it.

## 5. Draft for approval (never publish without it)

    scripts/publish_renders.sh <slug> [<slug> ...]   # prints one public link per video

For each link:
1. `vidiq_video_upload` with `url` = the link. Keep the `uploadId`.
2. `vidiq_social_post_draft_create` with one YOUTUBE destination:
   platformAccountId `UClwsg9mIPTVoHTFwMblg9GA`, `privacyStatus` "public",
   `categoryId` 28, a title under 70 characters that states the surprise without
   clickbait, 5 to 8 tags, media = the uploadId, and a description of 2 or 3 plain
   sentences plus `#shorts` and three topic hashtags. If it is a thought experiment,
   say so in the description.
3. Do NOT call `vidiq_social_post_publish`. Publishing happens only after the owner
   replies with approval in the session.

Then:
- Add each video to `videos/_log.json` with status "drafted".
- Commit the new script, timeline, scene and log to `main` and push.
- Send the owner the MP4 files and one message listing, per video: title, the
  one-sentence hook, duration, sources, and anything you are unsure about. End with:
  reply "post all", or name the ones to post or drop.
- When the owner approves, publish those drafts, check status until each has a
  link, update `_log.json` to "published" with the URL, commit and push.

## 6. Mascot comparison (once, after 14 days of the test)

On the first run when at least 14 videos with `"fizz"` recorded in `videos/_log.json`
are 3 or more days old, call `vidiq_channel_analytics` once for channelId
`UClwsg9mIPTVoHTFwMblg9GA` with report `top_videos`, metrics engagedViews,
averageViewPercentage, subscribersGained and likes, maxResults 50, covering the test
period. Compare the median of each metric for videos with Fizz against without, and
send the owner a short table with a plain recommendation: keep Fizz in every video,
drop it, or keep testing if the difference is small or the samples are too few. Save
the result in `research/fizz_test.json` so it is not repeated. Do not change the
mascot rule above until the owner decides.

## 6. If something breaks

Do not work around it silently. Skip what cannot be done, finish what can, and
report plainly what failed and why (setup, render, upload, drafting).
