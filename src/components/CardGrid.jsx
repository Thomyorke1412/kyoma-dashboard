import { useState } from 'react'
import { reorderCards, filterCards } from '../lib/cards'
import ShowcaseCard from './ShowcaseCard'
import TextNoteCard from './TextNoteCard'

export default function CardGrid({ cards, editMode, query, onQueryChange, filterOpen, onOpenFilter, filterRef, onCardsChange, onAddCard, onUpdateCard, onDeleteCard, onImageAttached, onOpenViewer, onNotify }) {
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const visibleCards = filterCards(cards, query)

  function dndProps(card) {
    return {
      draggable: editMode,
      onDragStart: (e) => {
        e.dataTransfer.setData('text/plain', card.id)
        setDragId(card.id)
      },
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
      {filterOpen ? (
        <div className="filter-row">
          <input
            id="card-filter"
            ref={filterRef}
            type="search"
            placeholder="Filter cards"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label="Filter cards"
          />
          <button className="btn btn-sm" onClick={() => onQueryChange('')}>
            Clear
          </button>
        </div>
      ) : (
        <div className="filter-row">
          <button className="btn btn-sm" onClick={onOpenFilter}>
            Filter cards
          </button>
        </div>
      )}
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
      {cards.length > 0 && visibleCards.length === 0 && (
        <div className="empty-hint">No cards match “{query}”.</div>
      )}
      <div className="cards-grid">
        {visibleCards.map((card) =>
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
