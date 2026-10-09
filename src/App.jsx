import { useEffect, useState } from 'react'
import { loadState, saveState } from './lib/storage'
import { BACKGROUND_PRESETS } from './lib/presets'
import useIdbImage from './lib/useIdbImage'
import ProfileHeader from './components/ProfileHeader'

export default function App() {
  const [state, setState] = useState(loadState)
  const [editMode, setEditMode] = useState(false)
  const [toast, setToast] = useState(null)

  function notify(message, kind) {
    setToast({ message, kind })
    window.clearTimeout(notify.timer)
    notify.timer = window.setTimeout(() => setToast(null), 4000)
  }
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
    </>
  )
}
