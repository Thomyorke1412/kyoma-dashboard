import { useState } from 'react'
import { BACKGROUND_PRESETS } from '../lib/presets'
import { putBlob } from '../lib/idb'

export default function CustomizePanel({ theme, onThemeChange, onClose, onNotify }) {
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
    e.target.value = ''
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
        <div className="customize-row">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
