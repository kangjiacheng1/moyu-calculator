// 纯时间函数，不依赖 React，方便测试逻辑正确性

// 本地时区 'YYYY-MM-DD'
export function dateStr(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// '09:30' → 570（分钟数）
export function parseHM(hm) {
  const [h, m] = String(hm).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function hmToMinutes(hm) {
  return parseHM(hm)
}

// 当天某个 'HH:MM' 时刻的 epochMs（本地时区）
export function minutesOfDay(ds, hm) {
  const [y, m, d] = ds.split('-').map(Number)
  const mins = parseHM(hm)
  return new Date(y, m - 1, d, Math.floor(mins / 60), mins % 60, 0, 0).getTime()
}

// 工作窗口 [[上午起, 上午止], [下午起, 下午止]]（epochMs）
export function workWindows(ds, settings) {
  return [
    [minutesOfDay(ds, settings.amStart), minutesOfDay(ds, settings.amEnd)],
    [minutesOfDay(ds, settings.pmStart), minutesOfDay(ds, settings.pmEnd)],
  ]
}

// 工作窗口总分钟（默认 180 + 270 = 450）
export function dailyWorkMinutes(settings) {
  return (
    parseHM(settings.amEnd) -
    parseHM(settings.amStart) +
    (parseHM(settings.pmEnd) - parseHM(settings.pmStart))
  )
}

function clampSegmentToWindows(start, end, windows) {
  let total = 0
  for (const [ws, we] of windows) {
    const s = Math.max(start, ws)
    const e = Math.min(end, we)
    if (e > s) total += e - s
  }
  return total
}

// 计算单日统计。day: DayRecord，nowMs 用于截断进行中的 segment
export function computeDayStats(day, settings, nowMs = Date.now()) {
  const stats = { lateMin: 0, earlyMin: 0, overtimeMin: 0, workMin: 0, fishMin: 0, fishTotalMin: 0 }
  if (!day || !Array.isArray(day.segments) || day.segments.length === 0) {
    return stats
  }
  const ds = day.date
  const windows = workWindows(ds, settings)

  let firstStart = null
  for (const seg of day.segments) {
    const start = seg.start
    const end = seg.end == null ? Math.min(nowMs, minutesOfDay(ds, '24:00')) : seg.end
    if (end <= start) continue
    if (firstStart == null || start < firstStart) firstStart = start
    const ms = clampSegmentToWindows(start, end, windows)
    if (seg.kind === 'work') {
      stats.workMin += ms / 60000
    } else if (seg.kind === 'fish') {
      stats.fishMin += ms / 60000
    }
  }
  stats.workMin = Math.floor(stats.workMin)
  stats.fishMin = Math.floor(stats.fishMin)

  // 迟到：当天第一个 segment（无论 work/fish）的 start 与 amStart + 宽限 比较
  if (firstStart != null) {
    const graceEnd = minutesOfDay(ds, settings.amStart) + (settings.lateGraceMin || 0) * 60000
    if (firstStart > graceEnd) {
      stats.lateMin = Math.floor((firstStart - graceEnd) / 60000)
    }
  }

  // 早退 / 加班：以记录的下班时间（offWorkAt）与 pmEnd 比较
  if (day.offWorkAt != null) {
    const pmEndMs = minutesOfDay(ds, settings.pmEnd)
    if (day.offWorkAt < pmEndMs) {
      stats.earlyMin = Math.floor((pmEndMs - day.offWorkAt) / 60000)
    } else if (day.offWorkAt > pmEndMs) {
      stats.overtimeMin = Math.floor((day.offWorkAt - pmEndMs) / 60000)
    }
  }

  // 迟到/早退计入摸鱼：展示口径统一用 fishTotalMin
  stats.fishTotalMin = stats.fishMin + stats.lateMin + stats.earlyMin
  return stats
}

// 'HH:MM' 格式化 epochMs（本地时区）
export function formatHM(ms) {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 分钟数 → 'X小时Y分' / 'Y分钟'
export function formatDuration(min) {
  const m = Math.round(min)
  if (m <= 0) return '0分钟'
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r}分钟`
  if (r === 0) return `${h}小时`
  return `${h}小时${r}分`
}

// 分钟数 → 'HH:MM:SS' 样式的计时器文本（用于大号实时计时）
export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hh = String(Math.floor(s / 3600)).padStart(2, '0')
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

// 本周一~周日的 dateStr 数组（周一为一周开始）
export function weekDates(ds) {
  const [y, m, d] = ds.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dow = (date.getDay() + 6) % 7 // 周一=0
  const monday = new Date(y, m - 1, d - dow)
  const out = []
  for (let i = 0; i < 7; i++) {
    out.push(dateStr(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)))
  }
  return out
}

// 上一周的 dateStr 数组
export function prevWeekDates(ds) {
  return weekDates(ds).map((s) => {
    const [y, m, d] = s.split('-').map(Number)
    return dateStr(new Date(y, m - 1, d - 7))
  })
}

// 本月所有 dateStr
export function monthDates(ds) {
  const [y, m] = ds.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const out = []
  for (let d = 1; d <= daysInMonth; d++) {
    out.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return out
}
