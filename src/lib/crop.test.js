import { describe, it, expect } from 'vitest'
import {
  AVATAR_OUTPUT_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  clampOffset,
  clampZoom,
  coverScale,
  createCropState,
  cropScale,
  dragBy,
  dragDelta,
  naturalPointAt,
  normalizeRotation,
  renderedSize,
  rotateBy,
  rotatedSize,
  validateImageFile,
  zoomBy,
  zoomTo,
  cropSourceRect,
  outputRect,
  arrowNudge,
  cropImageStyle,
  NUDGE_COARSE,
  NUDGE_STEP,
  resizeFrame,
  sliderPercent,
  wheelZoomFactor,
  zoomFromSlider,
} from './crop'

const photo = { width: 1200, height: 800 }
const square = { width: 900, height: 900 }

describe('normalizeRotation', () => {
  it('keeps quarter turns as they are', () => {
    expect(normalizeRotation(0)).toBe(0)
    expect(normalizeRotation(90)).toBe(90)
    expect(normalizeRotation(180)).toBe(180)
    expect(normalizeRotation(270)).toBe(270)
  })

  it('wraps negative and overflowing turns into a quarter turn', () => {
    expect(normalizeRotation(-90)).toBe(270)
    expect(normalizeRotation(-450)).toBe(270)
    expect(normalizeRotation(360)).toBe(0)
    expect(normalizeRotation(450)).toBe(90)
    expect(normalizeRotation(720)).toBe(0)
  })

  it('snaps an arbitrary turn onto the nearest quarter', () => {
    expect(normalizeRotation(80)).toBe(90)
    expect(normalizeRotation(100)).toBe(90)
    expect(normalizeRotation(359)).toBe(0)
  })

  it('falls back to no rotation for a value that is not a number', () => {
    expect(normalizeRotation(NaN)).toBe(0)
    expect(normalizeRotation(undefined)).toBe(0)
  })
})

describe('rotatedSize', () => {
  it('leaves the size alone at zero and half turns', () => {
    expect(rotatedSize(photo, 0)).toEqual({ width: 1200, height: 800 })
    expect(rotatedSize(photo, 180)).toEqual({ width: 1200, height: 800 })
  })

  it('swaps width and height at quarter turns', () => {
    expect(rotatedSize(photo, 90)).toEqual({ width: 800, height: 1200 })
    expect(rotatedSize(photo, 270)).toEqual({ width: 800, height: 1200 })
  })

  it('leaves a square image square at every turn', () => {
    expect(rotatedSize(square, 90)).toEqual({ width: 900, height: 900 })
  })
})

describe('clampZoom', () => {
  it('never zooms out past the fit scale', () => {
    expect(clampZoom(0.4)).toBe(MIN_ZOOM)
    expect(clampZoom(0)).toBe(MIN_ZOOM)
    expect(clampZoom(-3)).toBe(MIN_ZOOM)
  })

  it('never zooms in past the maximum', () => {
    expect(clampZoom(40)).toBe(MAX_ZOOM)
    expect(clampZoom(MAX_ZOOM + 0.5)).toBe(MAX_ZOOM)
  })

  it('passes a zoom already inside the bounds through unchanged', () => {
    expect(clampZoom(1)).toBe(1)
    expect(clampZoom(2.5)).toBe(2.5)
  })

  it('falls back to the fit scale for a zoom that is not a number', () => {
    expect(clampZoom(NaN)).toBe(MIN_ZOOM)
    expect(clampZoom(undefined)).toBe(MIN_ZOOM)
  })
})

