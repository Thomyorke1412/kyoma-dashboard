const STORAGE_KEY = 'steam-dashboard-state-v1'

export const DEFAULT_STATE = {
  profile: {
    avatar: { type: 'url', value: '' },
    displayName: 'New User',
    status: { text: 'Online', color: '#57cbde' },
    realName: '',
    location: '',
    summary: '',
  },
  theme: {
    accent: '#66c0f4',
    background: { type: 'preset', value: 'steam-dark' },
  },
  cards: [],
  xp: 0,
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function mergeWithDefaults(raw) {
  const profile = raw?.profile ?? {}
  const theme = raw?.theme ?? {}
  return {
    profile: {
      ...clone(DEFAULT_STATE.profile),
      ...profile,
      avatar: { ...DEFAULT_STATE.profile.avatar, ...(profile.avatar ?? {}) },
      status: { ...DEFAULT_STATE.profile.status, ...(profile.status ?? {}) },
    },
    theme: {
      ...clone(DEFAULT_STATE.theme),
      ...theme,
      background: { ...DEFAULT_STATE.theme.background, ...(theme.background ?? {}) },
    },
    cards: Array.isArray(raw?.cards) ? raw.cards : [],
    xp: typeof raw?.xp === 'number' ? raw.xp : 0,
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return clone(DEFAULT_STATE)
    return mergeWithDefaults(JSON.parse(raw))
  } catch {
    return clone(DEFAULT_STATE)
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
