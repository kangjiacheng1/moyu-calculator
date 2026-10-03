// 安卓通知栏日报（仅 Capacitor 原生环境生效；浏览器/PWA 下全部为 no-op）
// 局限：App 被系统杀死后通知停止更新，重新打开 App 即恢复。
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { computeDayStats, dateStr, formatDuration } from './time.js'
import { minutesToMoney, totalLeachMoney } from './money.js'

const NOTIFY_ID = 1001 // 固定 id，每次更新先 cancel 再重新 schedule

export function notifySupported() {
  return Capacitor.isNativePlatform()
}

export async function requestNotifyPermission() {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const perm = await LocalNotifications.requestPermissions()
    return perm.display === 'granted'
  } catch {
    return false
  }
}

function buildText(day, settings, nowMs, overrides) {
  const month = dateStr(new Date(nowMs)).slice(0, 7)
  const s = computeDayStats(day, settings, nowMs)
  const workMoney = minutesToMoney(s.workMin, settings, month, overrides)
  const fishMoney = minutesToMoney(s.fishTotalMin, settings, month, overrides)
  const leach = totalLeachMoney(s, settings, month, overrides)
  return `🧱 搬砖 ${formatDuration(s.workMin)} ¥${workMoney.toFixed(0)} · 🐟 摸鱼 ${formatDuration(s.fishTotalMin)} ¥${fishMoney.toFixed(0)} · 总白嫖 ¥${leach.toFixed(0)}`
}

// 开关关闭时清除通知；开启时用最新统计重排 ongoing 通知
export async function updateNotification(state, nowMs) {
  if (!Capacitor.isNativePlatform()) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIFY_ID }] })
    if (!state.settings.notifyEnabled) return
    const ds = dateStr(new Date(nowMs))
    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFY_ID,
          title: '摸鱼计算器',
          body: buildText(state.days[ds], state.settings, nowMs, state.overrides),
          ongoing: true, // 常驻、不可滑走
          autoCancel: false,
        },
      ],
    })
  } catch {
    // 权限拒绝等异常静默，不影响记账
  }
}