describe('coverScale', () => {
  it('scales a wide photo so its short side covers the frame', () => {
    expect(coverScale(photo, 0, 400)).toBeCloseTo(0.5, 10)
  })

  it('scales a tall photo so its narrow side covers the frame', () => {
    expect(coverScale({ width: 800, height: 1200 }, 0, 400)).toBeCloseTo(0.5, 10)
  })

  it('scales a square photo so both sides cover the frame', () => {
    expect(coverScale(square, 0, 400)).toBeCloseTo(4 / 9, 10)
  })

  it('gives the same scale at a quarter turn as at zero', () => {
    expect(coverScale(photo, 90, 400)).toBe(coverScale(photo, 0, 400))
    expect(coverScale(photo, 270, 400)).toBe(coverScale(photo, 0, 400))
  })

  it('grows the scale with the frame', () => {
    expect(coverScale(photo, 0, 800)).toBeCloseTo(coverScale(photo, 0, 400) * 2, 10)
  })
})

describe('renderedSize', () => {
  it('is the rotated size at the fit zoom', () => {
    expect(renderedSize(photo, 0, 1, 400)).toEqual({ width: 600, height: 400 })
  })

  it('swaps the sides at a quarter turn', () => {
    expect(renderedSize(photo, 90, 1, 400)).toEqual({ width: 400, height: 600 })
  })

  it('scales linearly with the zoom factor', () => {
    expect(renderedSize(photo, 0, 2, 400)).toEqual({ width: 1200, height: 800 })
    expect(renderedSize(photo, 0, 3, 400)).toEqual({ width: 1800, height: 1200 })
  })
})

describe('output size', () => {
  it('writes a square canvas of 332 pixels', () => {
    expect(AVATAR_OUTPUT_SIZE).toBe(332)
  })
})

const open = () => createCropState({ natural: photo, frameSize: 400 })

const coversFrame = (state) => {
  const rendered = renderedSize(state.natural, state.rotation, state.zoom, state.frameSize)
  const slackX = state.frameSize - rendered.width
  const slackY = state.frameSize - rendered.height
  return state.offset.x <= 0.0001
    && state.offset.y <= 0.0001
    && state.offset.x >= slackX - 0.0001
    && state.offset.y >= slackY - 0.0001
}

describe('cropScale', () => {
  it('is the fit scale at zoom one', () => {
    expect(cropScale(open())).toBeCloseTo(coverScale(photo, 0, 400), 10)
  })

  it('multiplies the fit scale by the zoom factor', () => {
    expect(cropScale(zoomTo(open(), 3))).toBeCloseTo(cropScale(open()) * 3, 10)
  })

  it('survives a quarter turn because the fit scale does not change', () => {
    expect(cropScale(rotateBy(open(), 90))).toBeCloseTo(cropScale(open()), 10)
  })
})

describe('clampOffset', () => {
  const rendered = { width: 600, height: 400 }

  it('holds the image against the top left of the frame', () => {
    expect(clampOffset({ x: 40, y: 30 }, rendered, 400)).toEqual({ x: 0, y: 0 })
  })

  it('stops the image leaving a gap on the trailing edges', () => {
    expect(clampOffset({ x: -260, y: -30 }, rendered, 400)).toEqual({ x: -200, y: 0 })
  })

  it('leaves an offset that already covers the frame alone', () => {
    expect(clampOffset({ x: -100, y: 0 }, rendered, 400)).toEqual({ x: -100, y: 0 })
  })

  it('centres an image that is smaller than the frame on the axis it cannot fill', () => {
    expect(clampOffset({ x: 90, y: 90 }, { width: 200, height: 400 }, 400)).toEqual({ x: 100, y: 0 })
  })

  it('replaces a missing or unparsable offset with zero', () => {
    expect(clampOffset(undefined, rendered, 400)).toEqual({ x: 0, y: 0 })
    expect(clampOffset({ x: NaN, y: NaN }, rendered, 400)).toEqual({ x: 0, y: 0 })
  })
})

