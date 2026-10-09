export const AVATAR_OUTPUT_SIZE = 332
export const MIN_ZOOM = 1
export const MAX_ZOOM = 4
export const NUDGE_STEP = 4
export const NUDGE_COARSE = 4
export const WHEEL_ZOOM_BASE = 1.0015

export function normalizeRotation(degrees) {
  if (typeof degrees !== 'number' || !Number.isFinite(degrees)) return 0
  const quarter = Math.round(degrees / 90) % 4
  return ((quarter % 4) + 4) % 4 * 90
}

export function rotatedSize(natural, rotation) {
  const turn = normalizeRotation(rotation)
  const swapped = turn === 90 || turn === 270
  return swapped
    ? { width: natural.height, height: natural.width }
    : { width: natural.width, height: natural.height }
}

export function clampZoom(zoom) {
  if (typeof zoom !== 'number' || !Number.isFinite(zoom)) return MIN_ZOOM
  if (zoom < MIN_ZOOM) return MIN_ZOOM
  if (zoom > MAX_ZOOM) return MAX_ZOOM
  return zoom
}

export function coverScale(natural, rotation, frameSize) {
  const rotated = rotatedSize(natural, rotation)
  return Math.max(frameSize / rotated.width, frameSize / rotated.height)
}

export function renderedSize(natural, rotation, zoom, frameSize) {
  const scale = clampZoom(zoom) * coverScale(natural, rotation, frameSize)
  const rotated = rotatedSize(natural, rotation)
  return { width: rotated.width * scale, height: rotated.height * scale }
}

export function cropScale(state) {
  return clampZoom(state.zoom) * coverScale(state.natural, state.rotation, state.frameSize)
}

function clampAxis(value, frameSize, renderedLength) {
  const slack = frameSize - renderedLength
  if (slack <= 0) return Math.min(Math.max(value, slack), 0)
  return slack / 2
}

export function clampOffset(offset, rendered, frameSize) {
  return {
    x: clampAxis(Number.isFinite(offset?.x) ? offset.x : 0, frameSize, rendered.width),
    y: clampAxis(Number.isFinite(offset?.y) ? offset.y : 0, frameSize, rendered.height),
  }
}

function centeredOffset(rendered, frameSize) {
  return { x: (frameSize - rendered.width) / 2, y: (frameSize - rendered.height) / 2 }
}

export function rotatePoint({ x, y }, rotation, natural) {
  const w = natural.width
  const h = natural.height
  switch (normalizeRotation(rotation)) {
    case 90:
      return { x: h - y, y: x }
    case 180:
      return { x: w - x, y: h - y }
    case 270:
      return { x: y, y: w - x }
    default:
      return { x, y }
  }
}

export function unrotatePoint({ u, v }, rotation, natural) {
  const w = natural.width
  const h = natural.height
  switch (normalizeRotation(rotation)) {
    case 90:
      return { x: v, y: h - u }
    case 180:
      return { x: w - u, y: h - v }
    case 270:
      return { x: w - v, y: u }
    default:
      return { x: u, y: v }
  }
}

export function naturalPointAt(state, point) {
  const scale = cropScale(state)
  return unrotatePoint(
    { u: (point.x - state.offset.x) / scale, v: (point.y - state.offset.y) / scale },
    state.rotation,
    state.natural
  )
}

function frameCenter(state) {
  return { x: state.frameSize / 2, y: state.frameSize / 2 }
}

function anchoredOffset(state, anchor, nextScale, nextRotation) {
  const scale = cropScale(state)
  const point = unrotatePoint(
    { u: (anchor.x - state.offset.x) / scale, v: (anchor.y - state.offset.y) / scale },
    state.rotation,
    state.natural
  )
  const rotatedPoint = rotatePoint(point, nextRotation, state.natural)
  return {
    x: anchor.x - rotatedPoint.x * nextScale,
    y: anchor.y - rotatedPoint.y * nextScale,
  }
}

export function createCropState({ natural, frameSize, rotation = 0, zoom = MIN_ZOOM }) {
  const turn = normalizeRotation(rotation)
  const level = clampZoom(zoom)
  const rendered = renderedSize(natural, turn, level, frameSize)
  return {
    natural,
    frameSize,
    rotation: turn,
    zoom: level,
    offset: clampOffset(centeredOffset(rendered, frameSize), rendered, frameSize),
  }
}

export function dragBy(state, dx, dy) {
  const rendered = renderedSize(state.natural, state.rotation, state.zoom, state.frameSize)
  const moved = {
    x: state.offset.x + (Number.isFinite(dx) ? dx : 0),
    y: state.offset.y + (Number.isFinite(dy) ? dy : 0),
  }
  return { ...state, offset: clampOffset(moved, rendered, state.frameSize) }
}

