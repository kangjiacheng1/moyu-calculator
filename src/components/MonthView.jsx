import { useState } from 'react'
import { useMoyu } from '../state.jsx'
import { dateStr, formatDuration, computeDayStats, monthDates, yearMonths } from '../lib/time.js'
import { minutesToMoney, formatMoney } from '../lib/money.js'
import { getRank } from '../lib/rank.js'
import RankGuide from './RankGuide.jsx'

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 汇总某个月（'YYYY-MM'）的搬砖/摸鱼
function sumMonth(days, month, settings, now) {
  let workMin = 0
  let fishTotalMin = 0
  const byWeekday = [0, 0, 0, 0, 0, 0, 0]
  for (const d of monthDates(`${month}-01`)) {
    const day = days[d]
    if (!day) continue
    const s = computeDayStats(day, settings, now)
    workMin += s.workMin
    fishTotalMin += s.fishTotalMin
    const dow = new Date(`${d}T00:00:00`).getDay()
    byWeekday[dow] += s.fishTotalMin
  }
  return { workMin, fishTotalMin, byWeekday }
}

export default function MonthView({ onBack }) {
  const { state, now } = useMoyu()
  const { settings, days } = state
  const today = dateStr(new Date(now))
  const curYear = Number(today.slice(0, 4))
  const curMonth = today.slice(0, 7)

  const [year, setYear] = useState(curYear)
  const [selMonth, setSelMonth] = useState(null) // null = 年度视图，'YYYY-MM' = 月度详情
  const [showGuide, setShowGuide] = useState(false)

  // ============ 月度详情 ============
  if (selMonth) {
    const { workMin, fishTotalMin, byWeekday } = sumMonth(days, selMonth, settings, now)
    const total = workMin + fishTotalMin
    const fishRatio = total > 0 ? fishTotalMin / total : 0
    const fishMoney = minutesToMoney(fishTotalMin, settings)
    const milkTea = fishMoney / 15
    const maxWeekday = byWeekday.indexOf(Math.max(...byWeekday))
    const hasFish = fishTotalMin > 0
    const rank = getRank(workMin, fishTotalMin)

    const R = 54
    const C = 2 * Math.PI * R
    const fishLen = fishRatio * C

    // 每日明细：只列有记录的日期，近的在上面
    const dayRows = monthDates(`${selMonth}-01`)
      .filter((d) => days[d])
      .reverse()
      .map((d) => {
        const s = computeDayStats(days[d], settings, now)
        return { d, s, rank: getRank(s.workMin, s.fishTotalMin) }
      })

    const [y, m] = selMonth.split('-')

    return (
      <>
        <div className="app-bar">
          <button className="icon-btn" onClick={() => setSelMonth(null)} aria-label="返回">
            ←
          </button>
          <div className="app-bar-title">{`${y} 年 ${Number(m)} 月`}</div>
          <div className="app-bar-spacer" />
        </div>
        <div className="panel-body view-body">
          <div className="card donut-card">
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
            <button
              className="rank-badge rank-badge-btn"
              style={{ background: rank.color }}
              onClick={() => setShowGuide(true)}
            >
              <span className="rank-emoji">{rank.emoji}</span>
              <span className="rank-name">{rank.name}</span>
            </button>
            <button className="rank-guide-link" onClick={() => setShowGuide(true)}>
              段位图鉴 ›
            </button>
          </div>
          {showGuide && (
            <RankGuide currentName={rank.name} onClose={() => setShowGuide(false)} />
          )}

          <div className="card">
            <div className="card-title">每日明细</div>
            {dayRows.length === 0 && <div className="form-msg">本月暂无记录</div>}
            {dayRows.map(({ d, s, rank: r }) => (
              <div key={d} className="day-row">
                <div className="day-row-date">
                  <div className="day-row-d">{d.slice(5).replace('-', '/')}</div>
                  <div className="day-row-w">{WEEKDAY_NAMES[new Date(`${d}T00:00:00`).getDay()]}</div>
                </div>
                <div className="day-row-stats">
                  <span>🧱 {formatDuration(s.workMin)}</span>
                  <span className="day-row-fish">
                    🐟 {formatDuration(s.fishTotalMin)} · +{formatMoney(minutesToMoney(s.fishTotalMin, settings))}
                  </span>
                </div>
                <span className="rank-mini" style={{ background: r.color }}>
                  {r.emoji} {r.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }

  // ============ 年度视图 ============
  const months = yearMonths(year)
  const monthFish = months.map((mo) => sumMonth(days, mo, settings, now).fishTotalMin)
  const maxFish = Math.max(...monthFish, 1)

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
        <div className="year-switcher">
          <button className="icon-btn" onClick={() => setYear(year - 1)} aria-label="上一年">
            ‹
          </button>
          <div className="year-label">{year} 年</div>
          <button
            className="icon-btn"
            onClick={() => setYear(year + 1)}
            disabled={year >= curYear}
            aria-label="下一年"
          >
            ›
          </button>
        </div>
        <div className="card">
          <div className="card-title">各月摸鱼总时长</div>
          <div className="year-chart">
            {months.map((mo, i) => {
              const fish = monthFish[i]
              const isCurrent = mo === curMonth
              const isFuture = mo > curMonth
              const height = fish > 0 ? Math.max(6, (fish / maxFish) * 100) : 0
              return (
                <button
                  key={mo}
                  className={`year-col ${isCurrent ? 'year-current' : ''} ${isFuture ? 'year-future' : ''}`}
                  disabled={isFuture}
                  onClick={() => setSelMonth(mo)}
                >
                  <div className="year-value">{fish > 0 ? formatDuration(fish) : ''}</div>
                  <div className="year-track">
                    <div className="year-fill" style={{ height: `${height}%` }} />
                  </div>
                  <div className="year-month">{Number(mo.slice(5))}月</div>
                </button>
              )
            })}
          </div>
          <div className="form-msg">点柱子看当月详情</div>
        </div>
      </div>
    </>
  )
}
