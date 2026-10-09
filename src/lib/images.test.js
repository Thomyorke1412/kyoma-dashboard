import { describe, it, expect } from 'vitest'
import { describeImageState, isMissingBlob } from './images'

const idbRef = { type: 'idb', value: 'img-1' }

describe('describeImageState', () => {
  it('reports empty when the card has no image at all', () => {
    expect(describeImageState({ hasImage: false, resolvedUrl: null, failed: false })).toBe('empty')
  })

  it('reports loading when an image exists but has no url yet', () => {
    expect(describeImageState({ hasImage: true, resolvedUrl: null, failed: false })).toBe('loading')
  })

  it('reports ok when an image resolved to a url', () => {
    expect(describeImageState({ hasImage: true, resolvedUrl: 'blob:abc', failed: false })).toBe('ok')
  })

  it('reports failed when a resolved url failed to load', () => {
    expect(describeImageState({ hasImage: true, resolvedUrl: 'https://x/y.gif', failed: true })).toBe(
      'failed'
    )
  })

  it('reports missing when a settled stored reference produced no url', () => {
    expect(describeImageState({ hasImage: true, resolvedUrl: null, failed: false, missing: true })).toBe(
      'missing'
    )
  })

  it('reports missing for a stored reference whose lookup settled empty', () => {
    expect(
      describeImageState({
        hasImage: true,
        resolvedUrl: null,
        failed: false,
        missing: isMissingBlob(idbRef, null, true),
      })
    ).toBe('missing')
  })
})

describe('isMissingBlob', () => {
  it('is false while the lookup is still in flight', () => {
    expect(isMissingBlob(idbRef, null, false)).toBe(false)
  })

  it('is true once a stored reference settled with no url', () => {
    expect(isMissingBlob(idbRef, null, true)).toBe(true)
  })

  it('is false when a url resolved', () => {
    expect(isMissingBlob(idbRef, 'blob:abc', true)).toBe(false)
  })

  it('is false for references that are not stored blobs', () => {
    expect(isMissingBlob(null, null, true)).toBe(false)
    expect(isMissingBlob({ type: 'url', value: 'https://x/y.gif' }, null, true)).toBe(false)
  })
})