import { describe, it, expect, beforeEach } from 'vitest'
import { loadState, saveState, DEFAULT_STATE } from './storage'

const STORAGE_KEY = 'steam-dashboard-state-v1'

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('returns defaults when nothing is stored', () => {
    const state = loadState()
    expect(state.profile.displayName).toBe('New User')
    expect(state.profile.status.color).toBe('#6dcff6')
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

  it('defaults currentGame and hoursPlayed to empty strings', () => {
    expect(DEFAULT_STATE.profile.currentGame).toBe('')
    expect(DEFAULT_STATE.profile.hoursPlayed).toBe('')
    const state = loadState()
    expect(state.profile.currentGame).toBe('')
    expect(state.profile.hoursPlayed).toBe('')
  })

  it('backfills currentGame and hoursPlayed on stored states that lack them', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ profile: { displayName: 'Legacy', status: { text: 'In Game', color: '#91c257' } } }),
    )
    const state = loadState()
    expect(state.profile.currentGame).toBe('')
    expect(state.profile.hoursPlayed).toBe('')
    expect(state.profile.displayName).toBe('Legacy')
    expect(state.profile.status.color).toBe('#91c257')
  })

  it('keeps stored currentGame and hoursPlayed when present', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ profile: { currentGame: 'Counter-Strike 2', hoursPlayed: '1,204.5 hrs played' } }),
    )
    const state = loadState()
    expect(state.profile.currentGame).toBe('Counter-Strike 2')
    expect(state.profile.hoursPlayed).toBe('1,204.5 hrs played')
  })
})