describe('createCropState', () => {
  it('opens at the fit zoom with no rotation', () => {
    const state = open()
    expect(state.zoom).toBe(MIN_ZOOM)
    expect(state.rotation).toBe(0)
  })

  it('centres the largest square of the photo in the frame', () => {
    expect(open().offset).toEqual({ x: -100, y: 0 })
  })

  it('frames the centred square with no slack on either axis', () => {
    expect(coversFrame(open())).toBe(true)
  })

  it('opens a square photo filling the frame exactly', () => {
    const state = createCropState({ natural: square, frameSize: 400 })
    expect(state.offset).toEqual({ x: 0, y: 0 })
  })

  it('opens a photo rotated a quarter turn with the same covered square', () => {
    expect(createCropState({ natural: photo, frameSize: 400, rotation: 90 }).offset).toEqual({ x: 0, y: -100 })
  })

  it('opens at a requested zoom without drifting off the frame', () => {
    const state = createCropState({ natural: photo, frameSize: 400, zoom: 2.5 })
    expect(state.zoom).toBe(2.5)
    expect(coversFrame(state)).toBe(true)
  })

  it('clamps a requested zoom that is out of bounds', () => {
    expect(createCropState({ natural: photo, frameSize: 400, zoom: 99 }).zoom).toBe(MAX_ZOOM)
    expect(createCropState({ natural: photo, frameSize: 400, zoom: 0.1 }).zoom).toBe(MIN_ZOOM)
  })

  it('keeps the frame size it was opened with', () => {
    expect(open().frameSize).toBe(400)
  })
})

describe('dragBy', () => {
  it('moves the image by the pointer delta on both axes', () => {
    expect(dragBy(zoomTo(open(), 2), -30, 12).offset).toEqual({ x: -430, y: -188 })
  })

  it('leaves the zoom and rotation alone', () => {
    const moved = dragBy(open(), 5, 5)
    expect(moved.zoom).toBe(MIN_ZOOM)
    expect(moved.rotation).toBe(0)
  })

  it('holds the axis that already fits the frame flush, like the bar does', () => {
    expect(dragBy(open(), 150, 150).offset).toEqual({ x: 0, y: 0 })
    expect(dragBy(open(), -400, -400).offset).toEqual({ x: -200, y: 0 })
  })

  it('cannot drag the image out from under the frame', () => {
    expect(coversFrame(dragBy(open(), 9000, 9000))).toBe(true)
    expect(coversFrame(dragBy(open(), -9000, -9000))).toBe(true)
    expect(coversFrame(dragBy(zoomTo(open(), 3), 9000, -9000))).toBe(true)
  })

  it('stops at the edge where the image would otherwise uncover the frame', () => {
    expect(dragBy(open(), 9000, -9000).offset).toEqual({ x: 0, y: 0 })
    expect(dragBy(open(), -9000, 9000).offset).toEqual({ x: -200, y: 0 })
  })

  it('nudges one pixel at a time without drifting', () => {
    let state = open()
    for (let step = 0; step < 250; step++) state = dragBy(state, 1, 0)
    expect(state.offset.x).toBe(0)
    for (let step = 0; step < 250; step++) state = dragBy(state, -1, 0)
    expect(state.offset.x).toBe(-200)
  })

  it('does not mutate the state it is given', () => {
    const state = open()
    dragBy(state, -30, 12)
    expect(state.offset).toEqual({ x: -100, y: 0 })
  })
})

describe('dragDelta', () => {
  it('returns the per-event delta and the next origin', () => {
    expect(dragDelta({ x: 100, y: 50 }, { clientX: 120, clientY: 60 })).toEqual({
      dx: 20,
      dy: 10,
      next: { x: 120, y: 60 },
    })
  })

  it('tracks 1:1 across several short moves and one long move', () => {
    let origin = { x: 0, y: 0 }
    let totalX = 0
    let totalY = 0
    for (const point of [{ clientX: 10, clientY: 0 }, { clientX: 30, clientY: 5 }, { clientX: 20, clientY: 15 }]) {
      const step = dragDelta(origin, point)
      totalX += step.dx
      totalY += step.dy
      origin = step.next
    }
    expect(origin).toEqual({ x: 20, y: 15 })
    const long = dragDelta({ x: 0, y: 0 }, { clientX: 20, clientY: 15 })
    expect({ x: totalX, y: totalY }).toEqual({ x: long.dx, y: long.dy })
  })

  it('treats a non-finite pointer coordinate as no movement', () => {
    expect(dragDelta({ x: 40, y: 30 }, { clientX: NaN, clientY: undefined })).toEqual({
      dx: 0,
      dy: 0,
      next: { x: 40, y: 30 },
    })
  })
})

