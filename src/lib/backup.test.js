import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { buildBackup, restoreBackup } from './backup'
import { putBlob, getBlob, deleteBlob, getAllBlobKeys } from './idb'
import { DEFAULT_STATE } from './storage'

const state = {
  ...JSON.parse(JSON.stringify(DEFAULT_STATE)),
  profile: { ...DEFAULT_STATE.profile, avatar: { type: 'idb', value: 'avatar' } },
  cards: [
    { id: 'c1', type: 'showcase', image: { type: 'idb', value: 'img-c1' }, caption: 'cap' },
    { id: 'c2', type: 'showcase', image: { type: 'url', value: 'https://example.com/x.gif' }, caption: 'url one' },
  ],
}

describe('backup', () => {
  beforeEach(async () => {
    for (const key of await getAllBlobKeys()) await deleteBlob(key)
    await putBlob('avatar', new Blob(['avatar-bytes'], { type: 'image/png' }))
    await putBlob('img-c1', new Blob(['gif-bytes'], { type: 'image/gif' }))
  })

  it('embeds stored images as data URLs and keeps state', async () => {
    const backup = await buildBackup(state)
    expect(backup.version).toBe(1)
    expect(backup.images['avatar']).toMatch(/^data:image\/png;base64,/)
    expect(backup.images['img-c1']).toMatch(/^data:image\/gif;base64,/)
    expect(backup.state.cards[1].image).toEqual({ type: 'url', value: 'https://example.com/x.gif' })
  })

  it('restores blobs into IndexedDB and returns state', async () => {
    const backup = await buildBackup(state)
    await deleteBlob('avatar')
    await deleteBlob('img-c1')
    expect(await getBlob('avatar')).toBeNull()
    const restored = await restoreBackup(backup)
    expect(restored.profile.displayName).toBe('New User')
    const avatar = await getBlob('avatar')
    expect(await avatar.text()).toBe('avatar-bytes')
  })

  it('rejects invalid backups without touching storage', async () => {
    await expect(restoreBackup(null)).rejects.toThrow('Invalid backup file')
    await expect(restoreBackup({ version: 2, state: {} })).rejects.toThrow('Invalid backup file')
    await expect(restoreBackup({ version: 1 })).rejects.toThrow('Invalid backup file')
  })

  it('deletes stored blobs that the backup does not contain', async () => {
    await putBlob('img-orphan', new Blob(['orphan-bytes'], { type: 'image/png' }))
    const backup = await buildBackup(state)
    await restoreBackup(backup)
    expect(await getBlob('img-orphan')).toBeNull()
    expect(await getAllBlobKeys()).toEqual(expect.arrayContaining(['avatar', 'img-c1']))
  })

  it('deletes nothing when the backup has no images key', async () => {
    await putBlob('img-orphan', new Blob(['orphan-bytes'], { type: 'image/png' }))
    const backup = await buildBackup(state)
    delete backup.images
    const restored = await restoreBackup(backup)
    expect(restored.profile.displayName).toBe('New User')
    expect(await getAllBlobKeys()).toEqual(expect.arrayContaining(['avatar', 'img-c1', 'img-orphan']))
  })

  it('writes no blobs and deletes none when the images key is absent', async () => {
    const backup = await buildBackup(state)
    delete backup.images
    const written = []
    const deleted = []
    await restoreBackup(
      backup,
      (key, blob) => {
        written.push(key)
        return putBlob(key, blob)
      },
      (key) => {
        deleted.push(key)
        return deleteBlob(key)
      },
      async () => ['avatar', 'img-c1', 'img-orphan']
    )
    expect(written).toEqual([])
    expect(deleted).toEqual([])
  })

  it('sweeps for an explicit empty images map but not when the key is absent', async () => {
    const refFreeState = JSON.parse(JSON.stringify(DEFAULT_STATE))
    const swept = { version: 1, state: refFreeState, images: {} }
    await restoreBackup(swept)
    expect(await getAllBlobKeys()).toEqual([])

    await putBlob('avatar', new Blob(['avatar-bytes'], { type: 'image/png' }))
    await putBlob('img-orphan', new Blob(['orphan-bytes'], { type: 'image/png' }))
    const absent = { version: 1, state: refFreeState }
    await restoreBackup(absent)
    expect(await getAllBlobKeys()).toEqual(expect.arrayContaining(['avatar', 'img-orphan']))
  })

  it('keeps a blob the restored state still references even when the backup omits it', async () => {
    await putBlob('img-ghost', new Blob(['ghost-bytes'], { type: 'image/png' }))
    const backup = {
      version: 1,
      state: {
        ...JSON.parse(JSON.stringify(DEFAULT_STATE)),
        cards: [{ id: 'g1', type: 'showcase', image: { type: 'idb', value: 'img-ghost' }, caption: '' }],
      },
      images: {},
    }
    const deleted = []
    await restoreBackup(backup, putBlob, (key) => {
      deleted.push(key)
      return deleteBlob(key)
    })
    expect(deleted).not.toContain('img-ghost')
    expect(await getBlob('img-ghost')).not.toBeNull()
  })

  it('keeps a referenced key reachable only through the restored state after an omitted blob', async () => {
    const backup = await buildBackup(state)
    await deleteBlob('img-c1')
    const trimmed = {
      version: 1,
      state: {
        ...backup.state,
        cards: [{ id: 'c9', type: 'showcase', image: { type: 'idb', value: 'img-c1' }, caption: '' }],
      },
      images: { ...backup.images },
    }
    delete trimmed.images['img-c1']
    await putBlob('img-c1', new Blob(['local-copy'], { type: 'image/gif' }))
    const deleted = []
    await restoreBackup(trimmed, putBlob, (key) => {
      deleted.push(key)
      return deleteBlob(key)
    })
    expect(deleted).not.toContain('img-c1')
    expect(await (await getBlob('img-c1')).text()).toBe('local-copy')
  })

  it('routes orphan deletion through the injected delete function', async () => {
    await putBlob('img-orphan', new Blob(['orphan-bytes'], { type: 'image/png' }))
    const backup = await buildBackup(state)
    const deleted = []
    await restoreBackup(backup, putBlob, (key) => {
      deleted.push(key)
      return deleteBlob(key)
    })
    expect(deleted).toEqual(['img-orphan'])
  })

  it('routes the sweep enumeration through the injected key lister', async () => {
    const backup = await buildBackup(state)
    const deleted = []
    await restoreBackup(
      backup,
      putBlob,
      (key) => {
        deleted.push(key)
        return deleteBlob(key)
      },
      async () => ['avatar', 'img-c1', 'img-orphan']
    )
    expect(deleted).toEqual(['img-orphan'])
  })
})
