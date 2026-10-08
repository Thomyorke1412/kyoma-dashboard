export const XP_PER_NOTE = 10
export const XP_PER_IMAGE = 25
export const XP_PER_LEVEL = 100

export function awardXp(currentXp, amount) {
  return Math.max(0, currentXp + amount)
}

export function levelFromXp(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

export function levelProgress(xp) {
  const intoLevel = xp % XP_PER_LEVEL
  return {
    level: levelFromXp(xp),
    intoLevel,
    needed: XP_PER_LEVEL,
    pct: (intoLevel / XP_PER_LEVEL) * 100,
  }
}
