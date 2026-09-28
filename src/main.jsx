import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './styles.css'
import App from './App.jsx'
import { MoyuProvider } from './state.jsx'

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MoyuProvider>
      <App />
    </MoyuProvider>
  </StrictMode>,
)
