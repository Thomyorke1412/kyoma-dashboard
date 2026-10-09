export function buildRows(cards, perRow = 3) {
  if (!Array.isArray(cards)) return []
  const size = Number.isFinite(perRow) && perRow >= 1 ? Math.floor(perRow) : 1
  const gallery = cards.filter((c) => c && c.type === 'showcase' && c.image)
  const rows = []
  for (let i = 0; i < gallery.length; i += size) {
    const chunk = gallery.slice(i, i + size)
    rows.push({ id: chunk[0].id, cardIds: chunk.map((c) => c.id) })
  }
  return rows
}

export function resolveViewer(rows, cardsById, rowId, cardId) {
  const row = rowId ? rows.find((r) => r.id === rowId) : null
  if (!row) return { items: [], index: -1, cardId: null }
  const items = row.cardIds.map((id) => cardsById.get(id)).filter((c) => c && c.image)
  if (items.length === 0) return { items, index: -1, cardId: null }
  const index = Math.max(0, items.findIndex((c) => c.id === cardId))
  return { items, index, cardId: items[index].id }
}

export function wrapIndex(index, dir, length) {
  if (!Number.isFinite(length) || length < 1) return -1
  const size = Math.floor(length)
  return ((((index + dir) % size) + size) % size)
}
