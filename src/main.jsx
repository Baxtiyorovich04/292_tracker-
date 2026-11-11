import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  window.__pwaInstall = event
  window.dispatchEvent(new Event('pwa-install-ready'))
})

window.addEventListener('appinstalled', () => {
  window.__pwaInstall = null
})

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