describe('zoomTo', () => {
  it('keeps the photo under the frame centre in place', () => {
    const before = naturalPointAt(open(), { x: 200, y: 200 })
    const after = naturalPointAt(zoomTo(open(), 2), { x: 200, y: 200 })
    expect(after.x).toBeCloseTo(before.x, 8)
    expect(after.y).toBeCloseTo(before.y, 8)
  })

  it('keeps the photo under an off centre point in place', () => {
    const pivot = { x: 90, y: 310 }
    const before = naturalPointAt(open(), pivot)
    const after = naturalPointAt(zoomTo(open(), 2.4, pivot), pivot)
    expect(after.x).toBeCloseTo(before.x, 8)
    expect(after.y).toBeCloseTo(before.y, 8)
  })

  it('leaves the frame corner pinned when zooming about that corner', () => {
    expect(zoomTo(open(), 2, { x: 0, y: 0 }).offset).toEqual({ x: -200, y: 0 })
  })

  it('scales the rendered photo linearly with the zoom', () => {
    const zoomed = renderedSize(zoomTo(open(), 2).natural, 0, zoomTo(open(), 2).zoom, 400)
    const plain = renderedSize(photo, 0, MIN_ZOOM, 400)
    expect(zoomed.width).toBeCloseTo(plain.width * 2, 8)
  })

  it('never lets the frame uncover an edge', () => {
    expect(coversFrame(zoomTo(open(), 0.2))).toBe(true)
    expect(coversFrame(zoomTo(open(), 9))).toBe(true)
    expect(coversFrame(zoomTo(open(), 2, { x: 0, y: 0 }))).toBe(true)
    expect(coversFrame(zoomTo(open(), 2, { x: 400, y: 400 }))).toBe(true)
  })

  it('leaves the offset untouched when the zoom does not change', () => {
    expect(zoomTo(open(), 1).offset).toEqual({ x: -100, y: 0 })
  })
})

describe('zoomBy', () => {
  it('multiplies the current zoom', () => {
    expect(zoomBy(zoomTo(open(), 2), 2).zoom).toBeCloseTo(4, 8)
  })

  it('cannot wheel out past the fit scale', () => {
    expect(zoomBy(zoomBy(open(), 0.5), 0.5).zoom).toBe(MIN_ZOOM)
    expect(coversFrame(zoomBy(zoomBy(open(), 0.5), 0.5))).toBe(true)
  })

  it('cannot wheel in past the maximum zoom', () => {
    expect(zoomBy(zoomBy(zoomBy(open(), 4), 4), 4).zoom).toBe(MAX_ZOOM)
  })
})

describe('rotateBy', () => {
  it('turns the photo a quarter at a time', () => {
    expect(rotateBy(open(), 90).rotation).toBe(90)
    expect(rotateBy(rotateBy(open(), 90), 90).rotation).toBe(180)
    expect(rotateBy(rotateBy(rotateBy(open(), 90), 90), 90).rotation).toBe(270)
  })

  it('wraps a turn past a full circle back to the start', () => {
    expect(rotateBy(rotateBy(rotateBy(rotateBy(open(), 90), 90), 90), 90).rotation).toBe(0)
  })

  it('turns the other way with a negative angle', () => {
    expect(rotateBy(open(), -90).rotation).toBe(270)
  })

  it('keeps the frame fully covered at every turn', () => {
    let state = open()
    for (let turn = 0; turn < 4; turn++) {
      expect(coversFrame(state)).toBe(true)
      state = rotateBy(state, 90)
    }
  })

  it('keeps the zoom when it turns', () => {
    expect(rotateBy(zoomTo(open(), 3), 90).zoom).toBeCloseTo(3, 8)
  })

  it('keeps the photo covered after a turn at any zoom', () => {
    expect(coversFrame(rotateBy(zoomTo(open(), 4), 90))).toBe(true)
    expect(coversFrame(rotateBy(zoomTo(open(), 1.5), 270))).toBe(true)
  })

  it('returns to the same offset after a full turn', () => {
    let state = dragBy(zoomTo(open(), 2), 40, 20)
    state = rotateBy(rotateBy(rotateBy(rotateBy(state, 90), 90), 90), 90)
    expect(state.rotation).toBe(0)
    expect(state.offset.x).toBeCloseTo(-360, 8)
    expect(state.offset.y).toBeCloseTo(-180, 8)
  })
})

