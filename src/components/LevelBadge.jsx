import { levelProgress } from '../lib/xp'

function levelTier(level) {
  if (level >= 4300) return 4300
  if (level >= 200) return 200
  if (level >= 100) return 100
  return Math.min(Math.floor(level / 10) * 10, 90)
}

export default function LevelBadge({ xp }) {
  const p = levelProgress(xp)
  const tier = levelTier(p.level)
  return (
    <div className="level-badge-row" title={`${p.intoLevel} / ${p.needed} XP into level ${p.level}`}>
      <span className={`level-badge lvl_${tier}`} title={`Level ${p.level}`}>
        {p.level}
      </span>
      <div className="xp-bar">
        <div className="xp-bar-fill" style={{ width: `${p.pct}%` }} />
      </div>
    </div>
  )
}
