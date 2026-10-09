import { describe, it, expect } from 'vitest'
import {
  DEFAULT_ADJUST,
  MAX_BLUR,
  MAX_DIM,
  backgroundDimStyle,
  backgroundLayerStyle,
  clampAdjust,
  dragAdjustBy,
  rotateAdjustBy,
  zoomAdjustBy,
} from './backgroundAdjust'

const photo = { width: 1200, height: 800 }
const wideFrame = { width: 480, height: 160 }

describe('DEFAULT_ADJUST', () => {
  it('has the fixed neutral shape', () => {
    expect(DEFAULT_ADJUST).toEqual({
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
    })
  })

  it('exposes the documented limits', () => {
    expect(MAX_BLUR).toBe(24)
    expect(MAX_DIM).toBe(0.8)
  })
})

describe('clampAdjust', () => {
  it('fills a full neutral state when nothing is given', () => {
    expect(clampAdjust(undefined)).toEqual(DEFAULT_ADJUST)
    expect(clampAdjust(null)).toEqual(DEFAULT_ADJUST)
    expect(clampAdjust({})).toEqual(DEFAULT_ADJUST)
  })

  it('keeps every in-range value as provided', () => {
    const adjust = { x: 0.25, y: 0.8, zoom: 2, rotation: 90, blur: 12, opacity: 0.5, brightness: 1.5, saturation: 0.25, grayscale: 0.75, dim: 0.4 }
    expect(clampAdjust(adjust)).toEqual(adjust)
  })

  it('fills missing fields with defaults while keeping provided ones', () => {
    const out = clampAdjust({ blur: 10, dim: 0.5 })
    expect(out.blur).toBe(10)
    expect(out.dim).toBe(0.5)
    expect(out.x).toBe(0.5)
    expect(out.y).toBe(0.5)
    expect(out.zoom).toBe(1)
    expect(out.rotation).toBe(0)
    expect(out.opacity).toBe(1)
    expect(out.brightness).toBe(1)
    expect(out.saturation).toBe(1)
    expect(out.grayscale).toBe(0)
  })

  it('clamps every field into its documented range', () => {
    const out = clampAdjust({ x: -1, y: 2, zoom: 9, blur: 30, opacity: 2, brightness: 3, saturation: 5, grayscale: 2, dim: 1.5 })
    expect(out.x).toBe(0)
    expect(out.y).toBe(1)
    expect(out.zoom).toBe(4)
    expect(out.blur).toBe(24)
    expect(out.opacity).toBe(1)
    expect(out.brightness).toBe(2)
    expect(out.saturation).toBe(2)
    expect(out.grayscale).toBe(1)
    expect(out.dim).toBe(0.8)
  })

  it('clamps from below on every bounded field', () => {
    const out = clampAdjust({ x: -0.5, y: -2, zoom: 0.2, blur: -4, opacity: -1, brightness: -1, saturation: 0, grayscale: -1, dim: -3 })
    expect(out.x).toBe(0)
    expect(out.y).toBe(0)
    expect(out.zoom).toBe(1)
    expect(out.blur).toBe(0)
    expect(out.opacity).toBe(0)
    expect(out.brightness).toBe(0)
    expect(out.saturation).toBe(0)
    expect(out.grayscale).toBe(0)
    expect(out.dim).toBe(0)
  })

  it('falls back per field for non-numeric values', () => {
    const out = clampAdjust({ x: 'left', blur: NaN, opacity: '50%' })
    expect(out.x).toBe(0.5)
    expect(out.blur).toBe(0)
    expect(out.opacity).toBe(1)
  })

  it('normalizes rotation to quarter turns', () => {
    expect(clampAdjust({ rotation: 45 }).rotation).toBe(90)
    expect(clampAdjust({ rotation: -90 }).rotation).toBe(270)
    expect(clampAdjust({ rotation: 720 }).rotation).toBe(0)
    expect(clampAdjust({ rotation: 270 }).rotation).toBe(270)
    expect(clampAdjust({ rotation: 'side' }).rotation).toBe(0)
  })

  it('returns a fresh object and never mutates the input', () => {
    const input = { x: 0.2 }
    const out = clampAdjust(input)
    out.x = 0.9
    expect(input.x).toBe(0.2)
  })
})

