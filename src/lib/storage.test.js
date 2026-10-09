import { describe, it, expect, beforeEach } from 'vitest'
import { loadState, saveState, DEFAULT_STATE } from './storage'
import { DEFAULT_ADJUST } from './backgroundAdjust'

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

  it('ships neutral adjust defaults inside the default background', () => {
    expect(DEFAULT_STATE.theme.background.adjust).toEqual(DEFAULT_ADJUST)
    const state = loadState()
    expect(state.theme.background.adjust).toEqual(DEFAULT_ADJUST)
  })

  it('loads a stored image background without adjust as neutral', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: { background: { type: 'idb', value: 'background' } } }))
    const state = loadState()
    expect(state.theme.background.type).toBe('idb')
    expect(state.theme.background.value).toBe('background')
    expect(state.theme.background.adjust).toEqual(DEFAULT_ADJUST)
  })

  it('merges a partial stored adjust with defaults', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme: { background: { type: 'url', value: 'https://x/y.png', adjust: { blur: 5 } } } }),
    )
    const state = loadState()
    expect(state.theme.background.adjust.blur).toBe(5)
    expect(state.theme.background.adjust.x).toBe(0.5)
    expect(state.theme.background.adjust.y).toBe(0.5)
    expect(state.theme.background.adjust.zoom).toBe(1)
    expect(state.theme.background.adjust.opacity).toBe(1)
    expect(state.theme.background.adjust.dim).toBe(0)
  })

  it('clamps hostile values in a stored adjust', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme: { background: { type: 'url', value: 'https://x/y.png', adjust: { blur: 500, dim: 3, zoom: 0.2, rotation: 45 } } } }),
    )
    const state = loadState()
    expect(state.theme.background.adjust.blur).toBe(24)
    expect(state.theme.background.adjust.dim).toBe(0.8)
    expect(state.theme.background.adjust.zoom).toBe(1)
    expect(state.theme.background.adjust.rotation).toBe(90)
  })

  it('round-trips a full adjust through save and load', () => {
    const state = loadState()
    state.theme.background = {
      type: 'url',
      value: 'https://x/y.png',
      adjust: { ...DEFAULT_ADJUST, x: 0.25, y: 0.75, zoom: 2, rotation: 90, blur: 12, dim: 0.4, brightness: 1.5 },
    }
    saveState(state)
    const reloaded = loadState()
    expect(reloaded.theme.background.adjust).toEqual({
      ...DEFAULT_ADJUST,
      x: 0.25,
      y: 0.75,
      zoom: 2,
      rotation: 90,
      blur: 12,
      dim: 0.4,
      brightness: 1.5,
    })
  })
})
