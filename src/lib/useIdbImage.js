import { useEffect, useState } from 'react'
import { getBlob } from './idb'

const urlCache = new Map()

export function getIdbUrlFromCache(key) {
  return urlCache.get(key) ?? null
}

export default function useIdbImage(key) {
  const [url, setUrl] = useState(() => (key ? urlCache.get(key) ?? null : null))

  useEffect(() => {
    if (!key) {
      setUrl(null)
      return
    }
    if (urlCache.has(key)) {
      setUrl(urlCache.get(key))
      return
    }
    let cancelled = false
    getBlob(key)
      .then((blob) => {
        if (blob && !cancelled) {
          const objectUrl = URL.createObjectURL(blob)
          urlCache.set(key, objectUrl)
          setUrl(objectUrl)
        } else if (!blob && !cancelled) {
          setUrl(null)
        }
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [key])

  return url
}