const insideSource = (state) => {
  const rect = cropSourceRect(state)
  return rect.sx >= -0.001
    && rect.sy >= -0.001
    && rect.sx + rect.sw <= state.natural.width + 0.001
    && rect.sy + rect.sh <= state.natural.height + 0.001
}

const cornersAgree = (state) => {
  const rect = cropSourceRect(state)
  const size = state.frameSize
  const points = [[0, 0], [size, 0], [0, size], [size, size]].map(([x, y]) => naturalPointAt(state, { x, y }))
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  return {
    sx: Math.min(...xs),
    sy: Math.min(...ys),
    sw: Math.max(...xs) - Math.min(...xs),
    sh: Math.max(...ys) - Math.min(...ys),
    rect,
  }
}

const states = () => {
  const list = []
  for (const natural of [photo, square, { width: 800, height: 1200 }, { width: 64, height: 4096 }]) {
    for (const zoom of [MIN_ZOOM, 1.5, MAX_ZOOM]) {
      let state = createCropState({ natural, frameSize: 400, zoom })
      for (let turn = 0; turn < 4; turn++) {
        list.push(state)
        list.push(dragBy(state, -77, 43))
        list.push(dragBy(state, 900, -900))
        state = rotateBy(state, 90)
      }
    }
  }
  return list
}

describe('cropSourceRect', () => {
  it('takes the largest centred square of a wide photo on open', () => {
    expect(cropSourceRect(open())).toEqual({ sx: 200, sy: 0, sw: 800, sh: 800 })
  })

  it('takes the whole photo when it is already square', () => {
    const state = createCropState({ natural: square, frameSize: 400 })
    expect(cropSourceRect(state)).toEqual({ sx: 0, sy: 0, sw: 900, sh: 900 })
  })

  it('halves the source square as the zoom doubles', () => {
    expect(cropSourceRect(zoomTo(open(), 2))).toEqual({ sx: 400, sy: 200, sw: 400, sh: 400 })
  })

  it('follows the drag', () => {
    expect(cropSourceRect(dragBy(zoomTo(open(), 2), 40, 20))).toEqual({ sx: 360, sy: 180, sw: 400, sh: 400 })
  })

  it('takes the same square on open whichever quarter it is turned to', () => {
    const turned = createCropState({ natural: photo, frameSize: 400, rotation: 90 })
    expect(cropSourceRect(turned)).toEqual({ sx: 200, sy: 0, sw: 800, sh: 800 })
  })

  it('takes the same square at a half turn', () => {
    const turned = createCropState({ natural: photo, frameSize: 400, rotation: 180 })
    expect(cropSourceRect(turned)).toEqual({ sx: 200, sy: 0, sw: 800, sh: 800 })
  })

  it('keeps the same visible square through a turn, because a turned square is itself', () => {
    const zoomed = zoomTo(open(), 2)
    expect(cropSourceRect(zoomed)).toEqual({ sx: 400, sy: 200, sw: 400, sh: 400 })
    expect(cropSourceRect(rotateBy(zoomed, 90))).toEqual({ sx: 400, sy: 200, sw: 400, sh: 400 })
  })

  it('is always a square, whatever the photo and whatever the state', () => {
    for (const state of states()) expect(cropSourceRect(state).sw).toBeCloseTo(cropSourceRect(state).sh, 8)
  })

  it('never reaches outside the photo, whatever the state', () => {
    for (const state of states()) expect(insideSource(state)).toBe(true)
  })

  it('reads the frame as the four corners of the photo read it', () => {
    for (const state of states()) {
      const { rect, sx, sy, sw, sh } = cornersAgree(state)
      expect(rect.sx).toBeCloseTo(sx, 8)
      expect(rect.sy).toBeCloseTo(sy, 8)
      expect(rect.sw).toBeCloseTo(sw, 8)
      expect(rect.sh).toBeCloseTo(sh, 8)
    }
  })

  it('takes a source square of the frame size divided by the scale', () => {
    for (const state of states()) {
      expect(cropSourceRect(state).sw).toBeCloseTo(state.frameSize / cropScale(state), 8)
    }
  })
})

