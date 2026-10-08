# Steam-Style Personal Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page personal dashboard that visually clones a Steam profile, with everything (profile fields, theme, background, image/GIF showcase cards, text notes) editable in-page and persisted in the browser.

**Architecture:** Vite + React SPA. State lives in one object persisted to localStorage; uploaded image/GIF blobs live in IndexedDB; URL images stored as-is. One `App` component owns state and passes props down to dumb-ish presentational components. Theme applied via CSS variables, background rendered as a fixed layer under a max-940px content column.

**Tech Stack:** React 18, Vite 5, Vitest + jsdom + fake-indexeddb (dev/test only). No runtime dependencies besides react/react-dom.

**Spec:** `docs/superpowers/specs/2026-10-08-steam-dashboard-design.md`

## Global Constraints

- Runtime dependencies: `react`, `react-dom` ONLY. Dev deps allowed: `vite`, `@vitejs/plugin-react`, `vitest`, `jsdom`, `fake-indexeddb`.
- UI language: English.
- Default colors: background `#1b2838`, accent `#66c0f4`.
- localStorage key: `steam-dashboard-state-v1`. IndexedDB: database `steam-dashboard`, version 1, object store `blobs`.
- No comments in code.
- No error silently swallowed: every catch either recovers with a user-visible message or a justified no-op notify.
- Commands run in PowerShell 7 (pwsh) on Windows; use `&&` to chain.
- Node >= 18 required (crypto.randomUUID, structuredClone availability not assumed — use JSON clone).

---

### Task 1: Project scaffold + state storage (TDD)

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `src/main.jsx`, `src/App.jsx`, `src/styles/steam.css`, `src/lib/storage.js`, `src/lib/storage.test.js`

**Interfaces:**
- Produces: `loadState(): state`, `saveState(state)`, `DEFAULT_STATE` — every later component consumes this state shape:
```js
{
  profile: { avatar: {type:'url'|'idb'|'preset', value:string}, displayName: string, status: {text: string, color: string}, realName: string, location: string, summary: string },
  theme: { accent: string, background: {type:'preset'|'color'|'url'|'idb', value:string} },
  cards: Array<{id: string, type:'showcase'|'note', ...}>,
  xp: number,
}
```

- [ ] **Step 1: Create scaffold files**

`package.json`:
```json
{
  "name": "steam-dashboard",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^5.4.11",
    "vitest": "^2.1.8",
    "jsdom": "^25.0.1",
    "fake-indexeddb": "^6.0.0"
  }
}
```

`vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
  },
})
```

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Steam Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

`.gitignore`:
```
node_modules/
dist/
```

