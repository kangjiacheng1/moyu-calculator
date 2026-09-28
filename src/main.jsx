import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { Capacitor } from '@capacitor/core'
import './styles.css'
import App from './App.jsx'
import { MoyuProvider } from './state.jsx'

// 原生（Capacitor）环境下网页文件随 APK 打包，注册 SW 反而会导致更新后加载旧版
if (!Capacitor.isNativePlatform()) {
  registerSW({ immediate: true })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MoyuProvider>
      <App />
    </MoyuProvider>
  </StrictMode>,
)
