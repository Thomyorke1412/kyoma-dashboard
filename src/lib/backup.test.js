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
})
