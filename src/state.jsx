import { createContext, useContext, useEffect, useReducer, useState } from 'react'
import {
  loadSettings,
  saveSettings,
  loadDays,
  saveDays,
  loadOverrides,
  saveOverrides,
  importAll as storageImportAll,
} from './lib/storage.js'
import { dateStr, minutesOfDay } from './lib/time.js'
import { ensureHolidayData } from './lib/holiday.js'

const MoyuContext = createContext(null)

function todayStr() {
  return dateStr(new Date())
}

function getOrCreateDay(days, ds) {
  return days[ds] || { date: ds, segments: [], offWorkAt: null, settled: false }
}

function openSegment(day) {
  if (!day) return null
  return day.segments.find((s) => s.end == null) || null
}

function closeOpenSegment(day, endMs) {
  if (!day) return
  for (const seg of day.segments) {
    if (seg.end == null) seg.end = endMs
  }
}

function initState() {
  return {
    settings: loadSettings(),
    days: loadDays(),
    overrides: loadOverrides(),
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'startWork':
    case 'startFish': {
      const kind = action.type === 'startWork' ? 'work' : 'fish'
      const now = action.now
      const ds = todayStr()
      const day = {
        ...getOrCreateDay(state.days, ds),
        segments: getOrCreateDay(state.days, ds).segments.map((s) => ({ ...s })),
      }
      if (day.settled) return state // 已下班结算，不再记账
      const open = openSegment(day)
      if (open && open.kind === kind) return state // 重复按同一状态无效
      closeOpenSegment(day, now)
      day.segments = day.segments.filter((s) => s.end == null || s.end > s.start)
      day.segments.push({ kind, start: now, end: null })
      day.offWorkAt = null
      return { ...state, days: { ...state.days, [ds]: day } }
    }
    case 'offWork': {
      const now = action.now
      const ds = todayStr()
      const day = {
        ...getOrCreateDay(state.days, ds),
        segments: getOrCreateDay(state.days, ds).segments.map((s) => ({ ...s })),
      }
      closeOpenSegment(day, now)
      day.segments = day.segments.filter((s) => s.end == null || s.end > s.start)
      day.offWorkAt = now
      day.settled = true
      return { ...state, days: { ...state.days, [ds]: day } }
    }
    case 'settlePastDays': {
      const today = todayStr()
      let changed = false
      const days = { ...state.days }
      for (const [ds, rawDay] of Object.entries(state.days)) {
        if (ds >= today || rawDay.settled) continue
        const day = { ...rawDay, segments: rawDay.segments.map((s) => ({ ...s })) }
        const endOfDay = minutesOfDay(ds, '24:00')
        // 下班忘按按钮：open segment 按当天 24:00 截断，offWorkAt 记为当天 24:00
        closeOpenSegment(day, endOfDay)
        day.segments = day.segments.filter((s) => s.end == null || s.end > s.start)
        if (day.offWorkAt == null) day.offWorkAt = endOfDay
        day.settled = true
        days[ds] = day
        changed = true
      }
      return changed ? { ...state, days } : state
    }
    case 'updateSettings': {
      return { ...state, settings: { ...state.settings, ...action.patch } }
    }
    case 'setOverride': {
      const overrides = { ...state.overrides }
      if (action.value == null) delete overrides[action.date]
      else overrides[action.date] = action.value
      return { ...state, overrides }
    }
    case 'importAll': {
      const ok = storageImportAll(action.data)
      if (!ok) return state
      return initState()
    }
    default:
      return state
  }
}

export function MoyuProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState)
  const [now, setNow] = useState(() => Date.now())
  const [holidayTick, setHolidayTick] = useState(0)

  // state 变化即持久化到 localStorage
  useEffect(() => {
    saveSettings(state.settings)
    saveDays(state.days)
    saveOverrides(state.overrides)
  }, [state])

  // 挂载时拉取节假日数据（失败静默降级）
  useEffect(() => {
    ensureHolidayData()
    const onUpdated = () => setHolidayTick((t) => t + 1)
    window.addEventListener('moyu-holiday-updated', onUpdated)
    return () => window.removeEventListener('moyu-holiday-updated', onUpdated)
  }, [])

  // 挂载时 + 页面回到前台时结算过去未结算的日期；回到前台立即刷新计时，不等下一个 tick
  useEffect(() => {
    const settle = () => {
      setNow(Date.now())
      dispatch({ type: 'settlePastDays' })
    }
    settle()
    const onVisible = () => {
      if (document.visibilityState === 'visible') settle()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', settle)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', settle)
    }
  }, [])

  // 1s 心跳驱动实时计时
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <MoyuContext.Provider value={{ state, dispatch, now, holidayTick }}>
      {children}
    </MoyuContext.Provider>
  )
}

export function useMoyu() {
  return useContext(MoyuContext)
}