export function zoomTo(state, zoom, pivot) {
  const level = clampZoom(zoom)
  const anchor = Number.isFinite(pivot?.x) && Number.isFinite(pivot?.y) ? pivot : frameCenter(state)
  const nextScale = level * coverScale(state.natural, state.rotation, state.frameSize)
  const rendered = renderedSize(state.natural, state.rotation, level, state.frameSize)
  const offset = anchoredOffset(state, anchor, nextScale, state.rotation)
  return { ...state, zoom: level, offset: clampOffset(offset, rendered, state.frameSize) }
}

export function zoomBy(state, factor, pivot) {
  const step = Number.isFinite(factor) ? factor : 1
  return zoomTo(state, clampZoom(state.zoom) * step, pivot)
}

export function rotateBy(state, degrees) {
  const turn = normalizeRotation(state.rotation + degrees)
  const scale = cropScale(state)
  const anchor = frameCenter(state)
  const rendered = renderedSize(state.natural, turn, state.zoom, state.frameSize)
  const offset = anchoredOffset(state, anchor, scale, turn)
  return { ...state, rotation: turn, offset: clampOffset(offset, rendered, state.frameSize) }
}

function withoutNegativeZero(value) {
  return value === 0 ? 0 : value
}

export function cropSourceRect(state) {
  const scale = cropScale(state)
  const w = state.natural.width
  const h = state.natural.height
  const a = -state.offset.x / scale
  const c = -state.offset.y / scale
  const side = state.frameSize / scale
  const turn = normalizeRotation(state.rotation)
  const sx = { 0: a, 90: c, 180: w - (a + side), 270: w - (c + side) }[turn]
  const sy = { 0: c, 90: h - (a + side), 180: h - (c + side), 270: a }[turn]
  return {
    sx: withoutNegativeZero(sx),
    sy: withoutNegativeZero(sy),
    sw: withoutNegativeZero(side),
    sh: withoutNegativeZero(side),
  }
}

export function outputRect(state, size = AVATAR_OUTPUT_SIZE) {
  return { ...cropSourceRect(state), dx: 0, dy: 0, width: size, height: size }
}

const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp|bmp|avif)$/i

export function validateImageFile(file) {
  if (!file) return { ok: false, message: 'Choose an image file to crop.' }
  const type = typeof file.type === 'string' ? file.type.toLowerCase() : ''
  if (type === 'image/svg+xml') {
    return { ok: false, message: 'SVG avatars are not supported. Use a PNG or JPG instead.' }
  }
  const raster = type.startsWith('image/') || (type === '' && IMAGE_EXTENSION.test(file.name ?? ''))
  if (!raster) return { ok: false, message: 'That file is not an image. Pick a JPG, PNG, GIF or WebP.' }
  if (file.size === 0) return { ok: false, message: 'That image file is empty.' }
  return { ok: true, message: '' }
}

export function wheelZoomFactor(deltaY) {
  if (!Number.isFinite(deltaY) || deltaY === 0) return 1
  return WHEEL_ZOOM_BASE ** -deltaY
}

export function arrowNudge(key, coarse = false) {
  const step = coarse ? NUDGE_STEP * NUDGE_COARSE : NUDGE_STEP
  switch (key) {
    case 'ArrowLeft':
      return { x: -step, y: 0 }
    case 'ArrowRight':
      return { x: step, y: 0 }
    case 'ArrowUp':
      return { x: 0, y: -step }
    case 'ArrowDown':
      return { x: 0, y: step }
    default:
      return null
  }
}

export function sliderPercent(zoom) {
  const level = clampZoom(zoom)
  return ((level - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100
}

export function zoomFromSlider(percent) {
  const value = Number.isFinite(percent) ? percent : 0
  return clampZoom(MIN_ZOOM + ((MAX_ZOOM - MIN_ZOOM) * value) / 100)
}

export function resizeFrame(state, frameSize) {
  if (!Number.isFinite(frameSize) || frameSize <= 0) return state
  const point = naturalPointAt(state, frameCenter(state))
  const nextScale = clampZoom(state.zoom) * coverScale(state.natural, state.rotation, frameSize)
  const rendered = renderedSize(state.natural, state.rotation, state.zoom, frameSize)
  const offset = {
    x: frameSize / 2 - point.x * nextScale,
    y: frameSize / 2 - point.y * nextScale,
  }
  return { ...state, frameSize, offset: clampOffset(offset, rendered, frameSize) }
}

export function cropImageStyle(state) {
  const scale = cropScale(state)
  const width = state.natural.width * scale
  const height = state.natural.height * scale
  const rotation = normalizeRotation(state.rotation)
  const quarter = rotation === 90 || rotation === 270
  return {
    width,
    height,
    left: state.offset.x + (quarter ? (height - width) / 2 : 0),
    top: state.offset.y + (quarter ? (width - height) / 2 : 0),
    rotation,
  }
}

