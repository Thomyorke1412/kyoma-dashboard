import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { putBlob, getBlob, deleteBlob, getAllBlobKeys, blobToDataUrl, dataUrlToBlob } from './idb'

describe('idb', () => {
  beforeEach(async () => {
    for (const key of await getAllBlobKeys()) await deleteBlob(key)
  })

  it('puts and gets a blob', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' })
    await putBlob('img-1', blob)
    const result = await getBlob('img-1')
    expect(result).not.toBeNull()
    expect(await result.text()).toBe('hello')
  })

  it('returns null for a missing key', async () => {
    expect(await getBlob('nope')).toBeNull()
  })

  it('deletes a blob', async () => {
    await putBlob('img-2', new Blob(['x']))
    await deleteBlob('img-2')
    expect(await getBlob('img-2')).toBeNull()
  })

  it('lists all keys', async () => {
    await putBlob('a', new Blob(['1']))
    await putBlob('b', new Blob(['2']))
    const keys = await getAllBlobKeys()
    expect(keys).toContain('a')
    expect(keys).toContain('b')
  })

  it('round-trips blob to data URL and back', async () => {
    const blob = new Blob(['gif-data'], { type: 'image/gif' })
    const dataUrl = await blobToDataUrl(blob)
    expect(dataUrl).toMatch(/^data:image\/gif;base64,/)
    const restored = dataUrlToBlob(dataUrl)
    expect(restored.type).toBe('image/gif')
    expect(await restored.text()).toBe('gif-data')
  })
})
