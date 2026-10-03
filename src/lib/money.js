// 薪资换算：按「当月实际应出勤天数」计算日薪（每月天数不同，随工作制度/节假日/手动覆盖变化）
import { dailyWorkMinutes, monthDates } from './time.js'
import { isWorkDay } from './schedule.js'

// 月薪（含年终奖折算）= (月薪×12 + 年终奖) ÷ 12
export function monthlySalaryTotal(settings) {
  return (settings.monthlySalary * 12 + (settings.yearEndBonus || 0)) / 12
}

// 当月实际应出勤天数
export function workdaysOfMonth(monthStr, settings, overrides = {}) {
  let n = 0
  for (const d of monthDates(`${monthStr}-01`)) {
    if (isWorkDay(d, settings, overrides)) n++
  }
  return n
}

// 日薪 = 月薪 ÷ 当月应出勤天数（极端情况兜底 21.75）
export function dailySalary(settings, monthStr, overrides = {}) {
  const days = monthStr ? workdaysOfMonth(monthStr, settings, overrides) : 0
  return monthlySalaryTotal(settings) / (days > 0 ? days : 21.75)
}

// 每分钟价值 = 日薪 ÷ 每日工作分钟
export function perMinuteRate(settings, monthStr, overrides = {}) {
  const mins = dailyWorkMinutes(settings)
  if (mins <= 0) return 0
  return dailySalary(settings, monthStr, overrides) / mins
}

export function minutesToMoney(min, settings, monthStr, overrides) {
  return min * perMinuteRate(settings, monthStr, overrides)
}

// 总白嫖金额 = 摸鱼口径分钟（fishTotalMin，含/不含迟到早退取决于设置）× 单价
export function totalLeachMoney(stats, settings, monthStr, overrides) {
  return minutesToMoney(stats.fishTotalMin, settings, monthStr, overrides)
}

// 加班价值 = 加班分钟 × 单价（单独展示）
export function overtimeMoney(stats, settings, monthStr, overrides) {
  return minutesToMoney(stats.overtimeMin, settings, monthStr, overrides)
}

export function formatMoney(amount, digits = 2) {
  return `¥${amount.toFixed(digits)}`
}