describe('backgroundLayerStyle', () => {
  it('renders the neutral adjust as a plain cover layer', () => {
    const style = backgroundLayerStyle(DEFAULT_ADJUST)
    expect(style).toEqual({
      width: '100cqw',
      height: '100cqh',
      objectFit: 'cover',
      objectPosition: '50% 50%',
      transform: 'translate(-50%, -50%) scale(1) rotate(0deg)',
      filter: 'blur(0px) brightness(1) saturate(1) grayscale(0)',
      opacity: 1,
    })
  })

  it('maps x and y to object-position percentages', () => {
    const style = backgroundLayerStyle({ x: 0.25, y: 0.75 })
    expect(style.objectPosition).toBe('25% 75%')
  })

  it('swaps the container axes for quarter-turn rotations', () => {
    const rotated = backgroundLayerStyle({ rotation: 90 })
    expect(rotated.width).toBe('100cqh')
    expect(rotated.height).toBe('100cqw')
    expect(rotated.transform).toContain('rotate(90deg)')
    const flipped = backgroundLayerStyle({ rotation: 270 })
    expect(flipped.width).toBe('100cqh')
    expect(flipped.height).toBe('100cqw')
  })

  it('pads the layer by the blur radius so edges never show through', () => {
    const style = backgroundLayerStyle({ blur: 6 })
    expect(style.width).toBe('calc(100cqw + 12px)')
    expect(style.height).toBe('calc(100cqh + 12px)')
    expect(style.filter).toContain('blur(6px)')
  })

  it('carries zoom, filters and opacity into the layer', () => {
    const style = backgroundLayerStyle({ zoom: 2, brightness: 1.5, saturation: 0.5, grayscale: 0.25, opacity: 0.75 })
    expect(style.transform).toBe('translate(-50%, -50%) scale(2) rotate(0deg)')
    expect(style.filter).toBe('blur(0px) brightness(1.5) saturate(0.5) grayscale(0.25)')
    expect(style.opacity).toBe(0.75)
  })

  it('clamps hostile input before styling', () => {
    const style = backgroundLayerStyle({ zoom: 99, blur: 400, opacity: 9 })
    expect(style.transform).toContain('scale(4)')
    expect(style.width).toBe('calc(100cqw + 48px)')
    expect(style.opacity).toBe(1)
  })

  it('keeps dim out of the image layer', () => {
    const style = backgroundLayerStyle({ dim: 0.5 })
    expect(style.background).toBeUndefined()
    expect(style.backgroundColor).toBeUndefined()
  })
})

describe('backgroundDimStyle', () => {
  it('builds the dark overlay from dim', () => {
    expect(backgroundDimStyle({ dim: 0.4 })).toEqual({ background: 'rgba(0, 0, 0, 0.4)' })
    expect(backgroundDimStyle(DEFAULT_ADJUST)).toEqual({ background: 'rgba(0, 0, 0, 0)' })
  })

  it('clamps dim into its range', () => {
    expect(backgroundDimStyle({ dim: 1.5 }).background).toBe('rgba(0, 0, 0, 0.8)')
    expect(backgroundDimStyle({ dim: -2 }).background).toBe('rgba(0, 0, 0, 0)')
    expect(backgroundDimStyle(undefined).background).toBe('rgba(0, 0, 0, 0)')
  })
})

