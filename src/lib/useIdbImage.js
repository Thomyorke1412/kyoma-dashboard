import { useEffect, useState } from 'react'
import { getBlob } from './idb'

const urlCache = new Map()

export function getIdbUrlFromCache(key) {
  return urlCache.get(key) ?? null
}

export default function useIdbImage(key, options = {}) {
  const { withStatus = false } = options
  const [state, setState] = useState(() => ({ url: key ? urlCache.get(key) ?? null : null, settled: !key }))

  useEffect(() => {
    if (!key) {
      setState({ url: null, settled: true })
      return
    }
    if (urlCache.has(key)) {
      setState({ url: urlCache.get(key), settled: true })
      return
    }
    let cancelled = false
    setState({ url: null, settled: false })
    getBlob(key)
      .then((blob) => {
        if (cancelled) return
        if (blob) {
          const objectUrl = URL.createObjectURL(blob)
          urlCache.set(key, objectUrl)
          setState({ url: objectUrl, settled: true })
        } else {
          setState({ url: null, settled: true })
        }
      })
      .catch(() => {
        if (!cancelled) setState({ url: null, settled: true })
      })
    return () => {
      cancelled = true
    }
  }, [key])

  if (!withStatus) return state.url
  return { url: state.url, status: state.settled ? (state.url ? 'ready' : 'missing') : 'loading' }
}
