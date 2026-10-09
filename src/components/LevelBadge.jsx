import { levelProgress } from '../lib/xp'
import { levelTier } from '../lib/levels'

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