describe('outputRect', () => {
  it('draws the crop into a square canvas of 332 pixels by default', () => {
    expect(outputRect(open())).toEqual({
      sx: 200,
      sy: 0,
      sw: 800,
      sh: 800,
      dx: 0,
      dy: 0,
      width: AVATAR_OUTPUT_SIZE,
      height: AVATAR_OUTPUT_SIZE,
    })
  })

  it('fills the canvas edge to edge', () => {
    const rect = outputRect(open(), 200)
    expect(rect.dx).toBe(0)
    expect(rect.dy).toBe(0)
    expect(rect.width).toBe(200)
    expect(rect.height).toBe(200)
  })

  it('keeps the square source rect of the state', () => {
    expect(outputRect(zoomTo(open(), 2)).sw).toBe(outputRect(zoomTo(open(), 2)).sh)
  })
})

describe('validateImageFile', () => {
  it('accepts a raster image', () => {
    expect(validateImageFile({ type: 'image/png', name: 'a.png', size: 12 })).toEqual({ ok: true, message: '' })
    expect(validateImageFile({ type: 'image/jpeg', name: 'a.jpg', size: 12 }).ok).toBe(true)
    expect(validateImageFile({ type: 'image/webp', name: 'a.webp', size: 12 }).ok).toBe(true)
  })

  it('ignores the case of the reported type', () => {
    expect(validateImageFile({ type: 'IMAGE/JPEG', name: 'a.jpg', size: 12 }).ok).toBe(true)
  })

  it('rejects a file that is not an image', () => {
    const result = validateImageFile({ type: 'text/plain', name: 'a.txt', size: 12 })
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/image/i)
  })

  it('rejects a document', () => {
    expect(validateImageFile({ type: 'application/pdf', name: 'a.pdf', size: 12 }).ok).toBe(false)
  })

  it('rejects a vector image the canvas cannot rasterise safely', () => {
    const result = validateImageFile({ type: 'image/svg+xml', name: 'a.svg', size: 12 })
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/svg/i)
  })

  it('rejects an empty file', () => {
    const result = validateImageFile({ type: 'image/png', name: 'a.png', size: 0 })
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/empty/i)
  })

  it('trusts a known image extension when the browser reports no type', () => {
    expect(validateImageFile({ type: '', name: 'holiday.JPG', size: 12 }).ok).toBe(true)
  })

  it('rejects an unknown extension when the browser reports no type', () => {
    expect(validateImageFile({ type: '', name: 'notes.txt', size: 12 }).ok).toBe(false)
  })

  it('rejects nothing at all with a message', () => {
    const result = validateImageFile(null)
    expect(result.ok).toBe(false)
    expect(result.message.length).toBeGreaterThan(0)
  })
})

describe('wheelZoomFactor', () => {
  it('zooms in when the wheel rolls up', () => {
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1)
  })

  it('zooms out when the wheel rolls down', () => {
    expect(wheelZoomFactor(100)).toBeLessThan(1)
  })

  it('changes by the same amount in both directions', () => {
    expect(wheelZoomFactor(-100)).toBeCloseTo(1 / wheelZoomFactor(100), 10)
  })

  it('takes a bigger bite for a bigger wheel delta', () => {
    expect(wheelZoomFactor(-400)).toBeGreaterThan(wheelZoomFactor(-100))
  })

  it('holds still for a wheel delta of zero', () => {
    expect(wheelZoomFactor(0)).toBe(1)
  })

  it('steps in small enough to stay controllable', () => {
    expect(wheelZoomFactor(-100)).toBeLessThan(1.2)
  })
})

