import { useState } from 'react'
import useIdbImage from '../lib/useIdbImage'
import { describeImageState, isMissingBlob } from '../lib/images'
import { putBlob } from '../lib/idb'

export default function ShowcaseCard({ card, editMode, onChange, onDelete, onImageAttached, onOpenViewer, onNotify, dnd }) {
  const idbKey = card.image?.type === 'idb' ? card.image.value : null
  const { url: idbUrl, status: idbStatus } = useIdbImage(idbKey, { withStatus: true })
  const imageUrl = card.image?.type === 'url' ? card.image.value : idbUrl
  const [urlInput, setUrlInput] = useState('')
  const [failed, setFailed] = useState(false)

  const imageState = describeImageState({
    hasImage: Boolean(card.image),
    resolvedUrl: imageUrl,
    failed,
    missing: isMissingBlob(card.image, imageUrl, idbStatus !== 'loading'),
  })
  const placeholderText =
    imageState === 'missing' || imageState === 'failed'
      ? 'Image missing'
      : imageState === 'loading'
        ? 'Loading…'
        : 'No image'

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const key = `img-${card.id}`
    try {
      await putBlob(key, file)
      const hadNoImage = !card.image
      onChange({ image: { type: 'idb', value: key } })
      setFailed(false)
      if (hadNoImage) onImageAttached()
    } catch {
      onNotify('Could not store image — browser storage may be full or blocked.')
    }
    e.target.value = ''
  }

  function applyUrl() {
    if (!urlInput.trim()) return
    const hadNoImage = !card.image
    onChange({ image: { type: 'url', value: urlInput.trim() } })
    setFailed(false)
    setUrlInput('')
    if (hadNoImage) onImageAttached()
  }

  function removeImage() {
    onChange({ image: null })
    setFailed(false)
  }

  return (
    <div
      className={`card ${dnd.dragOver ? 'drag-over' : ''}`}
      draggable={dnd.draggable}
      onDragStart={dnd.onDragStart}
      onDragOver={dnd.onDragOver}
      onDrop={dnd.onDrop}
      onDragEnd={dnd.onDragEnd}
    >
      {imageUrl && !failed ? (
        <img
          className="card-image"
          src={imageUrl}
          alt={card.caption || 'showcase image'}
          onClick={() => !editMode && onOpenViewer()}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="card-image-placeholder">{placeholderText}</div>
      )}
      <div className="card-caption">
        {editMode ? (
          <input
            placeholder="Caption"
            value={card.caption}
            onChange={(e) => onChange({ caption: e.target.value })}
            style={{ width: '100%' }}
          />
        ) : (
          card.caption || <span className="caption-empty">Untitled</span>
        )}
      </div>
      {editMode && (
        <div className="card-toolbar">
          <label className="btn btn-sm">
            Upload
            <input type="file" accept="image/*" hidden onChange={handleFile} />
          </label>
          <input
            placeholder="Image URL"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            style={{ flex: 1, minWidth: 80 }}
          />
          <button className="btn btn-sm" onClick={applyUrl}>
            Set
          </button>
          {card.image && (
            <button className="btn btn-sm btn-danger" onClick={removeImage}>
              Remove image
            </button>
          )}
          <button className="btn btn-sm btn-danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
