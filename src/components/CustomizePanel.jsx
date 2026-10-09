import { useState } from 'react'
import { BACKGROUND_PRESETS } from '../lib/presets'
import { putBlob } from '../lib/idb'
import useIdbImage from '../lib/useIdbImage'
import BackgroundStage from './BackgroundStage'
import { DEFAULT_ADJUST, clampAdjust, rotateAdjustBy } from '../lib/backgroundAdjust'

const SLIDERS = [
  ['blur', 'Blur', 0, 24, 1, (v) => `${v}px`],
  ['opacity', 'Opacity', 0, 1, 0.01, 'pct'],
  ['brightness', 'Brightness', 0, 2, 0.05, 'pct'],
  ['saturation', 'Saturation', 0, 2, 0.05, 'pct'],
  ['grayscale', 'Grayscale', 0, 1, 0.05, 'pct'],
  ['dim', 'Dim', 0, 0.8, 0.05, 'pct'],
]

function readout(kind, value) {
  return kind === 'pct' ? `${Math.round(value * 100)}%` : `${value}px`
}

export default function CustomizePanel({ theme, onThemeChange, onClose, onNotify }) {
  const [urlInput, setUrlInput] = useState('')
  const background = theme.background
  const imageBackground = background.type === 'idb' || background.type === 'url'
  const adjust = background.adjust
  const stageIdbUrl = useIdbImage(background.type === 'idb' ? background.value : null)
  const stageSrc = background.type === 'idb' ? stageIdbUrl : background.value

  function updateAdjust(updater) {
    onThemeChange({ background: { ...background, adjust: clampAdjust(updater(background.adjust)) } })
  }

  async function handleBgFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await putBlob('background', file)
      onThemeChange({ background: { type: 'idb', value: 'background', adjust: { ...DEFAULT_ADJUST } } })
    } catch {
      onNotify('Could not store background image — browser storage may be full or blocked.')
    }
    e.target.value = ''
  }

  function applyUrl() {
    if (!urlInput.trim()) return
    onThemeChange({ background: { type: 'url', value: urlInput.trim(), adjust: { ...DEFAULT_ADJUST } } })
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
                className={`preset-swatch ${background.type === 'preset' && background.value === id ? 'selected' : ''}`}
                style={{ background: css }}
                title={id}
                onClick={() => onThemeChange({ background: { type: 'preset', value: id, adjust: { ...DEFAULT_ADJUST } } })}
              />
            ))}
          </div>
        </div>
        <div className="customize-row">
          <span>Solid color</span>
          <input
            type="color"
            value={background.type === 'color' ? background.value : '#1b2838'}
            onChange={(e) => onThemeChange({ background: { type: 'color', value: e.target.value, adjust: { ...DEFAULT_ADJUST } } })}
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
        {imageBackground && (
          <>
            <h3 className="customize-heading">Image adjustments</h3>
            <div className="customize-row">
              <BackgroundStage src={stageSrc} adjust={adjust} onChange={updateAdjust} />
            </div>
            <div className="customize-row">
              <span>Rotate & zoom</span>
              <span className="bg-slider-group">
                <button className="btn btn-sm" onClick={() => updateAdjust((a) => rotateAdjustBy(a, -90))}>
                  Rotate left
                </button>
                <button className="btn btn-sm" onClick={() => updateAdjust((a) => rotateAdjustBy(a, 90))}>
                  Rotate right
                </button>
                <span className="bg-readout">{`${adjust.zoom.toFixed(2)}×`}</span>
              </span>
            </div>
            {SLIDERS.map(([key, label, min, max, step, kind]) => (
              <div className="customize-row" key={key}>
                <span>{label}</span>
                <span className="bg-slider-group">
                  <input
                    type="range"
                    className="bg-slider"
                    aria-label={label}
                    min={min}
                    max={max}
                    step={step}
                    value={adjust[key]}
                    onChange={(e) => updateAdjust((a) => ({ ...a, [key]: parseFloat(e.target.value) }))}
                  />
                  <span className="bg-readout">{readout(kind, adjust[key])}</span>
                </span>
              </div>
            ))}
            <div className="customize-row">
              <span>Adjustments</span>
              <button className="btn btn-sm" onClick={() => updateAdjust(() => ({ ...DEFAULT_ADJUST }))}>
                Reset All
              </button>
            </div>
          </>
        )}
        <div className="customize-row">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
