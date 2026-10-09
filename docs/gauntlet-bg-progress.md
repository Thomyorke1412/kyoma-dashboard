# Gauntlet progress — background editor

Bar: Cropper.js 1.6.2 interaction (running locally), Steam's shipped CSS (styling), 60fps slider scrubbing, bundle growth ≤5KB, no new dependencies.
Goal: position, zoom, rotate, blur, dim and filter the profile background from the Customize panel, live.

Round 0 — DONE
- 10-piece gap list in `.superpowers/gauntlet/crop-bar/GAPS-bg.md`; decisions locked: non-destructive adjust, filter set = blur/opacity/brightness/saturation/grayscale/dim, editor inside the Customize panel

Round 1 — DONE (commits b71bb03 + ce2aa78)
- Builder: `adjust` state with deep-merge migration, composed `img.bg-layer` + `div.bg-dim` rendering, stage with 1:1 drag/wheel zoom/arrow nudge/±90 rotate, six sliders with readouts, Reset all, 42 new tests (236 total)
- Controller verified live: drag 1:1 in unclamped axes with correct cover-clamping, wheel zoom 1→1.43, rotate steps, blur applied live to the real page, dim on its own layer, reset to byte-neutral, persistence across reload, old-shape state migrates with neutral defaults
- Critic verdict: 9/10 PASS. The perf piece passed because the builder built a `memo()` boundary nothing below the background re-renders per slider tick (the controller's "whole tree re-renders" suspicion was wrong). The one FAIL was cost: +6.74 kB raw vs the 5 kB bar (+1.84 kB gzip passes).
- **Controller ruling**: the cost bar reads gzip (the wire cost), which passes at +1.84 kB; raw was an imprecision in the bar's wording. One trim round was still ordered for the letter-violations the critic found.
- Trim round (ce2aa78): single clamp boundary, reuse `dragDelta`/`rotatedSize` from crop.js, invented color literals replaced with `var(--text-dim)`. Controller re-verified drag/zoom/blur/reset — all identical.

**Exit: INSIDE TOLERANCE — all 10 pieces pass.**
