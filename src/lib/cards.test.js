import { describe, it, expect } from 'vitest'
import { reorderCards, filterCards } from './cards'

const cards = [
  { id: 'a', type: 'note', title: 'A', body: '' },
  { id: 'b', type: 'note', title: 'B', body: '' },
  { id: 'c', type: 'note', title: 'C', body: '' },
]

describe('reorderCards', () => {
  it('moves a card to a new position', () => {
    expect(reorderCards(cards, 'a', 'c').map((x) => x.id)).toEqual(['b', 'c', 'a'])
  })

  it('handles unknown ids by returning the same array contents', () => {
    expect(reorderCards(cards, 'zzz', 'a').map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate the input', () => {
    reorderCards(cards, 'a', 'c')
    expect(cards.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })
})

const mixed = [
  { id: 'n1', type: 'note', title: 'Wishlist', body: 'Hades, Hollow Knight' },
  { id: 's1', type: 'showcase', caption: 'Hades screenshot' },
  { id: 's2', type: 'showcase', caption: 'Desktop wallpaper' },
]

describe('filterCards', () => {
  it('returns every card for an empty query', () => {
    expect(filterCards(mixed, '').map((x) => x.id)).toEqual(['n1', 's1', 's2'])
  })

  it('matches a note title case-insensitively', () => {
    expect(filterCards(mixed, 'WISH').map((x) => x.id)).toEqual(['n1'])
  })

  it('matches text inside a note body', () => {
    expect(filterCards(mixed, 'hollow').map((x) => x.id)).toEqual(['n1'])
  })

  it('matches a showcase caption', () => {
    expect(filterCards(mixed, 'wallpaper').map((x) => x.id)).toEqual(['s2'])
  })

  it('returns no cards when nothing matches', () => {
    expect(filterCards(mixed, 'zzz')).toEqual([])
  })
})
