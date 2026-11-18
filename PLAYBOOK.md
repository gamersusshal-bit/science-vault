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
  and how things work, computing and games.
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

1e. Owner's topic requests (these override 1b and 1c for the date named)

**2026-11-18: one GTA 6 Short and one tech Short.**
- GTA 6 Short. Rockstar's newswire set the launch for 19 November 2026; re-check on
  the day, because it has moved before. The angle must be real science or technology
  that the viewer can watch working, not game news, rumours or leaks. Good angles:
  how a console draws a huge open city without holding all of it in memory (streaming,
  level of detail, culling), how sunlight, reflections and water are rendered, or how
  a game makes a crowd or traffic feel alive. Claims about GTA 6 itself only if Rockstar
  or a named first-hand source states them; general graphics claims need technical
  sources (GPU vendor or engine documentation, graphics textbooks, papers).
  Copyright and branding: no Rockstar or GTA logos, artwork, screenshots, trailer
  frames, characters, fonts or look-alike styles, in the video or the thumbnail. Build
  an original, generic city. The title and description may name "GTA 6" plainly as the
  subject. Don't say or imply that the channel is connected to Rockstar.
- Tech Short: a technology topic in a different field from the GTA one and from the
  last two log entries (engineering, the human body). Prefer an unused candidate from
  `research/viral_topics.json` with strong evidence (for example the fluorescent tube
  that lights up under power lines), or AI, robotics or everyday gadgets if you can
  source the mechanism properly.
- Field name for the GTA Short in the log: "computing and games". Both use the
  af_heart voice and the seven beats of 2a.

## 2. Write the script: `videos/<slug>/script.json`

### 2a. Story structure (owner-approved 2026-11-17, from the first four videos' retention)

What the first four retention curves showed (small audiences, so treat as direction,
not proof): Sun and Lightning, which had a visible event in the first second, kept
57-62% past the first swipe; Trees, where nothing moved during the hook, kept 47%.
Trees and Sunflower, whose hooks stated the answer over a still picture, both lost a
sharp step at 4-5 s as the hook ended. Sun, whose countdown target was announced by
5 s, stayed almost flat from 10 s to the end. Sunflower lost most viewers in a stretch
of small numbers and an almost empty frame (10-15 s), before its best demonstration.

Every Short follows these seven beats:
1. Event (0-1 s): something visibly happens on screen in the first second. A title
   over a still picture is not an event.
