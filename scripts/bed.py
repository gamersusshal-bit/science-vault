"""Generate the music/SFX bed for a video from its timeline.
Usage: python3 scripts/bed.py <slug>
Reads videos/<slug>/timeline.json. Two beats shape the sound:
  drop = the opening event (reverse suck + sub drop; pad thins; clock ticks start)
  hit  = the climax (riser into it, impact, then cold near-silence)
If a script has no beats, drop defaults to 1.0 s and hit to 75% of the duration.
All sound is synthesized here (no samples), so it is royalty-free.
"""
import json, sys, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

slug = sys.argv[1]
tl = json.load(open(f"videos/{slug}/timeline.json")); SR = 44100; D = tl["duration"]
TV = float(tl.get("beats", {}).get("drop", 1.0)); TH = float(tl.get("beats", {}).get("hit", D*0.75))
n = int(D*SR); t = np.arange(n)/SR
rng = np.random.default_rng(7)

def lp(x, fc):  return sosfilt(butter(2, fc, "low", fs=SR, output="sos"), x)
def bp(x, a, b): return sosfilt(butter(2, [a, b], "band", fs=SR, output="sos"), x)
def env_at(t0, attack, decay):
    e = np.zeros(n); i = t >= t0
    tt = t[i]-t0
    e[i] = np.minimum(tt/max(attack,1e-4), 1.0)*np.exp(-np.maximum(tt-attack,0)/decay)
    return e
def sm(a, b):  # smooth 0..1 ramp between a and b seconds
    return np.clip((t-a)/(b-a), 0, 1)**2*(3-2*np.clip((t-a)/(b-a), 0, 1))

L = np.zeros(n); R = np.zeros(n)

# 1) Pad: D minor drone, detuned partials, slow movement. Cuts out at the hit.
pad_l = np.zeros(n); pad_r = np.zeros(n)
for f, g in [(73.42, 1.0), (110.0, 0.7), (146.83, 0.55), (174.61, 0.4), (220.0, 0.25), (293.66, 0.14)]:
    for k, det in enumerate([-0.35, 0.0, 0.4]):
        ph = rng.uniform(0, 6.28)
        lfo = 0.75 + 0.25*np.sin(2*np.pi*(0.05+0.03*k)*t + ph)
        s = np.sin(2*np.pi*(f+det)*t + ph)*g*lfo
        pad_l += s*(0.6+0.4*(k % 2)); pad_r += s*(0.6+0.4*((k+1) % 2))
pad_gate = sm(0, 1.2)*(1 - 0.55*sm(TV, TV+0.3))            # thins out when the Sun goes
pad_gate *= (1 + 0.9*sm(TH-6, TH))                          # tension builds toward the hit
pad_gate *= (1 - sm(TH, TH+0.08))                           # hard cut at the hit
L += 0.050*pad_l*pad_gate; R += 0.050*pad_r*pad_gate

# 2) Vanish: reverse suck into a sub drop
suck = bp(rng.standard_normal(n), 300, 5000)*np.clip((t-(TV-0.55))/0.55, 0, 1)**3*(t < TV)
boom = np.sin(2*np.pi*(38+50*np.exp(-np.maximum(t-TV, 0)*9))*np.maximum(t-TV, 0))*env_at(TV, 0.005, 0.55)
L += 0.22*suck + 0.55*boom; R += 0.22*suck + 0.55*boom

# 3) Clock: soft tick every half second while the last light travels
tick = np.zeros(n); k = 0; tt = TV + 0.5
while tt < TH - 0.05:
    e = env_at(tt, 0.001, 0.018)
    tick += np.sin(2*np.pi*(1900 if k % 2 == 0 else 1500)*t)*e*(0.35 + 0.65*(tt-TV)/(TH-TV))
    tt += 0.5; k += 1
L += 0.060*tick; R += 0.060*tick

# 4) Riser into the hit
ris_e = np.clip((t-(TH-3.0))/3.0, 0, 1)**2.2*(t < TH)
sweep = np.sin(2*np.pi*np.cumsum(120+900*np.clip((t-(TH-3.0))/3.0, 0, 1)**2)/SR)
ris = (0.5*bp(rng.standard_normal(n), 800, 7000) + 0.5*sweep)*ris_e
L += 0.15*ris; R += 0.15*ris

# 5) Impact at 8:20, then cold near-silence with a single high tone
hit = np.sin(2*np.pi*(32+70*np.exp(-np.maximum(t-TH, 0)*7))*np.maximum(t-TH, 0))*env_at(TH, 0.004, 0.9)
crack = lp(rng.standard_normal(n), 2500)*env_at(TH, 0.002, 0.12)
L += 0.75*hit + 0.25*crack; R += 0.75*hit + 0.25*crack
cold = (np.sin(2*np.pi*587.33*t) + 0.5*np.sin(2*np.pi*880.0*t + 1.0))*sm(TH+0.3, TH+2.5)*(1 - sm(D-1.2, D))
subd = np.sin(2*np.pi*36.71*t)*sm(TH+0.2, TH+1.5)*(1 - sm(D-1.0, D))
L += 0.022*cold + 0.10*subd; R += 0.022*cold*0.8 + 0.10*subd

out = np.stack([L, R], axis=1)
out *= 0.8/np.max(np.abs(out))
out[-int(0.3*SR):] *= np.linspace(1, 0, int(0.3*SR))[:, None]
sf.write(f"public/{slug}/bed.wav", out, SR)
print("bed", D, "s")
