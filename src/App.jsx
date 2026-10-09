import { useEffect, useRef, useState } from 'react'
import { loadState, saveState, mergeWithDefaults } from './lib/storage'
import { BACKGROUND_PRESETS } from './lib/presets'
import useIdbImage from './lib/useIdbImage'
import ProfileHeader from './components/ProfileHeader'
import CustomizePanel from './components/CustomizePanel'
import CardGrid from './components/CardGrid'
import ImageViewer from './components/ImageViewer'
import BackupButtons from './components/BackupButtons'
import Toast from './components/Toast'
import { awardXp, XP_PER_NOTE, XP_PER_IMAGE } from './lib/xp'
import { deleteBlob } from './lib/idb'

export default function App() {
  const [state, setState] = useState(loadState)
  const [editMode, setEditMode] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [viewerCardId, setViewerCardId] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  function notify(message, kind) {
    setToast({ message, kind })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 4000)
  }
  const bgIdbUrl = useIdbImage(state.theme.background.type === 'idb' ? state.theme.background.value : null)

  useEffect(() => {
    try {
      saveState(state)
    } catch {
      notify('Could not save — browser storage is full.')
    }
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

  function addCard(type) {
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

  const showcaseCards = state.cards.filter((c) => c.type === 'showcase' && c.image)
  const viewerIndex = viewerCardId ? showcaseCards.findIndex((c) => c.id === viewerCardId) : -1

  return (
    <>
      <div className="page-background" style={backgroundStyle} />
      <div className="app">
        <ProfileHeader
          profile={state.profile}
          xp={state.xp}
          editMode={editMode}
          onProfileChange={(patch) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }))}
          onToggleEdit={() => setEditMode((v) => !v)}
          onOpenCustomize={() => setCustomizeOpen(true)}
          onNotify={notify}
        />
        <BackupButtons
          state={state}
          onRestore={(restored) => setState(mergeWithDefaults(restored))}
          onNotify={notify}
        />
        <CardGrid
          cards={state.cards}
          editMode={editMode}
          onCardsChange={(cards) => setState((s) => ({ ...s, cards }))}
          onAddCard={addCard}
          onUpdateCard={updateCard}
          onDeleteCard={deleteCard}
          onOpenViewer={(cardId) => setViewerCardId(cardId)}
          onImageAttached={attachImage}
          onNotify={notify}
        />
      </div>
      {customizeOpen && (
        <CustomizePanel
          theme={state.theme}
          onThemeChange={(patch) => setState((s) => ({ ...s, theme: { ...s.theme, ...patch } }))}
          onClose={() => setCustomizeOpen(false)}
          onNotify={notify}
        />
      )}
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
      <Toast toast={toast} />
    </>
  )
}
