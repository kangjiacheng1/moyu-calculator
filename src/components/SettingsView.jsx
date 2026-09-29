import { useEffect, useRef, useState } from 'react'
import { useMoyu } from '../state.jsx'
import { dateStr } from '../lib/time.js'
import { perMinuteRate, dailySalary, formatMoney } from '../lib/money.js'
import { isWorkDay } from '../lib/schedule.js'
import { lookupHoliday, refreshYearHolidays } from '../lib/holiday.js'
import { exportAll } from '../lib/storage.js'
import { listModels } from '../lib/ai.js'
import { notifySupported, requestNotifyPermission } from '../lib/notify.js'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`segmented-item ${value === opt.value ? 'segmented-active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function num(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function CalendarOverride() {
  const { state, dispatch, now } = useMoyu()
  const { settings, overrides } = state
  const today = dateStr(new Date(now))
  const [y, m] = today.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7 // 周一=0

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }

  const cycle = (ds) => {
    const cur = overrides[ds]
    const next = cur == null ? 'work' : cur === 'work' ? 'off' : null
    dispatch({ type: 'setOverride', date: ds, value: next })
  }

  return (
    <div className="calendar">
      <div className="calendar-head">
        {WEEKDAYS.map((w) => (
          <div key={w} className="calendar-head-cell">{w}</div>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((ds, i) => {
          if (ds == null) return <div key={`blank-${i}`} className="calendar-cell calendar-blank" />
          const override = overrides[ds]
          const workday = isWorkDay(ds, settings, overrides)
          const isToday = ds === today
          return (
            <button
              key={ds}
              className={[
                'calendar-cell',
                workday ? 'cal-work' : 'cal-off',
                override === 'work' ? 'cal-override-work' : '',
                override === 'off' ? 'cal-override-off' : '',
                isToday ? 'cal-today' : '',
              ].join(' ')}
              onClick={() => cycle(ds)}
              title={override === 'work' ? '强制上班' : override === 'off' ? '强制休息' : '自动'}
            >
              {Number(ds.slice(8))}
            </button>
          )
        })}
      </div>
      <div className="calendar-legend">
        <span><i className="legend-dot" style={{ background: 'var(--surface-container-high)' }} /> 自动</span>
        <span><i className="legend-dot" style={{ background: 'var(--work-container)' }} /> 强制上班</span>
        <span><i className="legend-dot" style={{ background: 'var(--fish-container)' }} /> 强制休息</span>
        <span className="calendar-tip">点按切换：自动 → 强制上班 → 强制休息</span>
      </div>
    </div>
  )
}

export default function SettingsView({ onBack }) {
  const { state, dispatch, now } = useMoyu()
  const { settings, overrides } = state
  const fileRef = useRef(null)
  const [holidayMsg, setHolidayMsg] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [aiMsg, setAiMsg] = useState('')
  const [aiModels, setAiModels] = useState(null) // null = 未拉取过
  const [aiTesting, setAiTesting] = useState(false)
  const [notifyMsg, setNotifyMsg] = useState('')

  const update = (patch) => dispatch({ type: 'updateSettings', patch })

  const testAi = async (silent = false) => {
    if (!settings.aiApiKey) {
      if (!silent) setAiMsg('请先填写 API Key')
      return false
    }
    setAiTesting(true)
    if (!silent) setAiMsg('连接中…')
    try {
      const models = await listModels(settings.aiApiKey)
      setAiModels(models)
      setAiMsg(`✅ 连接成功，可用 ${models.length} 个模型`)
      return true
    } catch (e) {
      if (!silent) setAiMsg(`❌ ${e.message}`)
      return false
    } finally {
      setAiTesting(false)
    }
  }

  // 已有 key 时进入页面自动拉取一次模型列表
  useEffect(() => {
    if (settings.aiApiKey) testAi(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleNotify = async () => {
    const next = !settings.notifyEnabled
    if (next) {
      const granted = await requestNotifyPermission()
      if (!granted) {
        setNotifyMsg('通知权限被拒绝，请在系统设置中允许通知')
        return
      }
    }
    setNotifyMsg('')
    update({ notifyEnabled: next })
  }

  const resetToday = () => {
    if (window.confirm('确定清空今天的所有记录吗？此操作不可恢复')) {
      dispatch({ type: 'resetToday' })
    }
  }

  const today = dateStr(new Date(now))
  const holiday = lookupHoliday(today)
  const workday = isWorkDay(today, settings, overrides)
  const todayStatus = holiday
    ? `${holiday.name}（${holiday.type === 2 ? '放假' : holiday.type === 3 ? '调休上班' : workday ? '工作日' : '休息日'}）`
    : workday
      ? '工作日'
      : '休息日'

  const refreshHolidays = async () => {
    setHolidayMsg('获取中…')
    const ok = await refreshYearHolidays(new Date(now).getFullYear())
    setHolidayMsg(ok ? '已更新节假日数据' : '获取失败，已使用内置兜底数据')
  }

  const doExport = () => {
    const data = JSON.stringify(exportAll(), null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `moyu-backup-${today.replaceAll('-', '')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const doImport = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result))
        if (!obj || typeof obj !== 'object' || !obj.settings || !obj.days) {
          setImportMsg('文件格式不正确，导入失败')
          return
        }
        if (window.confirm('导入将覆盖当前全部数据，确定继续吗？')) {
          dispatch({ type: 'importAll', data: obj })
          setImportMsg('导入成功')
        }
      } catch {
        setImportMsg('文件不是有效的 JSON，导入失败')
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <div className="app-bar">
        <button className="icon-btn" onClick={onBack} aria-label="返回">
          ←
        </button>
        <div className="app-bar-title">设置</div>
        <div className="app-bar-spacer" />
      </div>
      <div className="panel-body view-body">
        <div className="card">
          <div className="card-title">💰 薪资</div>
          <label className="field">
            <span className="field-label">月薪（元）</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={settings.monthlySalary}
              onChange={(e) => update({ monthlySalary: num(e.target.value) })}
            />
          </label>
          <label className="field">
            <span className="field-label">年终奖（元）</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={settings.yearEndBonus}
              onChange={(e) => update({ yearEndBonus: num(e.target.value) })}
            />
          </label>
          <div className="stat-row">
            <span className="stat-label">日薪</span>
            <span className="stat-value">
              <span className="stat-money">{formatMoney(dailySalary(settings))}</span>
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-label">每分钟价值</span>
            <span className="stat-value">
              <span className="stat-money">{formatMoney(perMinuteRate(settings), 3)}</span>
            </span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">⏰ 作息</div>
          <div className="time-grid">
            <label className="field">
              <span className="field-label">上午上班</span>
              <input type="time" value={settings.amStart} onChange={(e) => update({ amStart: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">上午下班</span>
              <input type="time" value={settings.amEnd} onChange={(e) => update({ amEnd: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">下午上班</span>
              <input type="time" value={settings.pmStart} onChange={(e) => update({ pmStart: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">下午下班</span>
              <input type="time" value={settings.pmEnd} onChange={(e) => update({ pmEnd: e.target.value })} />
            </label>
          </div>
          <label className="field">
            <span className="field-label">迟到宽限期（分钟）</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={settings.lateGraceMin}
              onChange={(e) => update({ lateGraceMin: num(e.target.value) })}
            />
          </label>
        </div>

        <div className="card">
          <div className="card-title">📅 工作制度</div>
          <Segmented
            options={[
              { value: 'double', label: '双休' },
              { value: 'bigsmall', label: '大小周' },
              { value: 'single', label: '单休' },
            ]}
            value={settings.weekScheme}
            onChange={(v) => update({ weekScheme: v })}
          />
          {settings.weekScheme === 'bigsmall' && (
            <label className="field">
              <span className="field-label">基准周六（要上班的那个周六）</span>
              <input
                type="date"
                value={settings.baseSaturday}
                onChange={(e) => e.target.value && update({ baseSaturday: e.target.value })}
              />
            </label>
          )}
        </div>

        <div className="card">
          <div className="card-title">🎨 外观</div>
          <Segmented
            options={[
              { value: 'system', label: '跟随系统' },
              { value: 'light', label: '浅色' },
              { value: 'dark', label: '深色' },
            ]}
            value={settings.theme}
            onChange={(v) => update({ theme: v })}
          />
        </div>

        <div className="card">
          <div className="card-title">🏖️ 节假日</div>
          <div className="stat-row">
            <span className="stat-label">今天</span>
            <span className="stat-value">
              <span className="stat-duration">{todayStatus}</span>
            </span>
          </div>
          <button className="btn btn-tonal btn-wide" onClick={refreshHolidays}>
            重新获取节假日数据
          </button>
          {holidayMsg && <div className="form-msg">{holidayMsg}</div>}
        </div>

        <div className="card">
          <div className="card-title">🤖 AI 助手（DeepSeek）</div>
          <label className="field">
            <span className="field-label">API Key（到 platform.deepseek.com 申请）</span>
            <input
              type="password"
              placeholder="sk-…"
              autoComplete="off"
              value={settings.aiApiKey}
              onChange={(e) => update({ aiApiKey: e.target.value.trim() })}
            />
          </label>
          <button className="btn btn-tonal btn-wide" onClick={() => testAi()} disabled={aiTesting}>
            {aiTesting ? '连接中…' : '测试连接'}
          </button>
          {aiMsg && <div className="form-msg">{aiMsg}</div>}
          <label className="field" style={{ marginTop: 14 }}>
            <span className="field-label">模型</span>
            <select
              className="field-select"
              value={settings.aiModel}
              onChange={(e) => update({ aiModel: e.target.value })}
            >
              {(aiModels || ['deepseek-chat', 'deepseek-reasoner'])
                .concat(
                  aiModels && !aiModels.includes(settings.aiModel) ? [settings.aiModel] : [],
                )
                .map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">日报提示词模板（{'{records}'} 会被替换为勾选记录）</span>
            <textarea
              className="field-textarea"
              rows={6}
              value={settings.aiPromptTemplate}
              onChange={(e) => update({ aiPromptTemplate: e.target.value })}
            />
          </label>
        </div>

        <div className="card">
          <div className="card-title">🔔 通知栏日报</div>
          <div className="stat-row">
            <span className="stat-label">常驻通知显示今日统计</span>
            <button
              className={`md-switch ${settings.notifyEnabled ? 'md-switch-on' : ''}`}
              onClick={toggleNotify}
              disabled={!notifySupported()}
              aria-pressed={settings.notifyEnabled}
              aria-label="通知栏日报开关"
            >
              <span className="md-switch-thumb" />
            </button>
          </div>
          {!notifySupported() && <div className="form-msg">仅安卓离线版可用</div>}
          {notifyMsg && <div className="form-msg">{notifyMsg}</div>}
          <div className="form-msg">App 被系统杀死后通知停止更新，重新打开即恢复</div>
        </div>

        <div className="card">
          <div className="card-title">🗂️ 日历覆盖</div>
          <CalendarOverride />
        </div>

        <div className="card">
          <div className="card-title">💾 数据</div>
          <div className="btn-row">
            <button className="btn btn-tonal" onClick={doExport}>导出数据</button>
            <button className="btn btn-tonal" onClick={() => fileRef.current?.click()}>
              导入数据
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={doImport}
          />
          {importMsg && <div className="form-msg">{importMsg}</div>}
          <button className="btn btn-danger btn-wide" style={{ marginTop: 12 }} onClick={resetToday}>
            🗑️ 重置今日记录
          </button>
        </div>
      </div>
    </>
  )
}
