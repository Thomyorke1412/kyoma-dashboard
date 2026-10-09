import { useEffect, useRef } from 'react'
import { arrowNudge } from '../lib/crop'
import { backgroundDimStyle, backgroundLayerStyle, dragAdjustBy, zoomAdjustBy } from '../lib/backgroundAdjust'

export default function BackgroundStage({ src, adjust, onChange }) {
  const frameRef = useRef(null)
  const dragRef = useRef(null)
  const naturalRef = useRef(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  function handleLoad(event) {
    naturalRef.current = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }
  }

  useEffect(() => {
    const element = frameRef.current
    if (!element) return
    const onWheel = (event) => {
      event.preventDefault()
      onChangeRef.current((current) => zoomAdjustBy(current, event.deltaY))
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [])

  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const element = event.currentTarget
    element.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      frame: { width: element.clientWidth, height: element.clientHeight },
    }
    element.focus()
  }

  function handlePointerMove(event) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY }
    onChange((current) => dragAdjustBy(current, dx, dy, drag.frame, naturalRef.current))
  }

  function endDrag(event) {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function handleKeyDown(event) {
    const step = arrowNudge(event.key, event.shiftKey)
    if (!step) return
    event.preventDefault()
    const element = event.currentTarget
    const frame = { width: element.clientWidth, height: element.clientHeight }
    onChange((current) => dragAdjustBy(current, step.x, step.y, frame, naturalRef.current))
  }

  return (
    <div
      className="bg-stage"
      ref={frameRef}
      tabIndex={0}
      role="application"
      aria-label="Background preview. Drag to move, scroll to zoom, arrow keys to nudge."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
    >
      {src && (
        <img
          className="bg-layer"
          src={src}
          alt=""
          draggable={false}
          onLoad={handleLoad}
          style={backgroundLayerStyle(adjust)}
        />
      )}
      <div className="bg-dim" style={backgroundDimStyle(adjust)} />
      <span className="bg-stage-hint">Drag · Scroll to zoom · Arrow keys to nudge</span>
    </div>
  )
}
