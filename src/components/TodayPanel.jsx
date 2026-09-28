import { useMoyu } from '../state.jsx'
import { dateStr, formatDuration, computeDayStats } from '../lib/time.js'
import {
  perMinuteRate,
  minutesToMoney,
  totalLeachMoney,
  formatMoney,
} from '../lib/money.js'
import { getRank } from '../lib/rank.js'

function Row({ label, duration, money, tone }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        <span className="stat-duration">{duration}</span>
        {money != null && <span className={`stat-money ${tone || ''}`}>{money}</span>}
      </span>
    </div>
  )
}

export default function TodayPanel() {
  const { state, now } = useMoyu()
  const { settings, days } = state
  const ds = dateStr(new Date(now))
  const day = days[ds]
  const stats = computeDayStats(day, settings, now)
  const rate = perMinuteRate(settings)
  const leach = totalLeachMoney(stats, settings)
  const rank = getRank(stats.workMin, stats.fishMin)

  const signed = (min) => `${min > 0 ? '-' : ''}${formatMoney(Math.abs(minutesToMoney(min, settings)))}`

  return (
    <div className="panel-body">
      <div className="card">
        <div className="card-title">今日日报 · {ds.slice(5).replace('-', '月')}日</div>
        <Row
          label="🧱 搬砖"
          duration={formatDuration(stats.workMin)}
          money={formatMoney(minutesToMoney(stats.workMin, settings))}
        />
        <Row
          label="🐟 摸鱼"
          duration={formatDuration(stats.fishMin)}
          money={`+${formatMoney(minutesToMoney(stats.fishMin, settings))}`}
          tone="good"
        />
        <Row
          label="⏰ 迟到"
          duration={stats.lateMin > 0 ? `${stats.lateMin}分钟` : '0分钟'}
          money={stats.lateMin > 0 ? signed(stats.lateMin) : null}
          tone="bad"
        />
        <Row
          label="🏃 早退"
          duration={stats.earlyMin > 0 ? `${stats.earlyMin}分钟` : '0分钟'}
          money={stats.earlyMin > 0 ? signed(stats.earlyMin) : null}
          tone="bad"
        />
        <Row
          label="🌙 加班"
          duration={stats.overtimeMin > 0 ? formatDuration(stats.overtimeMin) : '0分钟'}
          money={stats.overtimeMin > 0 ? `+${formatMoney(minutesToMoney(stats.overtimeMin, settings))}` : null}
          tone="warm"
        />
      </div>

      <div className="card leach-card">
        <div className="leach-label">总白嫖金额</div>
        <div className="leach-amount">{formatMoney(leach)}</div>
        <div className="leach-formula">摸鱼 + 迟到 + 早退，每分钟 {formatMoney(rate, 3)}</div>
      </div>

      <div className="card rank-card">
        <div className="leach-label">今日摸鱼段位</div>
        <div className="rank-badge" style={{ background: rank.color }}>
          <span className="rank-emoji">{rank.emoji}</span>
          <span className="rank-name">{rank.name}</span>
        </div>
        {stats.workMin + stats.fishMin > 0 && (
          <div className="leach-formula">
            摸鱼占比 {(rank.ratio * 100).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  )
}