2. Question (by 3 s): the hook sets up a contradiction and leaves it open. Do not
   state the answer in the hook ("a tree is made of air"); state the puzzle ("this
   tree gained 74 kilograms; the soil lost 60 grams").
3. Meter: a visible counter, clock or readout heading to a value the viewer can
   predict. Say or show its target within the first 5 s.
4. Mechanism: one continuous world, cause before effect, one new picture per line.
   No jump to history or background straight after the hook.
5. Break it: show what happens without the key ingredient (a nudged angle, an
   empty pot, a robot without feedback). Put the strongest demonstration in the
   first third, not the last.
6. Second climax at least as big as the first, built from the same world.
7. Payoff echoes the hook, over a picture that is still moving.
Also: no frame that is mostly empty, no number shown as small text when it can be a
picture (a bar, a scale, a size comparison), and simplified models are labelled.

### 2b. Script rules


Copy the shape of `videos/sun-vanishes/script.json`.

- 60 to 85 spoken words, 7 lines at most, target 25 to 40 seconds.
- Voice (owner's choice, 2026-11-17, replaces the earlier fenrir/heart alternation):
  every video uses `"voice": "af_heart"`. The owner found it warm and expressive and
  the male voice (am_fenrir) bland. Do not use am_fenrir or any other voice unless the
  owner asks. Record the voice in each log entry as `"voice"`. Shape the read with
  `parts` (speed, pause, `tts` punctuation) so it keeps that emotion.
- No mascot (owner's decision, 2026-11-17): Fizz is not used in any video. Never set
  `fizz: true` in `src/videos/index.ts`, and record `"fizz": false` in each log entry.
- Line 1 is the hook: the contradiction, complete within 3 seconds of speech. Choose it
  with the hook process in 2c, and keep its candidates in the script.
- Each line adds new information. The last line is the payoff and should echo the hook.
- Split lines into `parts`. Give each part a `speed` (0.82 to 1.08) and a `pause`
  (0.1 to 0.55 s): slower on the hook's second half and the payoff, a held pause
  before each reveal. Use `tts` only to add punctuation that shapes the read.
- Spell numbers as words in `text`. Avoid symbols and abbreviations.
- `beats.drop` = the word where the opening event happens; `beats.hit` = the word
  where the climax lands. The sound bed is built around these two moments.
- `sources`: one entry per factual claim, with the figure and where it comes from.
- Re-read every number against its source before continuing.

### 2c. Hooks and retention: lessons from the first eight scripts (owner's request, 2026-11-18)

A review of all eight published scripts (sun-vanishes to power-line-tube). It is judged
on the scripts themselves plus the retention notes in 2a. No new retention data yet: the
vidIQ credits had run out on 2026-11-18. When credits are back, pull
`vidiq_channel_analytics_extended` report `shorts_stayed_to_watch` once and check these
rules against it.

**What worked**
- Hooks that ask about something the viewer can see or has felt, then leave it open:
  "You stopped spinning. So why is the room still turning?" (spin-dizzy);
  "No wires, no battery. So why is this tube glowing?" (power-line-tube).
- A demonstration you can *see* fail early: the tube laid flat goes dark at 8 s
  (power-line-tube); the angle nudged until gaps open (sunflower-spirals).
- A mid-video re-hook: "But here's the strange part." (sun-vanishes), at the point where
  Shorts usually lose viewers.
- Payoffs of 8 words or fewer that flip the hook: "The room was never turning. The fluid
  in your ear was." "The fire doesn't push the plane. It spins the fan that does."

**What to stop doing**
1. Stating the answer in the hook. "A tree is built mostly from thin air", "A lightning bolt
   is five times hotter than the Sun" and "A sunflower can't count, yet its seeds follow
   Fibonacci numbers" give the viewer the punchline, so there is no reason to stay. A fact
   is not a hook unless it leaves a *why* or *how* open.
2. Long hooks. city-streaming (16 words, 4.5 s) and sunflower-spirals (4.1 s) took too long
   to reach the question. Keep the hook to 12 words or fewer, with the question complete by
   about 2.5 s.
3. A weak line 2. Line 2 is where the 4-5 s drop happens. Bad line 2s seen so far:
   - history: "In the sixteen hundreds, a scientist…"
   - a number dump: "Sunlight needs eight minutes and twenty seconds to cross a hundred and fifty
     million kilometers"
   - talking about the video itself: "each trick pushes this bar under the limit"

   Line 2 must raise the stakes or start the demonstration. It should name the meter's
   target in the world's own terms.
4. Abstract openings. The first three words must be concrete and on screen ("No wires, no
   battery"; "You stopped spinning"), never "A … is …" or "Open world games…".
5. More than two numbers in a video. Every number after the second becomes a picture with
   no number spoken.
6. Lists without a count. "One. Two. Three." works only if the hook promised the count
   ("three tricks"), so the viewer knows how long to stay.

**The hook process (do this every time, before writing the rest)**
1. Write five candidate hooks for the topic, at least two of them in a format that is new for
   this channel. Mix the formats: a *question about what is on screen*, "*you* + an
   experience the viewer has had", a *contradiction with two numbers* ("gained seventy
   kilos; the soil lost sixty grams"), *something happening right now* ("The Sun just
   vanished."), and a *dare or prediction* ("Watch this bar. It has to get under the line.").
2. Score each one from 0 to 2 on six tests. Write the scores in the script as
   `"hook_candidates"`:
   1. Under 12 words.
   2. Something visibly happens while it is spoken.
   3. The question is still open at the end.
   4. It is about *you* or *this*, the thing on screen.
   5. The first three words are concrete.
   6. True as worded.
3. Use the top scorer. On a tie, pick the one whose answer comes latest in the script.
4. Say the hook aloud at the planned speed. If it is over 3 s, cut words; do not speed it up.

**Shape of the rest (7 lines, about 30 s)**
- Line 2 (about 3-7 s): raise the stakes or set the meter's target.
- Lines 3-4: the "break it" demonstration, then the mechanism, each line with a new picture.
- About 50-60 % in: a re-hook, either a one-line twist or a new question ("But here's the
  strange part." "So why doesn't it stop?"). It opens a second loop that the climax closes.
- Climax: the biggest picture, built from the same world.
- Payoff: 8 words or fewer. It answers the hook in different words, ideally so that the
  video loops cleanly into its first line.

**Rewrites of earlier hooks, as models (not for reuse: those topics are taken)**
- sun-vanishes: "The Sun just vanished. So why is it still daytime?"
- lightning-thunder: "You've never actually heard lightning. So what's that boom?"
- tree-from-air: "This tree got seventy kilos heavier. The soil barely changed."
- sunflower-spirals: "This flower can't count. So how did it get these exact numbers?"
- jet-engine-fan: "This engine burns fuel, but the fire barely pushes the plane. So what does?"
- city-streaming: "This city is three times too big for your console. Watch it fit."

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

## 4. Render and check

    scripts/make.sh <slug>      # voice, bed, type-check, render, loudness, automatic gate
    scripts/stills.sh <slug>    # writes out/<slug>.sheet.png

- `make.sh` must print PASS (20 to 58 s, 1080x1920, 30 fps, about -14 LUFS, no dead air).
- `make.sh` also prints a motion line. `WARN little change during a-b s` is not a fail;
  look at those seconds on the contact sheet and fix them unless the stillness is deliberate.
  It is most important in the first 4 seconds.
- Open the contact sheet image and look at it. Reject and fix if: text overlaps
  other text or the main visual, anything is clipped, a frame is empty, captions
  collide with the scene, or consecutive frames look the same for more than 3 seconds.
  Check the seven beats of 2a against the sheet: is there an event by 1 s, is the
  question open at 3 s, is the meter's target known by 5 s?
  Also render 3 or 4 single frames at the key beats with
  `npx remotion still <slug> out/f.png --frame=N --browser-executable=$(command -v google-chrome)`
  and inspect them at full size.
- At most two fix-and-rerender rounds per video. If it still fails, drop it.

### 4b. Thumbnail

Add a "thumb" block to the script and render it:

    "thumb": { "at": 17.6, "text": ["A TREE IS", "MADE OF AIR"], "accent": "#b8f25c" }
    scripts/thumb.sh <slug>     # writes thumbs/<slug>.jpg (1080x1920 JPEG, under 2 MB)

- `at` = the second of the video with the clearest hero image (the mechanism visible,
  nothing mid-transition). `text` = two short lines, 12 characters or fewer each, that
  state the surprise and are true as worded. `accent` = the scene's accent colour.
- Open the JPEG and check it: both lines readable at small size, hero visual clear in
  the middle band, nothing clipped. Fix `at` or the text and re-render if not.
- Commit `thumbs/<slug>.jpg` to main and push before drafting, so it has a public link:
  `https://raw.githubusercontent.com/gamersusshal-bit/science-vault/main/thumbs/<slug>.jpg`

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
   Thumbnail: `vidiq_upload_image` with `image` = the thumbnail's public link, then pass
   the returned imageId as `thumbnailImageId` on the YouTube destination. YouTube only
   accepts uploaded Shorts thumbnails from some channels (Partner Program at launch,
   July 2026); a refused thumbnail does not fail the upload. Always send the JPEG to
   the owner as well, and say in the owner message whether YouTube took it.
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

## 6. If something breaks

Do not work around it silently. Skip what cannot be done, finish what can, and
report plainly what failed and why (setup, render, upload, drafting).
