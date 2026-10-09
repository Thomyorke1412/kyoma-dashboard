# Gauntlet progress — avatar crop

Bar: Cropper.js 1.6.2 running locally at `/.superpowers/gauntlet/crop-bar/bar.html` (the real library, driven in a browser — not a screenshot).
Goal: our avatar upload lets the user crop and position the photo instead of auto-cropping it.
Cost half: bar's library is 37 KB min; ours must add only a few KB, no new runtime dependency.

Round 0 (bar extraction) — DONE
- Bar library + real photo fetched; bar page served from the dev server and driven
- Measured: 600×600 aspect-locked frame that never resizes during zoom/rotate; zoom scales the image linearly; `getCroppedCanvas` always returns an exact square at the requested size
- Gaps written to `.superpowers/gauntlet/crop-bar/GAPS-crop.md` — 10 pieces, all critical except rotate and keyboard nudge

Round 1 — DONE
- `src/lib/crop.js` + `cropRender.js` + `useCropImage.js` (pure, 110 Vitest tests), `AvatarCropDialog`/`AvatarCropStage` components
- Frame verified fixed-size in the browser through drag, wheel zoom, rotate and nudge; output 332×332 blob to the existing `avatar` idb key
- Bundle delta: +10.05 kB min / +3.24 kB gzip JS, +2.02 kB CSS — no new runtime dependency
- Report: `.superpowers/gauntlet/crop-bar/round1-builder-report.md`
