---
name: verify
description: How to run and visually verify this static GitHub Pages site locally on Windows
---

# Verifying ghostgramlabs.github.io

Static site, no build step. Serve and screenshot:

```bash
# serve (run in background)
python -m http.server 8642

# headless screenshot with Edge (no Playwright on this machine)
"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  --headless=new --disable-gpu --no-first-run --user-data-dir="$SCRATCH/profile" \
  --window-size=1280,900 --hide-scrollbars --virtual-time-budget=6000 \
  --screenshot="$SCRATCH/out.png" "http://localhost:8642/?sky=night&weather=rain"
```

## Gotchas
- Edge's launcher detaches: the PNG appears a second or two **after** the
  command returns — `sleep 2` before checking. `--dump-dom` does NOT work
  (stdout is lost); verify via screenshots instead.
- Use a fresh `--user-data-dir` per rapid successive launch or shots get
  silently skipped.
- Tall pages: bump `--window-size=1280,4400` for a full-page capture.
- `node --check assets/site.js` for a quick syntax gate.

## Test overrides (in site.js)
- `?weather=sunny|cloudy|overcast|fog|rain|thunder|snow` — force weather,
  skips geolocation/Open-Meteo network calls.
- `?sky=morning|day|evening|night` — force time-of-day theme (otherwise
  from visitor's local clock: morning 5–10, day 10–17, evening 17–20,
  night 20–5, corrected by the weather API's `is_day`).
- `?moon=0..1` — force moon phase (0 new, 0.5 full).
- `?birds=1` — send the first morning bird flock immediately, spawned on-screen.
- `?hi=1` — Gram greets again even if he already said hi this session.
- NOTE: under `--virtual-time-budget` the rAF clock barely advances, so
  timer-spawned movers (birds, meteors) usually won't appear in headless
  shots; persistent creatures (fireflies, bats, butterflies) render frame 1.

## Flows worth driving
- Homepage in each sky × a couple of weathers (night+rain, night+sunny
  shows moon/stars).
- One app page (e.g. /PettiBox/) at night — checks the `.theme-*` accent
  survives the `body.sky-night` variable overrides.
- The weather sticker note (bottom-right, ~1.5s delay): links must be
  readable in night mode.
- After editing assets, bump the `?v=` query string in all six HTML files
  (index, 404, privacy, PettiBox/, DirectServe/, SpeakAlert/).
