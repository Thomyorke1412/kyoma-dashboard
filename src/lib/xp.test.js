import { describe, it, expect } from 'vitest'
import { awardXp, levelFromXp, levelProgress, XP_PER_NOTE, XP_PER_IMAGE, XP_PER_LEVEL } from './xp'

describe('xp', () => {
  it('awards XP additively', () => {
    expect(awardXp(0, XP_PER_NOTE)).toBe(10)
    expect(awardXp(10, XP_PER_IMAGE)).toBe(35)
  })

  it('computes level 1 at zero XP', () => {
    expect(levelFromXp(0)).toBe(1)
  })

  it('levels up every 100 XP', () => {
    expect(levelFromXp(99)).toBe(1)
    expect(levelFromXp(100)).toBe(2)
    expect(levelFromXp(250)).toBe(3)
  })

  it('reports progress into current level', () => {
    const p = levelProgress(250)
    expect(p).toEqual({ level: 3, intoLevel: 50, needed: XP_PER_LEVEL, pct: 50 })
  })
})
