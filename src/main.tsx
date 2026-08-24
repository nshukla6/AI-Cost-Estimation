import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { appConfig } from './config/app.config'

async function prepare(): Promise<void> {
  // Ships in production too (e.g. a demo Vercel deploy with no real
  // backend yet) as long as appConfig.mock.enabled is true. Once a real
  // backend exists, set VITE_USE_MOCK_API=false — that both stops the
  // worker at runtime and, since the env var is statically replaced at
  // build time, dead-code-eliminates the mock's ~400kb chunk entirely.
  if (!appConfig.mock.enabled) return
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
