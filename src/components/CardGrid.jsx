import { useState } from 'react'
import { reorderCards } from '../lib/cards'
import ShowcaseCard from './ShowcaseCard'
import TextNoteCard from './TextNoteCard'

export default function CardGrid({ cards, editMode, onCardsChange, onAddCard, onUpdateCard, onDeleteCard, onImageAttached, onOpenViewer, onNotify }) {
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)

  function dndProps(card) {
    return {
      draggable: editMode,
      onDragStart: () => setDragId(card.id),
      onDragOver: (e) => {
        e.preventDefault()
        if (overId !== card.id) setOverId(card.id)
      },
      onDrop: (e) => {
        e.preventDefault()
        if (dragId && dragId !== card.id) onCardsChange(reorderCards(cards, dragId, card.id))
        setDragId(null)
        setOverId(null)
      },
      onDragEnd: () => {
        setDragId(null)
        setOverId(null)
      },
    }
  }

  return (
    <section className="cards-section">
      {editMode && (
        <div className="add-row">
          <button className="btn" onClick={() => onAddCard('showcase')}>
            + Add Showcase
          </button>
          <button className="btn" onClick={() => onAddCard('note')}>
            + Add Note
          </button>
        </div>
      )}
      {cards.length === 0 && <div className="empty-hint">No showcases yet — enter edit mode to add one.</div>}
      <div className="cards-grid">
        {cards.map((card) =>
          card.type === 'showcase' ? (
            <ShowcaseCard
              key={card.id}
              card={card}
              editMode={editMode}
              onChange={(patch) => onUpdateCard(card.id, patch)}
              onDelete={() => onDeleteCard(card.id)}
              onImageAttached={onImageAttached}
              onOpenViewer={() => onOpenViewer(card.id)}
              onNotify={onNotify}
              dnd={dndProps(card)}
            />
          ) : (
            <TextNoteCard
              key={card.id}
              card={card}
              editMode={editMode}
              onChange={(patch) => onUpdateCard(card.id, patch)}
              onDelete={() => onDeleteCard(card.id)}
              dnd={dndProps(card)}
            />
          )
        )}
      </div>
    </section>
  )
}
