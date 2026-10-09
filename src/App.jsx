import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { loadState, saveState, mergeWithDefaults } from './lib/storage'
import { BACKGROUND_PRESETS } from './lib/presets'
import { backgroundDimStyle, backgroundLayerStyle } from './lib/backgroundAdjust'
import useIdbImage from './lib/useIdbImage'
import ProfileHeader from './components/ProfileHeader'
import CustomizePanel from './components/CustomizePanel'
import CardGrid from './components/CardGrid'
import ImageViewer from './components/ImageViewer'
import BackupButtons from './components/BackupButtons'
import Toast from './components/Toast'
import { awardXp, XP_PER_NOTE, XP_PER_IMAGE } from './lib/xp'
import { deleteBlob } from './lib/idb'
import { filterCards } from './lib/cards'
import { buildRows, resolveViewer, wrapIndex } from './lib/gallery'

const PER_ROW = 3

const DashboardContent = memo(function DashboardContent({ profile, xp, cards, setState, toast, onOpenCustomize, onNotify, onRestore, getState }) {
  const [editMode, setEditMode] = useState(false)
  const [viewer, setViewer] = useState(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef(null)

  function handleProfileChange(patch) {
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }))
  }

  function addCard(type) {
    setState((s) => ({
      ...s,
      cards: [
        ...s.cards,
        type === 'note'
          ? { id: crypto.randomUUID(), type: 'note', title: 'New Note', body: '' }
          : { id: crypto.randomUUID(), type: 'showcase', image: null, caption: '' },
      ],
      xp: type === 'note' ? awardXp(s.xp, XP_PER_NOTE) : s.xp,
    }))
  }

  function updateCard(id, patch) {
    setState((s) => ({ ...s, cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
  }

  function deleteCard(id) {
    const card = cards.find((c) => c.id === id)
    setState((s) => ({ ...s, cards: s.cards.filter((c) => c.id !== id) }))
    if (card?.image?.type === 'idb') {
      deleteBlob(card.image.value).catch(() => onNotify('Could not clean up the stored image file.'))
    }
  }

  function attachImage() {
    setState((s) => ({ ...s, xp: awardXp(s.xp, XP_PER_IMAGE) }))
  }

  const visibleCards = filterCards(cards, filterQuery)
  const galleryRows = buildRows(visibleCards, PER_ROW)
  const cardsById = new Map(cards.map((c) => [c.id, c]))
  const { items: viewerItems, index: viewerIndex, cardId: resolvedViewerCardId } = resolveViewer(
    galleryRows,
    cardsById,
    viewer?.rowId ?? null,
    viewer?.cardId ?? null,
  )
  const viewerRowActive = viewer !== null && viewerIndex >= 0

  useEffect(() => {
    if (filterOpen && filterRef.current) filterRef.current.focus()
  }, [filterOpen])

  useEffect(() => {
    if (!viewer) return
    if (!viewerRowActive) setViewer(null)
    else if (viewer.cardId !== resolvedViewerCardId) setViewer({ ...viewer, cardId: resolvedViewerCardId })
  }, [viewer, viewerRowActive, resolvedViewerCardId])

  function openRow(rowId, cardId) {
    const row = rowId ? galleryRows.find((r) => r.id === rowId) : galleryRows.find((r) => r.cardIds.includes(cardId))
    if (row) setViewer({ rowId: row.id, cardId })
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.repeat) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (viewer) return

      if (e.key === 'Escape') {
        setFilterQuery('')
        setFilterOpen(false)
        return
      }

      const target = e.target
      const typing =
        target instanceof HTMLElement &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      if (typing) return

      if (e.key === 'e' || e.key === 'E') {
        setEditMode((v) => !v)
      } else if (e.key === '/') {
        e.preventDefault()
        setFilterOpen(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [viewer])

  return (
    <div className="app">
      <ProfileHeader
        profile={profile}
        xp={xp}
        editMode={editMode}
        onProfileChange={handleProfileChange}
        onToggleEdit={() => setEditMode((v) => !v)}
        onOpenCustomize={onOpenCustomize}
        onNotify={onNotify}
      />
      <BackupButtons getState={getState} onRestore={onRestore} onNotify={onNotify} />
      <CardGrid
        cards={cards}
        visibleCards={visibleCards}
        galleryRows={galleryRows}
        editMode={editMode}
        query={filterQuery}
        onQueryChange={setFilterQuery}
        filterOpen={filterOpen || editMode || filterQuery !== ''}
        onOpenFilter={() => setFilterOpen(true)}
        filterRef={filterRef}
        onCardsChange={(next) => setState((s) => ({ ...s, cards: next }))}
        onAddCard={addCard}
        onUpdateCard={updateCard}
        onDeleteCard={deleteCard}
        onImageAttached={attachImage}
        onOpenRow={openRow}
        onNotify={onNotify}
      />
      {viewerIndex >= 0 && (
        <ImageViewer
          items={viewerItems.map((c) => ({ cardId: c.id, imageRef: c.image, caption: c.caption }))}
          index={viewerIndex}
          onClose={() => setViewer(null)}
          onNavigate={(dir) => {
            const next = wrapIndex(viewerIndex, dir, viewerItems.length)
            if (next < 0) return
            setViewer((cur) => (cur ? { ...cur, cardId: viewerItems[next].id } : cur))
          }}
        />
      )}
      <Toast toast={toast} />
    </div>
  )
})

export default function App() {
  const [state, setState] = useState(loadState)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const notify = useCallback((message, kind) => {
    setToast({ message, kind })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 4000)
  }, [])

  const bgIdbUrl = useIdbImage(state.theme.background.type === 'idb' ? state.theme.background.value : null)

  useEffect(() => {
    try {
      saveState(state)
    } catch {
      notify('Could not save — browser storage is full.')
    }
  }, [state, notify])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', state.theme.accent)
  }, [state.theme.accent])

  const bg = state.theme.background
  let backgroundStyle = { background: BACKGROUND_PRESETS['steam-dark'] }
  if (bg.type === 'preset') {
    backgroundStyle = { background: BACKGROUND_PRESETS[bg.value] ?? BACKGROUND_PRESETS['steam-dark'] }
  } else if (bg.type === 'color') {
    backgroundStyle = { background: bg.value }
  }
  const bgImageUrl = bg.type === 'idb' ? bgIdbUrl : bg.type === 'url' ? bg.value : null

  const handleThemeChange = useCallback((patch) => {
    setState((s) => ({ ...s, theme: { ...s.theme, ...patch } }))
  }, [])
  const openCustomize = useCallback(() => setCustomizeOpen(true), [])
  const closeCustomize = useCallback(() => setCustomizeOpen(false), [])
  const getState = useCallback(() => stateRef.current, [])
  const handleRestore = useCallback((restored) => setState(mergeWithDefaults(restored)), [])

  return (
    <>
      <div className="page-background" style={backgroundStyle}>
        {bgImageUrl && (
          <>
            <img className="bg-layer" src={bgImageUrl} alt="" draggable={false} style={backgroundLayerStyle(bg.adjust)} />
            <div className="bg-dim" style={backgroundDimStyle(bg.adjust)} />
          </>
        )}
      </div>
      <DashboardContent
        profile={state.profile}
        xp={state.xp}
        cards={state.cards}
        setState={setState}
        toast={toast}
        onOpenCustomize={openCustomize}
        onNotify={notify}
        onRestore={handleRestore}
        getState={getState}
      />
      {customizeOpen && (
        <CustomizePanel
          theme={state.theme}
          onThemeChange={handleThemeChange}
          onClose={closeCustomize}
          onNotify={notify}
        />
      )}
    </>
  )
}
