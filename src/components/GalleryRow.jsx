import ShowcaseCard from './ShowcaseCard'

export default function GalleryRow({ row, index, cards, editMode, onUpdateCard, onDeleteCard, onImageAttached, onOpenRow, onNotify, dndProps }) {
  const label = cards[0]?.caption || `Showcase ${index + 1}`

  return (
    <div className="gallery-row" data-row-id={row.id}>
      <div className="gallery-row-header">{label}</div>
      <div className="gallery-row-body">
        {cards.map((card) => (
          <ShowcaseCard
            key={card.id}
            card={card}
            editMode={editMode}
            onChange={(patch) => onUpdateCard(card.id, patch)}
            onDelete={() => onDeleteCard(card.id)}
            onImageAttached={onImageAttached}
            onOpenViewer={() => onOpenRow(row.id, card.id)}
            onNotify={onNotify}
            dnd={dndProps(card)}
          />
        ))}
      </div>
    </div>
  )
}