describe('arrowNudge', () => {
  it('moves the photo with each arrow', () => {
    expect(arrowNudge('ArrowLeft')).toEqual({ x: -NUDGE_STEP, y: 0 })
    expect(arrowNudge('ArrowRight')).toEqual({ x: NUDGE_STEP, y: 0 })
    expect(arrowNudge('ArrowUp')).toEqual({ x: 0, y: -NUDGE_STEP })
    expect(arrowNudge('ArrowDown')).toEqual({ x: 0, y: NUDGE_STEP })
  })

  it('takes the photo with the arrow, not the page', () => {
    expect(arrowNudge('ArrowUp').y).toBeLessThan(0)
  })

  it('moves further when shift is held', () => {
    expect(arrowNudge('ArrowRight', true).x).toBe(NUDGE_STEP * NUDGE_COARSE)
  })

  it('reports no nudge for any other key', () => {
    expect(arrowNudge('Enter')).toBeNull()
    expect(arrowNudge('a')).toBeNull()
    expect(arrowNudge(undefined)).toBeNull()
  })
})

describe('sliderPercent', () => {
  it('spans zero to a hundred across the zoom bounds', () => {
    expect(sliderPercent(MIN_ZOOM)).toBe(0)
    expect(sliderPercent(MAX_ZOOM)).toBe(100)
  })

  it('reads the middle of the range at the middle of the zoom', () => {
    expect(sliderPercent(zoomFromSlider(50))).toBeCloseTo(50, 8)
  })

  it('clamps a slider value to the zoom bounds', () => {
    expect(zoomFromSlider(-40)).toBe(MIN_ZOOM)
    expect(zoomFromSlider(400)).toBe(MAX_ZOOM)
  })
})

describe('resizeFrame', () => {
  const center = (state) => naturalPointAt(state, { x: state.frameSize / 2, y: state.frameSize / 2 })

  it('takes the new frame size', () => {
    expect(resizeFrame(open(), 240).frameSize).toBe(240)
  })

  it('keeps the zoom and the turn', () => {
    const turned = rotateBy(zoomTo(open(), 3), 90)
    const resized = resizeFrame(turned, 240)
    expect(resized.zoom).toBe(3)
    expect(resized.rotation).toBe(90)
  })

  it('keeps the photo under the frame centre in place', () => {
    const before = center(open())
    const after = center(resizeFrame(open(), 240))
    expect(after.x).toBeCloseTo(before.x, 8)
    expect(after.y).toBeCloseTo(before.y, 8)
  })

  it('still covers the frame it was given', () => {
    for (const state of states()) {
      expect(coversFrame(resizeFrame(state, 240))).toBe(true)
      expect(coversFrame(resizeFrame(state, 512))).toBe(true)
    }
  })

  it('crops the same square however big the frame is, because the frame is only a window', () => {
    for (const zoom of [MIN_ZOOM, 1.7, MAX_ZOOM]) {
      const zoomed = zoomTo(open(), zoom)
      const resized = resizeFrame(zoomed, 240)
      expect(cropSourceRect(resized).sw).toBeCloseTo(cropSourceRect(zoomed).sw, 8)
      expect(cropSourceRect(resized).sx).toBeCloseTo(cropSourceRect(zoomed).sx, 8)
      expect(cropSourceRect(resized).sy).toBeCloseTo(cropSourceRect(zoomed).sy, 8)
    }
  })

  it('crops the square the zoom asks for, from the short side of the photo', () => {
    expect(cropSourceRect(open()).sw).toBeCloseTo(800, 8)
    expect(cropSourceRect(zoomTo(open(), 2)).sw).toBeCloseTo(400, 8)
    expect(cropSourceRect(zoomTo(open(), 4)).sw).toBeCloseTo(200, 8)
  })

  it('reads the same source square again once the frame size comes back', () => {
    const before = cropSourceRect(dragBy(zoomTo(open(), 2), 40, 20))
    const after = cropSourceRect(resizeFrame(resizeFrame(dragBy(zoomTo(open(), 2), 40, 20), 240), 400))
    expect(after.sx).toBeCloseTo(before.sx, 8)
    expect(after.sy).toBeCloseTo(before.sy, 8)
  })

  it('ignores a frame size it cannot use', () => {
    expect(resizeFrame(open(), 0)).toEqual(open())
    expect(resizeFrame(open(), -100)).toEqual(open())
    expect(resizeFrame(open(), NaN)).toEqual(open())
    expect(resizeFrame(open(), undefined)).toEqual(open())
  })
})

