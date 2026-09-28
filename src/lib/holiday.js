// 节假日数据：在线 API + 本地缓存 + 内置兜底
import { loadHolidayCache, saveHolidayCache } from './storage.js'
import { HOLIDAY_2026 } from './holiday2026.js'

const API = 'https://timor.tech/api/holiday/year/'

// 内置兜底表（按年份）
const BUILTIN = {
  2026: HOLIDAY_2026,
}

// 查询某日期的节假日信息，优先级：API 缓存 > 内置兜底表
// 返回 { type, name } | null；type: 0 工作日 1 周末 2 节假日 3 调休上班
export function lookupHoliday(ds) {
  const year = ds.slice(0, 4)
  const cache = loadHolidayCache()
  if (cache[year] && cache[year].days && cache[year].days[ds]) {
    return cache[year].days[ds]
  }
  const builtin = BUILTIN[Number(year)]
  if (builtin && builtin[ds]) {
    return builtin[ds]
  }
  return null
}

// 该年份是否有任何数据（API 缓存或兜底）
export function hasYearData(year) {
  const cache = loadHolidayCache()
  return Boolean((cache[year] && cache[year].days) || BUILTIN[Number(year)])
}

// 从 timor.tech 拉取全年数据并写入缓存，失败静默降级
export async function fetchYearHolidays(year) {
  try {
    const res = await fetch(`${API}${year}`)
    if (!res.ok) return false
    const data = await res.json()
    if (!data || data.code !== 0 || !data.holiday) return false
    const days = {}
    for (const item of Object.values(data.holiday)) {
      if (!item || !item.date) continue
      // holiday: true 放假(节假日)，false 调休上班
      days[item.date] = {
        type: item.holiday ? 2 : 3,
        name: item.name || (item.holiday ? '节假日' : '调休上班'),
      }
    }
    const cache = loadHolidayCache()
    cache[year] = { fetchedAt: Date.now(), days }
    saveHolidayCache(cache)
    return true
  } catch {
    return false
  }
}

// 清除缓存并重新拉取（设置页「重新获取节假日数据」按钮）
export async function refreshYearHolidays(year) {
  const cache = loadHolidayCache()
  delete cache[year]
  saveHolidayCache(cache)
  const ok = await fetchYearHolidays(year)
  window.dispatchEvent(new CustomEvent('moyu-holiday-updated'))
  return ok
}

// 打开应用时调用：异步拉取当年（以及跨年前后相邻年份），静默失败
export function ensureHolidayData() {
  const year = new Date().getFullYear()
  const cache = loadHolidayCache()
  const years = [year]
  // 12 月 / 1 月时顺便带上相邻年份，跨假期不抓瞎
  const month = new Date().getMonth()
  if (month === 11) years.push(year + 1)
  if (month === 0) years.push(year - 1)
  for (const y of years) {
    const cached = cache[y]
    const stale = !cached || Date.now() - cached.fetchedAt > 7 * 24 * 3600 * 1000
    if (stale) {
      fetchYearHolidays(y).then(() => {
        window.dispatchEvent(new CustomEvent('moyu-holiday-updated'))
      })
    }
  }
}
