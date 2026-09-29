import { RANKS, GRINDER } from '../lib/rank.js'

// 每个段位的占比区间文字，如 '< 3%'、'3% – 8%'、'> 95%'
function rangeLabels() {
  return RANKS.map((r, i) => {
    const lo = i === 0 ? 0 : Math.round(RANKS[i - 1].max * 100)
    const hi = r.max
    if (!Number.isFinite(hi)) return `> ${lo}%`
    if (lo === 0) return `< ${Math.round(hi * 100)}%`
    return `${lo}% – ${Math.round(hi * 100)}%`
  })
}

// 段位图鉴：底部弹层，从高到低陈列山海经水系神兽
export default function RankGuide({ currentName, onClose }) {
  const labels = rangeLabels()
  const rows = RANKS.map((r, i) => ({ ...r, range: labels[i] })).reverse()

  return (
    <div className="guide-overlay" onClick={onClose}>
      <div className="guide-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="guide-grip" />
        <div className="guide-title">🌊 摸鱼段位图鉴</div>
        <div className="guide-sub">
          中国神话水系篇 · 摸鱼占比 = 摸鱼 ÷（搬砖 + 摸鱼）
        </div>
        <div className="guide-list">
          {rows.map((r) => (
            <div
              key={r.name}
              className={`guide-row ${r.name === currentName ? 'guide-row-current' : ''}`}
            >
              <span className="guide-emoji" style={{ background: r.color }}>
                {r.emoji}
              </span>
              <div className="guide-text">
                <div className="guide-head">
                  <span className="guide-name">{r.name}</span>
                  <span className="guide-range">{r.range}</span>
                  {r.name === currentName && <span className="guide-now">当前</span>}
                </div>
                <div className="guide-desc">{r.desc}</div>
              </div>
            </div>
          ))}
          <div className="guide-divider">—— 体系外传说 ——</div>
          <div className={`guide-row ${GRINDER.name === currentName ? 'guide-row-current' : ''}`}>
            <span className="guide-emoji" style={{ background: GRINDER.color }}>
              {GRINDER.emoji}
            </span>
            <div className="guide-text">
              <div className="guide-head">
                <span className="guide-name">{GRINDER.name}</span>
                <span className="guide-range">摸鱼占比 0%</span>
                {GRINDER.name === currentName && <span className="guide-now">当前</span>}
              </div>
              <div className="guide-desc">{GRINDER.desc}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
