# Gauntlet progress — avatar crop

Bar: Cropper.js 1.6.2 running locally at `/.superpowers/gauntlet/crop-bar/bar.html` (the real library, driven in a browser).
Goal: avatar upload lets the user crop and position the photo instead of the browser auto-cropping it.
Cost half: bar's library is 37 KB min; ours must add only a few KB, no new runtime dependency.

Round 0 (bar extraction) — DONE
- The real library + a 1200×800 photo fetched and served from the dev server; driven with Playwright
- Bar's defining behaviors measured: aspect-locked frame that never resizes during zoom/rotate; opens at fit (autoCropArea 1); 1:1 drag; square output at any requested size

Round 1 — DONE (commit f3c1104)
- Dialog with square 340×340 frame (invariant during zoom/rotate ✓), slider + wheel zoom, rotate, 4px arrow nudge, 332×332 live preview, Escape-safe cancel, 332×332 PNG saved to the existing `avatar` key, Re-crop button, non-image rejection, 110 new unit tests, +10.05 kB min / +3.24 kB gzip (27% of the bar's library)
- Critic verdict: **KEEP GOING — 1 failing piece** — drag over-amplification (`AvatarCropStage.jsx` computed deltas from the pointerdown origin on every move and applied them additively → a +20 pointer drag moved the photo +30). One hygiene item: revoked blob URLs logged two 404s.
- The critic also overturned a controller measurement: the "opens at max zoom" reading was contaminated by the controller's own synthetic slider events; fresh opens are at fit, matching the bar.

Round 2 — DONE (commit 58b8444)
- Per-pointer-event drag deltas + blob-URL revoke timing fix, 3 new `dragDelta` tests (194 total)
- Controller verified with real input: single drag ratio **1.00** (40/40), multi-move drag ratio **1.00** (31/31), full flow (upload → escape → re-crop → save) logs **zero console errors**

**Exit: INSIDE TOLERANCE — all 10 pieces pass.**
