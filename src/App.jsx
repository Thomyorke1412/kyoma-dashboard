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
