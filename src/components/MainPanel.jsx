import { useMoyu } from '../state.jsx'
import { dateStr, formatClock, formatDuration, computeDayStats } from '../lib/time.js'
import { perMinuteRate, formatMoney } from '../lib/money.js'
import { isWorkDay } from '../lib/schedule.js'
import { lookupHoliday } from '../lib/holiday.js'

export default function MainPanel() {
  const { state, dispatch, now } = useMoyu()
  const { settings, days, overrides } = state
  const ds = dateStr(new Date(now))
  const day = days[ds]
  const workday = isWorkDay(ds, settings, overrides)
  const holiday = lookupHoliday(ds)
  const open = day?.segments.find((s) => s.end == null) || null
  const settled = Boolean(day?.settled)
  const hasStarted = Boolean(day && day.segments.length > 0)
  const stats = computeDayStats(day, settings, now)
  const rate = perMinuteRate(settings)

  const status = !workday
    ? 'rest'
    : settled
      ? 'off'
      : open
        ? open.kind
        : 'idle'

  const statusText = {
    rest: '休息日',
    off: '已下班',
    work: '搬砖中',
    fish: '摸鱼中',
    idle: '未开始',
  }[status]

  const elapsedSec = open ? Math.max(0, (now - open.start) / 1000) : 0

  const start = (kind) => {
    dispatch({ type: kind === 'work' ? 'startWork' : 'startFish', now: Date.now() })
  }
  const offWork = () => {
    if (window.confirm('确定下班跑路吗？今天将按现在时间结算。')) {
      dispatch({ type: 'offWork', now: Date.now() })
    }
  }

  // 休息日：不记账，整个操作区替换
  if (status === 'rest') {
    return (
      <div className="panel-body">
        <div className="card rest-card">
          <div className="rest-emoji">🎉</div>
          <div className="rest-title">今天放假，摸鱼自由</div>
          {holiday && <div className="rest-sub">{holiday.name}</div>}
          <div className="rest-sub">休息日不记账，尽情享受生活</div>
        </div>
        <div className="btn-row">
          <button className="btn btn-tonal" disabled>🧱 开始搬砖</button>
          <button className="btn btn-tonal" disabled>🐟 开始摸鱼</button>
        </div>
        <button className="btn btn-container btn-wide" disabled>🏃 下班跑路</button>
      </div>
    )
  }

  return (
    <div className="panel-body">
      <div className={`card status-card status-${status}`}>
        <div className="status-label">{statusText}</div>
        {open ? (
          <div className="status-clock">{formatClock(elapsedSec)}</div>
        ) : (
          <div className="status-clock status-clock-dim">
            {status === 'off' ? '明天见' : '00:00:00'}
          </div>
        )}
        {hasStarted && (
          <div className="status-accum">
            <span>🧱 搬砖 {formatDuration(stats.workMin)}</span>
            <span className="dot-sep">·</span>
            <span>🐟 摸鱼 {formatDuration(stats.fishMin)}</span>
          </div>
        )}
        <div className="chip-row">
          {stats.lateMin > 0 && (
            <span className="chip chip-bad">
              迟到 {stats.lateMin} 分钟 · -{formatMoney(stats.lateMin * rate)}
            </span>
          )}
          {stats.earlyMin > 0 && (
            <span className="chip chip-bad">
              早退 {stats.earlyMin} 分钟 · -{formatMoney(stats.earlyMin * rate)}
            </span>
          )}
          {stats.overtimeMin > 0 && (
            <span className="chip chip-warm">
              加班 {stats.overtimeMin} 分钟 · +{formatMoney(stats.overtimeMin * rate)}
            </span>
          )}
        </div>
      </div>

      {status === 'off' ? (
        <div className="card summary-card">
          <div className="summary-title">今天已下班，明天见 👋</div>
          <div className="summary-row">
            <span>搬砖</span>
            <span>{formatDuration(stats.workMin)}</span>
          </div>
          <div className="summary-row">
            <span>摸鱼</span>
            <span>{formatDuration(stats.fishMin)}</span>
          </div>
          {stats.overtimeMin > 0 && (
            <div className="summary-row">
              <span>加班</span>
              <span>{formatDuration(stats.overtimeMin)}</span>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="btn-row">
            <button
              className={`btn ${status === 'work' ? 'btn-filled' : 'btn-tonal'}`}
              onClick={() => start('work')}
            >
              🧱 开始搬砖
            </button>
            <button
              className={`btn ${status === 'fish' ? 'btn-filled btn-fish-filled' : 'btn-tonal btn-fish-tonal'}`}
              onClick={() => start('fish')}
            >
              🐟 开始摸鱼
            </button>
          </div>
          <button
            className="btn btn-container btn-wide"
            onClick={offWork}
            disabled={!hasStarted}
          >
            🏃 下班跑路
          </button>
        </>
      )}
    </div>
  )
}
