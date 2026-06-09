import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { isTauri } from './lib/utils/platform'
import './i18n'
import 'leaflet/dist/leaflet.css'
import './styles/globals.css'

// Web 版注册最小 Service Worker,使站点可「安装到主屏幕」并以独立窗口打开(隐藏地址栏)。
// Tauri 壳内不注册(自有协议,无意义且可能报错)。
if (!isTauri() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
