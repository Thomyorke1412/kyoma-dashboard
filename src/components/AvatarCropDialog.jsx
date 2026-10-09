import { useCallback, useEffect, useRef, useState } from 'react'
import AvatarCropStage from './AvatarCropStage'
import useCropImage from '../lib/useCropImage'
import { renderCropToBlob, renderCropToCanvas } from '../lib/cropRender'
import {
  AVATAR_OUTPUT_SIZE,
  createCropState,
  outputRect,
  resizeFrame,
  rotateBy,
  sliderPercent,
  zoomFromSlider,
  zoomTo,
} from '../lib/crop'

const INITIAL_FRAME = 340

export default function AvatarCropDialog({ source, onSave, onCancel, onNotify }) {
  const { image, natural, error, loading, url } = useCropImage(source)
  const [state, setState] = useState(null)
  const previewRef = useRef(null)

  const handleFrameSize = useCallback((size) => {
    setState((current) => {
      if (!current || current.frameSize === size) return current
      return resizeFrame(current, size)
    })
  }, [])

  useEffect(() => {
    if (!natural || state) return
    setState(createCropState({ natural, frameSize: INITIAL_FRAME }))
  }, [natural, state])

  useEffect(() => {
    const canvas = previewRef.current
    if (!canvas || !image || !state) return
    try {
      renderCropToCanvas(canvas, image, outputRect(state))
    } catch {
      onNotify('This browser cannot draw the avatar preview.')
    }
  }, [image, state, onNotify])

  async function handleConfirm() {
    if (!image || !state) return
    try {
      onSave(await renderCropToBlob(image, outputRect(state)))
    } catch (failure) {
      onNotify(failure?.message ?? 'The avatar could not be saved.')
    }
  }

  const change = (next) => setState(next)
  const percent = state ? Math.round(sliderPercent(state.zoom)) : 0

  return (
    <div
      className="avatar-crop-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Crop avatar"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        onCancel()
      }}
    >
      <div className="avatar-crop-panel">
        <h2>Crop avatar</h2>
        <p id="avatar-crop-keys" className="avatar-crop-note">
          Drag to move, scroll or slide to zoom, arrow keys to nudge, Escape to cancel.
        </p>
        {loading && <p className="avatar-crop-note">Loading image...</p>}
        {error && (
          <>
            <p className="avatar-crop-error">{error}</p>
            <div className="avatar-crop-actions">
              <button className="btn" onClick={onCancel}>Cancel</button>
            </div>
          </>
        )}
        {state && (
          <>
            <div className="avatar-crop-body">
              <AvatarCropStage
                src={url}
                state={state}
                onChange={change}
                onFrameSize={handleFrameSize}
              />
              <div className="avatar-crop-side">
                <span className="avatar-crop-label">Preview</span>
                <canvas ref={previewRef} className="avatar-crop-preview" width={AVATAR_OUTPUT_SIZE} height={AVATAR_OUTPUT_SIZE} />
                <span className="avatar-crop-label">
                  {AVATAR_OUTPUT_SIZE} x {AVATAR_OUTPUT_SIZE}
                </span>
              </div>
            </div>
            <div className="avatar-crop-controls">
              <button className="btn btn-sm" onClick={() => change(rotateBy(state, -90))}>Rotate left</button>
              <button className="btn btn-sm" onClick={() => change(rotateBy(state, 90))}>Rotate right</button>
              <input
                className="avatar-crop-zoom"
                type="range"
                min={0}
                max={100}
                step={1}
                value={percent}
                aria-label="Zoom"
                onChange={(event) => {
                  const next = Number(event.target.value)
                  change((current) => zoomTo(current, zoomFromSlider(next)))
                }}
              />
              <span className="avatar-crop-zoom-value">{percent}%</span>
            </div>
            <div className="avatar-crop-actions">
              <button className="btn" onClick={onCancel}>Cancel</button>
              <button className="btn btn-edit-active" onClick={handleConfirm}>Save avatar</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
