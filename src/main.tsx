import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { appConfig } from './config/app.config'

async function prepare(): Promise<void> {
  // import.meta.env.DEV is statically replaced at build time, so this
  // whole branch (and the mock's ~400kb chunk) is dead-code-eliminated
  // from production builds even if VITE_USE_MOCK_API is left unset.
  if (!import.meta.env.DEV || !appConfig.mock.enabled) return
  const { mockWorker } = await import('./mocks/browser')
  await mockWorker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
}

prepare().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
