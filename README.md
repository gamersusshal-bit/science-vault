# The Science Vault: Short 001 "What If the Sun Vanished?"

Drop these files into your existing `science-vault` Remotion project (they replace
`src/Root.tsx` and `src/Composition.tsx`), then:

    npm i @fontsource/space-grotesk
    npm run dev                      # preview
    npx remotion render sun-vanishes out/sun-vanishes.mp4

Build a video end to end (after `scripts/setup.sh`):

    scripts/make.sh sun-vanishes      # -> renders/sun-vanishes.mp4

See PLAYBOOK.md for the full production procedure.

Layout
- PLAYBOOK.md                       how a video is chosen, written, built, checked, drafted
- research/                        cached audience data and viral topic candidates (playbook section 1)
- videos/<slug>/script.json         script, pacing, beats, sources
- videos/<slug>/timeline.json       generated word-level timing
- videos/_log.json                  every topic produced so far
- scripts/                          setup, voice, bed, make, check, stills, publish_renders
- public/<slug>/*.wav               generated audio
- src/primitives/                   Starfield, Captions, font loading (reusable)
- src/videos/                       one folder per scene, registered in index.ts
