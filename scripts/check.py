"""Automatic quality gate for a rendered Short. Exits non-zero on failure."""
import json, re, subprocess, sys
f = sys.argv[1]; fails = []
p = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height,r_frame_rate",
                               "-of", "json", f], capture_output=True, text=True).stdout)
dur = float(p["format"]["duration"]); v = next(s for s in p["streams"] if s["codec_type"] == "video")
if not (20 <= dur <= 58): fails.append(f"duration {dur:.1f}s outside 20-58s")
if (v["width"], v["height"]) != (1080, 1920): fails.append(f'size {v["width"]}x{v["height"]}')
if v["r_frame_rate"] != "30/1": fails.append(f'fps {v["r_frame_rate"]}')
err = subprocess.run(["ffmpeg", "-hide_banner", "-i", f, "-af", "ebur128", "-vn", "-f", "null", "-"], capture_output=True, text=True).stderr
lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", err)[-1])
if not (-16.5 <= lufs <= -12.5): fails.append(f"loudness {lufs} LUFS")
err = subprocess.run(["ffmpeg", "-hide_banner", "-i", f, "-af", "silencedetect=noise=-45dB:d=0.9", "-vn", "-f", "null", "-"], capture_output=True, text=True).stderr
gaps = [float(x) for x in re.findall(r"silence_duration: ([\d.]+)", err)]
if any(g > 1.2 for g in gaps[:-1]): fails.append(f"dead air {max(gaps):.1f}s")
print(f"check {f}: {dur:.1f}s {lufs} LUFS", "FAIL " + "; ".join(fails) if fails else "PASS")
sys.exit(1 if fails else 0)
