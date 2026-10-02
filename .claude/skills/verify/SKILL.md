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
  --screenshot="$SCRATCH/out.png" "http://localhost:8642/?rain=after"
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
- `?rain=drizzle|rain|storm|easing|after` — hold one part of the monsoon
  cycle instead of letting it loop. `storm` brings lightning; `after` (and
  `drizzle`) bring the termites round the lamp.
- Sound can't be heard headless, but it can be measured: drive Edge or
  Chrome over the DevTools protocol (Node 24 has WebSocket built in), click
  `.sound-btn` with `Input.dispatchMouseEvent` (a real gesture, so normal
  autoplay rules apply), and read an AnalyserNode spliced in front of
  `AudioContext.destination` via `Page.addScriptToEvaluateOnNewDocument`.
- Edge headless won't shrink its window below ~500px; for a true phone view,
  put the page in a 390px-wide iframe.
- NOTE: under `--virtual-time-budget` the rAF clock barely advances, so the
  rain is sparse and termites only start to gather in headless shots. Motion,
  lightning and sound need a real browser.

## Flows worth driving
- Homepage at `?rain=after` (lamp, dog, termites) and `?rain=storm`.
- One app page (e.g. /PettiBox/): checks the `.theme-*` night accent and the
  paper-coloured Play button on the dark hero.
- Phone width (390px iframe): hero side gutters, dog sitting under the buttons.
- After editing assets, bump the `?v=` query string in all six HTML files
  (index, 404, privacy, PettiBox/, DirectServe/, SpeakAlert/).
