import { useState } from 'react'
import { reorderCards } from '../lib/cards'
import ShowcaseCard from './ShowcaseCard'
import TextNoteCard from './TextNoteCard'
import GalleryRow from './GalleryRow'

export default function CardGrid({ cards, visibleCards, galleryRows, editMode, query, onQueryChange, filterOpen, onOpenFilter, filterRef, onCardsChange, onAddCard, onUpdateCard, onDeleteCard, onImageAttached, onOpenRow, onNotify }) {
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const galleryCardIds = new Set(galleryRows.flatMap((row) => row.cardIds))
  const cardsById = new Map(cards.map((c) => [c.id, c]))
  const restCards = visibleCards.filter((c) => !galleryCardIds.has(c.id))

  function dndProps(card) {
    return {
      draggable: editMode,
      dragOver: overId === card.id,
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
      {galleryRows.length > 0 && (
        <div className="gallery">
          {galleryRows.map((row, index) => (
            <GalleryRow
              key={row.id}
              row={row}
              index={index}
              cards={row.cardIds.map((id) => cardsById.get(id)).filter(Boolean)}
              editMode={editMode}
              onUpdateCard={onUpdateCard}
              onDeleteCard={onDeleteCard}
              onImageAttached={onImageAttached}
              onOpenRow={onOpenRow}
              onNotify={onNotify}
              dndProps={dndProps}
            />
          ))}
        </div>
      )}
      {restCards.length > 0 && (
        <div className="cards-grid">
          {restCards.map((card) =>
            card.type === 'showcase' ? (
              <ShowcaseCard
                key={card.id}
                card={card}
                editMode={editMode}
                onChange={(patch) => onUpdateCard(card.id, patch)}
                onDelete={() => onDeleteCard(card.id)}
                onImageAttached={onImageAttached}
                onOpenViewer={() => onOpenRow(null, card.id)}
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
      )}
    </section>
  )
}
