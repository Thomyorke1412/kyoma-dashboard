import { describe, it, expect } from 'vitest'
import { levelTier } from './levels'

describe('levelTier', () => {
  it('buckets the sub-100 range to the nearest decade', () => {
    expect(levelTier(0)).toBe(0)
    expect(levelTier(1)).toBe(0)
    expect(levelTier(9)).toBe(0)
    expect(levelTier(10)).toBe(10)
    expect(levelTier(55)).toBe(50)
    expect(levelTier(99)).toBe(90)
  })

  it('never returns a sub-100 bucket above 90', () => {
    for (let level = 0; level <= 99; level += 1) {
      expect(levelTier(level)).toBeLessThanOrEqual(90)
    }
  })

  it('collapses 100-199 to the 100 band', () => {
    expect(levelTier(100)).toBe(100)
    expect(levelTier(150)).toBe(100)
    expect(levelTier(199)).toBe(100)
  })

  it('collapses 200-4299 to the 200 band', () => {
    expect(levelTier(200)).toBe(200)
    expect(levelTier(299)).toBe(200)
    expect(levelTier(4299)).toBe(200)
  })

  it('collapses 4300 and above to the 4300 band', () => {
    expect(levelTier(4300)).toBe(4300)
    expect(levelTier(5200)).toBe(4300)
    expect(levelTier(99999)).toBe(4300)
  })

  it('steps only at the documented boundaries', () => {
    expect(levelTier(99)).toBe(90)
    expect(levelTier(100)).toBe(100)
    expect(levelTier(199)).toBe(100)
    expect(levelTier(200)).toBe(200)
    expect(levelTier(4299)).toBe(200)
    expect(levelTier(4300)).toBe(4300)
  })

  it('returns only a rendered shape class for every level in range', () => {
    const rendered = new Set([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 4300])
    for (let level = 0; level <= 5000; level += 1) {
      expect(rendered.has(levelTier(level))).toBe(true)
    }
  })
})