# Gauntlet fixes + medium priorities — Implementation Plan

**Goal:** Ship the "Fix first" and "Medium" items from the improvement list: mobile layout, orphan-blob cleanup, honest missing-image state, keyboard shortcuts, hover caption/zoom, level badge art, current-game header line, and row-scoped galleries.

**Architecture:** Same Vite + React app. Pure logic lands in `src/lib/` with Vitest coverage (no React testing library in the project — logic stays pure, components stay thin). Visual work lands in `src/styles/steam.css`. Persistence additions rely on the existing `mergeWithDefaults` migration path.

**Spec:** `docs/superpowers/specs/2026-10-08-steam-dashboard-design.md` (unchanged; this plan extends it)

## Global constraints

- Runtime deps: react, react-dom ONLY. No new dev deps (no @testing-library) — pure functions in `src/lib/` are the test surface.
- No comments in code.
- English UI. Steam parity: values must come from Steam's real CSS (`docs/…/steam-fidelity/steam-profile*.css` or a fresh fetch), never invented.
- Do not start/stop dev servers — the user hosts `localhost:5173`.
- `npm test` (currently 19) and `npm run build` must pass before each commit.
- localStorage key `steam-dashboard-state-v1`; IndexedDB db `steam-dashboard`, store `blobs`.

---

### Task A: Fix-first batch

**Files:** `src/lib/cards.js` (+test), `src/lib/images.js` (new, +test), `src/lib/backup.js` (+test), `src/components/App.jsx`→`src/App.jsx`, `src/components/CardGrid.jsx`, `src/components/ShowcaseCard.jsx`, `src/styles/steam.css`

**Interfaces:** `filterCards(cards, query)`, `describeImageState({hasImage, resolvedUrl, failed})` → `'empty'|'loading'|'missing'|'failed'|'ok'`, `restoreBackup(backup, putBlobFn, deleteBlobFn)` deletes stored keys absent from the backup.

- [ ] Mobile CSS block `@media (max-width: 700px)`: header stacks (`flex-direction: column`), avatar 120px, `.profile-info` full width, `.btn { white-space: nowrap }`, `.cards-section`/`.backup-row` switch to `box-sizing: border-box; width: 100%`, grid 1 column below 540px (exists). Target: at 390px `documentElement.scrollWidth === 390`, `.btn` height ≤ 30px, `.profile-info` width ≥ 300px.
- [ ] `filterCards(cards, query)`: case-insensitive match on caption/title/body; empty query returns all. Tests.
- [ ] `describeImageState(...)` + wire `ShowcaseCard`: `missing` renders "Image missing" with a Remove image button. Tests.
- [ ] `restoreBackup` third arg `deleteBlobFn` (default `deleteBlob`): after writing backup images, delete every stored key not present in `backup.images`. Test seeds an orphan key and asserts deletion.
- [ ] Keyboard in `App`: `e` toggles edit mode, `/` focuses the card filter input, both ignored when the event target is an input/textarea/contenteditable. `CardGrid` owns the filter input (rendered when search is active) and filters via `filterCards`. `Escape` clears the filter.
- [ ] Tests: `npm test` grows from 19.

---

### Task B: Steam showcase hover chrome + level art

**Files:** `src/components/ShowcaseCard.jsx`, `src/components/LevelBadge.jsx`, `src/styles/steam.css`

- [ ] Wrap image + caption in `.card-media { position: relative; overflow: hidden }`; caption bar `.card-caption { opacity: 0 }` → `opacity: 1` on `.card:hover` (and on focus-within for keyboard); image `transform: scale(1.05)` on hover, `transition: transform .15s`. Read Steam's `.highlighted_screenshot:hover` rules from `steam-profile.css` and match its durations/easings; report what you used.
- [ ] Level badge art: tiers keep the ring colors; at level ≥ 100 the badge switches to Steam's hexagon treatment (`border: none`, `border-radius: 0`, `clip-path` hexagon, 32×32, `text-shadow: 1px 1px #1a1a1a`) and at ≥ 200 the shield silhouette; ≥ 5000 keeps 32px with no ring. No CDN hotlinks — CSS shapes only. `LevelBadge` adds `lvl_XX` class from the level so CSS owns the tiers.

---

### Task C: Row-scoped galleries

**Files:** `src/lib/gallery.js` (new, +test), `src/components/GalleryRow.jsx` (new), `src/components/ShowcaseCard.jsx`, `src/components/CardGrid.jsx`, `src/App.jsx`

**Interfaces:** `buildRows(cards, perRow = 3)` → `[{ id, cardIds }]` grouping showcase cards in order; viewer state becomes `viewerRowId`; `ImageViewer` items come from that row only.

- [ ] `buildRows` pure + tests (fewer than 3, exact multiple, non-showcase cards ignored, stable ids).
- [ ] `GalleryRow` renders a strip of up to 3 thumbnails (Steam `.showcase_row` proportions: square-ish cells, 4px gaps) + the row label; clicking a thumb opens the viewer **scoped to that row**.
- [ ] Cards keep their single `cards` array and drag-and-drop reordering across rows (rows derive from order; no state migration).
- [ ] Notes keep their own grid below the gallery.

---

### Task D: Header current-game line

**Files:** `src/lib/storage.js` (+test), `src/components/ProfileHeader.jsx`, `src/styles/steam.css`

- [ ] `DEFAULT_STATE.profile` gains `currentGame: ''` and `hoursPlayed: ''` (migration is automatic via `mergeWithDefaults`).
- [ ] View mode renders `.profile-current-game`: status-colored dot + game name (`#c4c4c4`, 13px) + optional hours. Edit mode: two inputs. Hidden entirely when empty and not editing.
- [ ] Tests: defaults + migration backfill for stored states lacking the fields.
