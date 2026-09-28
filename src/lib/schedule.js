// 是否工作日判定，优先级：手动覆盖 > API 缓存 > 内置兜底表 > 工作制度推算
import { lookupHoliday } from './holiday.js'

const WEEK_MS = 7 * 24 * 3600 * 1000

function localDateMs(ds) {
  const [y, m, d] = ds.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

// 大小周：从基准周六（上班）起隔周循环
function isBigSmallWorkSaturday(ds, settings) {
  const base = settings.baseSaturday || '2026-01-03'
  const diffWeeks = Math.round((localDateMs(ds) - localDateMs(base)) / WEEK_MS)
  return ((diffWeeks % 2) + 2) % 2 === 0
}

// holidayInfo 可传入以复用查询结果；不传则自行查询
export function isWorkDay(ds, settings, overrides = {}, holidayInfo) {
  // 1. 手动覆盖
  const override = overrides[ds]
  if (override === 'work') return true
  if (override === 'off') return false

  // 2. 节假日数据（API 缓存 > 内置兜底）
  const info = holidayInfo !== undefined ? holidayInfo : lookupHoliday(ds)
  if (info) {
    // type 0 工作日 / 3 调休上班 → 上班；type 1 周末 / 2 节假日 → 休息
    return info.type === 0 || info.type === 3
  }

  // 3. 工作制度推算
  const [y, m, d] = ds.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay() // 0=周日
  if (dow >= 1 && dow <= 5) return true
  if (dow === 6) {
    switch (settings.weekScheme) {
      case 'single':
        return true
      case 'bigsmall':
        return isBigSmallWorkSaturday(ds, settings)
      case 'double':
      default:
        return false
    }
  }
  return false // 周日
}
