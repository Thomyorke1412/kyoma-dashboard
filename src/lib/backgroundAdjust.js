import { clampZoom, normalizeRotation, wheelZoomFactor } from './crop'

export const MAX_BLUR = 24
export const MAX_DIM = 0.8

export const DEFAULT_ADJUST = {
  x: 0.5,
  y: 0.5,
  zoom: 1,
  rotation: 0,
  blur: 0,
  opacity: 1,
  brightness: 1,
  saturation: 1,
  grayscale: 0,
  dim: 0,
}

const BOUNDED_FIELDS = [
  ['x', 0.5, 0, 1],
  ['y', 0.5, 0, 1],
  ['blur', 0, 0, MAX_BLUR],
  ['opacity', 1, 0, 1],
  ['brightness', 1, 0, 2],
  ['saturation', 1, 0, 2],
  ['grayscale', 0, 0, 1],
  ['dim', 0, 0, MAX_DIM],
]

function clampNumber(value, fallback, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

export function clampAdjust(adjust) {
  const source = typeof adjust === 'object' && adjust !== null ? adjust : {}
  const out = { zoom: clampZoom(source.zoom), rotation: normalizeRotation(source.rotation) }
  for (const [key, fallback, min, max] of BOUNDED_FIELDS) {
    out[key] = clampNumber(source[key], fallback, min, max)
  }
  return out
}

function isQuarterTurn(rotation) {
  return rotation === 90 || rotation === 270
}

function layerBox(adjust, frame) {
  const pad = 2 * adjust.blur
  const width = frame.width + pad
  const height = frame.height + pad
  return isQuarterTurn(adjust.rotation) ? { width: height, height: width } : { width, height }
}

export function backgroundLayerStyle(adjust) {
  const a = clampAdjust(adjust)
  const pad = 2 * a.blur
  const widthUnit = isQuarterTurn(a.rotation) ? '100cqh' : '100cqw'
  const heightUnit = isQuarterTurn(a.rotation) ? '100cqw' : '100cqh'
  return {
    width: pad > 0 ? `calc(${widthUnit} + ${pad}px)` : widthUnit,
    height: pad > 0 ? `calc(${heightUnit} + ${pad}px)` : heightUnit,
    objectFit: 'cover',
    objectPosition: `${a.x * 100}% ${a.y * 100}%`,
    transform: `translate(-50%, -50%) scale(${a.zoom}) rotate(${a.rotation}deg)`,
    filter: `blur(${a.blur}px) brightness(${a.brightness}) saturate(${a.saturation}) grayscale(${a.grayscale})`,
    opacity: a.opacity,
  }
}

export function backgroundDimStyle(adjust) {
  const a = clampAdjust(adjust)
  return { background: `rgba(0, 0, 0, ${a.dim})` }
}

function preDelta(dx, dy, rotation, zoom) {
  const inverse = 1 / zoom
  switch (rotation) {
    case 90:
      return { x: dy * inverse, y: -dx * inverse }
    case 180:
      return { x: -dx * inverse, y: -dy * inverse }
    case 270:
      return { x: -dy * inverse, y: dx * inverse }
    default:
      return { x: dx * inverse, y: dy * inverse }
  }
}

export function dragAdjustBy(adjust, dx, dy, frame, natural) {
  const a = clampAdjust(adjust)
  const dxFinite = Number.isFinite(dx) ? dx : 0
  const dyFinite = Number.isFinite(dy) ? dy : 0
  if (!frame?.width || !frame?.height || !natural?.width || !natural?.height) return a
  const box = layerBox(a, frame)
  const scale = Math.max(box.width / natural.width, box.height / natural.height)
  const spanX = box.width - natural.width * scale
  const spanY = box.height - natural.height * scale
  const delta = preDelta(dxFinite, dyFinite, a.rotation, a.zoom)
  return {
    ...a,
    x: spanX < 0 ? clamp01(a.x + delta.x / spanX) : a.x,
    y: spanY < 0 ? clamp01(a.y + delta.y / spanY) : a.y,
  }
}

export function zoomAdjustBy(adjust, deltaY) {
  const a = clampAdjust(adjust)
  return { ...a, zoom: clampZoom(a.zoom * wheelZoomFactor(deltaY)) }
}

export function rotateAdjustBy(adjust, degrees) {
  const a = clampAdjust(adjust)
  const step = Number.isFinite(degrees) ? degrees : 0
  return { ...a, rotation: normalizeRotation(a.rotation + step) }
}
