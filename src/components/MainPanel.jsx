import { useState } from 'react'
import { useMoyu } from '../state.jsx'
import {
  dateStr,
  formatClock,
  formatDuration,
  formatHM,
  computeDayStats,
  workWindows,
  splitSegmentsByLunch,
} from '../lib/time.js'
import { perMinuteRate, formatMoney } from '../lib/money.js'
import { isWorkDay } from '../lib/schedule.js'
import { lookupHoliday } from '../lib/holiday.js'
import { chat } from '../lib/ai.js'

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

  // 日报生成：勾选的原始 segment index
  const [checkedSegs, setCheckedSegs] = useState(() => new Set())
  // 备注行内编辑：正在编辑的 segment index
  const [editingNote, setEditingNote] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')
  // AI 日报结果：null | { status: 'loading' | 'done' | 'error', text }
  const [report, setReport] = useState(null)
  const [copied, setCopied] = useState(false)

  const status = !workday
    ? 'rest'
    : settled
      ? 'off'
      : open
        ? open.kind
        : 'idle'

  // 当前时刻落在工作窗口之外时给出提示，避免"计时在走但统计为 0"被误解
  const [[amStartMs, amEndMs], [pmStartMs, pmEndMs]] = workWindows(ds, settings)

  // 午休时段且有进行中段：计时冻结在进入午休时的有效时长；过 pmStart 后由心跳自然恢复
  const inLunch = Boolean(open) && now >= amEndMs && now < pmStartMs
  const effectiveNow = inLunch ? amEndMs : now
  const elapsedSec = open ? Math.max(0, (effectiveNow - open.start) / 1000) : 0

  const statusText = inLunch
    ? '☕ 午休中 · 已暂停'
    : {
        rest: '休息日',
        off: '已下班',
        work: '搬砖中',
        fish: '摸鱼中',
        idle: '未开始',
      }[status]

  const offWindowHint =
    now < amStartMs
      ? '🌙 还没到上班时间，这段时间不计入统计'
      : now >= amEndMs && now < pmStartMs
        ? '☕ 午休时间，不计工时也不算摸鱼'
        : now >= pmEndMs
          ? '🌙 已过下班时间，这段时间不计入统计'
          : null

  const start = (kind) => {
    dispatch({ type: kind === 'work' ? 'startWork' : 'startFish', now: Date.now() })
  }
  const offWork = () => {
    if (window.confirm('确认下班跑路？记得虚拟打卡！')) {
      dispatch({ type: 'offWork', now: Date.now() })
    }
  }

  // 迟到/早退计入摸鱼的明细说明
  const fishDetail =
    stats.lateMin > 0 || stats.earlyMin > 0
      ? `含${[
          stats.lateMin > 0 ? `迟到 ${stats.lateMin} 分钟` : '',
          stats.earlyMin > 0 ? `早退 ${stats.earlyMin} 分钟` : '',
        ]
          .filter(Boolean)
          .join(' · ')}`
      : null

  // 今日记录：展示层按午休拆分（数据模型不变）
  const recordRows = hasStarted ? splitSegmentsByLunch(day.segments, ds, settings, now) : []
  // 每个原始 segment 的最后一行：备注小字/编辑入口只显示在那里，避免拆分后重复
  const lastRowOfSeg = new Map()
  recordRows.forEach((r, i) => {
    if (r.segIndex != null) lastRowOfSeg.set(r.segIndex, i)
  })

  const toggleCheck = (segIndex) => {
    setCheckedSegs((prev) => {
      const next = new Set(prev)
      if (next.has(segIndex)) next.delete(segIndex)
      else next.add(segIndex)
      return next
    })
    setReport(null)
  }

  const startEditNote = (segIndex) => {
    setEditingNote(segIndex)
    setNoteDraft(day.segments[segIndex]?.note || '')
  }

  const saveNote = () => {
    if (editingNote != null) {
      dispatch({ type: 'setSegmentNote', date: ds, index: editingNote, note: noteDraft })
    }
    setEditingNote(null)
  }

  const generateReport = async () => {
    if (!settings.aiApiKey) {
      setReport({ status: 'error', text: '请先在设置 → AI 助手中填写 API Key' })
      return
    }
    const segs = day.segments.filter((s, i) => s.kind === 'work' && checkedSegs.has(i))
    const records = segs
      .map((s) => {
        const dur = formatDuration(((s.end == null ? now : s.end) - s.start) / 60000)
        const range = `${formatHM(s.start)}–${s.end == null ? '现在' : formatHM(s.end)}`
        return `- ${range}（${dur}）${s.note ? `：${s.note}` : ''}`
      })
      .join('\n')
    const prompt = (settings.aiPromptTemplate || '{records}').replace('{records}', records)
    setReport({ status: 'loading', text: '' })
    try {
      const text = await chat(settings.aiApiKey, settings.aiModel, prompt)
      setReport({ status: 'done', text })
    } catch (e) {
      setReport({ status: 'error', text: `生成失败：${e.message}` })
    }
  }

  const copyReport = async () => {
    if (!report?.text) return
    try {
      await navigator.clipboard.writeText(report.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setReport({ status: 'error', text: '复制失败，请手动长按选择文本复制' })
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
          <>
            <div className="status-accum">
              <span>🧱 搬砖 {formatDuration(stats.workMin)}</span>
              <span className="dot-sep">·</span>
              <span>🐟 摸鱼 {formatDuration(stats.fishTotalMin)}</span>
            </div>
            {fishDetail && <div className="status-accum status-accum-detail">{fishDetail}</div>}
          </>
        )}
        {open && !inLunch && offWindowHint && <div className="status-hint">{offWindowHint}</div>}
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
            <span>{formatDuration(stats.fishTotalMin)}</span>
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
          {status === 'idle' && (
            <button className="btn btn-filled btn-wide btn-hero" onClick={() => start('work')}>
              🌅 开始上班
            </button>
          )}
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
            className="btn btn-container btn-wide btn-offwork"
            onClick={offWork}
            disabled={!hasStarted}
          >
            🏃 下班跑路
          </button>
        </>
      )}

      {hasStarted && (
        <div className="card record-card">
          <div className="card-title">今日记录</div>
          <div className="record-list">
            {recordRows.map((row, i) => {
              if (row.kind === 'lunch') {
                return (
                  <div key={`lunch-${i}`} className="record-item">
                    <div className="record-row record-lunch">
                      <span className="record-check-space" />
                      <span className="record-kind">☕</span>
                      <span className="record-time">
                        午休 {formatHM(row.start)}–{formatHM(row.end)}
                      </span>
                      <span className="record-dur">
                        {formatDuration((row.end - row.start) / 60000)}
                      </span>
                    </div>
                  </div>
                )
              }
              const isOpen = row.end == null
              const durMin = ((isOpen ? now : row.end) - row.start) / 60000
              const isWork = row.kind === 'work'
              const isLastOfSeg = lastRowOfSeg.get(row.segIndex) === i
              const note = isWork ? day.segments[row.segIndex]?.note : null
              const isChecked = isWork && checkedSegs.has(row.segIndex)
              return (
                <div key={i} className="record-item">
                  <div className={`record-row ${isOpen ? 'record-open' : ''}`}>
                    {isWork ? (
                      <button
                        className={`record-check ${isChecked ? 'record-checked' : ''}`}
                        onClick={() => toggleCheck(row.segIndex)}
                        aria-label="选入日报"
                      >
                        {isChecked ? '✓' : ''}
                      </button>
                    ) : (
                      <span className="record-check-space" />
                    )}
                    <span className="record-kind">{isWork ? '🧱' : '🐟'}</span>
                    <span className="record-time">
                      {formatHM(row.start)}–{isOpen ? '现在' : formatHM(row.end)}
                    </span>
                    <span className="record-dur">
                      {isOpen ? '进行中' : formatDuration(durMin)}
                    </span>
                    {isWork && isLastOfSeg && (
                      <button
                        className="record-edit-btn"
                        onClick={() => startEditNote(row.segIndex)}
                        aria-label="编辑备注"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                  {isWork && isLastOfSeg && editingNote === row.segIndex ? (
                    <input
                      className="record-note-input"
                      autoFocus
                      placeholder="这段搬了什么砖…"
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      onBlur={saveNote}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveNote()
                      }}
                    />
                  ) : (
                    isWork && isLastOfSeg && note && <div className="record-note">📝 {note}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {checkedSegs.size > 0 && (
        <button className="btn btn-filled btn-wide btn-offwork" onClick={generateReport}>
          📝 生成日报（已选 {checkedSegs.size} 段）
        </button>
      )}

      {report && (
        <div className="card ai-result-card">
          <div className="card-title">📝 今日日报</div>
          {report.status === 'loading' && <div className="ai-loading">AI 生成中…</div>}
          {report.status === 'error' && <div className="ai-error">{report.text}</div>}
          {report.status === 'done' && (
            <>
              <div className="ai-result-text">{report.text}</div>
              <button className="btn btn-tonal btn-wide" onClick={copyReport}>
                {copied ? '✓ 已复制' : '📋 复制'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
