export function levelTier(level) {
  if (level >= 4300) return 4300
  if (level >= 200) return 200
  if (level >= 100) return 100
  return Math.min(Math.floor(level / 10) * 10, 90)
}