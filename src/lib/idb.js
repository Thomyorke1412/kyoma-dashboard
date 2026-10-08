const DB_NAME = 'steam-dashboard'
const STORE = 'blobs'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function runTransaction(mode, action) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const store = tx.objectStore(STORE)
        const req = action(store)
        tx.oncomplete = () => {
          db.close()
          resolve(req ? req.result : undefined)
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
        tx.onabort = () => {
          db.close()
          reject(tx.error)
        }
      })
  )
}

export function putBlob(key, blob) {
  return runTransaction('readwrite', (store) => store.put(blob, key)).then(() => key)
}

export function getBlob(key) {
  return runTransaction('readonly', (store) => store.get(key)).then((result) => result ?? null)
}

export function deleteBlob(key) {
  return runTransaction('readwrite', (store) => store.delete(key))
}

export function getAllBlobKeys() {
  return runTransaction('readonly', (store) => store.getAllKeys())
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(',')
  const mimeMatch = meta.match(/data:(.*?)(;|$)/)
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime === '' ? 'application/octet-stream' : mime })
}
