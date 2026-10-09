import { levelProgress } from '../lib/xp'

export default function LevelBadge({ xp }) {
  const p = levelProgress(xp)
  const tier = Math.min(Math.floor(p.level / 10) * 10, 90)
  return (
    <div className="level-badge-row" title={`${p.intoLevel} / ${p.needed} XP into level ${p.level}`}>
      <span className={`level-badge lvl_${tier}`}>{p.level}</span>
      <div className="xp-bar">
        <div className="xp-bar-fill" style={{ width: `${p.pct}%` }} />
      </div>
    </div>
  )
}
