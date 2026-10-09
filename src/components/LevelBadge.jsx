import { levelProgress } from '../lib/xp'

export default function LevelBadge({ xp }) {
  const p = levelProgress(xp)
  return (
    <div className="level-badge-row" title={`${p.intoLevel} / ${p.needed} XP into level ${p.level}`}>
      <span className="level-badge">Level {p.level}</span>
      <div className="xp-bar">
        <div className="xp-bar-fill" style={{ width: `${p.pct}%` }} />
      </div>
    </div>
  )
}
