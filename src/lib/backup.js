import { getBlob, putBlob, blobToDataUrl, dataUrlToBlob } from './idb'

function collectIdbRefs(state) {
  const refs = new Set()
  const add = (ref) => {
    if (ref?.type === 'idb' && ref.value) refs.add(ref.value)
  }
  add(state.profile?.avatar)
  add(state.theme?.background)
  for (const card of state.cards ?? []) {
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

export async function restoreBackup(backup, putBlobFn = putBlob) {
  if (!backup || backup.version !== 1 || !backup.state || typeof backup.state !== 'object') {
    throw new Error('Invalid backup file')
  }
  for (const [key, dataUrl] of Object.entries(backup.images ?? {})) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) continue
    await putBlobFn(key, dataUrlToBlob(dataUrl))
  }
  return backup.state
}
