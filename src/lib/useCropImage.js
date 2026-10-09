import { useEffect, useState } from 'react'

const IDLE = { image: null, natural: null, error: null, loading: false, url: null }

export default function useCropImage(source) {
  const [state, setState] = useState(IDLE)

  useEffect(() => {
    if (!source) {
      setState(IDLE)
      return
    }
    const url = URL.createObjectURL(source)
    const image = new Image()
    let cancelled = false
    setState({ image: null, natural: null, error: null, loading: true, url })
    image.onload = () => {
      if (cancelled) return
      if (!image.naturalWidth || !image.naturalHeight) {
        setState({ image: null, natural: null, error: 'That image has no pixels to crop.', loading: false, url })
        return
      }
      setState({
        image,
        natural: { width: image.naturalWidth, height: image.naturalHeight },
        error: null,
        loading: false,
        url,
      })
    }
    image.onerror = () => {
      if (cancelled) return
      setState({ image: null, natural: null, error: 'That file could not be read as an image.', loading: false, url })
    }
    image.src = url
    return () => {
      cancelled = true
      image.onload = null
      image.onerror = null
      setTimeout(() => URL.revokeObjectURL(url), 0)
    }
  }, [source])

  return state
}
