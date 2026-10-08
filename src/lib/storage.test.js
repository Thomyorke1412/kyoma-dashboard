import { describe, it, expect, beforeEach } from 'vitest'
import { loadState, saveState, DEFAULT_STATE } from './storage'

const STORAGE_KEY = 'steam-dashboard-state-v1'

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('returns defaults when nothing is stored', () => {
    const state = loadState()
    expect(state.profile.displayName).toBe('New User')
    expect(state.profile.status.color).toBe('#57cbde')
    expect(state.theme.accent).toBe('#66c0f4')
    expect(state.cards).toEqual([])
    expect(state.xp).toBe(0)
  })

  it('saves and reloads state', () => {
    const state = loadState()
    state.xp = 123
    state.profile.displayName = 'Houou'
    saveState(state)
    const reloaded = loadState()
    expect(reloaded.xp).toBe(123)
    expect(reloaded.profile.displayName).toBe('Houou')
  })

  it('fills in defaults for missing nested fields from older data', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: { displayName: 'X' } }))
    const state = loadState()
    expect(state.profile.displayName).toBe('X')
    expect(state.profile.status.text).toBe('Online')
    expect(state.profile.avatar).toEqual({ type: 'url', value: '' })
    expect(state.theme.background.type).toBe('preset')
    expect(state.cards).toEqual([])
    expect(state.xp).toBe(0)
  })

  it('recovers from corrupted JSON by returning defaults', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{{{')
    const state = loadState()
    expect(state.profile.displayName).toBe('New User')
  })
})