describe('dragAdjustBy', () => {
  it('keeps the frame covered: horizontal drag does nothing when the image exactly fills the width', () => {
    const out = dragAdjustBy(DEFAULT_ADJUST, 40, 0, wideFrame, photo)
    expect(out.x).toBe(0.5)
    expect(out.y).toBe(0.5)
  })

  it('moves the image 1:1 for a downward drag', () => {
    const out = dragAdjustBy(DEFAULT_ADJUST, 0, 40, wideFrame, photo)
    expect(out.y).toBeCloseTo(0.25)
    expect(out.x).toBe(0.5)
  })

  it('moves the image 1:1 for an upward drag and clamps at the edge', () => {
    const up = dragAdjustBy(DEFAULT_ADJUST, 0, -80, wideFrame, photo)
    expect(up.y).toBe(1)
    const past = dragAdjustBy(DEFAULT_ADJUST, 0, -500, wideFrame, photo)
    expect(past.y).toBe(1)
  })

  it('clamps at the opposite edge too', () => {
    const out = dragAdjustBy(DEFAULT_ADJUST, 0, 500, wideFrame, photo)
    expect(out.y).toBe(0)
  })

  it('divides the drag by zoom so on-screen movement stays 1:1', () => {
    const zoomed = { ...DEFAULT_ADJUST, zoom: 2 }
    const out = dragAdjustBy(zoomed, 0, 40, wideFrame, photo)
    expect(out.y).toBeCloseTo(0.375)
  })

  it('keeps 1:1 movement when rotated 90 degrees', () => {
    const rotated = { ...DEFAULT_ADJUST, rotation: 90 }
    const down = dragAdjustBy(rotated, 0, 56, wideFrame, photo)
    expect(down.x).toBeCloseTo(0.4)
    expect(down.y).toBe(0.5)
    const right = dragAdjustBy(rotated, 56, 0, wideFrame, photo)
    expect(right.x).toBe(0.5)
    expect(right.y).toBe(0.5)
  })

  it('keeps 1:1 movement when rotated 180 degrees', () => {
    const rotated = { ...DEFAULT_ADJUST, rotation: 180 }
    const out = dragAdjustBy(rotated, 0, 40, wideFrame, photo)
    expect(out.y).toBeCloseTo(0.75)
  })

  it('accounts for the blur padding in the drag range', () => {
    const blurred = { ...DEFAULT_ADJUST, blur: 6 }
    const out = dragAdjustBy(blurred, 0, 39, wideFrame, photo)
    expect(out.y).toBeCloseTo(0.25)
  })

  it('ignores drags while the frame or image size is unknown', () => {
    expect(dragAdjustBy(DEFAULT_ADJUST, 100, 100, null, photo)).toEqual(DEFAULT_ADJUST)
    expect(dragAdjustBy(DEFAULT_ADJUST, 100, 100, wideFrame, null)).toEqual(DEFAULT_ADJUST)
    expect(dragAdjustBy(DEFAULT_ADJUST, 100, 100, { width: 0, height: 160 }, photo)).toEqual(DEFAULT_ADJUST)
  })

  it('treats non-finite deltas as zero', () => {
    const out = dragAdjustBy(DEFAULT_ADJUST, NaN, 40, wideFrame, photo)
    expect(out.y).toBeCloseTo(0.25)
  })

  it('normalizes a hostile adjust before dragging', () => {
    const out = dragAdjustBy({ y: 2 }, 0, 0, wideFrame, photo)
    expect(out.y).toBe(1)
  })
})

describe('zoomAdjustBy', () => {
  it('zooms in for a negative wheel delta and out for a positive one', () => {
    expect(zoomAdjustBy(DEFAULT_ADJUST, -53).zoom).toBeGreaterThan(1)
    expect(zoomAdjustBy({ ...DEFAULT_ADJUST, zoom: 2 }, 53).zoom).toBeLessThan(2)
    expect(zoomAdjustBy({ ...DEFAULT_ADJUST, zoom: 2 }, 53).zoom).toBeGreaterThanOrEqual(1)
  })

  it('keeps zoom inside the documented range', () => {
    expect(zoomAdjustBy(DEFAULT_ADJUST, -10000).zoom).toBe(4)
    expect(zoomAdjustBy({ ...DEFAULT_ADJUST, zoom: 4 }, 10000).zoom).toBe(1)
  })

  it('leaves zoom alone for a zero or invalid delta', () => {
    expect(zoomAdjustBy({ ...DEFAULT_ADJUST, zoom: 2 }, 0).zoom).toBe(2)
    expect(zoomAdjustBy({ ...DEFAULT_ADJUST, zoom: 2 }, NaN).zoom).toBe(2)
    expect(zoomAdjustBy({ ...DEFAULT_ADJUST, zoom: 2 }, undefined).zoom).toBe(2)
  })

  it('preserves the other adjust fields', () => {
    const out = zoomAdjustBy({ ...DEFAULT_ADJUST, blur: 10, dim: 0.5, rotation: 90 }, -53)
    expect(out.blur).toBe(10)
    expect(out.dim).toBe(0.5)
    expect(out.rotation).toBe(90)
  })
})

describe('rotateAdjustBy', () => {
  it('adds quarter turns and wraps around', () => {
    expect(rotateAdjustBy(DEFAULT_ADJUST, 90).rotation).toBe(90)
    expect(rotateAdjustBy({ ...DEFAULT_ADJUST, rotation: 90 }, 90).rotation).toBe(180)
    expect(rotateAdjustBy({ ...DEFAULT_ADJUST, rotation: 270 }, 90).rotation).toBe(0)
    expect(rotateAdjustBy(DEFAULT_ADJUST, -90).rotation).toBe(270)
  })

  it('ignores a non-numeric delta', () => {
    expect(rotateAdjustBy({ ...DEFAULT_ADJUST, rotation: 180 }, 'nope').rotation).toBe(180)
  })

  it('preserves the other adjust fields', () => {
    const out = rotateAdjustBy({ ...DEFAULT_ADJUST, blur: 10, x: 0.2, zoom: 2 }, 90)
    expect(out.blur).toBe(10)
    expect(out.x).toBe(0.2)
    expect(out.zoom).toBe(2)
  })
})
