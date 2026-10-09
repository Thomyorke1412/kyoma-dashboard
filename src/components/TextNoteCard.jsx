export default function TextNoteCard({ card, editMode, onChange, onDelete, dnd }) {
  return (
    <div
      className={`card ${dnd.dragOver ? 'drag-over' : ''}`}
      draggable={dnd.draggable}
      onDragStart={dnd.onDragStart}
      onDragOver={dnd.onDragOver}
      onDrop={dnd.onDrop}
      onDragEnd={dnd.onDragEnd}
    >
      <div className="note-title">
        {editMode ? (
          <input
            placeholder="Title"
            value={card.title}
            onChange={(e) => onChange({ title: e.target.value })}
            style={{ width: '100%' }}
          />
        ) : (
          card.title || 'Untitled'
        )}
      </div>
      <div className="note-body">
        {editMode ? (
          <textarea
            rows={6}
            placeholder="Write your note..."
            value={card.body}
            onChange={(e) => onChange({ body: e.target.value })}
            style={{ width: '100%', resize: 'vertical' }}
          />
        ) : (
          card.body || <span style={{ color: 'var(--text-dim)' }}>Empty note.</span>
        )}
      </div>
      {editMode && (
        <div className="card-toolbar">
          <button className="btn btn-sm btn-danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
