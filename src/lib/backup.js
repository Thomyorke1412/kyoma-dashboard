import { getBlob, putBlob, blobToDataUrl, dataUrlToBlob, getAllBlobKeys, deleteBlob } from './idb'

function collectIdbRefs(state) {
  const refs = new Set()
  const add = (ref) => {
    if (ref?.type === 'idb' && ref.value) refs.add(ref.value)
  }
  add(state.profile?.avatar)
  add(state.theme?.background)
  for (const card of Array.isArray(state.cards) ? state.cards : []) {
    if (card.type === 'showcase') add(card.image)
  }
  return [...refs]
}

export async function buildBackup(state, getBlobFn = getBlob) {
  const images = {}
  for (const key of collectIdbRefs(state)) {
    const blob = await getBlobFn(key)
    if (blob) {
      const domBlob = new Blob([await blob.arrayBuffer()], { type: blob.type })
      images[key] = await blobToDataUrl(domBlob)
    }
  }
  return { version: 1, exportedAt: new Date().toISOString(), state, images }
}

export async function restoreBackup(
  backup,
  putBlobFn = putBlob,
  deleteBlobFn = deleteBlob,
  getAllBlobKeysFn = getAllBlobKeys
) {
  if (!backup || backup.version !== 1 || !backup.state || typeof backup.state !== 'object') {
    throw new Error('Invalid backup file')
  }
  if (!backup.images) return backup.state
  const images = backup.images
  for (const [key, dataUrl] of Object.entries(images)) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) continue
    await putBlobFn(key, dataUrlToBlob(dataUrl))
  }
  const kept = new Set([...Object.keys(images), ...collectIdbRefs(backup.state)])
  for (const key of await getAllBlobKeysFn()) {
    if (!kept.has(key)) await deleteBlobFn(key)
  }
  return backup.state
}
