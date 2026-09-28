import { useMoyu } from '../state.jsx'
import { dateStr, formatDuration, computeDayStats, monthDates } from '../lib/time.js'
import { minutesToMoney, formatMoney } from '../lib/money.js'
import { getRank } from '../lib/rank.js'

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export default function MonthView({ onBack }) {
  const { state, now } = useMoyu()
  const { settings, days } = state
  const today = dateStr(new Date(now))
  const dates = monthDates(today)

  let workMin = 0
  let fishTotalMin = 0
  const byWeekday = [0, 0, 0, 0, 0, 0, 0]
  for (const d of dates) {
    const day = days[d]
    if (!day) continue
    const s = computeDayStats(day, settings, now)
    workMin += s.workMin
    fishTotalMin += s.fishTotalMin
    const dow = new Date(`${d}T00:00:00`).getDay()
    byWeekday[dow] += s.fishTotalMin
  }

  const total = workMin + fishTotalMin
  const fishRatio = total > 0 ? fishTotalMin / total : 0
  const fishMoney = minutesToMoney(fishTotalMin, settings)
  const milkTea = fishMoney / 15
  const maxWeekday = byWeekday.indexOf(Math.max(...byWeekday))
  const hasFish = fishTotalMin > 0
  const rank = getRank(workMin, fishTotalMin)

  // 环形图：两段 stroke-dasharray
  const R = 54
  const C = 2 * Math.PI * R
  const fishLen = fishRatio * C

  return (
    <>
      <div className="app-bar">
        <button className="icon-btn" onClick={onBack} aria-label="返回">
          ←
        </button>
        <div className="app-bar-title">摸鱼月报</div>
        <div className="app-bar-spacer" />
      </div>
      <div className="panel-body view-body">
        <div className="card donut-card">
          <div className="card-title">{today.slice(0, 7).replace('-', ' 年 ')} 月</div>
          <div className="donut-wrap">
            <svg viewBox="0 0 140 140" className="donut">
              <circle
                cx="70" cy="70" r={R}
                fill="none"
                stroke="var(--work-container)"
                strokeWidth="18"
              />
              {fishLen > 0 && (
                <circle
                  cx="70" cy="70" r={R}
                  fill="none"
                  stroke="var(--fish)"
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeDasharray={`${fishLen} ${C - fishLen}`}
                  transform="rotate(-90 70 70)"
                />
              )}
            </svg>
            <div className="donut-center">
              <div className="donut-pct">{(fishRatio * 100).toFixed(1)}%</div>
              <div className="donut-sub">摸鱼占比</div>
            </div>
          </div>
          <div className="donut-legend">
            <span className="legend-item">
              <i className="legend-dot" style={{ background: 'var(--work-container)' }} />
              搬砖 {formatDuration(workMin)}
            </span>
            <span className="legend-item">
              <i className="legend-dot" style={{ background: 'var(--fish)' }} />
              摸鱼 {formatDuration(fishTotalMin)}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="stat-row">
            <span className="stat-label">累计摸鱼金额</span>
            <span className="stat-value">
              <span className="stat-money good">+{formatMoney(fishMoney)}</span>
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-label">快乐换算</span>
            <span className="stat-value">
              <span className="stat-duration">🧋 ≈ {milkTea.toFixed(1)} 杯奶茶</span>
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-label">最爱摸鱼日</span>
            <span className="stat-value">
              <span className="stat-duration">
                {hasFish ? WEEKDAY_NAMES[maxWeekday] : '—'}
              </span>
            </span>
          </div>
        </div>

        <div className="card rank-card">
          <div className="leach-label">本月段位</div>
          <div className="rank-badge" style={{ background: rank.color }}>
            <span className="rank-emoji">{rank.emoji}</span>
            <span className="rank-name">{rank.name}</span>
          </div>
        </div>
      </div>
    </>
  )
}
