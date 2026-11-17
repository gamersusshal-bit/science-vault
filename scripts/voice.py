"""Generate narration + word-level timeline for a video script.
Usage: python3 scripts/voice.py <slug> [voice]
Reads videos/<slug>/script.json. Writes public/<slug>/narration.wav and videos/<slug>/timeline.json.
Models are expected in ./.models (see scripts/setup.sh).
Each script line is made of parts; every part has its own speed and trailing pause,
which is how the read is "directed" (slow on the hook and payoff, held pauses before reveals).
"""
import json, sys, re, subprocess, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

import os
slug = sys.argv[1]; model_dir = ".models"; out_json = f"videos/{slug}/timeline.json"
script = json.load(open(f"videos/{slug}/script.json"))
voice = sys.argv[2] if len(sys.argv) > 2 else script["voice"]
os.makedirs(f"public/{slug}", exist_ok=True)
wav_out = f"public/{slug}/narration.wav"
lang = "en-gb" if voice[0] == "b" else "en-us"
k = Kokoro(f"{model_dir}/kokoro-v1.0.onnx", f"{model_dir}/voices-v1.0.bin")

def trim(x, sr, thresh=0.012, pad=0.03):
    idx = np.where(np.abs(x) > thresh)[0]
    if len(idx) == 0: return x
    return x[max(0, idx[0]-int(pad*sr)):min(len(x), idx[-1]+int(pad*sr))]

t = 0.20; sr_out = None; chunks = []; lines = []
for ln in script["lines"]:
    words_all = []; line_start = t
    for part in ln["parts"]:
        samples, sr = k.create(part.get("tts", part["text"]), voice=voice, speed=part.get("speed", 1.0), lang=lang)
        sr_out = sr
        s = trim(np.asarray(samples, dtype=np.float32), sr)
        s = s*(0.5/max(1e-6, np.sqrt(np.mean(s**2)))*0.12)  # even out level between parts
        dur = len(s)/sr
        words = part["text"].split()
        w = [len(re.sub(r"[^A-Za-z0-9']", "", x)) + 1.2 + (3.0 if x[-1] in ",.;:?!" else 0) for x in words]
        tot = sum(w); acc = 0.0
        for x, wi in zip(words, w):
            st = t + dur*acc/tot; acc += wi
            words_all.append({"text": x, "start": round(st, 3), "end": round(t + dur*acc/tot, 3)})
        chunks.append((t, s)); line_end = t + dur
        t += dur + part.get("pause", 0.2)
    lines.append({"id": ln["id"], "text": " ".join(p["text"] for p in ln["parts"]),
                  "start": round(line_start, 3), "end": round(line_end, 3), "words": words_all})
total = line_end + 1.8
buf = np.zeros(int(total*sr_out), dtype=np.float32)
for st, s in chunks:
    a = int(st*sr_out); buf[a:a+len(s)] += s
buf *= 0.7/np.max(np.abs(buf))
sf.write(f"/tmp/_dry_{slug}.wav", buf, sr_out)
# Voice treatment: warmth, presence, gentle compression, and a short dark room tail.
chain = ("highpass=f=70,equalizer=f=170:t=q:w=1:g=3,equalizer=f=3200:t=q:w=1.2:g=2.5,"
         "acompressor=threshold=-20dB:ratio=3:attack=8:release=160:makeup=3,"
         "aecho=0.85:0.6:55|110:0.10|0.06,alimiter=limit=0.9")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"/tmp/_dry_{slug}.wav", "-af", chain, "-ar", "48000", wav_out], check=True)
find = lambda lid, w: next(x["start"] for l in lines if l["id"] == lid for x in l["words"] if x["text"].lower().startswith(w.lower()))
beats = {name: find(b["line"], b["word"]) for name, b in script.get("beats", {}).items()}
json.dump({"slug": slug, "fps": 30, "duration": round(total, 3), "beats": beats, "lines": lines}, open(out_json, "w"), indent=1)
print("total", round(total, 2), "beats", beats)
