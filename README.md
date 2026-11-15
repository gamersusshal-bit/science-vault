# The Science Vault: Short 001 "What If the Sun Vanished?"

Drop these files into your existing `science-vault` Remotion project (they replace
`src/Root.tsx` and `src/Composition.tsx`), then:

    npm i @fontsource/space-grotesk
    npm run dev                      # preview
    npx remotion render MyComp out/short_001.mp4 --crf=17

Optional, to regenerate audio (needs Python 3, `pip install kokoro-onnx soundfile scipy`
and the two Kokoro model files from github.com/thewh1teagle/kokoro-onnx releases):

    python3 scripts/voice.py sun-vanishes <model_dir> src/videos/sunVanishes/timeline.json
    python3 scripts/bed.py sun-vanishes src/videos/sunVanishes/timeline.json <vanish_t> <hit_t>   # both are printed by voice.py

Layout
- videos/sun-vanishes/script.json   script, voice settings, sources
- scripts/voice.py                  narration + word-level timeline
- scripts/bed.py                    synthesized music and sound effects
- public/sun-vanishes/*.wav         generated audio
- src/primitives/                   Starfield, Captions, font loading (reusable)
- src/videos/sunVanishes/           the scene and its timeline

Final loudness pass used for the delivered MP4:

    ffmpeg -i out/short_001.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k final.mp4