`src/main.jsx`:
```jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/steam.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

`src/App.jsx` (minimal placeholder for now):
```jsx
export default function App() {
  return <div className="app">Steam Dashboard</div>
}
```

`src/styles/steam.css` (stub, filled in Task 4):
```css
body { margin: 0; background: #1b2838; color: #c6d4df; }
```

- [ ] **Step 2: Write the failing test for storage**

`src/lib/storage.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest'
import { loadState, saveState, DEFAULT_STATE } from './storage'

const STORAGE_KEY = 'steam-dashboard-state-v1'

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('returns defaults when nothing is stored', () => {
    const state = loadState()
    expect(state.profile.displayName).toBe('New User')
    expect(state.profile.status.color).toBe('#57cbde')
    expect(state.theme.accent).toBe('#66c0f4')
    expect(state.cards).toEqual([])
    expect(state.xp).toBe(0)
  })

  it('saves and reloads state', () => {
    const state = loadState()
    state.xp = 123
    state.profile.displayName = 'Houou'
    saveState(state)
    const reloaded = loadState()
    expect(reloaded.xp).toBe(123)
    expect(reloaded.profile.displayName).toBe('Houou')
  })

  it('fills in defaults for missing nested fields from older data', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: { displayName: 'X' } }))
    const state = loadState()
    expect(state.profile.displayName).toBe('X')
    expect(state.profile.status.text).toBe('Online')
    expect(state.profile.avatar).toEqual({ type: 'url', value: '' })
    expect(state.theme.background.type).toBe('preset')
    expect(state.cards).toEqual([])
    expect(state.xp).toBe(0)
  })

  it('recovers from corrupted JSON by returning defaults', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{{{')
    const state = loadState()
    expect(state.profile.displayName).toBe('New User')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm install && npx vitest run src/lib/storage.test.js`
Expected: FAIL — cannot resolve `./storage`

- [ ] **Step 4: Write minimal implementation**

`src/lib/storage.js`:
```js
const STORAGE_KEY = 'steam-dashboard-state-v1'

export const DEFAULT_STATE = {
  profile: {
    avatar: { type: 'url', value: '' },
    displayName: 'New User',
    status: { text: 'Online', color: '#57cbde' },
    realName: '',
    location: '',
    summary: '',
  },
  theme: {
    accent: '#66c0f4',
    background: { type: 'preset', value: 'steam-dark' },
  },
  cards: [],
  xp: 0,
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function mergeWithDefaults(raw) {
  const profile = raw?.profile ?? {}
  const theme = raw?.theme ?? {}
  return {
    profile: {
      ...clone(DEFAULT_STATE.profile),
      ...profile,
      avatar: { ...DEFAULT_STATE.profile.avatar, ...(profile.avatar ?? {}) },
      status: { ...DEFAULT_STATE.profile.status, ...(profile.status ?? {}) },
    },
    theme: {
      ...clone(DEFAULT_STATE.theme),
      ...theme,
      background: { ...DEFAULT_STATE.theme.background, ...(theme.background ?? {}) },
    },
    cards: Array.isArray(raw?.cards) ? raw.cards : [],
    xp: typeof raw?.xp === 'number' ? raw.xp : 0,
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return clone(DEFAULT_STATE)
    return mergeWithDefaults(JSON.parse(raw))
  } catch {
    return clone(DEFAULT_STATE)
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/storage.test.js`
Expected: PASS (4 tests)

- [ ] **Step 6: Verify dev server boots**

Run: `npm run dev` (in background), open `http://localhost:5173` with Playwright MCP, confirm "Steam Dashboard" text renders, then stop the server.

- [ ] **Step 7: Commit**

```bash
git init && git add -A && git commit -m "feat: scaffold vite+react project with localStorage state persistence"
```

---

### Task 2: IndexedDB blob storage (TDD)

**Files:**
- Create: `src/lib/idb.js`, `src/lib/idb.test.js`

**Interfaces:**
- Consumes: nothing (standalone)
- Produces (used by Tasks 5, 7, 9 and `useIdbImage.js`):
  - `putBlob(key: string, blob: Blob): Promise<string>` — resolves with the key
  - `getBlob(key: string): Promise<Blob|null>`
  - `deleteBlob(key: string): Promise<void>`
  - `getAllBlobKeys(): Promise<string[]>`
  - `blobToDataUrl(blob: Blob): Promise<string>` (data URL string)
  - `dataUrlToBlob(dataUrl: string): Blob`

- [ ] **Step 1: Write the failing test**

`src/lib/idb.test.js`:
```js
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { putBlob, getBlob, deleteBlob, getAllBlobKeys, blobToDataUrl, dataUrlToBlob } from './idb'

describe('idb', () => {
  beforeEach(async () => {
    for (const key of await getAllBlobKeys()) await deleteBlob(key)
  })

  it('puts and gets a blob', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' })
    await putBlob('img-1', blob)
    const result = await getBlob('img-1')
    expect(result).not.toBeNull()
    expect(await result.text()).toBe('hello')
  })

  it('returns null for a missing key', async () => {
    expect(await getBlob('nope')).toBeNull()
  })

  it('deletes a blob', async () => {
    await putBlob('img-2', new Blob(['x']))
    await deleteBlob('img-2')
    expect(await getBlob('img-2')).toBeNull()
  })

  it('lists all keys', async () => {
    await putBlob('a', new Blob(['1']))
    await putBlob('b', new Blob(['2']))
    const keys = await getAllBlobKeys()
    expect(keys).toContain('a')
    expect(keys).toContain('b')
  })

  it('round-trips blob to data URL and back', async () => {
    const blob = new Blob(['gif-data'], { type: 'image/gif' })
    const dataUrl = await blobToDataUrl(blob)
    expect(dataUrl).toMatch(/^data:image\/gif;base64,/)
    const restored = dataUrlToBlob(dataUrl)
    expect(restored.type).toBe('image/gif')
    expect(await restored.text()).toBe('gif-data')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/idb.test.js`
Expected: FAIL — cannot resolve `./idb`

- [ ] **Step 3: Write the implementation**

`src/lib/idb.js`:
```js
const DB_NAME = 'steam-dashboard'
const STORE = 'blobs'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function runTransaction(mode, action) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const store = tx.objectStore(STORE)
        const req = action(store)
        tx.oncomplete = () => {
          db.close()
          resolve(req ? req.result : undefined)
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
        tx.onabort = () => {
          db.close()
          reject(tx.error)
        }
      })
  )
}

export function putBlob(key, blob) {
  return runTransaction('readwrite', (store) => store.put(blob, key)).then(() => key)
}

export function getBlob(key) {
  return runTransaction('readonly', (store) => store.get(key)).then((result) => result ?? null)
}

export function deleteBlob(key) {
  return runTransaction('readwrite', (store) => store.delete(key))
}

export function getAllBlobKeys() {
  return runTransaction('readonly', (store) => store.getAllKeys())
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(',')
  const mimeMatch = meta.match(/data:(.*?)(;|$)/)
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime === '' ? 'application/octet-stream' : mime })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/idb.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Run all tests (no regressions)**

Run: `npm test`
Expected: PASS (9 tests total)

- [ ] **Step 6: Commit**

```bash
git add src/lib/idb.js src/lib/idb.test.js && git commit -m "feat: IndexedDB blob storage wrapper with data URL helpers"
```

---

### Task 3: XP / level system (TDD)

**Files:**
- Create: `src/lib/xp.js`, `src/lib/xp.test.js`

**Interfaces:**
- Consumes: nothing
- Produces (used by Task 7 `App` and Task 5 `LevelBadge`):
  - `XP_PER_NOTE = 10`, `XP_PER_IMAGE = 25`, `XP_PER_LEVEL = 100`
  - `awardXp(currentXp: number, amount: number): number`
  - `levelFromXp(xp: number): number`
  - `levelProgress(xp: number): { level: number, intoLevel: number, needed: number, pct: number }`

- [ ] **Step 1: Write the failing test**

`src/lib/xp.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { awardXp, levelFromXp, levelProgress, XP_PER_NOTE, XP_PER_IMAGE, XP_PER_LEVEL } from './xp'

describe('xp', () => {
  it('awards XP additively', () => {
    expect(awardXp(0, XP_PER_NOTE)).toBe(10)
    expect(awardXp(10, XP_PER_IMAGE)).toBe(35)
  })

  it('computes level 1 at zero XP', () => {
    expect(levelFromXp(0)).toBe(1)
  })

  it('levels up every 100 XP', () => {
    expect(levelFromXp(99)).toBe(1)
    expect(levelFromXp(100)).toBe(2)
    expect(levelFromXp(250)).toBe(3)
  })

  it('reports progress into current level', () => {
    const p = levelProgress(250)
    expect(p).toEqual({ level: 3, intoLevel: 50, needed: XP_PER_LEVEL, pct: 50 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/xp.test.js`
Expected: FAIL — cannot resolve `./xp`

- [ ] **Step 3: Write the implementation**

`src/lib/xp.js`:
```js
export const XP_PER_NOTE = 10
export const XP_PER_IMAGE = 25
export const XP_PER_LEVEL = 100

export function awardXp(currentXp, amount) {
  return Math.max(0, currentXp + amount)
}

export function levelFromXp(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

export function levelProgress(xp) {
  const intoLevel = xp % XP_PER_LEVEL
  return {
    level: levelFromXp(xp),
    intoLevel,
    needed: XP_PER_LEVEL,
    pct: (intoLevel / XP_PER_LEVEL) * 100,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/xp.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: PASS (13 tests total)

- [ ] **Step 6: Commit**

```bash
git add src/lib/xp.js src/lib/xp.test.js && git commit -m "feat: XP awarding and level calculation"
```

---

### Task 4: Steam theme CSS + background system + App shell

**Files:**
- Modify: `src/styles/steam.css` (replace stub entirely)
- Modify: `src/App.jsx` (replace entirely)
- Create: `src/lib/presets.js`, `src/lib/useIdbImage.js`

**Interfaces:**
- Consumes: `loadState`, `saveState` (Task 1), `getBlob` (Task 2)
- Produces:
  - `BACKGROUND_PRESETS: { [id: string]: cssBackgroundString }` with ids `steam-dark`, `steam-blue`, `midnight`, `aurora`
  - `useIdbImage(key: string|null): string|null` — resolves an IndexedDB blob key to a cached object URL
  - App shell renders `<div class="page-background">` + `<div class="app">`; CSS variables `--accent` (and friends) on `:root`

- [ ] **Step 1: Create `src/lib/presets.js`**

```js
export const BACKGROUND_PRESETS = {
  'steam-dark': 'linear-gradient(135deg, #1b2838 0%, #16202d 60%, #101822 100%)',
  'steam-blue': 'linear-gradient(180deg, #171a2b 0%, #2a475e 100%)',
  midnight: 'linear-gradient(135deg, #0f1623 0%, #1b2838 100%)',
  aurora: 'linear-gradient(135deg, #1b2838 0%, #66c0f4 140%)',
}
```

- [ ] **Step 2: Create `src/lib/useIdbImage.js`**

```js
import { useEffect, useState } from 'react'
import { getBlob } from './idb'

const urlCache = new Map()

export function getIdbUrlFromCache(key) {
  return urlCache.get(key) ?? null
}

export default function useIdbImage(key) {
  const [url, setUrl] = useState(() => (key ? urlCache.get(key) ?? null : null))

  useEffect(() => {
    if (!key) {
      setUrl(null)
      return
    }
    if (urlCache.has(key)) {
      setUrl(urlCache.get(key))
      return
    }
    let cancelled = false
    getBlob(key)
      .then((blob) => {
        if (blob && !cancelled) {
          const objectUrl = URL.createObjectURL(blob)
          urlCache.set(key, objectUrl)
          setUrl(objectUrl)
        } else if (!blob && !cancelled) {
          setUrl(null)
        }
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [key])

  return url
}
```

- [ ] **Step 3: Write full Steam theme CSS**

Replace `src/styles/steam.css` entirely with:

```css
:root {
  --accent: #66c0f4;
  --bg: #1b2838;
  --panel: #16202d;
  --panel-rgba: rgba(22, 32, 45, 0.92);
  --border: rgba(255, 255, 255, 0.08);
  --text: #c6d4df;
  --text-dim: #8f98a0;
  --danger: #e05a5a;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  min-height: 100%;
}

body {
  margin: 0;
  font-family: "Motiva Sans", Arial, Helvetica, sans-serif;
  font-size: 13px;
  color: var(--text);
  background: var(--bg);
}

.page-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  background-size: cover;
  background-position: center;
}

.app {
  max-width: 940px;
  margin: 0 auto;
  padding: 24px 12px 60px;
}

.profile-header {
  background: linear-gradient(135deg, rgba(21, 31, 44, 0.95), rgba(27, 40, 56, 0.88));
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 20px;
  display: flex;
  gap: 20px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.avatar-column {
  flex: none;
  width: 184px;
}

.avatar-frame {
  width: 184px;
  height: 184px;
  border: 1px solid var(--border);
  background: #000;
  overflow: hidden;
}

.avatar-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-dim);
  font-size: 12px;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.display-name {
  font-size: 24px;
  font-weight: 300;
  color: #fff;
  margin: 0 0 4px;
}

.status-line {
  margin-bottom: 8px;
}

.level-badge-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0;
}

.level-badge {
  background: #2a475e;
  border: 1px solid var(--accent);
  color: var(--accent);
  border-radius: 3px;
  padding: 2px 8px;
  font-weight: bold;
  white-space: nowrap;
}

.xp-bar {
  flex: 1;
  height: 8px;
  background: #000;
  border-radius: 4px;
  overflow: hidden;
}

.xp-bar-fill {
  height: 100%;
  background: var(--accent);
}

.profile-fields {
  margin-top: 12px;
  line-height: 1.6;
}

.profile-fields .field {
  color: var(--text-dim);
}

.summary-box {
  margin-top: 12px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  padding: 8px 10px;
  min-height: 40px;
  white-space: pre-wrap;
}

.header-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.btn {
  background: linear-gradient(to bottom, rgba(103, 193, 245, 0.2), rgba(103, 193, 245, 0.1));
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 2px;
  padding: 6px 16px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  display: inline-block;
}

.btn:hover {
  color: #fff;
  border-color: #fff;
}

.btn.btn-edit-active {
  background: var(--accent);
  color: #16202d;
}

.btn-sm {
  padding: 3px 10px;
  font-size: 11px;
  cursor: pointer;
}

.btn-danger {
  border-color: var(--danger);
  color: var(--danger);
}

.btn-danger:hover {
  border-color: #ff8080;
  color: #ff8080;
  background: rgba(224, 90, 90, 0.15);
}

input,
textarea {
  font-family: inherit;
  font-size: 13px;
  color: #fff;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border);
  border-radius: 2px;
  padding: 4px 8px;
}

input:focus,
textarea:focus {
  border-color: var(--accent);
  outline: none;
}

.cards-section {
  margin-top: 24px;
}

.add-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.empty-hint {
  color: var(--text-dim);
  padding: 24px;
  text-align: center;
  background: rgba(0, 0, 0, 0.2);
  border: 1px dashed var(--border);
  border-radius: 4px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

@media (max-width: 800px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 540px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}

.card {
  background: var(--panel-rgba);
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.card.drag-over {
  outline: 2px dashed var(--accent);
  outline-offset: -2px;
}

.card-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
  cursor: pointer;
  background: #000;
}

.card-image-placeholder {
  width: 100%;
  aspect-ratio: 16 / 9;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  color: var(--text-dim);
  background: rgba(0, 0, 0, 0.3);
  text-align: center;
  padding: 8px;
}

.card-caption {
  padding: 8px 10px;
  color: #fff;
  font-size: 12px;
  border-top: 1px solid var(--border);
  word-break: break-word;
}

.caption-empty {
  color: var(--text-dim);
}

.note-title {
  padding: 10px 10px 0;
  color: #fff;
  font-size: 14px;
  font-weight: bold;
}

.note-body {
  padding: 6px 10px 10px;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-word;
}

.card-toolbar {
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
  align-items: center;
}

.viewer {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.viewer img {
  max-width: 92vw;
  max-height: 85vh;
}

.viewer-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 28px;
  color: #fff;
  background: none;
  border: none;
  cursor: pointer;
  padding: 16px;
}

.viewer-prev {
  left: 12px;
}

.viewer-next {
  right: 12px;
}

.viewer-close {
  position: absolute;
  top: 12px;
  right: 16px;
  font-size: 22px;
  color: #fff;
  background: none;
  border: none;
  cursor: pointer;
}

.viewer-caption {
  position: absolute;
  bottom: 18px;
  color: var(--text);
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 14px;
  border-radius: 3px;
}

.viewer-loading {
  color: var(--text-dim);
  font-size: 15px;
}

.customize-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 60px;
  z-index: 50;
}

.customize-panel {
  width: 480px;
  max-width: 92vw;
  background: var(--panel);
  border: 1px solid var(--accent);
  border-radius: 4px;
  padding: 16px;
  max-height: 80vh;
  overflow-y: auto;
}

.customize-panel h2 {
  font-size: 16px;
  font-weight: normal;
  color: #fff;
  margin: 0 0 12px;
}

.customize-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 10px 0;
  flex-wrap: wrap;
}

.preset-swatches {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-swatch {
  width: 48px;
  height: 28px;
  border: 2px solid transparent;
  border-radius: 3px;
  cursor: pointer;
}

.preset-swatch.selected {
  border-color: #fff;
}

.backup-row {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #3d2b2b;
  border: 1px solid var(--danger);
  color: #ffd0d0;
  padding: 8px 16px;
  border-radius: 3px;
  z-index: 200;
}

.toast.toast-success {
  background: #22301f;
  border-color: #a4d007;
  color: #d3eab0;
}

.display-name-input {
  font-size: 22px;
  width: 100%;
}
```

- [ ] **Step 4: Replace `src/App.jsx` with the shell**

```jsx
import { useEffect, useState } from 'react'
import { loadState, saveState } from './lib/storage'
import { BACKGROUND_PRESETS } from './lib/presets'
import useIdbImage from './lib/useIdbImage'

export default function App() {
  const [state, setState] = useState(loadState)
  const bgIdbUrl = useIdbImage(state.theme.background.type === 'idb' ? state.theme.background.value : null)

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', state.theme.accent)
  }, [state.theme.accent])

  const bg = state.theme.background
  let backgroundStyle = { background: BACKGROUND_PRESETS['steam-dark'] }
  if (bg.type === 'preset') {
    backgroundStyle = { background: BACKGROUND_PRESETS[bg.value] ?? BACKGROUND_PRESETS['steam-dark'] }
  } else if (bg.type === 'color') {
    backgroundStyle = { background: bg.value }
  } else if (bg.type === 'url' && bg.value) {
    backgroundStyle = { backgroundImage: `url("${bg.value}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
  } else if (bg.type === 'idb' && bgIdbUrl) {
    backgroundStyle = { backgroundImage: `url("${bgIdbUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
  }

  return (
    <>
      <div className="page-background" style={backgroundStyle} />
      <div className="app">Shell ready</div>
    </>
  )
}
```

- [ ] **Step 5: Verify in browser**

Run: `npm run dev` (background), open `http://localhost:5173` with Playwright MCP. Verify: dark Steam background gradient fills the page, no console errors. Take a screenshot for reference. Stop server.

- [ ] **Step 6: Commit**

```bash
git add src/styles/steam.css src/App.jsx src/lib/presets.js src/lib/useIdbImage.js && git commit -m "feat: steam theme, background layer, accent CSS variable"
```

---

### Task 5: Profile header + level badge + edit mode

**Files:**
- Create: `src/components/ProfileHeader.jsx`, `src/components/LevelBadge.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `useIdbImage`, `putBlob` (Tasks 2, 4), `levelProgress` (Task 3), state shape (Task 1)
- Produces: `App` gains `editMode` state and props contract used by all later components:
  - `onProfileChange(patch: Partial<profile>)` — shallow-merges into `state.profile`
  - `onToggleEdit()`, `onOpenCustomize()`
  - `LevelBadge({ xp: number })`

- [ ] **Step 1: Create `src/components/LevelBadge.jsx`**

```jsx
import { levelProgress } from '../lib/xp'

export default function LevelBadge({ xp }) {
  const p = levelProgress(xp)
  return (
    <div className="level-badge-row" title={`${p.intoLevel} / ${p.needed} XP into level ${p.level}`}>
      <span className="level-badge">Level {p.level}</span>
      <div className="xp-bar">
        <div className="xp-bar-fill" style={{ width: `${p.pct}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/ProfileHeader.jsx`**

```jsx
import useIdbImage from '../lib/useIdbImage'
import { putBlob } from '../lib/idb'
import LevelBadge from './LevelBadge'

export default function ProfileHeader({ profile, xp, editMode, onProfileChange, onToggleEdit, onOpenCustomize, onNotify }) {
  const avatarUrl = useIdbImage(profile.avatar.type === 'idb' ? profile.avatar.value : null)
  const avatarSrc = profile.avatar.type === 'url' && profile.avatar.value ? profile.avatar.value : avatarUrl

  async function handleAvatarFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await putBlob('avatar', file)
      onProfileChange({ avatar: { type: 'idb', value: 'avatar' } })
    } catch {
      onNotify('Could not store avatar — browser storage may be full or blocked.')
    }
  }

  return (
    <header className="profile-header">
      <div className="avatar-column">
        <div className="avatar-frame">
          {avatarSrc ? (
            <img src={avatarSrc} alt="avatar" />
          ) : (
            <div className="avatar-empty">No Avatar</div>
          )}
        </div>
        {editMode && (
          <div className="card-toolbar">
            <label className="btn btn-sm">
              Upload avatar
              <input type="file" accept="image/*" hidden onChange={handleAvatarFile} />
            </label>
          </div>
        )}
      </div>
      <div className="profile-info">
        {editMode ? (
          <input
            className="display-name-input"
            value={profile.displayName}
            onChange={(e) => onProfileChange({ displayName: e.target.value })}
          />
        ) : (
          <h1 className="display-name">{profile.displayName}</h1>
        )}
        <div className="status-line">
          {editMode ? (
            <>
              <input
                placeholder="Status"
                value={profile.status.text}
                onChange={(e) => onProfileChange({ status: { ...profile.status, text: e.target.value } })}
                style={{ width: 140 }}
              />
              <input
                type="color"
                value={profile.status.color}
                onChange={(e) => onProfileChange({ status: { ...profile.status, color: e.target.value } })}
                style={{ width: 34, padding: 2 }}
                title="Status color"
              />
            </>
          ) : (
            <span style={{ color: profile.status.color }}>{profile.status.text}</span>
          )}
        </div>
        <LevelBadge xp={xp} />
        <div className="profile-fields">
          {editMode ? (
            <>
              <input
                placeholder="Real name"
                value={profile.realName}
                onChange={(e) => onProfileChange({ realName: e.target.value })}
                style={{ width: '100%', marginBottom: 6 }}
              />
              <input
                placeholder="Location"
                value={profile.location}
                onChange={(e) => onProfileChange({ location: e.target.value })}
                style={{ width: '100%' }}
              />
            </>
          ) : (
            <>
              {profile.realName && <div className="field">{profile.realName}</div>}
              {profile.location && <div className="field">{profile.location}</div>}
            </>
          )}
        </div>
        <div className="summary-box">
          {editMode ? (
            <textarea
              rows={3}
              placeholder="Write your summary..."
              value={profile.summary}
              onChange={(e) => onProfileChange({ summary: e.target.value })}
              style={{ width: '100%' }}
            />
          ) : (
            profile.summary || <span style={{ color: 'var(--text-dim)' }}>No information given.</span>
          )}
        </div>
        <div className="header-actions">
          <button className={`btn ${editMode ? 'btn-edit-active' : ''}`} onClick={onToggleEdit}>
            {editMode ? 'Done Editing' : 'Edit Profile'}
          </button>
          <button className="btn" onClick={onOpenCustomize}>
            Customize
          </button>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Update `src/App.jsx`**

Add import at top:
```jsx
import { useState as _unused } from 'react'
```
Do NOT add that line — instead add to the existing react import block:
```jsx
import ProfileHeader from './components/ProfileHeader'
```
Add state and notify helper inside `App`:
```jsx
const [editMode, setEditMode] = useState(false)
const [toast, setToast] = useState(null)

function notify(message, kind) {
  setToast({ message, kind })
  window.clearTimeout(notify.timer)
  notify.timer = window.setTimeout(() => setToast(null), 4000)
}
```
Replace `<div className="app">Shell ready</div>` content with:
```jsx
<div className="app">
  <ProfileHeader
    profile={state.profile}
    xp={state.xp}
    editMode={editMode}
    onProfileChange={(patch) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }))}
    onToggleEdit={() => setEditMode((v) => !v)}
    onOpenCustomize={() => {}}
    onNotify={(m) => notify(m)}
  />
</div>
```

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`, open in Playwright MCP. Verify:
1. Header shows avatar placeholder, "New User", green status "Online", Level 1 badge with empty XP bar
2. Click "Edit Profile" → inputs appear for name, status, real name, location, summary, avatar upload button
3. Change display name → click "Done Editing" → new name shows
4. Reload page → edited name persists

- [ ] **Step 5: Commit**

```bash
git add src/components/ProfileHeader.jsx src/components/LevelBadge.jsx src/App.jsx && git commit -m "feat: profile header with inline editing and level badge"
```

---

### Task 6: Customize panel (theme + background editing)

**Files:**
- Create: `src/components/CustomizePanel.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `BACKGROUND_PRESETS` (Task 4), `putBlob` (Task 2), `useIdbImage` (Task 4)
- Produces: `onThemeChange(patch: Partial<theme>)` shallow-merges into `state.theme`; background blob key is always `'background'`

- [ ] **Step 1: Create `src/components/CustomizePanel.jsx`**

```jsx
import { useState } from 'react'
import { BACKGROUND_PRESETS } from '../lib/presets'
import useIdbImage from '../lib/useIdbImage'
import { putBlob } from '../lib/idb'

export default function CustomizePanel({ theme, onThemeChange, onClose, onNotify }) {
  const bgUrl = useIdbImage(theme.background.type === 'idb' ? theme.background.value : null)
  const [urlInput, setUrlInput] = useState('')

  async function handleBgFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await putBlob('background', file)
      onThemeChange({ background: { type: 'idb', value: 'background' } })
    } catch {
      onNotify('Could not store background image — browser storage may be full or blocked.')
    }
  }

  function applyUrl() {
    if (!urlInput.trim()) return
    onThemeChange({ background: { type: 'url', value: urlInput.trim() } })
  }

  return (
    <div className="customize-overlay" onClick={onClose}>
      <div className="customize-panel" onClick={(e) => e.stopPropagation()}>
        <h2>Customize Dashboard</h2>
        <div className="customize-row">
          <span>Accent color</span>
          <input
            type="color"
            value={theme.accent}
            onChange={(e) => onThemeChange({ accent: e.target.value })}
            title="Accent color"
          />
        </div>
        <div className="customize-row">
          <span>Background presets</span>
          <div className="preset-swatches">
            {Object.entries(BACKGROUND_PRESETS).map(([id, css]) => (
              <div
                key={id}
                className={`preset-swatch ${theme.background.type === 'preset' && theme.background.value === id ? 'selected' : ''}`}
                style={{ background: css }}
                title={id}
                onClick={() => onThemeChange({ background: { type: 'preset', value: id } })}
              />
            ))}
          </div>
        </div>
        <div className="customize-row">
          <span>Solid color</span>
          <input
            type="color"
            value={theme.background.type === 'color' ? theme.background.value : '#1b2838'}
            onChange={(e) => onThemeChange({ background: { type: 'color', value: e.target.value } })}
            title="Solid background color"
          />
        </div>
        <div className="customize-row">
          <span>Background image upload</span>
          <label className="btn btn-sm">
            Upload
            <input type="file" accept="image/*" hidden onChange={handleBgFile} />
          </label>
        </div>
        <div className="customize-row">
          <span>Background image URL</span>
          <span style={{ display: 'flex', gap: 6 }}>
            <input
              placeholder="https://..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              style={{ width: 220 }}
            />
            <button className="btn btn-sm" onClick={applyUrl}>
              Apply
            </button>
          </span>
        </div>
        {theme.background.type === 'url' && bgUrl === undefined && null}
        <div className="customize-row">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
```

Note: the line `{theme.background.type === 'url' && bgUrl === undefined && null}` is dead code — remove it before saving; the `useIdbImage` call must stay because hooks cannot be conditional, but its result is unused. Replace the `const bgUrl = ...` line with:
```jsx
useIdbImage(theme.background.type === 'idb' ? theme.background.value : null)
```

- [ ] **Step 2: Update `src/App.jsx`**

Add import:
```jsx
import CustomizePanel from './components/CustomizePanel'
```
Add state (next to editMode):
```jsx
const [customizeOpen, setCustomizeOpen] = useState(false)
```
Wire the header button (replace `onOpenCustomize={() => {}}`):
```jsx
onOpenCustomize={() => setCustomizeOpen(true)}
```
Render before the closing `</>` (after the `.app` div):
```jsx
{customizeOpen && (
  <CustomizePanel
    theme={state.theme}
    onThemeChange={(patch) => setState((s) => ({ ...s, theme: { ...s.theme, ...patch } }))}
    onClose={() => setCustomizeOpen(false)}
    onNotify={(m) => notify(m)}
  />
)}
```

- [ ] **Step 3: Verify in browser**

`npm run dev` + Playwright MCP. Verify:
1. "Customize" opens the panel; clicking the dark overlay closes it
2. Changing accent color recolors buttons/badge immediately (CSS var)
3. Clicking each preset swatch changes the page background
4. Pasting an image URL + Apply sets it as full-page background
5. Reload — theme changes persist

- [ ] **Step 4: Commit**

```bash
git add src/components/CustomizePanel.jsx src/App.jsx && git commit -m "feat: customize panel for accent color and background"
```

---

### Task 7: Card grid — showcase cards, text notes, drag-and-drop (TDD for reorder logic)

**Files:**
- Create: `src/lib/cards.js`, `src/lib/cards.test.js`, `src/components/CardGrid.jsx`, `src/components/ShowcaseCard.jsx`, `src/components/TextNoteCard.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `useIdbImage`, `putBlob` (Tasks 2, 4), `awardXp`, `XP_PER_NOTE`, `XP_PER_IMAGE` (Task 3)
- Produces:
  - `reorderCards(cards: Card[], fromId: string, toId: string): Card[]` (pure)
  - Card shapes: showcase `{id, type:'showcase', image: {type:'url'|'idb', value} | null, caption: string}`, note `{id, type:'note', title: string, body: string}`
  - `App` handlers consumed by `CardGrid`: `onCardsChange(cards)`, `onAddCard(type)`, `onUpdateCard(id, patch)`, `onDeleteCard(id)`, `onImageAttached()`, `onOpenViewer(cardId)`

- [ ] **Step 1: Write the failing test for reorder**

`src/lib/cards.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { reorderCards } from './cards'

const cards = [
  { id: 'a', type: 'note', title: 'A', body: '' },
  { id: 'b', type: 'note', title: 'B', body: '' },
  { id: 'c', type: 'note', title: 'C', body: '' },
]

describe('reorderCards', () => {
  it('moves a card to a new position', () => {
    expect(reorderCards(cards, 'a', 'c').map((x) => x.id)).toEqual(['b', 'c', 'a'])
  })

  it('handles unknown ids by returning the same array contents', () => {
    expect(reorderCards(cards, 'zzz', 'a').map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate the input', () => {
    reorderCards(cards, 'a', 'c')
    expect(cards.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/cards.test.js`
Expected: FAIL — cannot resolve `./cards`

- [ ] **Step 3: Write `src/lib/cards.js`**

```js
export function reorderCards(cards, fromId, toId) {
  const from = cards.findIndex((c) => c.id === fromId)
  const to = cards.findIndex((c) => c.id === toId)
  if (from === -1 || to === -1 || from === to) return cards
  const next = [...cards]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/cards.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Create `src/components/ShowcaseCard.jsx`**

```jsx
import { useState } from 'react'
import useIdbImage from '../lib/useIdbImage'
import { putBlob } from '../lib/idb'

export default function ShowcaseCard({ card, editMode, onChange, onDelete, onImageAttached, onOpenViewer, onNotify, dnd }) {
  const idbUrl = useIdbImage(card.image?.type === 'idb' ? card.image.value : null)
  const imageUrl = card.image?.type === 'url' ? card.image.value : idbUrl
  const [urlInput, setUrlInput] = useState('')
  const [failed, setFailed] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const key = `img-${card.id}`
    try {
      await putBlob(key, file)
      const hadNoImage = !card.image
      onChange({ image: { type: 'idb', value: key } })
      setFailed(false)
      if (hadNoImage) onImageAttached()
    } catch {
      onNotify('Could not store image — browser storage may be full or blocked.')
    }
  }

  function applyUrl() {
    if (!urlInput.trim()) return
    const hadNoImage = !card.image
    onChange({ image: { type: 'url', value: urlInput.trim() } })
    setFailed(false)
    setUrlInput('')
    if (hadNoImage) onImageAttached()
  }

  function removeImage() {
    onChange({ image: null })
    setFailed(false)
  }

  return (
    <div
      className={`card ${dnd.dragOver ? 'drag-over' : ''}`}
      draggable={dnd.draggable}
      onDragStart={dnd.onDragStart}
      onDragOver={dnd.onDragOver}
      onDrop={dnd.onDrop}
      onDragEnd={dnd.onDragEnd}
    >
      {imageUrl && !failed ? (
        <img
          className="card-image"
          src={imageUrl}
          alt={card.caption || 'showcase image'}
          onClick={() => !editMode && onOpenViewer()}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="card-image-placeholder">
          {failed ? 'Image failed to load' : card.image ? 'Loading…' : 'No image'}
        </div>
      )}
      <div className="card-caption">
        {editMode ? (
          <input
            placeholder="Caption"
            value={card.caption}
            onChange={(e) => onChange({ caption: e.target.value })}
            style={{ width: '100%' }}
          />
        ) : (
          card.caption || <span className="caption-empty">Untitled</span>
        )}
      </div>
      {editMode && (
        <div className="card-toolbar">
          <label className="btn btn-sm">
            Upload
            <input type="file" accept="image/*" hidden onChange={handleFile} />
          </label>
          <input
            placeholder="Image URL"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            style={{ flex: 1, minWidth: 80 }}
          />
          <button className="btn btn-sm" onClick={applyUrl}>
            Set
          </button>
          {card.image && (
            <button className="btn btn-sm btn-danger" onClick={removeImage}>
              Remove image
            </button>
          )}
          <button className="btn btn-sm btn-danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create `src/components/TextNoteCard.jsx`**

```jsx
export default function TextNoteCard({ card, editMode, onChange, onDelete, dnd }) {
  return (
    <div
      className={`card ${dnd.dragOver ? 'drag-over' : ''}`}
      draggable={dnd.draggable}
      onDragStart={dnd.onDragStart}
      onDragOver={dnd.onDragOver}
      onDrop={dnd.onDrop}
      onDragEnd={dnd.onDragEnd}
    >
      <div className="note-title">
        {editMode ? (
          <input
            placeholder="Title"
            value={card.title}
            onChange={(e) => onChange({ title: e.target.value })}
            style={{ width: '100%' }}
          />
        ) : (
          card.title || 'Untitled'
        )}
      </div>
      <div className="note-body">
        {editMode ? (
          <textarea
            rows={6}
            placeholder="Write your note..."
            value={card.body}
            onChange={(e) => onChange({ body: e.target.value })}
            style={{ width: '100%', resize: 'vertical' }}
          />
        ) : (
          card.body || <span style={{ color: 'var(--text-dim)' }}>Empty note.</span>
        )}
      </div>
      {editMode && (
        <div className="card-toolbar">
          <button className="btn btn-sm btn-danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Create `src/components/CardGrid.jsx`**

```jsx
import { useState } from 'react'
import { reorderCards } from '../lib/cards'
import ShowcaseCard from './ShowcaseCard'
import TextNoteCard from './TextNoteCard'

export default function CardGrid({ cards, editMode, onCardsChange, onAddCard, onUpdateCard, onDeleteCard, onOpenViewer, onNotify }) {
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)

  function dndProps(card) {
    return {
      draggable: editMode,
      onDragStart: () => setDragId(card.id),
      onDragOver: (e) => {
        e.preventDefault()
        if (overId !== card.id) setOverId(card.id)
      },
      onDrop: (e) => {
        e.preventDefault()
        if (dragId && dragId !== card.id) onCardsChange(reorderCards(cards, dragId, card.id))
        setDragId(null)
        setOverId(null)
      },
      onDragEnd: () => {
        setDragId(null)
        setOverId(null)
      },
    }
  }

  return (
    <section className="cards-section">
      {editMode && (
        <div className="add-row">
          <button className="btn" onClick={() => onAddCard('showcase')}>
            + Add Showcase
          </button>
          <button className="btn" onClick={() => onAddCard('note')}>
            + Add Note
          </button>
        </div>
      )}
      {cards.length === 0 && <div className="empty-hint">No showcases yet — enter edit mode to add one.</div>}
      <div className="cards-grid">
        {cards.map((card) =>
          card.type === 'showcase' ? (
            <ShowcaseCard
              key={card.id}
              card={card}
              editMode={editMode}
              onChange={(patch) => onUpdateCard(card.id, patch)}
              onDelete={() => onDeleteCard(card.id)}
              onImageAttached={() => onAddCard(null, card.id)}
              onOpenViewer={() => onOpenViewer(card.id)}
              onNotify={onNotify}
              dnd={dndProps(card)}
            />
          ) : (
            <TextNoteCard
              key={card.id}
              card={card}
              editMode={editMode}
              onChange={(patch) => onUpdateCard(card.id, patch)}
              onDelete={() => onDeleteCard(card.id)}
              dnd={dndProps(card)}
            />
          )
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 8: Update `src/App.jsx` — card handlers**

Add imports:
```jsx
import CardGrid from './components/CardGrid'
import { awardXp, XP_PER_NOTE, XP_PER_IMAGE } from './lib/xp'
import { deleteBlob } from './lib/idb'
```
Add handlers inside `App`:
```jsx
function addCard(type) {
  if (type === null) return
  const card =
    type === 'note'
      ? { id: crypto.randomUUID(), type: 'note', title: 'New Note', body: '' }
      : { id: crypto.randomUUID(), type: 'showcase', image: null, caption: '' }
  setState((s) => ({
    ...s,
    cards: [...s.cards, card],
    xp: type === 'note' ? awardXp(s.xp, XP_PER_NOTE) : s.xp,
  }))
}

function updateCard(id, patch) {
  setState((s) => ({ ...s, cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
}

function deleteCard(id) {
  const card = state.cards.find((c) => c.id === id)
  setState((s) => ({ ...s, cards: s.cards.filter((c) => c.id !== id) }))
  if (card?.image?.type === 'idb') {
    deleteBlob(card.image.value).catch(() => notify('Could not clean up the stored image file.'))
  }
}

function attachImage(cardId) {
  setState((s) => ({ ...s, xp: awardXp(s.xp, XP_PER_IMAGE) }))
}
```
Render after `<ProfileHeader ... />` inside `.app`:
```jsx
<CardGrid
  cards={state.cards}
  editMode={editMode}
  onCardsChange={(cards) => setState((s) => ({ ...s, cards }))}
  onAddCard={addCard}
  onUpdateCard={updateCard}
  onDeleteCard={deleteCard}
  onOpenViewer={() => {}}
  onImageAttached={attachImage}
  onNotify={(m) => notify(m)}
/>
```

- [ ] **Step 9: Run all tests**

Run: `npm test`
Expected: PASS (16 tests total)

- [ ] **Step 10: Verify in browser**

`npm run dev` + Playwright MCP. Verify:
1. Edit mode → "+ Add Note" creates a note card; typing title/body persists after reload
2. "+ Add Showcase" creates empty showcase; upload a small image file → image shows, level/XP increases by 25
3. Paste an image URL → Set → image renders; XP awarded only on first image
4. Drag one card onto another in edit mode → order changes; reload → order persists
5. Delete a card → it disappears
6. Add 2 notes → XP increases by 20 total, level bar reflects it

- [ ] **Step 11: Commit**

```bash
git add src/lib/cards.js src/lib/cards.test.js src/components/CardGrid.jsx src/components/ShowcaseCard.jsx src/components/TextNoteCard.jsx src/App.jsx && git commit -m "feat: showcase and note cards with drag-and-drop and XP"
```

---

### Task 8: Fullscreen image viewer

**Files:**
- Create: `src/components/ImageViewer.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `useIdbImage` (Task 4)
- Produces: `ImageViewer({ items: Array<{cardId, imageRef, caption}>, index: number, onClose(), onNavigate(dir: -1|1) })`

- [ ] **Step 1: Create `src/components/ImageViewer.jsx`**

```jsx
import { useEffect } from 'react'
import useIdbImage from '../lib/useIdbImage'

function ViewerImage({ item }) {
  const idbUrl = useIdbImage(item.imageRef?.type === 'idb' ? item.imageRef.value : null)
  const url = item.imageRef?.type === 'url' ? item.imageRef.value : idbUrl
  const [failed, setFailed] = useStateSafe(false)
  if (!url) return <div className="viewer-loading">Loading…</div>
  if (failed) return <div className="viewer-loading">Image failed to load</div>
  return <img src={url} alt={item.caption || 'image'} onError={() => setFailed(true)} />
}

function useStateSafe(initial) {
  const [value, setValue] = React.useState(initial)
  return [value, setValue]
}

export default function ImageViewer({ items, index, onClose, onNavigate }) {
  const item = items[index]

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onNavigate(-1)
      if (e.key === 'ArrowRight') onNavigate(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNavigate])

  if (!item) return null

  return (
    <div className="viewer" onClick={onClose}>
      <ViewerImage item={item} />
      {item.caption && <div className="viewer-caption">{item.caption}</div>}
      <button className="viewer-close" onClick={onClose}>
        ✕
      </button>
      <button
        className="viewer-nav viewer-prev"
        onClick={(e) => {
          e.stopPropagation()
          onNavigate(-1)
        }}
      >
        ❮
      </button>
      <button
        className="viewer-nav viewer-next"
        onClick={(e) => {
          e.stopPropagation()
          onNavigate(1)
        }}
      >
        ❯
      </button>
    </div>
  )
}
```

Fix before saving: the helper `useStateSafe` is contrived. Replace the top of the file with a direct React import so `ViewerImage` uses `useState`:
```jsx
import React, { useEffect, useState } from 'react'
```
and inside `ViewerImage`:
```jsx
const [failed, setFailed] = useState(false)
```
Delete the `useStateSafe` helper entirely.

- [ ] **Step 2: Update `src/App.jsx`**

Add imports:
```jsx
import ImageViewer from './components/ImageViewer'
```
Add state:
```jsx
const [viewerCardId, setViewerCardId] = useState(null)
```
Replace `onOpenViewer={() => {}}` in `CardGrid` with:
```jsx
onOpenViewer={(cardId) => setViewerCardId(cardId)}
```
Add derived data before `return`:
```jsx
const showcaseCards = state.cards.filter((c) => c.type === 'showcase' && c.image)
const viewerIndex = viewerCardId ? showcaseCards.findIndex((c) => c.id === viewerCardId) : -1
```
Render after the `CustomizePanel` block:
```jsx
{viewerIndex >= 0 && (
  <ImageViewer
    items={showcaseCards.map((c) => ({ cardId: c.id, imageRef: c.image, caption: c.caption }))}
    index={viewerIndex}
    onClose={() => setViewerCardId(null)}
    onNavigate={(dir) =>
      setViewerCardId((cur) => {
        const idx = showcaseCards.findIndex((c) => c.id === cur)
        const next = (idx + dir + showcaseCards.length) % showcaseCards.length
        return showcaseCards[next].id
      })
    }
  />
)}
```

- [ ] **Step 3: Verify in browser**

`npm run dev` + Playwright MCP. Verify:
1. With 2+ showcase images added, exit edit mode, click an image → fullscreen viewer opens
2. ❮ / ❯ buttons and ArrowLeft/ArrowRight keys cycle images; Escape and background click close it
3. Caption shows at the bottom

- [ ] **Step 4: Commit**

```bash
git add src/components/ImageViewer.jsx src/App.jsx && git commit -m "feat: fullscreen image viewer with prev/next"
```

---

### Task 9: Backup export/import + toast (TDD)

**Files:**
- Create: `src/lib/backup.js`, `src/lib/backup.test.js`, `src/components/BackupButtons.jsx`, `src/components/Toast.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `getBlob`, `putBlob`, `blobToDataUrl`, `dataUrlToBlob` (Task 2), `DEFAULT_STATE` shape (Task 1)
- Produces:
  - `buildBackup(state, getBlobFn = getBlob): Promise<{version: 1, exportedAt: string, state, images: {[key]: dataUrl}}>`
  - `restoreBackup(backup, putBlobFn = putBlob): Promise<state>` — throws `Error('Invalid backup file')` on bad input
  - `Toast({ toast: {message, kind} | null })`

- [ ] **Step 1: Write the failing test**

`src/lib/backup.test.js`:
```js
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { buildBackup, restoreBackup } from './backup'
import { putBlob, getBlob, deleteBlob, getAllBlobKeys } from './idb'
import { DEFAULT_STATE } from './storage'

const state = {
  ...JSON.parse(JSON.stringify(DEFAULT_STATE)),
  profile: { ...DEFAULT_STATE.profile, avatar: { type: 'idb', value: 'avatar' } },
  cards: [
    { id: 'c1', type: 'showcase', image: { type: 'idb', value: 'img-c1' }, caption: 'cap' },
    { id: 'c2', type: 'showcase', image: { type: 'url', value: 'https://example.com/x.gif' }, caption: 'url one' },
  ],
}

describe('backup', () => {
  beforeEach(async () => {
    for (const key of await getAllBlobKeys()) await deleteBlob(key)
    await putBlob('avatar', new Blob(['avatar-bytes'], { type: 'image/png' }))
    await putBlob('img-c1', new Blob(['gif-bytes'], { type: 'image/gif' }))
  })

  it('embeds stored images as data URLs and keeps state', async () => {
    const backup = await buildBackup(state)
    expect(backup.version).toBe(1)
    expect(backup.images['avatar']).toMatch(/^data:image\/png;base64,/)
    expect(backup.images['img-c1']).toMatch(/^data:image\/gif;base64,/)
    expect(backup.state.cards[1].image).toEqual({ type: 'url', value: 'https://example.com/x.gif' })
  })

  it('restores blobs into IndexedDB and returns state', async () => {
    const backup = await buildBackup(state)
    await deleteBlob('avatar')
    await deleteBlob('img-c1')
    expect(await getBlob('avatar')).toBeNull()
    const restored = await restoreBackup(backup)
    expect(restored.profile.displayName).toBe('New User')
    const avatar = await getBlob('avatar')
    expect(await avatar.text()).toBe('avatar-bytes')
  })

  it('rejects invalid backups without touching storage', async () => {
    await expect(restoreBackup(null)).rejects.toThrow('Invalid backup file')
    await expect(restoreBackup({ version: 2, state: {} })).rejects.toThrow('Invalid backup file')
    await expect(restoreBackup({ version: 1 })).rejects.toThrow('Invalid backup file')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/backup.test.js`
Expected: FAIL — cannot resolve `./backup`

- [ ] **Step 3: Write `src/lib/backup.js`**

```js
import { getBlob, putBlob, blobToDataUrl, dataUrlToBlob } from './idb'

function collectIdbRefs(state) {
  const refs = new Set()
  const add = (ref) => {
    if (ref?.type === 'idb' && ref.value) refs.add(ref.value)
  }
  add(state.profile?.avatar)
  add(state.theme?.background)
  for (const card of state.cards ?? []) {
    if (card.type === 'showcase') add(card.image)
  }
  return [...refs]
}

export async function buildBackup(state, getBlobFn = getBlob) {
  const images = {}
  for (const key of collectIdbRefs(state)) {
    const blob = await getBlobFn(key)
    if (blob) images[key] = await blobToDataUrl(blob)
  }
  return { version: 1, exportedAt: new Date().toISOString(), state, images }
}

export async function restoreBackup(backup, putBlobFn = putBlob) {
  if (!backup || backup.version !== 1 || !backup.state || typeof backup.state !== 'object') {
    throw new Error('Invalid backup file')
  }
  for (const [key, dataUrl] of Object.entries(backup.images ?? {})) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) continue
    await putBlobFn(key, dataUrlToBlob(dataUrl))
  }
  return backup.state
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/backup.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Create `src/components/Toast.jsx`**

```jsx
export default function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`toast ${toast.kind === 'success' ? 'toast-success' : ''}`} role="alert">
      {toast.message}
    </div>
  )
}
```

- [ ] **Step 6: Create `src/components/BackupButtons.jsx`**

```jsx
import { buildBackup, restoreBackup } from '../lib/backup'

export default function BackupButtons({ state, onRestore, onNotify }) {
  async function handleExport() {
    try {
      const backup = await buildBackup(state)
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'steam-dashboard-backup.json'
      a.click()
      URL.revokeObjectURL(url)
      onNotify('Backup exported.', 'success')
    } catch {
      onNotify('Export failed — could not read stored images.')
    }
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    file
      .text()
      .then((text) => JSON.parse(text))
      .then((backup) => restoreBackup(backup).then(onRestore))
      .then(() => onNotify('Backup restored.', 'success'))
      .catch(() => onNotify('Import failed — not a valid backup file.'))
    e.target.value = ''
  }

  return (
    <div className="backup-row">
      <button className="btn btn-sm" onClick={handleExport}>
        Export Backup
      </button>
      <label className="btn btn-sm">
        Import Backup
        <input type="file" accept="application/json,.json" hidden onChange={handleImportFile} />
      </label>
    </div>
  )
}
```

- [ ] **Step 7: Update `src/App.jsx`**

Add imports:
```jsx
import BackupButtons from './components/BackupButtons'
import Toast from './components/Toast'
```
Render inside `.app`, after `<ProfileHeader ... />`:
```jsx
<BackupButtons
  state={state}
  onRestore={(restored) => setState(restored)}
  onNotify={notify}
/>
```
Render `Toast` before the closing `</>`:
```jsx
<Toast toast={toast} />
```

- [ ] **Step 8: Run all tests**

Run: `npm test`
Expected: PASS (19 tests total)

- [ ] **Step 9: Verify in browser**

`npm run dev` + Playwright MCP. Verify:
1. "Export Backup" downloads `steam-dashboard-backup.json`; open the file — contains `version: 1` and embedded `data:` images
2. "Import Backup" with that file → success toast; with a junk text file → error toast, existing data intact
3. After import, reload → everything restored

- [ ] **Step 10: Commit**

```bash
git add src/lib/backup.js src/lib/backup.test.js src/components/BackupButtons.jsx src/components/Toast.jsx src/App.jsx && git commit -m "feat: export/import backup with embedded images and toast notifications"
```

---

### Task 10: Smoke test, build, final verification

**Files:**
- No new source files. Verifies the whole app end-to-end.

**Interfaces:**
- Consumes: everything
- Produces: verified app + production build in `dist/`

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: PASS (19 tests)

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: builds without errors to `dist/`

- [ ] **Step 3: Preview + Playwright smoke test**

Run: `npm run preview` (background), open `http://localhost:4173` with Playwright MCP. Script:
1. Clear site data (Playwright evaluate: `localStorage.clear(); indexedDB.deleteDatabase('steam-dashboard')`), reload
2. Verify default state renders (New User, Level 1, empty grid hint)
3. "Edit Profile" → change name → "+ Add Note" → type text → "Done Editing"
4. Reload → name and note persist
5. "Customize" → change accent color → pick preset → Close
6. Add showcase card, upload/URL an image, exit edit mode, click image → viewer prev/next works
7. Export backup → verify file downloaded
8. Check console for errors — must be empty

- [ ] **Step 4: Visual comparison against real Steam**

Open `https://steamcommunity.com/id/gaben` in a Playwright tab. Compare side-by-side (screenshot both): dark palette, 940px column, avatar-left header layout, showcase card proportions. Adjust CSS values in `steam.css` only if something is clearly off (colors, spacing), then re-verify locally.

- [ ] **Step 5: Final commit**

```bash
git add -A && git commit -m "chore: final polish after visual comparison with steam"
```
(If nothing changed, `git status` must be clean — an empty commit is not allowed; skip the commit.)

---

## Self-Review (completed)

1. **Spec coverage**: profile fields editable (T5), level+XP auto-grow (T3, T5, T7), theme customize incl. accent/background whole-page (T4, T6), showcase image/GIF cards upload+URL (T7), text notes (T7), drag-drop reorder (T7), viewer prev/next (T8), export/import backup (T9), IndexedDB+localStorage persistence (T1, T2), error handling via toast (T5, T7, T9), English UI (all). Edit mode toggle (T5). Gaps: none found.
2. **Placeholder scan**: two "fix before saving" notes exist in T6/T8 where the first-draft code contained a defect (dead line, contrived helper) — the corrected code is given inline; implementers must apply the fix while writing the file, not copy the defect.
3. **Type consistency**: `notify(message, kind?)` used consistently; `onImageAttached` wired via `attachImage` (App) — CardGrid calls `onAddCard(null, card.id)` for image-attached XP, which App's `addCard` ignores (`if (type === null) return`); the actual XP awarding happens through `onImageAttached={attachImage}`. Verified names: `reorderCards`, `buildBackup/restoreBackup`, `useIdbImage`, `putBlob/getBlob/deleteBlob` all match across tasks.
