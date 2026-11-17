"""Warn about stretches where the picture barely changes (playbook section 4). Never fails.
Usage: python3 scripts/motion.py renders/<slug>.mp4 [seconds=2.5]
Compares each frame with the frame `seconds` later (low resolution, captions masked out);
stretches where that change stays small are reported. Calibrated on the first four videos:
it flags the 9-12 s hold in tree-from-air and the slow seed placement in sunflower-spirals."""
import subprocess, sys
import numpy as np
f = sys.argv[1]; limit = float(sys.argv[2]) if len(sys.argv) > 2 else 2.5
W, H, STEP = 54, 96, 0.25
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-vf", f"fps={1/STEP},scale={W}:{H},format=gray",
                      "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(float)
# ignore the caption band (y 1400-1660 of 1920), which changes even when the scene does not
mask = np.ones((H, W), bool); mask[int(H*1400/1920):int(H*1660/1920)] = False
# change between each frame and the frame `limit` seconds later; low = the picture barely moved
k = int(round(limit/STEP))
far = [np.abs(fr[i+k]-fr[i])[mask].mean() for i in range(len(fr)-k)]
out, start = [], None
for i, d in enumerate(far + [99]):
    if d < 3.0 and start is None: start = i
    if d >= 3.0 and start is not None:
        out.append((start*STEP, (i-1)*STEP + limit)); start = None
print("motion", f + ":", "OK" if not out else "WARN little change during " + ", ".join(f"{a:.1f}-{b:.1f}s" for a, b in out))