const rotatedBox = (style) => {
  const quarter = style.rotation === 90 || style.rotation === 270
  const width = quarter ? style.height : style.width
  const height = quarter ? style.width : style.height
  const left = quarter ? style.left + (style.width - style.height) / 2 : style.left
  const top = quarter ? style.top + (style.height - style.width) / 2 : style.top
  return { left, top, width, height }
}

describe('cropImageStyle', () => {
  it('sizes the photo element by the natural size and the scale', () => {
    expect(cropImageStyle(open())).toEqual({ width: 600, height: 400, left: -100, top: 0, rotation: 0 })
  })

  it('keeps the aspect ratio of the photo', () => {
    expect(cropImageStyle(zoomTo(open(), 2)).width / cropImageStyle(zoomTo(open(), 2)).height).toBeCloseTo(1.5, 10)
  })

  it('turns about the centre of the photo element', () => {
    expect(cropImageStyle(rotateBy(open(), 90)).rotation).toBe(90)
    expect(cropImageStyle(rotateBy(rotateBy(open(), 90), 90)).rotation).toBe(180)
  })

  it('keeps the turned photo in the same place as its bounding box', () => {
    const turned = rotateBy(open(), 90)
    const style = cropImageStyle(turned)
    expect(style.width).toBe(600)
    expect(style.height).toBe(400)
    expect(style.left).toBe(-100)
    expect(style.top).toBe(0)
  })

  it('lands the turned bounding box exactly on the frame offset', () => {
    const turned = rotateBy(open(), 90)
    expect(rotatedBox(cropImageStyle(turned))).toEqual({ left: turned.offset.x, top: turned.offset.y, width: 400, height: 600 })
  })

  it('covers the frame on screen for every state, at every turn and zoom', () => {
    for (const state of states()) {
      const box = rotatedBox(cropImageStyle(state))
      expect(box.left).toBeCloseTo(state.offset.x, 8)
      expect(box.top).toBeCloseTo(state.offset.y, 8)
      expect(box.width).toBeCloseTo(renderedSize(state.natural, state.rotation, state.zoom, state.frameSize).width, 8)
      expect(box.height).toBeCloseTo(renderedSize(state.natural, state.rotation, state.zoom, state.frameSize).height, 8)
      expect(box.left).toBeLessThanOrEqual(0.0001)
      expect(box.top).toBeLessThanOrEqual(0.0001)
      expect(box.left + box.width).toBeGreaterThanOrEqual(state.frameSize - 0.0001)
      expect(box.top + box.height).toBeGreaterThanOrEqual(state.frameSize - 0.0001)
    }
  })

  it('still covers a resized frame on screen', () => {
    const state = dragBy(rotateBy(zoomTo(open(), 2), 90), 40, 20)
    const box = rotatedBox(cropImageStyle(resizeFrame(state, 240)))
    expect(box.left).toBeLessThanOrEqual(0.0001)
    expect(box.top).toBeLessThanOrEqual(0.0001)
    expect(box.left + box.width).toBeGreaterThanOrEqual(240 - 0.0001)
    expect(box.top + box.height).toBeGreaterThanOrEqual(240 - 0.0001)
  })
})

