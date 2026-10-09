export function reorderCards(cards, fromId, toId) {
  const from = cards.findIndex((c) => c.id === fromId)
  const to = cards.findIndex((c) => c.id === toId)
  if (from === -1 || to === -1 || from === to) return cards
  const next = [...cards]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
