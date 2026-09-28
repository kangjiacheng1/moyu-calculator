import { dailyWorkMinutes } from './time.js'

// 每分钟价值 = (年薪) ÷ 12 ÷ 21.75(月计薪天数) ÷ 每日工作分钟
export function perMinuteRate(settings) {
  const annual = settings.monthlySalary * 12 + (settings.yearEndBonus || 0)
  const mins = dailyWorkMinutes(settings)
  if (mins <= 0) return 0
  return annual / 12 / 21.75 / mins
}

// 日薪 = 年薪 ÷ 12 ÷ 21.75
export function dailySalary(settings) {
  const annual = settings.monthlySalary * 12 + (settings.yearEndBonus || 0)
  return annual / 12 / 21.75
}

export function minutesToMoney(min, settings) {
  return min * perMinuteRate(settings)
}

// 总白嫖金额 = 摸鱼总计（含迟到、早退）× 单价
export function totalLeachMoney(stats, settings) {
  return minutesToMoney(stats.fishTotalMin, settings)
}

// 加班价值 = 加班分钟 × 单价（单独展示）
export function overtimeMoney(stats, settings) {
  return minutesToMoney(stats.overtimeMin, settings)
}

export function formatMoney(amount, digits = 2) {
  return `¥${amount.toFixed(digits)}`
}
