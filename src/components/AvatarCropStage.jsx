import { useCallback, useEffect, useRef } from 'react'
import { arrowNudge, cropImageStyle, dragBy, dragDelta, wheelZoomFactor, zoomBy } from '../lib/crop'

export default function AvatarCropStage({ src, state, onChange, onFrameSize }) {
  const frameRef = useRef(null)
  const dragRef = useRef(null)

  const reportSize = useCallback(() => {
    const element = frameRef.current
    if (element) onFrameSize(element.clientWidth)
  }, [onFrameSize])

  useEffect(() => {
    frameRef.current?.focus()
  }, [])

  useEffect(() => {
    const element = frameRef.current
    if (!element) return
    reportSize()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(reportSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [reportSize])

  useEffect(() => {
    const element = frameRef.current
    if (!element) return
    const onWheel = (event) => {
      event.preventDefault()
      const box = element.getBoundingClientRect()
      const pivot = { x: event.clientX - box.left, y: event.clientY - box.top }
      onChange((current) => zoomBy(current, wheelZoomFactor(event.deltaY), pivot))
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [onChange])

  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    event.currentTarget.focus()
  }

  function handlePointerMove(event) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const delta = dragDelta(drag, event)
    dragRef.current = { pointerId: drag.pointerId, ...delta.next }
    onChange((current) => dragBy(current, delta.dx, delta.dy))
  }

  function handlePointerUp(event) {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function handleKeyDown(event) {
    const nudge = arrowNudge(event.key, event.shiftKey)
    if (!nudge) return
    event.preventDefault()
    onChange((current) => dragBy(current, nudge.x, nudge.y))
  }

  const box = cropImageStyle(state)

  return (
    <div
      className="avatar-crop-frame"
      ref={frameRef}
      tabIndex={0}
      role="application"
      aria-label="Crop your avatar. Drag to move, scroll to zoom, arrow keys to nudge."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      aria-describedby="avatar-crop-keys"
    >
      <img
        className="avatar-crop-photo"
        src={src}
        alt=""
        draggable={false}
        style={{
          width: `${box.width}px`,
          height: `${box.height}px`,
          left: `${box.left}px`,
          top: `${box.top}px`,
          transform: `rotate(${box.rotation}deg)`,
        }}
      />
      <span className="avatar-crop-guide" />
    </div>
  )
}
