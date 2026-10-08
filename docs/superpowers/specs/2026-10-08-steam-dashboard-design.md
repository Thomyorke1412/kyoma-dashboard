# Steam-Style Personal Dashboard — Design Spec

Date: 2026-10-08
Status: Approved by user (brainstorm + grilling sessions complete)

## Overview

A single-page personal dashboard web app that replicates the look and feel of a
Steam profile — near-pixel-perfect visual clone — where every piece of content
is editable in-page: profile fields, theme, background, image/GIF showcase
cards, and text notes. Runs locally (Vite + React dev server), data persisted
in the browser, deployable as static files later.

## Goals

- Look as close to a real Steam profile as possible (dark theme, cyan accents,
  gradient header, Steam-style showcase grid).
- Everything editable directly on the page — no config files, no code edits.
- Zero-backend: all data stays in the user's browser.
- No extra runtime dependencies beyond React.

## Non-Goals (v1)

- No real Steam data or Steam API integration.
- No multi-user / login system.
- No decorative avatar frames (plain avatar only; frames can be added later).
- No multi-page/tab navigation (single scrolling page).

## Visual Design

- **Theme base**: Steam dark palette — background `#1b2838`, panels
  `#16202d`/`#171d25`, accent `#66c0f4` (user-editable), Steam-like gradients
  and typography (Motiva Sans is not freely licensable; use a close free
  sans-stack with similar weights/spacing).
- **Layout** (single scrolling page, top to bottom):
  1. **Profile header** — avatar, display name, status line, level badge with
     XP bar, summary/description box, info fields (real name, location).
  2. **Content area** — strict uniform grid of cards (Steam showcase style):
     image/GIF showcase cards and text note cards mixed in one grid.
- **Background**: user-chosen image (upload or URL) or color/gradient preset,
  applied to the whole page; content panels render semi-transparent over it,
  matching Steam's full-profile background behavior.
- **Theme customization panel**: opens from a header button (like Steam's
  "Edit Profile" affordance). Accent color picker, background color/gradient
  presets, full-page background image. Changes apply live and persist.
- **View vs Edit**: an edit-mode toggle keeps view mode clean; edit controls
  (add, delete, drag handles, field editing) appear only in edit mode.

## Features

### Profile editing
- Editable: avatar (file upload or URL), display name, status text + color,
  real name, location, summary box.
- Level badge: number + XP bar. **XP auto-grows** as the user adds notes and
  images (gamification); level derived from total XP.

### Showcase cards (images/GIFs)
- Card = image or GIF + caption.
- Add via file upload or URL paste.
- Click image → fullscreen viewer with prev/next navigation across all
  showcase images.

### Text notes
- Card = title + body text, edited in place.

### Card management
- Drag-and-drop reordering of all cards in the grid (no external DnD library).
- Add/delete cards in edit mode.

### Theme & background
- Accent color picker, background presets + custom image (upload/URL).
- Live preview; persists across reloads.

### Backup
- Export: download all data (profile, settings, notes, captions, images
  embedded) as a single JSON file.
- Import: restore from that file, replacing current data.

## Data & Persistence

- **localStorage**: profile fields, settings, theme, card metadata (captions,
  ordering, note text), XP total.
- **IndexedDB**: uploaded image/GIF blobs (localStorage's ~5MB cap cannot hold
  images; IndexedDB stores blobs by reference).
- URL-based images are not downloaded — only the URL is stored.
- Exported backup embeds uploaded images as data URLs so a single file
  restores everything.

## Architecture

Vite + React, plain CSS (hand-coded Steam look, CSS variables for theming).

```
src/
  main.jsx
  App.jsx
  components/
    ProfileHeader.jsx
    LevelBadge.jsx
    CustomizePanel.jsx
    CardGrid.jsx
    ShowcaseCard.jsx
    TextNoteCard.jsx
    ImageViewer.jsx
    EditModeToggle.jsx
  styles/
    steam.css        (Steam base theme, CSS variables)
  lib/
    storage.js       (localStorage helpers)
    idb.js           (raw IndexedDB wrapper: put/get/delete blobs)
    backup.js        (export/import)
    xp.js            (XP awarding, level calculation)
```

## Error Handling

- IndexedDB failures (quota, private mode): surface a visible toast/banner —
  never silently drop data.
- Import validation: reject malformed backup files with a clear message;
  do not wipe existing data on a failed import.
- Image URL load failures: placeholder frame with retry/remove affordance in
  the card.

## Testing / Verification

- Visual: manual verification against a real Steam profile in the browser
  (dev server), in both view and edit modes.
- Logic (xp, storage, backup import/export round-trip): unit tests with
  Vitest.
- Playwright smoke test: load page, toggle edit mode, add a note, reload,
  confirm persistence.

## Future (out of scope now)

- Free static hosting deploy (Vercel/Netlify) — build output is already
  static.
- Avatar frames, activity feed, badge collection, tabs/pages.
