import React, { useEffect, useState } from 'react'
import useIdbImage from '../lib/useIdbImage'

function ViewerImage({ item }) {
  const idbUrl = useIdbImage(item.imageRef?.type === 'idb' ? item.imageRef.value : null)
  const url = item.imageRef?.type === 'url' ? item.imageRef.value : idbUrl
  const [failed, setFailed] = useState(false)
  if (!url) return <div className="viewer-loading">Loading…</div>
  if (failed) return <div className="viewer-loading">Image failed to load</div>
  return <img src={url} alt={item.caption || 'image'} onError={() => setFailed(true)} />
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
      <ViewerImage key={item.cardId} item={item} />
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
