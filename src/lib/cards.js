export function reorderCards(cards, fromId, toId) {
  const from = cards.findIndex((c) => c.id === fromId)
  const to = cards.findIndex((c) => c.id === toId)
  if (from === -1 || to === -1 || from === to) return cards
  const next = [...cards]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export function filterCards(cards, query) {
  const q = query.trim().toLowerCase()
  if (!q) return cards
  return cards.filter((c) => {
    const hay = c.type === 'note' ? `${c.title} ${c.body}` : `${c.caption}`
    return hay.toLowerCase().includes(q)
  })
}
