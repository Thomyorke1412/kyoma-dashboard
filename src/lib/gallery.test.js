import { describe, it, expect } from 'vitest'
import { buildRows, resolveViewer, wrapIndex } from './gallery'

const showcase = (id) => ({ id, type: 'showcase', image: { type: 'url', value: `https://x.test/${id}.png` }, caption: id })
const note = (id) => ({ id, type: 'note', title: id, body: '' })
const imageless = (id) => ({ id, type: 'showcase', image: null, caption: id })

describe('buildRows', () => {
  it('returns no rows for an empty card list', () => {
    expect(buildRows([])).toEqual([])
  })

  it('returns no rows when the card list is not an array', () => {
    expect(buildRows(undefined)).toEqual([])
    expect(buildRows(null)).toEqual([])
  })

  it('puts fewer than three images in one row', () => {
    const rows = buildRows([showcase('a'), showcase('b')])
    expect(rows).toEqual([{ id: 'a', cardIds: ['a', 'b'] }])
  })

  it('fills a row with exactly three images', () => {
    const rows = buildRows([showcase('a'), showcase('b'), showcase('c')])
    expect(rows).toEqual([{ id: 'a', cardIds: ['a', 'b', 'c'] }])
  })

  it('spills more than three images into a second row', () => {
    const rows = buildRows([showcase('a'), showcase('b'), showcase('c'), showcase('d')])
    expect(rows).toEqual([
      { id: 'a', cardIds: ['a', 'b', 'c'] },
      { id: 'd', cardIds: ['d'] },
    ])
  })

  it('ignores notes', () => {
    const rows = buildRows([note('n1'), showcase('a'), note('n2'), showcase('b')])
    expect(rows).toEqual([{ id: 'a', cardIds: ['a', 'b'] }])
  })

  it('ignores showcase cards that have no image', () => {
    const rows = buildRows([showcase('a'), imageless('x'), showcase('b'), imageless('y')])
    expect(rows).toEqual([{ id: 'a', cardIds: ['a', 'b'] }])
  })

  it('keeps array order across a longer run of images', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    const rows = buildRows(ids.map(showcase))
    expect(rows.map((r) => r.cardIds)).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
      ['g'],
    ])
  })

  it('honours a non-default perRow', () => {
    const ids = ['a', 'b', 'c', 'd', 'e']
    expect(buildRows(ids.map(showcase), 2).map((r) => r.cardIds)).toEqual([['a', 'b'], ['c', 'd'], ['e']])
    expect(buildRows(ids.map(showcase), 5).map((r) => r.cardIds)).toEqual([['a', 'b', 'c', 'd', 'e']])
  })

  it('clamps a perRow below one to a single cell', () => {
    const ids = ['a', 'b', 'c']
    expect(buildRows(ids.map(showcase), 0).map((r) => r.cardIds)).toEqual([['a'], ['b'], ['c']])
    expect(buildRows(ids.map(showcase), -2).map((r) => r.cardIds)).toEqual([['a'], ['b'], ['c']])
  })

  it('derives the row id from the first card id and keeps it stable across calls', () => {
    const cards = ['a', 'b', 'c', 'd'].map(showcase)
    const first = buildRows(cards)
    const second = buildRows(cards)
    expect(first.map((r) => r.id)).toEqual(['a', 'd'])
    expect(second).toEqual(first)
  })

  it('does not mutate the card array it is given', () => {
    const cards = [showcase('a'), note('n'), showcase('b')]
    buildRows(cards)
    expect(cards.map((c) => c.id)).toEqual(['a', 'n', 'b'])
  })
})
describe('resolveViewer', () => {
  const one = showcase('a')
  const two = showcase('b')
  const three = showcase('c')
  const four = showcase('d')
  const byId = new Map([one, two, three, four].map((c) => [c.id, c]))

it('collects items from the requested row only', () => {
    const rows = buildRows([one, two, three, four])
    const { items, index, cardId } = resolveViewer(rows, byId, rows[1].id, 'd')
    expect(items.map((c) => c.id)).toEqual(['d'])
    expect(index).toBe(0)
    expect(cardId).toBe('d')
  })

  it('points the index at the focused card inside its row', () => {
    const rows = buildRows([one, two, three, four])
    const { items, index, cardId } = resolveViewer(rows, byId, rows[0].id, 'c')
    expect(items.map((c) => c.id)).toEqual(['a', 'b', 'c'])
    expect(index).toBe(2)
    expect(cardId).toBe('c')
  })

  it('returns no items and index -1 when the row is gone', () => {
    const rows = buildRows([one, two, three, four])
    expect(resolveViewer(rows, byId, 'gone', 'a')).toEqual({ items: [], index: -1, cardId: null })
  })

  it('returns no items when the viewer was never opened', () => {
    expect(resolveViewer(buildRows([one]), byId, null, null)).toEqual({ items: [], index: -1, cardId: null })
  })

  it('falls back to the first item when the focused card was deleted', () => {
    const rows = buildRows([one, two, three])
    const surviving = new Map([one, two].map((c) => [c.id, c]))
    const { items, index, cardId } = resolveViewer(buildRows([one, two, three]).slice(0, 1), surviving, rows[0].id, 'c')
    expect(items.map((c) => c.id)).toEqual(['a', 'b'])
    expect(index).toBe(0)
    expect(cardId).toBe('a')
  })

  it('drops row ids whose card is gone or image-less', () => {
    const rows = buildRows([one, two, three, four])
    const shrunk = new Map([
      [one.id, one],
      [two.id, imageless('b')],
    ])
    expect(resolveViewer(rows, shrunk, rows[0].id, 'a').items.map((c) => c.id)).toEqual(['a'])
  })

  it('reports the resolved card id when the focused card lost its image', () => {
    const rows = buildRows([one, two, three])
    const stripped = new Map([
      [one.id, one],
      [two.id, imageless('b')],
      [three.id, three],
    ])
    const { items, index, cardId } = resolveViewer(rows, stripped, rows[0].id, 'b')
    expect(items.map((c) => c.id)).toEqual(['a', 'c'])
    expect(index).toBe(0)
    expect(cardId).toBe('a')
  })

  it('resolves a null card id to the first item', () => {
    const rows = buildRows([one, two, three])
    const { index, cardId } = resolveViewer(rows, byId, rows[0].id, null)
    expect(index).toBe(0)
    expect(cardId).toBe('a')
  })
})

describe('wrapIndex', () => {
  it('stays at zero when there is a single item in either direction', () => {
    expect(wrapIndex(0, 1, 1)).toBe(0)
    expect(wrapIndex(0, -1, 1)).toBe(0)
  })

  it('wraps backwards from the first item to the last', () => {
    expect(wrapIndex(0, -1, 3)).toBe(2)
  })

  it('wraps forwards from the last item to the first', () => {
    expect(wrapIndex(2, 1, 3)).toBe(0)
  })

  it('moves within range without wrapping in the middle', () => {
    expect(wrapIndex(1, 1, 4)).toBe(2)
    expect(wrapIndex(2, -1, 4)).toBe(1)
    expect(wrapIndex(0, 1, 4)).toBe(1)
    expect(wrapIndex(3, -1, 4)).toBe(2)
  })

  it('treats a jump larger than the row as repeated wraps', () => {
    expect(wrapIndex(0, 4, 3)).toBe(1)
    expect(wrapIndex(2, -4, 3)).toBe(1)
  })

  it('reports no index for an empty row', () => {
    expect(wrapIndex(0, 1, 0)).toBe(-1)
    expect(wrapIndex(0, -1, 0)).toBe(-1)
  })
})
