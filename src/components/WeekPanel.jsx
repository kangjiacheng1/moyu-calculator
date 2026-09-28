import { useMoyu } from '../state.jsx'
import {
  dateStr,
  formatDuration,
  computeDayStats,
  weekDates,
  prevWeekDates,
} from '../lib/time.js'
import { minutesToMoney, formatMoney } from '../lib/money.js'
import { isWorkDay } from '../lib/schedule.js'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

function sumFish(dates, days, settings, now) {
  return dates.reduce(
    (acc, d) => acc + computeDayStats(days[d], settings, now).fishTotalMin,
    0,
  )
}

export default function WeekPanel() {
  const { state, now } = useMoyu()
  const { settings, days, overrides } = state
  const today = dateStr(new Date(now))
  const week = weekDates(today)
  const fishList = week.map((d) => computeDayStats(days[d], settings, now).fishTotalMin)
  const maxFish = Math.max(...fishList, 1)
  const weekTotal = fishList.reduce((a, b) => a + b, 0)
  const lastTotal = sumFish(prevWeekDates(today), days, settings, now)

  let compare = null
  if (lastTotal > 0) {
    const pct = ((weekTotal - lastTotal) / lastTotal) * 100
    compare = {
      up: pct >= 0,
      text: `${pct >= 0 ? '↑' : '↓'} ${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`,
    }
  }

  return (
    <div className="panel-body">
      <div className="card">
        <div className="card-title">本周摸鱼</div>
        <div className="bar-chart">
          {week.map((d, i) => {
            const fish = fishList[i]
            const isToday = d === today
            const workday = isWorkDay(d, settings, overrides)
            const height = fish > 0 ? Math.max(6, (fish / maxFish) * 100) : 0
            return (
              <div
                key={d}
                className={`bar-col ${isToday ? 'bar-today' : ''} ${workday ? '' : 'bar-rest'}`}
              >
                <div className="bar-value">{fish > 0 ? formatDuration(fish) : ''}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ height: `${height}%` }} />
                </div>
                <div className="bar-label">{WEEKDAYS[i]}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card">
        <div className="stat-row">
          <span className="stat-label">周总摸鱼</span>
          <span className="stat-value">
            <span className="stat-duration">{formatDuration(weekTotal)}</span>
            <span className="stat-money good">
              +{formatMoney(minutesToMoney(weekTotal, settings))}
            </span>
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">对比上周</span>
          <span className="stat-value">
            {compare ? (
              <span className={`stat-money ${compare.up ? 'good' : 'bad'}`}>
                {compare.text}
              </span>
            ) : (
              <span className="stat-duration">—</span>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
