import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/roboto-flex'
import './index.css'
import App from './App'

// browser design-preview: `?mock` installs a fake window.api (no Electron)
async function bootstrap() {
  const hasBridge = typeof (window as { api?: unknown }).api !== 'undefined'
  if (!hasBridge && new URLSearchParams(window.location.search).has('mock')) {
    await import('./dev/mockApi')
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

void bootstrap()
