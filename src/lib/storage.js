// localStorage 数据层，所有 key 带版本号前缀
export const KEYS = {
  settings: 'moyu.settings.v1',
  days: 'moyu.days.v1',
  holidayCache: 'moyu.holidayCache.v1',
  dayOverrides: 'moyu.dayOverrides.v1',
}

const DEFAULT_AI_PROMPT = `你是我的工作日报助手。请把下面今天的搬砖记录整理成一份简洁的中文工作日报：分点列出、语气专业积极、每条注明大致耗时，最后加一句今日总结。

今日搬砖记录：
{records}`

export const DEFAULT_SETTINGS = {
  monthlySalary: 10000,
  yearEndBonus: 0,
  amStart: '09:00',
  amEnd: '12:00',
  pmStart: '13:30',
  pmEnd: '18:00',
  lateEarlyMode: 'fish', // 'fish' 迟到早退算摸鱼 | 'deduct' 扣钱
  weekScheme: 'double', // 'double' 双休 | 'bigsmall' 大小周 | 'single' 单休
  baseSaturday: '2026-01-03', // 大小周基准：该周六上班
  theme: 'system', // 'system' | 'light' | 'dark'
  aiApiKey: '', // DeepSeek API Key
  aiModel: 'deepseek-chat',
  aiPromptTemplate: DEFAULT_AI_PROMPT,
  notifyEnabled: false, // 安卓通知栏日报开关
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 存储满等异常静默忽略，避免影响使用
  }
}

export function loadSettings() {
  const s = readJSON(KEYS.settings, {})
  return { ...DEFAULT_SETTINGS, ...(s && typeof s === 'object' ? s : {}) }
}

export function saveSettings(settings) {
  writeJSON(KEYS.settings, settings)
}

export function loadDays() {
  const d = readJSON(KEYS.days, {})
  return d && typeof d === 'object' ? d : {}
}

export function saveDays(days) {
  writeJSON(KEYS.days, days)
}

export function loadHolidayCache() {
  const c = readJSON(KEYS.holidayCache, {})
  return c && typeof c === 'object' ? c : {}
}

export function saveHolidayCache(cache) {
  writeJSON(KEYS.holidayCache, cache)
}

export function loadOverrides() {
  const o = readJSON(KEYS.dayOverrides, {})
  return o && typeof o === 'object' ? o : {}
}

export function saveOverrides(overrides) {
  writeJSON(KEYS.dayOverrides, overrides)
}

export function exportAll() {
  return {
    app: 'moyu-calculator',
    version: 1,
    exportedAt: Date.now(),
    settings: loadSettings(),
    days: loadDays(),
    overrides: loadOverrides(),
  }
}

// 校验关键字段后整体替换，返回是否成功
export function importAll(obj) {
  if (!obj || typeof obj !== 'object') return false
  if (!obj.settings || typeof obj.settings !== 'object') return false
  if (!obj.days || typeof obj.days !== 'object') return false
  if (typeof obj.settings.monthlySalary !== 'number') return false
  const overrides =
    obj.overrides && typeof obj.overrides === 'object' ? obj.overrides : {}
  saveSettings({ ...DEFAULT_SETTINGS, ...obj.settings })
  saveDays(obj.days)
  saveOverrides(overrides)
  return true
}
