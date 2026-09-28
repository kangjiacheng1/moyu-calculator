import { useEffect, useRef, useState } from 'react'
import { useMoyu } from './state.jsx'
import MainPanel from './components/MainPanel.jsx'
import TodayPanel from './components/TodayPanel.jsx'
import WeekPanel from './components/WeekPanel.jsx'
import MonthView from './components/MonthView.jsx'
import SettingsView from './components/SettingsView.jsx'

const THEME_COLORS = { light: '#FEF7FF', dark: '#141218' }

function useTheme() {
  const { state } = useMoyu()
  const theme = state.settings.theme || 'system'
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
      document.documentElement.dataset.theme = resolved
      document
        .querySelectorAll('meta[name="theme-color"]')
        .forEach((m) => m.setAttribute('content', THEME_COLORS[resolved]))
    }
    apply()
    if (theme === 'system') {
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
  }, [theme])
}

function IconChart() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="M8 17v-5" />
      <path d="M13 17V8" />
      <path d="M18 17v-3" />
    </svg>
  )
}

function IconGear() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function Home({ onMonth, onSettings }) {
  const scrollRef = useRef(null)
  const [page, setPage] = useState(1)

  // 挂载后滚到中间页（主操作页）
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.clientWidth
  }, [])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const p = Math.round(el.scrollLeft / el.clientWidth)
    setPage(Math.max(0, Math.min(2, p)))
  }

  return (
    <>
      <div className="app-bar">
        <div className="app-bar-title">摸鱼计算器</div>
        <div className="app-bar-spacer" />
        <button className="icon-btn" onClick={onMonth} aria-label="月报">
          <IconChart />
        </button>
        <button className="icon-btn" onClick={onSettings} aria-label="设置">
          <IconGear />
        </button>
      </div>
      <div className="panels" ref={scrollRef} onScroll={onScroll}>
        <section className="panel">
          <TodayPanel />
        </section>
        <section className="panel">
          <MainPanel />
        </section>
        <section className="panel">
          <WeekPanel />
        </section>
      </div>
      <div className="dots">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`dot ${page === i ? 'dot-active' : ''}`} />
        ))}
      </div>
    </>
  )
}

export default function App() {
  const [view, setView] = useState('home')
  useTheme()

  return (
    <div className="app">
      {view === 'home' && (
        <Home onMonth={() => setView('month')} onSettings={() => setView('settings')} />
      )}
      {view === 'month' && <MonthView onBack={() => setView('home')} />}
      {view === 'settings' && <SettingsView onBack={() => setView('home')} />}
    </div>
  )
}
